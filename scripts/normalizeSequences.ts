/**
 * One-time migration: normalize sequences to use StepReference[] instead of embedded steps.
 *
 * For each sequence document:
 *   1. Migrate old step types (exercise/stretch/timer → repetition/action)
 *   2. Create/extract each embedded step as a standalone document in the `steps` collection
 *   3. Recursively convert sub-steps in repeat_group into childSteps references
 *   4. Replace the sequence's `steps` array with StepReference[] (stepId + position)
 *
 * Idempotent — safe to re-run. Already-extracted steps are detected and skipped.
 *
 * Usage:
 *   npm run migrate:normalize
 *   # or specify service account key path:
 *   npx tsx scripts/normalizeSequences.ts /path/to/service-account.json
 */

import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

if (!getApps().length) {
  const serviceAccountPath =
    process.argv[2] ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(serviceAccountPath), 'utf-8'));
    initializeApp({ credential: cert(serviceAccount) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
}

const db = getFirestore();

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawStep {
  id: string;
  type: string;
  position: number;
  title?: string;
  name?: string;
  label?: string;
  instructions?: string;
  media?: unknown[];
  equipment?: string;
  unit?: string;
  steps?: number;
  reps?: number;
  weightLb?: number;
  durationSeconds?: number;
  restBetweenSetsSeconds?: number;
  voiceActivation?: boolean;
  durationMinutes?: number;
  timerEndBehavior?: string;
  useDuration?: boolean;
  // repeat_group embedded steps
  steps?: RawStep[];
  // old types
  exerciseName?: string;
  stretchName?: string;
  equipmentName?: string;
  restAfterSetMinutes?: number;
  setUnit?: string;
  [key: string]: unknown;
}

interface StepReference {
  stepId: string;
  position: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OLD_TYPES = new Set(['exercise', 'stretch', 'timer']);

function migrateStepType(step: RawStep): RawStep {
  const base = {
    instructions: (step.instructions || '') as string,
    media: (step.media || []) as never[],
  };

  if (step.type === 'exercise') {
    return {
      ...base,
      id: step.id,
      type: 'repetition',
      position: step.position || 1,
      title: (step.exerciseName || '') as string,
      equipment: (step.equipmentName || '') as string,
      unit: step.setUnit === 'seconds' ? 'seconds' : 'weight',
      steps: (step.sets || 3) as number,
      reps: (step.reps || 10) as number,
      weightLb: (step.weight || 0) as number,
      durationSeconds: 0,
      restBetweenSetsSeconds: ((step.restAfterSetMinutes || 2) as number) * 60,
      voiceActivation: !!step.voiceActivation,
    };
  }

  if (step.type === 'stretch') {
    return {
      ...base,
      id: step.id,
      type: 'repetition',
      position: step.position || 1,
      title: (step.stretchName || '') as string,
      equipment: (step.equipment || '') as string,
      unit: 'seconds',
      steps: (step.sets || 3) as number,
      reps: 1,
      weightLb: 0,
      durationSeconds: (step.durationSeconds || 30) as number,
      restBetweenSetsSeconds: (step.restBetweenSetsSeconds || 30) as number,
      voiceActivation: !!step.voiceActivation,
    };
  }

  if (step.type === 'timer') {
    return {
      ...base,
      id: step.id,
      type: 'action',
      position: step.position || 1,
      title: (step.label || '') as string,
      durationMinutes: (step.durationMinutes || 10) as number,
      timerEndBehavior: 'notification',
      useDuration: true,
    };
  }

  // Clean up old field names on current types
  const cleaned: Record<string, unknown> = { ...step };
  delete cleaned.exerciseName;
  delete cleaned.stretchName;
  delete cleaned.equipmentName;
  delete cleaned.restAfterSetMinutes;
  delete cleaned.setUnit;
  delete cleaned.sets;

  if (step.type === 'repetition' && step.name) {
    cleaned.title = step.name;
    delete cleaned.name;
  }
  if (step.type === 'action' && step.label) {
    cleaned.title = step.label;
    delete cleaned.label;
  }

  return cleaned as unknown as RawStep;
}

function needsTypeMigration(step: RawStep): boolean {
  return OLD_TYPES.has(step.type);
}

function stepDocData(step: RawStep, sequenceId: string, childSteps: StepReference[]): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    type: step.type,
    title: (step.title || '') as string,
    instructions: (step.instructions || '') as string,
    media: (step.media || []) as never[],
    equipment: (step.equipment || '') as string,
    unit: (step.unit || 'none') as string,
    steps: (step.steps || 0) as number,
    reps: (step.reps || 0) as number,
    weightLb: (step.weightLb || 0) as number,
    durationSeconds: (step.durationSeconds || 0) as number,
    restBetweenSetsSeconds: (step.restBetweenSetsSeconds || 0) as number,
    voiceActivation: !!step.voiceActivation,
    durationMinutes: (step.durationMinutes || 0) as number,
    timerEndBehavior: (step.timerEndBehavior || 'notification') as string,
    useDuration: !!step.useDuration,
    childSteps,
    isDeleted: false,
    usedBy: [sequenceId],
    createdAt: now,
    lastModifiedAt: now,
  };
}

// ─── Core Migration ───────────────────────────────────────────────────────────

// Step 1: Extract a single step (and its sub-steps) into the `steps` collection.
// Returns the StepReference to use in the sequence.
async function extractStep(
  step: RawStep,
  sequenceId: string,
  visited: Set<string>,
): Promise<StepReference | null> {
  const stepId = step.id;
  if (!stepId) {
    console.warn(`    ⚠ step has no id, skipping`);
    return null;
  }

  // If we already processed this step ID in this run, just return the reference
  if (visited.has(stepId)) {
    return { stepId, position: step.position || 1 };
  }

  // Check if doc already exists in steps collection
  const ref = db.collection('steps').doc(stepId);
  const snap = await ref.get();

  if (snap.exists) {
    // Step already extracted — just ensure usedBy includes this sequence
    const existing = snap.data()!;
    const usedBy: string[] = existing.usedBy || [];
    if (!usedBy.includes(sequenceId)) {
      await ref.update({
        usedBy: [...usedBy, sequenceId],
        lastModifiedAt: new Date().toISOString(),
      });
    }
    visited.add(stepId);
    return { stepId, position: step.position || 1 };
  }

  // Extract sub-steps first (for repeat_group)
  let childSteps: StepReference[] = [];
  if (step.type === 'repeat_group' && Array.isArray(step.steps)) {
    for (const sub of step.steps) {
      const cleaned = needsTypeMigration(sub) ? migrateStepType(sub) : sub;
      const ref = await extractStep(cleaned, sequenceId, visited);
      if (ref) childSteps.push(ref);
    }
  }

  // Write the step document
  const data = stepDocData(step, sequenceId, childSteps);
  await ref.set(data);

  // Log with emoji based on type
  const icon = step.type === 'repeat_group' ? '📁' : step.type === 'action' ? '⏱' : '🏋';
  console.log(`    ${icon} ${stepId.slice(0, 8)} (${step.type}) "${(step.title || '').slice(0, 50)}"`);

  visited.add(stepId);
  return { stepId, position: step.position || 1 };
}

// Step 2: Normalize a single sequence document
async function normalizeSequence(doc: FirebaseFirestore.QueryDocumentSnapshot): Promise<boolean> {
  const data = doc.data() as Record<string, unknown>;
  const seqName: string = (data.name as string) || doc.id;
  const seqId = doc.id;
  const rawSteps: RawStep[] = (data.steps as RawStep[]) || [];

  // Clean up deprecated fields
  const updates: Record<string, unknown> = {};
  if ('repeatMode' in data) updates.repeatMode = FieldValue.delete();
  if ('repeatCount' in data) updates.repeatCount = FieldValue.delete();

  if (rawSteps.length === 0) {
    // No steps — just clean up and set empty StepReference[]
    updates.steps = [];
    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log(`  "${seqName}" — cleaned up (no steps)`);
    }
    return false;
  }

  // Check if already normalized (steps are StepReference[], not objects with `type`)
  const firstStep = rawSteps[0];
  if (firstStep && 'stepId' in firstStep && 'position' in firstStep && !('type' in firstStep)) {
    // Already normalized — just clean up if needed
    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log(`  "${seqName}" — already normalized, cleaned up`);
    } else {
      console.log(`  "${seqName}" — already normalized, skipping`);
    }
    return false;
  }

  console.log(`\n  ── "${seqName}" (${seqId.slice(0, 8)}) — ${rawSteps.length} steps ──`);

  // Migrate step types, extract sub-steps, collect references
  const visited = new Set<string>();
  const refs: StepReference[] = [];

  for (const step of rawSteps) {
    const cleaned = needsTypeMigration(step) ? migrateStepType(step) : step;
    const ref = await extractStep(cleaned, seqId, visited);
    if (ref) refs.push(ref);
  }

  // Update the sequence document: replace steps with references
  const seqUpdates: Record<string, unknown> = {
    ...updates,
    steps: refs,
    lastModifiedAt: new Date().toISOString(),
  };
  await doc.ref.update(seqUpdates);

  console.log(`  → ${refs.length} step references written`);
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════════');
  console.log('  Normalize Sequences: embedded steps → references');
  console.log('══════════════════════════════════════════════════\n');

  const snapshot = await db.collection('sequences').get();
  console.log(`Found ${snapshot.docs.length} sequences\n`);

  let normalized = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    try {
      const changed = await normalizeSequence(doc);
      if (changed) normalized++;
    } catch (e) {
      const name = doc.data().name || doc.id;
      console.error(`  ✗ Error normalizing "${name}" (${doc.id}):`, e);
      errors++;
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Done. ${normalized} sequences normalized, ${errors} errors.`);

  // Verify steps collection count
  const countSnap = await db.collection('steps').count().get();
  const stepCount = countSnap.data()?.count ?? 0;
  console.log(`  Steps collection now has ${stepCount} documents.`);
  console.log('══════════════════════════════════════════════════\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

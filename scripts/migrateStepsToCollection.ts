import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

if (!getApps().length) {
  const serviceAccountPath = process.argv[2]
    || process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

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

interface RawStep {
  id: string;
  type: string;
  position: number;
  title?: string;
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
  [key: string]: unknown;
}

function baseDoc(sequenceId: string) {
  const now = new Date().toISOString();
  return {
    isDeleted: false,
    usedBy: [sequenceId],
    createdAt: now,
    lastModifiedAt: now,
  };
}

async function migrateStep(step: RawStep, sequenceId: string): Promise<string | null> {
  const stepId = step.id;
  if (!stepId) return null;

  const ref = db.collection('steps').doc(stepId);
  const snap = await ref.get();
  if (snap.exists) {
    // Already migrated — ensure this sequence is in usedBy
    const existing = snap.data()!;
    const usedBy: string[] = existing.usedBy || [];
    if (!usedBy.includes(sequenceId)) {
      await ref.update({ usedBy: [...usedBy, sequenceId], lastModifiedAt: new Date().toISOString() });
      console.log(`  ➕ appended usedBy on step ${stepId.slice(0, 8)}`);
    }
    return stepId;
  }

  const now = new Date().toISOString();
  const base = { ...baseDoc(sequenceId), createdAt: now };

  if (step.type === 'repetition') {
    await ref.set({
      ...base,
      type: 'repetition',
      title: (step.title || step.name || '') as string,
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
      durationMinutes: 0,
      timerEndBehavior: 'notification',
      useDuration: false,
      childSteps: [],
    });
    console.log(`  ✓ step ${stepId.slice(0, 8)} (repetition) "${(step.title || step.name || '').slice(0, 40)}"`);
    return stepId;
  }

  if (step.type === 'action') {
    await ref.set({
      ...base,
      type: 'action',
      title: (step.title || step.label || '') as string,
      instructions: (step.instructions || '') as string,
      media: (step.media || []) as never[],
      equipment: '',
      unit: 'none',
      steps: 0,
      reps: 0,
      weightLb: 0,
      durationSeconds: 0,
      restBetweenSetsSeconds: 0,
      voiceActivation: false,
      durationMinutes: (step.durationMinutes || 0) as number,
      timerEndBehavior: (step.timerEndBehavior || 'notification') as string,
      useDuration: !!step.useDuration,
      childSteps: [],
    });
    console.log(`  ✓ step ${stepId.slice(0, 8)} (action) "${(step.title || step.label || '').slice(0, 40)}"`);
    return stepId;
  }

  if (step.type === 'repeat_group') {
    // Recursively migrate sub-steps first
    const subSteps: RawStep[] = (step.steps as RawStep[]) || [];
    const childRefs: { stepId: string; position: number }[] = [];
    for (const sub of subSteps) {
      const subId = await migrateStep(sub, sequenceId);
      if (subId) childRefs.push({ stepId: subId, position: sub.position || 1 });
    }

    await ref.set({
      ...base,
      type: 'repeat_group',
      title: (step.title || '') as string,
      instructions: (step.instructions || '') as string,
      media: (step.media || []) as never[],
      equipment: '',
      unit: 'none',
      steps: 0,
      reps: 0,
      weightLb: 0,
      durationSeconds: 0,
      restBetweenSetsSeconds: 0,
      voiceActivation: false,
      durationMinutes: 0,
      timerEndBehavior: 'notification',
      useDuration: false,
      childSteps: childRefs,
    });
    console.log(`  ✓ step ${stepId.slice(0, 8)} (repeat_group) "${(step.title || '').slice(0, 40)}" (${childRefs.length} sub-steps)`);
    return stepId;
  }

  return null;
}

async function main() {
  console.log('Migrating embedded steps to standalone collection...\n');

  const snapshot = await db.collection('sequences').get();
  console.log(`Found ${snapshot.docs.length} sequences\n`);

  let totalSteps = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const seqName: string = data.name || doc.id;
    const seqId = doc.id;
    const steps: RawStep[] = data.steps || [];

    if (steps.length === 0) {
      console.log(`  — "${seqName}" has no steps, skipping`);
      continue;
    }

    console.log(`\n  "${seqName}" (${seqId.slice(0, 8)}) — ${steps.length} steps`);

    for (const step of steps) {
      try {
        const result = await migrateStep(step, seqId);
        if (result) totalSteps++;
      } catch (e) {
        console.error(`  ✗ Error migrating step ${step.id?.slice(0, 8) || '(no id)'}:`, e);
        errors++;
      }
    }
  }

  console.log(`\nDone. ${totalSteps} steps migrated, ${errors} errors.`);

  const countSnap = await db.collection('steps').count().get();
  console.log(`Total documents in steps collection: ${countSnap.data().count}`);
}

main().catch(console.error);

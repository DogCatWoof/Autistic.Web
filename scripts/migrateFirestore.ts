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

function stripEmptyStrings<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripEmptyStrings) as unknown as T;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([_, v]) => v !== '')
      .map(([k, v]) => [k, typeof v === 'object' && v !== null ? stripEmptyStrings(v) : v])
  ) as T;
}

interface RawStep {
  id: string;
  type: string;
  position: number;
  name?: string;
  label?: string;
  title?: string;
  steps?: RawStep[];
  [key: string]: unknown;
}

const OLD_TYPES = new Set(['exercise', 'stretch', 'timer']);

function needsMigration(step: RawStep): boolean {
  if (OLD_TYPES.has(step.type)) return true;
  if (step.type === 'repetition' && step.name !== undefined && step.name !== step.title) return true;
  if (step.type === 'action' && step.label !== undefined && step.label !== step.title) return true;
  if (step.type === 'repeat_group' && Array.isArray(step.steps)) {
    return step.steps.some(s => needsMigration(s as RawStep));
  }
  return false;
}

function migrateStep(step: RawStep): Record<string, unknown> {
  const base: Record<string, unknown> = {
    instructions: step.instructions || '',
    media: step.media || [],
  };

  if (step.type === 'exercise') {
    return {
      ...base,
      id: step.id,
      type: 'repetition',
      position: step.position || 1,
      title: step.exerciseName || '',
      equipment: step.equipmentName || '',
      unit: step.setUnit === 'seconds' ? 'seconds' : 'weight',
      steps: step.sets || 3,
      reps: step.reps || 10,
      weightLb: step.weight || 0,
      durationSeconds: 0,
      restBetweenSetsSeconds: (step.restAfterSetMinutes || 2) * 60,
      voiceActivation: !!step.voiceActivation,
    };
  }

  if (step.type === 'stretch') {
    return {
      ...base,
      id: step.id,
      type: 'repetition',
      position: step.position || 1,
      title: step.stretchName || '',
      equipment: step.equipment || '',
      unit: 'seconds',
      steps: step.sets || 3,
      reps: 1,
      weightLb: 0,
      durationSeconds: step.durationSeconds || 30,
      restBetweenSetsSeconds: step.restBetweenSetsSeconds || 30,
      voiceActivation: !!step.voiceActivation,
    };
  }

  if (step.type === 'timer') {
    return {
      ...base,
      id: step.id,
      type: 'action',
      position: step.position || 1,
      title: step.label || '',
      durationMinutes: step.durationMinutes || 10,
      timerEndBehavior: 'notification',
      useDuration: true,
    };
  }

  // Current types: fix old field names
  const migrated: Record<string, unknown> = { ...step };
  delete migrated.exerciseName;
  delete migrated.stretchName;
  delete migrated.equipmentName;
  delete migrated.restAfterSetMinutes;
  delete migrated.setUnit;

  if (step.type === 'repetition' && step.name) {
    migrated.title = step.name;
    delete migrated.name;
  }
  if (step.type === 'action' && step.label) {
    migrated.title = step.label;
    delete migrated.label;
  }

  // Recursively migrate sub-steps in repeat_group
  if (step.type === 'repeat_group' && Array.isArray(step.steps)) {
    migrated.steps = step.steps.map(s => needsMigration(s as RawStep) ? migrateStep(s as RawStep) : { ...s as Record<string, unknown> });
  }

  return migrated;
}

async function main() {
  console.log('Starting Firestore migration...\n');
  const snapshot = await db.collection('sequences').get();
  console.log(`Found ${snapshot.docs.length} sequences\n`);

  let migrated = 0;
  let errors = 0;
  let unchanged = 0;

  for (const doc of snapshot.docs) {
    const name = doc.data().name || doc.id;
    try {
      const data = doc.data() as Record<string, unknown>;
      let changed = false;

      // Remove old sequence-level fields
      if ('repeatMode' in data) {
        delete data.repeatMode;
        changed = true;
        console.log(`  cleaning repeatMode on "${name}"`);
      }
      if ('repeatCount' in data) {
        delete data.repeatCount;
        changed = true;
        console.log(`  cleaning repeatCount on "${name}"`);
      }

      // Migrate steps (top-level and nested)
      if (Array.isArray(data.steps)) {
        const newSteps = data.steps.map(s => {
          const raw = s as RawStep;
          return needsMigration(raw) ? migrateStep(raw) : (s as Record<string, unknown>);
        });
        if (JSON.stringify(newSteps) !== JSON.stringify(data.steps)) {
          data.steps = newSteps;
          changed = true;
        }
      }

      if (changed) {
        // Use set without merge to replace the document entirely, dropping old fields and blank strings
        await doc.ref.set(stripEmptyStrings(data));
        migrated++;
        console.log(`  ✓ "${name}" (${doc.id}) migrated\n`);
      } else {
        unchanged++;
      }
    } catch (e) {
      console.error(`  ✗ Error migrating "${name}" (${doc.id}):`, e, '\n');
      errors++;
    }
  }

  console.log(`\nDone. ${migrated} migrated, ${errors} errors, ${unchanged} unchanged.`);
}

main().catch(console.error);

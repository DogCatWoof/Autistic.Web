import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, getDoc, doc, addDoc, updateDoc, deleteField } from 'firebase/firestore';
import type { Sequence, SequenceRun, SequenceStep } from '../types/sequence';
const TIMEOUT_MS = 10_000;

function stripEmptyStrings<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripEmptyStrings) as unknown as T;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([_, v]) => v !== '')
      .map(([k, v]) => [k, typeof v === 'object' && v !== null ? stripEmptyStrings(v) : v])
  ) as T;
}

function migrateStep(step: Record<string, unknown>): SequenceStep {
  if (step.type === 'exercise') {
    return {
      type: 'repetition', id: step.id as string, position: step.position as number || 1,
      title: step.exerciseName as string || '', equipment: step.equipmentName as string || '',
      unit: step.setUnit === 'seconds' ? 'seconds' : 'weight',
      steps: step.sets as number || 3, reps: step.reps as number || 10,
      weightLb: step.weight as number || 0, durationSeconds: 0,
      restBetweenSetsSeconds: (step.restAfterSetMinutes as number || 2) * 60,
      voiceActivation: false, instructions: step.instructions as string || '', media: step.media as [] || [],
    } as SequenceStep;
  }
  if (step.type === 'stretch') {
    return {
      type: 'repetition', id: step.id as string, position: step.position as number || 1,
      title: step.stretchName as string || '', equipment: step.equipment as string || '',
      unit: 'seconds', steps: step.sets as number || 3, reps: 1,
      weightLb: 0, durationSeconds: step.durationSeconds as number || 30,
      restBetweenSetsSeconds: step.restBetweenSetsSeconds as number || 30,
      voiceActivation: step.voiceActivation as boolean || false,
      instructions: step.instructions as string || '', media: step.media as [] || [],
    } as SequenceStep;
  }
  if (step.type === 'timer') {
    return {
      type: 'action', id: step.id as string, position: step.position as number || 1,
      title: step.label as string || '', durationMinutes: step.durationMinutes as number || 10,
      timerEndBehavior: 'notification', useDuration: true,
      instructions: step.instructions as string || '', media: step.media as [] || [],
    } as SequenceStep;
  }
  return step as unknown as SequenceStep;
}

function migrateSequence(data: Record<string, unknown>): Omit<Sequence, 'id'> {
  return {
    name: data.name as string || '',
    description: data.description as string || '',
    steps: (data.steps as Record<string, unknown>[] || []).map(migrateStep),
    isDeleted: data.isDeleted as boolean || false,
    createdAt: data.createdAt as string || '',
    lastModifiedAt: data.lastModifiedAt as string || '',
    pendingFirestoreSync: data.pendingFirestoreSync as boolean || false,
  } as unknown as Omit<Sequence, 'id'>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)),
  ]).catch((err) => {
    console.warn('[Firestore]', err);
    throw err;
  });
}

async function safeCollection(path: string) {
  if (!db) return null;
  return collection(db, path);
}

async function safeGetDocs(q: ReturnType<typeof query>) {
  if (!db) return { docs: [] as never[] };
  return withTimeout(getDocs(q), TIMEOUT_MS);
}

export async function fetchSequences(): Promise<Sequence[]> {
  const col = await safeCollection('sequences');
  if (!col) return [];
  const q = query(col, where('isDeleted', '==', false), orderBy('name', 'asc'));
  const snap = await safeGetDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return { id: d.id, ...migrateSequence(data) };
  });
}

export async function fetchSequenceById(id: string): Promise<Sequence | null> {
  if (!db) return null;
  const ref = doc(db, 'sequences', id);
  const snap = await withTimeout(getDoc(ref), TIMEOUT_MS);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return { id: snap.id, ...migrateSequence(data) };
}

export async function createSequence(data: Omit<Sequence, 'id'>): Promise<string | null> {
  if (!db) return null;
  const col = await safeCollection('sequences');
  if (!col) return null;
  const ref = await withTimeout(addDoc(col, stripEmptyStrings(data)), TIMEOUT_MS);
  return ref.id;
}

export async function updateSequence(id: string, data: Partial<Omit<Sequence, 'id'>>): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'sequences', id);
  const clean = stripEmptyStrings(data);
  // Explicitly delete top-level string fields that were cleared
  for (const key of ['description'] as const) {
    if (key in data && data[key] === '') {
      (clean as Record<string, unknown>)[key] = deleteField();
    }
  }
  await withTimeout(updateDoc(ref, clean), TIMEOUT_MS);
}

export async function deleteSequence(id: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'sequences', id);
  await withTimeout(updateDoc(ref, { isDeleted: true, lastModifiedAt: new Date().toISOString(), pendingFirestoreSync: true }), TIMEOUT_MS);
}

export async function fetchActiveRuns(): Promise<SequenceRun[]> {
  if (!db) return [];
  const col = collection(db, 'sequence_runs');
  const q = query(col, where('completedAt', '==', null));
  const snap = await withTimeout(getDocs(q), TIMEOUT_MS);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SequenceRun, 'id'>) }));
}

export async function fetchAllRuns(): Promise<SequenceRun[]> {
  if (!db) return [];
  const col = collection(db, 'sequence_runs');
  const q = query(col, orderBy('startedAt', 'desc'));
  const snap = await withTimeout(getDocs(q), TIMEOUT_MS);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SequenceRun, 'id'>) }));
}

export async function fetchRunsForSequence(sequenceId: string): Promise<SequenceRun[]> {
  if (!db) return [];
  const col = collection(db, 'sequence_runs');
  const q = query(col, where('sequenceId', '==', sequenceId), orderBy('startedAt', 'desc'));
  const snap = await withTimeout(getDocs(q), TIMEOUT_MS);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SequenceRun, 'id'>) }));
}

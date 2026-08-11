import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, getDoc, doc, addDoc, updateDoc, deleteField } from 'firebase/firestore';
import type { Sequence, SequenceRun } from '../types/sequence';
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
    return {
      id: d.id,
      name: data.name as string || '',
      description: data.description as string || '',
      steps: (data.steps as { stepId: string; position: number }[] || []).map((s) => ({
        stepId: s.stepId,
        position: s.position,
      })),
      isDeleted: data.isDeleted as boolean || false,
      createdAt: data.createdAt as string || '',
      lastModifiedAt: data.lastModifiedAt as string || '',
      pendingFirestoreSync: data.pendingFirestoreSync as boolean || false,
    };
  });
}

export async function fetchSequenceById(id: string): Promise<Sequence | null> {
  if (!db) return null;
  const ref = doc(db, 'sequences', id);
  const snap = await withTimeout(getDoc(ref), TIMEOUT_MS);
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: data.name as string || '',
    description: data.description as string || '',
    steps: (data.steps as { stepId: string; position: number }[] || []).map((s) => ({
      stepId: s.stepId,
      position: s.position,
    })),
    isDeleted: data.isDeleted as boolean || false,
    createdAt: data.createdAt as string || '',
    lastModifiedAt: data.lastModifiedAt as string || '',
    pendingFirestoreSync: data.pendingFirestoreSync as boolean || false,
  };
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

import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, getDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import type { Step } from '../types/step';

const TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)),
  ]).catch((err) => {
    console.warn('[Firestore]', err);
    throw err;
  });
}

export async function fetchSteps(): Promise<Step[]> {
  if (!db) return [];
  const col = collection(db, 'steps');
  const q = query(col, where('isDeleted', '==', false), orderBy('title', 'asc'));
  const snap = await withTimeout(getDocs(q), TIMEOUT_MS);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Step, 'id'>) }));
}

export async function fetchStepById(id: string): Promise<Step | null> {
  if (!db) return null;
  const ref = doc(db, 'steps', id);
  const snap = await withTimeout(getDoc(ref), TIMEOUT_MS);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Step, 'id'>) };
}

export async function createStep(data: Omit<Step, 'id'>): Promise<string | null> {
  if (!db) return null;
  const col = collection(db, 'steps');
  const ref = await withTimeout(addDoc(col, data), TIMEOUT_MS);
  return ref.id;
}

export async function updateStep(id: string, data: Partial<Omit<Step, 'id'>>): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'steps', id);
  await withTimeout(updateDoc(ref, data), TIMEOUT_MS);
}

export async function deleteStep(id: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'steps', id);
  await withTimeout(updateDoc(ref, { isDeleted: true, lastModifiedAt: new Date().toISOString() }), TIMEOUT_MS);
}

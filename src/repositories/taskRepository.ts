import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Task } from '../types/task';
function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfToday(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

async function safeGetDocs(q: ReturnType<typeof query>) {
  if (!db) return { docs: [] as never[] };
  return getDocs(q);
}

export async function fetchIncompleteTasks(): Promise<Task[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'tasks'),
    where('completedAt', '==', null),
  );
  const snap = await safeGetDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
}

export async function fetchCompletedToday(): Promise<Task[]> {
  if (!db) return [];
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const q = query(
    collection(db, 'tasks'),
    where('completedAt', '>=', todayStart),
    where('completedAt', '<=', todayEnd),
  );
  const snap = await safeGetDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, 'id'>) }));
}

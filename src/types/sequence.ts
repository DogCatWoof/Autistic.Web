import type { StepReference } from './step';

export interface Sequence {
  id: string;
  name: string;
  description: string;
  steps: StepReference[];
  isDeleted: boolean;
  createdAt: string;
  lastModifiedAt: string;
  pendingFirestoreSync: boolean;
}

export interface SetRecord {
  setNumber: number;
  weight?: number;
  reps?: number;
  durationSeconds?: number;
}

export interface StepRecord {
  stepId: string;
  stepType: string;
  label: string;
  sets: SetRecord[];
}

export interface SequenceRun {
  id: string;
  sequenceId: string;
  startedAt: string;
  completedAt: string | null;
  stepRecords: StepRecord[];
}

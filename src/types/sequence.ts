export interface MediaAttachment {
  url: string;
  scale: number;
  x?: number;
  y?: number;
}

export interface StepBase<T extends string> {
  id: string;
  type: T;
  position: number;
  title: string;
  instructions: string;
  media: MediaAttachment[];
}

export interface RepetitionStep extends StepBase<'repetition'> {
  equipment: string;
  unit: 'none' | 'weight' | 'seconds';
  steps: number;
  reps: number;
  weightLb: number;
  durationSeconds: number;
  restBetweenSetsSeconds: number;
  voiceActivation: boolean;
}

export interface ActionStep extends StepBase<'action'> {
  durationMinutes: number;
  timerEndBehavior: 'none' | 'notification';
  useDuration: boolean;
}

export interface RepeatGroupStep extends StepBase<'repeat_group'> {
  steps: SequenceStep[];
}

export type SequenceStep = RepetitionStep | RepeatGroupStep | ActionStep;

export interface Sequence {
  id: string;
  name: string;
  description: string;
  steps: SequenceStep[];
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

export function createStep(type: SequenceStep['type'], position: number): SequenceStep {
  const id = window.crypto.randomUUID();
  switch (type) {
    case 'repetition':
      return { id, type, position, title: '', equipment: '', unit: 'none', steps: 3, reps: 10, weightLb: 0, durationSeconds: 0, restBetweenSetsSeconds: 20, voiceActivation: false, instructions: '', media: [] };
    case 'repeat_group':
      return { id, type, position, title: '', steps: [], instructions: '', media: [] };
    case 'action':
      return { id, type, position, title: '', durationMinutes: 10, timerEndBehavior: 'notification', useDuration: false, instructions: '', media: [] };
  }
}

export interface MediaAttachment {
  url: string;
  scale: number;
  x?: number;
  y?: number;
}

export interface StepReference {
  stepId: string;
  position: number;
}

export interface Step {
  id: string;
  type: 'repetition' | 'repeat_group' | 'action';
  title: string;
  instructions: string;
  media: MediaAttachment[];
  equipment: string;
  unit: 'none' | 'weight' | 'seconds';
  steps: number;
  reps: number;
  weightLb: number;
  durationSeconds: number;
  restBetweenSetsSeconds: number;
  voiceActivation: boolean;
  durationMinutes: number;
  timerEndBehavior: 'none' | 'notification';
  useDuration: boolean;
  childSteps: StepReference[];
  isDeleted: boolean;
  usedBy: string[];
  createdAt: string;
  lastModifiedAt: string;
}

export function createStepDoc(type: Step['type']): Omit<Step, 'id'> {
  const now = new Date().toISOString();
  const base = {
    type,
    title: '',
    instructions: '',
    media: [] as MediaAttachment[],
    equipment: '',
    unit: 'none' as const,
    steps: 3,
    reps: 10,
    weightLb: 0,
    durationSeconds: 0,
    restBetweenSetsSeconds: 20,
    voiceActivation: false,
    durationMinutes: 10,
    timerEndBehavior: 'notification' as const,
    useDuration: false,
    childSteps: [] as StepReference[],
    isDeleted: false,
    usedBy: [] as string[],
    createdAt: now,
    lastModifiedAt: now,
  };
  switch (type) {
    case 'repetition':
      return { ...base, unit: 'none' as const };
    case 'repeat_group':
      return { ...base, childSteps: [] as StepReference[] };
    case 'action':
      return { ...base, durationMinutes: 10, timerEndBehavior: 'notification' as const, useDuration: false };
  }
}

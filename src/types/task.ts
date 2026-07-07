export interface Task {
  id: string;
  task: string;
  category: string;
  dueAt: string | null;
  expectedTimeMinutes: number | null;
  isImportant: boolean;
  notes: string | null;
  dailyTaskId: string | null;
  completedAt: string | null;
  createdAt: string;
}

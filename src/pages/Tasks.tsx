import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fetchIncompleteTasks } from '../repositories/taskRepository';
import type { Task } from '../types/task';

function groupByCategory(tasks: Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const t of tasks) {
    const cat = t.category || '(no category)';
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(t);
  }
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
    const aDue = a.dueAt ? parseISO(a.dueAt).getTime() : Infinity;
    const bDue = b.dueAt ? parseISO(b.dueAt).getTime() : Infinity;
    return aDue - bDue;
  });
}

function formatDue(dueAt: string | null): string {
  if (!dueAt) return 'all day';
  return format(parseISO(dueAt), 'h:mm a');
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '';
  return `${minutes} min`;
}

function TaskRow({ task }: { task: Task }) {
  const [notesOpen, setNotesOpen] = React.useState(false);
  return (
    <div className="border-b border-gray-100 py-3">
      <div className="flex items-start gap-2">
        {task.isImportant && <span className="text-amber-400 text-lg">★</span>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{task.task}</span>
            {task.dailyTaskId && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Daily</span>
            )}
          </div>
          <div className="flex gap-3 text-sm text-gray-500 mt-0.5">
            <span>{formatDue(task.dueAt)}</span>
            {task.expectedTimeMinutes != null && (
              <span>{formatDuration(task.expectedTimeMinutes)}</span>
            )}
          </div>
          {task.notes && (
            <div className="mt-1">
              <button
                onClick={() => setNotesOpen(!notesOpen)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {notesOpen ? 'Hide' : 'Show'} notes
              </button>
              {notesOpen && (
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{task.notes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { data: incomplete = [], isLoading, error } = useQuery({
    queryKey: ['tasks', 'incomplete'],
    queryFn: fetchIncompleteTasks,
  });

  if (error) return <div className="p-4 text-red-500">Error: {String(error)}</div>;
  if (isLoading) return <div className="p-4 text-gray-500">Loading tasks...</div>;

  const grouped = groupByCategory(incomplete);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Today's Tasks</h1>

      {incomplete.length === 0 && <p className="text-gray-500">No tasks for today.</p>}

      {[...grouped.entries()].map(([category, tasks]) => (
        <div key={category} className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">{category}</h2>
          <div className="bg-white rounded-lg border border-gray-200">
            {sortTasks(tasks).map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

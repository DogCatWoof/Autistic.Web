import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSequences, useSequence, useAllRuns, useActiveRuns, useCreateSequence, useUpdateSequence, useDeleteSequence } from '../hooks/useSequences';
import SequenceEditor from '../components/SequenceEditor';
import StepCard from '../components/StepCard';
import { stepTypeMeta, StepFieldsForm } from '../components/stepFields';
import type { Sequence, SequenceStep, RepeatGroupStep, TimerStep } from '../types/sequence';

function SequenceRow({ sequence, isActive, onSelect }: { sequence: Sequence; isActive: boolean; onSelect: () => void }) {
  const totalSets = sequence.steps.reduce((sum, s) => {
    if (s.type === 'exercise' || s.type === 'stretch') return sum + s.sets;
    return sum + 1;
  }, 0);

  function repeatLabel(): string | null {
    if (sequence.repeatMode === 'until_done') return '🔁 until done';
    if (sequence.repeatMode === 'count') return `🔁 ${sequence.repeatCount}x`;
    return null;
  }

  const badge = repeatLabel();

  return (
    <button onClick={onSelect} className="w-full text-left border border-gray-200 rounded-lg p-3 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="font-medium">{sequence.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {badge && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{badge}</span>}
          {sequence.steps.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{sequence.steps.length} steps</span>}
        </div>
      </div>
      <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
        {totalSets} set{totalSets !== 1 ? 's' : ''} total
        {isActive && <span className="text-green-600 text-xs bg-green-50 px-1.5 py-0.5 rounded font-medium">▶ active</span>}
      </div>
    </button>
  );
}

function formatDuration(startedAt: string, completedAt: string): string {
  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function SequenceListView({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  const { data: sequences = [], isLoading, error } = useSequences();
  const { data: activeRuns = [] } = useActiveRuns();
  const { data: allRuns = [] } = useAllRuns();
  const activeIds = new Set(activeRuns.map((r) => r.sequenceId));
  const [showRuns, setShowRuns] = useState(false);

  const seqNameById = new Map(sequences.map((s) => [s.id, s.name]));
  const runs = allRuns.toSorted((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (error) return <div className="p-4 text-red-500">Error: {String(error)}</div>;
  if (isLoading) return <div className="p-4 text-gray-500">Loading sequences...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Sequences</h1>
        <button onClick={onNew} className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
          <span className="text-lg leading-none">+</span> New
        </button>
      </div>

      {sequences.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🔄</div>
          <p className="font-medium mb-1">No sequences yet</p>
          <p className="text-sm mb-4">Create your first sequence to guide you through tasks like workouts, laundry, or daily routines.</p>
          <button onClick={onNew} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">+ Create Sequence</button>
        </div>
      )}

      <div className="space-y-2">
        {sequences.map((seq) => (
          <SequenceRow key={seq.id} sequence={seq} isActive={activeIds.has(seq.id)} onSelect={() => onSelect(seq.id)} />
        ))}
      </div>

      <div className="mt-8">
        <button onClick={() => setShowRuns(!showRuns)} className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {showRuns ? '▼' : '▶'} Run History ({runs.length})
        </button>
        {showRuns && (
          <div className="mt-2 space-y-2">
            {runs.length === 0 && <p className="text-sm text-gray-400 italic">No runs yet.</p>}
            {runs.map((run) => (
              <div key={run.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{seqNameById.get(run.sequenceId) || 'Unknown'}</span>
                    <span className="text-gray-400">{format(parseISO(run.startedAt), 'MMM d')}</span>
                  </div>
                  {run.completedAt ? (
                    <span className="text-green-600 text-xs bg-green-50 px-1.5 py-0.5 rounded">{formatDuration(run.startedAt, run.completedAt)}</span>
                  ) : (
                    <span className="text-amber-600 text-xs bg-amber-50 px-1.5 py-0.5 rounded">In progress</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs mb-2">
                  {run.completedAt
                    ? `${format(parseISO(run.startedAt), 'h:mm a')} – ${format(parseISO(run.completedAt), 'h:mm a')}`
                    : `Started ${format(parseISO(run.startedAt), 'MMM d, h:mm a')}`
                  }
                </div>
                {run.stepRecords && run.stepRecords.length > 0 && (
                  <div className="space-y-1.5 border-t border-gray-100 pt-2">
                    {run.stepRecords.map((sr) => (
                      <div key={sr.stepId}>
                        <div className="text-xs font-medium text-gray-700 mb-0.5">{sr.label}</div>
                        <div className="flex flex-wrap gap-1">
                          {sr.sets.map((set) => {
                            let detail = `Set ${set.setNumber}`;
                            if (set.weight != null && set.reps != null) detail += `: ${set.reps} reps @ ${set.weight} lb`;
                            else if (set.reps != null) detail += `: ${set.reps} reps`;
                            else if (set.weight != null) detail += `: ${set.weight} lb`;
                            else if (set.durationSeconds != null) {
                              if (set.durationSeconds >= 60) detail += `: ${set.durationSeconds / 60} min`;
                              else detail += `: ${set.durationSeconds} sec`;
                            }
                            return (
                              <span key={set.setNumber} className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                {detail}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function stepTitle(s: SequenceStep): string {
  if (s.type === 'exercise') return s.exerciseName || '(untitled)';
  if (s.type === 'stretch') return s.stretchName || '(untitled)';
  return s.label || '(untitled)';
}

function DraggableSubStep({ step, isExpanded, onToggle, onUpdate, onDelete }: {
  step: SequenceStep;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (s: SequenceStep) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded bg-white">
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50 select-none"
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter') onToggle(); }}
        role="button"
        tabIndex={0}
      >
        <span {...attributes} {...listeners} title="drag to reorder" className="cursor-grab text-gray-400 hover:text-gray-600 text-xs leading-none tracking-widest select-none">⠿</span>
        <span className="text-xs">{stepTypeMeta[step.type].icon}</span>
        <span className="text-xs text-gray-700 flex-1 truncate">
          {step.position}. {stepTitle(step)}
          {step.type === 'timer' && (step as TimerStep).durationMinutes > 0 && (
            <span className="text-gray-400 ml-1">· {(step as TimerStep).durationMinutes} min</span>
          )}
        </span>
        <span className="text-[11px] text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-gray-400 hover:text-red-500 text-xs leading-none">&times;</button>
      </div>
      {isExpanded && (
        <div className="border-t border-gray-100 p-2">
          <StepFieldsForm step={step} onChange={onUpdate} />
        </div>
      )}
    </div>
  );
}

function DraggableStep({ step, expanded, onToggleExpand, onChange, onDelete }: {
  step: SequenceStep;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (s: SequenceStep) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <StepCard
        step={step}
        expanded={expanded}
        onChange={onChange}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
        dragHandle={<button {...attributes} {...listeners} title="drag to reorder" className="cursor-grab text-gray-400 hover:text-gray-600 text-sm leading-none tracking-widest select-none">⠿</button>}
        renderSubStep={({ step: subStep, isExpanded: subExpanded, onToggle, onUpdate, onDelete: subDelete }) => (
          <DraggableSubStep key={subStep.id} step={subStep} isExpanded={subExpanded} onToggle={onToggle} onUpdate={onUpdate} onDelete={subDelete} />
        )}
      />
    </div>
  );
}

function findParent(steps: SequenceStep[], id: string): { type: 'root'; index: number } | { type: 'group'; groupIndex: number; index: number } | null {
  const rootIdx = steps.findIndex((s) => s.id === id);
  if (rootIdx !== -1) return { type: 'root', index: rootIdx };
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].type === 'repeat_group') {
      const subIdx = (steps[i] as RepeatGroupStep).steps.findIndex((sub) => sub.id === id);
      if (subIdx !== -1) return { type: 'group', groupIndex: i, index: subIdx };
    }
  }
  return null;
}

function removeStep(steps: SequenceStep[], id: string): { steps: SequenceStep[]; removed: SequenceStep; atGroup: boolean; groupIndex: number; atIndex: number } | null {
  const rootIdx = steps.findIndex((s) => s.id === id);
  if (rootIdx !== -1) {
    const removed = steps[rootIdx];
    return { steps: steps.filter((s) => s.id !== id), removed, atGroup: false, groupIndex: -1, atIndex: rootIdx };
  }
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].type === 'repeat_group') {
      const group = steps[i] as RepeatGroupStep;
      const subIdx = group.steps.findIndex((sub) => sub.id === id);
      if (subIdx !== -1) {
        const removed = group.steps[subIdx];
        const next = [...steps];
        next[i] = { ...group, steps: group.steps.filter((_, j) => j !== subIdx) };
        return { steps: next, removed, atGroup: true, groupIndex: i, atIndex: subIdx };
      }
    }
  }
  return null;
}

function SequenceDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: sequence, isLoading, error } = useSequence(id);
  const deleteSeq = useDeleteSequence();
  const updateSeq = useUpdateSequence();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const detailSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  if (error) return <div className="p-4 text-red-500">Error: {String(error)}</div>;
  if (isLoading || !sequence) return <div className="p-4 text-gray-500">Loading...</div>;

  const totalSets = sequence.steps.reduce((sum, s) => {
    if (s.type === 'exercise' || s.type === 'stretch') return sum + s.sets;
    return sum + 1;
  }, 0);

  function handleDelete() {
    const seq = sequence;
    if (!seq) return;
    if (window.confirm(`Delete "${seq.name}"?`)) {
      deleteSeq.mutate(id, { onSuccess: onBack });
    }
  }

  function handleTitleSave() {
    const trimmed = titleDraft.trim();
    const seq = sequence;
    if (seq && trimmed && trimmed !== seq.name) {
      updateSeq.mutate({ id, data: { name: trimmed, lastModifiedAt: new Date().toISOString(), pendingFirestoreSync: true } });
    }
    setEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') setEditingTitle(false);
  }

  function handleStepChange(updated: SequenceStep) {
    const seq = sequence;
    if (!seq) return;
    const newSteps = seq.steps.map((s) => (s.id === updated.id ? { ...updated, position: s.position } : s));
    updateSeq.mutate({ id, data: { steps: newSteps, lastModifiedAt: new Date().toISOString(), pendingFirestoreSync: true } });
  }

  function handleDeleteStep(stepId: string) {
    const seq = sequence;
    if (!seq) return;
    const step = seq.steps.find((s) => s.id === stepId);
    if (!step) return;
    const name = step.type === 'exercise' ? step.exerciseName : step.type === 'stretch' ? step.stretchName : step.label || 'untitled';
    if (window.confirm(`Delete step "${name}"?`)) {
      updateSeq.mutate({
        id,
        data: {
          steps: seq.steps.filter((s) => s.id !== stepId),
          lastModifiedAt: new Date().toISOString(),
          pendingFirestoreSync: true,
        },
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || String(active.id) === String(over.id)) return;
    const seq = sequence;
    if (!seq) return;
    const removed = removeStep(seq.steps, String(active.id));
    if (!removed) return;
    const overParent = findParent(removed.steps, String(over.id));
    if (!overParent) return;
    let result: SequenceStep[];
    if (overParent.type === 'root') {
      result = [...removed.steps];
      result.splice(overParent.index, 0, removed.removed);
    } else {
      result = [...removed.steps];
      const group = result[overParent.groupIndex] as RepeatGroupStep;
      const newSub = [...group.steps];
      newSub.splice(overParent.index, 0, removed.removed);
      result[overParent.groupIndex] = { ...group, steps: newSub };
    }
    updateSeq.mutate({ id, data: { steps: result, lastModifiedAt: new Date().toISOString(), pendingFirestoreSync: true } });
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">&larr; Sequences</button>
        <div className="flex gap-2">
          <button onClick={handleDelete} className="px-3 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Delete</button>
        </div>
      </div>

      {editingTitle ? (
        <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} onBlur={handleTitleSave} onKeyDown={handleTitleKeyDown} className="text-2xl font-bold mb-1 border-b-2 border-blue-400 outline-none w-full pb-0.5" autoFocus />
      ) : (
        <h1 onClick={() => { setTitleDraft(sequence.name); setEditingTitle(true); }} onKeyDown={(e) => { if (e.key === 'Enter') { setTitleDraft(sequence.name); setEditingTitle(true); } }} tabIndex={0} role="button" className="text-2xl font-bold mb-1 cursor-pointer hover:text-gray-600">{sequence.name} <span className="text-sm text-gray-300 font-normal">✎</span></h1>
      )}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <span>{sequence.steps.length} steps &middot; {totalSets} set{totalSets !== 1 ? 's' : ''} total</span>
        {sequence.repeatMode === 'until_done' && (
          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">🔁 repeats until done</span>
        )}
        {sequence.repeatMode === 'count' && (
          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">🔁 {sequence.repeatCount} repeats</span>
        )}
      </div>

      <div className="space-y-2 mb-6">
        <h2 className="text-sm font-medium text-gray-700">Steps ({sequence.steps.length})</h2>
        <DndContext sensors={detailSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={(() => {
            const ids: string[] = [];
            for (const s of sequence.steps) {
              ids.push(s.id);
              if (s.type === 'repeat_group') ids.push(...(s as RepeatGroupStep).steps.map((sub) => sub.id));
            }
            return ids;
          })()} strategy={verticalListSortingStrategy}>
            {sequence.steps.map((step) => (
              <DraggableStep
                key={step.id}
                step={step}
                expanded={expandedStepId === step.id}
                onChange={(updated) => handleStepChange(updated)}
                onToggleExpand={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
                onDelete={() => handleDeleteStep(step.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {sequence.steps.length === 0 && <p className="text-sm text-gray-400 italic">No steps defined.</p>}
      </div>
    </div>
  );
}

function EditView({ id, onSave, onCancel }: { id: string | null; onSave: (data: Omit<Sequence, 'id'>) => void; onCancel: () => void }) {
  const { data: sequence } = useSequence(id ?? undefined);
  if (id && !sequence) return <div className="p-4 text-gray-500">Loading...</div>;
  return <SequenceEditor sequence={id ? sequence! : null} onSave={onSave} onCancel={onCancel} />;
}

export default function SequencesPage() {
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const createSeq = useCreateSequence();
  const updateSeq = useUpdateSequence();
  const { refetch } = useSequences();

  function handleSave(data: Omit<Sequence, 'id'>) {
    if (selectedId) {
      updateSeq.mutate({ id: selectedId, data }, { onSuccess: () => setView('detail') });
    } else {
      createSeq.mutate(data, { onSuccess: () => { refetch(); setView('list'); } });
    }
  }

  if (view === 'edit') {
    return <EditView id={selectedId} onSave={handleSave} onCancel={() => setView(selectedId ? 'detail' : 'list')} />;
  }

  if (view === 'detail' && selectedId) {
    return <SequenceDetailView id={selectedId} onBack={() => { setSelectedId(null); setView('list'); }} />;
  }

  return <SequenceListView onSelect={(id) => { setSelectedId(id); setView('detail'); }} onNew={() => { setSelectedId(null); setView('edit'); }} />;
}

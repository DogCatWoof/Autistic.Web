import { useState, useRef } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import StepTypePicker from './StepTypePicker';
import { stepTypeMeta, StepFieldsForm, StepFieldsDisplay } from './stepFields';
import { StepIcon } from './StepIcons';
import { createStep, type Sequence, type SequenceStep, type RepeatGroupStep } from '../types/sequence';
import { useCreateSequence, useUpdateSequence, useDeleteSequence } from '../hooks/useSequences';

function stepTitle(step: SequenceStep): string {
  return step.title || '(untitled)';
}

function buildSaveData(name: string, description: string, steps: SequenceStep[], createdAt: string): Omit<Sequence, 'id'> {
  const reindexed = steps.map((s, i) => ({ ...s, position: i + 1 }));
  return {
    name,
    description,
    steps: reindexed,
    isDeleted: false,
    createdAt,
    lastModifiedAt: new Date().toISOString(),
    pendingFirestoreSync: true,
  };
}

function SortableStep({ step, positionLabel, compact, onChange, onDelete, onSave, autoEdit, onAutoEditDone }: {
  step: SequenceStep;
  positionLabel: string;
  compact?: boolean;
  onChange: (step: SequenceStep) => void;
  onDelete: () => void;
  onSave: () => void;
  autoEdit?: boolean;
  onAutoEditDone?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [editMode, setEditMode] = useState(autoEdit ?? false);
  const [expanded, setExpanded] = useState(autoEdit ?? false);
  const snapshotRef = useRef(step);

  const isRepeatGroup = step.type === 'repeat_group';
  const rgStep = isRepeatGroup ? (step as RepeatGroupStep) : null;
  const [newSubStepId, setNewSubStepId] = useState<string | null>(null);

  function updateSubStep(id: string, updated: SequenceStep) {
    if (!rgStep) return;
    onChange({ ...step, steps: rgStep.steps.map((s) => (s.id === id ? updated : s)) } as SequenceStep);
  }

  function deleteSubStep(id: string) {
    if (!rgStep) return;
    const target = rgStep.steps.find((s) => s.id === id);
    if (!target) return;
    if (!window.confirm(`Delete sub-step "${stepTitle(target)}"?`)) return;
    onChange({ ...step, steps: rgStep.steps.filter((s) => s.id !== id) } as SequenceStep);
  }

  function addSubStep(type: SequenceStep['type']) {
    if (!rgStep) return;
    const newStep = createStep(type, rgStep.steps.length + 1);
    setNewSubStepId(newStep.id);
    onChange({ ...step, steps: [...rgStep.steps, newStep] } as SequenceStep);
  }

  function handleEditClick() {
    if (editMode) {
      onSave();
      setEditMode(false);
    } else {
      snapshotRef.current = step;
      setEditMode(true);
      setExpanded(true);
    }
  }

  function handleCancel() {
    onChange(snapshotRef.current);
    setEditMode(false);
    onAutoEditDone?.();
  }

  function handleHeaderClick() {
    if (editMode) return;
    setExpanded((e) => !e);
  }

  function handleTitleChange(value: string) {
    onChange({ ...step, title: value });
  }

  const hdrGap = compact ? 'gap-1.5' : 'gap-2';
  const hdrPad = compact ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const hdrBg = compact ? 'bg-gray-50/50' : '';
  const iconSize = compact ? 'text-sm' : 'text-lg';
  const titleSize = compact ? 'text-xs' : 'text-sm';
  const dragSize = compact ? 'text-xs' : 'text-sm';
  const bodyPad = compact ? 'p-2.5' : 'p-3';
  const btnSize = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg bg-white">
      <div className={`flex items-center ${hdrGap} ${hdrPad} border-b border-gray-100 ${hdrBg}`}>
        <button {...attributes} {...listeners} title="drag to reorder" className={`cursor-grab text-gray-400 hover:text-gray-600 ${dragSize} leading-none tracking-widest select-none`}>⠿</button>
        {editMode ? (
          <>
            <span className={iconSize}><StepIcon type={step.type} count={positionLabel} /></span>
            <input
              value={stepTitle(step) === '(untitled)' ? '' : stepTitle(step)}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Title"
              className={`${compact ? 'text-xs' : 'text-sm'} border border-gray-200 rounded px-1.5 py-0.5 flex-1 min-w-0 outline-none focus:border-blue-400`}
              autoFocus
            />
            <div className="flex items-center gap-1">
              <button onClick={handleEditClick} className={`${btnSize} text-blue-500 hover:text-blue-700`}>Save</button>
              <button onClick={handleCancel} className={`${btnSize} text-gray-400 hover:text-gray-600`}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <button onClick={handleHeaderClick} className={`flex items-center ${hdrGap} flex-1 min-w-0 text-left`}>
              <span className={iconSize}><StepIcon type={step.type} count={positionLabel} /></span>
              <span className={`${titleSize} text-gray-700 truncate`}>{stepTitle(step)}</span>
            </button>
            <button onClick={handleEditClick} className={`${btnSize} text-gray-400 hover:text-gray-600`}>Edit</button>
          </>
        )}
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 text-lg leading-none">&times;</button>
      </div>
      {isRepeatGroup && expanded && (
        <div className={bodyPad}>
          <div className="space-y-1.5">
            <div className="text-xs text-purple-500 font-medium mb-2">🔁 Repeats until done</div>
            {rgStep!.steps.map((s) => (
              <SortableStep key={s.id} step={s} positionLabel={`${step.position}.${s.position}`} compact onChange={(u) => updateSubStep(s.id, u)} onDelete={() => deleteSubStep(s.id)} onSave={onSave} autoEdit={s.id === newSubStepId} onAutoEditDone={() => { if (newSubStepId === s.id) setNewSubStepId(null); }} />
            ))}
            {rgStep && rgStep.steps.length === 0 && (
              <p className="text-xs text-gray-400 italic mb-2">No sub-steps yet.</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(['action', 'repetition'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addSubStep(t)}
                  className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                >+ {stepTypeMeta[t].icon()} {stepTypeMeta[t].label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
      {!isRepeatGroup && expanded && (
        <div className={bodyPad}>
          {editMode ? <StepFieldsForm step={step} onChange={onChange} /> : <StepFieldsDisplay step={step} />}
        </div>
      )}
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
    const next = steps.filter((s) => s.id !== id);
    return { steps: next, removed, atGroup: false, groupIndex: -1, atIndex: rootIdx };
  }
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].type === 'repeat_group') {
      const group = steps[i] as RepeatGroupStep;
      const subIdx = group.steps.findIndex((sub) => sub.id === id);
      if (subIdx !== -1) {
        const removed = group.steps[subIdx];
        const updatedGroup = { ...group, steps: group.steps.filter((_, j) => j !== subIdx) };
        const next = [...steps];
        next[i] = updatedGroup;
        return { steps: next, removed, atGroup: true, groupIndex: i, atIndex: subIdx };
      }
    }
  }
  return null;
}

interface EditorProps { sequence: Sequence | null; onCancel: () => void }

export default function SequenceEditor({ sequence, onCancel }: EditorProps) {
  const [name, setName] = useState(sequence?.name || '');
  const [description, setDescription] = useState(sequence?.description || '');
  const [steps, setSteps] = useState<SequenceStep[]>(sequence?.steps || []);
  const [showPicker, setShowPicker] = useState(false);
  const [newStepId, setNewStepId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docId, setDocId] = useState<string | null>(sequence?.id ?? null);

  const initialRef = useRef({ name: sequence?.name || '', description: sequence?.description || '' });
  const dirty = name !== initialRef.current.name || description !== initialRef.current.description;

  const createdAt = sequence?.createdAt || new Date().toISOString();
  const createSeq = useCreateSequence();
  const updateSeq = useUpdateSequence();
  const deleteSeq = useDeleteSequence();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const allIds = steps.flatMap((s) =>
    s.type === 'repeat_group' ? [s.id, ...s.steps.map((sub) => sub.id)] : [s.id],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || String(active.id) === String(over.id)) return;
    const removed = removeStep(steps, String(active.id));
    if (!removed) return;
    const overParent = findParent(removed.steps, String(over.id));
    if (!overParent) return;
    if (overParent.type === 'root') {
      const next = [...removed.steps];
      next.splice(overParent.index, 0, removed.removed);
      setSteps(next);
    } else {
      const next = [...removed.steps];
      const group = next[overParent.groupIndex] as RepeatGroupStep;
      const newSub = [...group.steps];
      newSub.splice(overParent.index, 0, removed.removed);
      next[overParent.groupIndex] = { ...group, steps: newSub };
      setSteps(next);
    }
  }

  function handleAddStep(type: SequenceStep['type']) {
    const newStep = createStep(type, steps.length + 1);
    setSteps([...steps, newStep]);
    setNewStepId(newStep.id);
    setShowPicker(false);
  }

  function handleDeleteStep(id: string) {
    setSteps(steps.filter((s) => s.id !== id));
  }

  function handleStepChange(updated: SequenceStep) {
    setSteps(steps.map((s) => (s.id === updated.id ? updated : s)));
  }

  function handleDelete() {
    if (!docId || !window.confirm(`Delete "${name}"?`)) return;
    deleteSeq.mutate(docId, { onSuccess: onCancel });
  }

  function handleSave() {
    setSaving(true);
    const data = buildSaveData(name, description, steps, createdAt);
    if (docId) {
      updateSeq.mutate({ id: docId, data }, { onSettled: () => { setSaving(false); initialRef.current = { name, description }; } });
    } else {
      createSeq.mutate(data, {
        onSuccess: (newId) => { if (newId) setDocId(newId); },
        onSettled: () => { setSaving(false); initialRef.current = { name, description }; },
      });
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">&larr; Sequences</button>
        <div className="flex items-center gap-2">
          {dirty && <button onClick={handleSave} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600">Save</button>}
          {docId && <button onClick={handleDelete} className="text-xs border border-red-200 text-red-500 px-2 py-1 rounded hover:bg-red-50">Delete</button>}
          {saving && <span className="text-xs text-gray-400">Saving...</span>}
        </div>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sequence name"
        className="text-2xl font-bold border-b-2 border-transparent focus:border-blue-400 outline-none w-full pb-0.5"
        autoFocus
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full text-sm text-gray-600 border border-gray-200 rounded px-2 py-1.5 mt-2 resize-none focus:outline-none focus:border-blue-400"
      />

      <div className="space-y-2 mt-4 mb-4">
        <h2 className="text-sm font-medium text-gray-700">Steps ({steps.length})</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
            {steps.map((step) => (
              <SortableStep
                key={step.id}
                step={step}
                positionLabel={String(step.position)}
                onChange={handleStepChange}
                onDelete={() => handleDeleteStep(step.id)}
                onSave={() => { setNewStepId(null); handleSave(); }}
                autoEdit={step.id === newStepId}
              />
            ))}
          </SortableContext>
        </DndContext>
        {steps.length === 0 && <p className="text-sm text-gray-400 italic">No steps yet. Add one below.</p>}
      </div>

      <button onClick={() => setShowPicker(true)} className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700">
        <span className="text-lg">+</span> Add Step
      </button>

      {showPicker && <StepTypePicker onSelect={handleAddStep} onClose={() => setShowPicker(false)} />}
    </div>
  );
}

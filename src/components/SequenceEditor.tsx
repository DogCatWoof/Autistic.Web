import { useState, useRef, useMemo, type MouseEvent } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { stepTypeMeta, StepFieldsDisplay, StepFieldsForm } from './stepFields';
import { StepIcon } from './StepIcons';
import { useSteps, useStepsByIds, useCreateStep, useUpdateStep } from '../hooks/useSteps';
import { useCreateSequence, useUpdateSequence, useDeleteSequence } from '../hooks/useSequences';
import type { Sequence } from '../types/sequence';
import type { StepReference, Step } from '../types/step';
import { createStepDoc } from '../types/step';

const stepIdSet = (refs: StepReference[]): string[] => refs.map((r) => r.stepId);

function buildSaveData(name: string, description: string, steps: StepReference[], createdAt: string): Omit<Sequence, 'id'> {
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

function stepRefById(ref: StepReference, steps: Step[]): Step | undefined {
  return steps.find((s) => s.id === ref.stepId);
}

function StepCard({
  step,
  position,
  expanded,
  onToggle,
  dragHandle,
  actions,
  children,
}: {
  step: Step;
  position: number;
  expanded: boolean;
  onToggle: () => void;
  dragHandle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        {dragHandle}
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <span className="text-lg"><StepIcon type={step.type} count={position} /></span>
          <span className="text-sm text-gray-700 truncate">{step.title || '(untitled)'}</span>
          <span className="text-xs text-gray-400 ml-auto">{expanded ? '▲' : '▼'}</span>
        </button>
        {actions}
      </div>
      {expanded && children && <div className="p-3">{children}</div>}
    </div>
  );
}

function SortableStep({
  ref: stepRef,
  resolvedSteps,
  childStepsData,
  onRemove,
  onStepUpdated,
}: {
  ref: StepReference;
  resolvedSteps: Step[];
  childStepsData: Step[];
  onRemove: () => void;
  onStepUpdated: () => void;
}) {
  const step = stepRefById(stepRef, resolvedSteps);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stepRef.stepId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStep, setEditStep] = useState<Step | null>(null);
  const updateStep = useUpdateStep();

  if (!step) {
    return (
      <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <span className="text-sm text-gray-400 italic">Unknown step (ID: {stepRef.stepId})</span>
      </div>
    );
  }

  function handleHeaderClick() {
    setExpanded((e) => !e);
  }

  function handleEdit(e: MouseEvent) {
    e.stopPropagation();
    if (editMode) {
      handleSaveEdit();
    } else {
      setEditStep({ ...step } as Step);
      setEditMode(true);
      setExpanded(true);
    }
  }

  function handleSaveEdit() {
    if (!editStep || !step) return;
    updateStep.mutate(
      { id: step.id, data: { ...editStep, lastModifiedAt: new Date().toISOString() } },
      { onSuccess: () => { setEditMode(false); setEditStep(null); onStepUpdated(); } },
    );
  }

  function handleCancelEdit(e: MouseEvent) {
    e.stopPropagation();
    setEditMode(false);
    setEditStep(null);
    setExpanded(false);
  }

  const dragHandle = (
    <button {...attributes} {...listeners} title="drag to reorder" className="cursor-grab text-gray-400 hover:text-gray-600 text-sm leading-none tracking-widest select-none">⠿</button>
  );

  const actions = editMode ? (
    <>
      <button onClick={handleEdit} className="text-xs text-blue-500 hover:text-blue-700">Save</button>
      <button onClick={handleCancelEdit} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
    </>
  ) : (
    <>
      <button onClick={handleEdit} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-lg leading-none">&times;</button>
    </>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <StepCard step={step} position={stepRef.position} expanded={expanded} onToggle={handleHeaderClick} dragHandle={dragHandle} actions={actions}>
        {editMode && editStep && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-500 font-medium">{stepTypeMeta[editStep.type]?.label}</span>
            </div>
            <input
              value={editStep.title}
              onChange={(e) => setEditStep({ ...editStep, title: e.target.value })}
              placeholder="Step title"
              className="text-sm font-semibold border-b border-gray-200 focus:border-blue-400 outline-none w-full pb-0.5 mb-3"
            />
            <StepFieldsForm step={editStep} onChange={setEditStep} />
          </>
        )}
        {!editMode && step.type !== 'repeat_group' && (
          <StepFieldsDisplay step={step} />
        )}
        {step.type === 'repeat_group' && (
          <div className="mt-2">
            <div className="text-xs text-purple-500 font-medium mb-2">🔁 Repeats until done</div>
            {step.childSteps.length === 0 && (
              <p className="text-xs text-gray-400 italic">No child steps.</p>
            )}
            <div className="space-y-1.5">
              {step.childSteps.map((csRef) => {
                const cs = childStepsData.find((s) => s.id === csRef.stepId);
                if (!cs) {
                  return (
                    <div key={csRef.stepId} className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-400 italic">
                      Loading step {csRef.position}...
                    </div>
                  );
                }
                return <ChildStepCard key={csRef.stepId} step={cs} position={csRef.position} onStepUpdated={onStepUpdated} />;
              })}
            </div>
          </div>
        )}
      </StepCard>
    </div>
  );
}

function ChildStepCard({ step, position, onStepUpdated }: { step: Step; position: number; onStepUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editStep, setEditStep] = useState<Step | null>(null);
  const updateStep = useUpdateStep();

  function handleEdit(e: MouseEvent) {
    e.stopPropagation();
    if (editMode) {
      handleSaveEdit();
    } else {
      setEditStep({ ...step } as Step);
      setEditMode(true);
      setExpanded(true);
    }
  }

  function handleSaveEdit() {
    if (!editStep || !step) return;
    updateStep.mutate(
      { id: step.id, data: { ...editStep, lastModifiedAt: new Date().toISOString() } },
      { onSuccess: () => { setEditMode(false); setEditStep(null); onStepUpdated(); } },
    );
  }

  function handleCancelEdit(e: MouseEvent) {
    e.stopPropagation();
    setEditMode(false);
    setEditStep(null);
    setExpanded(false);
  }

  const actions = editMode ? (
    <>
      <button onClick={handleEdit} className="text-xs text-blue-500 hover:text-blue-700">Save</button>
      <button onClick={handleCancelEdit} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
    </>
  ) : (
    <button onClick={handleEdit} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
  );

  return (
    <StepCard step={step} position={position} expanded={expanded} onToggle={() => setExpanded((e) => !e)} actions={actions}>
      {editMode && editStep && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 font-medium">{stepTypeMeta[editStep.type]?.label}</span>
          </div>
          <input
            value={editStep.title}
            onChange={(e) => setEditStep({ ...editStep, title: e.target.value })}
            placeholder="Step title"
            className="text-sm font-semibold border-b border-gray-200 focus:border-blue-400 outline-none w-full pb-0.5 mb-3"
          />
          <StepFieldsForm step={editStep} onChange={setEditStep} />
        </>
      )}
      {!editMode && <StepFieldsDisplay step={step} />}
    </StepCard>
  );
}

interface EditorProps { sequence: Sequence | null; onCancel: () => void }

export default function SequenceEditor({ sequence, onCancel }: EditorProps) {
  const [name, setName] = useState(sequence?.name || '');
  const [description, setDescription] = useState(sequence?.description || '');
  const [stepRefs, setStepRefs] = useState<StepReference[]>(sequence?.steps || []);
  const [saving, setSaving] = useState(false);
  const [docId, setDocId] = useState<string | null>(sequence?.id ?? null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'choose' | 'create'>('choose');
  const [newStep, setNewStep] = useState<Omit<Step, 'id'> | null>(null);
  const createStep = useCreateStep();

  const initialRef = useRef({ name: sequence?.name || '', description: sequence?.description || '' });
  const dirty = name !== initialRef.current.name || description !== initialRef.current.description;

  const createdAt = sequence?.createdAt || new Date().toISOString();
  const createSeq = useCreateSequence();
  const updateSeq = useUpdateSequence();
  const deleteSeq = useDeleteSequence();
  const { data: allSteps = [] } = useSteps();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const stepIds = useMemo(() => stepIdSet(stepRefs), [stepRefs]);
  const { data: resolvedSteps = [], refetch: refetchSteps } = useStepsByIds(stepIds);
  const childStepIds = useMemo(() => {
    const ids = new Set<string>();
    for (const ref of stepRefs) {
      const s = resolvedSteps.find((st) => st.id === ref.stepId);
      if (s?.type === 'repeat_group') {
        for (const cs of s.childSteps) ids.add(cs.stepId);
      }
    }
    return [...ids];
  }, [stepRefs, resolvedSteps]);
  const { data: childStepsData = [], refetch: refetchChildSteps } = useStepsByIds(childStepIds);

  const stepsMap = useMemo(() => {
    const m = new Map<string, Step>();
    for (const s of resolvedSteps) m.set(s.id, s);
    return m;
  }, [resolvedSteps]);

  function handleAddStep(stepId: string) {
    const maxPos = stepRefs.reduce((m, r) => Math.max(m, r.position), 0);
    setStepRefs((prev) => [...prev, { stepId, position: maxPos + 1 }]);
    setShowPicker(false);
  }

  function handleCreateInPlace() {
    if (!newStep) return;
    createStep.mutate(newStep, {
      onSuccess: (createdId) => {
        if (!createdId) return;
        const maxPos = stepRefs.reduce((m, r) => Math.max(m, r.position), 0);
        setStepRefs((prev) => [...prev, { stepId: createdId, position: maxPos + 1 }]);
        setNewStep(null);
        setPickerMode('choose');
        setShowPicker(false);
      },
    });
  }

  const availableSteps = useMemo(
    () => allSteps.filter((s) => !stepRefs.some((r) => r.stepId === s.id)),
    [allSteps, stepRefs],
  );

  const allIds = stepRefs.map((r) => r.stepId);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || String(active.id) === String(over.id)) return;

    const oldIdx = stepRefs.findIndex((r) => r.stepId === String(active.id));
    const newIdx = stepRefs.findIndex((r) => r.stepId === String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;

    const next = [...stepRefs];
    const [removed] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, removed);
    setStepRefs(next);
  }

  function handleRemoveRef(stepId: string) {
    const step = stepsMap.get(stepId);
    const label = step?.title || '(untitled)';
    if (!window.confirm(`Remove "${label}" from sequence?`)) return;
    setStepRefs((prev) => prev.filter((r) => r.stepId !== stepId));
  }

  function handleDelete() {
    if (!docId || !window.confirm(`Delete "${name}"?`)) return;
    deleteSeq.mutate(docId, { onSuccess: onCancel });
  }

  function handleSave() {
    setSaving(true);
    const data = buildSaveData(name, description, stepRefs, createdAt);
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
          {(dirty || stepRefs !== (sequence?.steps || [])) && (
            <button onClick={handleSave} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600">Save</button>
          )}
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
        <h2 className="text-sm font-medium text-gray-700">Steps ({stepRefs.length})</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
            {stepRefs.map((ref) => (
              <SortableStep
                key={ref.stepId}
                ref={ref}
                resolvedSteps={resolvedSteps}
                childStepsData={childStepsData}
                onRemove={() => handleRemoveRef(ref.stepId)}
                onStepUpdated={() => { refetchSteps(); refetchChildSteps(); }}
              />
            ))}
          </SortableContext>
        </DndContext>
        {stepRefs.length === 0 && <p className="text-sm text-gray-400 italic">No steps yet. Add one below.</p>}
      </div>

      <button onClick={() => { setPickerMode('choose'); setShowPicker(true); }} className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-700">
        <span className="text-lg">+</span> Add Step
      </button>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-xl shadow-xl p-4 w-96 max-w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Add Step</h2>
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {pickerMode === 'choose' && (
              <>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setPickerMode('create')} className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded px-2.5 py-1">Add a step in place</button>
                </div>
                {availableSteps.length === 0 && (
                  <p className="text-sm text-gray-400 italic">No steps available. Create steps from the Steps page first.</p>
                )}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableSteps.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleAddStep(s.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StepIcon type={s.type} className="w-6 h-6 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{s.title || '(untitled)'}</div>
                          <div className="text-xs text-gray-500">{stepTypeMeta[s.type]?.label || s.type}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {pickerMode === 'create' && (
              <div>
                <button onClick={() => setPickerMode('choose')} className="text-xs text-gray-400 hover:text-gray-600 mb-3">&larr; Back</button>
                {!newStep && (
                  <div className="flex gap-2">
                    {(Object.entries(stepTypeMeta) as [string, typeof stepTypeMeta[keyof typeof stepTypeMeta]][]).map(([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => setNewStep(createStepDoc(key as Step['type']))}
                        className="flex-1 p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-center"
                      >
                        <span className="text-lg block mb-1"><StepIcon type={key as Step['type']} /></span>
                        <span className="text-xs font-medium">{meta.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {newStep && (
                  <div>
                    <input
                      value={newStep.title}
                      onChange={(e) => setNewStep({ ...newStep, title: e.target.value })}
                      placeholder="Step title"
                      className="text-sm font-semibold border-b border-gray-200 focus:border-blue-400 outline-none w-full pb-0.5 mb-3"
                      autoFocus
                    />
                    <StepFieldsForm step={newStep as Step} onChange={(s) => setNewStep(s as unknown as Omit<Step, 'id'>)} />
                    <div className="flex justify-end gap-2 mt-3">
                      <button onClick={() => setNewStep(null)} className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">Back</button>
                      <button onClick={handleCreateInPlace} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600">Create &amp; Add</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

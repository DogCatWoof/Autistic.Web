import { useState, useEffect, useMemo } from 'react';
import { createStepDoc, type Step } from '../types/step';
import { stepTypeMeta, StepFieldsForm } from '../components/stepFields';
import { StepIcon } from '../components/StepIcons';
import StepTypePicker from '../components/StepTypePicker';
import { useSteps, useStep, useStepsByIds, useCreateStep, useUpdateStep, useDeleteStep } from '../hooks/useSteps';
import { useSequences } from '../hooks/useSequences';

function stepSummary(s: Step): string {
  if (s.type === 'repetition') {
    if (s.unit === 'weight' && s.weightLb > 0) return `${s.steps}×${s.reps} @ ${s.weightLb} lb`;
    if (s.unit === 'seconds' && s.durationSeconds > 0) return `${s.steps}×${s.reps} @ ${s.durationSeconds} sec`;
    return `${s.steps}×${s.reps}`;
  }
  if (s.type === 'action' && s.useDuration && s.durationMinutes > 0) return `${s.durationMinutes} min`;
  return '';
}

function StepRow({ step, onSelect }: { step: Step; onSelect: () => void }) {
  const meta = stepTypeMeta[step.type];
  const summary = stepSummary(step);
  return (
    <button onClick={onSelect} className="w-full text-left border border-gray-200 rounded-lg p-3 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3">
        <StepIcon type={step.type} className="text-lg shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{step.title || '(untitled)'}</span>
            <span className="text-xs text-gray-400 shrink-0">{meta.label}</span>
          </div>
          {summary && <div className="text-xs text-gray-500 mt-0.5">{summary}</div>}
        </div>
      </div>
    </button>
  );
}

function StepListView({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  const { data: steps = [], isLoading, error } = useSteps();

  if (error) return <div className="p-4 text-red-500">Error: {String(error)}</div>;
  if (isLoading) return <div className="p-4 text-gray-500">Loading steps...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Steps</h1>
        <button onClick={onNew} className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
          <span className="text-lg leading-none">+</span> New
        </button>
      </div>

      {steps.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="font-medium">No steps yet</p>
          <button onClick={onNew} className="mt-2 text-sm text-blue-500 hover:text-blue-700">Create your first step</button>
        </div>
      )}

      <div className="space-y-2">
        {steps.map((step) => (
          <StepRow key={step.id} step={step} onSelect={() => onSelect(step.id)} />
        ))}
      </div>
    </div>
  );
}



function StepEditView({ id, onCancel }: { id: string; onCancel: () => void }) {
  const { data: serverStep, isLoading } = useStep(id);
  const { data: sequences = [] } = useSequences();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const createStep = useCreateStep();
  const [step, setStep] = useState<Step | null>(null);
  const [showChildPicker, setShowChildPicker] = useState(false);

  const childStepIds = useMemo(() => (step?.childSteps ?? []).map((r) => r.stepId), [step]);
  const { data: childStepsData = [] } = useStepsByIds(childStepIds);

  useEffect(() => {
    if (serverStep) setStep(serverStep);
  }, [serverStep]);

  if (isLoading || !step) return <div className="p-4 text-gray-500">Loading...</div>;
  const s = step;

  const meta = stepTypeMeta[s.type];
  const usedBySequences = sequences.filter((seq) => s.usedBy.includes(seq.id));

  function handleSave() {
    updateStep.mutate({ id, data: { ...s, lastModifiedAt: new Date().toISOString() } });
  }

  function handleDelete() {
    if (!window.confirm(`Delete step "${s.title || '(untitled)'}"?`)) return;
    deleteStep.mutate(id, { onSuccess: onCancel });
  }

  function handleAddChildStep(type: Step['type']) {
    setShowChildPicker(false);
    const now = new Date().toISOString();
    const childDoc = createStepDoc(type);
    createStep.mutate(childDoc, {
      onSuccess: (childId) => {
        if (!childId) return;
        const maxPos = (step?.childSteps ?? []).reduce((m, r) => Math.max(m, r.position), 0);
        const updatedStep: Step = {
          ...step!,
          childSteps: [...(step?.childSteps ?? []), { stepId: childId, position: maxPos + 1 }],
          lastModifiedAt: now,
        };
        setStep(updatedStep);
        updateStep.mutate({ id, data: { childSteps: updatedStep.childSteps, lastModifiedAt: now } });
      },
    });
  }

  function handleRemoveChildStep(childStepId: string) {
    if (!step) return;
    const childStep = childStepsData.find((cs) => cs.id === childStepId);
    const label = childStep?.title || '(untitled)';
    if (!window.confirm(`Remove child step "${label}"?`)) return;
    const now = new Date().toISOString();
    const updatedStep: Step = {
      ...step,
      childSteps: step.childSteps.filter((r) => r.stepId !== childStepId),
      lastModifiedAt: now,
    };
    setStep(updatedStep);
    updateStep.mutate({ id, data: { childSteps: updatedStep.childSteps, lastModifiedAt: now } });
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">&larr; Steps</button>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={updateStep.isPending}
            className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50">
            {updateStep.isPending ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handleDelete} className="text-xs border border-red-200 text-red-500 px-2 py-1 rounded hover:bg-red-50">Delete</button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg"><StepIcon type={step.type} /></span>
        <span className="text-xs text-gray-500 font-medium">{meta.label}</span>
      </div>

      <input value={step.title} onChange={(e) => setStep({ ...step, title: e.target.value })}
        placeholder="Step title"
        className="text-xl font-semibold border-b-2 border-transparent focus:border-blue-400 outline-none w-full pb-0.5 mb-4" />

      <div className="space-y-3">
        <StepFieldsForm
          step={step}
          onChange={setStep}
          onAddChildStep={step.type === 'repeat_group' ? () => setShowChildPicker(true) : undefined}
          onRemoveChildStep={handleRemoveChildStep}
          childSteps={childStepsData}
        />
      </div>

      {showChildPicker && (
        <StepTypePicker
          onSelect={(type) => handleAddChildStep(type)}
          onClose={() => setShowChildPicker(false)}
        />
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Used by</h3>
        {usedBySequences.length > 0 ? (
          <div className="space-y-1">
            {usedBySequences.map((s) => (
              <div key={s.id} className="text-sm text-gray-600">{s.name}</div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Not used in any sequences yet.</p>
        )}
      </div>
    </div>
  );
}

export default function StepsPage() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const createStep = useCreateStep();

  function handleCreate(type: Step['type']) {
    const data = createStepDoc(type);
    createStep.mutate(data, {
      onSuccess: (newId) => {
        if (!newId) return;
        setSelectedId(newId);
        setView('edit');
        setShowPicker(false);
      },
    });
  }

  if (view === 'edit' && selectedId) {
    return <StepEditView id={selectedId} onCancel={() => { setSelectedId(null); setView('list'); }} />;
  }

  return (
    <>
      <StepListView onSelect={(id) => { setSelectedId(id); setView('edit'); }} onNew={() => setShowPicker(true)} />
      {showPicker && <StepTypePicker onSelect={handleCreate} onClose={() => setShowPicker(false)} />}
    </>
  );
}

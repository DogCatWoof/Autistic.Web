import { useState, useEffect } from 'react';
import { createStepDoc, type Step, type MediaAttachment } from '../types/step';
import { stepTypeMeta } from '../components/stepFields';
import { StepIcon } from '../components/StepIcons';
import FileDropInput from '../components/FileDropInput';
import StepTypePicker from '../components/StepTypePicker';
import { useSteps, useStep, useCreateStep, useUpdateStep, useDeleteStep } from '../hooks/useSteps';
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

function NumField({ label, val, onVal }: { label: string; val: number; onVal: (v: number) => void }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" inputMode="numeric" value={val === 0 ? '' : String(val ?? '')}
        onChange={(e) => { const raw = e.target.value; if (raw === '') { onVal(0); return; } const n = Number(raw); if (!isNaN(n)) onVal(Math.max(0, n)); }}
        className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
    </div>
  );
}

function TextField({ label, val, onVal }: { label: string; val: string; onVal: (v: string) => void }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input type="text" value={val ?? ''} onChange={(e) => onVal(e.target.value)}
        className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
    </div>
  );
}

function SelectField({ label, val, options, onVal }: { label: string; val: string; options: [string, string][]; onVal: (v: string) => void }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={String(val ?? '')} onChange={(e) => onVal(e.target.value)}
        className="border border-gray-200 rounded px-2 py-1 text-sm w-full">
        {options.map(([value, display]) => <option key={value} value={value}>{display}</option>)}
      </select>
    </div>
  );
}

function ToggleField({ label, val, onVal }: { label: string; val: boolean; onVal: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 w-full">
      <input type="checkbox" checked={!!val} onChange={(e) => onVal(e.target.checked)} className="rounded" />
      <span className="text-xs text-gray-500">{label}</span>
    </label>
  );
}

function TextAreaField({ label, val, onVal }: { label: string; val: string; onVal: (v: string) => void }) {
  return (
    <div className="w-full">
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <textarea value={val ?? ''} onChange={(e) => onVal(e.target.value)} rows={3}
        className="border border-gray-200 rounded px-2 py-1 text-sm w-full resize-y min-h-[60px]" />
    </div>
  );
}

function MediaField({ val, onVal }: { val: MediaAttachment[]; onVal: (v: MediaAttachment[]) => void }) {
  return (
    <div className="w-full">
      <FileDropInput value={val ?? []} onChange={onVal} />
    </div>
  );
}

function StepFields({ step, onChange }: { step: Step; onChange: (s: Step) => void }) {
  const upd = (key: string, value: unknown) => onChange({ ...step, [key]: value });

  if (step.type === 'repetition') {
    return (
      <>
        <TextField label="Equipment" val={step.equipment} onVal={(v) => upd('equipment', v)} />
        <div className="flex gap-2">
          <NumField label="Sets" val={step.steps} onVal={(v) => upd('steps', v)} />
          <NumField label="Reps" val={step.reps} onVal={(v) => upd('reps', v)} />
        </div>
        <SelectField label="Unit" val={step.unit} options={[['none', 'None'], ['weight', 'Weight'], ['seconds', 'Seconds']]} onVal={(v) => upd('unit', v)} />
        {step.unit === 'weight' && <NumField label="Weight (lb)" val={step.weightLb} onVal={(v) => upd('weightLb', v)} />}
        {step.unit === 'seconds' && <NumField label="Duration (sec)" val={step.durationSeconds} onVal={(v) => upd('durationSeconds', v)} />}
        <ToggleField label="Voice activation" val={step.voiceActivation} onVal={(v) => upd('voiceActivation', v)} />
        <NumField label="Rest (sec)" val={step.restBetweenSetsSeconds} onVal={(v) => upd('restBetweenSetsSeconds', v)} />
        <TextAreaField label="Instructions" val={step.instructions} onVal={(v) => upd('instructions', v)} />
        <MediaField val={step.media} onVal={(v) => upd('media', v)} />
      </>
    );
  }

  if (step.type === 'action') {
    return (
      <>
        <ToggleField label="Use duration" val={step.useDuration} onVal={(v) => upd('useDuration', v)} />
        {step.useDuration && (
          <>
            <NumField label="Duration (minutes)" val={step.durationMinutes} onVal={(v) => upd('durationMinutes', v)} />
            <SelectField label="On complete" val={step.timerEndBehavior} options={[['notification', 'Notification'], ['none', 'None']]} onVal={(v) => upd('timerEndBehavior', v)} />
          </>
        )}
        <TextAreaField label="Instructions" val={step.instructions} onVal={(v) => upd('instructions', v)} />
        <MediaField val={step.media} onVal={(v) => upd('media', v)} />
      </>
    );
  }

  return (
    <>
      <TextAreaField label="Instructions" val={step.instructions} onVal={(v) => upd('instructions', v)} />
      <MediaField val={step.media} onVal={(v) => upd('media', v)} />
      <p className="text-xs text-gray-400 italic">Child steps will be managed when connected to sequences.</p>
    </>
  );
}

function StepEditView({ id, onCancel }: { id: string; onCancel: () => void }) {
  const { data: serverStep, isLoading } = useStep(id);
  const { data: sequences = [] } = useSequences();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const [step, setStep] = useState<Step | null>(null);

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
        <StepFields step={step} onChange={setStep} />
      </div>

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

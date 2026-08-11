import type { ReactNode } from 'react';
import type { Step, MediaAttachment } from '../types/step';
import FileDropInput from './FileDropInput';
import { StepIcon } from './StepIcons';

const RepIcon = (position?: number) => <StepIcon type="repetition" count={position} />;
const RepGrpIcon = () => <StepIcon type="repeat_group" />;
const ActIcon = () => <StepIcon type="action" />;

export const stepTypeMeta: Record<Step['type'], { icon: (position?: number) => ReactNode; label: string }> = {
  repetition: { icon: RepIcon, label: 'Repetitions' },
  repeat_group: { icon: RepGrpIcon, label: 'Repeat Group' },
  action: { icon: ActIcon, label: 'Action' },
};

export interface StepFieldDef {
  key: string;
  label: string | ((step: Step) => string);
  type: 'text' | 'number' | 'select' | 'toggle' | 'media' | 'textarea';
  primary?: boolean;
  options?: { label: string; value: string }[];
  showIf?: (step: Step) => boolean;
  width?: string;
}

const commonMedia: StepFieldDef = { key: 'media', label: 'Image', type: 'media' };
const commonInstructions: StepFieldDef = { key: 'instructions', label: 'Instructions', type: 'textarea' };
const commonSets: StepFieldDef = { key: 'steps', label: 'Sets', type: 'number' };

const repetitionFields: StepFieldDef[] = [
  { key: 'equipment', label: 'Equipment', type: 'text' },
  { ...commonSets, primary: true, width: 'flex-none w-16' },
  { key: 'reps', label: 'Reps', type: 'number', primary: true, width: 'flex-none w-16' },
  { key: 'unit', label: 'Unit', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'Weight', value: 'weight' }, { label: 'Seconds', value: 'seconds' }], width: 'flex-none w-28' },
  { key: 'weightLb', label: 'Weight (lb)', type: 'number', primary: true, showIf: (s) => s.type === 'repetition' && s.unit === 'weight', width: 'flex-none w-24' },
  { key: 'durationSeconds', label: 'Duration (sec)', type: 'number', primary: true, showIf: (s) => s.type === 'repetition' && s.unit === 'seconds', width: 'flex-none w-24' },
  { key: 'voiceActivation', label: 'Voice activation', type: 'toggle' },
  { key: 'restBetweenSetsSeconds', label: 'Rest (sec)', type: 'number' },
  commonInstructions,
  commonMedia,
];

const timerEndOptions = [
  { value: 'notification', label: 'Notification' },
  { value: 'none', label: 'None' },
];

const actionFields: StepFieldDef[] = [
  commonInstructions,
  { key: 'useDuration', label: 'Use duration', type: 'toggle' },
  { key: 'timerEndBehavior', label: 'On complete', type: 'select', options: timerEndOptions, showIf: (s) => s.type === 'action' && s.useDuration },
  { key: 'durationMinutes', label: 'Duration (minutes)', type: 'number', primary: true, showIf: (s) => s.type === 'action' && s.useDuration },
  commonMedia,
];

const repeatGroupFields: StepFieldDef[] = [
  commonInstructions,
  commonMedia,
];

const fieldsMap: Record<Step['type'], StepFieldDef[]> = {
  repetition: repetitionFields,
  repeat_group: repeatGroupFields,
  action: actionFields,
};

export function getFields(type: Step['type']): StepFieldDef[] {
  return fieldsMap[type];
}

function asRecord(s: Step): Record<string, unknown> {
  return s as unknown as Record<string, unknown>;
}

function fmt(val: unknown, def: StepFieldDef): string {
  if (def.type === 'select') {
    const opt = def.options?.find((o) => o.value === val);
    return opt?.label ?? String(val ?? '');
  }
  if (def.type === 'toggle') return '';
  return String(val ?? '');
}

export function StepFieldsDisplay({ step }: { step: Step }) {
  const fields = getFields(step.type);
  const nonMedia = fields.filter((f) => f.type !== 'textarea' && f.type !== 'media');
  const secondary = nonMedia.filter((f) => !f.primary && f.type !== 'toggle' && (!f.showIf || f.showIf(step)));
  const hasSecondary = secondary.length > 0;

  let instructions: string | null = null;
  let images: MediaAttachment[] | null = null;
  let hasVoice = false;

  for (const def of fields) {
    const val = asRecord(step)[def.key];
    if (def.type === 'textarea') { instructions = val as string; }
    if (def.type === 'media') { images = val as MediaAttachment[]; }
    if (def.type === 'toggle' && val) { hasVoice = true; }
  }

  function renderPrimary() {
    if (step.type === 'repetition') {
      if (step.unit === 'weight' && step.weightLb > 0) {
        return <div className="text-sm font-semibold text-gray-900">{step.steps}×{step.reps} @ {step.weightLb} lb</div>;
      }
      if (step.unit === 'seconds' && step.durationSeconds > 0) {
        return <div className="text-sm font-semibold text-gray-900">{step.steps}×{step.reps} @ {step.durationSeconds} sec</div>;
      }
      return <div className="text-sm font-semibold text-gray-900">{step.steps}×{step.reps}</div>;
    }
    if (step.type === 'action') {
      return step.useDuration && step.durationMinutes > 0 ? (
        <div className="text-sm font-semibold text-gray-900">
          {step.durationMinutes} min
        </div>
      ) : null;
    }
    return null;
  }

  return (
    <>
      {renderPrimary()}
      {hasSecondary && (
        <div className="text-xs text-gray-500 mt-0.5">
          {secondary.map((def, i) => {
            const val = asRecord(step)[def.key];
            const label = typeof def.label === 'function' ? def.label(step) : def.label;
            return (
              <span key={def.key}>
                {i > 0 && <span className="mx-1 text-gray-300">·</span>}
                {label} {fmt(val, def)}
              </span>
            );
          })}
        </div>
      )}
      {hasVoice && <span className="text-[10px] text-purple-500 mt-0.5 inline-block">🔇 voice cues</span>}
      {instructions && (
        <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap border-t border-gray-100 pt-1.5">
          {instructions}
        </div>
      )}
      {images && images.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {images.map((img, i) => (
            <img key={i} src={img.url} alt="" className="rounded border border-gray-200 max-h-12 object-contain" style={{ scale: `${img.scale}%` }} />
          ))}
        </div>
      )}
    </>
  );
}

export function StepFieldsForm({
  step,
  onChange,
  onAddChildStep,
  onEditChildStep,
  onRemoveChildStep,
  childSteps,
}: {
  step: Step;
  onChange: (updated: Step) => void;
  onAddChildStep?: () => void;
  onEditChildStep?: (stepId: string) => void;
  onRemoveChildStep?: (stepId: string) => void;
  childSteps?: Step[];
}) {
  const fields = getFields(step.type);
  const upd = (key: string, val: unknown) => onChange({ ...step, [key]: val } as Step);

  function renderField(def: StepFieldDef): ReactNode {
    const val = asRecord(step)[def.key];
    const label = typeof def.label === 'function' ? def.label(step) : def.label;

    if (def.type === 'textarea') {
      return (
        <div key={def.key} className="w-full">
          <label className="block text-xs text-gray-500 mb-1">{label}</label>
          <textarea
            value={(val as string) || ''}
            onChange={(e) => upd(def.key, e.target.value)}
            rows={3}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full resize-y min-h-[60px]"
          />
        </div>
      );
    }

    if (def.type === 'media') {
      return (
        <div key={def.key} className="w-full">
          <FileDropInput
            value={(val as MediaAttachment[]) || []}
            onChange={(v) => upd(def.key, v)}
          />
        </div>
      );
    }

    if (def.type === 'toggle') {
      return (
        <label key={def.key} className="flex items-center gap-2 w-full">
          <input
            type="checkbox"
            checked={!!val}
            onChange={(e) => upd(def.key, e.target.checked)}
            className="rounded"
          />
          <span className="text-xs text-gray-500">{label}</span>
        </label>
      );
    }

    if (def.type === 'select') {
      return (
        <div key={def.key} className={def.width ?? 'flex-1 min-w-0'}>
          <label className="block text-xs text-gray-500 mb-1">{label}</label>
          <select
            value={String(val ?? '')}
            onChange={(e) => upd(def.key, e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          >
            {def.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (def.type === 'number') {
      return (
        <div key={def.key} className={def.width ?? 'flex-1 min-w-0'}>
          <label className="block text-xs text-gray-500 mb-1">{label}</label>
          <input
            type="text"
            inputMode="numeric"
            value={val === 0 ? '' : String(val ?? '')}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') { upd(def.key, 0); return; }
              const n = Number(raw);
              if (!isNaN(n)) upd(def.key, Math.max(0, n));
            }}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          />
        </div>
      );
    }

    return (
      <div key={def.key} className={def.width ?? 'flex-1 min-w-0'}>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <input
          value={String(val ?? '')}
          onChange={(e) => upd(def.key, e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
        />
      </div>
    );
  }

  const inlineTypes = new Set(['number', 'select']);
  const rows: ReactNode[] = [];
  let rowBuf: StepFieldDef[] = [];

  function flushRow() {
    const visible = rowBuf.filter((f) => !f.showIf || f.showIf(step));
    if (visible.length > 0) {
      rows.push(<div key={`row-${rows.length}`} className="flex gap-2">{visible.map(renderField)}</div>);
    }
    rowBuf = [];
  }

  for (const def of fields) {
    if (def.showIf && !def.showIf(step)) {
      continue;
    }
    if (inlineTypes.has(def.type)) {
      rowBuf.push(def);
    } else {
      flushRow();
      rows.push(renderField(def));
    }
  }
  flushRow();

  return (
    <div className="space-y-3 text-sm">
      {rows}

      {step.type === 'repeat_group' && (
        <div className="border-t border-gray-100 pt-3">
          <label className="block text-xs text-gray-500 mb-2">Child steps</label>
          {(childSteps ?? []).length === 0 && (
            <p className="text-xs text-gray-400 italic mb-2">No child steps yet.</p>
          )}
          <div className="space-y-1.5 mb-2">
            {(childSteps ?? []).map((cs) => (
              <div key={cs.id} className="flex items-center gap-2 border border-gray-200 rounded px-2.5 py-1.5">
                <span className="text-xs text-gray-700 flex-1 truncate">{cs.title || '(untitled)'}</span>
                <span className="text-[11px] text-gray-400">{stepTypeMeta[cs.type]?.label}</span>
                {onEditChildStep && (
                  <button type="button" onClick={() => onEditChildStep(cs.id)} className="text-[11px] text-blue-500 hover:text-blue-700">Edit</button>
                )}
                {onRemoveChildStep && (
                  <button type="button" onClick={() => onRemoveChildStep(cs.id)} className="text-gray-400 hover:text-red-500 text-sm leading-none">&times;</button>
                )}
              </div>
            ))}
          </div>
          {onAddChildStep && (
            <button type="button" onClick={onAddChildStep} className="text-xs text-blue-500 hover:text-blue-700">
              + Add child step
            </button>
          )}
        </div>
      )}
    </div>
  );
}

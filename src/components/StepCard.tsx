import { useState } from 'react';
import type { ActionStep, RepeatGroupStep, SequenceStep } from '../types/sequence';
import { stepTypeMeta, StepFieldsDisplay, StepFieldsForm } from './stepFields';

function stepTitle(s: SequenceStep): string {
  return s.title || '(untitled)';
}

interface SubStepRenderParams {
  step: SequenceStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updated: SequenceStep) => void;
  onDelete: () => void;
}

interface StepCardProps {
  step: SequenceStep;
  expanded?: boolean;
  onChange?: (updated: SequenceStep) => void;
  onToggleExpand?: () => void;
  onDelete?: () => void;
  dragHandle?: React.ReactNode;
  renderSubStep?: (params: SubStepRenderParams) => React.ReactNode;
}

export default function StepCard({ step, expanded, onChange, onToggleExpand, onDelete, dragHandle, renderSubStep }: StepCardProps) {
  const meta = stepTypeMeta[step.type];
  const isRepeatGroup = step.type === 'repeat_group';
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const rgStep = isRepeatGroup ? (step as RepeatGroupStep) : null;

  function updateSubStep(idx: number, updated: SequenceStep) {
    if (!rgStep || !onChange) return;
    const next = [...rgStep.steps];
    next[idx] = updated;
    onChange({ ...rgStep, steps: next } as SequenceStep);
  }

  function deleteSubStep(idx: number) {
    if (!rgStep || !onChange) return;
    const name = stepTitle(rgStep.steps[idx]);
    if (!window.confirm(`Delete sub-step "${name}"?`)) return;
    onChange({ ...rgStep, steps: rgStep.steps.filter((_, i) => i !== idx) } as SequenceStep);
    setExpandedSub(null);
  }

  return (
    <div className="border border-gray-200 rounded-lg py-2.5 px-3 bg-white text-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {dragHandle}
        <span className="text-sm">{meta.icon(step.position)}</span>
        <span className="font-medium text-gray-900">{stepTitle(step)}</span>
        {!isRepeatGroup && onToggleExpand && (
          <button onClick={onToggleExpand} className="text-xs text-gray-400 hover:text-gray-600 ml-1">
            {expanded ? '▲' : '▼'}
          </button>
        )}
        {!isRepeatGroup && onDelete && (
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600 ml-1">
            &times;
          </button>
        )}
      </div>
      {!isRepeatGroup && expanded && onChange ? (
        <StepFieldsForm step={step} onChange={onChange} />
      ) : !isRepeatGroup ? (
        <StepFieldsDisplay step={step} />
      ) : null}

      {isRepeatGroup && (
        <div className="ml-3 border-l-2 border-purple-200 pl-3 mt-2 space-y-1">
          <div className="text-[11px] text-purple-500 font-medium">🔁 Repeats until done</div>
          {rgStep!.steps.length === 0 && (
            <div className="text-xs text-gray-400 italic">No sub-steps</div>
          )}
          {rgStep!.steps.map((s, idx) => {
            const isExpanded = expandedSub === s.id;
            if (renderSubStep) {
              return renderSubStep({
                step: s,
                index: idx,
                isExpanded,
                onToggle: () => { if (onChange) setExpandedSub(isExpanded ? null : s.id); },
                onUpdate: (u) => updateSubStep(idx, u),
                onDelete: () => deleteSubStep(idx),
              });
            }
            return (
              <div key={s.id} className="border border-gray-200 rounded bg-white">
                <div
                  className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => { if (onChange) setExpandedSub(isExpanded ? null : s.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && onChange) setExpandedSub(isExpanded ? null : s.id); }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="text-xs">{stepTypeMeta[s.type].icon(s.position)}</span>
                  <span className="text-xs text-gray-700 flex-1 truncate">
                    {s.position}. {stepTitle(s)}
                    {s.type === 'action' && (s as ActionStep).durationMinutes > 0 && (
                      <span className="text-gray-400 ml-1">· {(s as ActionStep).durationMinutes} min</span>
                    )}
                  </span>
                  <span className="text-[11px] text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                  {onChange && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSubStep(idx); }}
                      className="text-gray-400 hover:text-red-500 text-xs leading-none"
                    >&times;</button>
                  )}
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 p-2">
                    <StepFieldsForm step={s} onChange={(u) => updateSubStep(idx, u)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

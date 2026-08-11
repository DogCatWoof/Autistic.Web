import type { ReactNode } from 'react';
import type { Step } from '../types/step';
import { stepTypeMeta, StepFieldsDisplay } from './stepFields';

function stepTitle(s: Step): string {
  return s.title || '(untitled)';
}

interface StepCardProps {
  step: Step;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onDelete?: () => void;
  dragHandle?: ReactNode;
}

export default function StepCard({ step, expanded, onToggleExpand, onDelete, dragHandle }: StepCardProps) {
  const meta = stepTypeMeta[step.type];
  const isRepeatGroup = step.type === 'repeat_group';

  return (
    <div className="border border-gray-200 rounded-lg py-2.5 px-3 bg-white text-sm">
      <div className="flex items-center gap-1.5 mb-1">
        {dragHandle}
        <span className="text-sm">{meta.icon()}</span>
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
      {!isRepeatGroup && (
        <StepFieldsDisplay step={step} />
      )}

      {isRepeatGroup && (
        <div className="ml-3 border-l-2 border-purple-200 pl-3 mt-2 space-y-1">
          <div className="text-[11px] text-purple-500 font-medium">🔁 Repeats until done</div>
          {step.childSteps.length === 0 && (
            <div className="text-xs text-gray-400 italic">No child steps</div>
          )}
          {step.childSteps.map((ref) => (
            <div key={ref.stepId} className="text-xs text-gray-600">
              {ref.position}. (ID: {ref.stepId})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

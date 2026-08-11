import type { Step } from '../types/step';
import { StepIcon } from './StepIcons';

const stepTypes: { type: Step['type']; label: string; desc: string }[] = [
  { type: 'repetition', label: 'Repetitions', desc: 'Sets, reps, weight or duration, and rest tracking' },
  { type: 'repeat_group', label: 'Repeat Group', desc: 'Nested sub-steps that repeat until done' },
  { type: 'action', label: 'Action', desc: 'Simple task or chore with optional timer' },
];

export default function StepTypePicker({ onSelect, onClose }: { onSelect: (type: Step['type']) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} role="presentation">
      <div className="bg-white rounded-xl shadow-xl p-4 w-80 max-w-full mx-4" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="dialog" aria-label="Add step">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Add Step</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-2">
          {stepTypes.map(({ type, label, desc }) => (
            <button key={type} onClick={() => onSelect(type)} className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <StepIcon type={type} className="w-8 h-8" />
                <div>
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-500">{desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

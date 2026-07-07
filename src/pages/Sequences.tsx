import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { useSequences, useSequence, useAllRuns, useActiveRuns, useCreateSequence } from '../hooks/useSequences';
import SequenceEditor from '../components/SequenceEditor';
import type { Sequence } from '../types/sequence';

function SequenceRow({ sequence, isActive, onSelect }: { sequence: Sequence; isActive: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="w-full text-left border border-gray-200 rounded-lg p-3 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{sequence.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {sequence.steps.length > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{sequence.steps.length} steps</span>}
          {isActive && <span className="text-green-600 text-xs bg-green-50 px-1.5 py-0.5 rounded font-medium">▶ active</span>}
        </div>
      </div>
      {sequence.description && (
        <div className="text-sm text-gray-500 mt-0.5 line-clamp-2">{sequence.description}</div>
      )}
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
  const navigate = useNavigate();
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
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/steps')} className="text-sm bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300">
            Steps
          </button>
          <button onClick={onNew} className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">
            <span className="text-lg leading-none">+</span> New
          </button>
        </div>
      </div>

      {sequences.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="font-medium">No sequences yet</p>
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

function EditorView({ id, onCancel }: { id: string; onCancel: () => void }) {
  const { data: sequence } = useSequence(id);
  if (!sequence) return <div className="p-4 text-gray-500">Loading...</div>;
  return <SequenceEditor sequence={sequence} onCancel={onCancel} />;
}

export default function SequencesPage() {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { refetch } = useSequences();
  const createSeq = useCreateSequence();

  function handleNew() {
    const blank: Omit<Sequence, 'id'> = {
      name: 'New Sequence',
      description: '',
      steps: [],
      isDeleted: false,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      pendingFirestoreSync: true,
    };
    createSeq.mutate(blank, {
      onSuccess: (newId) => {
        if (!newId) return;
        refetch();
        setSelectedId(newId);
        setView('edit');
      },
    });
  }

  if (view === 'edit' && selectedId) {
    return <EditorView id={selectedId} onCancel={() => { setSelectedId(null); setView('list'); }} />;
  }

  return <SequenceListView onSelect={(id) => { setSelectedId(id); setView('edit'); }} onNew={handleNew} />;
}

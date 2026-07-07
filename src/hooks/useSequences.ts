import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSequences, fetchSequenceById, createSequence, updateSequence, deleteSequence, fetchAllRuns, fetchRunsForSequence, fetchActiveRuns } from '../repositories/sequenceRepository';
import type { Sequence } from '../types/sequence';

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: fetchSequences,
    retry: false,
    gcTime: 0,
  });
}

export function useSequence(id: string | undefined) {
  return useQuery({
    queryKey: ['sequence', id],
    queryFn: () => fetchSequenceById(id!),
    enabled: !!id,
  });
}

export function useActiveRuns() {
  return useQuery({
    queryKey: ['activeRuns'],
    queryFn: fetchActiveRuns,
    retry: false,
    gcTime: 0,
  });
}

export function useAllRuns() {
  return useQuery({
    queryKey: ['allRuns'],
    queryFn: fetchAllRuns,
    retry: false,
    gcTime: 0,
  });
}

export function useSequenceRuns(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ['sequenceRuns', sequenceId],
    queryFn: () => fetchRunsForSequence(sequenceId!),
    enabled: !!sequenceId,
  });
}

export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Sequence, 'id'>) => createSequence(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); },
  });
}

export function useUpdateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Sequence, 'id'>> }) => updateSequence(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['sequences'] });
      qc.invalidateQueries({ queryKey: ['sequence', id] });
    },
  });
}

export function useDeleteSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSequence(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sequences'] }); },
  });
}

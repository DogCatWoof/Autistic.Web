import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSteps, fetchStepById, fetchStepsByIds, createStep, updateStep, deleteStep } from '../repositories/stepRepository';
import type { Step } from '../types/step';

export function useSteps() {
  return useQuery({
    queryKey: ['steps'],
    queryFn: fetchSteps,
    retry: false,
    gcTime: 0,
  });
}

export function useStep(id: string | undefined) {
  return useQuery({
    queryKey: ['step', id],
    queryFn: () => fetchStepById(id!),
    enabled: !!id,
  });
}

export function useStepsByIds(ids: string[]) {
  return useQuery({
    queryKey: ['steps', 'byIds', ids],
    queryFn: () => fetchStepsByIds(ids),
    enabled: ids.length > 0,
    retry: false,
    gcTime: 0,
  });
}

export function useCreateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Step, 'id'>) => createStep(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['steps'] }); },
  });
}

export function useUpdateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Step, 'id'>> }) => updateStep(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['steps'] });
      qc.invalidateQueries({ queryKey: ['step', id] });
    },
  });
}

export function useDeleteStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStep(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['steps'] }); },
  });
}

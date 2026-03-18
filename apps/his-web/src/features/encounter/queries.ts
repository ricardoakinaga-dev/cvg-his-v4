import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getEncounterTimeline,
  getPatientSummary,
  getSoapTemplates,
  createClinicalNote,
  updateClinicalNote,
  versionClinicalNote,
  signClinicalNote,
  createDocument,
  attachDocumentToEncounter,
  listEncounterBillingItems,
  createEncounterBillingItem,
  updateEncounterBillingItem,
  deleteEncounterBillingItem,
  getEncounterFinancialSummary,
  closeEncounterFinancial,
  listEncounterReceivables,
  settleEncounterReceivable,
  type EncounterTimelineResponse,
  type PatientSummaryResponse,
  type SoapTemplatesResponse,
  type NoteCreateInput,
  type NoteMutationInput,
  type EncounterBillingListResponse,
  type EncounterBillingCreateInput,
  type EncounterBillingUpdateInput,
  type EncounterFinancialSummaryResponse,
  type EncounterFinancialCloseInput,
  type EncounterReceivableListResponse,
  type ListEncounterReceivablesInput,
  type SettleEncounterReceivableInput
} from '@/lib/api';

export const encounterKeys = {
  all: ['encounter'] as const,
  timeline: (encounterId: string) => [...encounterKeys.all, 'timeline', encounterId] as const,
  patientSummary: (patientId: string) => [...encounterKeys.all, 'patient-summary', patientId] as const,
  soapTemplates: () => [...encounterKeys.all, 'soap-templates'] as const,
  notes: (encounterId: string) => [...encounterKeys.all, 'notes', encounterId] as const,
  documents: (encounterId: string) => [...encounterKeys.all, 'documents', encounterId] as const,
  billing: (encounterId: string) => [...encounterKeys.all, 'billing', encounterId] as const,
  financial: (encounterId: string) => [...encounterKeys.all, 'financial', encounterId] as const,
  receivables: (filters: string) => [...encounterKeys.all, 'receivables', filters] as const
};

export function useEncounterTimeline(encounterId: string | null | undefined) {
  return useQuery<EncounterTimelineResponse | null>({
    queryKey: encounterKeys.timeline(encounterId ?? ''),
    queryFn: () => getEncounterTimeline(encounterId!),
    enabled: !!encounterId,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData
  });
}

export function usePatientSummary(patientId: string | null | undefined) {
  return useQuery<PatientSummaryResponse | null>({
    queryKey: encounterKeys.patientSummary(patientId ?? ''),
    queryFn: () => getPatientSummary(patientId!),
    enabled: !!patientId,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData
  });
}

export function useSoapTemplates() {
  return useQuery<SoapTemplatesResponse>({
    queryKey: encounterKeys.soapTemplates(),
    queryFn: getSoapTemplates,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000
  });
}

export function useCreateClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encounterId, input }: { encounterId: string; input: NoteCreateInput }) =>
      createClinicalNote(encounterId, input),
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.timeline(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.notes(encounterId) });
    }
  });
}

export function useUpdateClinicalNote() {
  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: NoteMutationInput }) =>
      updateClinicalNote(noteId, input),
    onSuccess: () => {
      console.log('Autosave successful at', new Date().toLocaleTimeString());
    },
    onError: (error) => {
      console.error('Autosave failed:', error);
    }
  });
}

export function useVersionClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: NoteMutationInput }) =>
      versionClinicalNote(noteId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    }
  });
}

export function useSignClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => signClinicalNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    }
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ encounterId, file }: { encounterId: string; file: File }) => {
      const doc = await createDocument({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size
      });

      const relation = await attachDocumentToEncounter(encounterId, doc.id);
      return { document: doc, relation };
    },
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.timeline(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.documents(encounterId) });
    }
  });
}

export function useEncounterBilling(encounterId: string | null | undefined) {
  return useQuery<EncounterBillingListResponse>({
    queryKey: encounterKeys.billing(encounterId ?? ''),
    queryFn: () => listEncounterBillingItems({ encounterId: encounterId!, page: 1, pageSize: 100 }),
    enabled: !!encounterId,
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData
  });
}

export function useCreateEncounterBillingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encounterId, input }: { encounterId: string; input: EncounterBillingCreateInput }) =>
      createEncounterBillingItem(encounterId, input),
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.billing(encounterId) });
    }
  });
}

export function useUpdateEncounterBillingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encounterId, billingItemId, input }: { encounterId: string; billingItemId: string; input: EncounterBillingUpdateInput }) =>
      updateEncounterBillingItem(billingItemId, input),
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.billing(encounterId) });
    }
  });
}

export function useDeleteEncounterBillingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ billingItemId }: { encounterId: string; billingItemId: string }) =>
      deleteEncounterBillingItem(billingItemId),
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.billing(encounterId) });
    }
  });
}

export function useEncounterFinancial(encounterId: string | null | undefined) {
  return useQuery<EncounterFinancialSummaryResponse>({
    queryKey: encounterKeys.financial(encounterId ?? ''),
    queryFn: () => getEncounterFinancialSummary(encounterId!),
    enabled: !!encounterId,
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData
  });
}

export function useCloseEncounterFinancial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encounterId, input }: { encounterId: string; input: EncounterFinancialCloseInput }) =>
      closeEncounterFinancial(encounterId, input),
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.financial(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.billing(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.timeline(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.receivables('all') });
    }
  });
}

export function useEncounterReceivables(input: ListEncounterReceivablesInput = {}) {
  const filters = JSON.stringify(input);
  return useQuery<EncounterReceivableListResponse>({
    queryKey: encounterKeys.receivables(filters),
    queryFn: () => listEncounterReceivables(input),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData
  });
}

export function useSettleEncounterReceivable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ receivableId, input }: { receivableId: string; input: SettleEncounterReceivableInput }) =>
      settleEncounterReceivable(receivableId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.receivables('all') });
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    }
  });
}

export function useEncounterData(encounterId: string | null | undefined) {
  const timelineQuery = useEncounterTimeline(encounterId);
  const templatesQuery = useSoapTemplates();
  const patientId = timelineQuery.data?.encounter.patientId;
  const patientSummaryQuery = usePatientSummary(patientId);

  return {
    timeline: timelineQuery.data,
    templates: templatesQuery.data?.data ?? [],
    patientSummary: patientSummaryQuery.data ?? null,
    isLoading: timelineQuery.isLoading || templatesQuery.isLoading,
    isLoadingSidebar: patientSummaryQuery.isLoading,
    error: timelineQuery.error || templatesQuery.error,
    sidebarError: patientSummaryQuery.error,
    refetchTimeline: timelineQuery.refetch,
    refetchAll: () => {
      timelineQuery.refetch();
      patientSummaryQuery.refetch();
    }
  };
}

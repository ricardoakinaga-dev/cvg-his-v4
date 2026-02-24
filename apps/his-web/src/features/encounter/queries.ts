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
  type EncounterTimelineResponse,
  type PatientSummaryResponse,
  type SoapTemplatesResponse,
  type EncounterTimelineNote,
  type NoteCreateInput,
  type NoteMutationInput,
  type DocumentCreateInput,
  type DocumentRecord,
  type EncounterDocumentRelation,
} from '@/lib/api';

/**
 * Query keys for encounter feature
 * Standardized structure: feature -> sub-feature -> identifiers
 */
export const encounterKeys = {
  all: ['encounter'] as const,
  timeline: (encounterId: string) => [...encounterKeys.all, 'timeline', encounterId] as const,
  patientSummary: (patientId: string) => [...encounterKeys.all, 'patient-summary', patientId] as const,
  soapTemplates: () => [...encounterKeys.all, 'soap-templates'] as const,
  notes: (encounterId: string) => [...encounterKeys.all, 'notes', encounterId] as const,
  documents: (encounterId: string) => [...encounterKeys.all, 'documents', encounterId] as const,
};

/**
 * Hook to get encounter timeline data
 * Includes encounter, notes, versions, documents, and timeline events
 */
export function useEncounterTimeline(encounterId: string | null | undefined) {
  return useQuery<EncounterTimelineResponse | null>({
    queryKey: encounterKeys.timeline(encounterId ?? ''),
    queryFn: () => getEncounterTimeline(encounterId!),
    enabled: !!encounterId,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get patient summary for sidebar
 */
export function usePatientSummary(patientId: string | null | undefined) {
  return useQuery<PatientSummaryResponse | null>({
    queryKey: encounterKeys.patientSummary(patientId ?? ''),
    queryFn: () => getPatientSummary(patientId!),
    enabled: !!patientId,
    staleTime: 60 * 1000, // 1 minute
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to get SOAP templates
 * Templates are cached for the session
 */
export function useSoapTemplates() {
  return useQuery<SoapTemplatesResponse>({
    queryKey: encounterKeys.soapTemplates(),
    queryFn: getSoapTemplates,
    staleTime: Infinity, // Templates rarely change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to create a new clinical note
 * Invalidates timeline and notes on success
 */
export function useCreateClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ encounterId, input }: { encounterId: string; input: NoteCreateInput }) =>
      createClinicalNote(encounterId, input),
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.timeline(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.notes(encounterId) });
    },
  });
}

/**
 * Hook to update a clinical note (autosave)
 * Uses optimistic updates for better UX
 */
export function useUpdateClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: NoteMutationInput }) =>
      updateClinicalNote(noteId, input),
    onSuccess: (_, { input }) => {
      // Don't invalidate immediately for autosave to prevent flicker
      // The data will be refreshed on next user action or page refresh
      console.log('Autosave successful at', new Date().toLocaleTimeString());
    },
    onError: (error) => {
      console.error('Autosave failed:', error);
    },
  });
}

/**
 * Hook to create a new version of a clinical note
 */
export function useVersionClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, input }: { noteId: string; input: NoteMutationInput }) =>
      versionClinicalNote(noteId, input),
    onSuccess: (_, { noteId }) => {
      // Invalidate all encounter queries to refresh timeline
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    },
  });
}

/**
 * Hook to sign a clinical note
 */
export function useSignClinicalNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => signClinicalNote(noteId),
    onSuccess: () => {
      // Invalidate all encounter queries to refresh timeline
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
    },
  });
}

/**
 * Hook to upload and attach a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      encounterId,
      file,
    }: {
      encounterId: string;
      file: File;
    }) => {
      // 1. Create document metadata
      const doc = await createDocument({
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
      });

      // 2. Attach to encounter
      const relation = await attachDocumentToEncounter(encounterId, doc.id);

      return { document: doc, relation };
    },
    onSuccess: (_, { encounterId }) => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.timeline(encounterId) });
      queryClient.invalidateQueries({ queryKey: encounterKeys.documents(encounterId) });
    },
  });
}

/**
 * Hook for combined encounter data loading
 * Returns all data needed for the encounter page
 */
export function useEncounterData(encounterId: string | null | undefined) {
  const timelineQuery = useEncounterTimeline(encounterId);
  const templatesQuery = useSoapTemplates();

  // Derive patient ID from timeline data
  const patientId = timelineQuery.data?.encounter.patientId;
  const patientSummaryQuery = usePatientSummary(patientId);

  return {
    // Data
    timeline: timelineQuery.data,
    templates: templatesQuery.data?.data ?? [],
    patientSummary: patientSummaryQuery.data,

    // Loading states
    isLoading: timelineQuery.isLoading || templatesQuery.isLoading,
    isLoadingSidebar: patientSummaryQuery.isLoading,

    // Error states
    error: timelineQuery.error || templatesQuery.error,
    sidebarError: patientSummaryQuery.error,

    // Refetch functions
    refetchTimeline: timelineQuery.refetch,
    refetchAll: () => {
      timelineQuery.refetch();
      patientSummaryQuery.refetch();
    },
  };
}

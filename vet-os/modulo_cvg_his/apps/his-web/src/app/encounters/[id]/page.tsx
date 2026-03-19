'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';

// Feature Components
import { EncounterHeader } from '@/features/encounter/components/EncounterHeader';
import { EncounterTabs } from '@/features/encounter/components/EncounterTabs';
import { EncounterSoapTab } from '@/features/encounter/components/EncounterSoapTab';
import { EncounterTimelineTab } from '@/features/encounter/components/EncounterTimelineTab';
import { EncounterDocumentsTab } from '@/features/encounter/components/EncounterDocumentsTab';
import { EncounterSidebar } from '@/features/encounter/components/EncounterSidebar';
import { EncounterSummaryTab } from '@/features/encounter/components/EncounterSummaryTab';
import { EncounterMedsTab } from '@/features/encounter/components/EncounterMedsTab';
import { EncounterBillingPanel } from '@/features/encounter/components/EncounterBillingPanel';
import { EncounterExamsTab } from '@/features/encounter/components/EncounterExamsTab';

// TanStack Query hooks
import {
  useEncounterData,
  useCreateClinicalNote,
  useUpdateClinicalNote,
  useVersionClinicalNote,
  useSignClinicalNote,
  useUploadDocument,
} from '@/features/encounter/queries';

// Utils and Types
import { resolveParamId, pickLatestNoteId, normalizeSoapForm } from '@/features/encounter/utils/helpers';
import { SoapFormState } from '@/features/encounter/types';
import { noteReasonSchema } from '@/lib/schemas';
import { MedOrdersPanel } from '@/components/MedOrdersPanel';
import { theme, px } from '@/lib/theme';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Card } from '@/components/ui/Card';

/**
 * Encounter Details Page (Refactored)
 *
 * Uses TanStack Query for data fetching with:
 * - Standardized query keys
 * - Automatic caching and invalidation
 * - Debounced autosave
 * - Loading and error states
 */
export default function EncounterDetailsPage(): JSX.Element {
  const params = useParams<{ id: string | string[] }>();
  const encounterId = resolveParamId(params?.id);
  const isDesktop = useMediaQuery(`(min-width: ${theme.breakpoints.lg})`);

  // Router for navigation
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // ==========================================================================
  // Data Fetching (TanStack Query)
  // ==========================================================================

  const {
    timeline,
    templates,
    patientSummary,
    isLoading,
    isLoadingSidebar,
    error,
    sidebarError,
    refetchTimeline,
    refetchAll,
  } = useEncounterData(encounterId);

  // Mutations
  const createNoteMutation = useCreateClinicalNote();
  const updateNoteMutation = useUpdateClinicalNote();
  const versionNoteMutation = useVersionClinicalNote();
  const signNoteMutation = useSignClinicalNote();
  const uploadDocumentMutation = useUploadDocument();

  // ==========================================================================
  // Derived State
  // ==========================================================================

  // Get selected note ID from URL or pick latest
  const selectedNoteId = useMemo(() => {
    const urlNoteId = searchParams.get('noteId');
    if (urlNoteId && timeline?.notes.some(n => n.id === urlNoteId)) {
      return urlNoteId;
    }
    return pickLatestNoteId(timeline?.notes ?? []);
  }, [timeline?.notes, searchParams]);

  const selectedNote = useMemo(
    () => timeline?.notes.find(n => n.id === selectedNoteId) ?? null,
    [timeline?.notes, selectedNoteId]
  );

  const isReadonly = selectedNote?.status === 'signed';

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleCreateNote = useCallback(
    async (soapForm: SoapFormState): Promise<void> => {
      if (!encounterId) return;
      const soap = normalizeSoapForm(soapForm);
      if (!soap) {
        alert('Preencha os campos SOAP.');
        return;
      }

      try {
        await createNoteMutation.mutateAsync({
          encounterId,
          input: { soap },
        });
      } catch (error) {
        console.error(error);
        alert('Falha ao criar nota.');
      }
    },
    [encounterId, createNoteMutation]
  );

  const handleUpdateNote = useCallback(
    async (soapForm: SoapFormState): Promise<void> => {
      if (!selectedNoteId) return;
      const soap = normalizeSoapForm(soapForm);
      if (!soap) return;

      try {
        await updateNoteMutation.mutateAsync({
          noteId: selectedNoteId,
          input: { soap, reason: 'Auto-save' },
        });
      } catch (error) {
        console.error('Autosave failed:', error);
        throw error;
      }
    },
    [selectedNoteId, updateNoteMutation]
  );

  const handleVersionNote = useCallback(
    async (soapForm: SoapFormState, reason: string): Promise<void> => {
      if (!selectedNoteId) return;
      const soap = normalizeSoapForm(soapForm);
      if (!soap) {
        alert('Preencha os campos SOAP.');
        return;
      }

      const parsedReason = noteReasonSchema.safeParse(reason);
      if (!parsedReason.success) {
        alert('Motivo inválido.');
        return;
      }

      try {
        await versionNoteMutation.mutateAsync({
          noteId: selectedNoteId,
          input: { soap, reason: parsedReason.data },
        });
      } catch (error) {
        console.error(error);
        alert('Falha ao criar versão.');
      }
    },
    [selectedNoteId, versionNoteMutation]
  );

  const handleSignNote = useCallback(
    async (noteId: string): Promise<void> => {
      if (!window.confirm('Tem certeza? A nota será finalizada.')) return;

      try {
        await signNoteMutation.mutateAsync(noteId);
      } catch (error) {
        console.error(error);
        alert('Falha ao assinar nota.');
      }
    },
    [signNoteMutation]
  );

  const handleUploadDocument = useCallback(
    async (file: File): Promise<void> => {
      if (!encounterId) return;

      await uploadDocumentMutation.mutateAsync({ encounterId, file });
    },
    [encounterId, uploadDocumentMutation]
  );

  // Navigation helper
  const navigateToTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // ==========================================================================
  // Keyboard Shortcuts
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        let targetTab = '';
        switch (e.key) {
          case '1':
            targetTab = 'summary';
            break;
          case '2':
            targetTab = 'soap';
            break;
          case '3':
            targetTab = 'meds';
            break;
          case '4':
            targetTab = 'billing';
            break;
          case '5':
            targetTab = 'documents';
            break;
          case '6':
            targetTab = 'timeline';
            break;
        }

        if (targetTab) {
          e.preventDefault();
          navigateToTab(targetTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToTab]);

  // ==========================================================================
  // Loading & Error States
  // ==========================================================================

  if (isLoading) {
    return (
      <div
        style={{
          padding: px(40),
          textAlign: 'center',
          maxWidth: px(1400),
          margin: '0 auto',
        }}
      >
        <p style={{ color: theme.colors.textSecondary }}>Carregando atendimento...</p>
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <div
        style={{
          padding: px(40),
          textAlign: 'center',
          maxWidth: px(1400),
          margin: '0 auto',
        }}
      >
        <Card style={{ padding: px(32), borderColor: theme.colors.danger }}>
          <h2 style={{ color: theme.colors.danger, marginTop: 0 }}>Erro</h2>
          <p>{error?.message ?? 'Atendimento não encontrado.'}</p>
          <button
            onClick={() => void refetchAll()}
            style={{
              marginTop: px(16),
              padding: `${px(8)} ${px(16)}`,
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </Card>
      </div>
    );
  }

  // ==========================================================================
  // Render
  // ==========================================================================

  const working = createNoteMutation.isPending || versionNoteMutation.isPending || signNoteMutation.isPending;

  return (
    <section
      style={{
        display: 'grid',
        gap: px(16),
        maxWidth: px(1400),
        margin: '0 auto',
        paddingBottom: px(40),
      }}
    >
      {/* 1. Header */}
      <EncounterHeader data={timeline} />

      {/* 2. Mobile Sidebar */}
      {!isDesktop && (
        <EncounterSidebar
          patientSummary={patientSummary}
          loading={isLoadingSidebar}
          error={sidebarError?.message ?? null}
          mobile={true}
        >
          <MedOrdersPanel
            patientId={timeline.encounter.patientId}
            encounterId={timeline.encounter.id}
          />
        </EncounterSidebar>
      )}

      {/* 3. Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'minmax(0, 3fr) minmax(0, 1fr)' : '1fr',
          gap: px(16),
          alignItems: 'start',
        }}
      >
        {/* Left Column: Work Area */}
        <div style={{ minWidth: 0 }}>
          <EncounterTabs
            tabs={{
              summary: {
                label: 'Resumo',
                content: <EncounterSummaryTab data={timeline} />,
              },
              soap: {
                label: 'Prontuário (SOAP)',
                content: (
                  <div style={{ position: 'relative' }}>
                    {working && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(255,255,255,0.6)',
                          zIndex: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        Processando...
                      </div>
                    )}
                    <EncounterSoapTab
                      data={timeline}
                      templates={templates}
                      selectedNoteId={selectedNoteId}
                      isReadonly={isReadonly}
                      onCreate={handleCreateNote}
                      onUpdate={handleUpdateNote}
                      onVersion={handleVersionNote}
                      onSign={handleSignNote}
                    />
                  </div>
                ),
              },
              meds: {
                label: 'Prescrições',
                content: (
                  <EncounterMedsTab
                    patientId={timeline.encounter.patientId}
                    encounterId={timeline.encounter.id}
                  />
                ),
              },
              exams: {
                label: 'Exames',
                content: (
                  <EncounterExamsTab
                    encounterId={timeline.encounter.id}
                    patientId={timeline.encounter.patientId}
                  />
                ),
              },
              billing: {
                label: 'Billing',
                content: <EncounterBillingPanel encounterId={timeline.encounter.id} />,
              },
              documents: {
                label: 'Documentos',
                content: (
                  <EncounterDocumentsTab
                    documents={timeline.documents}
                    uploading={uploadDocumentMutation.isPending}
                    working={working}
                    uploadMessage={null}
                    onFileChange={(file) => {
                      if (file) void handleUploadDocument(file);
                    }}
                    onUpload={(e) => e.preventDefault()}
                    fileInputKey={0}
                  />
                ),
              },
              timeline: {
                label: 'Histórico',
                content: (
                  <EncounterTimelineTab
                    timelineResponse={timeline}
                    encounterId={timeline.encounter.id}
                    onRefresh={() => void refetchTimeline()}
                  />
                ),
              },
            }}
          />
        </div>

        {/* Right Column: Sidebar (Desktop) */}
        {isDesktop && (
          <EncounterSidebar
            patientSummary={patientSummary}
            loading={isLoadingSidebar}
            error={sidebarError?.message ?? null}
          >
            <MedOrdersPanel
              patientId={timeline.encounter.patientId}
              encounterId={timeline.encounter.id}
            />
          </EncounterSidebar>
        )}
      </div>
    </section>
  );
}

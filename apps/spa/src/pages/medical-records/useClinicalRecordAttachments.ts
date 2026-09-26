import { ref } from 'vue';
import type { MedicalRecordSummary } from '@/types/medicalRecords';
import { spaRuntimeConfig } from '@/config/runtime';
import { apiRequest } from '@/services/api';
import { attachmentService } from '@/services/attachments';
import { diagnosticsService } from '@/services/diagnostics';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';

interface AttachmentDownloadUrlResponse {
  readonly url?: unknown;
  readonly expiresAt?: unknown;
}

type CurrentRouteGuard = () => boolean;

export function useClinicalRecordAttachments() {
  const attachments = ref<AttachmentSummary[]>([]);
  const loading = ref(false);
  const error = ref('');
  const actionError = ref('');
  const openingId = ref<string | null>(null);
  let routeGeneration = 0;
  let loadSequence = 0;

  function reset(): void {
    routeGeneration += 1;
    loadSequence += 1;
    attachments.value = [];
    loading.value = false;
    error.value = '';
    actionError.value = '';
    openingId.value = null;
  }

  async function load(
    currentRecord: MedicalRecordSummary,
    isCurrentRoute: CurrentRouteGuard
  ): Promise<void> {
    if (!isCurrentRoute()) return;

    const generation = routeGeneration;
    const sequence = ++loadSequence;
    loading.value = true;
    error.value = '';
    actionError.value = '';

    try {
      const [recordResult, encounterResult] = await Promise.allSettled([
        diagnosticsService.listAttachments(currentRecord.encounterId),
        attachmentService.list('encounter', currentRecord.encounterId)
      ]);
      if (!isCurrent(generation, sequence, isCurrentRoute)) return;

      const byId = new Map<string, AttachmentSummary>();
      let failedSources = 0;

      const collect = (
        result: PromiseSettledResult<AttachmentSummary[]>,
        linkedEntityType: AttachmentSummary['linkedEntityType'],
        linkedEntityId: string
      ) => {
        if (result.status === 'rejected') {
          failedSources += 1;
          return;
        }

        for (const attachment of result.value) {
          if (
            attachment.linkedEntityType !== linkedEntityType ||
            attachment.linkedEntityId !== linkedEntityId
          ) {
            continue;
          }
          byId.set(String(attachment.id), attachment);
        }
      };

      collect(recordResult, 'medical_record', currentRecord.id);
      collect(encounterResult, 'encounter', currentRecord.encounterId);
      attachments.value = Array.from(byId.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      );
      error.value =
        failedSources === 0
          ? ''
          : attachments.value.length > 0
            ? 'Alguns anexos não puderam ser carregados. Os itens exibidos foram confirmados pelo prontuário.'
            : 'Não foi possível carregar os anexos deste prontuário ou atendimento.';
    } finally {
      if (isCurrent(generation, sequence, isCurrentRoute)) loading.value = false;
    }
  }

  async function open(
    attachment: AttachmentSummary,
    isCurrentRoute: CurrentRouteGuard
  ): Promise<void> {
    if (attachment.scanStatus !== 'available' || openingId.value || !isCurrentRoute()) return;

    const generation = routeGeneration;
    const sequence = loadSequence;
    const attachmentId = String(attachment.id);
    openingId.value = attachmentId;
    actionError.value = '';

    try {
      const response = await apiRequest<AttachmentDownloadUrlResponse>(
        `/attachments/${encodeURIComponent(attachmentId)}/download-url`,
        { method: 'POST' }
      );
      if (!isCurrent(generation, sequence, isCurrentRoute)) return;

      const downloadUrl = resolveAttachmentDownloadUrl(attachmentId, response);
      const openedWindow = window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      if (!openedWindow) {
        throw new Error(
          'O navegador bloqueou a abertura do anexo. Permita novas abas e tente novamente.'
        );
      }
    } catch (cause: unknown) {
      if (isCurrent(generation, sequence, isCurrentRoute)) {
        actionError.value =
          cause instanceof Error ? cause.message : 'Não foi possível abrir ou baixar este anexo.';
      }
    } finally {
      if (isCurrent(generation, sequence, isCurrentRoute)) openingId.value = null;
    }
  }

  function isCurrent(
    generation: number,
    sequence: number,
    isCurrentRoute: CurrentRouteGuard
  ): boolean {
    return generation === routeGeneration && sequence === loadSequence && isCurrentRoute();
  }

  return {
    attachments,
    loading,
    error,
    actionError,
    openingId,
    load,
    open,
    reset
  };
}

function resolveAttachmentDownloadUrl(
  attachmentId: string,
  response: AttachmentDownloadUrlResponse
): string {
  const rawUrl = response.url;
  const rawExpiresAt = response.expiresAt;
  const expectedPath = `/attachments/${encodeURIComponent(attachmentId)}/content`;

  if (typeof rawUrl !== 'string' || !rawUrl.startsWith('/')) {
    throw new Error('A API não confirmou uma URL válida para este anexo.');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl, 'https://cvg-his.invalid');
  } catch {
    throw new Error('A API não confirmou uma URL válida para este anexo.');
  }

  const expiresAt = typeof rawExpiresAt === 'string' ? Date.parse(rawExpiresAt) : Number.NaN;
  if (
    parsedUrl.origin !== 'https://cvg-his.invalid' ||
    parsedUrl.pathname !== expectedPath ||
    !parsedUrl.searchParams.get('token') ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now()
  ) {
    throw new Error('A API não confirmou uma URL válida e vigente para este anexo.');
  }

  return `${spaRuntimeConfig.apiBaseUrl}/api${rawUrl}`;
}

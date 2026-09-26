<template>
  <article class="vetus-card" data-testid="clinical-attachments">
    <div class="vetus-card__header">
      <h3>Imagens e anexos</h3>
      <DsButton size="sm" variant="secondary" tag="a" :to="props.diagnosticsHref">
        Incluir Imagem
      </DsButton>
    </div>
    <div
      v-if="props.loading"
      class="muted"
      data-testid="clinical-attachments-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      Carregando anexos do prontuário…
    </div>
    <div v-else>
      <div
        v-if="props.error"
        class="clinical-inline-error"
        data-testid="clinical-attachments-error"
        role="alert"
      >
        {{ props.error }}
      </div>
      <div
        v-if="props.attachments.length"
        class="record-list attachment-list"
        role="list"
        aria-label="Anexos vinculados ao prontuário"
      >
        <div
          v-for="attachment in props.attachments"
          :key="attachment.id"
          class="record-list__item attachment-item"
          role="listitem"
          :data-testid="`clinical-attachment-${String(attachment.id)}`"
        >
          <div class="attachment-item__details">
            <strong>{{ attachment.fileName }}</strong>
            <p>Tipo: {{ attachment.mimeType }}</p>
            <p>Tamanho: {{ formatAttachmentSize(attachment.sizeBytes) }}</p>
            <span class="attachment-item__category">
              {{ attachmentCategoryLabel(attachment.category) }}
            </span>
          </div>
          <div class="attachment-item__actions">
            <DsButton
              v-if="attachment.scanStatus === 'available'"
              size="sm"
              variant="secondary"
              :loading="props.openingId === String(attachment.id)"
              :disabled="Boolean(props.openingId)"
              :aria-label="`Abrir ou baixar ${attachment.fileName}`"
              :data-testid="`clinical-attachment-open-${String(attachment.id)}`"
              @click="emit('open', attachment)"
            >
              {{ props.openingId === String(attachment.id) ? 'Preparando…' : 'Abrir / baixar' }}
            </DsButton>
            <span v-else class="attachment-item__availability" role="status">
              {{ attachmentAvailabilityLabel(attachment.scanStatus) }}
            </span>
          </div>
        </div>
      </div>
      <p v-else-if="!props.error" class="muted" data-testid="clinical-attachments-empty">
        Nenhum anexo vinculado a este prontuário ou atendimento.
      </p>
      <p v-else class="muted" data-testid="clinical-attachments-unconfirmed">
        A existência de anexos não pôde ser confirmada porque a leitura falhou.
      </p>
      <p
        v-if="props.actionError"
        class="clinical-inline-error"
        data-testid="clinical-attachment-action-error"
        role="alert"
      >
        {{ props.actionError }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import type { AttachmentSummary } from '@cvg-his-v2/shared-types';

const props = defineProps<{
  attachments: readonly AttachmentSummary[];
  loading: boolean;
  error: string;
  actionError: string;
  openingId: string | null;
  diagnosticsHref: string;
}>();

const emit = defineEmits<{
  open: [attachment: AttachmentSummary];
}>();

const attachmentCategoryMap: Record<AttachmentSummary['category'], string> = {
  image: 'Imagem',
  lab: 'Laudo',
  document: 'Documento',
  prescription: 'Prescrição',
  other: 'Outro'
};

const attachmentAvailabilityMap: Record<AttachmentSummary['scanStatus'], string> = {
  quarantined: 'Aguardando verificação de segurança',
  available: 'Disponível para abrir ou baixar',
  rejected: 'Indisponível após rejeição de segurança'
};

function attachmentCategoryLabel(category: AttachmentSummary['category']): string {
  return attachmentCategoryMap[category] || category;
}

function attachmentAvailabilityLabel(scanStatus: AttachmentSummary['scanStatus']): string {
  return attachmentAvailabilityMap[scanStatus] || 'Anexo indisponível para abrir ou baixar';
}

function formatAttachmentSize(sizeBytes?: number): string {
  if (typeof sizeBytes !== 'number' || !Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return 'Tamanho não informado';
  }

  if (sizeBytes < 1024) return `${sizeBytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = sizeBytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${units[unitIndex]}`;
}
</script>

<style scoped>
.vetus-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.vetus-card__header h3 {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
}

.record-list,
.attachment-list {
  display: grid;
  gap: 10px;
}

.record-list__item {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.record-list__item div {
  min-width: 0;
}

.record-list__item strong,
.record-list__item p,
.record-list__item span {
  overflow-wrap: anywhere;
}

.record-list__item p {
  margin: 3px 0 0;
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
}

.record-list__item span {
  flex-shrink: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.attachment-item__details {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.attachment-item__details p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.attachment-item__category,
.attachment-item__availability {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.attachment-item__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.clinical-inline-error {
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger-200, #fecaca);
  border-radius: 8px;
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-700, #b91c1c);
  line-height: 1.45;
}

.muted {
  margin: 0;
  color: var(--color-text-secondary, #64748b);
}

@media (max-width: 820px) {
  .vetus-card__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .record-list__item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

<template>
  <DsCard class="encounter-pix-panel" variant="outlined" title="PIX por atendimento" title-tag="h2">
    <div class="encounter-pix-panel__intro">
      <div>
        <p class="eyebrow">Financeiro do atendimento</p>
        <p class="lead">
          Solicite o despacho do PIX para o saldo BRL deste atendimento. A criação é assíncrona e
          não confirma a liquidação.
        </p>
      </div>
      <DsBadge
        v-if="attempt"
        :variant="statusPresentation.variant"
        size="md"
        :aria-label="`Estado PIX: ${statusPresentation.label}`"
      >
        {{ statusPresentation.label }}
      </DsBadge>
    </div>

    <DsAlert v-if="!isClosed" variant="warning" title="Finalize o atendimento">
      O despacho PIX só pode ser solicitado depois que o atendimento estiver fechado e o saldo
      financeiro estiver aberto.
    </DsAlert>

    <DsAlert v-else-if="!financialEligible" variant="warning" title="Saldo PIX indisponível">
      O despacho PIX exige cobrança aberta, saldo integral em aberto e pelo menos um item de
      cobrança. Atualize o resumo financeiro antes de tentar novamente.
    </DsAlert>

    <DsAlert v-if="requestError" variant="danger" title="Solicitação não confirmada">
      <p class="alert-copy">{{ requestError }}</p>
      <p class="alert-copy">
        A chave de idempotência desta tentativa foi preservada. Repetir a ação é seguro e não cria
        uma nova chave.
      </p>
      <DsButton
        variant="secondary"
        size="sm"
        :loading="submitting"
        :disabled="!canRequest"
        @click="requestAttempt"
      >
        Tentar novamente
      </DsButton>
    </DsAlert>

    <DsAlert v-if="statusError" variant="danger" title="Status indisponível">
      <p class="alert-copy">{{ statusError }}</p>
      <DsButton variant="secondary" size="sm" :loading="refreshing" @click="refreshAttempt">
        Atualizar status
      </DsButton>
    </DsAlert>

    <DsAlert v-if="restoreError" variant="danger" title="Tentativa PIX não consultada">
      <p class="alert-copy">{{ restoreError }}</p>
      <DsButton variant="secondary" size="sm" :loading="restoring" @click="restoreAttempt">
        Tentar consultar novamente
      </DsButton>
    </DsAlert>

    <div v-if="feedback" class="encounter-pix-panel__feedback" role="status" aria-live="polite">
      {{ feedback }}
    </div>

    <section v-if="attempt" class="attempt" aria-labelledby="encounter-pix-attempt-heading">
      <div class="attempt__heading">
        <div>
          <p class="eyebrow">Tentativa durável</p>
          <h3 id="encounter-pix-attempt-heading">Acompanhamento do despacho</h3>
        </div>
        <DsButton
          variant="ghost"
          size="sm"
          :loading="refreshing"
          :disabled="submitting || restoring"
          aria-label="Atualizar status da tentativa PIX"
          @click="refreshAttempt"
        >
          Atualizar status
        </DsButton>
      </div>

      <div
        class="attempt__state"
        :class="`attempt__state--${statusPresentation.variant}`"
        role="status"
        aria-live="polite"
      >
        <span class="attempt__state-mark" aria-hidden="true">{{ statusMark }}</span>
        <div>
          <strong>{{ statusPresentation.label }}</strong>
          <p>{{ statusPresentation.description }}</p>
        </div>
      </div>

      <div class="attempt__facts">
        <div>
          <span class="fact-label">Valor</span>
          <strong>{{ formatCents(attempt.amountCents) }}</strong>
        </div>
        <div>
          <span class="fact-label">Tentativa</span>
          <code>{{ attempt.id }}</code>
        </div>
        <div>
          <span class="fact-label">Atualizado em</span>
          <span>{{ formatDateTime(attempt.updatedAt) }}</span>
        </div>
        <div v-if="attempt.expiresAt">
          <span class="fact-label">Expira em</span>
          <span>{{ formatDateTime(attempt.expiresAt) }}</span>
        </div>
      </div>

      <DsAlert v-if="attempt.error" variant="danger" title="Erro informado pelo backend">
        <code>{{ attempt.error.code }}</code>
        <span> · {{ attempt.error.message }}</span>
      </DsAlert>

      <div v-if="hasPixData" class="pix-data" aria-label="Dados PIX retornados">
        <div v-if="qrCodeImageSource" class="pix-data__qr">
          <span class="fact-label">QR Code PIX</span>
          <img :src="qrCodeImageSource" :alt="`QR Code PIX da tentativa ${attempt.id}`" />
        </div>
        <div v-if="attempt.qrCodePayload" class="pix-data__payload">
          <span class="fact-label">PIX copia e cola</span>
          <code>{{ attempt.qrCodePayload }}</code>
        </div>
      </div>
      <p v-else class="muted">Esta resposta ainda não contém QR Code ou payload PIX.</p>

      <p class="contract-note">
        O contrato atual não oferece reversão nem confirmação manual. Esta tela apenas solicita e
        consulta o estado retornado pelo backend.
      </p>
      <p v-if="!isTerminal" class="polling-note" role="status" aria-live="polite">
        Atualização automática a cada 30 segundos enquanto esta tentativa estiver em andamento.
      </p>
    </section>

    <div v-else class="empty-attempt">
      <span class="empty-attempt__icon" aria-hidden="true">⌁</span>
      <div>
        <h3>Nenhuma tentativa PIX solicitada</h3>
        <p>O valor será calculado pelo saldo financeiro autoritativo do atendimento.</p>
      </div>
    </div>

    <template #footer>
      <div class="panel-actions">
        <DsButton
          variant="primary"
          :loading="submitting"
          :disabled="!canRequest || !!attempt || restoring || !!restoreError"
          :aria-label="isClosed ? 'Solicitar despacho PIX' : 'Solicitar PIX indisponível antes de fechar o atendimento'"
          @click="requestAttempt"
        >
          Solicitar despacho PIX
        </DsButton>
        <span v-if="!isClosed" class="disabled-reason">Disponível somente após fechar o atendimento.</span>
        <span v-else-if="!financialEligible" class="disabled-reason">
          Disponível quando a cobrança estiver aberta e elegível para PIX.
        </span>
      </div>
    </template>
  </DsCard>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import {
  getPixPaymentAttemptStatusPresentation,
  isTerminalPixPaymentAttemptState,
  pixService,
  type PixPaymentAttemptResponse
} from '@/services/pix';

const POLL_INTERVAL_MS = 30_000;

interface Props {
  encounterId: string;
  encounterStatus: string;
  financialEligible: boolean;
}

const props = defineProps<Props>();

const active = ref(true);
const attempt = ref<PixPaymentAttemptResponse | null>(null);
const idempotencyKey = ref<string | null>(null);
const submitting = ref(false);
const refreshing = ref(false);
const restoring = ref(false);
const requestError = ref('');
const statusError = ref('');
const restoreError = ref('');
const feedback = ref('');

let operationSequence = 0;
let pollingSequence = 0;
let pollTimer: ReturnType<typeof setTimeout> | undefined;

const isClosed = computed(() => props.encounterStatus === 'closed');
const canRequest = computed(() => isClosed.value && props.financialEligible);
const statusPresentation = computed(() =>
  getPixPaymentAttemptStatusPresentation(attempt.value?.state)
);
const isTerminal = computed(() =>
  attempt.value ? isTerminalPixPaymentAttemptState(attempt.value.state) : false
);
const hasPixData = computed(() => Boolean(attempt.value?.qrCodeBase64 || attempt.value?.qrCodePayload));
const qrCodeImageSource = computed(() => {
  const base64 = attempt.value?.qrCodeBase64;
  return base64 ? `data:image/png;base64,${base64}` : '';
});
const statusMark = computed(() => {
  if (statusPresentation.value.variant === 'success') return '✓';
  if (statusPresentation.value.variant === 'danger') return '!';
  if (statusPresentation.value.variant === 'warning') return '…';
  return 'i';
});

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pix-attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clearPoll(): void {
  if (pollTimer !== undefined) {
    clearTimeout(pollTimer);
    pollTimer = undefined;
  }
  pollingSequence += 1;
}

function isCurrentOperation(operation: number): boolean {
  return active.value && operation === operationSequence;
}

function applyAttempt(nextAttempt: PixPaymentAttemptResponse): void {
  attempt.value = nextAttempt;
  statusError.value = '';
}

function schedulePoll(nextAttempt: PixPaymentAttemptResponse): void {
  clearPoll();
  if (!active.value || isTerminalPixPaymentAttemptState(nextAttempt.state)) return;

  const sequence = ++pollingSequence;
  pollTimer = setTimeout(() => {
    void pollAttempt(nextAttempt.id, sequence);
  }, POLL_INTERVAL_MS);
}

async function pollAttempt(attemptId: string, sequence: number): Promise<void> {
  if (
    !active.value ||
    sequence !== pollingSequence ||
    attempt.value?.id !== attemptId ||
    submitting.value ||
    refreshing.value
  ) {
    return;
  }

  pollTimer = undefined;
  const operation = ++operationSequence;
  refreshing.value = true;
  try {
    const nextAttempt = await pixService.getEncounterAttempt(attemptId);
    if (!isCurrentOperation(operation) || attempt.value?.id !== attemptId) return;
    applyAttempt(nextAttempt);
    schedulePoll(nextAttempt);
  } catch (error: unknown) {
    if (isCurrentOperation(operation)) {
      statusError.value = error instanceof Error ? error.message : 'Não foi possível atualizar o status PIX.';
      if (attempt.value) schedulePoll(attempt.value);
    }
  } finally {
    if (isCurrentOperation(operation)) refreshing.value = false;
  }
}

async function requestAttempt(): Promise<void> {
  if (!canRequest.value || submitting.value || restoring.value || attempt.value) return;

  clearPoll();
  const operation = ++operationSequence;
  submitting.value = true;
  requestError.value = '';
  statusError.value = '';
  feedback.value = '';
  idempotencyKey.value ??= createIdempotencyKey();

  try {
    const nextAttempt = await pixService.requestEncounterAttempt(
      props.encounterId,
      idempotencyKey.value
    );
    if (!isCurrentOperation(operation)) return;
    applyAttempt(nextAttempt);
    feedback.value = `Solicitação aceita (202). Estado informado pelo backend: ${getPixPaymentAttemptStatusPresentation(nextAttempt.state).label}.`;
    if (nextAttempt.state === 'pending_dispatch') {
      feedback.value += ' O despacho ainda está pendente; 202 não representa liquidação.';
    }
    schedulePoll(nextAttempt);
  } catch (error: unknown) {
    if (isCurrentOperation(operation)) {
      requestError.value = error instanceof Error ? error.message : 'Não foi possível solicitar o despacho PIX.';
    }
  } finally {
    if (isCurrentOperation(operation)) submitting.value = false;
  }
}

async function refreshAttempt(): Promise<void> {
  const currentAttempt = attempt.value;
  if (!currentAttempt || submitting.value || refreshing.value) return;

  clearPoll();
  const operation = ++operationSequence;
  refreshing.value = true;
  statusError.value = '';
  try {
    const nextAttempt = await pixService.getEncounterAttempt(currentAttempt.id);
    if (!isCurrentOperation(operation) || attempt.value?.id !== currentAttempt.id) return;
    applyAttempt(nextAttempt);
    schedulePoll(nextAttempt);
  } catch (error: unknown) {
    if (isCurrentOperation(operation)) {
      statusError.value = error instanceof Error ? error.message : 'Não foi possível atualizar o status PIX.';
    }
  } finally {
    if (isCurrentOperation(operation)) refreshing.value = false;
  }
}

async function restoreAttempt(): Promise<void> {
  if (!active.value || restoring.value) return;
  clearPoll();
  const operation = ++operationSequence;
  restoring.value = true;
  restoreError.value = '';
  try {
    const restoredAttempt = await pixService.getLatestEncounterAttempt(props.encounterId);
    if (!isCurrentOperation(operation)) return;
    if (restoredAttempt) {
      applyAttempt(restoredAttempt);
      schedulePoll(restoredAttempt);
    } else {
      attempt.value = null;
    }
  } catch (error: unknown) {
    if (isCurrentOperation(operation)) {
      restoreError.value =
        error instanceof Error ? error.message : 'Não foi possível consultar a tentativa PIX.';
    }
  } finally {
    if (isCurrentOperation(operation)) restoring.value = false;
  }
}

function formatCents(amountCents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'não disponível';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

function resetForEncounter(): void {
  operationSequence += 1;
  clearPoll();
  submitting.value = false;
  refreshing.value = false;
  restoring.value = false;
  attempt.value = null;
  idempotencyKey.value = null;
  requestError.value = '';
  statusError.value = '';
  restoreError.value = '';
  feedback.value = '';
}

watch(
  () => props.encounterId,
  () => {
    resetForEncounter();
    void restoreAttempt();
  }
);

onMounted(() => {
  void restoreAttempt();
});

onBeforeUnmount(() => {
  active.value = false;
  operationSequence += 1;
  clearPoll();
});
</script>

<style scoped>
.encounter-pix-panel {
  --panel-accent: var(--color-primary-600, #07869d);
}

.encounter-pix-panel :deep(.ds-card__body) {
  display: grid;
  gap: 1.25rem;
}

.encounter-pix-panel :deep(.ds-card__footer) {
  padding: 1rem 1.25rem;
  background: var(--color-bg-subtle, #f5f9fa);
  border-top: 1px solid var(--color-border, #d5e2e6);
}

.encounter-pix-panel__intro,
.attempt__heading,
.panel-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow,
.fact-label {
  margin: 0;
  color: var(--color-text-muted, #55717a);
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: var(--font-weight-bold, 700);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lead {
  max-width: 54rem;
  margin: 0.35rem 0 0;
  color: var(--color-text-secondary, #3e5c67);
  line-height: 1.55;
}

.attempt {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #d5e2e6);
  border-radius: var(--radius-lg, 0.75rem);
  background: var(--color-bg-subtle, #f5f9fa);
}

.attempt h3,
.empty-attempt h3 {
  margin: 0.2rem 0 0;
  color: var(--color-text, #112530);
  font-size: var(--font-size-lg, 1.125rem);
}

.attempt__state {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  border-left: 4px solid var(--panel-accent);
  border-radius: var(--radius-md, 0.5rem);
  background: var(--color-surface, #fff);
}

.attempt__state--success { --panel-accent: var(--color-success-600, #12836c); }
.attempt__state--danger { --panel-accent: var(--color-danger-600, #c64b52); }
.attempt__state--warning { --panel-accent: var(--color-warning-600, #a96508); }
.attempt__state--info { --panel-accent: var(--color-info-600, #07869d); }

.attempt__state-mark {
  display: grid;
  flex: 0 0 1.8rem;
  place-items: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 50%;
  color: var(--color-text-inverse, #fff);
  background: var(--panel-accent);
  font-weight: 800;
}

.attempt__state p {
  margin: 0.25rem 0 0;
  color: var(--color-text-secondary, #3e5c67);
  line-height: 1.45;
}

.attempt__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.9rem;
}

.attempt__facts > div {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.attempt__facts code,
.pix-data code {
  color: var(--color-text, #112530);
  overflow-wrap: anywhere;
}

.pix-data {
  display: grid;
  grid-template-columns: minmax(9rem, 13rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  padding-top: 0.25rem;
}

.pix-data__qr,
.pix-data__payload {
  display: grid;
  gap: 0.5rem;
}

.pix-data__qr img {
  width: min(12rem, 100%);
  aspect-ratio: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border, #d5e2e6);
  border-radius: var(--radius-md, 0.5rem);
  background: #fff;
  image-rendering: pixelated;
}

.pix-data__payload code {
  display: block;
  max-height: 9rem;
  overflow: auto;
  padding: 0.75rem;
  border-radius: var(--radius-md, 0.5rem);
  background: var(--color-surface, #fff);
  line-height: 1.45;
}

.encounter-pix-panel__feedback {
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-info-200, #a9e2e8);
  border-radius: var(--radius-md, 0.5rem);
  color: var(--color-info-800, #075466);
  background: var(--color-info-50, #e8f8fa);
  line-height: 1.45;
}

.alert-copy {
  margin: 0 0 0.6rem;
}

.empty-attempt {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px dashed var(--color-border-strong, #b8ccd2);
  border-radius: var(--radius-lg, 0.75rem);
}

.empty-attempt p,
.contract-note,
.polling-note,
.muted {
  margin: 0.35rem 0 0;
  color: var(--color-text-muted, #55717a);
  line-height: 1.5;
}

.empty-attempt__icon {
  display: grid;
  flex: 0 0 2rem;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  color: var(--color-primary-700, #066b80);
  background: var(--color-primary-100, #d3f1f3);
  font-size: 1.25rem;
  font-weight: 700;
}

.panel-actions {
  align-items: center;
  flex-wrap: wrap;
}

.disabled-reason,
.polling-note {
  font-size: var(--font-size-xs, 0.75rem);
}

@media (max-width: 640px) {
  .encounter-pix-panel__intro,
  .attempt__heading,
  .panel-actions {
    flex-direction: column;
  }

  .pix-data {
    grid-template-columns: 1fr;
  }

  .panel-actions :deep(.ds-btn) {
    width: 100%;
  }
}
</style>

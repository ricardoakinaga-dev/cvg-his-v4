<template>
  <div class="pix-page">
    <AppPageHeader title="PIX" :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'PIX']" subtitle="Pagamentos instantâneos, intents e conferência operacional do financeiro">
      <template #actions>
        <DsButton variant="secondary" @click="resetForm">Limpar</DsButton>
      </template>
    </AppPageHeader>

    <section class="pix-overview">
      <DsCard title="Resumo operacional do PIX">
        <div class="overview-grid">
          <div class="overview-card">
            <span class="overview-card__value">{{ formatCurrency(form.amount || 0) }}</span>
            <span class="overview-card__label">Valor em edição</span>
          </div>
          <div class="overview-card">
            <span class="overview-card__value">
              <DsBadge
                v-if="lastIntent"
                :variant="lastIntentStatus.variant"
                :aria-label="lastIntentStatus.label"
              >
                {{ lastIntentStatus.label }}
              </DsBadge>
              <span v-else>—</span>
            </span>
            <span class="overview-card__label">Último status</span>
          </div>
          <div class="overview-card">
            <span class="overview-card__value">{{ lastIntent ? lastIntent.provider : '—' }}</span>
            <span class="overview-card__label">Provider</span>
          </div>
          <div class="overview-card">
            <span class="overview-card__value">{{ lastIntent ? '1' : '0' }}</span>
            <span class="overview-card__label">Intents nesta sessão</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="pix-actions">
      <DsCard title="Ações rápidas — Meios de pagamento" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/cash" icon="🏦">Caixa</DsButton>
          <DsButton variant="secondary" tag="a" to="/billing" icon="💰">Faturamento</DsButton>
          <DsButton variant="secondary" tag="a" to="/api-client" icon="🛠️">Cliente API</DsButton>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="pix-grid">
      <DsCard title="Criar intent PIX">
        <form class="pix-form" @submit.prevent="createIntent">
          <DsInput id="pix-amount" v-model.number="form.amount" type="number" label="Valor" required />
          <DsInput id="pix-description" v-model="form.description" label="Descrição" required />
          <DsInput id="pix-expiration" v-model.number="form.expirationMinutes" type="number" label="Expiração (min)" />
          <p class="contract-note">
            Vínculo com billing record: <strong>não disponível neste contrato</strong>.
          </p>
          <div class="form-actions">
            <DsButton variant="primary" :loading="creating">Criar intent</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Última intent">
        <div v-if="lastIntent" class="intent-summary">
          <div><strong>ID:</strong> <code>{{ lastIntent.id }}</code></div>
          <div class="intent-summary__status">
            <strong>Status:</strong>
            <DsBadge :variant="lastIntentStatus.variant" :aria-label="lastIntentStatus.label">
              {{ lastIntentStatus.label }}
            </DsBadge>
            <span v-if="!lastIntentStatus.supported" class="contract-note">
              {{ lastIntentStatus.availabilityLabel }}
            </span>
          </div>
          <div><strong>Provider:</strong> {{ lastIntent.provider }}</div>
          <div><strong>Valor:</strong> {{ formatCurrency(lastIntent.amount) }}</div>
          <div><strong>Expira em:</strong> {{ formatDateTime(lastIntent.expiresAt) }}</div>
          <div class="intent-summary__qr">
            <strong>QR Code PIX:</strong>
            <img
              v-if="qrCodeImageSource"
              class="qr-code"
              :src="qrCodeImageSource"
              :alt="`QR Code PIX da intent ${lastIntent.id}`"
            />
            <span v-else class="muted">não disponível nesta resposta</span>
          </div>
          <div><strong>Payload copia e cola:</strong> <code>{{ lastIntent.qrCodePayload }}</code></div>
          <div><strong>Evento:</strong> <code>{{ lastIntent.eventId }}</code></div>
        </div>
        <div v-else class="muted">Nenhuma intent criada nesta sessão.</div>
      </DsCard>

      <DsCard title="Contrato de status PIX">
        <p class="contract-intro">
          O endpoint atual de criação expõe somente os estados retornados abaixo. Os demais ficam
          visíveis para não sugerir uma reconciliação que esta tela não executa.
        </p>
        <ul class="status-contract" aria-label="Disponibilidade dos estados PIX no contrato atual">
          <li
            v-for="status in pixStatusContract"
            :key="status.code"
            class="status-contract__item"
            :class="{ 'status-contract__item--unsupported': !status.supported }"
          >
            <span class="status-contract__name">
              <code>{{ status.code }}</code>
              <span>{{ status.label }}</span>
            </span>
            <DsBadge :variant="status.supported ? status.variant : 'default'" size="sm">
              {{ status.availabilityLabel }}
            </DsBadge>
          </li>
        </ul>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import {
  getPixStatusPresentation,
  PIX_STATUS_CONTRACT,
  pixService,
  type PixPaymentIntentResponse
} from '@/services/pix';

const creating = ref(false);
const error = ref('');
const successMessage = ref('');
const lastIntent = ref<PixPaymentIntentResponse | null>(null);
const form = ref({
  amount: 0,
  description: '',
  expirationMinutes: 15
});
const pixStatusContract = PIX_STATUS_CONTRACT;
const lastIntentStatus = computed(() => getPixStatusPresentation(lastIntent.value?.status));
const qrCodeImageSource = computed(() => {
  const qrCodeBase64 = lastIntent.value?.qrCodeBase64.trim();
  return qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : '';
});

async function createIntent() {
  creating.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    lastIntent.value = await pixService.createIntent({
      amount: Number(form.value.amount),
      description: form.value.description.trim(),
      expirationMinutes: Number(form.value.expirationMinutes) || 15
    });
    successMessage.value = 'Intent PIX criada com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao criar intent PIX';
  } finally {
    creating.value = false;
  }
}

function resetForm() {
  form.value = { amount: 0, description: '', expirationMinutes: 15 };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'não disponível nesta resposta';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}
</script>

<style scoped>
.pix-overview,
.pix-actions {
  margin-bottom: 0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 20px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pix-grid {
  display: grid;
  gap: 16px;
}

.pix-form {
  display: grid;
  gap: 12px;
}

.contract-note {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.45;
}

.contract-intro {
  margin: 0 0 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.intent-summary {
  display: grid;
  gap: 8px;
}

.intent-summary__status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.intent-summary__qr {
  display: grid;
  justify-items: start;
  gap: 8px;
}

.qr-code {
  width: min(220px, 100%);
  aspect-ratio: 1;
  padding: 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: #ffffff;
  image-rendering: pixelated;
}

.status-contract {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.status-contract__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--color-border-subtle, #eef2f1);
}

.status-contract__item:last-child {
  border-bottom: 0;
}

.status-contract__item--unsupported {
  opacity: 0.82;
}

.status-contract__name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.muted {
  color: var(--color-text-muted, #64748b);
}

code {
  word-break: break-all;
}

@media (max-width: 560px) {
  .status-contract__item {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>

<template>
  <div class="whatsapp-page">
    <AppPageHeader title="WhatsApp Operacional" subtitle="Canal de confirmação, relacionamento e réguas operacionais do Marketing">
      <template #actions>
        <DsButton variant="secondary" @click="resetForm">Limpar</DsButton>
      </template>
    </AppPageHeader>

    <section class="whatsapp-overview">
      <DsCard title="Resumo do canal">
        <div class="overview-grid">
          <div class="overview-card">
            <span class="overview-card__value">{{ form.From }}</span>
            <span class="overview-card__label">Origem configurada</span>
          </div>
          <div class="overview-card">
            <span class="overview-card__value">{{ form.To || '—' }}</span>
            <span class="overview-card__label">Destino padrão</span>
          </div>
          <div class="overview-card">
            <span class="overview-card__value">{{ responseText ? '1' : '0' }}</span>
            <span class="overview-card__label">Eventos testados</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="whatsapp-actions">
      <DsCard title="Ações rápidas — WhatsApp" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/notifications">Campanhas</DsButton>
          <DsButton variant="secondary" tag="a" to="/appointments">Agenda</DsButton>
          <DsButton variant="secondary" tag="a" to="/quotes">Orçamentos</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="whatsapp-intelligence">
      <DsCard title="Leitura operacional do canal">
        <div class="insights-grid">
          <div v-for="card in insightCards" :key="card.label" class="insight-card">
            <span class="insight-card__label">{{ card.label }}</span>
            <strong class="insight-card__value">{{ card.value }}</strong>
            <span class="insight-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="whatsapp-grid">
      <DsCard title="Testar inbound">
        <form class="whatsapp-form" @submit.prevent="sendInbound">
          <DsInput id="wa-message-sid" v-model="form.MessageSid" label="Message SID" required />
          <DsInput id="wa-from" v-model="form.From" label="De" required />
          <DsInput id="wa-to" v-model="form.To" label="Para" />
          <DsInput id="wa-body" v-model="form.Body" type="textarea" label="Mensagem" :rows="4" required />
          <DsInput id="wa-appointment" v-model="form.AppointmentId" label="Appointment ID" placeholder="opcional" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="sending">Enviar inbound</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Resposta do webhook">
        <div v-if="responseText" class="response-box">
          <code>{{ responseText }}</code>
        </div>
        <div v-else class="muted">A resposta do webhook será exibida aqui após o envio.</div>
      </DsCard>

      <DsCard title="Histórico local de testes">
        <div v-if="history.length" class="history-list">
          <div v-for="item in history" :key="item.id" class="history-item">
            <strong>{{ item.keyword }}</strong>
            <span>{{ item.to || 'Sem destino' }}</span>
            <span>{{ formatDate(item.createdAt) }}</span>
            <code>{{ item.response }}</code>
          </div>
        </div>
        <div v-else class="muted">Os testes mais recentes do canal serão listados aqui.</div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { whatsappService } from '@/services/whatsapp';

interface WhatsAppHistoryItem {
  id: string;
  createdAt: string;
  from: string;
  to: string;
  keyword: string;
  appointmentId?: string;
  response: string;
}

const HISTORY_STORAGE_KEY = 'cvg-his-v2:whatsapp-history';
const sending = ref(false);
const error = ref('');
const successMessage = ref('');
const responseText = ref('');
const history = ref<WhatsAppHistoryItem[]>(loadHistory());
const form = ref({
  MessageSid: 'SM-e2e-0001',
  From: 'whatsapp:+5511999998888',
  To: 'whatsapp:+551155555555',
  Body: 'CONFIRMAR',
  AppointmentId: ''
});
const normalizedKeyword = computed(() => form.value.Body.trim().split(/\s+/)[0]?.toUpperCase() || '—');
const uniqueDestinations = computed(() => new Set(history.value.map((item) => item.to).filter(Boolean)).size);
const confirmationsCount = computed(
  () => history.value.filter((item) => item.keyword === 'CONFIRMAR').length
);
const lastOutcome = computed(() => history.value[0]?.response ?? 'Sem retorno');
const insightCards = computed(() => [
  {
    label: 'Keyword principal',
    value: normalizedKeyword.value,
    hint: 'Primeira palavra do payload em edição'
  },
  {
    label: 'Testes registrados',
    value: String(history.value.length),
    hint: 'Histórico local desta estação'
  },
  {
    label: 'Destinos únicos',
    value: String(uniqueDestinations.value),
    hint: 'Contatos diferentes testados'
  },
  {
    label: 'Confirmações',
    value: String(confirmationsCount.value),
    hint: 'Mensagens com keyword CONFIRMAR'
  },
  {
    label: 'Último retorno',
    value: lastOutcome.value,
    hint: 'Resposta mais recente do webhook'
  }
]);

async function sendInbound() {
  sending.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    responseText.value = await whatsappService.sendInbound({
      MessageSid: form.value.MessageSid.trim(),
      From: form.value.From.trim(),
      To: form.value.To.trim() || undefined,
      Body: form.value.Body.trim(),
      AppointmentId: form.value.AppointmentId.trim() || undefined
    });
    registerHistory(responseText.value);
    successMessage.value = 'Webhook inbound processado com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao enviar inbound';
  } finally {
    sending.value = false;
  }
}

function resetForm() {
  form.value = {
    MessageSid: 'SM-e2e-0001',
    From: 'whatsapp:+5511999998888',
    To: 'whatsapp:+551155555555',
    Body: 'CONFIRMAR',
    AppointmentId: ''
  };
  responseText.value = '';
}

function registerHistory(response: string) {
  const nextItem: WhatsAppHistoryItem = {
    id: `${form.value.MessageSid.trim()}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    from: form.value.From.trim(),
    to: form.value.To.trim(),
    keyword: normalizedKeyword.value,
    appointmentId: form.value.AppointmentId.trim() || undefined,
    response
  };
  history.value = [nextItem, ...history.value].slice(0, 8);
  persistHistory(history.value);
}

function loadHistory(): WhatsAppHistoryItem[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WhatsAppHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(items: WhatsAppHistoryItem[]) {
  try {
    sessionStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<style scoped>
.whatsapp-overview,
.whatsapp-actions,
.whatsapp-intelligence {
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
  font-size: 14px;
  font-weight: 700;
  word-break: break-word;
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

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.insight-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.insight-card__label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.insight-card__value {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  font-weight: 800;
  word-break: break-word;
}

.insight-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.whatsapp-grid {
  display: grid;
  gap: 16px;
}

.whatsapp-form {
  display: grid;
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.response-box {
  padding: 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.muted {
  color: var(--color-text-muted, #64748b);
}

code {
  word-break: break-all;
}
</style>

<template>
  <div class="pix-page">
    <AppPageHeader title="PIX" subtitle="Intents PIX reais com a abstração segura do gateway local">
      <template #actions>
        <DsButton variant="secondary" @click="resetForm">Limpar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="pix-grid">
      <DsCard title="Criar intent PIX">
        <form class="pix-form" @submit.prevent="createIntent">
          <DsInput id="pix-amount" v-model.number="form.amount" type="number" label="Valor" required />
          <DsInput id="pix-description" v-model="form.description" label="Descrição" required />
          <DsInput id="pix-billing-record" v-model="form.billingRecordId" label="Billing Record ID" placeholder="opcional" />
          <DsInput id="pix-expiration" v-model.number="form.expirationMinutes" type="number" label="Expiração (min)" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="creating">Criar intent</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Última intent">
        <div v-if="lastIntent" class="intent-summary">
          <div><strong>ID:</strong> <code>{{ lastIntent.id }}</code></div>
          <div><strong>Status:</strong> {{ lastIntent.status }}</div>
          <div><strong>Provider:</strong> {{ lastIntent.provider }}</div>
          <div><strong>Valor:</strong> {{ formatCurrency(lastIntent.amount) }}</div>
          <div><strong>QR:</strong> <code>{{ lastIntent.qrCodeText }}</code></div>
          <div><strong>Evento:</strong> <code>{{ lastIntent.eventId }}</code></div>
        </div>
        <div v-else class="muted">Nenhuma intent criada nesta sessão.</div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { pixService, type PixPaymentIntentResponse } from '@/services/pix';

const creating = ref(false);
const error = ref('');
const successMessage = ref('');
const lastIntent = ref<PixPaymentIntentResponse | null>(null);
const form = ref({
  amount: 0,
  description: '',
  billingRecordId: '',
  expirationMinutes: 15
});

async function createIntent() {
  creating.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    lastIntent.value = await pixService.createIntent({
      amount: Number(form.value.amount),
      description: form.value.description.trim(),
      billingRecordId: form.value.billingRecordId.trim() || null,
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
  form.value = { amount: 0, description: '', billingRecordId: '', expirationMinutes: 15 };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
</script>

<style scoped>
.pix-grid {
  display: grid;
  gap: 16px;
}

.pix-form {
  display: grid;
  gap: 12px;
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

.muted {
  color: var(--color-text-muted, #64748b);
}

code {
  word-break: break-all;
}
</style>

<template>
  <div class="whatsapp-page">
    <AppPageHeader title="WhatsApp Operacional" subtitle="Simulação real do inbound vendor webhook usado no bloco 3">
      <template #actions>
        <DsButton variant="secondary" @click="resetForm">Limpar</DsButton>
      </template>
    </AppPageHeader>

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
import { whatsappService } from '@/services/whatsapp';

const sending = ref(false);
const error = ref('');
const successMessage = ref('');
const responseText = ref('');
const form = ref({
  MessageSid: 'SM-e2e-0001',
  From: 'whatsapp:+5511999998888',
  To: 'whatsapp:+551155555555',
  Body: 'CONFIRMAR',
  AppointmentId: ''
});

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
</script>

<style scoped>
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

.muted {
  color: var(--color-text-muted, #64748b);
}

code {
  word-break: break-all;
}
</style>

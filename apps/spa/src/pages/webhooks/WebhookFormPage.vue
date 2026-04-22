<template>
  <div class="webhook-form-page">
    <AppPageHeader :breadcrumbs="['Console Enterprise', 'Integrações', 'Webhooks', isEdit ? 'Editar Webhook' : 'Novo Webhook']">
      <template #title>
        {{ isEdit ? 'Editar Webhook' : 'Novo Webhook' }}
      </template>
      <template #subtitle>
        <span class="muted">Integração por evento com validação de endpoint e contrato de entrega.</span>
      </template>
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/webhooks')">Cancelar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="webhook-form__layout">
      <form class="webhook-form" @submit.prevent="onSubmit">
        <DsCard title="Configuração do Webhook">
          <DsInput
            id="url"
            v-model="form.url"
            label="URL do Endpoint *"
            placeholder="https://seu-sistema.com/webhook"
            :error="errors.url"
            required
          />
          <div class="form-field">
            <label class="form-field__label">Eventos *</label>
            <div class="events-checkbox-grid">
              <label v-for="event in AVAILABLE_EVENTS" :key="event" class="event-checkbox">
                <input type="checkbox" :value="event" v-model="form.events" />
                <span>{{ event }}</span>
              </label>
            </div>
            <span v-if="errors.events" class="form-field__error">{{ errors.events }}</span>
          </div>
          <DsInput
            v-if="!isEdit"
            id="secret"
            v-model="form.secret"
            label="Secret (opcional)"
            placeholder="Chave secreta para verificação"
            type="password"
          />
          <DsAlert v-if="!isEdit" variant="info" size="sm">
            Após criar o webhook, você receberá notificações HTTP em sua URL para cada evento
            selecionado.
          </DsAlert>
        </DsCard>

        <div class="form-actions">
          <DsButton type="submit" variant="primary" :loading="submitting">
            {{ submitting ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Webhook' }}
          </DsButton>
          <DsButton variant="secondary" @click="router.push('/webhooks')">Cancelar</DsButton>
        </div>
      </form>

      <DsCard title="Boas práticas" class="webhook-form__aside">
        <ul class="webhook-form__hints">
          <li>Use URLs públicas e estáveis com TLS válido.</li>
          <li>Selecione somente eventos realmente consumidos.</li>
          <li>Defina secret para validar a origem das entregas.</li>
        </ul>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { webhookService } from '@/services/webhook';
import type { WebhookSummary, CreateWebhookRequest, UpdateWebhookRequest } from '@/types/webhook';
import { AVAILABLE_EVENTS } from '@/types/webhook';
import { useFormValidation } from '@/composables/useFormValidation';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id && route.path.includes('/edit'));
const webhookId = computed(() => route.params.id as string);

const form = reactive({
  url: '',
  events: [] as string[],
  secret: ''
});

const validation = useFormValidation({
  rules: {
    url: [
      (v: unknown) => {
        const url = v as string;
        if (!url.trim()) return 'URL é obrigatória';
        try {
          new URL(url);
          return null;
        } catch {
          return 'URL inválida — deve começar com http:// ou https://';
        }
      }
    ],
    events: [
      (v: unknown) => {
        const events = v as string[];
        if (!events || events.length === 0) return 'Selecione pelo menos um evento';
        return null;
      }
    ]
  }
});

const { errors, formError, successMessage, submitting, validate } = validation;

async function onSubmit() {
  if (!validate(form)) return;

  submitting.value = true;
  formError.value = '';
  successMessage.value = '';

  try {
    if (isEdit.value) {
      const payload: UpdateWebhookRequest = {
        url: form.url.trim(),
        events: form.events
      };
      await webhookService.update(webhookId.value, payload);
      successMessage.value = 'Webhook atualizado com sucesso!';
      setTimeout(() => router.push(`/webhooks/${webhookId.value}`), 1000);
    } else {
      const payload: CreateWebhookRequest = {
        url: form.url.trim(),
        events: form.events,
        secret: form.secret || undefined
      };
      const created: WebhookSummary = await webhookService.create(payload);
      successMessage.value = 'Webhook cadastrado com sucesso!';
      setTimeout(() => router.push(`/webhooks/${created.id}`), 1000);
    }
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao salvar webhook';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (isEdit.value) {
    try {
      const webhook: WebhookSummary = await webhookService.getById(webhookId.value);
      form.url = webhook.url;
      form.events = [...webhook.events];
    } catch (err: unknown) {
      formError.value = err instanceof Error ? err.message : 'Erro ao carregar webhook';
    }
  }
});
</script>

<style scoped>
.webhook-form__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
}

.webhook-form {
  display: grid;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text, #334155);
}

.form-field__error {
  font-size: 12px;
  color: var(--color-danger-600, #dc2626);
}

.events-checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
  background: var(--color-bg-subtle, #f8fafc);
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.event-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 0;
  color: var(--color-text-secondary, #475569);
}

.event-checkbox input {
  width: auto;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 12px;
}

.webhook-form__aside {
  min-width: 0;
}

.webhook-form__hints {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 960px) {
  .webhook-form__layout {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="marketing-sms-page">
    <AppPageHeader
      title="Envio de SMS Simples"
      :breadcrumbs="['Marketing', 'Envios', 'Envio de SMS Simples']"
      subtitle="Rascunho seguro de SMS unitário por cliente, sem disparo real"
      :secondary-actions="headerSecondaryActions"
      :primary-action="{ label: 'Enviar SMS', disabled: true }"
    />

    <DsAlert variant="warning">
      Superfície segura para preservar a ordem Vetus de Marketing. O envio real de SMS permanece bloqueado; preparar
      rascunho não consome saldo, não chama provedor externo e não grava mensagem.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="draftMessage" variant="success" dismissible @dismiss="draftMessage = ''">{{ draftMessage }}</DsAlert>

    <section class="marketing-sms-summary-grid" aria-label="Resumo de SMS simples">
      <DsStatCard label="Seu saldo é de 0 SMS disponíveis para envio" value="Saldo" />
      <DsStatCard :label="`${owners.length} cliente(s)`" value="Clientes" />
      <DsStatCard :label="`${remainingCharacters} caracteres restantes`" value="Limite" />
      <DsStatCard label="Envio real bloqueado" value="Segurança" />
    </section>

    <form class="marketing-sms-form" aria-label="Envio de SMS simples" @submit.prevent="prepareDraft">
      <DsInput
        id="marketing-sms-client"
        v-model="selectedOwnerId"
        label="Cliente"
        type="select"
        :disabled="loading"
      >
        <option value="">Selecione um cliente</option>
        <option v-for="owner in owners" :key="owner.id" :value="owner.id">{{ owner.fullName }}</option>
      </DsInput>

      <DsInput
        id="marketing-sms-phone"
        v-model="phone"
        label="Celular"
        placeholder="Celular do cliente"
        type="tel"
        autocomplete="tel"
      />

      <DsInput
        id="marketing-sms-body"
        v-model="body"
        label="Corpo do SMS"
        placeholder="Digite uma mensagem com até 150 caracteres"
        type="textarea"
        :maxlength="SMS_LIMIT"
        :rows="5"
        :hint="`${remainingCharacters} caracteres restantes`"
      />

      <div class="marketing-sms-actions" aria-label="Ações de SMS simples">
        <DsButton id="marketing-sms-preview" variant="primary" type="submit" :disabled="!canPrepareDraft" @click="prepareDraft">
          Preparar SMS
        </DsButton>
        <DsButton variant="secondary" type="button" @click="resetDraft">Limpar</DsButton>
        <DsButton variant="secondary" tag="a" to="/notifications">Campanhas de SMS Marketing</DsButton>
        <DsButton variant="primary" disabled>Enviar SMS</DsButton>
      </div>
    </form>

    <section v-if="preparedDraft" class="marketing-sms-preview" aria-label="Prévia do SMS">
      <h2>Prévia do SMS</h2>
      <dl>
        <div>
          <dt>Cliente</dt>
          <dd>{{ selectedOwner?.fullName ?? 'Cliente não selecionado' }}</dd>
        </div>
        <div>
          <dt>Celular</dt>
          <dd>{{ phone || 'Celular não informado' }}</dd>
        </div>
        <div>
          <dt>Mensagem</dt>
          <dd>{{ preparedDraft }}</dd>
        </div>
      </dl>
    </section>

    <section class="marketing-sms-history" aria-label="Histórico de SMS">
      <h2>Histórico de SMS</h2>
      <DataTable
        :columns="historyColumns"
        :rows="historyRows"
        empty-icon="📱"
        empty-title="Nenhum SMS no histórico"
        empty-description="O histórico será exibido quando houver contrato auditável de envio e consulta."
        caption="Histórico de SMS"
        row-key-field="id"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { ownerService } from '@/services/owner';
import type { OwnerContact, OwnerSummary } from '@/types/owner';

const SMS_LIMIT = 150;

const historyColumns: DataTableColumn[] = [
  { key: 'client', label: 'Cliente' },
  { key: 'phone', label: 'Celular' },
  { key: 'message', label: 'Mensagem' },
  { key: 'status', label: 'Status' },
  { key: 'sentAt', label: 'Enviado em' }
];

const owners = ref<OwnerSummary[]>([]);
const selectedOwnerId = ref('');
const phone = ref('');
const body = ref('');
const preparedDraft = ref('');
const draftMessage = ref('');
const loading = ref(false);
const error = ref('');
const historyRows = ref<DataTableRow[]>([]);

const selectedOwner = computed(() => owners.value.find((owner) => owner.id === selectedOwnerId.value) ?? null);
const remainingCharacters = computed(() => SMS_LIMIT - body.value.length);
const canPrepareDraft = computed(() => Boolean(selectedOwnerId.value && phone.value.trim() && body.value.trim()));
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-marketing-sms',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: loadOwners
  }
]);

watch(selectedOwnerId, () => {
  const contact = preferredSmsContact(selectedOwner.value);
  phone.value = contact?.value ?? '';
});

watch(body, (value) => {
  if (value.length > SMS_LIMIT) {
    body.value = value.slice(0, SMS_LIMIT);
  }
});

async function loadOwners() {
  loading.value = true;
  error.value = '';
  try {
    owners.value = await ownerService.list({ status: 'active', page: 1, pageSize: 50 });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar clientes';
    owners.value = [];
  } finally {
    loading.value = false;
  }
}

function prepareDraft() {
  if (!canPrepareDraft.value) return;
  preparedDraft.value = body.value.trim();
  draftMessage.value = 'Rascunho preparado sem envio real';
}

function resetDraft() {
  selectedOwnerId.value = '';
  phone.value = '';
  body.value = '';
  preparedDraft.value = '';
  draftMessage.value = '';
}

function preferredSmsContact(owner: OwnerSummary | null): OwnerContact | null {
  if (!owner) return null;
  return (
    owner.contacts.find((contact) => contact.primary && isSmsCapable(contact)) ??
    owner.contacts.find(isSmsCapable) ??
    null
  );
}

function isSmsCapable(contact: OwnerContact): boolean {
  return contact.type === 'phone' || contact.type === 'whatsapp';
}

onMounted(() => {
  void loadOwners();
});
</script>

<style scoped>
.marketing-sms-page {
  display: grid;
  gap: 16px;
}

.marketing-sms-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.marketing-sms-form {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
}

.marketing-sms-form :deep(.ds-input-wrapper:has(textarea)) {
  grid-column: 1 / -1;
}

.marketing-sms-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  grid-column: 1 / -1;
}

.marketing-sms-preview,
.marketing-sms-history {
  display: grid;
  gap: 12px;
}

.marketing-sms-preview h2,
.marketing-sms-history h2 {
  font-size: 18px;
  margin: 0;
}

.marketing-sms-preview dl {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  display: grid;
  gap: 0;
  margin: 0;
}

.marketing-sms-preview dl > div {
  display: grid;
  gap: 4px;
  grid-template-columns: 160px 1fr;
  padding: 12px;
}

.marketing-sms-preview dl > div + div {
  border-top: 1px solid var(--color-border, #e2e8f0);
}

.marketing-sms-preview dt {
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
}

.marketing-sms-preview dd {
  margin: 0;
}

@media (max-width: 900px) {
  .marketing-sms-summary-grid,
  .marketing-sms-form,
  .marketing-sms-preview dl > div {
    grid-template-columns: 1fr;
  }
}
</style>

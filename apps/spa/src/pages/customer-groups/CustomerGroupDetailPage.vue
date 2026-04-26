<template>
  <div class="customer-group-detail-page">
    <AppPageHeader
      title="Detalhes do Grupo de Clientes"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Grupos de Clientes', customerGroup?.name ?? 'Detalhes']"
      :subtitle="customerGroup?.name ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/customer-groups')">Voltar</DsButton>
        <DsButton variant="secondary" :disabled="!customerGroup" @click="duplicateCustomerGroup">Duplicar</DsButton>
        <DsButton variant="secondary" :disabled="!customerGroup" @click="deleteCustomerGroup">Excluir</DsButton>
        <DsButton variant="primary" :disabled="!customerGroup" @click="router.push(`/customer-groups/${customerGroupId}/edit`)">
          Editar Cadastro
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div v-if="customerGroup" class="detail-layout">
      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <div class="detail-grid">
        <DsCard title="Dados do Grupo">
          <div class="detail-list">
            <div><strong>Id:</strong> {{ customerGroup.id }}</div>
            <div><strong>Código:</strong> {{ customerGroup.code ?? '—' }}</div>
            <div><strong>Descrição:</strong> {{ customerGroup.name }}</div>
            <div><strong>Segmento:</strong> {{ customerGroup.segment ?? '—' }}</div>
            <div><strong>Desconto:</strong> {{ formatPercent(customerGroup.discountPercent) }}</div>
            <div><strong>Prazo:</strong> {{ customerGroup.paymentTermDays }} dias</div>
            <div><strong>Limite:</strong> {{ formatMoney(customerGroup.creditLimitAmount) }}</div>
            <div><strong>Status:</strong> {{ customerGroup.active ? 'Ativo' : 'Inativo' }}</div>
            <div><strong>Observação:</strong> {{ customerGroup.description ?? '—' }}</div>
            <div><strong>Criado em:</strong> {{ formatDateTime(customerGroup.createdAt) }}</div>
            <div><strong>Atualizado em:</strong> {{ formatDateTime(customerGroup.updatedAt) }}</div>
          </div>
        </DsCard>

        <DsCard title="Conexões operacionais">
          <div class="detail-list">
            <div><strong>Clientes:</strong> preparado para vínculo e filtros no cadastro do cliente.</div>
            <div><strong>Comandas e vendas:</strong> centraliza desconto, prazo e política de limite.</div>
            <div><strong>Orçamentos:</strong> referência comercial para aprovação e negociação.</div>
            <div><strong>Marketing:</strong> segmenta campanhas, lembretes e comunicação recorrente.</div>
          </div>
        </DsCard>
      </div>
    </div>

    <div v-else-if="loading" class="loading">Carregando...</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { customerGroupsService, type CustomerGroupSummary } from '@/services/customerGroups';
import { formatDateTime } from '@/utils/labels';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const router = useRouter();
const route = useRoute();
const customerGroupId = computed(() => route.params.id as string);
const customerGroup = ref<CustomerGroupSummary | null>(null);
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const summaryCards = computed(() => {
  if (!customerGroup.value) return [];
  return [
    { label: 'Código', value: customerGroup.value.code || '—', hint: 'Referência Vetus' },
    { label: 'Segmento', value: customerGroup.value.segment || '—', hint: 'Classificação' },
    { label: 'Desconto', value: formatPercent(customerGroup.value.discountPercent), hint: 'Política comercial' },
    { label: 'Status', value: customerGroup.value.active ? 'Ativo' : 'Inativo', hint: 'Disponibilidade' }
  ];
});

async function loadCustomerGroup() {
  loading.value = true;
  error.value = '';
  try {
    customerGroup.value = await customerGroupsService.getById(customerGroupId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar grupo de clientes';
  } finally {
    loading.value = false;
  }
}

async function duplicateCustomerGroup() {
  if (!customerGroup.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    const duplicated = await customerGroupsService.create({
      name: `${customerGroup.value.name} - copia`,
      code: customerGroup.value.code ? `${customerGroup.value.code}-COPIA` : null,
      segment: customerGroup.value.segment,
      discountPercent: customerGroup.value.discountPercent,
      paymentTermDays: customerGroup.value.paymentTermDays,
      creditLimitAmount: customerGroup.value.creditLimitAmount,
      description: customerGroup.value.description,
      active: false
    });
    successMessage.value = 'Grupo de Clientes duplicado com sucesso.';
    await router.push(`/customer-groups/${duplicated.id}/edit`);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao duplicar grupo de clientes';
  }
}

async function deleteCustomerGroup() {
  if (!customerGroup.value) return;
  error.value = '';
  successMessage.value = '';
  try {
    await customerGroupsService.delete(customerGroup.value.id);
    successMessage.value = 'Grupo de Clientes excluído com sucesso.';
    await router.push('/customer-groups');
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao excluir grupo de clientes';
  }
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatMoney(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

onMounted(loadCustomerGroup);
</script>

<style scoped>
.customer-group-detail-page,
.detail-layout,
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.summary-card__value {
  display: block;
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 800;
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.loading {
  color: var(--color-text-muted, #64748b);
}
</style>

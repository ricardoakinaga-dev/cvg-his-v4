<template>
  <div class="detail-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Cadastros', 'Serviços', service?.name ?? 'Detalhes']"
      title="Detalhes do Serviço"
      :subtitle="service?.name ?? 'Carregando...'">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/services')">Voltar</DsButton>
        <DsButton variant="primary" @click="router.push(`/services/${serviceId}/edit`)">Editar Cadastro</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="service" class="detail-layout">
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
        <DsCard title="Dados do Serviço">
          <div class="detail-list">
            <div><strong>Id:</strong> {{ service.id }}</div>
            <div><strong>Código:</strong> {{ service.code ?? '—' }}</div>
            <div><strong>Descrição:</strong> {{ service.name }}</div>
            <div><strong>Observações:</strong> {{ service.description ?? '—' }}</div>
            <div><strong>Valor:</strong> {{ formatCurrency(service.basePrice) }}</div>
            <div>
              <strong>Status:</strong>
              <span
                :class="['status-badge', service.active ? 'status-badge--active' : 'status-badge--inactive']"
              >
                {{ service.active ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <div><strong>Criado em:</strong> {{ formatDateTime(service.createdAt) }}</div>
            <div><strong>Atualizado em:</strong> {{ formatDateTime(service.updatedAt) }}</div>
          </div>
        </DsCard>

        <DsCard title="Tabela de Preço">
          <div class="detail-list">
            <div><strong>Tabela:</strong> Padrão</div>
            <div><strong>Valor:</strong> {{ formatCurrency(service.basePrice) }}</div>
          </div>
        </DsCard>

        <DsCard title="Tabela Fiscal">
          <div class="detail-list">
            <div><strong>Empresa:</strong> Empresa atual</div>
            <div><strong>Tabela Fiscal Serviço:</strong> Configuração fiscal vinculada</div>
          </div>
        </DsCard>

        <DsCard title="Conexões operacionais">
          <div class="detail-list">
            <div><strong>Agenda:</strong> serviço ativo disponível para seleção operacional.</div>
            <div><strong>Comandas:</strong> serviço pode compor cobrança por animal/cliente.</div>
            <div><strong>Faturamento:</strong> valor e tabela fiscal alimentam fechamento e NFS-e.</div>
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
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { servicesService, type ServiceSummary } from '@/services/services';
import { formatDateTime } from '@/utils/labels';

const router = useRouter();
const route = useRoute();
const serviceId = computed(() => route.params.id as string);
const service = ref<ServiceSummary | null>(null);
const loading = ref(false);
const error = ref('');

const summaryCards = computed(() => {
  if (!service.value) return [];
  return [
    { label: 'Código', value: service.value.code || '—', hint: 'Identificador comercial' },
    { label: 'Valor', value: formatCurrency(service.value.basePrice), hint: 'Valor base de catálogo' },
    { label: 'Status', value: service.value.active ? 'Ativo' : 'Inativo', hint: 'Situação operacional' },
    { label: 'Atualizado', value: formatDateTime(service.value.updatedAt), hint: 'Última alteração' }
  ];
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function loadService() {
  loading.value = true;
  error.value = '';
  try {
    service.value = await servicesService.getById(serviceId.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar serviço';
  } finally {
    loading.value = false;
  }
}

onMounted(loadService);
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  gap: 16px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--color-text-secondary, #475569);
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}

.loading {
  color: var(--color-text-muted, #64748b);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}
</style>

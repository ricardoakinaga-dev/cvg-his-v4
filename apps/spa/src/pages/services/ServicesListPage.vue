<template>
  <div class="list-page">
    <AppPageHeader title="Serviços" subtitle="Catálogo de serviços cadastrados no sistema">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" @click="router.push('/services/new')">Novo Serviço</DsButton>
      </template>
    </AppPageHeader>

    <section class="list-page__overview">
      <DsCard title="Resumo do catálogo">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ services.length }}</span>
            <span class="overview-metric__label">Serviços carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeCount }}</span>
            <span class="overview-metric__label">Ativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ inactiveCount }}</span>
            <span class="overview-metric__label">Inativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ filteredCount }}</span>
            <span class="overview-metric__label">Resultados atuais</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="list-page__story">
      <DsCard title="Leitura rápida">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="search-bar">
      <DsInput v-model="searchQuery" label="" placeholder="Buscar por nome ou código..." @input="debouncedSearch" />
    </div>

    <DataTable
      :columns="columns"
      :rows="services"
      :loading="loading"
      empty-icon="🛠️"
      empty-title="Nenhum serviço encontrado"
      empty-description="Cadastre o primeiro serviço para começar."
      variant="hoverable"
    >
      <template #cell-name="{ row }">
        {{ (row as ServiceSummary).name }}
      </template>
      <template #cell-code="{ row }">
        {{ (row as ServiceSummary).code ?? '—' }}
      </template>
      <template #cell-basePrice="{ row }">
        {{ formatCurrency((row as ServiceSummary).basePrice) }}
      </template>
      <template #cell-active="{ row }">
        <span :class="['status-badge', (row as ServiceSummary).active ? 'status-badge--active' : 'status-badge--inactive']">
          {{ (row as ServiceSummary).active ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/services/${(row as ServiceSummary).id}`)">
            Ver
          </DsButton>
          <DsButton size="sm" variant="secondary" @click="router.push(`/services/${(row as ServiceSummary).id}/edit`)">
            Editar
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { computed } from 'vue';

const router = useRouter();
const services = ref<any[]>([]);
const loading = ref(false);
const error = ref('');
const searchQuery = ref('');

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'code', label: 'Código' },
  { key: 'basePrice', label: 'Preço Base' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const activeCount = computed(() => services.value.filter((service) => service.active).length);
const inactiveCount = computed(() => services.value.filter((service) => !service.active).length);
const filteredCount = computed(
  () =>
    services.value.filter((service) => {
      const q = searchQuery.value.toLowerCase();
      if (!q) return true;
      return service.name.toLowerCase().includes(q) || (service.code ?? '').toLowerCase().includes(q);
    }).length
);
const activeRate = computed(() => {
  if (!services.value.length) return '0%';
  return `${Math.round((activeCount.value / services.value.length) * 100)}%`;
});
const storyCards = computed(() => [
  { label: 'Ativos', value: activeCount.value.toString(), hint: 'Prontos para uso' },
  { label: 'Inativos', value: inactiveCount.value.toString(), hint: 'Fora da operação' },
  { label: 'Taxa ativa', value: activeRate.value, hint: 'Percentual operacional' },
  { label: 'Filtrados', value: filteredCount.value.toString(), hint: 'Resultados da busca' }
]);

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedSearch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => loadData(searchQuery.value), 300);
}

async function loadData(search?: string) {
  loading.value = true;
  error.value = '';
  try {
    services.value = await servicesService.list(search);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar serviços';
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-page__overview {
  margin-bottom: 4px;
}

.list-page__story {
  margin-bottom: 4px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.search-bar {
  max-width: 400px;
}

.row-actions {
  display: flex;
  gap: 8px;
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
</style>

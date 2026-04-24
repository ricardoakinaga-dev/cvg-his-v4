<template>
  <div class="list-page">
    <AppPageHeader
      title="Cadastro de Serviços"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Serviços']"
      subtitle="Catálogo mestre que conecta agenda, comanda, faturamento e parametrização fiscal.">
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
      <DsCard title="Leitura operacional Vetus">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="list-page__story">
      <div class="service-flow-grid">
        <article v-for="item in serviceFlow" :key="item.title" class="service-flow-card">
          <span>{{ item.eyebrow }}</span>
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
        </article>
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Pesquisa">
      <div class="legacy-filter-grid">
        <DsInput v-model="legacyFilters.id" label="Id" placeholder="Id" />
        <DsInput v-model="legacyFilters.description" label="Descrição" placeholder="Descrição" />
        <label class="active-filter">
          <input v-model="legacyFilters.activeOnly" type="checkbox" />
          <span>Serviços Ativos</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">
          Pesquisar
        </DsButton>
      </div>
    </DsCard>

    <section class="list-page__story">
      <div class="service-config-grid">
        <DsCard title="Tabela de Preço">
          <p>
            O serviço aceita preço base e pode receber valores por tabela comercial, preservando a
            diferença entre catálogo e venda.
          </p>
        </DsCard>
        <DsCard title="Tabela Fiscal">
          <p>
            A parametrização fiscal por empresa vincula serviço a NFS-e, CFOP e regras tributárias.
          </p>
        </DsCard>
      </div>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredServices"
      :loading="loading"
      empty-icon="🛠️"
      empty-title="Nenhum serviço encontrado"
      empty-description="Cadastre o primeiro serviço para começar."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as ServiceSummary).id }}</code>
      </template>
      <template #cell-name="{ row }">
        {{ (row as ServiceSummary).name }}
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
            Abrir
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { DataTableColumn } from '@/components/DataTable.vue';

const router = useRouter();
const services = ref<ServiceSummary[]>([]);
const loading = ref(false);
const error = ref('');
const legacyFilters = ref({
  id: '',
  description: '',
  activeOnly: false
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id' },
  { key: 'name', label: 'Descrição' },
  { key: 'basePrice', label: 'Valor' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col' }
];

const activeCount = computed(() => services.value.filter((service) => service.active).length);
const inactiveCount = computed(() => services.value.filter((service) => !service.active).length);
const filteredServices = computed(() => {
  const id = normalizeSearch(legacyFilters.value.id);
  const description = normalizeSearch(legacyFilters.value.description);

  return services.value.filter((service) => {
    const matchesId =
      !id || normalizeSearch(`${service.id} ${service.code ?? ''}`).includes(id);
    const matchesDescription =
      !description ||
      normalizeSearch(`${service.name} ${service.description ?? ''}`).includes(description);
    const matchesActive = !legacyFilters.value.activeOnly || service.active;
    return matchesId && matchesDescription && matchesActive;
  });
});
const filteredCount = computed(
  () =>
    filteredServices.value.length
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
const serviceFlow = [
  {
    eyebrow: 'Agenda',
    title: 'Agenda usa ativos agendáveis',
    description: 'A agenda consome o subconjunto ativo e elegível para marcação.'
  },
  {
    eyebrow: 'Comanda',
    title: 'Comanda cobra execução',
    description: 'Serviços executados entram na conta e impactam o fechamento.'
  },
  {
    eyebrow: 'Fiscal',
    title: 'Fiscal parametriza NFS-e',
    description: 'A tabela fiscal direciona tributação e relatórios de serviços prestados.'
  },
  {
    eyebrow: 'Governança',
    title: 'Importação mantém master data',
    description: 'O cadastro precisa ser controlado porque alimenta múltiplos módulos.'
  }
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
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

.story-card,
.service-flow-card {
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

.service-flow-grid,
.service-config-grid,
.legacy-filter-grid {
  display: grid;
  gap: 12px;
}

.service-flow-grid {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
}

.service-config-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.service-config-grid p,
.service-flow-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.service-flow-card span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.legacy-filter-grid {
  grid-template-columns: minmax(120px, 0.3fr) minmax(220px, 1fr) auto auto;
  align-items: end;
}

.active-filter {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.active-filter input {
  width: 18px;
  height: 18px;
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

code {
  word-break: break-all;
}

@media (max-width: 760px) {
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>

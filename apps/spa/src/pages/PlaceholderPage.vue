<template>
  <div class="operational-page">
    <AppPageHeader
      :title="title"
      :subtitle="subtitle"
      :breadcrumbs="breadcrumbs"
      :primary-action="primaryAction"
      :secondary-actions="secondaryActions"
    />

    <section class="operational-summary" aria-label="Resumo operacional">
      <article v-for="metric in metrics" :key="metric.label" class="summary-tile">
        <span class="summary-tile__label">{{ metric.label }}</span>
        <strong class="summary-tile__value">{{ metric.value }}</strong>
        <span class="summary-tile__hint">{{ metric.hint }}</span>
      </article>
    </section>

    <section class="operational-toolbar" aria-label="Filtros">
      <DsInput v-model="filters.search" type="search" label="Busca" :placeholder="searchPlaceholder" />
      <DsInput v-model="filters.period" type="select" label="Período">
        <option value="today">Hoje</option>
        <option value="week">Semana</option>
        <option value="month">Mês</option>
      </DsInput>
      <DsInput v-model="filters.status" type="select" label="Situação">
        <option value="all">Todos</option>
        <option value="open">Abertos</option>
        <option value="pending">Pendentes</option>
        <option value="done">Concluídos</option>
      </DsInput>
      <DsButton variant="secondary" type="button" @click="resetFilters">Limpar</DsButton>
    </section>

    <div class="operational-grid">
      <section class="operational-board" aria-label="Registros">
        <div class="section-heading">
          <div>
            <span class="section-heading__eyebrow">{{ sectionLabel }}</span>
            <h2>Registros de {{ title }}</h2>
          </div>
          <span class="section-heading__count">{{ filteredRows.length }} itens</span>
        </div>

        <DataTable
          :columns="columns"
          :rows="filteredRows"
          :caption="`Registros operacionais de ${title}`"
          compact
          variant="hoverable"
          row-key-field="id"
        >
          <template #cell-status="{ value }">
            <span class="status-pill" :class="`status-pill--${statusClass(String(value))}`">{{ value }}</span>
          </template>
          <template #cell-actions>
            <div class="table-actions">
              <DsButton size="sm" variant="secondary" type="button">Abrir</DsButton>
            </div>
          </template>
        </DataTable>
      </section>

      <aside class="operational-side" aria-label="Contexto">
        <section class="side-section">
          <h2>Fluxo Vetus</h2>
          <ol class="flow-list">
            <li v-for="step in flowSteps" :key="step">
              <span>{{ step }}</span>
            </li>
          </ol>
        </section>

        <section class="side-section">
          <h2>Mesma seção</h2>
          <nav class="related-links" aria-label="Itens relacionados">
            <RouterLink
              v-for="item in relatedItems"
              :key="item.path"
              class="related-link"
              :class="{ 'related-link--active': item.path === route.path }"
              :to="item.path"
            >
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </nav>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import AppPageHeader, { type PageAction } from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn, type DataTableRow } from '@/components/DataTable.vue';
import { findMatchingNavLocation } from '@/navigation';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const route = useRoute();

const navLocation = computed(() => findMatchingNavLocation(route.path));
const title = computed(() => navLocation.value?.item.label ?? (route.meta.title as string) ?? 'Operação');
const groupLabel = computed(() => navLocation.value?.group.label ?? (route.meta.breadcrumbParent as string) ?? 'ERP');
const sectionLabel = computed(() => navLocation.value?.section.label ?? (route.meta.breadcrumbParent as string) ?? 'Rotina');
const icon = computed(() => navLocation.value?.item.icon ?? (route.meta.icon as string) ?? '📋');

const breadcrumbs = computed(() => ['Início', groupLabel.value, sectionLabel.value, title.value]);
const subtitle = computed(() => `${groupLabel.value} / ${sectionLabel.value} organizado no padrão operacional do Vetus.`);
const searchPlaceholder = computed(() => `Buscar em ${title.value}`);

const filters = reactive({
  search: '',
  period: 'today',
  status: 'all'
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '120px' },
  { key: 'description', label: 'Descrição' },
  { key: 'owner', label: 'Responsável', width: '160px' },
  { key: 'status', label: 'Situação', width: '140px' },
  { key: 'updatedAt', label: 'Atualização', width: '140px' },
  { key: 'actions', label: 'Ações', width: '110px' }
];

const primaryAction = computed<PageAction>(() => ({
  key: 'new',
  label: primaryActionLabel.value,
  icon: icon.value
}));

const secondaryActions = computed<PageAction[]>(() => [
  { key: 'refresh', label: 'Atualizar', variant: 'secondary', icon: '🔄' },
  { key: 'export', label: 'Exportar', variant: 'secondary', icon: '📤' }
]);

const primaryActionLabel = computed(() => {
  if (sectionLabel.value.includes('Relatórios')) return 'Gerar';
  if (sectionLabel.value.includes('Configurações')) return 'Nova regra';
  if (sectionLabel.value === 'Cadastros') return 'Novo cadastro';
  return 'Novo registro';
});

const metrics = computed(() => [
  { label: 'Abertos', value: String(baseRows.value.filter((row) => row.status === 'Aberto').length), hint: 'fila atual' },
  { label: 'Pendentes', value: String(baseRows.value.filter((row) => row.status === 'Pendente').length), hint: 'exigem ação' },
  { label: 'Concluídos', value: String(baseRows.value.filter((row) => row.status === 'Concluído').length), hint: 'no período' },
  { label: 'Seção', value: String(relatedItems.value.length), hint: sectionLabel.value }
]);

const relatedItems = computed(() => navLocation.value?.section.items ?? []);

const baseRows = computed<DataTableRow[]>(() => {
  const prefix = route.path
    .replace(/^\//, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.slice(0, 3).toUpperCase())
    .join('-') || 'ERP';

  return [
    {
      id: `${prefix}-1`,
      code: `${prefix}-001`,
      description: `${title.value} aguardando conferência`,
      owner: ownerByGroup.value,
      status: 'Aberto',
      updatedAt: 'Hoje'
    },
    {
      id: `${prefix}-2`,
      code: `${prefix}-002`,
      description: `${title.value} com validação pendente`,
      owner: 'Recepção',
      status: 'Pendente',
      updatedAt: 'Ontem'
    },
    {
      id: `${prefix}-3`,
      code: `${prefix}-003`,
      description: `${title.value} finalizado no período`,
      owner: 'Gestão',
      status: 'Concluído',
      updatedAt: 'Semana'
    }
  ];
});

const ownerByGroup = computed(() => {
  const owners: Record<string, string> = {
    Atendimento: 'Atendimento',
    Laboratório: 'Laboratório',
    Estoque: 'Estoque',
    Financeiro: 'Financeiro',
    Marketing: 'Marketing',
    RH: 'RH',
    Relatórios: 'Gestão'
  };

  return owners[groupLabel.value] ?? 'Operação';
});

const flowSteps = computed(() => {
  const flows: Record<string, string[]> = {
    Atendimento: ['Selecionar cliente e animal', 'Abrir rotina', 'Registrar execução', 'Finalizar e faturar'],
    Laboratório: ['Receber solicitação', 'Processar amostra', 'Liberar laudo', 'Vincular ao atendimento'],
    Estoque: ['Localizar item', 'Conferir quantidade', 'Registrar movimento', 'Auditar divergências'],
    Financeiro: ['Conferir lançamento', 'Validar forma de pagamento', 'Baixar título', 'Auditar caixa'],
    Marketing: ['Selecionar público', 'Preparar mensagem', 'Enviar campanha', 'Acompanhar retorno'],
    RH: ['Selecionar colaborador', 'Aplicar regra', 'Validar aprovação', 'Registrar histórico'],
    Relatórios: ['Escolher período', 'Aplicar filtros', 'Gerar visão', 'Exportar resultado']
  };

  return flows[groupLabel.value] ?? ['Abrir rotina', 'Filtrar registros', 'Executar ação', 'Acompanhar resultado'];
});

const filteredRows = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const status = filters.status;

  return baseRows.value.filter((row) => {
    const matchesSearch =
      !search ||
      String(row.code).toLowerCase().includes(search) ||
      String(row.description).toLowerCase().includes(search) ||
      String(row.owner).toLowerCase().includes(search);
    const matchesStatus =
      status === 'all' ||
      (status === 'open' && row.status === 'Aberto') ||
      (status === 'pending' && row.status === 'Pendente') ||
      (status === 'done' && row.status === 'Concluído');

    return matchesSearch && matchesStatus;
  });
});

function resetFilters() {
  filters.search = '';
  filters.period = 'today';
  filters.status = 'all';
}

function statusClass(status: string) {
  if (status === 'Aberto') return 'open';
  if (status === 'Pendente') return 'pending';
  return 'done';
}
</script>

<style scoped>
.operational-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.operational-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-tile {
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.summary-tile__label,
.summary-tile__hint,
.section-heading__eyebrow,
.section-heading__count {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 600;
}

.summary-tile__value {
  display: block;
  margin: 8px 0 2px;
  color: var(--color-text, #0f172a);
  font-size: 24px;
  line-height: 1;
}

.operational-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(150px, 180px) minmax(150px, 180px) auto;
  gap: 12px;
  align-items: end;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.operational-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

.operational-board,
.operational-side,
.side-section {
  min-width: 0;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.operational-board {
  padding: 16px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.section-heading h2,
.side-section h2 {
  margin: 4px 0 0;
  color: var(--color-text, #0f172a);
  font-size: 16px;
  line-height: 1.25;
}

.operational-side {
  display: flex;
  flex-direction: column;
}

.side-section {
  border-width: 0 0 1px;
  border-radius: 0;
  padding: 14px;
}

.side-section:last-child {
  border-bottom: 0;
}

.flow-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.related-links {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.related-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.related-link:hover,
.related-link--active {
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-700, #1d4ed8);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 86px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill--open {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill--pending {
  background: #fef3c7;
  color: #92400e;
}

.status-pill--done {
  background: #dcfce7;
  color: #166534;
}

.table-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .operational-summary,
  .operational-grid,
  .operational-toolbar {
    grid-template-columns: 1fr;
  }
}
</style>

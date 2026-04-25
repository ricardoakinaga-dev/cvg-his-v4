<template>
  <div class="terms-page">
    <AppPageHeader
      title="Termos de Responsabilidade"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Termos de Responsabilidade']"
      subtitle="Cadastro documental usado em atendimento, internação, procedimentos e autorizações.">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/responsibility-terms/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.id" label="Id" placeholder="Id" />
        <DsInput v-model="filters.description" label="Descrição" placeholder="Descrição" />
        <DsInput v-model="filters.usageContext" type="select" label="Tipo de uso">
          <option value="">Todos</option>
          <option value="atendimento">Atendimento</option>
          <option value="internacao">Internação</option>
          <option value="procedimento">Procedimento</option>
          <option value="autorizacao">Autorização</option>
          <option value="outro">Outro</option>
        </DsInput>
        <label class="active-filter">
          <input v-model="filters.activeOnly" type="checkbox" />
          <span>Termos Ativos</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredTerms"
      :loading="loading"
      empty-icon="📄"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo termo."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as ResponsibilityTermSummary).id }}</code>
      </template>
      <template #cell-title="{ row }">
        {{ (row as ResponsibilityTermSummary).title }}
      </template>
      <template #cell-usageContext="{ row }">
        {{ responsibilityTermUsageLabel((row as ResponsibilityTermSummary).usageContext) }}
      </template>
      <template #cell-active="{ row }">
        {{ (row as ResponsibilityTermSummary).active ? 'Sim' : 'Não' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/responsibility-terms/${(row as ResponsibilityTermSummary).id}`)">
            Abrir
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
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import {
  responsibilityTermsService,
  responsibilityTermUsageLabel,
  type ResponsibilityTermSummary,
  type ResponsibilityTermUsageContext
} from '@/services/responsibilityTerms';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const terms = ref<ResponsibilityTermSummary[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref({
  id: '',
  description: '',
  usageContext: '' as ResponsibilityTermUsageContext | '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '220px' },
  { key: 'title', label: 'Descrição' },
  { key: 'usageContext', label: 'Tipo de uso', width: '160px' },
  { key: 'active', label: 'Termos Ativos', width: '150px' },
  { key: 'actions', label: 'Abrir', width: '120px', class: 'table__actions-col' }
];

const filteredTerms = computed(() => {
  const id = normalizeSearch(filters.value.id);
  const description = normalizeSearch(filters.value.description);

  return terms.value.filter((term) => {
    const matchesId = !id || normalizeSearch(`${term.id} ${term.code ?? ''}`).includes(id);
    const matchesDescription =
      !description || normalizeSearch(`${term.title} ${term.content}`).includes(description);
    return matchesId && matchesDescription;
  });
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    terms.value = await responsibilityTermsService.list({
      search: filters.value.description || undefined,
      active: filters.value.activeOnly ? true : undefined,
      usageContext: filters.value.usageContext || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar termos de responsabilidade';
  } finally {
    loading.value = false;
  }
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

onMounted(loadData);
</script>

<style scoped>
.terms-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legacy-filter-grid {
  display: grid;
  grid-template-columns: minmax(120px, 0.35fr) minmax(220px, 1fr) minmax(180px, 0.55fr) auto auto;
  align-items: end;
  gap: 12px;
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

code {
  word-break: break-all;
}

@media (max-width: 980px) {
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>

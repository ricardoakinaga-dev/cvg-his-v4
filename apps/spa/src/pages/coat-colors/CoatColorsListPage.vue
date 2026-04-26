<template>
  <div class="coat-colors-page">
    <AppPageHeader
      title="Cores/Pelagens"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Cores/Pelagens']"
      subtitle="Cadastro auxiliar usado na identificação visual dos animais e na conciliação de dados Vetus.">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/coat-colors/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.id" label="Id" placeholder="Id" />
        <DsInput v-model="filters.description" label="Descrição" placeholder="Cor, pelagem, grupo ou código" />
        <DsInput v-model="filters.colorGroup" label="Grupo" placeholder="Ex: Solida" />
        <label class="active-filter">
          <input v-model="filters.activeOnly" type="checkbox" />
          <span>Cores Ativas</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredCoatColors"
      :loading="loading"
      empty-icon="🎨"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua uma nova cor/pelagem."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as CoatColorSummary).id }}</code>
      </template>
      <template #cell-name="{ row }">
        <span class="coat-name">
          <span
            class="coat-swatch"
            :style="{ backgroundColor: (row as CoatColorSummary).hexColor ?? '#e2e8f0' }"
          />
          {{ (row as CoatColorSummary).name }}
        </span>
      </template>
      <template #cell-colorGroup="{ row }">
        {{ (row as CoatColorSummary).colorGroup ?? '—' }}
      </template>
      <template #cell-active="{ row }">
        {{ (row as CoatColorSummary).active ? 'Sim' : 'Não' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/coat-colors/${(row as CoatColorSummary).id}`)">
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
import { coatColorService, type CoatColorSummary } from '@/services/coatColors';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const coatColors = ref<CoatColorSummary[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref({
  id: '',
  description: '',
  colorGroup: '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '220px' },
  { key: 'name', label: 'Descrição' },
  { key: 'colorGroup', label: 'Grupo', width: '160px' },
  { key: 'active', label: 'Cores Ativas', width: '140px' },
  { key: 'actions', label: 'Abrir', width: '120px', class: 'table__actions-col' }
];

const filteredCoatColors = computed(() => {
  const id = normalizeSearch(filters.value.id);
  const description = normalizeSearch(filters.value.description);

  return coatColors.value.filter((item) => {
    const matchesId = !id || normalizeSearch(`${item.id} ${item.code ?? ''}`).includes(id);
    const matchesDescription =
      !description ||
      normalizeSearch(`${item.name} ${item.code ?? ''} ${item.colorGroup ?? ''} ${item.description ?? ''}`).includes(description);
    return matchesId && matchesDescription;
  });
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    coatColors.value = await coatColorService.list({
      search: filters.value.description || undefined,
      active: filters.value.activeOnly ? true : undefined,
      colorGroup: filters.value.colorGroup || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cores/pelagens';
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
.coat-colors-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legacy-filter-grid {
  display: grid;
  grid-template-columns: minmax(120px, 0.35fr) minmax(220px, 1fr) minmax(160px, 0.5fr) auto auto;
  align-items: end;
  gap: 12px;
}

.active-filter,
.coat-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.active-filter {
  min-height: 40px;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
}

.active-filter input {
  width: 18px;
  height: 18px;
}

.coat-swatch {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: 4px;
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

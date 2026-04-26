<template>
  <div class="species-page">
    <AppPageHeader
      title="Espécies"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Espécies']"
      subtitle="Cadastro auxiliar usado no fluxo de Animais, Raças e filtros clínicos.">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/species/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.id" label="Id" placeholder="Id" />
        <DsInput v-model="filters.description" label="Descrição" placeholder="Espécie, código ou observação" />
        <DsInput v-model="filters.systemCode" type="select" label="Código operacional">
          <option value="">Todos</option>
          <option v-for="option in animalSpeciesSystemOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </DsInput>
        <label class="active-filter">
          <input v-model="filters.activeOnly" type="checkbox" />
          <span>Espécies Ativas</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredSpecies"
      :loading="loading"
      empty-icon="🦴"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua uma nova espécie."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as AnimalSpeciesSummary).id }}</code>
      </template>
      <template #cell-name="{ row }">
        {{ (row as AnimalSpeciesSummary).name }}
      </template>
      <template #cell-systemCode="{ row }">
        {{ animalSpeciesSystemLabel((row as AnimalSpeciesSummary).systemCode) }}
      </template>
      <template #cell-active="{ row }">
        {{ (row as AnimalSpeciesSummary).active ? 'Sim' : 'Não' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/species/${(row as AnimalSpeciesSummary).id}`)">
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
  animalSpeciesService,
  animalSpeciesSystemLabel,
  animalSpeciesSystemOptions,
  type AnimalSpeciesSummary,
  type AnimalSpeciesSystemCode
} from '@/services/species';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const species = ref<AnimalSpeciesSummary[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref({
  id: '',
  description: '',
  systemCode: '' as AnimalSpeciesSystemCode | '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '220px' },
  { key: 'name', label: 'Descrição' },
  { key: 'systemCode', label: 'Código operacional', width: '180px' },
  { key: 'active', label: 'Espécies Ativas', width: '160px' },
  { key: 'actions', label: 'Abrir', width: '120px', class: 'table__actions-col' }
];

const filteredSpecies = computed(() => {
  const id = normalizeSearch(filters.value.id);
  const description = normalizeSearch(filters.value.description);

  return species.value.filter((item) => {
    const matchesId = !id || normalizeSearch(`${item.id} ${item.code ?? ''}`).includes(id);
    const matchesDescription =
      !description ||
      normalizeSearch(`${item.name} ${item.code ?? ''} ${item.systemCode} ${item.description ?? ''}`).includes(description);
    return matchesId && matchesDescription;
  });
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    species.value = await animalSpeciesService.list({
      search: filters.value.description || undefined,
      active: filters.value.activeOnly ? true : undefined,
      systemCode: filters.value.systemCode || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar espécies';
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
.species-page {
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
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
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

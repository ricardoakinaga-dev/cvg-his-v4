<template>
  <div class="breeds-page">
    <AppPageHeader
      title="Raças"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Raças']"
      subtitle="Cadastro auxiliar usado no fluxo de Animais e na importação de dados Vetus.">
      <template #actions>
        <DsButton variant="primary" @click="router.push('/breeds/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.id" label="Id" placeholder="Id" />
        <DsInput v-model="filters.description" label="Descrição" placeholder="Raça, código ou observação" />
        <DsInput v-model="filters.species" type="select" label="Espécie">
          <option value="">Todas</option>
          <option v-for="option in breedSpeciesOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </DsInput>
        <label class="active-filter">
          <input v-model="filters.activeOnly" type="checkbox" />
          <span>Raças Ativas</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredBreeds"
      :loading="loading"
      empty-icon="🧬"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua uma nova raça."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <code>{{ (row as BreedSummary).id }}</code>
      </template>
      <template #cell-name="{ row }">
        {{ (row as BreedSummary).name }}
      </template>
      <template #cell-species="{ row }">
        {{ breedSpeciesLabel((row as BreedSummary).species) }}
      </template>
      <template #cell-active="{ row }">
        {{ (row as BreedSummary).active ? 'Sim' : 'Não' }}
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/breeds/${(row as BreedSummary).id}`)">
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
  breedSpeciesLabel,
  breedSpeciesOptions,
  breedsService,
  type BreedSpecies,
  type BreedSummary
} from '@/services/breeds';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const breeds = ref<BreedSummary[]>([]);
const loading = ref(false);
const error = ref('');
const filters = ref({
  id: '',
  description: '',
  species: '' as BreedSpecies | '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id', width: '220px' },
  { key: 'name', label: 'Descrição' },
  { key: 'species', label: 'Espécie', width: '150px' },
  { key: 'active', label: 'Raças Ativas', width: '140px' },
  { key: 'actions', label: 'Abrir', width: '120px', class: 'table__actions-col' }
];

const filteredBreeds = computed(() => {
  const id = normalizeSearch(filters.value.id);
  const description = normalizeSearch(filters.value.description);

  return breeds.value.filter((breed) => {
    const matchesId = !id || normalizeSearch(`${breed.id} ${breed.code ?? ''}`).includes(id);
    const matchesDescription =
      !description ||
      normalizeSearch(`${breed.name} ${breed.code ?? ''} ${breed.description ?? ''}`).includes(description);
    return matchesId && matchesDescription;
  });
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    breeds.value = await breedsService.list({
      search: filters.value.description || undefined,
      active: filters.value.activeOnly ? true : undefined,
      species: filters.value.species || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar raças';
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
.breeds-page {
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

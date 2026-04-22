<template>
  <div class="fiscal-ncm-page">
    <AppPageHeader title="IBPT / NCM" :breadcrumbs="['Estoque', 'Configurações Fiscais', 'IBPT / NCM']" subtitle="Base de NCMs operacionais e alíquota de IPI usada no catálogo">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Base de consulta read-only usada pelo backend fiscal. Publicação de cadastro NCM e vínculo
      transacional com produtos ainda não fazem parte desta superfície.
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${entries.length} NCM(s)`" value="" icon="🏷️" />
      <DsStatCard :label="highestIpiRate" value="" icon="📊" />
    </section>

    <div class="search-bar">
      <DsInput
        v-model="search"
        type="search"
        placeholder="Buscar por NCM, categoria ou origem..."
        @keyup.enter="load"
      />
      <DsButton variant="secondary" @click="load">Buscar</DsButton>
      <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
    </div>

    <DataTable
      :columns="columns"
      :rows="entries"
      :loading="loading"
      empty-icon="🏷️"
      empty-title="Nenhum NCM encontrado"
      empty-description="Refine a busca ou revise a base fiscal já publicada pelo backend."
      variant="hoverable"
    >
      <template #cell-ipiRate="{ row }">
        {{ formatRate((row as FiscalNcmEntry).ipiRate) }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { fiscalService, type FiscalNcmEntry } from '@/services/fiscal';

const entries = ref<FiscalNcmEntry[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'ncm', label: 'NCM' },
  { key: 'category', label: 'Categoria' },
  { key: 'source', label: 'Origem' },
  { key: 'ipiRate', label: 'IPI' },
  { key: 'notes', label: 'Observações' }
];

const highestIpiRate = computed(() => {
  if (entries.value.length === 0) return '0,00% IPI';
  return `${Math.max(...entries.value.map((item) => item.ipiRate)).toFixed(2)}% IPI`;
});
const search = ref('');

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    entries.value = await fiscalService.listNcmEntries({
      search: search.value
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar NCM';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  search.value = '';
  void load();
}

onMounted(load);
</script>

<style scoped>
.fiscal-ncm-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.search-bar {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto auto;
  gap: 12px;
  align-items: end;
}
</style>

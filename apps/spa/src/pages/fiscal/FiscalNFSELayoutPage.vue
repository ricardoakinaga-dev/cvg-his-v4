<template>
  <div class="fiscal-nfse-page">
    <AppPageHeader
      title="NFS-e"
      subtitle="Consulta de layouts e readiness municipal de NFS-e publicados no backend"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Esta página publica apenas a malha read-only de layouts NFS-e. Emissão, cancelamento e
      transmissão fiscal continuam fora da superfície disponível.
    </DsAlert>

    <section class="filter-bar">
      <DsInput v-model="state" type="select" label="UF">
        <option value="">Todas</option>
        <option v-for="option in stateOptions" :key="option" :value="option">{{ option }}</option>
      </DsInput>
      <DsInput v-model="activeFilter" type="select" label="Status">
        <option value="">Todos</option>
        <option value="true">Ativos</option>
        <option value="false">Homologação / pausados</option>
      </DsInput>
      <div class="filter-actions">
        <DsButton variant="secondary" @click="load">Aplicar filtros</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <section class="hub-kpis">
      <DsStatCard :label="`${nfseLayouts.length} município(s)`" value="" icon="🏙️" />
      <DsStatCard :label="`${activeLayouts} layout(s) ativos`" value="" icon="📄" />
    </section>

    <DataTable
      :columns="columns"
      :rows="nfseLayouts"
      :loading="loading"
      empty-icon="📄"
      empty-title="Nenhum layout de NFS-e encontrado"
      empty-description="A API fiscal ainda não retornou layouts de NFS-e para consulta."
      variant="hoverable"
    >
      <template #cell-status="{ row }">
        <DsBadge :variant="(row as FiscalNfseLayoutSummary).active ? 'success' : 'warning'" size="sm">
          {{ (row as FiscalNfseLayoutSummary).active ? 'Ativo' : 'Em homologação' }}
        </DsBadge>
      </template>
      <template #cell-environment="{ row }">
        {{ formatEnvironment((row as FiscalNfseLayoutSummary).environment) }}
      </template>
      <template #cell-serviceFocus="{ row }">
        {{ (row as FiscalNfseLayoutSummary).serviceFocus }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  fiscalService,
  type FiscalNfseLayoutSummary
} from '@/services/fiscal';

const nfseLayouts = ref<FiscalNfseLayoutSummary[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'city', label: 'Município' },
  { key: 'state', label: 'UF' },
  { key: 'municipalityCode', label: 'Código IBGE' },
  { key: 'provider', label: 'Prestador' },
  { key: 'version', label: 'Versão' },
  { key: 'status', label: 'Status' },
  { key: 'environment', label: 'Ambiente' },
  { key: 'serviceCode', label: 'Serviço' },
  { key: 'serviceFocus', label: 'Foco Operacional' }
];

const activeLayouts = computed(() => nfseLayouts.value.filter((item) => item.active).length);
const stateOptions = ['SP', 'RS', 'PR', 'RJ'];
const state = ref('');
const activeFilter = ref<'true' | 'false' | ''>('');

function formatEnvironment(value: FiscalNfseLayoutSummary['environment']): string {
  return value === 'producao' ? 'Produção' : 'Homologação';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    nfseLayouts.value = await fiscalService.listNfseLayouts({
      state: state.value || undefined,
      active: activeFilter.value === '' ? undefined : activeFilter.value === 'true'
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar layouts';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  state.value = '';
  activeFilter.value = '';
  void load();
}

onMounted(load);
</script>

<style scoped>
.fiscal-nfse-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>

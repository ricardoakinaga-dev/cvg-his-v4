<template>
  <div class="fiscal-cfop-page">
    <AppPageHeader title="CFOP" subtitle="Tabela operacional de entradas, saídas, devoluções e serviços">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Consulta read-only da tabela fiscal publicada pelo backend. Esta tela não expõe cadastro nem
      manutenção de CFOP porque o fluxo transacional ainda não existe.
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${rows.length} CFOP(s)`" value="" icon="🔢" />
      <DsStatCard :label="`${serviceCount} voltado(s) a serviço`" value="" icon="🩺" />
    </section>

    <div class="search-bar">
      <DsInput v-model="search" type="search" placeholder="Buscar por código, descrição ou categoria..." @keyup.enter="load" />
      <DsInput v-model="section" type="select" label="Fluxo">
        <option value="">Todos</option>
        <option value="entrada">Entrada</option>
        <option value="saida">Saída</option>
      </DsInput>
      <DsInput v-model="documentType" type="select" label="Documento">
        <option value="">Todos</option>
        <option value="nfe">NFe</option>
        <option value="nfce">NFCe</option>
        <option value="nfse">NFSe</option>
        <option value="cte">CTe</option>
      </DsInput>
      <DsButton variant="secondary" @click="load">Buscar</DsButton>
      <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
    </div>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      empty-icon="🔢"
      empty-title="Nenhum CFOP encontrado"
      empty-description="Refine a busca ou revise a base fiscal."
      variant="hoverable"
    >
      <template #cell-section="{ row }">
        {{ (row as FiscalCfopRow).section === 'entrada' ? 'Entrada' : 'Saída' }}
      </template>
      <template #cell-icmsRelevant="{ row }">
        {{ (row as FiscalCfopRow).icmsRelevant ? 'Sim' : 'Não' }}
      </template>
      <template #cell-documentTypesLabel="{ row }">
        {{ (row as FiscalCfopRow).documentTypesLabel }}
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
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { fiscalService, type FiscalCfopRow } from '@/services/fiscal';

const rows = ref<FiscalCfopRow[]>([]);
const loading = ref(false);
const error = ref('');
const search = ref('');

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descrição' },
  { key: 'section', label: 'Fluxo' },
  { key: 'category', label: 'Categoria' },
  { key: 'documentTypesLabel', label: 'Documentos' },
  { key: 'icmsRelevant', label: 'ICMS' }
];

const serviceCount = computed(() => rows.value.filter((item) => item.category === 'servico').length);
const section = ref<FiscalCfopRow['section'] | ''>('');
const documentType = ref<FiscalCfopRow['applicableTo'][number] | ''>('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await fiscalService.listCfop({
      search: search.value,
      section: section.value || undefined,
      documentType: documentType.value || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar CFOP';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  search.value = '';
  section.value = '';
  documentType.value = '';
  void load();
}

onMounted(load);
</script>

<style scoped>
.fiscal-cfop-page {
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}
</style>

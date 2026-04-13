<template>
  <div class="laboratory-report-types-page">
    <AppPageHeader
      title="Tipos de Laudo"
      subtitle="Modelos e templates de laudos laboratoriais"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${reportTypes.length} tipo(s)`" value="" icon="📄" />
      <DsStatCard :label="`${activeCount} template(s) ativos`" value="" icon="✅" />
    </section>

    <DataTable
      :columns="columns"
      :rows="reportTypes"
      :loading="loading"
      empty-icon="📄"
      empty-title="Nenhum tipo de laudo cadastrado"
      empty-description="Cadastre o primeiro tipo de laudo para começar."
      variant="hoverable"
    >
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
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  laboratoryService,
  type LaboratoryReportTypeSummary
} from '@/services/laboratory';

const reportTypes = ref<LaboratoryReportTypeSummary[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'code', label: 'Código' },
  { key: 'category', label: 'Categoria' },
  { key: 'description', label: 'Descrição' }
];

const activeCount = computed(() => reportTypes.value.filter((item) => item.active).length);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    reportTypes.value = await laboratoryService.listReportTypes();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tipos de laudo';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-report-types-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
</style>

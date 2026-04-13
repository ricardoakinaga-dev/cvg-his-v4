<template>
  <div class="laboratory-reference-values-page">
    <AppPageHeader
      title="Valores de Referência"
      subtitle="Tabela de valores de referência por tipo de exame"
    >
      <template #actions>
        <DsButton variant="primary" icon="➕">Novo Valor</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${referenceValues.length} parâmetro(s)`" value="" icon="📊" />
      <DsStatCard :label="`${examCoverage} exame(s) cobertos`" value="" icon="🧪" />
    </section>

    <div class="filter-bar">
      <DsInput v-model="filterExam" type="select" label="Exame">
        <option value="">Todos</option>
        <option value="HEM">Hemograma</option>
        <option value="BIO">Bioquímico</option>
        <option value="URIN">Urina</option>
      </DsInput>
    </div>

    <DataTable
      :columns="columns"
      :rows="filteredValues"
      :loading="loading"
      empty-icon="📈"
      empty-title="Nenhum valor de referência cadastrado"
      empty-description="Cadastre os valores de referência para começar."
      variant="hoverable"
    >
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  laboratoryService,
  type LaboratoryReferenceValueSummary
} from '@/services/laboratory';

const referenceValues = ref<LaboratoryReferenceValueSummary[]>([]);
const loading = ref(false);
const error = ref('');
const filterExam = ref('');

const columns: DataTableColumn[] = [
  { key: 'parameter', label: 'Parâmetro' },
  { key: 'examType', label: 'Exame' },
  { key: 'minValue', label: 'Valor Mínimo' },
  { key: 'maxValue', label: 'Valor Máximo' },
  { key: 'unit', label: 'Unidade' }
];

const filteredValues = computed(() =>
  referenceValues.value.filter(
    (item) => !filterExam.value || item.examType.toUpperCase() === filterExam.value.toUpperCase()
  )
);

const examCoverage = computed(() => new Set(referenceValues.value.map((item) => item.examType)).size);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    referenceValues.value = await laboratoryService.listReferenceValues();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar valores de referência';
  } finally {
    loading.value = false;
  }
}

watch(filterExam, async (value) => {
  referenceValues.value = await laboratoryService.listReferenceValues(value);
});

onMounted(load);
</script>

<style scoped>
.laboratory-reference-values-page {
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
  max-width: 400px;
}
</style>

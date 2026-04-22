<template>
  <div class="laboratory-equipment-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastrados', 'Equipamentos']"
      title="Equipamentos Laboratoriais"
      subtitle="Gestão de equipamentos e máquinas do laboratório"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis">
      <DsStatCard :label="`${equipment.length} equipamento(s)`" value="" icon="🔧" />
      <DsStatCard :label="`${maintenanceCount} em manutenção`" value="" icon="⚠️" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
    </section>

    <DataTable
      :columns="columns"
      :rows="equipment"
      :loading="loading"
      empty-icon="🔧"
      empty-title="Nenhum equipamento cadastrado"
      empty-description="Cadastre o primeiro equipamento para começar."
      variant="hoverable"
    >
      <template #cell-status="{ row }">
        <DsBadge :variant="(row as any).status === 'active' ? 'success' : 'warning'" size="sm">
          {{ (row as any).status === 'active' ? 'Ativo' : 'Manutenção' }}
        </DsBadge>
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
  laboratoryService,
  type LaboratoryEquipmentSummary
} from '@/services/laboratory';

const equipment = ref<LaboratoryEquipmentSummary[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Nome' },
  { key: 'type', label: 'Tipo' },
  { key: 'serialNumber', label: 'Número de Série' },
  { key: 'status', label: 'Status' }
];

const activeCount = computed(() => equipment.value.filter((item) => item.status === 'active').length);
const maintenanceCount = computed(() =>
  equipment.value.filter((item) => item.status === 'maintenance').length
);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    equipment.value = await laboratoryService.listEquipment();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipamentos';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-equipment-page {
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

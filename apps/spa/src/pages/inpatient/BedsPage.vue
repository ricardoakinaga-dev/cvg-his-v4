<template>
  <div class="beds-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Cadastros', 'Boxes de Internação']"
      title="Boxes de Internação"
      subtitle="Cadastro de boxes usado na admissão, mapa de leitos e controle de disponibilidade da internação.">
      <template #actions>
        <DsBadge variant="info" size="md">{{ beds.length }} boxes</DsBadge>
        <DsButton variant="ghost" tag="a" href="/sectors">Setores</DsButton>
        <DsButton variant="secondary" tag="a" href="/inpatient/board">Mapa de Leitos</DsButton>
        <DsButton variant="primary" @click="router.push('/beds/new')">Incluir</DsButton>
      </template>
    </AppPageHeader>

    <section class="overview-grid">
      <div class="overview-card">
        <span class="overview-card__value">{{ beds.length }}</span>
        <span class="overview-card__label">Total</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ availableCount }}</span>
        <span class="overview-card__label">Disponíveis</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ occupiedCount }}</span>
        <span class="overview-card__label">Ocupados</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ blockedCount }}</span>
        <span class="overview-card__label">Bloqueados</span>
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard>
      <div class="legacy-filter-grid">
        <DsInput v-model="filters.code" label="Código" placeholder="Código" />
        <DsInput v-model="filters.description" label="Descrição" placeholder="Descrição" />
        <label class="active-filter">
          <input v-model="filters.activeOnly" type="checkbox" />
          <span>Boxes Ativos</span>
        </label>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="beds"
      :loading="loading"
      empty-icon="🛏️"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo box de internação."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <strong>{{ (row as BedSummary).code }}</strong>
      </template>
      <template #cell-name="{ row }">
        {{ (row as BedSummary).name }}
      </template>
      <template #cell-sectorId="{ row }">
        {{ sectorLabel((row as BedSummary).sectorId) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel((row as BedSummary).status)"
          :variant="statusVariant((row as BedSummary).status)"
        />
      </template>
      <template #cell-active="{ row }">
        {{ (row as BedSummary).active ? 'Sim' : 'Não' }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton size="sm" variant="secondary" @click="router.push(`/beds/${(row as BedSummary).id}`)">
          Abrir
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable, { type DataTableColumn } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';

const router = useRouter();
const loading = ref(true);
const error = ref('');
const beds = ref<BedSummary[]>([]);
const sectors = ref<SectorSummary[]>([]);
const filters = ref({
  code: '',
  description: '',
  activeOnly: true
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '130px' },
  { key: 'name', label: 'Descrição' },
  { key: 'sectorId', label: 'Setor', width: '190px' },
  { key: 'status', label: 'Status', width: '140px' },
  { key: 'active', label: 'Boxes Ativos', width: '130px' },
  { key: 'actions', label: 'Abrir', width: '110px', class: 'table__actions-col' }
];

const availableCount = computed(() => beds.value.filter((bed) => bed.status === 'available').length);
const occupiedCount = computed(() => beds.value.filter((bed) => bed.status === 'occupied').length);
const blockedCount = computed(() => beds.value.filter((bed) => bed.status === 'blocked' || !bed.active).length);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [bedItems, sectorItems] = await Promise.all([
      inpatientService.listBeds({
        code: filters.value.code.trim() || undefined,
        description: filters.value.description.trim() || undefined,
        active: filters.value.activeOnly
      }),
      inpatientService.listSectors()
    ]);
    beds.value = bedItems;
    sectors.value = sectorItems;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar boxes de internação';
  } finally {
    loading.value = false;
  }
}

function sectorLabel(sectorId: string): string {
  const sector = sectors.value.find((item) => item.id === sectorId);
  return sector ? `${sector.code} - ${sector.name}` : sectorId;
}

function statusLabel(status: BedSummary['status']) {
  const map: Record<BedSummary['status'], string> = {
    available: 'Disponível',
    occupied: 'Ocupado',
    maintenance: 'Manutenção',
    blocked: 'Bloqueado'
  };
  return map[status];
}

function statusVariant(status: BedSummary['status']) {
  const map: Record<BedSummary['status'], 'info' | 'success' | 'warning' | 'danger'> = {
    available: 'success',
    occupied: 'warning',
    maintenance: 'danger',
    blocked: 'info'
  };
  return map[status];
}

onMounted(loadData);
</script>

<style scoped>
.beds-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
}

.overview-card__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.legacy-filter-grid {
  display: grid;
  grid-template-columns: minmax(150px, 0.35fr) minmax(260px, 1fr) auto auto;
  align-items: end;
  gap: 12px;
}

.active-filter {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  gap: 8px;
  color: var(--color-text, #0f172a);
  font-size: 14px;
  font-weight: 600;
}

.active-filter input {
  width: 18px;
  height: 18px;
}

@media (max-width: 860px) {
  .legacy-filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="beds-page">
    <AppPageHeader title="Leitos" subtitle="Gestão de leitos hospitalares por setor">
      <template #actions>
        <DsBadge variant="info" size="md">{{ beds.length }} leitos</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
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
        <span class="overview-card__value">{{ maintenanceCount }}</span>
        <span class="overview-card__label">Manutenção</span>
      </div>
    </section>

    <div class="workspace">
      <DsCard title="Novo leito" class="panel">
        <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
          {{ formError }}
        </DsAlert>
        <form class="form-grid" @submit.prevent="createBed">
          <DsInput v-model="form.sectorId" label="Setor ID" placeholder="ID do setor" required />
          <DsInput v-model="form.code" label="Código" placeholder="Ex.: B01" required />
          <DsInput v-model="form.name" label="Nome" placeholder="Ex.: Leito 01" required />
          <DsInput v-model="form.supportsSpecies" label="Espécie suportada" placeholder="Ex.: caninos, felinos" />
          <div class="actions-row">
            <DsButton :loading="saving" variant="primary">Criar leito</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Leitos cadastrados" class="panel">
        <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
          {{ error }}
        </DsAlert>
        <DataTable
          :columns="columns"
          :rows="beds"
          :loading="loading"
          empty-icon="🛏️"
          empty-title="Nenhum leito cadastrado"
          empty-description="Cadastre setores e leitos para liberar o mapa de ocupação."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge
              :label="statusLabel((row as BedSummary).status)"
              :variant="statusVariant((row as BedSummary).status)"
            />
          </template>
          <template #cell-active="{ row }">
            <StatusBadge
              :label="(row as BedSummary).active ? 'Ativo' : 'Inativo'"
              :variant="(row as BedSummary).active ? 'success' : 'neutral'"
            />
          </template>
        </DataTable>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary } from '@/types/inpatient';
import type { DataTableColumn } from '@/components/DataTable.vue';

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const formError = ref('');
const beds = ref<BedSummary[]>([]);

const form = reactive({
  sectorId: '',
  code: '',
  name: '',
  supportsSpecies: ''
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'sectorId', label: 'Setor' },
  { key: 'status', label: 'Status' },
  { key: 'supportsSpecies', label: 'Espécie' },
  { key: 'active', label: 'Ativo' }
];

const availableCount = computed(() => beds.value.filter((bed) => bed.status === 'available').length);
const occupiedCount = computed(() => beds.value.filter((bed) => bed.status === 'occupied').length);
const maintenanceCount = computed(() => beds.value.filter((bed) => bed.status === 'maintenance').length);

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

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    beds.value = await inpatientService.listBeds();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar leitos';
  } finally {
    loading.value = false;
  }
}

async function createBed() {
  saving.value = true;
  formError.value = '';
  try {
    await inpatientService.createBed({
      sectorId: form.sectorId.trim(),
      code: form.code.trim(),
      name: form.name.trim(),
      supportsSpecies: form.supportsSpecies.trim() || undefined
    });
    form.sectorId = '';
    form.code = '';
    form.name = '';
    form.supportsSpecies = '';
    await loadData();
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Falha ao criar leito';
  } finally {
    saving.value = false;
  }
}

function reload() {
  void loadData();
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
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
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

.workspace {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 960px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}
</style>

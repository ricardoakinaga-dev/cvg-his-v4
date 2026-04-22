<template>
  <div class="sectors-page">
    <AppPageHeader :breadcrumbs="['Atendimento', 'Internação', 'Setores']" title="Setores" subtitle="Atendimento > Internação > Setores. Organize a estrutura que sustenta leitos, ocupação e admissões.">
      <template #actions>
        <DsBadge variant="info" size="md">{{ sectors.length }} setores</DsBadge>
        <DsButton variant="ghost" tag="a" href="/beds">Leitos</DsButton>
        <DsButton variant="secondary" tag="a" href="/inpatient/board">Mapa de Leitos</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="overview-grid">
      <div class="overview-card">
        <span class="overview-card__value">{{ sectors.length }}</span>
        <span class="overview-card__label">Total</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ activeCount }}</span>
        <span class="overview-card__label">Ativos</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ inactiveCount }}</span>
        <span class="overview-card__label">Inativos</span>
      </div>
      <div class="overview-card">
        <span class="overview-card__value">{{ kindsCount }}</span>
        <span class="overview-card__label">Tipos</span>
      </div>
    </section>

    <div class="workspace">
      <DsCard title="Novo setor" class="panel">
        <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
          {{ formError }}
        </DsAlert>
        <form class="form-grid" @submit.prevent="createSector">
          <DsInput v-model="form.code" label="Código" placeholder="Ex.: UTI" required />
          <DsInput v-model="form.name" label="Nome" placeholder="Ex.: Unidade de Terapia Intensiva" required />
          <DsInput v-model="form.kind" type="select" label="Tipo">
            <option value="clinic">Clínica</option>
            <option value="surgery">Cirurgia</option>
            <option value="icu">UTI</option>
            <option value="isolation">Isolamento</option>
            <option value="observation">Observação</option>
            <option value="other">Outro</option>
          </DsInput>
          <div class="actions-row">
            <DsButton :loading="saving" variant="primary">Criar setor</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Setores cadastrados" class="panel">
        <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
          {{ error }}
        </DsAlert>
        <DataTable
          :columns="columns"
          :rows="sectors"
          :loading="loading"
          empty-icon="🏢"
          empty-title="Nenhum setor cadastrado"
          empty-description="Cadastre o primeiro setor para liberar mapa de leitos, admissões e gestão da internação."
          variant="hoverable"
        >
          <template #cell-active="{ row }">
            <StatusBadge
              :label="(row as SectorSummary).active ? 'Ativo' : 'Inativo'"
              :variant="(row as SectorSummary).active ? 'success' : 'neutral'"
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
import type { SectorSummary } from '@/types/inpatient';
import type { DataTableColumn } from '@/components/DataTable.vue';

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const formError = ref('');
const sectors = ref<SectorSummary[]>([]);

const form = reactive({
  code: '',
  name: '',
  kind: 'clinic'
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  { key: 'kind', label: 'Tipo' },
  { key: 'active', label: 'Status' },
  { key: 'createdAt', label: 'Criado em' }
];

const activeCount = computed(() => sectors.value.filter((sector) => sector.active).length);
const inactiveCount = computed(() => sectors.value.filter((sector) => !sector.active).length);
const kindsCount = computed(() => new Set(sectors.value.map((sector) => sector.kind)).size);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    sectors.value = await inpatientService.listSectors();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar setores';
  } finally {
    loading.value = false;
  }
}

async function createSector() {
  saving.value = true;
  formError.value = '';
  try {
    await inpatientService.createSector({
      code: form.code.trim(),
      name: form.name.trim(),
      kind: form.kind
    });
    form.code = '';
    form.name = '';
    form.kind = 'clinic';
    await loadData();
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Falha ao criar setor';
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
.sectors-page {
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

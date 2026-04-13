<template>
  <div class="list-page">
    <AppPageHeader title="Equipe" subtitle="Profissionais, departamentos, cargos e capacidade operacional do quadro de RH">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" @click="router.push('/staff/new')">Novo Membro</DsButton>
      </template>
    </AppPageHeader>

    <section class="list-page__overview">
      <DsCard title="Resumo da equipe">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ staff.length }}</span>
            <span class="overview-metric__label">Membros cadastrados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeStaff }}</span>
            <span class="overview-metric__label">Ativos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ departmentsCount }}</span>
            <span class="overview-metric__label">Departamentos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ jobTitlesCount }}</span>
            <span class="overview-metric__label">Cargos distintos</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ emptyDepartmentCount }}</span>
            <span class="overview-metric__label">Sem departamento</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="list-page__story">
      <DsCard title="Leitura executiva">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>
    </section>

    <section class="list-page__actions">
      <DsCard title="Ações rápidas — RH" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/users" variant="primary">Usuários</DsButton>
          <DsButton tag="a" to="/access-control" variant="secondary">Governança de Acesso</DsButton>
          <DsButton tag="a" to="/audit" variant="secondary">Auditoria</DsButton>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="staffRows"
      :loading="loading"
      empty-icon="👨‍⚕️"
      empty-title="Nenhum membro encontrado"
      empty-description="Cadastre o primeiro membro da equipe."
      variant="hoverable"
    >
      <template #cell-fullName="{ row }">
        {{ staffRow(row).fullName }}
      </template>
      <template #cell-employeeCode="{ row }">
        {{ staffRow(row).employeeCode }}
      </template>
      <template #cell-department="{ row }">
        {{ staffRow(row).department || '—' }}
      </template>
      <template #cell-jobTitle="{ row }">
        {{ staffRow(row).jobTitle || '—' }}
      </template>
      <template #cell-status="{ row }">
        <span :class="['status-badge', staffRow(row).status === 'active' ? 'status-badge--active' : 'status-badge--inactive']">
          {{ staffRow(row).status === 'active' ? 'Ativo' : 'Inativo' }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" @click="router.push(`/staff/${staffRow(row).id}`)">
            Ver
          </DsButton>
          <DsButton size="sm" variant="secondary" @click="router.push(`/staff/${staffRow(row).id}/edit`)">
            Editar
          </DsButton>
        </div>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { staffService } from '@/services/staff';
import type { StaffSummary } from '@cvg-his-v2/shared-types';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const router = useRouter();
const staff = ref<StaffSummary[]>([]);
const loading = ref(false);
const error = ref('');

const columns: DataTableColumn[] = [
  { key: 'fullName', label: 'Nome' },
  { key: 'employeeCode', label: 'Código' },
  { key: 'department', label: 'Departamento' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const activeStaff = computed(() => staff.value.filter((member) => member.status === 'active').length);
const staffRows = computed(() => staff.value as unknown as DataTableRow[]);
const departmentsCount = computed(
  () => new Set(staff.value.map((member) => member.department).filter(Boolean)).size
);
const jobTitlesCount = computed(
  () => new Set(staff.value.map((member) => member.jobTitle).filter(Boolean)).size
);
const emptyDepartmentCount = computed(
  () => staff.value.filter((member) => !member.department || !member.department.trim()).length
);
const storyCards = computed(() => [
  {
    label: 'Ativos',
    value: activeStaff.value.toString(),
    hint: 'Membros disponíveis para operação'
  },
  {
    label: 'Departamentos',
    value: departmentsCount.value.toString(),
    hint: 'Áreas diferentes identificadas'
  },
  {
    label: 'Cargos',
    value: jobTitlesCount.value.toString(),
    hint: 'Distribuição funcional'
  },
  {
    label: 'Cobertura',
    value: staff.value.length ? `${Math.round((activeStaff.value / staff.value.length) * 100)}%` : '0%',
    hint: 'Percentual de membros ativos'
  }
]);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipe';
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);

function staffRow(row: unknown): StaffSummary {
  return row as StaffSummary;
}
</script>

<style scoped>
.list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-page__overview {
  margin-bottom: 4px;
}

.list-page__story {
  margin-bottom: 4px;
}

.list-page__actions {
  margin-bottom: 4px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.row-actions {
  display: flex;
  gap: 8px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge--active {
  background: var(--color-success-100, #dcfce7);
  color: var(--color-success-700, #15803d);
}

.status-badge--inactive {
  background: var(--color-neutral-100, #f1f5f9);
  color: var(--color-neutral-600, #475569);
}
</style>

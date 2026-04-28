<template>
  <div class="rh-page">
    <AppPageHeader
      title="Folgas"
      :breadcrumbs="['RH', 'Cadastros', 'Folgas']"
      subtitle="Leitura de cobertura da equipe para apoiar planejamento de indisponibilidades"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/appointments">Abrir agenda</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      O cadastro persistente de folgas ainda não está conectado nesta rota. A tela mostra a equipe ativa e os pontos
      de atenção para registrar ausência com segurança na agenda existente.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${activeStaff.length} profissional(is) ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${departmentsCount} departamento(s)`" value="" icon="🏢" />
      <DsStatCard :label="`${unlinkedCount} sem usuário vinculado`" value="" icon="⚠️" />
    </section>

    <DsCard title="Cobertura por profissional">
      <DataTable
        :columns="columns"
        :rows="staffRows"
        :loading="loading"
        empty-icon="🌴"
        empty-title="Nenhum profissional ativo"
        empty-description="Cadastre profissionais ativos antes de organizar folgas."
        variant="hoverable"
      >
        <template #cell-userLinked="{ row }">
          {{ timeOffRow(row).userLinked ? 'Usuário vinculado' : 'Sem usuário vinculado' }}
        </template>
        <template #cell-actions="{ row }">
          <DsButton size="sm" variant="secondary" tag="a" :to="`/staff/${timeOffRow(row).id}`">
            Ver profissional
          </DsButton>
        </template>
      </DataTable>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import { staffService } from '@/services/staff';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface TimeOffRow {
  id: string;
  fullName: string;
  department: string;
  jobTitle: string;
  userLinked: boolean;
}

const loading = ref(false);
const error = ref('');
const staff = ref<StaffSummary[]>([]);

const columns: DataTableColumn[] = [
  { key: 'fullName', label: 'Profissional' },
  { key: 'department', label: 'Departamento' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'userLinked', label: 'Vínculo de acesso' },
  { key: 'actions', label: 'Ações' }
];

const activeStaff = computed(() => staff.value.filter((member) => member.status === 'active'));
const departmentsCount = computed(
  () => new Set(activeStaff.value.map((member) => member.department).filter(Boolean)).size
);
const unlinkedCount = computed(() => activeStaff.value.filter((member) => !member.userId).length);
const staffRows = computed(() =>
  activeStaff.value.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    department: member.department || '—',
    jobTitle: member.jobTitle || '—',
    userLinked: Boolean(member.userId)
  })) as DataTableRow[]
);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cobertura de folgas';
  } finally {
    loading.value = false;
  }
}

function timeOffRow(row: DataTableRow): TimeOffRow {
  return row as unknown as TimeOffRow;
}

onMounted(loadData);
</script>

<style scoped>
.rh-page {
  display: grid;
  gap: 16px;
}

.rh-page__kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
</style>

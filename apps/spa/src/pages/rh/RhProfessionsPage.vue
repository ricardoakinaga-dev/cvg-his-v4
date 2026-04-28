<template>
  <div class="rh-page">
    <AppPageHeader
      title="Profissões"
      :breadcrumbs="['RH', 'Cadastros', 'Profissões']"
      subtitle="Leitura operacional das funções cadastradas a partir dos profissionais existentes"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/staff">Abrir profissionais</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Esta visão usa os cargos informados no cadastro de profissionais. Quando uma profissão não aparecer aqui,
      atualize o campo cargo no profissional correspondente.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${professionRows.length} profissão(ões)`" value="" icon="🪪" />
      <DsStatCard :label="`${activeProfessionalsCount} profissional(is) ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${uncategorizedCount} sem cargo`" value="" icon="⚠️" />
    </section>

    <DsCard title="Busca por profissão" variant="compact">
      <DsInput v-model="search" placeholder="Buscar por profissão, departamento ou profissional" />
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="🪪"
      empty-title="Nenhuma profissão encontrada"
      empty-description="Cadastre cargos nos profissionais para formar esta lista operacional."
      variant="hoverable"
    >
      <template #cell-profession="{ row }">
        <strong>{{ professionRow(row).profession }}</strong>
      </template>
      <template #cell-professionals="{ row }">
        {{ professionRow(row).professionals.join(', ') }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          size="sm"
          variant="secondary"
          tag="a"
          :to="`/staff?search=${encodeURIComponent(professionRow(row).profession)}`"
        >
          Ver equipe
        </DsButton>
      </template>
    </DataTable>
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
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface ProfessionRow {
  id: string;
  profession: string;
  departments: string;
  activeCount: number;
  inactiveCount: number;
  professionals: string[];
}

const loading = ref(false);
const error = ref('');
const search = ref('');
const staff = ref<StaffSummary[]>([]);

const columns: DataTableColumn[] = [
  { key: 'profession', label: 'Profissão' },
  { key: 'departments', label: 'Departamentos' },
  { key: 'activeCount', label: 'Ativos' },
  { key: 'inactiveCount', label: 'Inativos' },
  { key: 'professionals', label: 'Profissionais' },
  { key: 'actions', label: 'Ações' }
];

const professionRows = computed<ProfessionRow[]>(() => {
  const groups = new Map<string, StaffSummary[]>();

  for (const member of staff.value) {
    const profession = member.jobTitle?.trim();
    if (!profession) continue;
    groups.set(profession, [...(groups.get(profession) ?? []), member]);
  }

  return Array.from(groups.entries())
    .map(([profession, members]) => ({
      id: profession.toLowerCase().replace(/\s+/g, '-'),
      profession,
      departments: Array.from(new Set(members.map((member) => member.department).filter(Boolean))).join(', ') || '—',
      activeCount: members.filter((member) => member.status === 'active').length,
      inactiveCount: members.filter((member) => member.status !== 'active').length,
      professionals: members.map((member) => member.fullName).sort((left, right) => left.localeCompare(right))
    }))
    .sort((left, right) => left.profession.localeCompare(right.profession));
});

const filteredRows = computed(() => {
  const needle = search.value.trim().toLowerCase();
  const rows = professionRows.value;
  if (!needle) return rows as unknown as DataTableRow[];

  return rows.filter((row) =>
    [row.profession, row.departments, ...row.professionals].some((value) =>
      value.toLowerCase().includes(needle)
    )
  ) as unknown as DataTableRow[];
});

const activeProfessionalsCount = computed(() =>
  staff.value.filter((member) => member.status === 'active' && member.jobTitle?.trim()).length
);
const uncategorizedCount = computed(() => staff.value.filter((member) => !member.jobTitle?.trim()).length);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar profissões';
  } finally {
    loading.value = false;
  }
}

function professionRow(row: unknown): ProfessionRow {
  return row as ProfessionRow;
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

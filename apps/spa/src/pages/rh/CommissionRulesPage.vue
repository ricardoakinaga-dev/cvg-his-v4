<template>
  <div class="rh-page">
    <AppPageHeader
      title="Regras de Comissão"
      :breadcrumbs="['RH', 'Comissões', 'Regras de Comissão']"
      subtitle="Leitura das bases de comissão a partir dos cargos e departamentos cadastrados"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/staff">Abrir profissionais</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      A tela não cria regras automáticas. Ela expõe os agrupamentos reais de profissionais para orientar o
      cadastro seguro das regras de comissão quando o fluxo persistente estiver habilitado.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${ruleRows.length} base(s)`" value="" icon="📐" />
      <DsStatCard :label="`${coveredStaffCount} profissional(is) com cargo`" value="" icon="✅" />
      <DsStatCard :label="`${uncoveredStaffCount} sem regra sugerida`" value="" icon="⚠️" />
    </section>

    <DsCard title="Bases operacionais de comissão">
      <DataTable
        :columns="columns"
        :rows="ruleRows"
        :loading="loading"
        empty-icon="📐"
        empty-title="Nenhuma base de comissão encontrada"
        empty-description="Cadastre profissionais com cargo e departamento para formar as bases de regra."
        variant="hoverable"
      >
        <template #cell-rule="{ row }">
          <strong>{{ ruleRow(row).rule }}</strong>
        </template>
        <template #cell-staffNames="{ row }">
          {{ ruleRow(row).staffNames.join(', ') }}
        </template>
        <template #cell-actions="{ row }">
          <DsButton
            size="sm"
            variant="secondary"
            tag="a"
            :to="`/staff?search=${encodeURIComponent(ruleRow(row).rule)}`"
          >
            Ver equipe
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

interface CommissionRuleRow {
  id: string;
  rule: string;
  department: string;
  activeCount: number;
  staffNames: string[];
}

const loading = ref(false);
const error = ref('');
const staff = ref<StaffSummary[]>([]);

const columns: DataTableColumn[] = [
  { key: 'rule', label: 'Base da regra' },
  { key: 'department', label: 'Departamento' },
  { key: 'activeCount', label: 'Profissionais ativos' },
  { key: 'staffNames', label: 'Equipe vinculada' },
  { key: 'actions', label: 'Ações' }
];

const ruleRows = computed(() => {
  const groups = new Map<string, StaffSummary[]>();

  for (const member of staff.value) {
    const jobTitle = member.jobTitle?.trim();
    if (!jobTitle) continue;
    const department = member.department?.trim() || 'Sem departamento';
    const key = `${department}::${jobTitle}`;
    groups.set(key, [...(groups.get(key) ?? []), member]);
  }

  return Array.from(groups.entries())
    .map(([key, members]) => {
      const [department, rule] = key.split('::');
      return {
        id: key,
        rule,
        department,
        activeCount: members.filter((member) => member.status === 'active').length,
        staffNames: members.map((member) => member.fullName).sort((left, right) => left.localeCompare(right))
      } satisfies CommissionRuleRow;
    })
    .sort((left, right) => left.department.localeCompare(right.department) || left.rule.localeCompare(right.rule));
});

const coveredStaffCount = computed(() => staff.value.filter((member) => member.jobTitle?.trim()).length);
const uncoveredStaffCount = computed(() => staff.value.length - coveredStaffCount.value);

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    staff.value = await staffService.list();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar regras de comissão';
  } finally {
    loading.value = false;
  }
}

function ruleRow(row: DataTableRow): CommissionRuleRow {
  return row as unknown as CommissionRuleRow;
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

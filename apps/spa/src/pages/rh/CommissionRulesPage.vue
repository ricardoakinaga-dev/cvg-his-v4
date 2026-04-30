<template>
  <div class="rh-page">
    <AppPageHeader
      title="Cadastro de Regras de Comissão"
      :breadcrumbs="['RH', 'Cadastros', 'Regras de Comissão']"
      subtitle="Parâmetros normativos que alimentam o cálculo de comissões"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" disabled>Incluir</DsButton>
        <DsButton variant="secondary" tag="a" to="/staff">Abrir profissionais</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Comissoes/RegrasDeComissao.htm, registrada nas evidências
      modulos/com-02-regras.png e rh-regras-comissao-01.png. A tela não cria regras automáticas; ela prepara a
      conferência sobre os agrupamentos reais de profissionais enquanto o fluxo persistente não estiver habilitado.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Pesquisar regras">
      <div class="rh-page__filters">
        <DsInput id="commission-rule-id" v-model="filters.id" label="Id" placeholder="REG-001" />
        <DsInput
          id="commission-rule-description"
          v-model="filters.description"
          label="Descrição"
          placeholder="Descrição da regra"
        />
      </div>
      <div class="rh-page__actions">
        <DsButton variant="secondary" disabled>Incluir</DsButton>
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DsAlert v-if="searchSummary" variant="success">
      {{ searchSummary }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${filteredRuleRows.length} regra(s)`" value="" icon="📐" />
      <DsStatCard :label="`${coveredStaffCount} profissional(is) com cargo`" value="" icon="✅" />
      <DsStatCard :label="`${uncoveredStaffCount} sem regra sugerida`" value="" icon="⚠️" />
    </section>

    <DsCard title="Regras de comissão">
      <DataTable
        :columns="columns"
        :rows="filteredRuleRows"
        :loading="loading"
        empty-icon="📐"
        empty-title="Nenhuma regra encontrada"
        empty-description="Ajuste os filtros ou cadastre profissionais com cargo e departamento para formar bases de regra."
        variant="hoverable"
      >
        <template #cell-id="{ row }">
          <strong>{{ ruleRow(row).id }}</strong>
        </template>
        <template #cell-description="{ row }">
          {{ ruleRow(row).description }}
        </template>
        <template #cell-staffNames="{ row }">
          {{ ruleRow(row).staffNames.join(', ') }}
        </template>
        <template #cell-open>
          <DsButton size="sm" variant="secondary" disabled>Abrir</DsButton>
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
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface CommissionRuleRow {
  id: string;
  description: string;
  department: string;
  activeCount: number;
  staffNames: string[];
  open: string;
}

const loading = ref(false);
const error = ref('');
const staff = ref<StaffSummary[]>([]);
const searchSubmitted = ref(false);
const filters = ref({
  id: '',
  description: ''
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id' },
  { key: 'description', label: 'Descrição' },
  { key: 'department', label: 'Departamento' },
  { key: 'activeCount', label: 'Profissionais ativos' },
  { key: 'staffNames', label: 'Equipe vinculada' },
  { key: 'open', label: 'Abrir' }
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
    .map(([key, members], index) => {
      const [department, rule] = key.split('::');
      return {
        id: `REG-${String(index + 1).padStart(3, '0')}`,
        description: rule,
        department,
        activeCount: members.filter((member) => member.status === 'active').length,
        staffNames: members.map((member) => member.fullName).sort((left, right) => left.localeCompare(right)),
        open: 'Bloqueado'
      } satisfies CommissionRuleRow;
    })
    .sort((left, right) => left.department.localeCompare(right.department) || left.description.localeCompare(right.description));
});

const filteredRuleRows = computed(() => {
  const id = filters.value.id.trim().toLowerCase();
  const description = filters.value.description.trim().toLowerCase();
  return ruleRows.value.filter((row) => {
    const matchesId = !id || row.id.toLowerCase().includes(id);
    const matchesDescription = !description || row.description.toLowerCase().includes(description);
    return matchesId && matchesDescription;
  });
});
const coveredStaffCount = computed(() => staff.value.filter((member) => member.jobTitle?.trim()).length);
const uncoveredStaffCount = computed(() => staff.value.length - coveredStaffCount.value);
const searchSummary = computed(() => {
  if (!searchSubmitted.value) return '';
  const id = filters.value.id.trim() || 'qualquer Id';
  const description = filters.value.description.trim() || 'qualquer descrição';
  return `Pesquisa preparada para regras com Id ${id} e descrição ${description}.`;
});

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

function prepareSearch() {
  searchSubmitted.value = true;
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

.rh-page__filters {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(220px, 1fr);
  gap: 12px;
}

.rh-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 640px) {
  .rh-page__filters {
    grid-template-columns: 1fr;
  }

  .rh-page__actions {
    justify-content: stretch;
  }

  .rh-page__actions :deep(.ds-btn) {
    flex: 1 1 140px;
  }
}
</style>

<template>
  <div class="rh-page">
    <AppPageHeader
      title="Cadastro de Regras de Comissão"
      :breadcrumbs="['RH', 'Cadastros', 'Regras de Comissão']"
      subtitle="Parâmetros normativos que alimentam o cálculo de comissões"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" :loading="saving" @click="createRule">Incluir</DsButton>
        <DsButton variant="secondary" tag="a" to="/staff">Abrir profissionais</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Comissoes/RegrasDeComissao.htm, registrada nas evidências
      modulos/com-02-regras.png e rh-regras-comissao-01.png. A tela usa o contrato real de regras de comissão,
      com escopo, tipo de item, percentual e auditoria no backend.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
    </DsAlert>

    <DsCard title="Pesquisar e incluir regra">
      <div class="rh-page__filters">
        <DsInput id="commission-rule-id" v-model="filters.id" label="Id" placeholder="REG-001" />
        <DsInput
          id="commission-rule-description"
          v-model="filters.description"
          label="Descrição"
          placeholder="Descrição da regra"
        />
        <DsInput id="commission-rule-staff" v-model="form.staffId" type="select" label="Profissional">
          <option value="">Regra sem profissional específico</option>
          <option v-for="member in activeStaff" :key="member.id" :value="member.id">
            {{ member.fullName }}
          </option>
        </DsInput>
        <DsInput id="commission-rule-item-kind" v-model="form.itemKind" type="select" label="Tipo de item">
          <option value="any">Qualquer item</option>
          <option value="service">Serviço</option>
          <option value="product">Produto</option>
          <option value="procedure">Procedimento</option>
          <option value="exam">Exame</option>
          <option value="other">Outro</option>
        </DsInput>
        <DsInput
          id="commission-rule-percentage"
          v-model.number="form.percentage"
          type="number"
          label="Percentual"
          min="0"
          max="100"
          step="0.01"
        />
      </div>
      <div class="rh-page__actions">
        <DsButton variant="secondary" :loading="saving" @click="createRule">Incluir</DsButton>
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
    </DsCard>

    <DsAlert v-if="searchSummary" variant="success">
      {{ searchSummary }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard :label="`${filteredRuleRows.length} regra(s)`" value="" icon="📐" />
      <DsStatCard :label="`${activeRuleCount} ativa(s)`" value="" icon="✅" />
      <DsStatCard :label="`${staffScopedRuleCount} por profissional`" value="" icon="👥" />
    </section>

    <DsCard title="Regras de comissão">
      <DataTable
        :columns="columns"
        :rows="filteredRuleRows"
        :loading="loading"
        empty-icon="📐"
        empty-title="Nenhuma regra encontrada"
        empty-description="Use Incluir para cadastrar a primeira regra real de comissão."
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
        <template #cell-percentage="{ row }">
          {{ ruleRow(row).percentage.toFixed(2) }}%
        </template>
        <template #cell-open>
          <DsButton size="sm" variant="secondary" disabled>Auditado</DsButton>
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
import {
  commissionService,
  type CommissionItemKind,
  type CommissionRuleScope,
  type CommissionRuleSummary
} from '@/services/commissions';
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
  scope: string;
  itemKind: string;
  percentage: number;
  active: string;
  activeCount: number;
  staffNames: string[];
  open: string;
}

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const staff = ref<StaffSummary[]>([]);
const rules = ref<CommissionRuleSummary[]>([]);
const searchSubmitted = ref(false);
const filters = ref({
  id: '',
  description: ''
});
const form = ref({
  staffId: '',
  itemKind: 'any' as CommissionItemKind | 'any',
  percentage: 10
});

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Id' },
  { key: 'description', label: 'Descrição' },
  { key: 'scope', label: 'Escopo' },
  { key: 'department', label: 'Departamento' },
  { key: 'itemKind', label: 'Tipo' },
  { key: 'percentage', label: 'Percentual' },
  { key: 'staffNames', label: 'Equipe vinculada' },
  { key: 'active', label: 'Status' },
  { key: 'open', label: 'Ação' }
];

const activeStaff = computed(() => staff.value.filter((member) => member.status === 'active'));
const staffById = computed(() => new Map<string, StaffSummary>(staff.value.map((member) => [member.id, member])));
const activeRuleCount = computed(() => rules.value.filter((rule) => rule.isActive).length);
const staffScopedRuleCount = computed(() => rules.value.filter((rule) => rule.scope === 'staff').length);
const selectedStaff = computed(() => form.value.staffId ? staffById.value.get(form.value.staffId) : null);
const ruleRows = computed(() =>
  rules.value.map((rule) => {
    const linkedStaff = rule.staffId ? staffById.value.get(rule.staffId) : null;
    const staffNames = linkedStaff ? [linkedStaff.fullName] : staffForRule(rule).map((member) => member.fullName);
    return {
      id: rule.id,
      description: rule.description,
      scope: scopeLabel(rule.scope),
      department: rule.department ?? linkedStaff?.department ?? 'Todos',
      itemKind: itemKindLabel(rule.itemKind),
      percentage: rule.percentage,
      active: rule.isActive ? 'Ativa' : 'Inativa',
      activeCount: staffNames.length,
      staffNames: staffNames.length > 0 ? staffNames.sort((left, right) => left.localeCompare(right)) : ['Todos elegíveis'],
      open: 'Auditado'
    } satisfies CommissionRuleRow;
  })
);

const filteredRuleRows = computed(() => {
  const id = filters.value.id.trim().toLowerCase();
  const description = filters.value.description.trim().toLowerCase();
  return ruleRows.value.filter((row) => {
    const matchesId = !id || row.id.toLowerCase().includes(id);
    const matchesDescription = !description || row.description.toLowerCase().includes(description);
    return matchesId && matchesDescription;
  });
});
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
    const [staffResponse, ruleResponse] = await Promise.all([
      staffService.list(),
      commissionService.listRules()
    ]);
    staff.value = staffResponse;
    rules.value = ruleResponse;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar regras de comissão';
  } finally {
    loading.value = false;
  }
}

function prepareSearch() {
  searchSubmitted.value = true;
}

async function createRule() {
  saving.value = true;
  error.value = '';
  success.value = '';
  try {
    const staffMember = selectedStaff.value;
    const description = filters.value.description.trim() || staffMember?.jobTitle || 'Regra geral de comissão';
    const scope = ruleScopeFor(staffMember);
    const created = await commissionService.createRule({
      description,
      scope,
      staffId: scope === 'staff' ? staffMember?.id ?? null : null,
      department: scope === 'department' ? staffMember?.department ?? null : null,
      jobTitle: scope === 'job_title' ? staffMember?.jobTitle ?? null : null,
      itemKind: form.value.itemKind,
      percentage: Number(form.value.percentage),
      isActive: true
    });
    rules.value = [created, ...rules.value];
    success.value = `Regra ${created.description} criada com ${created.percentage.toFixed(2)}%.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao criar regra de comissão';
  } finally {
    saving.value = false;
  }
}

function ruleRow(row: DataTableRow): CommissionRuleRow {
  return row as unknown as CommissionRuleRow;
}

function ruleScopeFor(staffMember: StaffSummary | null | undefined): CommissionRuleScope {
  if (staffMember?.id) return 'staff';
  return 'global';
}

function staffForRule(rule: CommissionRuleSummary): StaffSummary[] {
  if (rule.scope === 'department' && rule.department) {
    return activeStaff.value.filter((member) => member.department === rule.department);
  }
  if (rule.scope === 'job_title' && rule.jobTitle) {
    return activeStaff.value.filter((member) => member.jobTitle === rule.jobTitle);
  }
  if (rule.scope === 'global') return activeStaff.value;
  return [];
}

function scopeLabel(scope: CommissionRuleScope): string {
  return {
    global: 'Global',
    department: 'Departamento',
    job_title: 'Cargo',
    staff: 'Profissional'
  }[scope];
}

function itemKindLabel(kind: CommissionItemKind | 'any'): string {
  return {
    any: 'Qualquer',
    service: 'Serviço',
    product: 'Produto',
    procedure: 'Procedimento',
    exam: 'Exame',
    other: 'Outro'
  }[kind];
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
  grid-template-columns: minmax(140px, 180px) minmax(220px, 1fr) minmax(220px, 1fr) minmax(160px, 190px) minmax(120px, 160px);
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

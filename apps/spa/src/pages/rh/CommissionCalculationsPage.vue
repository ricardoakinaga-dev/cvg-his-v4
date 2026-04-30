<template>
  <div class="rh-page">
    <AppPageHeader
      title="Cálculo de Comissões"
      :breadcrumbs="['RH', 'Comissões', 'Cálculo de Comissões']"
      subtitle="Prévia operacional de produção e bases de repasse sem gerar fechamento automático"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/commission-rules">Ver regras</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Comissoes/CalculoDeComissoes.htm. Nenhum cálculo é fechado nesta
      tela; a leitura consolida dados disponíveis do hub administrativo e da equipe para apoiar conferência antes de
      um fechamento formal.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsCard title="Pesquisa de cálculo">
      <div class="rh-page__filters">
        <DsInput
          id="commission-professional"
          v-model="selectedProfessionalId"
          type="select"
          label="Profissional"
        >
          <option value="">Todos os profissionais ativos</option>
          <option v-for="member in activeStaff" :key="member.id" :value="member.id">
            {{ member.fullName }}
          </option>
        </DsInput>

        <DsInput
          id="commission-calculation-date"
          v-model="calculationDate"
          type="date"
          label="Data do Cálculo"
        />
      </div>
      <div class="rh-page__actions">
        <DsButton variant="secondary" disabled>Incluir</DsButton>
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
      <p class="rh-page__hint">
        Sem contrato auditável de fechamento, pagamento ou liquidação de comissão. A ação Incluir fica bloqueada.
      </p>
    </DsCard>

    <DsAlert v-if="searchSummary" variant="success">
      {{ searchSummary }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard label="Receita comercial" :value="formatCurrency(report?.executive.commercialRevenue ?? 0)" icon="📈" />
      <DsStatCard label="Ticket médio" :value="formatCurrency(report?.domains.commercial.counterSales.avgTicket ?? 0)" icon="🧾" />
      <DsStatCard :label="`${activeStaffCount} profissional(is) ativo(s)`" value="" icon="👥" />
    </section>

    <DsCard title="Registros de cálculo">
      <DataTable
        :columns="calculationColumns"
        :rows="calculationRows"
        :loading="loading"
        empty-icon="🧮"
        empty-title="Nenhuma pesquisa preparada"
        empty-description="Use Profissional, Data do Cálculo e Pesquisar para montar a grade Vetus com Profissional, Data de Cálculo e Abrir."
        variant="hoverable"
      >
        <template #cell-open>
          <DsButton size="sm" variant="secondary" disabled>Abrir</DsButton>
        </template>
      </DataTable>
    </DsCard>

    <DsCard title="Produção por itens vendidos ou executados">
      <DataTable
        :columns="productionColumns"
        :rows="productionRows"
        :loading="loading"
        empty-icon="🧮"
        empty-title="Sem produção consolidada"
        empty-description="Produtos e serviços aparecem aqui quando houver vendas fechadas no período."
        variant="hoverable"
      >
        <template #cell-revenue="{ row }">
          {{ formatCurrency(productionRow(row).revenue) }}
        </template>
      </DataTable>
    </DsCard>

    <DsCard title="Equipe elegível para conferência">
      <DataTable
        :columns="staffColumns"
        :rows="staffRows"
        :loading="loading"
        empty-icon="👥"
        empty-title="Nenhum profissional ativo encontrado"
        empty-description="Cadastre profissionais ativos para relacionar produção e comissão."
        variant="hoverable"
      />
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import {
  administrativeReportsService,
  type AdministrativeReportsResponse
} from '@/services/administrativeReports';
import { staffService } from '@/services/staff';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface ProductionRow {
  id: string;
  name: string;
  kind: string;
  quantity: number;
  revenue: number;
}

interface CommissionCalculationRow {
  id: string;
  professional: string;
  calculationDate: string;
  base: string;
  status: string;
  open: string;
}

const loading = ref(false);
const error = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const staff = ref<StaffSummary[]>([]);
const selectedProfessionalId = ref('');
const calculationDate = ref(toDateInputValue(new Date()));
const searchSubmitted = ref(false);

const calculationColumns: DataTableColumn[] = [
  { key: 'professional', label: 'Profissional' },
  { key: 'calculationDate', label: 'Data de Cálculo' },
  { key: 'base', label: 'Base' },
  { key: 'status', label: 'Situação' },
  { key: 'open', label: 'Abrir' }
];
const productionColumns: DataTableColumn[] = [
  { key: 'name', label: 'Item' },
  { key: 'kind', label: 'Tipo' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'revenue', label: 'Receita' }
];
const staffColumns: DataTableColumn[] = [
  { key: 'fullName', label: 'Profissional' },
  { key: 'department', label: 'Departamento' },
  { key: 'jobTitle', label: 'Cargo' },
  { key: 'employeeCode', label: 'Código' }
];

const activeStaff = computed(() => staff.value.filter((member) => member.status === 'active'));
const activeStaffCount = computed(() => activeStaff.value.length);
const selectedStaff = computed(() =>
  selectedProfessionalId.value ? activeStaff.value.find((member) => member.id === selectedProfessionalId.value) : null
);
const searchedStaff = computed(() => {
  if (!searchSubmitted.value) return [];
  if (selectedStaff.value) return [selectedStaff.value];
  return activeStaff.value;
});
const staffRows = computed(() =>
  activeStaff.value
    .map((member) => ({
      id: member.id,
      fullName: member.fullName,
      department: member.department || '—',
      jobTitle: member.jobTitle || '—',
      employeeCode: member.employeeCode
    })) as DataTableRow[]
);
const productionRows = computed(() => {
  const dashboard = report.value?.domains.commercial.counterSales;
  if (!dashboard) return [];
  return [
    ...dashboard.topServices.map((item) => ({ ...item, id: `service-${item.name}`, kind: 'Serviço' })),
    ...dashboard.topProducts.map((item) => ({ ...item, id: `product-${item.name}`, kind: 'Produto' }))
  ] as DataTableRow[];
});
const calculationRows = computed(
  () =>
    searchedStaff.value.map((member) => ({
      id: `commission-${member.id}`,
      professional: member.fullName,
      calculationDate: formatDate(calculationDate.value),
      base: commissionBaseLabel.value,
      status: 'Preparação segura',
      open: 'Bloqueado'
    })) as DataTableRow[]
);
const commissionBaseLabel = computed(() => {
  if (productionRows.value.length === 0) return 'Sem produção consolidada';
  return 'Base produtiva sem vínculo individualizado';
});
const searchSummary = computed(() => {
  if (!searchSubmitted.value) return '';
  const scope = selectedStaff.value?.fullName ?? 'todos os profissionais ativos';
  return `Pesquisa preparada para ${scope} em ${formatDate(
    calculationDate.value
  )}. Sem contrato auditável de fechamento.`;
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [reportResponse, staffResponse] = await Promise.all([
      administrativeReportsService.getHubs(),
      staffService.list()
    ]);
    report.value = reportResponse;
    staff.value = staffResponse;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cálculo de comissões';
  } finally {
    loading.value = false;
  }
}

function prepareSearch() {
  searchSubmitted.value = true;
}

function productionRow(row: DataTableRow): ProductionRow {
  return row as unknown as ProductionRow;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return 'data não informada';
  return `${day}/${month}/${year}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
  grid-template-columns: minmax(220px, 1fr) minmax(180px, 240px);
  gap: 12px;
}

.rh-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.rh-page__hint {
  margin: 12px 0 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
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

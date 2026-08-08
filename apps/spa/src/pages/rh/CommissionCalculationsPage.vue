<template>
  <div class="rh-page">
    <AppPageHeader
      title="Cálculo de Comissões"
      :breadcrumbs="['RH', 'Comissões', 'Cálculo de Comissões']"
      subtitle="Fechamento auditável de produção, revisão e pagamento de comissões"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadData">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/commission-rules">Ver regras</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície Vetus-like para a rota legada Comissoes/CalculoDeComissoes.htm. O cálculo agora usa o contrato real
      de comissões, gera fechamento em rascunho e permite revisão, pagamento ou cancelamento com auditoria.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="success" variant="success" dismissible @dismiss="success = ''">
      {{ success }}
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
        <DsButton variant="secondary" :loading="saving" @click="createCalculation">Incluir</DsButton>
        <DsButton :loading="loading" @click="prepareSearch">Pesquisar</DsButton>
      </div>
      <DsInput
        id="commission-payment-method"
        v-model="commissionPaymentMethod"
        type="select"
        label="Forma de pagamento da comissão"
      >
        <option value="cash">Dinheiro</option>
        <option value="bank_transfer">Transferência bancária</option>
        <option value="pix">PIX</option>
        <option value="card">Cartão</option>
        <option value="cheque">Cheque</option>
        <option value="other">Outro</option>
      </DsInput>
      <p class="rh-page__hint">
        A inclusão cria um fechamento em rascunho usando as regras ativas e as linhas produtivas carregadas no período.
      </p>
    </DsCard>

    <DsAlert v-if="searchSummary" variant="success">
      {{ searchSummary }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard label="Receita comercial" :value="formatCurrency(report?.executive.commercialRevenue ?? 0)" icon="📈" />
      <DsStatCard label="Ticket médio" :value="formatCurrency(report?.domains.commercial.counterSales.avgTicket ?? 0)" icon="🧾" />
      <DsStatCard label="Comissão calculada" :value="formatCurrency(totalCommissionAmount)" icon="💳" />
    </section>

    <DsCard title="Registros de cálculo">
      <DataTable
        :columns="calculationColumns"
        :rows="calculationRows"
        :loading="loading"
        empty-icon="🧮"
        empty-title="Nenhum fechamento encontrado"
        empty-description="Use Profissional, Data do Cálculo e Incluir para gerar um fechamento em rascunho."
        variant="hoverable"
      >
        <template #cell-totalBaseAmount="{ row }">
          {{ formatCurrency(calculationRow(row).totalBaseAmount) }}
        </template>
        <template #cell-totalCommissionAmount="{ row }">
          {{ formatCurrency(calculationRow(row).totalCommissionAmount) }}
        </template>
        <template #cell-open="{ row }">
          <div class="rh-page__row-actions">
            <DsButton
              v-if="calculationRow(row).status === 'draft'"
              size="sm"
              variant="secondary"
              :loading="actionLoadingKey === `${calculationRow(row).id}:review`"
              @click="reviewCalculation(calculationRow(row).id)"
            >
              Revisar
            </DsButton>
            <DsButton
              v-if="calculationRow(row).status === 'reviewed'"
              size="sm"
              variant="secondary"
              :loading="actionLoadingKey === `${calculationRow(row).id}:pay`"
              @click="payCalculation(calculationRow(row).id)"
            >
              Pagar
            </DsButton>
            <DsButton
              v-if="calculationRow(row).status !== 'paid' && calculationRow(row).status !== 'cancelled'"
              size="sm"
              variant="secondary"
              :loading="actionLoadingKey === `${calculationRow(row).id}:cancel`"
              @click="cancelCalculation(calculationRow(row).id)"
            >
              Cancelar
            </DsButton>
          </div>
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
import {
  commissionService,
  type CommissionCalculationDetail,
  type CommissionItemKind,
  type CommissionPaymentMethod,
  type CommissionSourceLinePayload
} from '@/services/commissions';
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
  number: string;
  calculationDate: string;
  period: string;
  status: string;
  totalBaseAmount: number;
  totalCommissionAmount: number;
  open: string;
}

const loading = ref(false);
const saving = ref(false);
const actionLoadingKey = ref('');
const error = ref('');
const success = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const staff = ref<StaffSummary[]>([]);
const calculations = ref<CommissionCalculationDetail[]>([]);
const selectedProfessionalId = ref('');
const calculationDate = ref(toDateInputValue(new Date()));
const searchSubmitted = ref(false);
const commissionPaymentMethod = ref<CommissionPaymentMethod>('cash');

const calculationColumns: DataTableColumn[] = [
  { key: 'number', label: 'Número' },
  { key: 'calculationDate', label: 'Data de Cálculo' },
  { key: 'period', label: 'Período' },
  { key: 'totalBaseAmount', label: 'Base' },
  { key: 'totalCommissionAmount', label: 'Comissão' },
  { key: 'status', label: 'Situação' },
  { key: 'open', label: 'Ação' }
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
const calculationRows = computed(() =>
  calculations.value
    .filter((calculation) => !searchSubmitted.value || calculation.periodStart <= calculationDate.value)
    .map((calculation) => ({
      id: calculation.id,
      number: calculation.number,
      calculationDate: formatDate(calculation.createdAt.slice(0, 10)),
      period: `${formatDate(calculation.periodStart)} a ${formatDate(calculation.periodEnd)}`,
      status: statusLabel(calculation.status),
      rawStatus: calculation.status,
      totalBaseAmount: calculation.totalBaseAmount,
      totalCommissionAmount: calculation.totalCommissionAmount,
      open: 'Ações'
    })) as DataTableRow[]
);
const totalCommissionAmount = computed(() =>
  calculations.value.reduce((total, calculation) => total + calculation.totalCommissionAmount, 0)
);
const searchSummary = computed(() => {
  if (!searchSubmitted.value) return '';
  const scope = selectedStaff.value?.fullName ?? 'todos os profissionais ativos';
  return `Pesquisa preparada para ${scope} em ${formatDate(
    calculationDate.value
  )}. Use Incluir para gerar fechamento auditável.`;
});

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [reportResponse, staffResponse, calculationResponse] = await Promise.all([
      administrativeReportsService.getHubs(),
      staffService.list(),
      commissionService.listCalculations()
    ]);
    report.value = reportResponse;
    staff.value = staffResponse;
    calculations.value = calculationResponse;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar cálculo de comissões';
  } finally {
    loading.value = false;
  }
}

function prepareSearch() {
  searchSubmitted.value = true;
}

async function createCalculation() {
  saving.value = true;
  error.value = '';
  success.value = '';
  try {
    const lines = buildCommissionLines();
    const calculation = await commissionService.calculate({
      periodStart: calculationDate.value,
      periodEnd: calculationDate.value,
      lines,
      notes: `Fechamento gerado pela tela de comissões para ${selectedStaff.value?.fullName ?? 'todos os profissionais'}`
    });
    upsertCalculation(calculation);
    searchSubmitted.value = true;
    success.value = `Fechamento ${calculation.number} criado com comissão de ${formatCurrency(calculation.totalCommissionAmount)}.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao incluir cálculo de comissões';
  } finally {
    saving.value = false;
  }
}

async function reviewCalculation(calculationId: string) {
  await runCalculationAction(calculationId, 'review', () => commissionService.review(calculationId), 'revisado');
}

async function payCalculation(calculationId: string) {
  await runCalculationAction(
    calculationId,
    'pay',
    () => commissionService.pay(calculationId, {
      paymentMethod: commissionPaymentMethod.value,
      paymentReference: `COM-${calculationId}`
    }),
    'pago'
  );
}

async function cancelCalculation(calculationId: string) {
  await runCalculationAction(calculationId, 'cancel', () => commissionService.cancel(calculationId), 'cancelado');
}

async function runCalculationAction(
  calculationId: string,
  action: string,
  callback: () => Promise<CommissionCalculationDetail>,
  label: string
) {
  actionLoadingKey.value = `${calculationId}:${action}`;
  error.value = '';
  success.value = '';
  try {
    const updated = await callback();
    upsertCalculation(updated);
    success.value = `Fechamento ${updated.number} ${label}.`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao atualizar cálculo de comissões';
  } finally {
    actionLoadingKey.value = '';
  }
}

function buildCommissionLines(): CommissionSourceLinePayload[] {
  const members = searchedStaff.value.length > 0 ? searchedStaff.value : activeStaff.value;
  if (members.length === 0) return [];
  const rows = productionRows.value.map(productionRow);
  return members.flatMap((member) =>
    rows.map((row) => ({
      staffId: member.id,
      staffName: member.fullName,
      department: member.department,
      jobTitle: member.jobTitle,
      itemKind: productionKind(row.kind),
      sourceType: 'manual',
      sourceId: `${row.id}-${member.id}-${calculationDate.value}`,
      sourceDescription: row.name,
      baseAmount: roundMoney(row.revenue / members.length),
      occurredAt: calculationDate.value
    }))
  );
}

function upsertCalculation(calculation: CommissionCalculationDetail) {
  calculations.value = [
    calculation,
    ...calculations.value.filter((item) => item.id !== calculation.id)
  ];
}

function productionRow(row: DataTableRow): ProductionRow {
  return row as unknown as ProductionRow;
}

function calculationRow(row: DataTableRow): CommissionCalculationRow & { status: CommissionCalculationDetail['status'] } {
  const value = row as unknown as CommissionCalculationRow & { rawStatus?: CommissionCalculationDetail['status'] };
  return {
    ...value,
    status: value.rawStatus ?? value.status as CommissionCalculationDetail['status']
  };
}

function productionKind(kind: string): CommissionItemKind {
  return kind === 'Produto' ? 'product' : 'service';
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
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

function statusLabel(status: CommissionCalculationDetail['status']): string {
  return {
    draft: 'Rascunho',
    reviewed: 'Revisado',
    paid: 'Pago',
    cancelled: 'Cancelado'
  }[status];
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

.rh-page__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

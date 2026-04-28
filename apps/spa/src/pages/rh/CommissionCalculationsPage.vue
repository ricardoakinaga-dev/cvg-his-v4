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
      Nenhum cálculo é fechado nesta tela. A leitura consolida dados disponíveis do hub administrativo e da equipe
      para apoiar conferência antes de um fechamento formal.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="rh-page__kpis">
      <DsStatCard label="Receita comercial" :value="formatCurrency(report?.executive.commercialRevenue ?? 0)" icon="📈" />
      <DsStatCard label="Ticket médio" :value="formatCurrency(report?.domains.commercial.counterSales.avgTicket ?? 0)" icon="🧾" />
      <DsStatCard :label="`${activeStaffCount} profissional(is) ativo(s)`" value="" icon="👥" />
    </section>

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
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface ProductionRow {
  id: string;
  name: string;
  kind: string;
  quantity: number;
  revenue: number;
}

const loading = ref(false);
const error = ref('');
const report = ref<AdministrativeReportsResponse | null>(null);
const staff = ref<StaffSummary[]>([]);

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

const activeStaffCount = computed(() => staff.value.filter((member) => member.status === 'active').length);
const staffRows = computed(() =>
  staff.value
    .filter((member) => member.status === 'active')
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

function productionRow(row: DataTableRow): ProductionRow {
  return row as unknown as ProductionRow;
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
</style>

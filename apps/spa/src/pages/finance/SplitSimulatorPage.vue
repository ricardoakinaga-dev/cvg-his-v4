<template>
  <div class="split-simulator-page">
    <AppPageHeader
      title="Simulador de Split"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Simulador de Split']"
      subtitle="Simulação de venda, taxas, recebedores e repasse líquido"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert variant="info">
      Simulação local para conferência operacional. Nenhuma captura, habilitação, repasse ou alteração de configuração é
      executada a partir desta tela.
    </DsAlert>

    <form class="split-simulator-form" aria-label="Campos do simulador de split" @submit.prevent>
      <DsInput id="split-simulator-amount" v-model="form.amount" label="Valor da Venda" type="number" min="0" step="0.01" />
      <DsInput id="split-simulator-installments" v-model="form.installments" label="Parcelas" type="number" min="1" step="1" />
      <DsInput id="split-simulator-mdr" v-model="form.mdrPercent" label="Taxa MDR" type="number" min="0" step="0.01" />
      <DsInput id="split-simulator-clinic-share" v-model="form.clinicPercent" label="Percentual CVG" type="number" min="0" step="0.01" />
      <DsInput id="split-simulator-platform-share" v-model="form.platformPercent" label="Percentual Plataforma" type="number" min="0" step="0.01" />
    </form>

    <section class="split-simulator-summary-grid" aria-label="Resultado da simulação de split">
      <DsStatCard :label="formatCurrency(grossAmount)" value="Valor Bruto" />
      <DsStatCard :label="formatCurrency(administratorFee)" value="Taxa Administradora" />
      <DsStatCard :label="formatCurrency(netAmount)" value="Líquido Simulado" />
      <DsStatCard :label="formatCurrency(clinicShareValue)" value="Repasse CVG" />
      <DsStatCard :label="formatCurrency(platformShareValue)" value="Repasse Plataforma" />
      <DsStatCard :label="`${installments} parcela(s)`" value="Parcelas" />
    </section>

    <section class="split-simulator-actions" aria-label="Ações do simulador de split">
      <DsButton variant="primary" type="button" @click="normalizeForm">Simular Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
      <DsButton variant="ghost" disabled>Exportar Simulação</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="distributionRows"
      empty-icon="🧮"
      empty-title="Nenhum recebedor para simular"
      empty-description="Informe percentuais positivos para calcular o split."
      caption="Distribuição simulada do split"
      variant="hoverable"
    >
      <template #cell-receiver="{ row }">
        <strong>{{ distributionRow(row).receiver }}</strong>
        <small>{{ distributionRow(row).description }}</small>
      </template>
      <template #cell-percentage="{ row }">
        <strong>{{ formatPercent(distributionRow(row).percentage) }}</strong>
      </template>
      <template #cell-value="{ row }">
        <strong>{{ formatCurrency(distributionRow(row).value) }}</strong>
      </template>
      <template #cell-settlement="{ row }">
        <span>{{ distributionRow(row).settlement }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

interface DistributionRow {
  id: string;
  receiver: string;
  description: string;
  percentage: number;
  value: number;
  settlement: string;
}

const columns: DataTableColumn[] = [
  { key: 'receiver', label: 'Recebedor' },
  { key: 'percentage', label: 'Percentual' },
  { key: 'value', label: 'Valor' },
  { key: 'settlement', label: 'Repasse' }
];

const form = reactive({
  amount: '1000',
  installments: '1',
  mdrPercent: '3',
  clinicPercent: '85',
  platformPercent: '15'
});

const grossAmount = computed(() => Math.max(parseNumber(form.amount), 0));
const installments = computed(() => Math.max(Math.trunc(parseNumber(form.installments)), 1));
const mdrPercent = computed(() => Math.max(parseNumber(form.mdrPercent), 0));
const clinicPercent = computed(() => Math.max(parseNumber(form.clinicPercent), 0));
const platformPercent = computed(() => Math.max(parseNumber(form.platformPercent), 0));
const administratorFee = computed(() => roundCurrency(grossAmount.value * (mdrPercent.value / 100)));
const netAmount = computed(() => roundCurrency(Math.max(grossAmount.value - administratorFee.value, 0)));
const clinicShareValue = computed(() => roundCurrency(netAmount.value * (clinicPercent.value / 100)));
const platformShareValue = computed(() => roundCurrency(netAmount.value * (platformPercent.value / 100)));
const distributionRows = computed(() => {
  const rows: DistributionRow[] = [
    {
      id: 'clinic',
      receiver: 'Centro Veterinário Guarapiranga',
      description: 'Recebedor operacional da venda',
      percentage: clinicPercent.value,
      value: clinicShareValue.value,
      settlement: 'D+1 planejado'
    },
    {
      id: 'platform',
      receiver: 'CVG Pagamentos',
      description: 'Taxa/plataforma simulada',
      percentage: platformPercent.value,
      value: platformShareValue.value,
      settlement: 'Retenção administrativa'
    }
  ];
  return rows.filter((row) => row.percentage > 0) as unknown as DataTableRow[];
});
const headerSecondaryActions = computed(() => [
  {
    key: 'normalize-split-simulation',
    label: 'Simular Split',
    variant: 'secondary' as const,
    onClick: normalizeForm
  }
]);

function normalizeForm() {
  form.amount = String(grossAmount.value);
  form.installments = String(installments.value);
  form.mdrPercent = String(mdrPercent.value);
  form.clinicPercent = String(clinicPercent.value);
  form.platformPercent = String(platformPercent.value);
}

function distributionRow(row: DataTableRow): DistributionRow {
  return row as unknown as DistributionRow;
}

function parseNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value)}%`;
}
</script>

<style scoped>
.split-simulator-page {
  display: grid;
  gap: 16px;
}

.split-simulator-form {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.split-simulator-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.split-simulator-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

small {
  color: var(--color-text-muted, #64748b);
  display: block;
  margin-top: 2px;
}

@media (max-width: 1100px) {
  .split-simulator-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .split-simulator-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .split-simulator-form,
  .split-simulator-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>

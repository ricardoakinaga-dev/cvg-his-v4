<template>
  <div class="split-simulator-page">
    <AppPageHeader title="Simulador de Split"
      :breadcrumbs="['Financeiro', 'Maquininha de Cartão', 'Simulador de Split']"
      subtitle="Compare taxas e a distribuição de uma venda hipotética." />
    <p class="simulation-note">Exemplo editável · cálculo local, sem capturas ou repasses.</p>

    <form class="split-simulator-form" aria-label="Campos do simulador de split" @submit.prevent>
      <DsInput id="split-simulator-amount" v-model="form.amount" label="Valor da Venda" type="number" min="0" step="0.01" required />
      <DsInput id="split-simulator-installments" v-model="form.installments" label="Parcelas" type="number" min="1" step="1" required />
      <DsInput id="split-simulator-mdr" v-model="form.mdrPercent" label="Taxa MDR (%)" type="number" min="0" max="100" step="0.01" required />
      <DsInput id="split-simulator-clinic-share" v-model="form.clinicPercent" label="Percentual CVG (%)" type="number" min="0" max="100" step="0.01" required />
      <DsInput id="split-simulator-platform-share" v-model="form.platformPercent" label="Percentual Plataforma (%)" type="number" min="0" max="100" step="0.01" required />
      <div class="simulation-form-footer">
        <span class="simulation-note">Os resultados se atualizam ao editar.</span>
        <DsButton variant="ghost" type="button" @click="resetExample">Repor exemplo</DsButton>
      </div>
    </form>

    <DsAlert v-if="!simulation.ok" variant="warning">{{ simulation.error }}</DsAlert>
    <section class="simulation-result" aria-label="Resultado da simulação de split">
      <dl class="simulation-totals" :class="{ 'simulation-totals--large': simulation.ok && simulation.grossCents >= 100000000000 }">
        <div><dt>Valor bruto</dt><dd>{{ simulation.ok ? money(simulation.grossCents) : '—' }}</dd></div>
        <div><dt>Taxa administradora</dt><dd>{{ simulation.ok ? money(simulation.feeCents) : '—' }}</dd></div>
        <div class="simulation-net"><dt>Líquido simulado</dt><dd>{{ simulation.ok ? money(simulation.netCents) : '—' }}</dd></div>
      </dl>
      <p v-if="simulation.ok" class="simulation-note">{{ simulation.installments }} parcela(s) · distribuição sobre o líquido total.</p>
    </section>

    <DataTable v-if="simulation.ok" :columns="columns" :rows="distributionRows"
      caption="Distribuição hipotética do líquido" row-key-field="id" variant="hoverable">
      <template #cell-receiver="{ row }"><strong>{{ row.receiver }}</strong><small>{{ row.description }}</small></template>
      <template #cell-percentage="{ row }">{{ percent(Number(row.percentage)) }}</template>
      <template #cell-value="{ row }"><strong>{{ money(Number(row.cents)) }}</strong></template>
    </DataTable>
    <details class="simulation-assumptions">
      <summary>Como este cálculo funciona</summary>
      <p>Os percentuais são hipóteses editáveis, sem vínculo com recebedores cadastrados. Nenhuma data de liquidação é prevista.</p>
      <p>A taxa é arredondada para centavos antes da divisão. A parcela CVG é arredondada e o restante fica com a plataforma, preservando o líquido total. Essa convenção local pode diferir da usada pelo provedor.</p>
      <p>O número de parcelas é apenas uma referência. A simulação não calcula prazos, antecipação ou taxas diferentes por parcela.</p>
    </details>
    <nav class="split-simulator-actions" aria-label="Rotinas relacionadas">
      <DsButton variant="secondary" tag="a" to="/finance/split">Configuração do Split</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-machines">Maquininhas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/card-transactions">Transações de Cartão</DsButton>
    </nav>
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
import { calculateSplit, type SplitSimulationInput } from '@/utils/splitSimulation';
const example: SplitSimulationInput = { amount: '1000', installments: '1', mdrPercent: '3', clinicPercent: '85', platformPercent: '15' };
const form = reactive({ ...example });
const simulation = computed(() => calculateSplit(form));
const columns: DataTableColumn[] = [{ key: 'receiver', label: 'Destino hipotético' }, { key: 'percentage', label: 'Percentual' }, { key: 'value', label: 'Valor simulado' }];
const distributionRows = computed<DataTableRow[]>(() => {
  const value = simulation.value;
  if (!value.ok) return [];
  return [
    { id: 'clinic', receiver: 'CVG', description: 'Participação do hospital', percentage: value.clinicPercent, cents: value.clinicCents },
    { id: 'platform', receiver: 'Plataforma', description: 'Participação hipotética', percentage: value.platformPercent, cents: value.platformCents }
  ];
});
function resetExample() { Object.assign(form, example); }
function money(cents: number) {
  const exact = BigInt(cents);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).formatToParts(exact / 100n)
    .map(part => part.type === 'fraction' ? String(exact % 100n).padStart(2, '0') : part.value).join('');
}
function percent(value: number) { return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)}%`; }
</script>

<style scoped>
.split-simulator-page { display: grid; gap: 16px; min-width: 0; }
.simulation-note { color: var(--color-text-secondary); font-size: 13px; line-height: 1.5; margin: 0; }
.split-simulator-form { display: grid; align-items: end; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.simulation-form-footer { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.simulation-result { border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; background: var(--color-surface); }
.simulation-totals { display: flex; flex-wrap: wrap; gap: 20px; margin: 0 0 12px; }
.simulation-totals > div { flex: 1 1 180px; min-width: max-content; }
.simulation-totals dt { color: var(--color-text-secondary); font-size: 13px; }
.simulation-totals dd { margin: 6px 0 0; font-size: clamp(20px, 2vw, 28px); font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.simulation-totals--large dd { font-size: 20px; }
.simulation-net dd { color: var(--color-primary); }
.simulation-assumptions { padding: 0 16px 12px; border: 1px solid var(--color-border); border-radius: 12px; }
.simulation-assumptions summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-weight: 600; }
.simulation-assumptions summary::before { content: '▸'; margin-right: 8px; }
.simulation-assumptions[open] summary::before { content: '▾'; }
.simulation-assumptions p { font-size: 13px; line-height: 1.6; color: var(--color-text-secondary); }
.split-simulator-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.split-simulator-page small { display: block; font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.split-simulator-page :deep(input), .split-simulator-page :deep(button), .split-simulator-actions :deep(a) { min-height: 44px; }
.split-simulator-page :deep(.data-table) { min-width: 0; }
.split-simulator-page :deep(.data-table thead th) { white-space: normal; }
.split-simulator-page :deep(.data-table tbody td:nth-child(n+2)) { white-space: nowrap; font-variant-numeric: tabular-nums; }
@media (max-width: 1100px) { .split-simulator-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } .split-simulator-form > :first-child { grid-column: 1 / -1; } }
@media (max-width: 720px) {
  .simulation-totals { gap: 14px; }
  .simulation-totals > div { flex-basis: 140px; }
  .simulation-totals > .simulation-net { flex-basis: 100%; }
  .split-simulator-page :deep(.data-table thead th), .split-simulator-page :deep(.data-table tbody td) { padding-inline: 10px; }
}
</style>

<template>
  <details v-if="props.reportReady && props.cards.length" class="report-summary">
    <summary>Resumo da consulta</summary>
    <dl>
      <div v-for="card in props.cards" :key="card.label">
        <dt>{{ card.label }}</dt>
        <dd>{{ card.value }}</dd>
      </div>
    </dl>
  </details>
  <details v-if="props.reportNote" class="report-assumptions">
    <summary>Sobre este relatório</summary>
    <p>{{ props.reportNote }}</p>
  </details>
</template>

<script setup lang="ts">
import type { ReportCard } from './reportWorkbenchTypes';

const props = defineProps<{
  reportReady: boolean;
  cards: ReportCard[];
  reportNote: string;
}>();
</script>

<style scoped>
.report-summary,
.report-assumptions {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0 16px 12px;
}

.report-summary summary,
.report-assumptions summary {
  display: flex;
  align-items: center;
  min-height: 44px;
  font-weight: 600;
  cursor: pointer;
}

.report-summary summary::before,
.report-assumptions summary::before {
  content: '▸';
  margin-right: 8px;
}

.report-summary[open] > summary::before,
.report-assumptions[open] > summary::before {
  content: '▾';
}

.report-summary dl {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 10px 0;
}

.report-summary dl > div {
  flex: 1 1 180px;
}

.report-summary dt,
.report-assumptions p {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.report-summary dd {
  margin: 5px 0 0;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
</style>

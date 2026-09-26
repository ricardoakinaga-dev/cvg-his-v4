<template>
  <section class="counter-sales-kpis" aria-label="Indicadores das comandas">
    <DsStatCard :label="props.openSalesLabel" value="" icon="🟠" />
    <DsStatCard :label="props.closedSalesLabel" value="" icon="🟢" />
    <DsStatCard :label="props.openBalanceLabel" value="" icon="💰" />
    <DsStatCard :label="props.grossSalesLabel" value="" icon="📈" />
  </section>
</template>

<script setup lang="ts">
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

const props = defineProps<{
  openSalesLabel: string;
  closedSalesLabel: string;
  openBalanceLabel: string;
  grossSalesLabel: string;
}>();
</script>

<style scoped>
.counter-sales-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
</style>

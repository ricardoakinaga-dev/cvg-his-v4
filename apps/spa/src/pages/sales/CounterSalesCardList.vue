<template>
  <section class="counter-sales-list">
    <DsCard title="Comandas">
      <div v-if="props.loading" class="counter-sales-empty">Carregando comandas...</div>
      <EmptyState
        v-else-if="props.sales.length === 0"
        icon="🧾"
        title="Nenhuma comanda encontrada"
        description="Abra uma nova comanda ou ajuste os filtros para localizar eventos de balcão."
      />

      <div v-else class="counter-sales-cards">
        <CounterSalesCard
          v-for="sale in props.sales"
          :key="sale.id"
          :sale="sale"
          @select="emit('select', $event)"
        />
      </div>
    </DsCard>
  </section>
</template>

<script setup lang="ts">
import EmptyState from '@/components/EmptyState.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import CounterSalesCard, { type CounterSalesCardModel } from './CounterSalesCard.vue';

const props = defineProps<{
  sales: readonly CounterSalesCardModel[];
  loading: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();
</script>

<style scoped>
.counter-sales-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>

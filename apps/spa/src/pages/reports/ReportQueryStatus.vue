<template>
  <div class="report-query-status">
    <DsAlert v-if="props.error" variant="danger" dismissible @dismiss="emit('dismiss-error')">
      {{ props.error }}
    </DsAlert>

    <DsAlert v-if="props.success" variant="success" dismissible @dismiss="emit('dismiss-success')">
      {{ props.success }}
    </DsAlert>

    <p v-if="props.reportFiltersChanged" class="report-query-note" role="status">
      Filtros alterados. A tabela mostra a última execução server-side; aplique os filtros para
      atualizar e exportar exatamente o mesmo recorte.
    </p>
  </div>
</template>

<script setup lang="ts">
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';

const props = defineProps<{
  error: string;
  success: string;
  reportFiltersChanged: boolean;
}>();

const emit = defineEmits<{
  (event: 'dismiss-error'): void;
  (event: 'dismiss-success'): void;
}>();
</script>

<style scoped>
.report-query-status {
  display: grid;
  gap: 12px;
}

.report-query-note {
  margin: 0;
  padding: 12px 16px;
  border-left: 3px solid var(--color-primary);
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

</style>

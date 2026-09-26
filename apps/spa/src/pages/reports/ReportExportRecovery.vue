<template>
  <div v-if="props.exportPending" class="report-export-recovery" role="status" aria-live="polite">
    <strong>Exportação em reconciliação</strong>
    <span v-if="props.hasPendingExport">
      Verifique o artefato persistido antes de iniciar qualquer novo processamento.
    </span>
    <div class="report-filters__actions">
      <DsButton
        type="button"
        variant="secondary"
        :loading="props.exporting"
        :disabled="props.exporting"
        @click="emit('reconcile-export')"
      >
        Verificar exportação pendente
      </DsButton>
      <DsButton
        v-if="props.exportRetryAvailable"
        type="button"
        variant="ghost"
        :loading="props.exporting"
        :disabled="props.exporting"
        @click="emit('retry-export')"
      >
        Repetir com a mesma chave
      </DsButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const props = defineProps<{
  exportPending: boolean;
  hasPendingExport: boolean;
  exportRetryAvailable: boolean;
  exporting: boolean;
}>();

const emit = defineEmits<{
  (event: 'reconcile-export'): void;
  (event: 'retry-export'): void;
}>();
</script>

<style scoped>
.report-export-recovery {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid
    color-mix(in srgb, var(--color-warning, #b7791f) 45%, var(--color-border));
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-warning, #b7791f) 8%, var(--color-surface));
  color: var(--color-text);
}

.report-export-recovery span {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.report-filters__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

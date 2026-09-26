<template>
  <article class="vetus-accordion-card" :class="{ 'vetus-accordion-card--open': expanded }">
    <button
      id="patient-card-clinical-history-trigger"
      type="button"
      class="vetus-accordion-card__header"
      :aria-expanded="expanded"
      aria-controls="patient-card-clinical-history-panel"
      @click="emit('toggle')"
      @keydown="emit('header-keydown', $event)"
    >
      <span>
        <span class="vetus-module-icon" aria-hidden="true">
          <DsIcon name="clipboard" size="sm" />
        </span>
        Histórico Clinico
      </span>
      <span aria-hidden="true">
        <DsIcon :name="expanded ? 'minus' : 'plus'" size="sm" />
      </span>
    </button>
    <div class="vetus-accordion-card__summary">
      <strong>{{ draft.trim() ? 'Histórico preenchido' : 'Sem histórico consolidado' }}</strong>
      <p>{{ summary }}</p>
    </div>
    <div
      v-if="expanded"
      id="patient-card-clinical-history-panel"
      class="vetus-accordion-card__body"
      role="region"
      aria-labelledby="patient-card-clinical-history-trigger"
    >
      <p v-if="draft.trim()" class="clinical-history-preview">{{ draft }}</p>
      <label class="sr-only" for="patient-clinical-history-field">
        Histórico clínico longitudinal
      </label>
      <textarea
        id="patient-clinical-history-field"
        class="clinical-history-field"
        :value="draft"
        placeholder="Escreva aqui o histórico clínico do animal"
        :disabled="!canWrite"
        @input="handleDraftInput"
      />
      <p v-if="!encounterId" class="muted">
        Abra um atendimento para registrar o histórico clínico longitudinal.
      </p>
      <p v-else-if="!canWrite" class="muted">
        O atendimento está encerrado; o histórico clínico permanece disponível somente para leitura.
      </p>
      <div class="quick-actions">
        <DsButton
          variant="secondary"
          size="sm"
          :loading="saving"
          :disabled="!canWrite"
          @click="emit('save')"
        >
          Salvar Histórico Clínico
        </DsButton>
        <DsButton
          tag="a"
          :to="encounterId ? `/medical-records/${encounterId}` : '/medical-records'"
          variant="ghost"
          size="sm"
        >
          Abrir histórico completo
        </DsButton>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsIcon from '@cvg-his-v2/design-system/vue/DsIcon.vue';

defineProps<{
  draft: string;
  summary: string;
  expanded: boolean;
  canWrite: boolean;
  saving: boolean;
  encounterId: string | null;
}>();

const emit = defineEmits<{
  'update:draft': [value: string];
  toggle: [];
  'header-keydown': [event: KeyboardEvent];
  save: [];
}>();

function handleDraftInput(event: Event) {
  emit('update:draft', (event.target as HTMLTextAreaElement).value);
}
</script>

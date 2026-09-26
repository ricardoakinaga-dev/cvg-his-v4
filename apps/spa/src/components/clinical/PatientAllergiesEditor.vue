<template>
  <fieldset class="allergies-editor">
    <legend class="allergies-editor__legend">Alergias a medicamentos</legend>
    <p class="allergies-editor__hint">
      Usadas na prescrição para alertar por substância e por classe (por exemplo, penicilinas).
    </p>
    <div v-for="(allergy, index) in model" :key="index" class="allergies-editor__row">
      <DsInput
        :id="`allergy-substance-${index}`"
        :model-value="allergy.substance"
        label="Substância"
        placeholder="Ex.: penicilina"
        :maxlength="80"
        @update:model-value="update(index, { substance: String($event ?? '') })"
      />
      <DsInput
        :id="`allergy-class-${index}`"
        :model-value="allergy.drugClass ?? ''"
        type="select"
        label="Classe"
        @update:model-value="update(index, { drugClass: String($event ?? '') || undefined })"
      >
        <option value="">Identificar pela substância</option>
        <option v-for="(drugClass, key) in DRUG_CLASSES" :key="key" :value="key">{{ drugClass.label }}</option>
      </DsInput>
      <DsInput
        :id="`allergy-severity-${index}`"
        :model-value="allergy.severity"
        type="select"
        label="Gravidade"
        @update:model-value="update(index, { severity: $event as AllergySeverity })"
      >
        <option v-for="(label, key) in ALLERGY_SEVERITY_LABELS" :key="key" :value="key">{{ label }}</option>
      </DsInput>
      <DsInput
        :id="`allergy-reaction-${index}`"
        :model-value="allergy.reaction ?? ''"
        label="Reação"
        placeholder="Ex.: edema de face"
        :maxlength="200"
        @update:model-value="update(index, { reaction: String($event ?? '') || undefined })"
      />
      <DsButton
        type="button"
        variant="secondary"
        size="sm"
        class="allergies-editor__remove"
        :aria-label="`Remover alergia ${allergy.substance || index + 1}`"
        @click="remove(index)"
      >Remover</DsButton>
    </div>
    <DsButton type="button" variant="secondary" size="sm" :disabled="model.length >= 20" @click="add">
      Adicionar alergia
    </DsButton>
  </fieldset>
</template>

<script setup lang="ts">
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import {
  ALLERGY_SEVERITY_LABELS,
  DRUG_CLASSES,
  type AllergySeverity,
  type StructuredAllergy
} from '@cvg-his-v2/shared-contracts';

const model = defineModel<StructuredAllergy[]>({ required: true });

function update(index: number, patch: Partial<StructuredAllergy>) {
  model.value = model.value.map((allergy, current) =>
    current === index ? { ...allergy, ...patch } : allergy
  );
}

function add() {
  model.value = [...model.value, { substance: '', severity: 'moderate' }];
}

function remove(index: number) {
  model.value = model.value.filter((_, current) => current !== index);
}
</script>

<style scoped>
.allergies-editor {
  display: grid;
  gap: 10px;
  min-width: 0;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
}

.allergies-editor__legend {
  padding: 0 4px;
  font-weight: 700;
}

.allergies-editor__hint {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.allergies-editor__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: 8px;
  align-items: end;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--color-border, #e2e8f0);
}

.allergies-editor__remove {
  justify-self: start;
}
</style>

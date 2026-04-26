<template>
  <div class="laboratory-hemogram-reference-value-form-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Vlr. Ref. Hemograma', isEditing ? 'Editar' : 'Incluir']"
      :title="isEditing ? 'Editar Valor de Referência' : 'Incluir Valor de Referência'"
      subtitle="Parâmetros hematológicos usados para destacar resultados abaixo, dentro ou acima da faixa"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory/hemogram-reference-values">Voltar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="form-layout">
      <DsCard>
        <form class="reference-form" @submit.prevent="submitForm">
          <label class="form-field">
            <span>Parâmetro</span>
            <input v-model="form.parameter" required autocomplete="off" placeholder="Ex: Hemácias" />
          </label>
          <label class="form-field">
            <span>Unidade</span>
            <input v-model="form.unit" required autocomplete="off" placeholder="Ex: milhões/uL" />
          </label>
          <label class="form-field">
            <span>Valor Mínimo</span>
            <input v-model.number="form.minValue" required type="number" step="0.001" />
          </label>
          <label class="form-field">
            <span>Valor Máximo</span>
            <input v-model.number="form.maxValue" required type="number" step="0.001" />
          </label>
          <label class="form-field">
            <span>Exame</span>
            <input value="HEM" disabled />
          </label>
          <div class="form-actions">
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
            <DsButton variant="secondary" type="button" tag="a" to="/laboratory/hemogram-reference-values">Cancelar</DsButton>
          </div>
        </form>
      </DsCard>

      <aside class="form-aside">
        <DsCard title="Prévia da faixa">
          <div class="preview-card">
            <span>HEM</span>
            <strong>{{ form.parameter || 'Parâmetro' }}</strong>
            <p>{{ rangePreview }} {{ form.unit || 'unidade' }}</p>
            <p>{{ rangeStatus }}</p>
          </div>
        </DsCard>

        <DsCard title="Integrações operacionais">
          <div class="detail-list">
            <div><strong>Hemogramas:</strong> faixa usada na tabela de resultado estruturado.</div>
            <div><strong>Laudos:</strong> apoio para interpretação do corpo técnico.</div>
            <div><strong>Auditoria:</strong> rastreio de alterações nos parâmetros laboratoriais.</div>
          </div>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { laboratoryService } from '@/services/laboratory';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const route = useRoute();
const router = useRouter();
const referenceValueId = computed(() => route.params.id as string | undefined);
const isEditing = computed(() => Boolean(referenceValueId.value));
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const form = reactive({
  parameter: '',
  unit: '',
  minValue: 0,
  maxValue: 0
});

const rangePreview = computed(() => `${formatNumber(form.minValue)} - ${formatNumber(form.maxValue)}`);
const rangeStatus = computed(() => form.minValue <= form.maxValue ? 'Faixa válida' : 'Faixa precisa de revisão');

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3
  }).format(Number.isFinite(value) ? value : 0);
}

async function loadReferenceValue() {
  if (!referenceValueId.value) return;
  try {
    const referenceValue = await laboratoryService.getReferenceValue(referenceValueId.value);
    form.parameter = referenceValue.parameter;
    form.unit = referenceValue.unit;
    form.minValue = referenceValue.minValue;
    form.maxValue = referenceValue.maxValue;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar valor de referência';
  }
}

async function submitForm() {
  if (!form.parameter.trim() || !form.unit.trim()) {
    error.value = 'Parâmetro e unidade são obrigatórios';
    return;
  }
  if (!Number.isFinite(form.minValue) || !Number.isFinite(form.maxValue) || form.minValue > form.maxValue) {
    error.value = 'Valor mínimo e valor máximo devem formar uma faixa válida';
    return;
  }

  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    const payload = {
      parameter: form.parameter.trim(),
      examType: 'HEM',
      minValue: form.minValue,
      maxValue: form.maxValue,
      unit: form.unit.trim()
    };

    if (isEditing.value && referenceValueId.value) {
      await laboratoryService.updateReferenceValue(referenceValueId.value, payload);
    } else {
      await laboratoryService.createHemogramReferenceValue(payload);
    }

    successMessage.value = 'Valor de referência salvo com sucesso.';
    setTimeout(() => void router.push('/laboratory/hemogram-reference-values'), 900);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar valor de referência';
  } finally {
    submitting.value = false;
  }
}

onMounted(loadReferenceValue);
</script>

<style scoped>
.laboratory-hemogram-reference-value-form-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.8fr);
  align-items: start;
  gap: 16px;
}

.reference-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 600;
}

.form-field input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.form-field input:disabled {
  background: var(--color-bg-subtle, #f8fafc);
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form-aside,
.detail-list,
.preview-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-list {
  color: var(--color-text-secondary, #475569);
  font-size: 14px;
}

.detail-list strong {
  color: var(--color-text, #0f172a);
}

.preview-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.preview-card > span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.preview-card strong {
  color: var(--color-text, #0f172a);
  font-size: 20px;
}

.preview-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

@media (max-width: 960px) {
  .form-layout,
  .reference-form {
    grid-template-columns: 1fr;
  }
}
</style>

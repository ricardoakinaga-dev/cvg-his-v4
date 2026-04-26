<template>
  <div class="laboratory-hemogram-reference-value-detail-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Vlr. Ref. Hemograma', referenceValue?.parameter ?? 'Detalhe']"
      title="Detalhes do Valor de Referência"
      subtitle="Faixa hematológica aplicada nos resultados estruturados de hemograma"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory/hemogram-reference-values">Voltar</DsButton>
        <DsButton
          v-if="referenceValue"
          variant="primary"
          tag="a"
          :to="`/laboratory/hemogram-reference-values/${referenceValue.id}/edit`"
        >
          Editar
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section v-if="referenceValue" class="detail-grid">
      <DsCard title="Identificação">
        <dl class="detail-list">
          <div>
            <dt>Código</dt>
            <dd>{{ referenceValue.id }}</dd>
          </div>
          <div>
            <dt>Parâmetro</dt>
            <dd>{{ referenceValue.parameter }}</dd>
          </div>
          <div>
            <dt>Exame</dt>
            <dd>{{ referenceValue.examType }}</dd>
          </div>
          <div>
            <dt>Unidade</dt>
            <dd>{{ referenceValue.unit }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Faixa de referência">
        <div class="status-grid">
          <StatusBadge :label="rangeLabel" :variant="rangeVariant" />
          <StatusBadge label="Hemograma" variant="info" />
        </div>
        <dl class="detail-list">
          <div>
            <dt>Valor Mínimo</dt>
            <dd>{{ formatNumber(referenceValue.minValue) }}</dd>
          </div>
          <div>
            <dt>Valor Máximo</dt>
            <dd>{{ formatNumber(referenceValue.maxValue) }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Integrações laboratoriais">
        <div class="integration-list">
          <span>Hemogramas</span>
          <span>Laudos</span>
          <span>Exames</span>
          <span>Auditoria técnica</span>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  laboratoryService,
  type LaboratoryReferenceValueSummary
} from '@/services/laboratory';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const route = useRoute();
const referenceValue = ref<LaboratoryReferenceValueSummary | null>(null);
const error = ref('');

const rangeLabel = computed(() =>
  (referenceValue.value?.minValue ?? 0) <= (referenceValue.value?.maxValue ?? 0) ? 'Faixa válida' : 'Revisar faixa'
);
const rangeVariant = computed<StatusVariant>(() =>
  (referenceValue.value?.minValue ?? 0) <= (referenceValue.value?.maxValue ?? 0) ? 'success' : 'warning'
);

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3
  }).format(value);
}

async function load() {
  try {
    referenceValue.value = await laboratoryService.getReferenceValue(route.params.id as string);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar valor de referência';
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-hemogram-reference-value-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.8fr);
  gap: 16px;
}

.detail-list {
  display: grid;
  gap: 12px;
  margin: 0;
}

.detail-list div {
  display: grid;
  gap: 4px;
}

.detail-list dt {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.detail-list dd {
  margin: 0;
  color: var(--color-text, #0f172a);
}

.status-grid,
.integration-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.integration-list span {
  padding: 6px 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 999px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>

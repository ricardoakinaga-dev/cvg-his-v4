<template>
  <div class="laboratory-report-type-detail-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Tipos de Laudo', reportType?.name ?? 'Detalhe']"
      title="Detalhes do Tipo de Laudo"
      subtitle="Modelo técnico, categoria e integrações do laudo laboratorial"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory/report-types">Voltar</DsButton>
        <DsButton
          v-if="reportType"
          variant="primary"
          tag="a"
          :to="`/laboratory/report-types/${reportType.id}/edit`"
        >
          Editar
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section v-if="reportType" class="detail-grid">
      <DsCard title="Identificação">
        <dl class="detail-list">
          <div>
            <dt>Código interno</dt>
            <dd>{{ reportType.id }}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>{{ reportType.code }}</dd>
          </div>
          <div>
            <dt>Descrição</dt>
            <dd>{{ reportType.name }}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{{ reportType.category }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Operação">
        <div class="status-grid">
          <StatusBadge :label="statusLabel" :variant="statusVariant" />
          <StatusBadge :label="categoryLabel" variant="info" />
        </div>
        <dl class="detail-list">
          <div>
            <dt>Situação</dt>
            <dd>{{ reportType.active ? 'Disponível para emissão de laudos' : 'Indisponível para novos laudos' }}</dd>
          </div>
          <div>
            <dt>Uso esperado</dt>
            <dd>Modelo selecionável nos fluxos de exames, laudos e resultados estruturados.</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Modelo">
        <p class="model-text">{{ reportType.description }}</p>
      </DsCard>

      <DsCard title="Integrações laboratoriais">
        <div class="integration-list">
          <span>Exames</span>
          <span>Laudos</span>
          <span>Hemogramas</span>
          <span>Bioquímico</span>
          <span>Urina</span>
          <span>Auditoria</span>
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
  type LaboratoryReportTypeSummary
} from '@/services/laboratory';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const route = useRoute();
const reportType = ref<LaboratoryReportTypeSummary | null>(null);
const error = ref('');

const statusLabel = computed(() => reportType.value?.active ? 'Ativo' : 'Inativo');
const statusVariant = computed<StatusVariant>(() => reportType.value?.active ? 'success' : 'warning');
const categoryLabel = computed(() => reportType.value?.category ?? 'Categoria');

async function load() {
  try {
    reportType.value = await laboratoryService.getReportType(route.params.id as string);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tipo de laudo';
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-report-type-detail-page {
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

.model-text {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  line-height: 1.6;
  white-space: pre-wrap;
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

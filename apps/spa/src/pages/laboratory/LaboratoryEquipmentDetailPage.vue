<template>
  <div class="laboratory-equipment-detail-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Equipamentos', equipment?.name ?? 'Detalhe']"
      title="Detalhes do Equipamento"
      subtitle="Rastreabilidade técnica, situação operacional e calibração"
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/laboratory/equipment">Voltar</DsButton>
        <DsButton
          v-if="equipment"
          variant="primary"
          tag="a"
          :to="`/laboratory/equipment/${equipment.id}/edit`"
        >
          Editar
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section v-if="equipment" class="detail-grid">
      <DsCard title="Identificação">
        <dl class="detail-list">
          <div>
            <dt>Código</dt>
            <dd>{{ equipment.id }}</dd>
          </div>
          <div>
            <dt>Descrição</dt>
            <dd>{{ equipment.name }}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{{ equipment.type }}</dd>
          </div>
          <div>
            <dt>Nº Série</dt>
            <dd>{{ equipment.serialNumber }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Operação">
        <div class="status-grid">
          <StatusBadge :label="statusLabel" :variant="statusVariant" />
          <StatusBadge :label="calibrationLabel" :variant="calibrationVariant" />
        </div>
        <dl class="detail-list">
          <div>
            <dt>Última Calibração</dt>
            <dd>{{ formatDate(equipment.lastCalibrationAt) }}</dd>
          </div>
          <div>
            <dt>Manutenção</dt>
            <dd>{{ equipment.status === 'maintenance' ? 'Equipamento em manutenção' : 'Apto para operação' }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Integrações laboratoriais">
        <div class="integration-list">
          <span>Exames</span>
          <span>Hemogramas</span>
          <span>Bioquímico</span>
          <span>Laudos</span>
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
  type LaboratoryEquipmentSummary
} from '@/services/laboratory';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const route = useRoute();
const equipment = ref<LaboratoryEquipmentSummary | null>(null);
const error = ref('');

const statusLabel = computed(() => equipment.value?.status === 'maintenance' ? 'Manutenção' : 'Ativo');
const statusVariant = computed<StatusVariant>(() =>
  equipment.value?.status === 'maintenance' ? 'warning' : 'success'
);
const calibrationLabel = computed(() => isCalibrationDue(equipment.value?.lastCalibrationAt) ? 'Revisar calibração' : 'Calibração em dia');
const calibrationVariant = computed<StatusVariant>(() =>
  isCalibrationDue(equipment.value?.lastCalibrationAt) ? 'warning' : 'success'
);

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function isCalibrationDue(value: string | undefined): boolean {
  if (!value) return false;
  const calibrationDate = new Date(value);
  const daysSinceCalibration = Math.floor((Date.now() - calibrationDate.getTime()) / 86_400_000);
  return daysSinceCalibration > 180;
}

async function load() {
  try {
    equipment.value = await laboratoryService.getEquipment(route.params.id as string);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipamento';
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-equipment-detail-page {
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

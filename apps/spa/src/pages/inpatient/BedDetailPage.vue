<template>
  <div class="bed-detail-page">
    <AppPageHeader
      title="Box de Internação"
      :breadcrumbs="['Atendimento', 'Cadastros', 'Boxes de Internação', 'Abrir']"
      subtitle="Consulta operacional do box usado na internação.">
      <template #actions>
        <DsButton variant="secondary" @click="router.push('/beds')">Voltar</DsButton>
        <DsButton variant="primary" :disabled="!bed" @click="router.push(`/beds/${bedId}/edit`)">Editar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div v-if="bed" class="detail-grid">
      <DsCard title="Cadastro">
        <dl class="detail-list">
          <div>
            <dt>Código</dt>
            <dd>{{ bed.code }}</dd>
          </div>
          <div>
            <dt>Descrição</dt>
            <dd>{{ bed.name }}</dd>
          </div>
          <div>
            <dt>Setor</dt>
            <dd>{{ sectorLabel }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ statusLabel(bed.status) }}</dd>
          </div>
          <div>
            <dt>Boxes Ativos</dt>
            <dd>{{ bed.active ? 'Sim' : 'Não' }}</dd>
          </div>
          <div>
            <dt>Espécie suportada</dt>
            <dd>{{ bed.supportsSpecies || 'Sem restrição' }}</dd>
          </div>
        </dl>
      </DsCard>

      <DsCard title="Ações">
        <div class="action-stack">
          <DsButton variant="secondary" @click="router.push('/inpatient/board')">Mapa de Leitos</DsButton>
          <DsButton variant="secondary" @click="toggleActive">
            {{ bed.active ? 'Inativar' : 'Reativar' }}
          </DsButton>
          <DsButton v-if="bed.active" variant="danger" @click="archiveBed">Arquivar</DsButton>
        </div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import { inpatientService } from '@/services/inpatient';
import type { BedSummary, SectorSummary } from '@/types/inpatient';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const route = useRoute();
const router = useRouter();
const bedId = route.params.id as string;
const bed = ref<BedSummary | null>(null);
const sectors = ref<SectorSummary[]>([]);
const error = ref('');
const successMessage = ref('');

const sectorLabel = computed(() => {
  if (!bed.value) return '';
  const sector = sectors.value.find((item) => item.id === bed.value?.sectorId);
  return sector ? `${sector.code} - ${sector.name}` : bed.value.sectorId;
});

async function loadData() {
  error.value = '';
  try {
    const [bedRecord, sectorItems] = await Promise.all([
      inpatientService.getBedById(bedId),
      inpatientService.listSectors()
    ]);
    bed.value = bedRecord;
    sectors.value = sectorItems;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar box de internação';
  }
}

async function toggleActive() {
  if (!bed.value) return;
  try {
    bed.value = await inpatientService.updateBed(bed.value.id, {
      active: !bed.value.active,
      status: bed.value.active ? 'blocked' : 'available'
    });
    successMessage.value = 'Status do box atualizado.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao atualizar box de internação';
  }
}

async function archiveBed() {
  if (!bed.value) return;
  if (!window.confirm('Arquivar este box de internação?')) return;
  try {
    await inpatientService.archiveBed(bed.value.id);
    successMessage.value = 'Box de Internação arquivado.';
    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao arquivar box de internação';
  }
}

function statusLabel(status: BedSummary['status']): string {
  const map: Record<BedSummary['status'], string> = {
    available: 'Disponível',
    occupied: 'Ocupado',
    maintenance: 'Manutenção',
    blocked: 'Bloqueado'
  };
  return map[status];
}

onMounted(loadData);
</script>

<style scoped>
.bed-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.55fr);
  gap: 16px;
  align-items: start;
}

.detail-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
}

.detail-list div {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.detail-list dt {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 700;
}

.detail-list dd {
  margin: 4px 0 0;
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.action-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 860px) {
  .detail-grid,
  .detail-list {
    grid-template-columns: 1fr;
  }
}
</style>

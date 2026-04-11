<template>
  <div class="bed-board-page">
    <AppPageHeader title="🗺️ Mapa de Leitos" subtitle="Visão geral de ocupação por setor">
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadBoard">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="bed-board-page__overview">
      <DsCard title="Ocupação geral">
        <div class="board-stats">
          <span class="stat stat--total">Total: {{ stats.totalBeds }}</span>
          <span class="stat stat--occupied">Ocupados: {{ stats.occupiedBeds }}</span>
          <span class="stat stat--available">Disponíveis: {{ stats.availableBeds }}</span>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" />
    </div>

    <EmptyState
      v-else-if="board.items.length === 0"
      icon="🗺️"
      title="Nenhum setor configurado"
      description="Configure setores e leitos para visualizar o mapa de ocupação."
    />

    <div v-else class="board">
      <div v-for="sector in board.items" :key="sector.sectorId" class="board-sector">
        <div class="board-sector__header">
          <h2 class="board-sector__title">{{ sector.sectorName }}</h2>
          <span class="board-sector__badge">
            {{ sector.occupiedBeds }}/{{ sector.totalBeds }} ocupados
          </span>
        </div>
        <div class="board-beds">
          <div
            v-for="bed in sector.beds"
            :key="bed.id"
            class="bed-card"
            :class="`bed-card--${bed.status}`"
          >
            <div class="bed-card__header">
              <span class="bed-card__code">{{ bed.code }}</span>
              <span class="bed-card__status" :class="`bed-card__status--${bed.status}`">
                {{ bedStatus(bed.status) }}
              </span>
            </div>
            <div class="bed-card__name">{{ bed.name }}</div>
            <div v-if="bed.patientId" class="bed-card__patient">
              {{ patientName(bed.patientId) }}
            </div>
            <div v-if="bed.occupiedSince" class="bed-card__since">
              Desde {{ formatDate(bed.occupiedSince) }}
            </div>
            <div v-if="bed.supportsSpecies" class="bed-card__species">
              {{ speciesLabel(bed.supportsSpecies) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { inpatientService } from '@/services/inpatient';
import type { BedMapResponse } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { formatDate, speciesLabel } from '@/utils/labels';
import EmptyState from '@/components/EmptyState.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const board = ref<BedMapResponse>({ items: [], totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });
const loading = ref(false);
const error = ref('');
const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});

const stats = ref({ totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });

function bedStatus(status: string): string {
  const map: Record<string, string> = {
    available: 'Disponível',
    occupied: 'Ocupado',
    maintenance: 'Manutenção',
    blocked: 'Bloqueado'
  };
  return map[status] || status;
}

function patientName(id: string): string {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

onMounted(async () => {
  await loadBoard();
});

async function loadBoard() {
  loading.value = true;
  error.value = '';
  try {
    board.value = await inpatientService.getBedMap();
    stats.value = {
      totalBeds: board.value.totalBeds,
      occupiedBeds: board.value.occupiedBeds,
      availableBeds: board.value.availableBeds
    };
    const patientIds = [
      ...new Set(
        board.value.items
          .flatMap((s) => s.beds)
          .filter((b) => b.patientId)
          .map((b) => b.patientId!)
      )
    ];
    await Promise.all(
      patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      })
    );
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar mapa de leitos';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.bed-board-page__overview {
  margin-bottom: 16px;
}

.board-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
}
.stat {
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
}
.stat--total {
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-secondary, #475569);
}
.stat--occupied {
  background: var(--color-danger-50, #fef2f2);
  color: var(--color-danger-700, #b91c1c);
}
.stat--available {
  background: var(--color-success-50, #ecfdf5);
  color: var(--color-success-700, #047857);
}
.board {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.board-sector {
  background: var(--color-surface, #ffffff);
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  overflow: hidden;
}
.board-sector__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-subtle, #f8fafc);
}
.board-sector__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}
.board-sector__badge {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
  padding: 4px 10px;
  background: var(--color-surface, #ffffff);
  border-radius: 6px;
  border: 1px solid var(--color-border, #e2e8f0);
}
.board-beds {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  padding: 16px 20px;
}
.bed-card {
  padding: 14px;
  border-radius: 10px;
  border: 2px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.bed-card:hover {
  box-shadow: var(--shadow-sm, 0 2px 8px rgba(0, 0, 0, 0.06));
}
.bed-card--available {
  border-color: var(--color-success-300, #6ee7b7);
  background: var(--color-success-50, #ecfdf5);
}
.bed-card--occupied {
  border-color: var(--color-danger-300, #fca5a5);
  background: var(--color-danger-50, #fef2f2);
}
.bed-card--maintenance {
  border-color: var(--color-warning-300, #fcd34d);
  background: var(--color-warning-50, #fffbeb);
}
.bed-card--blocked {
  border-color: var(--color-text-muted, #94a3b8);
  background: var(--color-bg-subtle, #f8fafc);
  opacity: 0.7;
}
.bed-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.bed-card__code {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}
.bed-card__status {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
}
.bed-card__status--available {
  background: var(--color-success-100, #d1fae5);
  color: var(--color-success-700, #047857);
}
.bed-card__status--occupied {
  background: var(--color-danger-100, #fee2e2);
  color: var(--color-danger-700, #b91c1c);
}
.bed-card__status--maintenance {
  background: var(--color-warning-100, #fef3c7);
  color: var(--color-warning-700, #b45309);
}
.bed-card__status--blocked {
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-muted, #94a3b8);
}
.bed-card__name {
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
  margin-bottom: 4px;
}
.bed-card__patient {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
  margin-bottom: 2px;
}
.bed-card__since {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
}
.bed-card__species {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 4px;
}
</style>

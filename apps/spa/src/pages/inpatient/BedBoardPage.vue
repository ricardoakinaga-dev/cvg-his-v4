<template>
  <div class="bed-board-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Internação', 'Mapa de Leitos']"
      title="Mapa de Leitos"
      subtitle="Ocupação e disponibilidade por setor."
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/inpatient" icon="🛏️">Internações</DsButton>
        <DsButton variant="ghost" tag="a" to="/sectors" icon="🏢">Setores</DsButton>
        <DsButton variant="ghost" tag="a" to="/beds">Leitos</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="loadBoard">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="bed-board-page__overview" aria-label="Ocupação geral" :aria-busy="loading">
      <dl class="board-stats">
        <div>
          <dt>Total de leitos</dt>
          <dd>{{ boardAvailable && !loading ? stats.totalBeds : '—' }}</dd>
        </div>
        <div>
          <dt>Ocupados</dt>
          <dd>{{ boardAvailable && !loading ? stats.occupiedBeds : '—' }}</dd>
        </div>
        <div>
          <dt>Disponíveis</dt>
          <dd>{{ boardAvailable && !loading ? stats.availableBeds : '—' }}</dd>
        </div>
      </dl>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" />
    </div>

    <EmptyState
      v-else-if="!boardAvailable"
      icon="alert"
      title="Mapa indisponível"
      description="Atualize para consultar a ocupação dos leitos."
      size="sm"
    >
      <template #action><DsButton @click="loadBoard">Tentar novamente</DsButton></template>
    </EmptyState>

    <EmptyState
      v-else-if="board.items.length === 0"
      icon="🗺️"
      title="Nenhum setor configurado"
      description="Cadastre o primeiro setor para organizar os leitos e receber pacientes."
      size="sm"
    >
      <template #action><DsButton tag="a" to="/sectors">Configurar setores</DsButton></template>
    </EmptyState>

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
              <StatusBadge :label="bedStatus(bed.status)" :variant="bedStatusVariant(bed.status)" />
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
import { ref, onMounted, onUnmounted } from 'vue';
import { inpatientService } from '@/services/inpatient';
import type { BedMapResponse } from '@/types/inpatient';
import { useEntityCache } from '@/composables/useEntityCache';
import { formatDate, speciesLabel } from '@/utils/labels';
import EmptyState from '@/components/EmptyState.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const board = ref<BedMapResponse>({ items: [], totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });
const loading = ref(true);
const boardAvailable = ref(false);
const error = ref('');
const entityCache = useEntityCache();
const patientNames = ref<Record<string, string>>({});
let loadGeneration = 0;

const stats = ref({ totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });

function bedStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  return status === 'available'
    ? 'success'
    : status === 'occupied'
      ? 'danger'
      : status === 'maintenance'
        ? 'warning'
        : 'neutral';
}

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
onUnmounted(() => {
  loadGeneration++;
});

async function loadBoard() {
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = '';
  try {
    const nextBoard = await inpatientService.getBedMap();
    if (generation !== loadGeneration) return;
    board.value = nextBoard;
    patientNames.value = {};
    boardAvailable.value = true;
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
    // Occupancy must remain usable even if enrichment is slow or unavailable.
    void Promise.allSettled(
      patientIds.map(async (id) => {
        const name = await entityCache.getPatientName(id);
        if (generation === loadGeneration) patientNames.value[id] = name;
      })
    );
  } catch (err: unknown) {
    if (generation !== loadGeneration) return;
    boardAvailable.value = false;
    error.value = err instanceof Error ? err.message : 'Erro ao carregar mapa de leitos';
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}
</script>

<style scoped>
.bed-board-page {
  display: grid;
  gap: 16px;
  min-width: 0;
}
.board,
.board-sector,
.bed-card,
.board-sector__title {
  min-width: 0;
}
.board-sector__title,
.bed-card {
  overflow-wrap: anywhere;
}
.board-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}
.board-stats > div {
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-surface);
}
.board-stats dt {
  color: var(--color-text-muted);
  font-size: 12px;
}
.board-stats dd {
  margin: 6px 0 0;
  color: var(--color-text);
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
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
  flex-wrap: wrap;
  gap: 12px;
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
  grid-template-columns: repeat(auto-fill, minmax(min(180px, 100%), 1fr));
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
}
.bed-card--occupied {
  border-color: var(--color-danger-300, #fca5a5);
}
.bed-card--maintenance {
  border-color: var(--color-warning-300, #fcd34d);
}
.bed-card--blocked {
  border-color: var(--color-text-muted, #94a3b8);
  background: var(--color-bg-subtle, #f8fafc);
}
.bed-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  gap: 8px;
  flex-wrap: wrap;
}
.bed-card__code {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
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
@media (max-width: 720px) {
  .bed-board-page :deep(.app-page-header) {
    padding: 18px;
  }
  .bed-board-page :deep(.app-page-header__breadcrumbs) {
    display: none;
  }
  .board-stats > div {
    padding: 14px 10px;
  }
  .board-stats dd {
    font-size: 24px;
  }
  .board-beds {
    padding: 14px;
  }
}
</style>

<template>
  <section class="patient-360-timeline" aria-label="Timeline 360 unificada do paciente">
    <DsCard title="Timeline 360 unificada">
      <div v-if="props.items.length" class="timeline-list timeline-list--360">
        <div v-for="item in props.items" :key="item.id" class="timeline-list__item">
          <div>
            <strong>{{ item.source }} · {{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
          <div class="timeline-list__meta">
            <span>{{ formatDateTime(item.occurredAt) }}</span>
            <RouterLink v-if="item.href" :to="item.href">Abrir</RouterLink>
          </div>
        </div>
      </div>
      <p v-else class="muted">Sem eventos consolidados para a timeline 360.</p>
    </DsCard>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import { formatDateTime } from '@/utils/labels';

export interface PatientTimelineFeedItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  source: string;
  href?: string;
}

const props = defineProps<{
  items: readonly PatientTimelineFeedItem[];
}>();
</script>

<style scoped>
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.timeline-list__item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.timeline-list__item p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
}

.timeline-list__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 132px;
}

.muted {
  margin: 0;
  color: var(--color-text-muted);
}

@media (max-width: 720px) {
  .timeline-list__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .timeline-list__meta {
    align-items: flex-start;
    min-width: auto;
  }
}

:global(:root[data-theme='dark']) .timeline-list__item {
  border-color: var(--color-border);
}

:global(:root[data-theme='dark']) .timeline-list__item p,
:global(:root[data-theme='dark']) .muted {
  color: var(--color-text-secondary);
}
</style>

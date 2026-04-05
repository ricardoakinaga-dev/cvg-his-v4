<template>
  <div class="dashboard-page">
    <h1 class="dashboard-page__title">Dashboard</h1>
    <p class="dashboard-page__subtitle">Visão geral do sistema</p>
    <div class="dashboard-grid">
      <DsCard v-for="stat in stats" :key="stat.label" variant="elevated" class="stat-card">
        <span class="stat-card__icon">{{ stat.icon }}</span>
        <div class="stat-card__content">
          <span class="stat-card__value">{{ stat.value }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
        </div>
      </DsCard>
    </div>
    <DsCard>
      <p class="dashboard-placeholder">
        🚧 Módulo em migração — funcionalidades completas em breve
      </p>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

const stats = ref([
  { icon: '👤', label: 'Tutores', value: '—' },
  { icon: '🐾', label: 'Pacientes', value: '—' },
  { icon: '📅', label: 'Consultas Hoje', value: '—' },
  { icon: '🏥', label: 'Atendimentos', value: '—' }
]);
</script>

<style scoped>
.dashboard-page {
  max-width: 1280px;
}

.dashboard-page__title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.dashboard-page__subtitle {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--color-text-muted, #94a3b8);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-card__icon {
  font-size: 32px;
}

.stat-card__content {
  display: flex;
  flex-direction: column;
}

.stat-card__value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.stat-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
}

.dashboard-placeholder {
  padding: 48px;
  text-align: center;
  color: var(--color-text-muted, #94a3b8);
}
</style>

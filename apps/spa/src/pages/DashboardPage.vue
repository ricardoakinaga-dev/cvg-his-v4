<template>
  <div class="dashboard-page">
    <section class="dashboard-hero">
      <div class="dashboard-hero__copy">
        <div class="dashboard-hero__eyebrow">Centro de operação</div>
        <h1 class="dashboard-hero__title">Dashboard</h1>
        <p class="dashboard-hero__subtitle">
          Visão consolidada do hospital veterinário, com acesso rápido aos fluxos centrais e ao
          contexto operacional do SPA oficial.
        </p>
      </div>
      <div class="dashboard-hero__actions">
        <DsButton tag="a" to="/appointments/new" variant="primary">+ Novo Agendamento</DsButton>
        <DsButton tag="a" to="/patients/new" variant="secondary">+ Novo Paciente</DsButton>
      </div>
    </section>

    <div class="dashboard-context">
      <span class="dashboard-context__chip">👤 {{ userName }}</span>
      <span class="dashboard-context__chip">🎯 {{ primaryRole }}</span>
      <span v-if="accountId" class="dashboard-context__chip">🏢 {{ accountId }}</span>
      <span class="dashboard-context__chip">🏥 SPA oficial</span>
      <span class="dashboard-context__chip">⌘K Busca global</span>
    </div>

    <section class="dashboard-grid">
      <DsCard v-for="stat in stats" :key="stat.label" variant="elevated" class="metric-card">
        <div class="metric-card__icon">{{ stat.icon }}</div>
        <div class="metric-card__body">
          <span class="metric-card__value">{{ stat.value }}</span>
          <span class="metric-card__label">{{ stat.label }}</span>
        </div>
      </DsCard>
    </section>

    <section class="dashboard-panels">
      <DsCard class="panel-card">
        <div class="panel-card__head">
          <div>
            <div class="panel-card__eyebrow">Acesso rápido</div>
            <h2 class="panel-card__title">Domínios prioritários</h2>
          </div>
        </div>
        <div class="quick-actions">
          <DsButton tag="a" to="/owners" variant="secondary">Tutores</DsButton>
          <DsButton tag="a" to="/patients" variant="secondary">Pacientes</DsButton>
          <DsButton tag="a" to="/appointments" variant="secondary">Agendamentos</DsButton>
          <DsButton tag="a" to="/queue" variant="secondary">Fila</DsButton>
          <DsButton tag="a" to="/encounters" variant="secondary">Atendimentos</DsButton>
          <DsButton tag="a" to="/medical-records" variant="secondary">Prontuário</DsButton>
          <DsButton tag="a" to="/access-control" variant="secondary">Governança</DsButton>
          <DsButton tag="a" to="/audit" variant="secondary">Auditoria</DsButton>
          <DsButton tag="a" to="/billing" variant="secondary">Billing</DsButton>
          <DsButton tag="a" to="/cash" variant="secondary">Caixa</DsButton>
          <DsButton tag="a" to="/quotes" variant="secondary">Orçamentos</DsButton>
          <DsButton tag="a" to="/commercial-reports" variant="secondary">Relatórios</DsButton>
        </div>
      </DsCard>

      <DsCard class="panel-card">
        <div class="panel-card__head">
          <div>
            <div class="panel-card__eyebrow">Trabalho recente</div>
            <h2 class="panel-card__title">Rotas acessadas</h2>
          </div>
        </div>
        <EmptyState
          v-if="recentRoutes.length === 0"
          icon="🧭"
          title="Ainda sem histórico recente"
          description="Abra rotas no SPA para começar a construir o histórico operacional."
          size="sm"
        />
        <div v-else class="link-list">
          <router-link
            v-for="item in recentRoutes"
            :key="item.path"
            :to="item.path"
            class="link-list__item"
          >
            <span class="link-list__icon">{{ item.icon ?? '↗' }}</span>
            <span class="link-list__label">{{ item.label }}</span>
            <span class="link-list__path">{{ item.path }}</span>
          </router-link>
        </div>
      </DsCard>

      <DsCard class="panel-card">
        <div class="panel-card__head">
          <div>
            <div class="panel-card__eyebrow">Favoritos</div>
            <h2 class="panel-card__title">Atalhos fixados</h2>
          </div>
        </div>
        <EmptyState
          v-if="favoriteRoutes.length === 0"
          icon="★"
          title="Nenhum favorito fixado"
          description="Use a estrela no topo para fixar suas rotas mais usadas."
          size="sm"
        />
        <div v-else class="link-list">
          <router-link
            v-for="item in favoriteRoutes"
            :key="item.path"
            :to="item.path"
            class="link-list__item"
          >
            <span class="link-list__icon">{{ item.icon ?? '★' }}</span>
            <span class="link-list__label">{{ item.label }}</span>
            <span class="link-list__path">{{ item.path }}</span>
          </router-link>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { apiRequest } from '@/services/api';

interface DashboardMetric {
  icon: string;
  label: string;
  value: string;
}

const appStore = useAppStore();
const authStore = useAuthStore();

const stats = ref<DashboardMetric[]>([
  { icon: '👤', label: 'Tutores', value: '—' },
  { icon: '🐾', label: 'Pacientes', value: '—' },
  { icon: '📅', label: 'Agendamentos', value: '—' },
  { icon: '🏥', label: 'Fila operacional', value: '—' }
]);

const userName = computed(() => authStore.userName);
const accountId = computed(() => authStore.user.accountId ?? '');
const primaryRole = computed(() =>
  authStore.user.roles.length > 0
    ? authStore.user.roles[0].replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Operador'
);

const recentRoutes = computed(() => appStore.recentRoutes);
const favoriteRoutes = computed(() =>
  appStore.favoriteRoutes
    .map((path) => {
      const recent = appStore.recentRoutes.find((route) => route.path === path);
      return recent ?? { path, label: path, icon: '★' };
    })
    .filter((item) => Boolean(item.path))
);

async function loadStats() {
  const [owners, patients, appointments, queue] = await Promise.all([
    apiRequest<{ items?: unknown[] }>('/owners').catch(() => ({ items: [] })),
    apiRequest<{ items?: unknown[] }>('/patients').catch(() => ({ items: [] })),
    apiRequest<{ items?: unknown[] }>('/appointments').catch(() => ({ items: [] })),
    apiRequest<{ items?: unknown[] }>('/queue').catch(() => ({ items: [] }))
  ]);

  stats.value = [
    { icon: '👤', label: 'Tutores', value: String(owners.items?.length ?? 0) },
    { icon: '🐾', label: 'Pacientes', value: String(patients.items?.length ?? 0) },
    { icon: '📅', label: 'Agendamentos', value: String(appointments.items?.length ?? 0) },
    { icon: '🏥', label: 'Fila operacional', value: String(queue.items?.length ?? 0) }
  ];
}

onMounted(() => {
  void loadStats();
});
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
  max-width: 1400px;
}

.dashboard-hero {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.14), rgba(13, 148, 136, 0.08)),
    rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(16px);
}

.dashboard-hero__copy {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.dashboard-hero__eyebrow,
.panel-card__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-primary-600, #2563eb);
}

.dashboard-hero__title {
  margin: 0;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.05;
  color: var(--color-text, #0f172a);
}

.dashboard-hero__subtitle {
  margin: 0;
  max-width: 760px;
  font-size: 15px;
  color: var(--color-text-secondary, #475569);
}

.dashboard-hero__actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-wrap: wrap;
}

.dashboard-context {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dashboard-context__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.metric-card__icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 16px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 24px;
  flex-shrink: 0;
}

.metric-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.metric-card__value {
  font-size: 28px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.metric-card__label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
}

.dashboard-panels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.panel-card {
  padding: 18px;
  min-height: 100%;
}

.panel-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.panel-card__title {
  margin: 2px 0 0;
  font-size: 18px;
  color: var(--color-text, #0f172a);
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.link-list {
  display: grid;
  gap: 8px;
}

.link-list__item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(255, 255, 255, 0.76);
  text-decoration: none;
}

.link-list__icon {
  width: 28px;
  text-align: center;
}

.link-list__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.link-list__path {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  white-space: nowrap;
}

@media (max-width: 1080px) {
  .dashboard-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-hero {
    padding: 18px;
    flex-direction: column;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }

  .link-list__item {
    grid-template-columns: 28px minmax(0, 1fr);
  }

  .link-list__path {
    display: none;
  }
}
</style>

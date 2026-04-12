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
      <button
        class="dashboard-context__chip dashboard-context__chip--btn"
        type="button"
        @click="showWidgetMenu = !showWidgetMenu"
        :aria-expanded="showWidgetMenu"
        aria-controls="widget-menu"
      >
        ⚙️ Widgets
      </button>
    </div>

    <div v-if="showWidgetMenu" id="widget-menu" class="widget-menu">
      <div class="widget-menu__header">
        <span>Personalizar widgets</span>
        <button type="button" class="widget-menu__reset" @click="resetWidgets">Resetar</button>
      </div>
      <div class="widget-menu__list">
        <label
          v-for="widget in widgetStore.widgets"
          :key="widget.id"
          class="widget-toggle"
        >
          <input
            type="checkbox"
            :checked="widget.visible"
            @change="widgetStore.toggleWidget(widget.id)"
          />
          <span class="widget-toggle__icon">{{ widget.icon }}</span>
          <span class="widget-toggle__label">{{ widget.label }}</span>
        </label>
      </div>
    </div>

    <section class="dashboard-grid" aria-label="KPIs operacionais">
      <DsStatCard
        v-for="stat in stats"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :trend="stat.trend as 'up' | 'down' | 'neutral'"
        :trendValue="stat.trendValue"
        :loading="stat.loading"
        :error="stat.error"
        class="metric-card"
      />
    </section>

    <section class="dashboard-panels">
      <DsCard class="panel-card">
        <div class="panel-card__head">
          <div>
            <div class="panel-card__eyebrow">Acesso rápido</div>
            <h2 class="panel-card__title">Domínios prioritários</h2>
          </div>
        </div>
        <div class="domain-shortcuts">
          <DsDomainCard
            v-for="shortcut in domainShortcuts"
            :key="shortcut.to"
            :label="shortcut.label"
            :to="shortcut.to"
            :icon="shortcut.icon"
            :badge="shortcut.badge"
            compact
          />
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
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsDomainCard from '@cvg-his-v2/design-system/vue/DsDomainCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useWidgetStore } from '@/stores/widgets';
import { apiRequest } from '@/services/api';

interface DashboardMetric {
  label: string;
  value: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  loading?: boolean;
  error?: string;
}

const appStore = useAppStore();
const authStore = useAuthStore();
const widgetStore = useWidgetStore();

const showWidgetMenu = ref(false);

const stats = ref<DashboardMetric[]>([
  { icon: '👤', label: 'Tutores', value: '—', loading: true },
  { icon: '🐾', label: 'Pacientes', value: '—', loading: true },
  { icon: '📅', label: 'Agendamentos', value: '—', loading: true },
  { icon: '🏥', label: 'Fila operacional', value: '—', loading: true }
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

const domainShortcuts = [
  { label: 'Tutores', to: '/owners', icon: '👤' },
  { label: 'Pacientes', to: '/patients', icon: '🐾' },
  { label: 'Agendamentos', to: '/appointments', icon: '📅' },
  { label: 'Fila', to: '/queue', icon: '🏥' },
  { label: 'Atendimentos', to: '/encounters', icon: '🩺' },
  { label: 'Prontuário', to: '/medical-records', icon: '📋' },
  { label: 'Governança', to: '/access-control', icon: '🔐' },
  { label: 'Auditoria', to: '/audit', icon: '📊' },
  { label: 'Faturamento', to: '/billing', icon: '💳' },
  { label: 'Caixa', to: '/cash', icon: '💰' }
];

async function loadStats() {
  const endpoints = [
    { key: 'owners', label: 'Tutores', icon: '👤' },
    { key: 'patients', label: 'Pacientes', icon: '🐾' },
    { key: 'appointments', label: 'Agendamentos', icon: '📅' },
    { key: 'queue', label: 'Fila operacional', icon: '🏥' }
  ];

  const results = await Promise.allSettled(
    endpoints.map(({ key }) => apiRequest<{ total?: number; items?: unknown[] }>(`/${key}`))
  );

  stats.value = results.map((result, i) => {
    const { label, icon } = endpoints[i];
    if (result.status === 'rejected') {
      return { label, value: '—', icon, error: 'Falha ao carregar', loading: false };
    }
    const data = result.value;
    const value = data.total ?? data.items?.length ?? 0;
    return {
      label,
      value: typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value),
      icon,
      loading: false
    };
  });
}

onMounted(() => {
  void loadStats();
  widgetStore.initWidgets();
});

function resetWidgets() {
  widgetStore.resetWidgets();
}
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

.dashboard-context__chip--btn {
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}

.dashboard-context__chip--btn:hover {
  background: rgba(255, 255, 255, 0.95);
}

.widget-menu {
  padding: 16px;
  background: var(--color-surface, #ffffff);
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
}

.widget-menu__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.widget-menu__reset {
  background: none;
  border: none;
  color: var(--color-primary-600, #2563eb);
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
}

.widget-menu__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.widget-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text, #0f172a);
}

.widget-toggle input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-600, #2563eb);
}

.widget-toggle__icon {
  font-size: 16px;
}

.widget-toggle__label {
  flex: 1;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
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

.link-list {
  display: grid;
  gap: 8px;
}

.domain-shortcuts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
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

  .domain-shortcuts {
    grid-template-columns: 1fr 1fr;
  }

  .link-list__item {
    grid-template-columns: 28px minmax(0, 1fr);
  }

  .link-list__path {
    display: none;
  }
}
</style>

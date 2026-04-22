<template>
  <div class="dashboard-page">
    <DsCard class="dashboard-hero">
      <AppPageHeader
        title="Visão operacional do dia"
        :breadcrumbs="['Início']"
        subtitle="Acompanhe a jornada de Atendimento entre agenda, fila, triagem, atendimento, prontuário e internação."
        :secondary-actions="headerSecondaryActions"
        :primary-action="headerPrimaryAction"
      />
    </DsCard>

    <section v-if="stats.length > 0" class="dashboard-grid" aria-label="KPIs operacionais">
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

    <EmptyState
      v-else
      icon="📊"
      title="Indicadores indisponíveis"
      description="Os indicadores exibidos acompanham a operação de Atendimento e dependem das permissões da sessão atual."
      size="sm"
    />

    <section class="dashboard-panels">
      <DsCard class="panel-card">
        <div class="panel-card__head">
          <h2 class="panel-card__title">Acesso rápido</h2>
        </div>
        <div class="domain-shortcuts">
          <DsDomainCard
            v-for="shortcut in visibleDomainShortcuts"
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
          <h2 class="panel-card__title">Recentes</h2>
        </div>
        <EmptyState
          v-if="recentRoutes.length === 0"
          icon="🧭"
          title="Ainda sem histórico recente"
          description="Abra Agenda, Fila, Triagem, Atendimentos ou Prontuário para construir o histórico operacional do plantão."
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
          <h2 class="panel-card__title">Favoritos</h2>
        </div>
        <EmptyState
          v-if="favoriteRoutes.length === 0"
          icon="★"
          title="Nenhum favorito fixado"
          description="Fixe rotas críticas como Agenda, Fila, Triagem e Internação para iniciar a operação com menos cliques."
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
import DsDomainCard from '@cvg-his-v2/design-system/vue/DsDomainCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useAppStore } from '@/stores/app';
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

interface DomainShortcut {
  label: string;
  to: string;
  icon: string;
  badge?: number;
  permissionCode?: string;
}

interface SessionAccessResponse {
  access?: {
    permissionCodes?: string[];
  };
}

const appStore = useAppStore();
const widgetStore = useWidgetStore();

const stats = ref<DashboardMetric[]>([]);
const permissionCodes = ref<string[] | null>(null);

const recentRoutes = computed(() => appStore.recentRoutes);
const favoriteRoutes = computed(() =>
  appStore.favoriteRoutes
    .map((path) => {
      const recent = appStore.recentRoutes.find((route) => route.path === path);
      return recent ?? { path, label: path, icon: '★' };
    })
    .filter((item) => Boolean(item.path))
);

// Domain shortcuts organized by Vetus-aligned taxonomy:
// - "Início" serves as operational gateway with shortcuts to all ERP macroareas
// - "Atendimento" is the primary operational domain (patients, tutors, agenda, fila, triage, etc.)
const domainShortcuts: DomainShortcut[] = [
  // === Atendimento > Cadastrados ===
  { label: 'Tutores', to: '/owners', icon: '👤', permissionCode: 'owners.read' },
  { label: 'Pacientes', to: '/patients', icon: '🐾', permissionCode: 'patients.read' },
  // === Atendimento > Atendimentos ===
  { label: 'Agenda', to: '/appointments', icon: '📅', permissionCode: 'scheduling.read' },
  { label: 'Fila', to: '/queue', icon: '🏥', permissionCode: 'scheduling.read' },
  { label: 'Atendimentos', to: '/encounters', icon: '🩺', permissionCode: 'encounters.read' },
  { label: 'Triagem', to: '/triage', icon: '🧭', permissionCode: 'triage.read' },
  // === Atendimento > Prontuário ===
  { label: 'Prontuário', to: '/medical-records', icon: '📋', permissionCode: 'medical-records.read' },
  // === Atendimento > Internação ===
  { label: 'Internação', to: '/inpatient', icon: '🛏️', permissionCode: 'inpatient.read' },
  { label: 'Mapa de Leitos', to: '/inpatient/board', icon: '🗺️', permissionCode: 'inpatient.read' }
];

// Metrics aligned to the core "Atendimento" operational flow:
// these KPIs reflect the primary journey: agenda -> fila -> atendimento -> prontuario
const metricDefinitions = [
  { key: 'appointments', label: 'Agendamentos', icon: '📅', permissionCode: 'scheduling.read' },
  { key: 'queue', label: 'Fila operacional', icon: '🏥', permissionCode: 'scheduling.read' },
  { key: 'encounters', label: 'Atendimentos', icon: '🩺', permissionCode: 'encounters.read' },
  { key: 'patients', label: 'Pacientes', icon: '🐾', permissionCode: 'patients.read' }
] as const;

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-dashboard',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: () => void loadStats()
  },
  {
    key: 'view-queue',
    label: 'Ver fila',
    variant: 'ghost' as const,
    to: '/queue'
  }
]);

const headerPrimaryAction = computed(() => ({
  key: 'new-appointment',
  label: '+ Novo Agendamento',
  variant: 'primary' as const,
  to: '/appointments/new'
}));

const visibleDomainShortcuts = computed(() => {
  if (permissionCodes.value === null) {
    return domainShortcuts;
  }

  return domainShortcuts.filter(
    (shortcut) =>
      !shortcut.permissionCode || permissionCodes.value?.includes(shortcut.permissionCode)
  );
});

async function loadStats() {
  let grantedPermissions: string[] = [];

  try {
    const session = await apiRequest<SessionAccessResponse>('/auth/session');
    grantedPermissions = session.access?.permissionCodes ?? [];
  } catch {
    grantedPermissions = [];
  }

  permissionCodes.value = grantedPermissions;

  const visibleMetrics = metricDefinitions.filter(({ permissionCode }) =>
    grantedPermissions.includes(permissionCode)
  );

  stats.value = visibleMetrics.map(({ label, icon }) => ({
    label,
    value: '—',
    icon,
    loading: true
  }));

  const results = await Promise.allSettled(
    visibleMetrics.map(({ key }) => apiRequest<{ total?: number; items?: unknown[] }>(`/${key}`))
  );

  stats.value = results.map((result, i) => {
    const { label, icon } = visibleMetrics[i];
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
</script>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 18px;
  max-width: 1400px;
}

.dashboard-hero {
  padding: 20px 22px;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  min-width: 0;
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
  margin-bottom: 16px;
}

.panel-card__title {
  margin: 0;
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

@media (max-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .dashboard-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-grid,
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

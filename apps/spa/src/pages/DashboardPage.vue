<template>
  <div class="dashboard-page">
    <DsCard class="dashboard-hero">
      <AppPageHeader
        title="Início"
        :breadcrumbs="['Início']"
        :subtitle="`Olá. ${companyName} está ativo para a operação de hoje: agenda, comandas, aniversariantes e pendências do plantão.`"
        :secondary-actions="headerSecondaryActions"
        :primary-action="headerPrimaryAction"
      />
    </DsCard>

    <section v-if="visibleHomeTiles.length > 0" class="home-shortcuts" aria-label="Acesso rápido">
      <router-link
        v-for="tile in visibleHomeTiles"
        :key="tile.key"
        :to="tile.to"
        class="home-shortcut"
      >
        <span class="home-shortcut__icon">{{ tile.icon }}</span>
        <span class="home-shortcut__copy">
          <strong>{{ tile.label }}</strong>
          <small>{{ tile.hint }}</small>
        </span>
        <span class="home-shortcut__value" :class="{ 'home-shortcut__value--error': tile.error }">
          {{ tile.loading ? '...' : tile.value }}
        </span>
      </router-link>
    </section>

    <EmptyState
      v-else
      icon="📊"
      title="Atalhos indisponíveis"
      description="Os atalhos do Início dependem das permissões da sessão atual."
      size="sm"
    />

    <section
      v-if="homeMetrics.length > 0"
      class="home-operational-summary"
      aria-label="Indicadores do início"
    >
      <DsCard class="panel-card home-metrics-card">
        <div class="panel-card__head">
          <h2 class="panel-card__title">Indicadores do plantão</h2>
          <p class="panel-card__subtitle">Atendimento e financeiro</p>
        </div>
        <div class="home-metrics">
          <router-link
            v-for="metric in homeMetrics"
            :key="metric.key"
            :to="metric.to"
            class="home-metric"
          >
            <span class="home-metric__label">{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <small>{{ metric.hint }}</small>
          </router-link>
        </div>
      </DsCard>
    </section>

    <section class="home-panels">
      <DsCard class="panel-card panel-card--wide">
        <div class="panel-card__head panel-card__head--with-action">
          <div>
            <h2 class="panel-card__title">Comandas abertas</h2>
            <p class="panel-card__subtitle">Últimos 30 dias</p>
          </div>
          <button class="panel-card__action" type="button" @click="loadOpenCounterSales">
            Atualizar
          </button>
        </div>

        <EmptyState
          v-if="openCounterSales.error"
          icon="🧾"
          title="Não foi possível carregar comandas"
          :description="openCounterSales.error"
          size="sm"
        />
        <div v-else-if="openCounterSales.loading" class="panel-loading">
          Carregando comandas abertas...
        </div>
        <EmptyState
          v-else-if="openCounterSales.items.length === 0"
          icon="🧾"
          title="Nenhuma comanda aberta"
          description="Não há comandas abertas no recorte operacional atual."
          size="sm"
        />
        <div v-else class="counter-sale-list">
          <router-link
            v-for="sale in openCounterSales.items"
            :key="sale.id"
            :to="`/counter-sales/${sale.id}`"
            class="counter-sale-item"
          >
            <span class="counter-sale-item__date">Criação: {{ formatDate(sale.createdAt) }}</span>
            <strong>{{ sale.ownerId ? `Cliente ${sale.ownerId}` : sale.number }}</strong>
            <span>Total a pagar: {{ formatCurrency(sale.balanceDue) }}</span>
          </router-link>
        </div>
      </DsCard>

      <DsCard class="panel-card">
        <div class="panel-card__head">
          <h2 class="panel-card__title">Agenda e lembretes</h2>
          <p class="panel-card__subtitle">Pendências do início · {{ todayLabel }}</p>
        </div>
        <EmptyState
          v-if="operationalReminders.length === 0"
          icon="🗓️"
          title="Nenhuma pendência para hoje"
          description="Agenda, comandas abertas e aniversariantes aparecem aqui quando exigem acompanhamento."
          size="sm"
        />
        <div v-else class="reminder-list">
          <router-link
            v-for="reminder in operationalReminders"
            :key="reminder.key"
            :to="reminder.to"
            class="reminder-item"
          >
            <span class="reminder-item__tone" :class="`reminder-item__tone--${reminder.tone}`" />
            <span class="reminder-item__copy">
              <strong>{{ reminder.label }}</strong>
              <small>{{ reminder.detail }}</small>
            </span>
          </router-link>
        </div>
      </DsCard>

      <DsCard class="panel-card">
        <div class="panel-card__head">
          <h2 class="panel-card__title">Aniversariantes do dia</h2>
          <p class="panel-card__subtitle">{{ birthdayDateLabel }}</p>
        </div>
        <EmptyState
          v-if="birthdays.length === 0"
          icon="🎂"
          title="Nenhum aniversariante encontrado"
          description="Clientes e animais com data de nascimento de hoje aparecem neste painel."
          size="sm"
        />
        <div v-else class="birthday-list">
          <router-link
            v-for="birthday in birthdays"
            :key="`${birthday.type}-${birthday.id}`"
            :to="birthday.to"
            class="birthday-item"
          >
            <span>{{ birthday.type === 'patient' ? 'Animal' : 'Cliente' }}:</span>
            <strong>{{ birthday.name }}</strong>
          </router-link>
        </div>
      </DsCard>
    </section>

    <section class="dashboard-panels">
      <DsCard class="panel-card">
        <div class="panel-card__head">
          <h2 class="panel-card__title">Fluxo assistencial</h2>
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
import { computed, onMounted, reactive, ref } from 'vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsDomainCard from '@cvg-his-v2/design-system/vue/DsDomainCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import { useAppStore } from '@/stores/app';
import { useWidgetStore } from '@/stores/widgets';
import { apiRequest } from '@/services/api';

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

interface ListResponse<T> {
  items?: T[];
  total?: number;
}

type HomeTileKey = 'counter-sales' | 'owners' | 'patients' | 'appointments' | 'products' | 'sales';

interface HomeTile {
  key: HomeTileKey;
  label: string;
  hint: string;
  icon: string;
  to: string;
  endpoint: string;
  permissionCode: string;
  value: string;
  loading: boolean;
  error: boolean;
}

interface CounterSaleSummary {
  id: string;
  number: string;
  ownerId: string | null;
  balanceDue: number;
  createdAt: string;
}

interface OwnerSummary {
  id: string;
  fullName: string;
  profile?: {
    birthDate?: string;
  };
}

interface PatientSummary {
  id: string;
  name: string;
  primaryOwnerId: string;
  birthDateApproximate?: string;
}

interface BirthdayEntry {
  id: string;
  name: string;
  type: 'owner' | 'patient';
  to: string;
}

interface HomeMetric {
  key: string;
  label: string;
  value: string;
  hint: string;
  to: string;
  permissionCodes: string[];
}

interface OperationalReminder {
  key: string;
  label: string;
  detail: string;
  tone: 'info' | 'warning' | 'success';
  to: string;
}

const appStore = useAppStore();
const widgetStore = useWidgetStore();

const companyName = 'Centro Veterinário Guarapiranga';
const permissionCodes = ref<string[] | null>(null);
const birthdays = ref<BirthdayEntry[]>([]);
const homeSummary = reactive<Record<HomeTileKey, number>>({
  'counter-sales': 0,
  owners: 0,
  patients: 0,
  appointments: 0,
  products: 0,
  sales: 0
});

const openCounterSales = reactive<{
  loading: boolean;
  error: string;
  items: CounterSaleSummary[];
}>({
  loading: false,
  error: '',
  items: []
});

const recentRoutes = computed(() => appStore.recentRoutes);
const favoriteRoutes = computed(() =>
  appStore.favoriteRoutes
    .map((path) => {
      const recent = appStore.recentRoutes.find((route) => route.path === path);
      return recent ?? { path, label: path, icon: '★' };
    })
    .filter((item) => Boolean(item.path))
);

const homeTiles = ref<HomeTile[]>([
  {
    key: 'counter-sales',
    label: 'Comandas',
    hint: 'abertas',
    icon: '🧾',
    to: '/counter-sales',
    endpoint: '/counter-sales?status=open',
    permissionCode: 'counter_sale.read',
    value: '—',
    loading: false,
    error: false
  },
  {
    key: 'owners',
    label: 'Clientes',
    hint: 'cadastrados',
    icon: '👤',
    to: '/owners',
    endpoint: '/owners',
    permissionCode: 'owners.read',
    value: '—',
    loading: false,
    error: false
  },
  {
    key: 'patients',
    label: 'Animais',
    hint: 'cadastrados',
    icon: '🐾',
    to: '/patients',
    endpoint: '/patients',
    permissionCode: 'patients.read',
    value: '—',
    loading: false,
    error: false
  },
  {
    key: 'appointments',
    label: 'Agenda',
    hint: 'registros',
    icon: '📅',
    to: '/appointments',
    endpoint: '/appointments',
    permissionCode: 'scheduling.read',
    value: '—',
    loading: false,
    error: false
  },
  {
    key: 'products',
    label: 'Produtos',
    hint: 'ativos',
    icon: '🏷️',
    to: '/products',
    endpoint: '/products',
    permissionCode: 'product.read',
    value: '—',
    loading: false,
    error: false
  },
  {
    key: 'sales',
    label: 'Vendas',
    hint: 'fechadas',
    icon: '💸',
    to: '/sales',
    endpoint: '/counter-sales?status=closed',
    permissionCode: 'counter_sale.read',
    value: '—',
    loading: false,
    error: false
  }
]);

const visibleHomeTiles = computed(() => {
  if (permissionCodes.value === null) {
    return homeTiles.value;
  }

  return homeTiles.value.filter((tile) => permissionCodes.value?.includes(tile.permissionCode));
});

// Domain shortcuts organized by Vetus-aligned taxonomy:
// - "Início" serves as operational gateway with shortcuts to all ERP macroareas
// - "Atendimento" is the primary operational domain (patients, tutors, agenda, fila, triage, etc.)
const domainShortcuts: DomainShortcut[] = [
  // === Atendimento > Cadastrados ===
  { label: 'Clientes', to: '/owners', icon: '👤', permissionCode: 'owners.read' },
  { label: 'Animais', to: '/patients', icon: '🐾', permissionCode: 'patients.read' },
  // === Atendimento > Atendimentos ===
  { label: 'Agenda', to: '/appointments', icon: '📅', permissionCode: 'scheduling.read' },
  { label: 'Comandas', to: '/counter-sales', icon: '🧾', permissionCode: 'counter_sale.read' },
  { label: 'Fila', to: '/queue', icon: '🏥', permissionCode: 'scheduling.read' },
  { label: 'Atendimentos', to: '/encounters', icon: '🩺', permissionCode: 'encounters.read' },
  { label: 'Triagem', to: '/triage', icon: '🧭', permissionCode: 'triage.read' },
  // === Atendimento > Prontuário ===
  {
    label: 'Prontuário',
    to: '/medical-records',
    icon: '📋',
    permissionCode: 'medical-records.read'
  },
  // === Atendimento > Internação ===
  { label: 'Internação', to: '/inpatient', icon: '🛏️', permissionCode: 'inpatient.read' },
  { label: 'Mapa de Leitos', to: '/inpatient/board', icon: '🗺️', permissionCode: 'inpatient.read' }
];

const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-dashboard',
    label: 'Atualizar',
    variant: 'secondary' as const,
    onClick: () => void loadDashboard()
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
  label: '+ Novo agendamento',
  variant: 'primary' as const,
  to: '/appointments/new'
}));

const today = computed(() => new Date());
const todayLabel = computed(() => formatDate(today.value.toISOString()));
const birthdayDateLabel = computed(() =>
  today.value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
);
const openCounterSalesBalance = computed(() =>
  openCounterSales.items.reduce((total, sale) => total + sale.balanceDue, 0)
);

const homeMetrics = computed<HomeMetric[]>(() =>
  [
    {
      key: 'appointments',
      label: 'Agenda',
      value: formatNumber(homeSummary.appointments),
      hint: 'registros para acompanhar',
      to: '/appointments',
      permissionCodes: ['scheduling.read']
    },
    {
      key: 'counter-sales',
      label: 'Comandas abertas',
      value: formatNumber(homeSummary['counter-sales']),
      hint: 'pendentes de fechamento',
      to: '/counter-sales',
      permissionCodes: ['counter_sale.read']
    },
    {
      key: 'receivable',
      label: 'A receber',
      value: formatCurrency(openCounterSalesBalance.value),
      hint: 'saldo das comandas recentes',
      to: '/counter-sales',
      permissionCodes: ['counter_sale.read']
    },
    {
      key: 'birthdays',
      label: 'Aniversariantes',
      value: formatNumber(birthdays.value.length),
      hint: 'clientes e animais hoje',
      to: '/owners',
      permissionCodes: ['owners.read', 'patients.read']
    },
    {
      key: 'sales',
      label: 'Vendas fechadas',
      value: formatNumber(homeSummary.sales),
      hint: 'base comercial carregada',
      to: '/sales',
      permissionCodes: ['counter_sale.read']
    }
  ].filter((metric) => hasAnyPermission(metric.permissionCodes))
);

const operationalReminders = computed<OperationalReminder[]>(() => {
  const reminders: OperationalReminder[] = [];

  if (hasPermission('scheduling.read') && homeSummary.appointments > 0) {
    reminders.push({
      key: 'appointments',
      label: 'Agenda com registros para revisar',
      detail: `${formatNumber(homeSummary.appointments)} registros no painel de agenda`,
      tone: 'info',
      to: '/appointments'
    });
  }

  if (hasPermission('counter_sale.read') && openCounterSales.items.length > 0) {
    reminders.push({
      key: 'counter-sales',
      label: 'Comandas abertas aguardando cobrança',
      detail: `${formatNumber(openCounterSales.items.length)} comandas recentes somam ${formatCurrency(
        openCounterSalesBalance.value
      )}`,
      tone: 'warning',
      to: '/counter-sales'
    });
  }

  if (hasAnyPermission(['owners.read', 'patients.read']) && birthdays.value.length > 0) {
    reminders.push({
      key: 'birthdays',
      label: 'Aniversariantes do dia',
      detail: `${formatNumber(birthdays.value.length)} contatos para relacionamento`,
      tone: 'success',
      to: '/owners'
    });
  }

  return reminders;
});

const visibleDomainShortcuts = computed(() => {
  if (permissionCodes.value === null) {
    return domainShortcuts;
  }

  return domainShortcuts.filter(
    (shortcut) =>
      !shortcut.permissionCode || permissionCodes.value?.includes(shortcut.permissionCode)
  );
});

async function loadDashboard() {
  let grantedPermissions: string[] = [];

  try {
    const session = await apiRequest<SessionAccessResponse>('/auth/session');
    grantedPermissions = session.access?.permissionCodes ?? [];
  } catch {
    grantedPermissions = [];
  }

  permissionCodes.value = grantedPermissions;
  const tileData = await loadHomeTiles();
  await Promise.all([loadOpenCounterSales(), loadBirthdays(tileData)]);
}

async function loadHomeTiles(): Promise<Map<string, ListResponse<unknown>>> {
  const tiles = visibleHomeTiles.value;
  const responses = new Map<string, ListResponse<unknown>>();
  resetHomeSummary();

  for (const tile of tiles) {
    tile.loading = true;
    tile.error = false;
  }

  const results = await Promise.allSettled(
    tiles.map((tile) => apiRequest<ListResponse<unknown>>(tile.endpoint))
  );

  results.forEach((result, i) => {
    const tile = tiles[i];
    tile.loading = false;

    if (result.status === 'rejected') {
      tile.value = '—';
      tile.error = true;
      homeSummary[tile.key] = 0;
      return;
    }

    const count = countFromListResponse(result.value);
    tile.value = formatNumber(count);
    homeSummary[tile.key] = count;
    responses.set(tile.endpoint, result.value);
  });

  return responses;
}

async function loadOpenCounterSales() {
  if (!permissionCodes.value?.includes('counter_sale.read')) {
    openCounterSales.items = [];
    openCounterSales.loading = false;
    openCounterSales.error = '';
    return;
  }

  openCounterSales.loading = true;
  openCounterSales.error = '';

  try {
    const response = await apiRequest<ListResponse<CounterSaleSummary>>(
      `/counter-sales?status=open&dateFrom=${lastThirtyDaysDate()}`
    );
    openCounterSales.items = (response.items ?? [])
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 7);
  } catch {
    openCounterSales.items = [];
    openCounterSales.error = 'Confira sua permissão de leitura de comandas ou tente novamente.';
  } finally {
    openCounterSales.loading = false;
  }
}

async function loadBirthdays(seedResponses = new Map<string, ListResponse<unknown>>()) {
  const requests: Array<Promise<ListResponse<OwnerSummary | PatientSummary>>> = [];
  const seededResults: Array<ListResponse<OwnerSummary | PatientSummary>> = [];

  if (permissionCodes.value?.includes('owners.read')) {
    const owners = seedResponses.get('/owners') as ListResponse<OwnerSummary> | undefined;
    if (owners) {
      seededResults.push(owners);
    } else {
      requests.push(apiRequest<ListResponse<OwnerSummary>>('/owners'));
    }
  }

  if (permissionCodes.value?.includes('patients.read')) {
    const patients = seedResponses.get('/patients') as ListResponse<PatientSummary> | undefined;
    if (patients) {
      seededResults.push(patients);
    } else {
      requests.push(apiRequest<ListResponse<PatientSummary>>('/patients'));
    }
  }

  const results = await Promise.allSettled(requests);
  const todayMonthDay = monthDay(today.value.toISOString());
  const entries: BirthdayEntry[] = [];

  for (const response of [
    ...seededResults,
    ...results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  ]) {
    for (const item of response.items ?? []) {
      if (isOwnerSummary(item) && monthDay(item.profile?.birthDate) === todayMonthDay) {
        entries.push({
          id: item.id,
          name: item.fullName,
          type: 'owner',
          to: `/owners/${item.id}`
        });
      }

      if (isPatientSummary(item) && monthDay(item.birthDateApproximate) === todayMonthDay) {
        entries.push({
          id: item.id,
          name: item.name,
          type: 'patient',
          to: `/patients/${item.id}`
        });
      }
    }
  }

  birthdays.value = entries.slice(0, 10);
}

function countFromListResponse(response: ListResponse<unknown>): number {
  return response.total ?? response.items?.length ?? 0;
}

function resetHomeSummary() {
  for (const key of Object.keys(homeSummary) as HomeTileKey[]) {
    homeSummary[key] = 0;
  }
}

function hasPermission(permissionCode: string): boolean {
  return permissionCodes.value === null || permissionCodes.value.includes(permissionCode);
}

function hasAnyPermission(requiredPermissions: string[]): boolean {
  return (
    permissionCodes.value === null ||
    requiredPermissions.some((permissionCode) => permissionCodes.value?.includes(permissionCode))
  );
}

function lastThirtyDaysDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function monthDay(date?: string): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
}

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function isOwnerSummary(value: OwnerSummary | PatientSummary): value is OwnerSummary {
  return 'fullName' in value;
}

function isPatientSummary(value: OwnerSummary | PatientSummary): value is PatientSummary {
  return 'primaryOwnerId' in value;
}

onMounted(() => {
  void loadDashboard();
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

.home-shortcuts {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.home-shortcut {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  min-height: 112px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-text, #0f172a);
  text-decoration: none;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.home-shortcut__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.1);
}

.home-shortcut__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.home-shortcut__copy strong {
  font-size: 15px;
}

.home-shortcut__copy small {
  color: var(--color-text-muted, #64748b);
}

.home-shortcut__value {
  grid-column: 1 / -1;
  align-self: end;
  font-size: 26px;
  font-weight: 700;
}

.home-shortcut__value--error {
  color: var(--color-danger, #b91c1c);
}

.home-panels {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.8fr) minmax(260px, 0.9fr);
  gap: 16px;
}

.home-operational-summary {
  display: grid;
}

.home-metrics-card {
  min-height: auto;
}

.home-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.home-metric {
  display: grid;
  gap: 5px;
  min-height: 96px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(248, 250, 252, 0.9);
  color: var(--color-text, #0f172a);
  text-decoration: none;
}

.home-metric__label,
.home-metric small {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.home-metric strong {
  align-self: end;
  font-size: 22px;
  line-height: 1.1;
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

.panel-card__head--with-action {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-card__title {
  margin: 0;
  font-size: 18px;
  color: var(--color-text, #0f172a);
}

.panel-card__subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.panel-card__action {
  border: 1px solid rgba(14, 165, 233, 0.3);
  border-radius: 10px;
  padding: 8px 12px;
  background: rgba(14, 165, 233, 0.08);
  color: #0369a1;
  font-weight: 700;
  cursor: pointer;
}

.panel-loading {
  color: var(--color-text-muted, #64748b);
  font-size: 14px;
}

.counter-sale-list,
.birthday-list,
.reminder-list {
  display: grid;
  gap: 8px;
}

.counter-sale-item,
.birthday-item,
.reminder-item {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(248, 250, 252, 0.86);
  color: var(--color-text, #0f172a);
  text-decoration: none;
}

.reminder-item {
  grid-template-columns: 10px minmax(0, 1fr);
  align-items: center;
}

.reminder-item__tone {
  width: 8px;
  height: 38px;
  border-radius: 999px;
  background: #0ea5e9;
}

.reminder-item__tone--warning {
  background: #f59e0b;
}

.reminder-item__tone--success {
  background: #16a34a;
}

.reminder-item__copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.counter-sale-item__date,
.counter-sale-item span,
.birthday-item span,
.reminder-item small {
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
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
  .home-shortcuts {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .home-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .home-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1080px) {
  .dashboard-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .home-shortcuts,
  .domain-shortcuts,
  .home-metrics {
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

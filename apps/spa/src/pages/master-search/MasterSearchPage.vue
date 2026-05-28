<template>
  <div class="master-search-page">
    <AppPageHeader title="Busca federada" :breadcrumbs="['Console Enterprise', 'Utilidades', 'Busca Mestre']" subtitle="Busca mestre transversal para suporte operacional, relacionamento e conferência cadastral">
      <template #actions>
        <DsBadge variant="info" size="md">{{ totals.owners }} tutores</DsBadge>
        <DsBadge variant="info" size="md">{{ totals.patients }} pacientes</DsBadge>
        <DsBadge variant="info" size="md">{{ totals.products }} produtos</DsBadge>
        <DsBadge variant="info" size="md">{{ totals.counterSales }} comandas</DsBadge>
        <DsButton variant="secondary" :loading="loading" @click="runSearch">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <section class="master-search-page__actions">
      <DsCard title="Ações rápidas — busca mestre" variant="compact">
        <div class="quick-actions">
          <DsButton tag="a" to="/owners" variant="primary">Tutores</DsButton>
          <DsButton tag="a" to="/patients" variant="secondary">Pacientes</DsButton>
          <DsButton tag="a" to="/products" variant="secondary">Produtos</DsButton>
          <DsButton tag="a" to="/counter-sales" variant="secondary">Comandas</DsButton>
          <DsButton tag="a" to="/access-control" variant="secondary">Governança de Acesso</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="master-search-page__overview">
      <div class="overview-grid">
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.owners }}</span>
          <span class="overview-card__label">Tutores</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.patients }}</span>
          <span class="overview-card__label">Pacientes</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.links }}</span>
          <span class="overview-card__label">Vínculos</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.products }}</span>
          <span class="overview-card__label">Produtos</span>
        </div>
        <div class="overview-card">
          <span class="overview-card__value">{{ totals.counterSales }}</span>
          <span class="overview-card__label">Comandas</span>
        </div>
      </div>
    </section>

    <section class="search-bar">
      <DsInput
        v-model="query"
        type="search"
        placeholder="Buscar por tutor, paciente, documento, produto, comanda ou relação..."
        @input="onQueryInput"
        @keyup.enter="runSearch"
      />
      <DsButton :loading="loading" @click="runSearch">Buscar</DsButton>
      <DsButton v-if="query" variant="ghost" @click="clearSearch">Limpar</DsButton>
      <DsButton
        v-if="patients.length > 0"
        :variant="hasPriority360Filter ? 'primary' : 'secondary'"
        @click="togglePriority360Only"
      >
        {{ hasPriority360Filter ? 'Mostrar todos' : 'Filtrar prioridade 360' }}
      </DsButton>
    </section>

    <p v-if="query && !loading && hasResults" class="search-hint">
      <span class="search-hint__count">{{ totalResults }} resultado(s) para "{{ query }}"</span>
    </p>

    <section v-if="patients.length > 0" class="priority360-summary" aria-label="Resumo Prioridade 360">
      <div>
        <span class="priority360-summary__eyebrow">Triagem operacional</span>
        <h2>Resumo Prioridade 360</h2>
      </div>
      <div class="priority360-summary__grid">
        <button
          v-for="item in priority360Summary"
          :key="item.label"
          type="button"
          class="priority360-summary__item"
          :class="{ 'priority360-summary__item--active': priority360Filter === item.label }"
          @click="togglePriority360Severity(item.label)"
        >
          <span>{{ item.label }}</span>
          <strong>{{ item.count }}</strong>
        </button>
      </div>
      <p v-if="priority360Filter" class="priority360-summary__active">
        Filtro ativo: {{ priority360Filter }}
        <button type="button" @click="clearPriority360Filter">Limpar prioridade</button>
      </p>
    </section>

    <section v-if="loading" class="search-progress" aria-live="polite">
      <div>
        <strong>Carregando busca Premium...</strong>
        <p>Consultando tutores, pacientes, vínculos, produtos e comandas.</p>
      </div>
      <div class="search-progress__bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="searchWarnings.length" variant="warning" dismissible @dismiss="searchWarnings = []">
      Resultado parcial: {{ searchWarnings.join(', ') }} não responderam. Os demais grupos continuam disponíveis.
    </DsAlert>

    <div v-if="hasResults" class="results-grid">
      <DsCard title="Tutores" class="panel">
        <DataTable
          :columns="ownerColumns"
          :rows="owners"
          :loading="loading"
          empty-icon="👤"
          empty-title="Nenhum tutor encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-fullName="{ row }">
            <DsButton tag="a" :to="`/owners/${(row as OwnerSummary).id}`" variant="ghost" size="sm">
              {{ (row as OwnerSummary).fullName }}
            </DsButton>
          </template>
          <template #cell-contacts="{ row }">
            {{ contactSummary((row as OwnerSummary).contacts) }}
          </template>
          <template #cell-financialResponsible="{ row }">
            <StatusBadge
              :label="(row as OwnerSummary).financialResponsible ? 'Sim' : 'Não'"
              :variant="(row as OwnerSummary).financialResponsible ? 'success' : 'neutral'"
            />
          </template>
          <template #cell-status="{ row }">
            <StatusBadge
              :label="(row as OwnerSummary).status === 'active' ? 'Ativo' : 'Inativo'"
              :variant="(row as OwnerSummary).status === 'active' ? 'success' : 'danger'"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/owners/${(row as OwnerSummary).id}`" size="sm" variant="secondary">
              Ver
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Pacientes" class="panel">
        <DataTable
          :columns="patientColumns"
          :rows="visiblePatients"
          :loading="loading"
          empty-icon="🐾"
          empty-title="Nenhum paciente encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-name="{ row }">
            <DsButton tag="a" :to="`/patients/${(row as PatientSummary).id}`" variant="ghost" size="sm">
              {{ (row as PatientSummary).name }}
            </DsButton>
          </template>
          <template #cell-species="{ row }">
            {{ speciesLabel((row as PatientSummary).species) }}
          </template>
          <template #cell-sex="{ row }">
            {{ sexLabel((row as PatientSummary).sex) }}
          </template>
          <template #cell-primaryOwnerId="{ row }">
            {{ ownerNames[(row as PatientSummary).primaryOwnerId] || `Tutor ${(row as PatientSummary).primaryOwnerId.slice(0, 8)}...` }}
          </template>
          <template #cell-priority360="{ row }">
            <StatusBadge
              :label="patientPriority360((row as PatientSummary)).label"
              :variant="patientPriority360((row as PatientSummary)).variant"
              size="sm"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/patients/${(row as PatientSummary).id}`" size="sm" variant="secondary">
              Abrir cockpit
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Vínculos" class="panel">
        <DataTable
          :columns="linkColumns"
          :rows="visibleLinks"
          :loading="loading"
          empty-icon="🔗"
          empty-title="Nenhum vínculo encontrado"
          empty-description="Execute uma nova busca."
          variant="hoverable"
        >
          <template #cell-ownerId="{ row }">
            <DsButton
              tag="a"
              :to="`/owners/${(row as OwnerPatientLinkSummary).ownerId}`"
              variant="ghost"
              size="sm"
            >
              {{ ownerNames[(row as OwnerPatientLinkSummary).ownerId] || (row as OwnerPatientLinkSummary).ownerId.slice(0, 8) + '...' }}
            </DsButton>
          </template>
          <template #cell-patientId="{ row }">
            <DsButton
              tag="a"
              :to="`/patients/${(row as OwnerPatientLinkSummary).patientId}`"
              variant="ghost"
              size="sm"
            >
              {{ patientNames[(row as OwnerPatientLinkSummary).patientId] || (row as OwnerPatientLinkSummary).patientId.slice(0, 8) + '...' }}
            </DsButton>
          </template>
          <template #cell-relationshipType="{ row }">
            <DsBadge variant="info" size="sm">{{ relationshipLabel((row as OwnerPatientLinkSummary).relationshipType) }}</DsBadge>
          </template>
          <template #cell-financialResponsible="{ row }">
            <StatusBadge
              :label="(row as OwnerPatientLinkSummary).financialResponsible ? 'Sim' : 'Não'"
              :variant="(row as OwnerPatientLinkSummary).financialResponsible ? 'success' : 'neutral'"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/patients/${(row as OwnerPatientLinkSummary).patientId}`" size="sm" variant="secondary">
              Ver Paciente
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Produtos" class="panel">
        <DataTable
          :columns="productColumns"
          :rows="products"
          :loading="loading"
          empty-icon="🏷️"
          empty-title="Nenhum produto encontrado"
          empty-description="Busque por nome, código ou descrição."
          variant="hoverable"
        >
          <template #cell-name="{ row }">
            <DsButton tag="a" :to="`/products/${(row as ProductSummary).id}`" variant="ghost" size="sm">
              {{ (row as ProductSummary).name }}
            </DsButton>
          </template>
          <template #cell-basePrice="{ row }">
            {{ formatCurrency((row as ProductSummary).basePrice) }}
          </template>
          <template #cell-active="{ row }">
            <StatusBadge
              :label="(row as ProductSummary).active ? 'Ativo' : 'Inativo'"
              :variant="(row as ProductSummary).active ? 'success' : 'danger'"
            />
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/products/${(row as ProductSummary).id}`" size="sm" variant="secondary">
              Ver produto
            </DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Comandas" class="panel">
        <DataTable
          :columns="counterSaleColumns"
          :rows="counterSales"
          :loading="loading"
          empty-icon="🧾"
          empty-title="Nenhuma comanda encontrada"
          empty-description="Busque por número, tutor, paciente ou documento."
          variant="hoverable"
        >
          <template #cell-number="{ row }">
            <DsButton tag="a" :to="`/counter-sales/${(row as CounterSaleSummary).id}`" variant="ghost" size="sm">
              {{ (row as CounterSaleSummary).number }}
            </DsButton>
          </template>
          <template #cell-ownerId="{ row }">
            <DsButton
              v-if="(row as CounterSaleSummary).ownerId"
              tag="a"
              :to="`/owners/${(row as CounterSaleSummary).ownerId}`"
              variant="ghost"
              size="sm"
            >
              {{ ownerNames[(row as CounterSaleSummary).ownerId!] || (row as CounterSaleSummary).ownerId }}
            </DsButton>
            <span v-else>Sem tutor</span>
          </template>
          <template #cell-status="{ row }">
            <StatusBadge
              :label="counterSaleStatusLabel((row as CounterSaleSummary).status)"
              :variant="(row as CounterSaleSummary).status === 'open' ? 'warning' : (row as CounterSaleSummary).status === 'closed' ? 'success' : 'danger'"
            />
          </template>
          <template #cell-balanceDue="{ row }">
            {{ formatCurrency((row as CounterSaleSummary).balanceDue) }}
          </template>
          <template #cell-actions="{ row }">
            <DsButton tag="a" :to="`/counter-sales/${(row as CounterSaleSummary).id}`" size="sm" variant="secondary">
              Operar
            </DsButton>
          </template>
        </DataTable>
      </DsCard>
    </div>

    <DsAlert v-else-if="query && !loading" variant="info">
      Nenhum resultado encontrado para "{{ query }}". Tente buscar por outro termo.
    </DsAlert>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import { billingService } from '@/services/billing';
import { counterSalesService, type CounterSaleSummary } from '@/services/counterSales';
import { laboratoryService } from '@/services/laboratory';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { productsService, type ProductSummary } from '@/services/products';
import {
  vaccinesDewormersService,
  type PreventiveEventSummary
} from '@/services/vaccinesDewormers';
import type { BillingRecordSummary } from '@/types/billing';
import type { OwnerSummary } from '@/types/owner';
import type { OwnerPatientLinkSummary, PatientSummary } from '@/types/patient';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';

const PRIORITY360_FILTER_STORAGE_KEY = 'cvg-his-v2:master-search:priority360-filter';

const query = ref('');
const loading = ref(false);
const error = ref('');
const owners = ref<OwnerSummary[]>([]);
const patients = ref<PatientSummary[]>([]);
const links = ref<OwnerPatientLinkSummary[]>([]);
const products = ref<ProductSummary[]>([]);
const counterSales = ref<CounterSaleSummary[]>([]);
const laboratoryOrders = ref<DiagnosticOrderSummary[]>([]);
const preventiveEvents = ref<PreventiveEventSummary[]>([]);
const billingRecords = ref<BillingRecordSummary[]>([]);
const ownerNames = ref<Record<string, string>>({});
const patientNames = ref<Record<string, string>>({});
const searchWarnings = ref<string[]>([]);
const priority360Only = ref(false);
const priority360Filter = ref(readStoredPriority360Filter());

const totals = reactive({ owners: 0, patients: 0, links: 0, products: 0, counterSales: 0 });
const hasResults = computed(
  () =>
    owners.value.length > 0 ||
    patients.value.length > 0 ||
    links.value.length > 0 ||
    products.value.length > 0 ||
    counterSales.value.length > 0
);
const totalResults = computed(
  () => totals.owners + totals.patients + totals.links + totals.products + totals.counterSales
);
const sortedPatients = computed(() =>
  [...patients.value].sort((left, right) => {
    const severityDelta = patientPriority360(right).severity - patientPriority360(left).severity;
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return left.name.localeCompare(right.name, 'pt-BR');
  })
);
const visiblePatients = computed(() =>
  sortedPatients.value.filter((patient) => {
    const priority = patientPriority360(patient);
    if (priority360Filter.value) {
      return priority.label === priority360Filter.value;
    }

    return priority360Only.value ? priority.active : true;
  })
);
const visiblePatientIds = computed(() => new Set(visiblePatients.value.map((patient) => patient.id)));
const visibleLinks = computed(() =>
  hasPriority360Filter.value ? links.value.filter((link) => visiblePatientIds.value.has(link.patientId)) : links.value
);
const priority360Summary = computed(() => {
  const summary = new Map<string, { label: string; count: number; severity: number }>();

  for (const patient of patients.value) {
    const priority = patientPriority360(patient);
    const current = summary.get(priority.label);
    summary.set(priority.label, {
      label: priority.label,
      count: (current?.count ?? 0) + 1,
      severity: priority.severity
    });
  }

  return [...summary.values()].sort((left, right) => right.severity - left.severity);
});
const hasPriority360Filter = computed(() => priority360Only.value || Boolean(priority360Filter.value));

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function onQueryInput() {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (query.value.trim().length >= 2) {
      void runSearch();
    }
  }, 400);
}

function togglePriority360Only() {
  if (hasPriority360Filter.value) {
    clearPriority360Filter();
    return;
  }

  priority360Only.value = true;
}

function togglePriority360Severity(label: string) {
  priority360Only.value = false;
  priority360Filter.value = priority360Filter.value === label ? '' : label;
  persistPriority360Filter();
}

function clearPriority360Filter() {
  priority360Only.value = false;
  priority360Filter.value = '';
  persistPriority360Filter();
}

function readStoredPriority360Filter(): string {
  try {
    return localStorage.getItem(PRIORITY360_FILTER_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function persistPriority360Filter() {
  try {
    if (priority360Filter.value) {
      localStorage.setItem(PRIORITY360_FILTER_STORAGE_KEY, priority360Filter.value);
    } else {
      localStorage.removeItem(PRIORITY360_FILTER_STORAGE_KEY);
    }
  } catch {
    // Storage is optional; filtering must keep working when it is unavailable.
  }
}

const ownerColumns: DataTableColumn[] = [
  { key: 'fullName', label: 'Tutor' },
  { key: 'documentId', label: 'Documento' },
  { key: 'contacts', label: 'Contato' },
  { key: 'financialResponsible', label: 'Financeiro' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const patientColumns: DataTableColumn[] = [
  { key: 'name', label: 'Paciente' },
  { key: 'species', label: 'Espécie' },
  { key: 'sex', label: 'Sexo' },
  { key: 'primaryOwnerId', label: 'Tutor' },
  { key: 'priority360', label: 'Prioridade 360' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const linkColumns: DataTableColumn[] = [
  { key: 'ownerId', label: 'Tutor' },
  { key: 'patientId', label: 'Paciente' },
  { key: 'relationshipType', label: 'Relação' },
  { key: 'financialResponsible', label: 'Financeiro' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const productColumns: DataTableColumn[] = [
  { key: 'name', label: 'Produto' },
  { key: 'code', label: 'Código' },
  { key: 'basePrice', label: 'Preço' },
  { key: 'active', label: 'Status' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

const counterSaleColumns: DataTableColumn[] = [
  { key: 'number', label: 'Comanda' },
  { key: 'ownerId', label: 'Tutor' },
  { key: 'status', label: 'Status' },
  { key: 'balanceDue', label: 'Saldo' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];

function contactSummary(contacts: OwnerSummary['contacts']) {
  return contacts.length > 0 ? contacts[0]?.value : 'Sem contato';
}

function sexLabel(sex: PatientSummary['sex']) {
  if (sex === 'male') return 'Macho';
  if (sex === 'female') return 'Fêmea';
  return 'Indefinido';
}

function speciesLabel(species: string) {
  return species || '—';
}

function patientPriority360(patient: PatientSummary): {
  label: string;
  variant: 'warning' | 'success';
  active: boolean;
  severity: number;
} {
  const pendingLaboratoryCount = laboratoryOrders.value.filter(
    (order) =>
      order.patientId === patient.id && (order.status === 'requested' || order.status === 'collected')
  ).length;
  const overduePreventiveCount = preventiveEvents.value.filter(
    (event) =>
      (event.patientId === patient.id || event.animalName === patient.name) &&
      event.status === 'scheduled' &&
      isPastDate(event.eventDate)
  ).length;
  const openBillingAmount = billingRecords.value
    .filter((record) => record.patientId === patient.id && record.status !== 'settled')
    .reduce((sum, record) => sum + record.subtotalAmount, 0);

  if (pendingLaboratoryCount > 0) {
    return { label: 'Exames pendentes', variant: 'warning', active: true, severity: 4 };
  }

  if (overduePreventiveCount > 0) {
    return { label: 'Preventivo vencido', variant: 'warning', active: true, severity: 3 };
  }

  if (openBillingAmount > 0) {
    return { label: 'Pendência financeira', variant: 'warning', active: true, severity: 2 };
  }

  if (patient.chronicDisease || patient.allergy) {
    return { label: 'Atenção clínica', variant: 'warning', active: true, severity: 1 };
  }

  return { label: 'Sem alerta', variant: 'success', active: false, severity: 0 };
}

function isPastDate(value: string): boolean {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() < today.getTime();
}

function relationshipLabel(type: OwnerPatientLinkSummary['relationshipType']) {
  if (type === 'primary') return 'Principal';
  if (type === 'secondary') return 'Secundário';
  if (type === 'financial') return 'Financeiro';
  return type;
}

function counterSaleStatusLabel(status: CounterSaleSummary['status']) {
  if (status === 'open') return 'Aberta';
  if (status === 'closed') return 'Fechada';
  if (status === 'cancelled') return 'Cancelada';
  return status;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function loadEntityNames() {
  const allOwners = await ownerService.list();
  const allPatients = await patientService.list();
  for (const o of allOwners) {
    ownerNames.value[o.id] = o.fullName;
  }
  for (const p of allPatients) {
    patientNames.value[p.id] = p.name;
  }
}

async function runSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }

  if (!query.value.trim()) return;
  loading.value = true;
  error.value = '';
  searchWarnings.value = [];
  resetResults();
  try {
    const search = query.value.trim();
    const [ownersResult, patientsResult, productsResult, counterSalesResult] = await Promise.allSettled([
      ownerService.list(search),
      patientService.list(search),
      productsService.list(search),
      counterSalesService.list({ search, status: 'all' })
    ]);

    owners.value = readSearchResult(ownersResult, 'tutores');
    patients.value = readSearchResult(patientsResult, 'pacientes');
    products.value = readSearchResult(productsResult, 'produtos');
    counterSales.value = readSearchResult(counterSalesResult, 'comandas');
    await loadPatientPriorityContext(patients.value);
    links.value = patients.value
      .filter((p) => ownerNames.value[p.primaryOwnerId])
      .map((p) => ({
        id: `link-${p.id}`,
        accountId: p.accountId,
        ownerId: p.primaryOwnerId,
        patientId: p.id,
        relationshipType: 'primary' as const,
        financialResponsible: true,
        createdAt: p.createdAt
      }));
    totals.owners = owners.value.length;
    totals.patients = patients.value.length;
    totals.links = links.value.length;
    totals.products = products.value.length;
    totals.counterSales = counterSales.value.length;

    if (searchWarnings.value.length === 4) {
      error.value = 'Falha ao executar busca federada em todos os grupos.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao executar busca federada';
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  query.value = '';
  error.value = '';
  searchWarnings.value = [];
  clearPriority360Filter();
  resetResults();
}

function resetResults() {
  owners.value = [];
  patients.value = [];
  links.value = [];
  products.value = [];
  counterSales.value = [];
  laboratoryOrders.value = [];
  preventiveEvents.value = [];
  billingRecords.value = [];
  totals.owners = 0;
  totals.patients = 0;
  totals.links = 0;
  totals.products = 0;
  totals.counterSales = 0;
}

async function loadPatientPriorityContext(patientItems: PatientSummary[]) {
  if (patientItems.length === 0) {
    laboratoryOrders.value = [];
    preventiveEvents.value = [];
    billingRecords.value = [];
    return;
  }

  const contextResults = await Promise.allSettled(
    patientItems.flatMap((patient) => [
      laboratoryService.listOrders({ patientId: patient.id }),
      vaccinesDewormersService.list({
        patientId: patient.id,
        ownerId: patient.primaryOwnerId,
        includeExecuted: true
      }),
      billingService.list({ ownerId: patient.primaryOwnerId })
    ])
  );

  laboratoryOrders.value = contextResults
    .filter(
      (result): result is PromiseFulfilledResult<DiagnosticOrderSummary[]> =>
        result.status === 'fulfilled' && isDiagnosticOrderList(result.value)
    )
    .flatMap((result) => result.value);

  preventiveEvents.value = contextResults
    .filter(
      (result): result is PromiseFulfilledResult<PreventiveEventSummary[]> =>
        result.status === 'fulfilled' && isPreventiveEventList(result.value)
    )
    .flatMap((result) => result.value);

  billingRecords.value = contextResults
    .filter(
      (result): result is PromiseFulfilledResult<BillingRecordSummary[]> =>
        result.status === 'fulfilled' && isBillingRecordList(result.value)
    )
    .flatMap((result) => result.value);
}

function isDiagnosticOrderList(value: unknown[]): value is DiagnosticOrderSummary[] {
  return value.every(
    (item) => typeof item === 'object' && item !== null && 'examType' in item && 'status' in item
  );
}

function isPreventiveEventList(value: unknown[]): value is PreventiveEventSummary[] {
  return value.every(
    (item) => typeof item === 'object' && item !== null && 'itemType' in item && 'eventDate' in item
  );
}

function isBillingRecordList(value: unknown[]): value is BillingRecordSummary[] {
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      'subtotalAmount' in item &&
      'ownerId' in item &&
      'patientId' in item
  );
}

function readSearchResult<T>(result: PromiseSettledResult<T[]>, label: string): T[] {
  if (result.status === 'fulfilled') {
    return result.value;
  }

  searchWarnings.value = [...searchWarnings.value, label];
  return [];
}

onMounted(async () => {
  await loadEntityNames();
  if (query.value.trim()) {
    await runSearch();
  }
});
</script>

<style scoped>
.master-search-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.overview-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-card__value {
  display: block;
  font-size: 28px;
  font-weight: 800;
}

.overview-card__label {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted, #64748b);
}

.master-search-page__actions {
  margin-bottom: 4px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}

.search-hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.search-hint__count {
  font-weight: 500;
}

.search-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: #f8fafc;
}

.search-progress strong {
  color: var(--color-text, #0f172a);
}

.search-progress p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.search-progress__bars {
  display: grid;
  gap: 5px;
  width: min(220px, 32vw);
}

.search-progress__bars span {
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, #e2e8f0, #bae6fd, #e2e8f0);
  background-size: 180% 100%;
  animation: search-progress-pulse 1.4s ease-in-out infinite;
}

.search-progress__bars span:nth-child(2) {
  width: 78%;
  animation-delay: 0.15s;
}

.search-progress__bars span:nth-child(3) {
  width: 58%;
  animation-delay: 0.3s;
}

.priority360-summary {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border, #dbe3ef);
  border-radius: 8px;
  background: #ffffff;
}

.priority360-summary__eyebrow {
  color: var(--color-text-muted, #64748b);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.priority360-summary h2 {
  margin: 2px 0 0;
  color: var(--color-text, #0f172a);
  font-size: 18px;
}

.priority360-summary__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.priority360-summary__item {
  display: grid;
  gap: 4px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
}

.priority360-summary__item span {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.priority360-summary__item strong {
  color: var(--color-text, #0f172a);
  font-size: 20px;
}

.priority360-summary__item--active {
  border-color: #0f766e;
  background: #ecfdf5;
}

.priority360-summary__active {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.priority360-summary__active button {
  margin-left: 8px;
  border: 0;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  font-weight: 700;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}

.panel {
  border-radius: 18px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@keyframes search-progress-pulse {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}

@media (max-width: 720px) {
  .search-progress {
    display: grid;
  }

  .search-progress__bars {
    width: 100%;
  }
}
</style>

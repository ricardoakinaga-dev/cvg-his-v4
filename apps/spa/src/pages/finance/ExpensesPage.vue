<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Custos e Despesas"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Custos e Despesas']"
      subtitle="Catálogo financeiro com persistência server-side, categorias padronizadas, vínculo obrigatório a centros de custo e paginação operacional"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" @click="startCreate">+ Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Esta etapa consolida <strong>Custos e Despesas</strong> com backend dedicado, centros de custo compartilhados e paginação server-side.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${pagination.totalItems} registro(s)`" value="" icon="🧾" />
      <DsStatCard :label="`${fixedCount} fixo(s)`" value="" icon="📌" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="" icon="🏥" />
      <DsStatCard :label="`${categories.length} categoria(s) padronizada(s)`" value="" icon="🗂️" />
      <DsStatCard :label="`${costCenters.length} centro(s) de custo`" value="" icon="🏷️" />
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">{{ successMessage }}</DsAlert>

    <DsCard title="Linha do tempo operacional do Financeiro">
      <div class="catalog-kpis catalog-kpis--audit">
        <DsStatCard :label="`${financeAuditKpis.total} evento(s)`" value="" icon="🧭" />
        <DsStatCard :label="`${financeAuditKpis.expenseEvents} evento(s) de despesas`" value="" icon="🧾" />
        <DsStatCard :label="`${financeAuditKpis.costCenterEvents} evento(s) de centros`" value="" icon="🏷️" />
        <DsStatCard :label="`${financeAuditKpis.correlatedTrails} trilha(s) correlacionada(s)`" value="" icon="🔗" />
      </div>

      <div class="catalog-toolbar catalog-toolbar--three">
        <input v-model="auditFilters.action" type="search" placeholder="Filtrar por ação ou resumo da trilha" class="catalog-search" />
        <input v-model="auditFilters.entity" type="search" placeholder="Filtrar por entidade ou id afetado" class="catalog-search" />
        <input v-model="auditFilters.correlationId" type="search" placeholder="Filtrar por correlationId" class="catalog-search" />
      </div>

      <div v-if="groupedAuditTrails.length === 0" class="catalog-empty">
        Nenhum evento financeiro encontrado para os filtros atuais.
      </div>

      <div v-else class="finance-audit-timeline">
        <details v-for="trail in groupedAuditTrails" :key="trail.correlationId" class="finance-audit-group" open>
          <summary class="finance-audit-group__summary">
            <div>
              <strong>{{ trail.correlationId }}</strong>
              <div class="catalog-inline-hint">{{ trail.events.length }} evento(s) na trilha</div>
            </div>
            <DsButton tag="a" :to="trail.href" variant="secondary" size="sm">Abrir Auditoria</DsButton>
          </summary>
          <article v-for="event in trail.events" :key="event.eventId" class="finance-audit-event">
            <div class="finance-audit-event__meta">
              <div>
                <strong>{{ event.action }}</strong>
                <div class="catalog-inline-hint">{{ event.entityType }} · {{ event.entityId }}</div>
              </div>
              <DsBadge variant="info" size="sm">{{ event.correlationId }}</DsBadge>
            </div>
            <p class="finance-audit-event__summary">{{ event.payloadSummary }}</p>
            <div class="finance-audit-event__footer">
              <span>{{ new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.occurredAt)) }}</span>
              <span>ator {{ event.actorId }}</span>
            </div>
          </article>
        </details>
      </div>
    </DsCard>

    <DsCard v-if="showForm" :title="editingId ? 'Editar custo ou despesa' : 'Novo custo ou despesa'">
      <form class="creation-form" @submit.prevent="submitExpense">
        <input v-model="form.name" type="text" placeholder="Nome do lançamento" class="catalog-search" />
        <input v-model="form.kind" type="text" placeholder="Tipo (ex: Variável)" class="catalog-search" />

        <select v-model="form.category" aria-label="Categoria do lançamento" class="catalog-search">
          <option value="">Selecione a categoria</option>
          <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
        </select>

        <select v-model="form.costCenterCode" aria-label="Centro de custo do lançamento" class="catalog-search">
          <option value="">Selecione o centro de custo</option>
          <option v-for="center in costCenters" :key="center.code" :value="center.code">
            {{ center.name }} ({{ center.code }})
          </option>
        </select>

        <input v-model="form.description" type="text" placeholder="Descrição operacional" class="catalog-search" />
        <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
          <DsButton type="submit" variant="primary" :loading="submitting">{{ editingId ? 'Salvar alterações' : 'Salvar registro' }}</DsButton>
          <DsButton variant="ghost" @click="cancelForm">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>

    <DsCard title="Cadastro de custos e despesas">
      <div class="catalog-toolbar catalog-toolbar--five">
        <input v-model="filters.id" type="search" placeholder="Id" class="catalog-search" />
        <input v-model="filters.name" type="search" placeholder="Nome" class="catalog-search" />
        <input v-model="filters.category" type="search" placeholder="Categoria" class="catalog-search" />
        <input v-model="filters.costCenter" type="search" placeholder="Centro de custo" class="catalog-search" />
        <input v-model="filters.description" type="search" placeholder="Descrição" class="catalog-search" />
      </div>

      <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
        <DsButton variant="secondary" :loading="loading" @click="searchExpenses">Pesquisar</DsButton>
      </div>

      <div class="catalog-pagination" v-if="pagination.totalItems > 0">
        <span class="catalog-inline-hint">
          Página {{ pagination.page }} de {{ pagination.totalPages }} · {{ pagination.totalItems }} registro(s)
        </span>
        <div class="catalog-toolbar__actions">
          <DsButton variant="ghost" size="sm" :disabled="pagination.page <= 1 || loading" @click="goToPage(pagination.page - 1)">Página anterior</DsButton>
          <DsButton variant="ghost" size="sm" :disabled="pagination.page >= pagination.totalPages || loading" @click="goToPage(pagination.page + 1)">Próxima página</DsButton>
        </div>
      </div>

      <div v-if="expenses.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <table v-else class="catalog-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Centro de custo</th>
            <th>Descrição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in expenses" :key="expense.id">
            <td>{{ expense.id }}</td>
            <td>{{ expense.name }}</td>
            <td>{{ expense.category }}</td>
            <td>
              <strong>{{ expense.costCenterName }}</strong>
              <div class="catalog-inline-hint">{{ expense.costCenterCode }}</div>
            </td>
            <td>{{ expense.description }}</td>
            <td>
              <div class="row-actions">
                <DsButton variant="secondary" size="sm" @click="startEdit(expense)">Editar</DsButton>
                <DsButton variant="ghost" size="sm" @click="removeExpense(expense.id)">Remover</DsButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { auditService } from '@/services/audit';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';
import {
  expensesCatalogService,
  type ExpenseCatalogItem,
  type ExpenseCostCenterItem,
  type ExpenseCatalogListFilters
} from '@/services/expensesCatalog';

const filters = reactive({ id: '', name: '', category: '', costCenter: '', description: '' });
const auditFilters = reactive({ action: '', entity: '', correlationId: '' });
const form = reactive({ name: '', kind: '', category: '', costCenterCode: '', description: '' });
const expenses = ref<ExpenseCatalogItem[]>([]);
const categories = ref<string[]>([]);
const costCenters = ref<ExpenseCostCenterItem[]>([]);
const financeAuditEvents = ref<AuditEventSummary[]>([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const showForm = ref(true);
const editingId = ref<string | null>(null);
const pagination = reactive({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1, sort: 'name', order: 'asc' as 'asc' | 'desc' });

const fixedCount = computed(() => expenses.value.filter((item) => item.kind === 'Fixo').length);
const operationalCount = computed(() => expenses.value.filter((item) => item.kind === 'Operacional').length);
const filteredFinanceAuditEvents = computed(() => {
  const actionNeedle = auditFilters.action.trim().toLowerCase();
  const entityNeedle = auditFilters.entity.trim().toLowerCase();
  const correlationNeedle = auditFilters.correlationId.trim().toLowerCase();

  return financeAuditEvents.value.filter((event) => {
    const matchesAction =
      !actionNeedle ||
      [event.action, event.payloadSummary].some((value) => String(value ?? '').toLowerCase().includes(actionNeedle));
    const matchesEntity =
      !entityNeedle ||
      [event.entityType, event.entityId, event.payloadSummary].some((value) => String(value ?? '').toLowerCase().includes(entityNeedle));
    const matchesCorrelation = !correlationNeedle || String(event.correlationId ?? '').toLowerCase().includes(correlationNeedle);
    return matchesAction && matchesEntity && matchesCorrelation;
  });
});
const financeAuditKpis = computed(() => ({
  total: financeAuditEvents.value.length,
  expenseEvents: financeAuditEvents.value.filter((event) => event.entityType === 'expense-catalog').length,
  costCenterEvents: financeAuditEvents.value.filter((event) => event.entityType === 'cost-center-catalog').length,
  correlatedTrails: new Set(financeAuditEvents.value.map((event) => event.correlationId)).size
}));
const groupedAuditTrails = computed(() => {
  const groups = new Map<string, AuditEventSummary[]>();
  for (const event of filteredFinanceAuditEvents.value) {
    const key = event.correlationId || 'sem-correlation-id';
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].map(([correlationId, events]) => ({
    correlationId,
    events: [...events].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()),
    href: `/audit?q=${encodeURIComponent('billing')}&correlationId=${encodeURIComponent(correlationId)}&entity=${encodeURIComponent(events[0]?.entityId ?? '')}&origin=${encodeURIComponent('/expenses')}&originLabel=${encodeURIComponent('Voltar para Custos e Despesas')}`
  }));
});

function resetForm() {
  form.name = '';
  form.kind = '';
  form.category = '';
  form.costCenterCode = '';
  form.description = '';
  editingId.value = null;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(expense: ExpenseCatalogItem) {
  form.name = expense.name;
  form.kind = expense.kind;
  form.category = expense.category;
  form.costCenterCode = expense.costCenterCode;
  form.description = expense.description;
  editingId.value = expense.id;
  showForm.value = true;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
}

function buildServerFilters(pageOverride?: number): ExpenseCatalogListFilters {
  return {
    search: filters.name || undefined,
    category: filters.category || undefined,
    costCenter: filters.costCenter || undefined,
    page: pageOverride ?? pagination.page,
    pageSize: pagination.pageSize,
    sort: pagination.sort as ExpenseCatalogListFilters['sort'],
    order: pagination.order
  };
}

async function loadExpenses(serverFilters?: ExpenseCatalogListFilters) {
  loading.value = true;
  error.value = '';
  try {
    const response = await expensesCatalogService.list(serverFilters);
    expenses.value = response.items ?? [];
    categories.value = response.categories ?? [];
    costCenters.value = response.costCenters ?? [];
    pagination.page = response.page ?? 1;
    pagination.pageSize = response.pageSize ?? pagination.pageSize;
    pagination.totalItems = response.totalItems ?? expenses.value.length;
    pagination.totalPages = response.totalPages ?? 1;
    pagination.sort = response.sort ?? 'name';
    pagination.order = (response.order as 'asc' | 'desc') ?? 'asc';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar custos e despesas';
    expenses.value = [];
    categories.value = [];
    costCenters.value = [];
    pagination.totalItems = 0;
    pagination.totalPages = 1;
  } finally {
    loading.value = false;
  }
}

async function loadFinanceAuditTrail() {
  try {
    const events = await auditService.listEvents({
      module: 'billing',
      entityTypes: ['expense-catalog', 'cost-center-catalog'],
      limit: 50
    });
    financeAuditEvents.value = events
      .filter(
        (event) =>
          event.module === 'billing' &&
          (event.entityType === 'expense-catalog' || event.entityType === 'cost-center-catalog')
      )
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  } catch {
    financeAuditEvents.value = [];
  }
}

async function reload() {
  await Promise.all([loadExpenses(buildServerFilters()), loadFinanceAuditTrail()]);
}

async function searchExpenses() {
  pagination.page = 1;
  await loadExpenses(buildServerFilters(1));
}

async function goToPage(page: number) {
  await loadExpenses(buildServerFilters(page));
}

async function submitExpense() {
  error.value = '';
  successMessage.value = '';
  if (!form.name.trim() || !form.category.trim() || !form.costCenterCode.trim() || !form.description.trim()) {
    error.value = 'Nome, categoria, centro de custo e descrição são obrigatórios';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await expensesCatalogService.update(editingId.value, {
        name: form.name,
        kind: form.kind || 'Variável',
        category: form.category,
        costCenterCode: form.costCenterCode,
        description: form.description
      });
      expenses.value = expenses.value.map((item) => (item.id === editingId.value ? updated : item));
      successMessage.value = 'Registro atualizado com sucesso';
    } else {
      const created = await expensesCatalogService.create({
        name: form.name,
        kind: form.kind || 'Variável',
        category: form.category,
        costCenterCode: form.costCenterCode,
        description: form.description
      });
      expenses.value = [created, ...expenses.value].slice(0, pagination.pageSize);
      pagination.totalItems += 1;
      pagination.totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
      successMessage.value = 'Registro criado com sucesso';
    }
    resetForm();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar registro';
  } finally {
    submitting.value = false;
  }
}

async function removeExpense(id: string) {
  error.value = '';
  successMessage.value = '';
  try {
    await expensesCatalogService.remove(id);
    expenses.value = expenses.value.filter((item) => item.id !== id);
    pagination.totalItems = Math.max(0, pagination.totalItems - 1);
    pagination.totalPages = Math.max(1, Math.ceil(Math.max(pagination.totalItems, 1) / pagination.pageSize));
    successMessage.value = 'Registro removido com sucesso';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao remover registro';
  }
}

onMounted(() => {
  void Promise.all([loadExpenses(buildServerFilters()), loadFinanceAuditTrail()]);
});
</script>

<style scoped>
.finance-catalog-page {
  display: grid;
  gap: 16px;
}
.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.catalog-toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}
.catalog-toolbar--five {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}
.catalog-toolbar--three {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.catalog-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.catalog-toolbar__actions--bottom { margin-bottom: 12px; }
.catalog-search {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #dbe3ef);
  padding: 0 14px;
  background: var(--color-surface, #fff);
}
.creation-form {
  display: grid;
  gap: 12px;
}
.catalog-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.catalog-table {
  width: 100%;
  border-collapse: collapse;
}
.catalog-table th,
.catalog-table td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  vertical-align: top;
}
.catalog-table th {
  font-size: 13px;
  color: #475569;
}
.catalog-inline-hint {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}
.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.catalog-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: #64748b;
}
.finance-audit-timeline {
  display: grid;
  gap: 12px;
}
.finance-audit-group {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--color-surface, #fff), var(--color-bg-subtle, #f8fafc));
  overflow: hidden;
}
.finance-audit-group__summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  cursor: pointer;
}
.finance-audit-group__summary::-webkit-details-marker {
  display: none;
}
.finance-audit-event {
  border-top: 1px solid var(--color-border, #e2e8f0);
  padding: 14px;
}
.finance-audit-event__meta {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}
.finance-audit-event__summary {
  margin: 10px 0;
  color: var(--color-text, #0f172a);
}
.finance-audit-event__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #64748b;
}
</style>

<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Centros de Custo"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Centros de Custo']"
      subtitle="Fonte backend compartilhada para rateio financeiro, leitura gerencial e reaproveitamento em Custos e Despesas"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" @click="startCreate">Novo Centro</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Superfície conectada ao backend compartilhado de <strong>Centros de Custo</strong>, agora com CRUD administrável e paginação server-side.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${pagination.totalItems} centro(s)`" value="" icon="📊" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="" icon="🏥" />
      <DsStatCard :label="`${administrativeCount} administrativo(s)`" value="" icon="🧾" />
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">{{ successMessage }}</DsAlert>

    <DsCard title="Linha do tempo gerencial dos Centros de Custo">
      <div class="catalog-toolbar">
        <input v-model="auditFilters.correlationId" type="search" placeholder="Filtrar por correlationId da trilha" class="catalog-search" />
      </div>

      <div v-if="groupedAuditTrails.length === 0" class="catalog-empty">Nenhuma trilha gerencial encontrada.</div>

      <div v-else class="audit-trail-grid">
        <details v-for="trail in groupedAuditTrails" :key="trail.correlationId" class="audit-trail-card" open>
          <summary class="audit-trail-card__head">
            <strong>{{ trail.correlationId }}</strong>
            <DsButton tag="a" :to="trail.href" variant="secondary" size="sm">Abrir Auditoria</DsButton>
          </summary>
          <div class="audit-trail-card__events">
            <div v-for="event in trail.events" :key="event.eventId" class="audit-trail-card__event">
              <div class="audit-trail-card__meta">
                <span>{{ event.action }}</span>
                <DsBadge variant="info" size="sm">{{ event.entityId }}</DsBadge>
              </div>
              <p>{{ event.payloadSummary }}</p>
            </div>
          </div>
        </details>
      </div>
    </DsCard>

    <DsCard v-if="showForm" :title="editingCode ? 'Editar centro de custo' : 'Novo centro de custo'">
      <form class="creation-form" @submit.prevent="submitCostCenter">
        <input v-model="form.code" type="text" placeholder="Código do centro" class="catalog-search" :disabled="Boolean(editingCode)" />
        <input v-model="form.name" type="text" placeholder="Nome do centro" class="catalog-search" />
        <select v-model="form.kind" aria-label="Tipo do centro de custo" class="catalog-search">
          <option value="">Selecione o tipo</option>
          <option value="Operacional">Operacional</option>
          <option value="Administrativo">Administrativo</option>
        </select>
        <input v-model="form.owner" type="text" placeholder="Responsável pelo centro" class="catalog-search" />
        <input v-model="form.description" type="text" placeholder="Descrição operacional do centro" class="catalog-search" />
        <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
          <DsButton type="submit" variant="primary" :loading="submitting">{{ editingCode ? 'Salvar alterações' : 'Salvar centro' }}</DsButton>
          <DsButton variant="ghost" @click="cancelForm">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>

    <DsCard title="Mapa inicial de centros">
      <div class="catalog-pagination" v-if="costCenters.length > 0">
        <span class="catalog-inline-hint">Página {{ pagination.page }} de {{ pagination.totalPages }}</span>
        <div class="catalog-toolbar__actions">
          <DsButton variant="ghost" size="sm" :disabled="pagination.page <= 1 || loading" @click="goToPage(pagination.page - 1)">Página anterior</DsButton>
          <DsButton variant="ghost" size="sm" :disabled="pagination.page >= pagination.totalPages || loading" @click="goToPage(pagination.page + 1)">Próxima página</DsButton>
        </div>
      </div>

      <div class="catalog-grid">
        <article v-for="center in costCenters" :key="center.code" class="catalog-item">
          <div class="catalog-item__head">
            <strong>{{ center.name }}</strong>
            <span class="catalog-item__badge">{{ center.kind }}</span>
          </div>
          <p class="catalog-item__meta">Código: {{ center.code }} · Responsável: {{ center.owner }}</p>
          <p class="catalog-item__hint">{{ center.description }}</p>
          <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
            <DsButton variant="secondary" size="sm" @click="startEdit(center)">Editar</DsButton>
            <DsButton variant="ghost" size="sm" @click="removeCostCenter(center.code)">Remover</DsButton>
          </div>
        </article>
      </div>
    </DsCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { auditService } from '@/services/audit';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';
import { costCentersCatalogService, type CostCenterCatalogItem } from '@/services/costCentersCatalog';

const route = useRoute();
const costCenters = ref<CostCenterCatalogItem[]>([]);
const financeAuditEvents = ref<AuditEventSummary[]>([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const showForm = ref(true);
const editingCode = ref<string | null>(null);
const form = reactive({ code: '', name: '', kind: '', owner: '', description: '' });
const auditFilters = reactive({ correlationId: '' });
const pagination = ref({ page: 1, pageSize: 2, totalItems: 0, totalPages: 1, sort: 'name', order: 'asc' as 'asc' | 'desc' });

const operationalCount = computed(() => costCenters.value.filter((item) => item.kind === 'Operacional').length);
const administrativeCount = computed(() => costCenters.value.filter((item) => item.kind === 'Administrativo').length);
const filteredFinanceAuditEvents = computed(() => {
  const correlationNeedle = auditFilters.correlationId.trim().toLowerCase();
  return financeAuditEvents.value.filter((event) => !correlationNeedle || event.correlationId.toLowerCase().includes(correlationNeedle));
});
const groupedAuditTrails = computed(() => {
  const groups = new Map<string, AuditEventSummary[]>();
  for (const event of filteredFinanceAuditEvents.value) {
    const key = event.correlationId || 'sem-correlation-id';
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].map(([correlationId, events]) => ({
    correlationId,
    events: [...events].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()),
    href: `/audit?q=${encodeURIComponent('cost center')}&correlationId=${encodeURIComponent(correlationId)}&entity=${encodeURIComponent(events[0]?.entityId ?? '')}&origin=${encodeURIComponent('/cost-centers')}&originLabel=${encodeURIComponent('Voltar para Centros de Custo')}`
  }));
});

function resetForm() {
  form.code = '';
  form.name = '';
  form.kind = '';
  form.owner = '';
  form.description = '';
  editingCode.value = null;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(center: CostCenterCatalogItem) {
  form.code = center.code;
  form.name = center.name;
  form.kind = center.kind;
  form.owner = center.owner;
  form.description = center.description;
  editingCode.value = center.code;
  showForm.value = true;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
}

async function loadCostCenters(page = pagination.value.page) {
  loading.value = true;
  error.value = '';
  try {
    const response = await costCentersCatalogService.list({
      page,
      pageSize: pagination.value.pageSize,
      sort: pagination.value.sort as 'name' | 'code' | 'kind' | 'owner',
      order: pagination.value.order
    });
    costCenters.value = response.items ?? [];
    pagination.value = {
      page: response.page,
      pageSize: response.pageSize,
      totalItems: response.totalItems,
      totalPages: response.totalPages,
      sort: response.sort,
      order: response.order as 'asc' | 'desc'
    };
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar centros de custo';
    costCenters.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadFinanceAuditTrail() {
  try {
    const events = await auditService.listEvents({
      module: 'billing',
      entityTypes: ['cost-center-catalog'],
      limit: 50
    });
    financeAuditEvents.value = events
      .filter((event) => event.module === 'billing' && event.entityType === 'cost-center-catalog')
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  } catch {
    financeAuditEvents.value = [];
  }
}

async function reload() {
  await Promise.all([loadCostCenters(pagination.value.page), loadFinanceAuditTrail()]);
}

async function goToPage(page: number) {
  await loadCostCenters(page);
}

async function submitCostCenter() {
  error.value = '';
  successMessage.value = '';
  if (!form.code.trim() || !form.name.trim() || !form.kind.trim() || !form.owner.trim() || !form.description.trim()) {
    error.value = 'Código, nome, tipo, responsável e descrição são obrigatórios';
    return;
  }

  submitting.value = true;
  try {
    if (editingCode.value) {
      const updated = await costCentersCatalogService.update(editingCode.value, {
        code: form.code,
        name: form.name,
        kind: form.kind,
        owner: form.owner,
        description: form.description
      });
      costCenters.value = costCenters.value.map((item) => (item.code === editingCode.value ? updated : item));
      successMessage.value = 'Registro atualizado com sucesso';
    } else {
      const created = await costCentersCatalogService.create({
        code: form.code,
        name: form.name,
        kind: form.kind,
        owner: form.owner,
        description: form.description
      });
      costCenters.value = [created, ...costCenters.value].slice(0, pagination.value.pageSize);
      pagination.value.totalItems += 1;
      pagination.value.totalPages = Math.max(1, Math.ceil(pagination.value.totalItems / pagination.value.pageSize));
      successMessage.value = 'Registro criado com sucesso';
    }
    resetForm();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar centro de custo';
  } finally {
    submitting.value = false;
  }
}

async function removeCostCenter(code: string) {
  error.value = '';
  successMessage.value = '';
  try {
    await costCentersCatalogService.remove(code);
    costCenters.value = costCenters.value.filter((item) => item.code !== code);
    pagination.value.totalItems = Math.max(0, pagination.value.totalItems - 1);
    pagination.value.totalPages = Math.max(1, Math.ceil(Math.max(pagination.value.totalItems, 1) / pagination.value.pageSize));
    successMessage.value = 'Registro removido com sucesso';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao remover centro de custo';
  }
}

onMounted(() => {
  auditFilters.correlationId = typeof route.query.correlationId === 'string' ? route.query.correlationId : '';
  void Promise.all([loadCostCenters(), loadFinanceAuditTrail()]);
});
</script>

<style scoped>
.finance-catalog-page {
  display: grid;
  gap: 16px;
}
.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}
.creation-form {
  display: grid;
  gap: 12px;
}
.catalog-search {
  width: 100%;
  min-height: 42px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #dbe3ef);
  padding: 0 14px;
  background: var(--color-surface, #fff);
}
.catalog-pagination {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.catalog-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.catalog-toolbar__actions--bottom {
  margin-top: 12px;
}
.catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.audit-trail-grid {
  display: grid;
  gap: 12px;
}
.audit-trail-card {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px;
  background: linear-gradient(180deg, var(--color-surface, #fff), var(--color-bg-subtle, #f8fafc));
}
.audit-trail-card__head,
.audit-trail-card__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.audit-trail-card__head {
  list-style: none;
  cursor: pointer;
  padding: 0;
}
.audit-trail-card__head::-webkit-details-marker {
  display: none;
}
.audit-trail-card__events {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.audit-trail-card__event p {
  margin: 6px 0 0;
  color: #334155;
}
.catalog-item {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  padding: 14px;
  background: var(--color-surface, #fff);
}
.catalog-item__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.catalog-item__badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
}
.catalog-item__meta {
  margin: 10px 0 6px;
  font-size: 13px;
  color: #475569;
}
.catalog-item__hint,
.catalog-inline-hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}
</style>

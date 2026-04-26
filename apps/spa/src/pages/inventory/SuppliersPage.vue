<template>
  <div class="suppliers-page">
    <AppPageHeader
      title="Fornecedores e Despesas"
      :breadcrumbs="['Estoque', 'Cadastros', 'Fornecedores e Despesas']"
      subtitle="Cadastro operacional de fornecedores, despesas recorrentes e contatos usados em compras, notas fiscais e contas a pagar."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="secondary" type="button" @click="showAdvancedSearch = !showAdvancedSearch">
          Busca Avançada
        </DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Novo Registro</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo de fornecedores e despesas">
      <DsStatCard :label="`${pagination.totalItems} resultado(s)`" value="" icon="📦" />
      <DsStatCard :label="`${supplierCount} fornecedor(es)`" value="" icon="🚚" />
      <DsStatCard :label="`${expenseCount} despesa(s)`" value="" icon="🧾" />
      <DsStatCard :label="`${withContactCount} com contato`" value="" icon="☎️" />
    </section>

    <DsCard v-if="showForm" :title="editingId ? 'Editar registro' : 'Incluir Novo Registro'">
      <form class="supplier-form" aria-label="Cadastro de fornecedor ou despesa" @submit.prevent="submitRecord">
        <label class="field">
          <span>Descrição</span>
          <input v-model="form.name" type="text" placeholder="Nome do fornecedor ou despesa" data-testid="supplier-name" />
        </label>
        <label class="field">
          <span>Categoria</span>
          <select v-model="form.category" data-testid="supplier-category">
            <option value="FORNECEDOR">FORNECEDOR</option>
            <option value="DESPESA">DESPESA</option>
            <option value="SERVICO TERCEIRO">SERVICO TERCEIRO</option>
            <option value="TRANSPORTE">TRANSPORTE</option>
          </select>
        </label>
        <label class="field">
          <span>Tipo</span>
          <input v-model="form.kind" type="text" placeholder="Ex: Operacional, Fixo, Variável" />
        </label>
        <label class="field">
          <span>Centro de custo</span>
          <select v-model="form.costCenterCode" data-testid="supplier-cost-center">
            <option value="">Selecione</option>
            <option v-for="center in costCenters" :key="center.code" :value="center.code">
              {{ center.name }} · {{ center.code }}
            </option>
          </select>
        </label>
        <label class="field field--wide">
          <span>Contato</span>
          <input v-model="form.description" type="text" placeholder="Telefone, e-mail, origem NFE ou observação" data-testid="supplier-contact" />
        </label>
        <div class="form-actions">
          <DsButton variant="primary" type="submit" :loading="submitting">
            {{ editingId ? 'Salvar Alterações' : 'Cadastrar' }}
          </DsButton>
          <DsButton variant="secondary" type="button" @click="cancelForm">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>

    <section class="content-grid">
      <DsCard title="Fornecedores e Despesas">
        <div class="vetus-toolbar">
          <button class="filter-toggle" type="button" @click="showAdvancedSearch = !showAdvancedSearch">
            filter_alt
            <span>Filtrar e Ordenar</span>
          </button>
          <p class="results-meta">
            Mostrando {{ currentRangeStart }} - {{ currentRangeEnd }} pág. de {{ pagination.totalItems }} resultados
          </p>
        </div>

        <form v-if="showAdvancedSearch" class="advanced-search" aria-label="Busca avançada" @submit.prevent="searchRecords">
          <label class="field">
            <span>Descrição</span>
            <input v-model="filters.description" type="search" autocomplete="off" data-testid="supplier-description-filter" />
          </label>
          <label class="field">
            <span>Categoria</span>
            <select v-model="filters.category" data-testid="supplier-category-filter">
              <option value="">Todas</option>
              <option v-for="category in categoryOptions" :key="category" :value="category">{{ category }}</option>
            </select>
          </label>
          <label class="field">
            <span>Contato</span>
            <input v-model="filters.contact" type="search" autocomplete="off" data-testid="supplier-contact-filter" />
          </label>
          <label class="field">
            <span>Ordenar</span>
            <select v-model="filters.sort" data-testid="supplier-sort">
              <option value="name">Descrição</option>
              <option value="category">Categoria</option>
              <option value="id">Código</option>
              <option value="costCenterCode">Centro de custo</option>
            </select>
          </label>
          <DsButton type="submit" variant="primary">Pesquisar</DsButton>
        </form>

        <div v-if="loading" class="catalog-empty">Carregando fornecedores e despesas.</div>
        <div v-else-if="records.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="record in records" :key="record.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Descrição:</span></p>
              <strong>{{ record.name }}</strong>
              <p><span>Categoria:</span></p>
              <p>{{ record.category || record.kind }}</p>
              <p><span>Contato:</span></p>
              <p>{{ contactLabel(record) }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectRecord(record)">Ver Detalhes</DsButton>
          </article>
        </div>

        <div class="pagination-actions">
          <DsButton variant="secondary" type="button" :disabled="pagination.page <= 1 || loading" @click="goToPage(pagination.page - 1)">
            Anterior
          </DsButton>
          <span>{{ pagination.page }} / {{ pagination.totalPages }}</span>
          <DsButton
            variant="secondary"
            type="button"
            :disabled="pagination.page >= pagination.totalPages || loading"
            @click="goToPage(pagination.page + 1)"
          >
            Próxima
          </DsButton>
        </div>
      </DsCard>

      <DsCard title="Detalhes do registro">
        <div v-if="!selectedRecord" class="detail-empty">
          Nenhum registro selecionado.
        </div>
        <dl v-else class="detail-list">
          <div>
            <dt>Descrição</dt>
            <dd>{{ selectedRecord.name }}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{{ selectedRecord.category }}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{{ selectedRecord.kind }}</dd>
          </div>
          <div>
            <dt>Contato</dt>
            <dd>{{ contactLabel(selectedRecord) }}</dd>
          </div>
          <div>
            <dt>Centro de custo</dt>
            <dd>{{ selectedRecord.costCenterName }} · {{ selectedRecord.costCenterCode }}</dd>
          </div>
        </dl>
        <div v-if="selectedRecord" class="detail-actions">
          <DsButton variant="secondary" type="button" @click="startEdit(selectedRecord)">Editar</DsButton>
          <DsButton variant="secondary" tag="a" :to="`/finance/accounts-payable?search=${encodeURIComponent(selectedRecord.name)}`">
            Contas a Pagar
          </DsButton>
          <DsButton variant="secondary" tag="a" :to="`/inventory/nf?supplier=${encodeURIComponent(selectedRecord.name)}`">
            Entrada NF
          </DsButton>
        </div>
      </DsCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import {
  expensesCatalogService,
  type ExpenseCatalogItem,
  type ExpenseCatalogListFilters,
  type ExpenseCostCenterItem
} from '@/services/expensesCatalog';

const filters = reactive({
  description: '',
  category: '',
  contact: '',
  sort: 'name' as NonNullable<ExpenseCatalogListFilters['sort']>
});
const form = reactive({
  name: '',
  kind: 'Operacional',
  category: 'FORNECEDOR',
  costCenterCode: '',
  description: ''
});

const records = ref<ExpenseCatalogItem[]>([]);
const categories = ref<string[]>([]);
const costCenters = ref<ExpenseCostCenterItem[]>([]);
const selectedRecord = ref<ExpenseCatalogItem | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const showAdvancedSearch = ref(true);
const showForm = ref(false);
const editingId = ref<string | null>(null);
const pagination = reactive({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1, order: 'asc' as 'asc' | 'desc' });

const categoryOptions = computed(() => {
  const base = ['FORNECEDOR', 'DESPESA', 'SERVICO TERCEIRO', 'TRANSPORTE'];
  return [...new Set([...base, ...categories.value])];
});
const supplierCount = computed(() => records.value.filter((record) => normalize(record.category).includes('fornecedor')).length);
const expenseCount = computed(() => records.value.filter((record) => normalize(record.category).includes('despesa')).length);
const withContactCount = computed(() => records.value.filter((record) => !normalize(contactLabel(record)).includes('sem contato')).length);
const currentRangeStart = computed(() => (pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1));
const currentRangeEnd = computed(() => Math.min(pagination.page * pagination.pageSize, pagination.totalItems));

onMounted(reload);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function contactLabel(record: ExpenseCatalogItem): string {
  return record.description?.trim() || 'Sem Contato - Cadastrado pela NFE';
}

function buildServerFilters(pageOverride?: number): ExpenseCatalogListFilters {
  const search = [filters.description, filters.contact].filter(Boolean).join(' ');
  return {
    search: search || undefined,
    category: filters.category || undefined,
    page: pageOverride ?? pagination.page,
    pageSize: pagination.pageSize,
    sort: filters.sort,
    order: pagination.order
  };
}

async function loadRecords(serverFilters?: ExpenseCatalogListFilters) {
  loading.value = true;
  error.value = '';
  try {
    const response = await expensesCatalogService.list(serverFilters);
    records.value = response.items ?? [];
    categories.value = response.categories ?? [];
    costCenters.value = response.costCenters ?? [];
    pagination.page = response.page ?? 1;
    pagination.pageSize = response.pageSize ?? pagination.pageSize;
    pagination.totalItems = response.totalItems ?? records.value.length;
    pagination.totalPages = response.totalPages ?? 1;
    pagination.order = (response.order as 'asc' | 'desc') ?? 'asc';
    if (selectedRecord.value) {
      selectedRecord.value = records.value.find((record) => record.id === selectedRecord.value?.id) ?? null;
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar fornecedores e despesas';
    records.value = [];
    categories.value = [];
    costCenters.value = [];
    pagination.totalItems = 0;
    pagination.totalPages = 1;
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadRecords(buildServerFilters());
}

async function searchRecords() {
  pagination.page = 1;
  await loadRecords(buildServerFilters(1));
}

async function goToPage(page: number) {
  await loadRecords(buildServerFilters(page));
}

function resetForm() {
  form.name = '';
  form.kind = 'Operacional';
  form.category = 'FORNECEDOR';
  form.costCenterCode = costCenters.value[0]?.code ?? '';
  form.description = '';
  editingId.value = null;
}

function startCreate() {
  resetForm();
  showForm.value = true;
}

function startEdit(record: ExpenseCatalogItem) {
  form.name = record.name;
  form.kind = record.kind || 'Operacional';
  form.category = record.category || 'FORNECEDOR';
  form.costCenterCode = record.costCenterCode || costCenters.value[0]?.code || '';
  form.description = contactLabel(record);
  editingId.value = record.id;
  showForm.value = true;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
}

function selectRecord(record: ExpenseCatalogItem) {
  selectedRecord.value = record;
}

async function submitRecord() {
  error.value = '';
  successMessage.value = '';
  const fallbackCostCenter = costCenters.value[0]?.code ?? '';
  const payload = {
    name: form.name.trim(),
    kind: form.kind.trim() || 'Operacional',
    category: form.category.trim() || 'FORNECEDOR',
    costCenterCode: form.costCenterCode || fallbackCostCenter,
    description: form.description.trim() || 'Sem Contato - Cadastrado pela NFE'
  };

  if (!payload.name || !payload.category || !payload.costCenterCode) {
    error.value = 'Descrição, categoria e centro de custo são obrigatórios';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await expensesCatalogService.update(editingId.value, payload);
      records.value = records.value.map((record) => (record.id === updated.id ? updated : record));
      selectedRecord.value = updated;
      successMessage.value = 'Registro atualizado com sucesso.';
    } else {
      const created = await expensesCatalogService.create(payload);
      records.value = [created, ...records.value].slice(0, pagination.pageSize);
      selectedRecord.value = created;
      pagination.totalItems += 1;
      pagination.totalPages = Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize));
      successMessage.value = 'Registro cadastrado com sucesso.';
    }
    cancelForm();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar fornecedor ou despesa';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.suppliers-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.catalog-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.8fr);
  gap: 16px;
  align-items: start;
}

.supplier-form,
.advanced-search {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr)) auto;
  gap: 12px;
  align-items: end;
}

.supplier-form {
  grid-template-columns: repeat(4, minmax(150px, 1fr));
}

.field,
.field--wide {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary, #475569);
}

.field--wide {
  grid-column: span 2;
}

.field input,
.field select,
.field--wide input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vetus-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
  font-weight: 700;
  cursor: pointer;
}

.results-meta {
  margin: 0;
  color: var(--color-text-secondary, #64748b);
  font-size: 13px;
}

.advanced-search {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-bg-subtle, #f8fafc);
}

.catalog-list {
  display: grid;
  gap: 12px;
}

.catalog-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  padding: 14px;
  background: var(--color-surface, #fff);
}

.catalog-card__main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.catalog-card__main p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.catalog-card__main span {
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.catalog-card__main strong {
  color: var(--color-text, #0f172a);
}

.catalog-empty,
.detail-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary, #64748b);
}

.pagination-actions,
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 14px;
}

.detail-list {
  display: grid;
  gap: 12px;
  margin: 0;
}

.detail-list div {
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.detail-list dt {
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.detail-list dd {
  margin: 4px 0 0;
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

@media (max-width: 980px) {
  .content-grid,
  .supplier-form,
  .advanced-search {
    grid-template-columns: 1fr;
  }

  .field--wide {
    grid-column: auto;
  }

  .catalog-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

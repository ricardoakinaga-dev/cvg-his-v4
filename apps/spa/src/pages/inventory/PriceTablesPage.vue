<template>
  <div class="price-tables-page">
    <AppPageHeader
      title="Tabelas de Preço"
      :breadcrumbs="['Estoque', 'Cadastros', 'Tabelas de Preço']"
      subtitle="Cadastro de políticas comerciais usadas por produtos, serviços, consulta de preços, comandas e PDV."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo das tabelas de preço">
      <DsStatCard :label="`${priceTables.length} tabela(s)`" value="" icon="🏷️" />
      <DsStatCard :label="`${linkedItemsCount} item(ns) vinculado(s)`" value="" icon="📦" />
      <DsStatCard :label="`${activeCount} ativa(s)`" value="" icon="✅" />
      <DsStatCard :label="`${inactiveCount} inativa(s)`" value="" icon="⏸️" />
    </section>

    <section class="content-grid">
      <DsCard title="Tabelas de Preço">
        <div class="catalog-toolbar">
          <label class="field field--search">
            <span>Buscar</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar por ID ou descrição"
              data-testid="price-table-search"
              @keyup.enter="searchTables"
            />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="filters.active" data-testid="price-table-active-filter" @change="searchTables">
              <option :value="true">Ativas</option>
              <option :value="false">Todas</option>
            </select>
          </label>
          <DsButton variant="secondary" type="button" @click="searchTables">Pesquisar</DsButton>
        </div>

        <div v-if="loading" class="catalog-empty">Carregando tabelas de preço.</div>
        <div v-else-if="priceTables.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="table in priceTables" :key="table.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Descrição:</span></p>
              <strong>{{ table.description }}</strong>
              <p><span>ID:</span></p>
              <p>{{ table.legacyId || shortId(table.id) }}</p>
              <p><span>Contexto:</span></p>
              <p>{{ table.context || 'Sem contexto informado' }}</p>
              <p><span>Situação:</span></p>
              <p>{{ table.isActive ? 'Ativa' : 'Inativa' }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectTable(table)">Ver Detalhes</DsButton>
          </article>
        </div>
      </DsCard>

      <DsCard :title="formTitle">
        <form class="price-table-form" aria-label="Cadastro de tabela de preço" @submit.prevent="submitTable">
          <label class="field">
            <span>Id</span>
            <input v-model="form.legacyId" type="text" data-testid="price-table-id" />
          </label>
          <label class="field">
            <span>Descrição</span>
            <input v-model="form.description" type="text" data-testid="price-table-description" />
          </label>
          <label class="field">
            <span>Contexto</span>
            <textarea v-model="form.context" rows="3" data-testid="price-table-context"></textarea>
          </label>
          <div class="date-grid">
            <label class="field">
              <span>Início</span>
              <input v-model="form.startsAt" type="date" data-testid="price-table-starts-at" />
            </label>
            <label class="field">
              <span>Fim</span>
              <input v-model="form.endsAt" type="date" data-testid="price-table-ends-at" />
            </label>
          </div>
          <label class="field field--inline">
            <input v-model="form.isActive" type="checkbox" data-testid="price-table-active" />
            <span>Ativa</span>
          </label>

          <div class="form-actions">
            <DsButton variant="danger" type="button" :disabled="!editingId || submitting" @click="removeSelected">
              Excluir
            </DsButton>
            <DsButton variant="secondary" type="button" @click="cancelForm">Cancelar</DsButton>
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
          </div>
        </form>

        <dl v-if="selectedTable" class="detail-list">
          <div>
            <dt>Descrição</dt>
            <dd>{{ selectedTable.description }}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{{ selectedTable.legacyId || shortId(selectedTable.id) }}</dd>
          </div>
          <div>
            <dt>Itens vinculados</dt>
            <dd>{{ selectedItems.length }}</dd>
          </div>
          <div>
            <dt>Validade</dt>
            <dd>{{ validityLabel(selectedTable) }}</dd>
          </div>
        </dl>

        <form v-if="selectedTable" class="price-item-form" aria-label="Vincular item à tabela de preço" @submit.prevent="submitItem">
          <div class="date-grid">
            <label class="field">
              <span>Tipo</span>
              <select v-model="itemForm.itemKind" data-testid="price-table-item-kind">
                <option value="product">Produto</option>
                <option value="service">Serviço</option>
              </select>
            </label>
            <label class="field">
              <span>Item</span>
              <select v-model="itemForm.itemId" data-testid="price-table-item-id">
                <option value="">Selecionar</option>
                <option v-for="item in selectableItems" :key="item.id" :value="item.id">
                  {{ item.label }}
                </option>
              </select>
            </label>
          </div>
          <label class="field">
            <span>Preço</span>
            <input v-model.number="itemForm.price" type="number" min="0" step="0.01" data-testid="price-table-item-price" />
          </label>
          <DsButton variant="secondary" type="submit" :loading="submittingItem">Adicionar Item</DsButton>
        </form>

        <div v-if="selectedTable" class="detail-actions">
          <DsButton variant="secondary" tag="a" to="/products">Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/services">Serviços</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/price-consultation">Consulta</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/price-adjustments">Reajuste</DsButton>
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
  addPriceTableItem,
  archivePriceTable,
  createPriceTable,
  getPriceTableDetail,
  listPriceTables,
  updatePriceTable,
  type PriceTableDetail,
  type PriceTableItemSummary,
  type PriceTableSummary
} from '@/services/commercial';
import { productsService, type ProductSummary } from '@/services/products';
import { servicesService, type ServiceSummary } from '@/services/services';

const filters = reactive({
  search: '',
  active: true
});
const form = reactive({
  legacyId: '',
  description: '',
  context: '',
  startsAt: '',
  endsAt: '',
  isActive: true
});
const itemForm = reactive<{
  itemKind: PriceTableItemSummary['itemKind'];
  itemId: string;
  price: number;
}>({
  itemKind: 'product',
  itemId: '',
  price: 0
});

const priceTables = ref<PriceTableSummary[]>([]);
const tableItems = ref<PriceTableItemSummary[]>([]);
const products = ref<ProductSummary[]>([]);
const services = ref<ServiceSummary[]>([]);
const selectedTable = ref<PriceTableSummary | null>(null);
const loading = ref(false);
const submitting = ref(false);
const submittingItem = ref(false);
const error = ref('');
const successMessage = ref('');
const editingId = ref<string | null>(null);

const activeCount = computed(() => priceTables.value.filter((table) => table.isActive).length);
const inactiveCount = computed(() => priceTables.value.filter((table) => !table.isActive).length);
const linkedItemsCount = computed(() => tableItems.value.length);
const selectedItems = computed(() => tableItems.value.filter((item) => item.priceTableId === selectedTable.value?.id));
const formTitle = computed(() => (editingId.value ? 'Editar Tabela' : 'Cadastrar Tabela'));
const selectableItems = computed(() => {
  if (itemForm.itemKind === 'service') {
    return services.value.map((service) => ({
      id: service.id,
      label: `${service.code ? `${service.code} - ` : ''}${service.name}`
    }));
  }
  return products.value.map((product) => ({
    id: product.id,
    label: `${product.code ? `${product.code} - ` : ''}${product.name}`
  }));
});

onMounted(reload);

function shortId(value: string): string {
  return value.slice(0, 8);
}

function dateToInput(value?: string | null): string {
  return value ? value.slice(0, 10) : '';
}

function inputToIsoDate(value: string): string | null {
  return value ? `${value}T00:00:00.000Z` : null;
}

function resetForm() {
  form.legacyId = '';
  form.description = '';
  form.context = '';
  form.startsAt = '';
  form.endsAt = '';
  form.isActive = true;
  editingId.value = null;
}

function resetItemForm() {
  itemForm.itemKind = 'product';
  itemForm.itemId = '';
  itemForm.price = 0;
}

function startCreate() {
  selectedTable.value = null;
  tableItems.value = [];
  resetForm();
  resetItemForm();
}

async function selectTable(table: PriceTableSummary) {
  selectedTable.value = table;
  editingId.value = table.id;
  form.legacyId = table.legacyId ?? '';
  form.description = table.description;
  form.context = table.context ?? '';
  form.startsAt = dateToInput(table.startsAt);
  form.endsAt = dateToInput(table.endsAt);
  form.isActive = table.isActive;
  resetItemForm();
  try {
    const detail = await getPriceTableDetail(table.id);
    tableItems.value = detail.items ?? [];
    selectedTable.value = detail;
  } catch {
    tableItems.value = [];
  }
}

function cancelForm() {
  resetForm();
  resetItemForm();
  selectedTable.value = null;
  tableItems.value = [];
}

function validityLabel(table: PriceTableSummary): string {
  if (!table.startsAt && !table.endsAt) return 'Sem janela definida';
  return `${dateToInput(table.startsAt) || 'Sem início'} até ${dateToInput(table.endsAt) || 'Sem fim'}`;
}

async function loadOperationalLinks() {
  const [loadedProducts, loadedServices] = await Promise.allSettled([
    productsService.list(),
    servicesService.list({ active: true })
  ]);
  products.value = loadedProducts.status === 'fulfilled' ? loadedProducts.value : [];
  services.value = loadedServices.status === 'fulfilled' ? loadedServices.value : [];
}

async function loadTables() {
  const items = await listPriceTables({
    search: filters.search.trim() || undefined,
    active: filters.active
  });
  priceTables.value = [...items];
  if (selectedTable.value) {
    selectedTable.value = priceTables.value.find((table) => table.id === selectedTable.value?.id) ?? null;
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([loadTables(), loadOperationalLinks()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar tabelas de preço';
    priceTables.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchTables() {
  loading.value = true;
  error.value = '';
  try {
    await loadTables();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao pesquisar tabelas de preço';
  } finally {
    loading.value = false;
  }
}

function buildPayload() {
  return {
    legacyId: form.legacyId.trim() || null,
    description: form.description.trim(),
    context: form.context.trim() || null,
    startsAt: inputToIsoDate(form.startsAt),
    endsAt: inputToIsoDate(form.endsAt),
    isActive: form.isActive
  };
}

async function submitTable() {
  error.value = '';
  successMessage.value = '';
  const payload = buildPayload();
  if (!payload.description) {
    error.value = 'Descrição é obrigatória';
    return;
  }
  if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) {
    error.value = 'Fim deve ser maior ou igual ao início';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await updatePriceTable(editingId.value, payload);
      priceTables.value = priceTables.value.map((table) => (table.id === updated.id ? updated : table));
      selectedTable.value = updated;
      successMessage.value = 'Tabela de preço atualizada com sucesso.';
    } else {
      const created = await createPriceTable(payload);
      priceTables.value = [created, ...priceTables.value];
      selectedTable.value = created;
      editingId.value = created.id;
      tableItems.value = [];
      successMessage.value = 'Tabela de preço cadastrada com sucesso.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar tabela de preço';
  } finally {
    submitting.value = false;
  }
}

async function removeSelected() {
  if (!editingId.value) return;
  submitting.value = true;
  error.value = '';
  successMessage.value = '';
  try {
    await archivePriceTable(editingId.value);
    priceTables.value = priceTables.value.filter((table) => table.id !== editingId.value);
    cancelForm();
    successMessage.value = 'Tabela de preço excluída com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao excluir tabela de preço';
  } finally {
    submitting.value = false;
  }
}

async function submitItem() {
  if (!selectedTable.value) return;
  error.value = '';
  successMessage.value = '';
  if (!itemForm.itemId) {
    error.value = 'Item é obrigatório';
    return;
  }
  if (!Number.isFinite(itemForm.price) || itemForm.price < 0) {
    error.value = 'Preço deve ser maior ou igual a zero';
    return;
  }

  submittingItem.value = true;
  try {
    const item = await addPriceTableItem(selectedTable.value.id, {
      itemKind: itemForm.itemKind,
      itemId: itemForm.itemId,
      price: Number(itemForm.price)
    });
    tableItems.value = [item, ...tableItems.value.filter((existing) => existing.id !== item.id)];
    resetItemForm();
    successMessage.value = 'Item adicionado à tabela de preço.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao adicionar item à tabela';
  } finally {
    submittingItem.value = false;
  }
}
</script>

<style scoped>
.price-tables-page {
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
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.catalog-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(140px, 180px) auto;
  gap: 12px;
  align-items: end;
  margin-bottom: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 700;
}

.field--inline {
  flex-direction: row;
  align-items: center;
}

.field input,
.field select,
.field textarea {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.field textarea {
  resize: vertical;
}

.field input[type='checkbox'] {
  width: auto;
  min-height: auto;
}

.catalog-list,
.price-table-form,
.price-item-form {
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

.catalog-card__main,
.detail-list {
  display: grid;
  gap: 8px;
}

.catalog-card__main {
  min-width: 0;
}

.catalog-card__main p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.catalog-card__main span,
.catalog-card__main strong {
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.catalog-empty {
  border: 1px dashed var(--color-border, #cbd5e1);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary, #64748b);
}

.date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.form-actions,
.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.detail-list {
  margin: 16px 0 0;
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

.price-item-form,
.detail-actions {
  margin-top: 14px;
}

@media (max-width: 980px) {
  .content-grid,
  .catalog-toolbar,
  .date-grid {
    grid-template-columns: 1fr;
  }

  .catalog-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

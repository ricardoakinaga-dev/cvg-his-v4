<template>
  <div class="warehouses-page">
    <AppPageHeader
      title="Estoques"
      :breadcrumbs="['Estoque', 'Cadastros', 'Estoques']"
      subtitle="Cadastro de estoques físicos e lógicos usados por transferência, validade, auditoria e movimentação operacional."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Novo Estoque</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo dos estoques">
      <DsStatCard :label="`${warehouses.length} estoque(s)`" value="" icon="🏬" />
      <DsStatCard :label="`${linkedProductsCount} produto(s) vinculados`" value="" icon="📦" />
      <DsStatCard :label="`${linkedLotsCount} lote(s) com local`" value="" icon="🧾" />
      <DsStatCard :label="`${inactiveCount} inativo(s)`" value="" icon="⏸️" />
    </section>

    <section class="content-grid">
      <DsCard title="Estoques">
        <div class="catalog-toolbar">
          <label class="field field--search">
            <span>Buscar</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar por ID ou descrição"
              data-testid="warehouse-search"
              @keyup.enter="searchWarehouses"
            />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="filters.active" data-testid="warehouse-active-filter" @change="searchWarehouses">
              <option :value="true">Ativos</option>
              <option :value="false">Todos</option>
            </select>
          </label>
          <DsButton variant="secondary" type="button" @click="searchWarehouses">Pesquisar</DsButton>
        </div>

        <div v-if="loading" class="catalog-empty">Carregando estoques.</div>
        <div v-else-if="warehouses.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="warehouse in warehouses" :key="warehouse.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Descrição:</span></p>
              <strong>{{ warehouse.description }}</strong>
              <p><span>ID:</span></p>
              <p>{{ warehouse.displayId }}</p>
              <p><span>Situação:</span></p>
              <p>{{ warehouse.active ? 'Ativo' : 'Inativo' }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectWarehouse(warehouse)">Ver Detalhes</DsButton>
          </article>
        </div>
      </DsCard>

      <DsCard :title="formTitle">
        <form class="warehouse-form" aria-label="Cadastro de estoque" @submit.prevent="submitWarehouse">
          <label class="field">
            <span>Id</span>
            <input :value="selectedWarehouse?.displayId ?? ''" type="text" disabled data-testid="warehouse-id" />
          </label>
          <label class="field">
            <span>Descrição</span>
            <input v-model="form.description" type="text" data-testid="warehouse-description" />
          </label>
          <label class="field field--inline">
            <input v-model="form.active" type="checkbox" data-testid="warehouse-active" />
            <span>Ativo</span>
          </label>

          <div class="form-actions">
            <DsButton variant="danger" type="button" :disabled="!editingId || submitting" @click="removeSelected">
              Excluir
            </DsButton>
            <DsButton variant="secondary" type="button" @click="cancelForm">Cancelar</DsButton>
            <DsButton variant="primary" type="submit" :loading="submitting">Salvar</DsButton>
          </div>
        </form>

        <dl v-if="selectedWarehouse" class="detail-list">
          <div>
            <dt>Descrição</dt>
            <dd>{{ selectedWarehouse.description }}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{{ selectedWarehouse.displayId }}</dd>
          </div>
          <div>
            <dt>Produtos vinculados</dt>
            <dd>{{ linkedProductsFor(selectedWarehouse).length }}</dd>
          </div>
          <div>
            <dt>Lotes no local</dt>
            <dd>{{ linkedLotsFor(selectedWarehouse).length }}</dd>
          </div>
        </dl>

        <div v-if="selectedWarehouse" class="detail-actions">
          <DsButton variant="secondary" tag="a" to="/inventory/transfers">Transferência</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/validity">Validade</DsButton>
          <DsButton variant="secondary" tag="a" to="/inventory/audit">Auditoria</DsButton>
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
import { inventoryService } from '@/services/inventory';
import { warehousesService, type WarehouseItem } from '@/services/warehouses';
import type { InventoryItemSummary, InventoryLotSummary } from '@/types/inventory';

const filters = reactive({
  search: '',
  active: true
});
const form = reactive({
  description: '',
  active: true
});

const warehouses = ref<WarehouseItem[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const lots = ref<InventoryLotSummary[]>([]);
const selectedWarehouse = ref<WarehouseItem | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const editingId = ref<string | null>(null);

const linkedLotsCount = computed(() => lots.value.filter((lot) => Boolean(lot.location)).length);
const linkedProductsCount = computed(() => new Set(lots.value.filter((lot) => Boolean(lot.location)).map((lot) => lot.inventoryItemId)).size);
const inactiveCount = computed(() => warehouses.value.filter((warehouse) => !warehouse.active).length);
const formTitle = computed(() => (editingId.value ? 'Editar Estoque' : 'Cadastrar Estoque'));

onMounted(reload);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function resetForm() {
  form.description = '';
  form.active = true;
  editingId.value = null;
}

function startCreate() {
  selectedWarehouse.value = null;
  resetForm();
}

function selectWarehouse(warehouse: WarehouseItem) {
  selectedWarehouse.value = warehouse;
  editingId.value = warehouse.id;
  form.description = warehouse.description;
  form.active = warehouse.active;
}

function cancelForm() {
  resetForm();
  selectedWarehouse.value = null;
}

function linkedLotsFor(warehouse: WarehouseItem): InventoryLotSummary[] {
  const description = normalize(warehouse.description);
  return lots.value.filter((lot) => normalize(lot.location ?? '').includes(description));
}

function linkedProductsFor(warehouse: WarehouseItem): InventoryItemSummary[] {
  const linkedIds = new Set(linkedLotsFor(warehouse).map((lot) => lot.inventoryItemId));
  return inventoryItems.value.filter((item) => linkedIds.has(item.id));
}

async function loadOperationalLinks() {
  try {
    const [items, stockLots] = await Promise.all([
      inventoryService.list(),
      inventoryService.listLots()
    ]);
    inventoryItems.value = items;
    lots.value = stockLots;
  } catch {
    inventoryItems.value = [];
    lots.value = [];
  }
}

async function loadWarehouses() {
  const response = await warehousesService.list({
    search: filters.search.trim() || undefined,
    active: filters.active
  });
  warehouses.value = response.items ?? [];
  if (selectedWarehouse.value) {
    selectedWarehouse.value = warehouses.value.find((warehouse) => warehouse.id === selectedWarehouse.value?.id) ?? null;
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([loadWarehouses(), loadOperationalLinks()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar estoques';
    warehouses.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchWarehouses() {
  loading.value = true;
  error.value = '';
  try {
    await loadWarehouses();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao pesquisar estoques';
  } finally {
    loading.value = false;
  }
}

async function submitWarehouse() {
  error.value = '';
  successMessage.value = '';
  const payload = {
    description: form.description.trim(),
    active: form.active
  };
  if (!payload.description) {
    error.value = 'Descrição é obrigatória';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await warehousesService.update(editingId.value, payload);
      warehouses.value = warehouses.value.map((warehouse) => (warehouse.id === updated.id ? updated : warehouse));
      selectedWarehouse.value = updated;
      successMessage.value = 'Estoque atualizado com sucesso.';
    } else {
      const created = await warehousesService.create(payload);
      warehouses.value = [created, ...warehouses.value];
      selectedWarehouse.value = created;
      editingId.value = created.id;
      successMessage.value = 'Estoque cadastrado com sucesso.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar estoque';
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
    await warehousesService.remove(editingId.value);
    warehouses.value = warehouses.value.filter((warehouse) => warehouse.id !== editingId.value);
    cancelForm();
    successMessage.value = 'Estoque excluído com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao excluir estoque';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.warehouses-page {
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
.field select {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.field input[type='checkbox'] {
  width: auto;
  min-height: auto;
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

.catalog-card__main,
.warehouse-form,
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

.detail-actions {
  margin-top: 14px;
}

@media (max-width: 980px) {
  .content-grid,
  .catalog-toolbar {
    grid-template-columns: 1fr;
  }

  .catalog-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

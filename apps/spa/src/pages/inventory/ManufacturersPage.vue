<template>
  <div class="manufacturers-page">
    <AppPageHeader
      title="Fabricantes"
      :breadcrumbs="['Estoque', 'Cadastros', 'Fabricantes']"
      subtitle="Cadastro de fabricantes e marcas usado para organizar o catálogo de produtos do estoque."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Novo Fabricante</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo dos fabricantes">
      <DsStatCard :label="`${manufacturers.length} fabricante(s)`" value="" icon="🏭" />
      <DsStatCard :label="`${linkedProductsCount} produto(s) vinculados`" value="" icon="📦" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${inactiveCount} inativo(s)`" value="" icon="⏸️" />
    </section>

    <section class="content-grid">
      <DsCard title="Fabricantes">
        <div class="catalog-toolbar">
          <label class="field field--search">
            <span>Buscar</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar por ID ou nome"
              data-testid="manufacturer-search"
              @keyup.enter="searchManufacturers"
            />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="filters.active" data-testid="manufacturer-active-filter" @change="searchManufacturers">
              <option :value="true">Ativos</option>
              <option :value="false">Todos</option>
            </select>
          </label>
          <DsButton variant="secondary" type="button" @click="searchManufacturers">Pesquisar</DsButton>
        </div>

        <div v-if="loading" class="catalog-empty">Carregando fabricantes.</div>
        <div v-else-if="manufacturers.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="manufacturer in manufacturers" :key="manufacturer.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Nome:</span></p>
              <strong>{{ manufacturer.name }}</strong>
              <p><span>ID:</span></p>
              <p>{{ manufacturer.displayId }}</p>
              <p><span>Situação:</span></p>
              <p>{{ manufacturer.active ? 'Ativo' : 'Inativo' }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectManufacturer(manufacturer)">Ver Detalhes</DsButton>
          </article>
        </div>
      </DsCard>

      <DsCard :title="formTitle">
        <form class="manufacturer-form" aria-label="Cadastro de fabricante" @submit.prevent="submitManufacturer">
          <label class="field">
            <span>Id</span>
            <input :value="selectedManufacturer?.displayId ?? ''" type="text" disabled data-testid="manufacturer-id" />
          </label>
          <label class="field">
            <span>Nome</span>
            <input v-model="form.name" type="text" id="description" data-testid="manufacturer-name" />
          </label>
          <label class="field field--inline">
            <input v-model="form.active" type="checkbox" data-testid="manufacturer-active" />
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

        <dl v-if="selectedManufacturer" class="detail-list">
          <div>
            <dt>Nome</dt>
            <dd>{{ selectedManufacturer.name }}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{{ selectedManufacturer.displayId }}</dd>
          </div>
          <div>
            <dt>Produtos vinculados</dt>
            <dd>{{ linkedProductsFor(selectedManufacturer).length }}</dd>
          </div>
        </dl>

        <div v-if="selectedManufacturer" class="detail-actions">
          <DsButton variant="secondary" tag="a" to="/products">Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/products/import">Importar Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/product-groups">Grupos</DsButton>
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
import { manufacturersService, type ManufacturerItem } from '@/services/manufacturers';
import { productsService, type ProductSummary } from '@/services/products';

const filters = reactive({
  search: '',
  active: true
});
const form = reactive({
  name: '',
  active: true
});

const manufacturers = ref<ManufacturerItem[]>([]);
const products = ref<ProductSummary[]>([]);
const selectedManufacturer = ref<ManufacturerItem | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const editingId = ref<string | null>(null);

const activeCount = computed(() => manufacturers.value.filter((manufacturer) => manufacturer.active).length);
const inactiveCount = computed(() => manufacturers.value.filter((manufacturer) => !manufacturer.active).length);
const linkedProductsCount = computed(() => new Set(manufacturers.value.flatMap((manufacturer) => linkedProductsFor(manufacturer).map((product) => product.id))).size);
const formTitle = computed(() => (editingId.value ? 'Editar Fabricantes' : 'Cadastrar Fabricantes'));

onMounted(reload);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function resetForm() {
  form.name = '';
  form.active = true;
  editingId.value = null;
}

function startCreate() {
  selectedManufacturer.value = null;
  resetForm();
}

function selectManufacturer(manufacturer: ManufacturerItem) {
  selectedManufacturer.value = manufacturer;
  editingId.value = manufacturer.id;
  form.name = manufacturer.name;
  form.active = manufacturer.active;
}

function cancelForm() {
  resetForm();
  selectedManufacturer.value = null;
}

function linkedProductsFor(manufacturer: ManufacturerItem): ProductSummary[] {
  const name = normalize(manufacturer.name);
  if (!name) return [];
  return products.value.filter((product) => {
    const searchable = normalize([product.name, product.code ?? '', product.description ?? ''].join(' '));
    return searchable.includes(name);
  });
}

async function loadOperationalLinks() {
  try {
    products.value = await productsService.list();
  } catch {
    products.value = [];
  }
}

async function loadManufacturers() {
  const response = await manufacturersService.list({
    search: filters.search.trim() || undefined,
    active: filters.active
  });
  manufacturers.value = response.items ?? [];
  if (selectedManufacturer.value) {
    selectedManufacturer.value = manufacturers.value.find((manufacturer) => manufacturer.id === selectedManufacturer.value?.id) ?? null;
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([loadManufacturers(), loadOperationalLinks()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar fabricantes';
    manufacturers.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchManufacturers() {
  loading.value = true;
  error.value = '';
  try {
    await loadManufacturers();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao pesquisar fabricantes';
  } finally {
    loading.value = false;
  }
}

async function submitManufacturer() {
  error.value = '';
  successMessage.value = '';
  const payload = {
    name: form.name.trim(),
    active: form.active
  };
  if (!payload.name) {
    error.value = 'Nome é obrigatório';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await manufacturersService.update(editingId.value, payload);
      manufacturers.value = manufacturers.value.map((manufacturer) => (manufacturer.id === updated.id ? updated : manufacturer));
      selectedManufacturer.value = updated;
      successMessage.value = 'Fabricante atualizado com sucesso.';
    } else {
      const created = await manufacturersService.create(payload);
      manufacturers.value = [created, ...manufacturers.value];
      selectedManufacturer.value = created;
      editingId.value = created.id;
      successMessage.value = 'Fabricante cadastrado com sucesso.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar fabricante';
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
    await manufacturersService.remove(editingId.value);
    manufacturers.value = manufacturers.value.filter((manufacturer) => manufacturer.id !== editingId.value);
    cancelForm();
    successMessage.value = 'Fabricante excluído com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao excluir fabricante';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.manufacturers-page {
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
.manufacturer-form,
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

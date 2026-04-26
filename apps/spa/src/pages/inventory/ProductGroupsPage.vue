<template>
  <div class="product-groups-page">
    <AppPageHeader
      title="Grupos de Produto"
      :breadcrumbs="['Estoque', 'Cadastros', 'Grupos de Produto']"
      subtitle="Cadastro de grupos usado para organizar produtos, leitura gerencial, compras e estoque."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" type="button" @click="startCreate">Incluir Novo Grupo</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="catalog-kpis" aria-label="Resumo dos grupos de produto">
      <DsStatCard :label="`${groups.length} grupo(s)`" value="" icon="🗂️" />
      <DsStatCard :label="`${linkedProductsCount} produto(s) vinculados`" value="" icon="📦" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${inactiveCount} inativo(s)`" value="" icon="⏸️" />
    </section>

    <section class="content-grid">
      <DsCard title="Grupos de Produto">
        <div class="catalog-toolbar">
          <label class="field field--search">
            <span>Buscar</span>
            <input
              v-model="filters.search"
              type="search"
              placeholder="Buscar por ID ou descrição"
              data-testid="product-group-search"
              @keyup.enter="searchGroups"
            />
          </label>
          <label class="field">
            <span>Situação</span>
            <select v-model="filters.active" data-testid="product-group-active-filter" @change="searchGroups">
              <option :value="true">Ativos</option>
              <option :value="false">Todos</option>
            </select>
          </label>
          <DsButton variant="secondary" type="button" @click="searchGroups">Pesquisar</DsButton>
        </div>

        <div v-if="loading" class="catalog-empty">Carregando grupos de produto.</div>
        <div v-else-if="groups.length === 0" class="catalog-empty">Nenhum registro encontrado.</div>

        <div v-else class="catalog-list">
          <article v-for="group in groups" :key="group.id" class="catalog-card">
            <div class="catalog-card__main">
              <p><span>Descrição:</span></p>
              <strong>{{ group.description }}</strong>
              <p><span>ID:</span></p>
              <p>{{ group.displayId }}</p>
              <p><span>Situação:</span></p>
              <p>{{ group.active ? 'Ativo' : 'Inativo' }}</p>
            </div>
            <DsButton variant="secondary" type="button" @click="selectGroup(group)">Ver Detalhes</DsButton>
          </article>
        </div>
      </DsCard>

      <DsCard :title="formTitle">
        <form class="product-group-form" aria-label="Cadastro de grupo de produto" @submit.prevent="submitGroup">
          <label class="field">
            <span>Id</span>
            <input :value="selectedGroup?.displayId ?? ''" type="text" disabled data-testid="product-group-id" />
          </label>
          <label class="field">
            <span>Descrição</span>
            <input v-model="form.description" type="text" id="description" data-testid="product-group-description" />
          </label>
          <label class="field field--inline">
            <input v-model="form.active" type="checkbox" data-testid="product-group-active" />
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

        <dl v-if="selectedGroup" class="detail-list">
          <div>
            <dt>Descrição</dt>
            <dd>{{ selectedGroup.description }}</dd>
          </div>
          <div>
            <dt>ID</dt>
            <dd>{{ selectedGroup.displayId }}</dd>
          </div>
          <div>
            <dt>Produtos vinculados</dt>
            <dd>{{ linkedProductsFor(selectedGroup).length }}</dd>
          </div>
        </dl>

        <div v-if="selectedGroup" class="detail-actions">
          <DsButton variant="secondary" tag="a" to="/products">Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/products/import">Importar Produtos</DsButton>
          <DsButton variant="secondary" tag="a" to="/manufacturers">Fabricantes</DsButton>
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
import { productGroupsService, type ProductGroupItem } from '@/services/productGroups';
import { productsService, type ProductSummary } from '@/services/products';

const filters = reactive({
  search: '',
  active: true
});
const form = reactive({
  description: '',
  active: true
});

const groups = ref<ProductGroupItem[]>([]);
const products = ref<ProductSummary[]>([]);
const selectedGroup = ref<ProductGroupItem | null>(null);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const editingId = ref<string | null>(null);

const activeCount = computed(() => groups.value.filter((group) => group.active).length);
const inactiveCount = computed(() => groups.value.filter((group) => !group.active).length);
const linkedProductsCount = computed(() => new Set(groups.value.flatMap((group) => linkedProductsFor(group).map((product) => product.id))).size);
const formTitle = computed(() => (editingId.value ? 'Editar Grupo' : 'Cadastrar Grupo'));

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
  selectedGroup.value = null;
  resetForm();
}

function selectGroup(group: ProductGroupItem) {
  selectedGroup.value = group;
  editingId.value = group.id;
  form.description = group.description;
  form.active = group.active;
}

function cancelForm() {
  resetForm();
  selectedGroup.value = null;
}

function linkedProductsFor(group: ProductGroupItem): ProductSummary[] {
  const description = normalize(group.description);
  if (!description) return [];
  return products.value.filter((product) => {
    const searchable = normalize([product.name, product.code ?? '', product.description ?? ''].join(' '));
    return searchable.includes(description);
  });
}

async function loadOperationalLinks() {
  try {
    products.value = await productsService.list();
  } catch {
    products.value = [];
  }
}

async function loadGroups() {
  const response = await productGroupsService.list({
    search: filters.search.trim() || undefined,
    active: filters.active
  });
  groups.value = response.items ?? [];
  if (selectedGroup.value) {
    selectedGroup.value = groups.value.find((group) => group.id === selectedGroup.value?.id) ?? null;
  }
}

async function reload() {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([loadGroups(), loadOperationalLinks()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar grupos de produto';
    groups.value = [];
  } finally {
    loading.value = false;
  }
}

async function searchGroups() {
  loading.value = true;
  error.value = '';
  try {
    await loadGroups();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao pesquisar grupos de produto';
  } finally {
    loading.value = false;
  }
}

async function submitGroup() {
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
      const updated = await productGroupsService.update(editingId.value, payload);
      groups.value = groups.value.map((group) => (group.id === updated.id ? updated : group));
      selectedGroup.value = updated;
      successMessage.value = 'Grupo de produto atualizado com sucesso.';
    } else {
      const created = await productGroupsService.create(payload);
      groups.value = [created, ...groups.value];
      selectedGroup.value = created;
      editingId.value = created.id;
      successMessage.value = 'Grupo de produto cadastrado com sucesso.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao salvar grupo de produto';
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
    await productGroupsService.remove(editingId.value);
    groups.value = groups.value.filter((group) => group.id !== editingId.value);
    cancelForm();
    successMessage.value = 'Grupo de produto excluído com sucesso.';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao excluir grupo de produto';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.product-groups-page {
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
.product-group-form,
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

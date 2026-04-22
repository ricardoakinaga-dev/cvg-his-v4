<template>
  <div class="finance-catalog-page">
    <AppPageHeader
      title="Custos e Despesas"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Custos e Despesas']"
      subtitle="Ciclo funcional do catálogo financeiro com cadastro, edição, remoção e persistência local"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="reload">Atualizar</DsButton>
        <DsButton variant="primary" @click="startCreate">+ Incluir</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert variant="info">
      Esta etapa expande o catálogo de custos e despesas com CRUD local, categorias estruturadas e leitura mais próxima da futura camada de backoffice financeiro.
    </DsAlert>

    <section class="catalog-kpis">
      <DsStatCard :label="`${expenses.length} registro(s)`" value="" icon="🧾" />
      <DsStatCard :label="`${fixedCount} fixo(s)`" value="" icon="📌" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="" icon="🏥" />
      <DsStatCard :label="`${categoryCount} categoria(s)`" value="" icon="🗂️" />
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">{{ successMessage }}</DsAlert>

    <DsCard v-if="showForm" :title="editingId ? 'Editar custo ou despesa' : 'Novo custo ou despesa'">
      <form class="creation-form" @submit.prevent="submitExpense">
        <input v-model="form.name" type="text" placeholder="Nome do lançamento" class="catalog-search" />
        <input v-model="form.kind" type="text" placeholder="Tipo (ex: Variável)" class="catalog-search" />
        <input v-model="form.category" type="text" placeholder="Categoria (ex: Tecnologia)" class="catalog-search" />
        <input v-model="form.description" type="text" placeholder="Descrição operacional" class="catalog-search" />
        <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
          <DsButton type="submit" variant="primary" :loading="submitting">{{ editingId ? 'Salvar alterações' : 'Salvar registro' }}</DsButton>
          <DsButton variant="ghost" @click="cancelForm">Cancelar</DsButton>
        </div>
      </form>
    </DsCard>

    <DsCard title="Cadastro de custos e despesas">
      <div class="catalog-toolbar catalog-toolbar--four">
        <input v-model="filters.id" type="search" placeholder="Id" class="catalog-search" />
        <input v-model="filters.name" type="search" placeholder="Nome" class="catalog-search" />
        <input v-model="filters.category" type="search" placeholder="Categoria" class="catalog-search" />
        <input v-model="filters.description" type="search" placeholder="Descrição" class="catalog-search" />
      </div>

      <div class="catalog-toolbar__actions catalog-toolbar__actions--bottom">
        <DsButton variant="secondary" :loading="loading" @click="reload">Pesquisar</DsButton>
      </div>

      <div v-if="filteredExpenses.length === 0" class="catalog-empty">
        Nenhum registro encontrado.
      </div>

      <table v-else class="catalog-table">
        <thead>
          <tr>
            <th>Id</th>
            <th>Nome</th>
            <th>Categoria</th>
            <th>Descrição</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in filteredExpenses" :key="expense.id">
            <td>{{ expense.id }}</td>
            <td>{{ expense.name }}</td>
            <td>{{ expense.category }}</td>
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
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { expensesCatalogService, type ExpenseCatalogItem } from '@/services/expensesCatalog';

const filters = reactive({ id: '', name: '', category: '', description: '' });
const form = reactive({ name: '', kind: '', category: '', description: '' });
const expenses = ref<ExpenseCatalogItem[]>([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const showForm = ref(true);
const editingId = ref<string | null>(null);

const filteredExpenses = computed(() => {
  return expenses.value.filter((expense) => {
    const idMatch = !filters.id || expense.id.toLowerCase().includes(filters.id.toLowerCase());
    const nameMatch = !filters.name || expense.name.toLowerCase().includes(filters.name.toLowerCase());
    const categoryMatch = !filters.category || expense.category.toLowerCase().includes(filters.category.toLowerCase());
    const descriptionMatch = !filters.description || expense.description.toLowerCase().includes(filters.description.toLowerCase());
    return idMatch && nameMatch && categoryMatch && descriptionMatch;
  });
});

const fixedCount = computed(() => expenses.value.filter((item) => item.kind === 'Fixo').length);
const operationalCount = computed(() => expenses.value.filter((item) => item.kind === 'Operacional').length);
const categoryCount = computed(() => new Set(expenses.value.map((item) => item.category)).size);

function resetForm() {
  form.name = '';
  form.kind = '';
  form.category = '';
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
  form.description = expense.description;
  editingId.value = expense.id;
  showForm.value = true;
}

function cancelForm() {
  resetForm();
  showForm.value = false;
}

async function loadExpenses() {
  loading.value = true;
  error.value = '';
  try {
    expenses.value = await expensesCatalogService.list();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar custos e despesas';
    expenses.value = [];
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadExpenses();
}

async function submitExpense() {
  error.value = '';
  successMessage.value = '';
  if (!form.name.trim() || !form.category.trim() || !form.description.trim()) {
    error.value = 'Nome, categoria e descrição são obrigatórios';
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      const updated = await expensesCatalogService.update(editingId.value, {
        name: form.name,
        kind: form.kind || 'Variável',
        category: form.category,
        description: form.description
      });
      expenses.value = expenses.value.map((item) => (item.id === editingId.value ? updated : item));
      successMessage.value = 'Registro atualizado com sucesso';
    } else {
      const created = await expensesCatalogService.create({
        name: form.name,
        kind: form.kind || 'Variável',
        category: form.category,
        description: form.description
      });
      expenses.value = [created, ...expenses.value];
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
    successMessage.value = 'Registro removido com sucesso';
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao remover registro';
  }
}

onMounted(loadExpenses);
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
.catalog-toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}
.catalog-toolbar--four {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
</style>

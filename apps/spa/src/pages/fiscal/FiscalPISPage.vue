<template>
  <div class="fiscal-pis-page">
    <AppPageHeader
      title="Tabela PIS"
      subtitle="Quer cadastrar PIS de forma prática? Saiba Mais"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Tabela PIS']"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="pis-toolbar" aria-label="Filtros de PIS">
      <DsInput
        v-model="search"
        type="search"
        label="Buscar"
        placeholder="Buscar por código ou descrição"
        @keyup.enter="load"
      />
      <div class="toolbar-actions">
        <DsButton variant="secondary" @click="load">Buscar</DsButton>
        <DsButton variant="ghost" @click="clearSearch">Limpar</DsButton>
      </div>
    </section>

    <DataTable
      :columns="columns"
      :rows="tables"
      :loading="loading"
      empty-icon="📈"
      empty-title="Nenhum registro cadastrado"
      empty-description="Use Incluir Nova Tabela para cadastrar o primeiro PIS."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
      <template #cell-percent="{ row }">
        {{ formatPercent((row as FiscalPisTable).percent) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton variant="ghost" size="sm" @click="openEdit(row as FiscalPisTable)">
          Editar
        </DsButton>
      </template>
    </DataTable>

    <DsModal :open="modalOpen" :title="modalTitle" size="sm" @close="closeModal">
      <form class="pis-form" @submit.prevent="saveTable">
        <DsInput v-model="form.code" label="Código" required />
        <DsInput v-model="form.description" label="Descrição" />
        <DsInput
          v-model.number="form.percent"
          type="number"
          label="Percentual"
          min="0"
          max="100"
          step="0.01"
          required
        />
      </form>

      <template #footer>
        <DsButton variant="ghost" @click="closeModal">Cancelar</DsButton>
        <DsButton :loading="saving" @click="saveTable">Salvar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { fiscalService, type FiscalPisTable } from '@/services/fiscal';

const tables = ref<FiscalPisTable[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const search = ref('');
const modalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  code: '',
  description: '',
  percent: 0
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Descrição' },
  { key: 'percent', label: 'Percentual' },
  { key: 'actions', label: 'Ações', width: '120px' }
];

const modalTitle = computed(() => (editingId.value ? 'Editar Tabela PIS' : 'Incluir Nova Tabela'));

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    tables.value = await fiscalService.listPisTables({
      search: search.value.trim() || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar Tabela PIS';
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  search.value = '';
  void load();
}

function openCreate() {
  editingId.value = null;
  form.code = '';
  form.description = '';
  form.percent = 0;
  modalOpen.value = true;
}

function openEdit(table: FiscalPisTable) {
  editingId.value = table.id;
  form.code = table.code;
  form.description = table.description;
  form.percent = table.percent;
  modalOpen.value = true;
}

function closeModal() {
  if (!saving.value) {
    modalOpen.value = false;
  }
}

async function saveTable() {
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      code: form.code.trim(),
      description: form.description.trim(),
      percent: Number(form.percent)
    };

    if (editingId.value) {
      await fiscalService.updatePisTable(editingId.value, payload);
    } else {
      await fiscalService.createPisTable(payload);
    }

    modalOpen.value = false;
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar Tabela PIS';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-pis-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pis-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.pis-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 720px) {
  .pis-toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }
}
</style>

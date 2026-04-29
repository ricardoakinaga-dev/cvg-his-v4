<template>
  <div class="fiscal-ibs-cbs-page">
    <AppPageHeader
      title="Tabela IBS/CBS"
      subtitle="Quer cadastrar IBS/CBS de forma prática? Saiba Mais"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Tabela IBS/CBS']"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="ibs-cbs-toolbar" aria-label="Filtros de IBS/CBS">
      <DsInput
        v-model="search"
        type="search"
        label="Buscar"
        placeholder="Buscar por ID ou descrição"
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
      empty-icon="📦"
      empty-title="Nenhum registro encontrado"
      empty-description="Use Incluir Nova Tabela para cadastrar a primeira tabela IBS/CBS."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
      <template #cell-ibsPercent="{ row }">
        {{ formatPercent((row as FiscalIbsCbsTable).ibsPercent) }}
      </template>
      <template #cell-cbsPercent="{ row }">
        {{ formatPercent((row as FiscalIbsCbsTable).cbsPercent) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton variant="ghost" size="sm" @click="openEdit(row as FiscalIbsCbsTable)">
          Editar
        </DsButton>
      </template>
    </DataTable>

    <DsModal :open="modalOpen" :title="modalTitle" size="sm" @close="closeModal">
      <form class="ibs-cbs-form" @submit.prevent="saveTable">
        <DsInput v-model="form.code" label="ID" required />
        <DsInput v-model="form.description" label="Descrição" />
        <DsInput
          v-model.number="form.ibsPercent"
          type="number"
          label="IBS"
          min="0"
          max="100"
          step="0.01"
          required
        />
        <DsInput
          v-model.number="form.cbsPercent"
          type="number"
          label="CBS"
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
import { fiscalService, type FiscalIbsCbsTable } from '@/services/fiscal';

const tables = ref<FiscalIbsCbsTable[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const search = ref('');
const modalOpen = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  code: '',
  description: '',
  ibsPercent: 0,
  cbsPercent: 0
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'ID' },
  { key: 'description', label: 'Descrição' },
  { key: 'ibsPercent', label: 'IBS' },
  { key: 'cbsPercent', label: 'CBS' },
  { key: 'actions', label: 'Ações', width: '120px' }
];

const modalTitle = computed(() => (editingId.value ? 'Editar Tabela IBS/CBS' : 'Incluir Nova Tabela'));

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    tables.value = await fiscalService.listIbsCbsTables({
      search: search.value.trim() || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar Tabela IBS/CBS';
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
  form.ibsPercent = 0;
  form.cbsPercent = 0;
  modalOpen.value = true;
}

function openEdit(table: FiscalIbsCbsTable) {
  editingId.value = table.id;
  form.code = table.code;
  form.description = table.description;
  form.ibsPercent = table.ibsPercent;
  form.cbsPercent = table.cbsPercent;
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
      ibsPercent: Number(form.ibsPercent),
      cbsPercent: Number(form.cbsPercent)
    };

    if (editingId.value) {
      await fiscalService.updateIbsCbsTable(editingId.value, payload);
    } else {
      await fiscalService.createIbsCbsTable(payload);
    }

    modalOpen.value = false;
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar Tabela IBS/CBS';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-ibs-cbs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ibs-cbs-toolbar {
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

.ibs-cbs-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 720px) {
  .ibs-cbs-toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }
}
</style>

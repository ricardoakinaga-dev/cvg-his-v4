<template>
  <div class="fiscal-icms-page">
    <AppPageHeader
      title="Tabela ICMS"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Tabela ICMS']"
      subtitle="Quer cadastrar ICMS de forma prática? Saiba Mais"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="icms-toolbar" aria-label="Filtros de ICMS">
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
      empty-icon="📊"
      empty-title="Nenhum registro cadastrado"
      empty-description="Use Incluir Nova Tabela para cadastrar o primeiro ICMS."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
      <template #cell-percent="{ row }">
        {{ formatPercent((row as FiscalIcmsTable).percent) }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton variant="ghost" size="sm" @click="openEdit(row as FiscalIcmsTable)">
          Editar
        </DsButton>
      </template>
    </DataTable>

    <DsModal :open="modalOpen" :title="modalTitle" size="sm" @close="closeModal">
      <form class="icms-form" @submit.prevent="saveTable">
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
import { fiscalService, type FiscalIcmsTable } from '@/services/fiscal';

const tables = ref<FiscalIcmsTable[]>([]);
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

const modalTitle = computed(() => (editingId.value ? 'Editar Tabela ICMS' : 'Incluir Nova Tabela'));

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    tables.value = await fiscalService.listIcmsTables({
      search: search.value.trim() || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar Tabela ICMS';
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

function openEdit(table: FiscalIcmsTable) {
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
      await fiscalService.updateIcmsTable(editingId.value, payload);
    } else {
      await fiscalService.createIcmsTable(payload);
    }

    modalOpen.value = false;
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar Tabela ICMS';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-icms-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.icms-toolbar {
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

.icms-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 720px) {
  .icms-toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }
}
</style>

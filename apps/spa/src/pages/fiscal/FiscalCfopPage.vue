<template>
  <div class="fiscal-cfop-page">
    <AppPageHeader
      title="Tabela CFOP"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Tabela CFOP']"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="cfop-toolbar" aria-label="Filtros de CFOP">
      <DsInput
        v-model="search"
        type="search"
        label="Buscar"
        placeholder="Buscar por código ou nome"
        @keyup.enter="load"
      />
      <div class="toolbar-actions">
        <DsButton variant="secondary" @click="load">Buscar</DsButton>
        <DsButton variant="ghost" @click="clearSearch">Limpar</DsButton>
      </div>
    </section>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      empty-icon="🔢"
      empty-title="Nenhum registro cadastrado"
      empty-description="Use Incluir Nova Tabela para cadastrar o primeiro CFOP."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
      <template #cell-section="{ row }">
        {{ cfopRow(row).section === 'entrada' ? 'Entrada' : 'Saída' }}
      </template>
      <template #cell-documentTypesLabel="{ row }">
        {{ cfopRow(row).documentTypesLabel }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton variant="ghost" size="sm" @click="openEdit(cfopRow(row))">
          Editar
        </DsButton>
      </template>
    </DataTable>

    <DsModal :open="modalOpen" :title="modalTitle" size="sm" @close="closeModal">
      <form class="cfop-form" @submit.prevent="saveCfop">
        <DsInput v-model="form.code" label="Código" required />
        <DsInput v-model="form.description" label="Nome" required />
        <DsInput v-model="form.section" type="select" label="Fluxo">
          <option value="saida">Saída</option>
          <option value="entrada">Entrada</option>
        </DsInput>
        <DsInput v-model="form.category" label="Categoria" />
        <DsInput v-model="form.documentType" type="select" label="Documento padrão">
          <option value="nfe">NFe</option>
          <option value="nfce">NFCe</option>
          <option value="nfse">NFS-e</option>
          <option value="cte">CTe</option>
        </DsInput>
      </form>

      <template #footer>
        <DsButton variant="ghost" @click="closeModal">Cancelar</DsButton>
        <DsButton :loading="saving" @click="saveCfop">Salvar</DsButton>
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
import { fiscalService, type FiscalCfopRow } from '@/services/fiscal';

type CfopSection = FiscalCfopRow['section'];
type CfopDocumentType = FiscalCfopRow['applicableTo'][number];

const rows = ref<FiscalCfopRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const search = ref('');
const modalOpen = ref(false);
const editingCode = ref<string | null>(null);
const form = reactive({
  code: '',
  description: '',
  section: 'saida' as CfopSection,
  category: '',
  documentType: 'nfe' as CfopDocumentType
});

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código' },
  { key: 'description', label: 'Nome' },
  { key: 'section', label: 'Fluxo' },
  { key: 'documentTypesLabel', label: 'Documento' },
  { key: 'actions', label: 'Ações', width: '120px' }
];

const modalTitle = computed(() => (editingCode.value ? 'Editar Tabela CFOP' : 'Incluir Nova Tabela'));

function cfopRow(row: unknown): FiscalCfopRow {
  return row as FiscalCfopRow;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await fiscalService.listCfop({
      search: search.value.trim() || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar Tabela CFOP';
  } finally {
    loading.value = false;
  }
}

function clearSearch() {
  search.value = '';
  void load();
}

function openCreate() {
  editingCode.value = null;
  form.code = '';
  form.description = '';
  form.section = 'saida';
  form.category = '';
  form.documentType = 'nfe';
  modalOpen.value = true;
}

function openEdit(row: FiscalCfopRow) {
  editingCode.value = row.code;
  form.code = row.code;
  form.description = row.description;
  form.section = row.section;
  form.category = row.category;
  form.documentType = row.applicableTo[0] ?? 'nfe';
  modalOpen.value = true;
}

function closeModal() {
  if (!saving.value) {
    modalOpen.value = false;
  }
}

async function saveCfop() {
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      code: form.code.trim(),
      description: form.description.trim(),
      section: form.section,
      category: form.category.trim() || 'geral',
      applicableTo: [form.documentType]
    };

    if (editingCode.value) {
      await fiscalService.updateCfop(editingCode.value, payload);
    } else {
      await fiscalService.createCfop(payload);
    }

    modalOpen.value = false;
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar Tabela CFOP';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-cfop-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cfop-toolbar {
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

.cfop-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 720px) {
  .cfop-toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    justify-content: flex-start;
  }
}
</style>

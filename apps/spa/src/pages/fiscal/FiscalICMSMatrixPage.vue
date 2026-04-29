<template>
  <div class="fiscal-icms-matrix-page">
    <AppPageHeader
      title="Matriz Estado ICMS"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Matriz Estado ICMS']"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton icon="+" @click="openCreate">Incluir Nova Matriz</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="matrix-toolbar" aria-label="Filtros da Matriz Estado ICMS">
      <DsInput
        v-model="search"
        type="search"
        label="Buscar"
        placeholder="Buscar por ID ou UF Destino"
        @keyup.enter="load"
      />
      <div class="toolbar-actions">
        <DsButton variant="secondary" @click="load">Buscar</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <DataTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhum registro cadastrado"
      empty-description="Use Incluir Nova Matriz para cadastrar a primeira matriz de ICMS por estado."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton icon="+" @click="openCreate">Incluir Nova Matriz</DsButton>
      </template>
      <template #cell-rate="{ row }">
        {{ formatRate((row as FiscalIcmsMatrixRow).rate) }}
      </template>
      <template #cell-operationType="{ row }">
        {{ formatOperationType((row as FiscalIcmsMatrixRow).operationType) }}
      </template>
    </DataTable>

    <DsModal :open="modalOpen" title="Incluir Nova Matriz" size="md" @close="closeModal">
      <form class="matrix-form" @submit.prevent="createMatrix">
        <DsInput v-model="form.ufOrigin" type="select" label="UF origem" required>
          <option value="">Selecione</option>
          <option v-for="option in ufOptions" :key="`origin-${option}`" :value="option">{{ option }}</option>
        </DsInput>
        <DsInput v-model="form.ufDestination" type="select" label="UF destino" required>
          <option value="">Selecione</option>
          <option v-for="option in ufOptions" :key="`destination-${option}`" :value="option">{{ option }}</option>
        </DsInput>
        <DsInput v-model="form.operationType" type="select" label="Operação" required>
          <option value="interna">Interna</option>
          <option value="interestadual">Interestadual</option>
        </DsInput>
        <DsInput v-model="form.rate" type="number" min="0" max="100" step="0.01" label="Alíquota" required />
      </form>

      <template #footer>
        <DsButton variant="ghost" @click="closeModal">Cancelar</DsButton>
        <DsButton :loading="saving" @click="createMatrix">Salvar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import { fiscalService, type FiscalIcmsMatrixRow } from '@/services/fiscal';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

const rows = ref<FiscalIcmsMatrixRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');
const search = ref('');
const modalOpen = ref(false);

const columns: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'ufOrigin', label: 'UF origem' },
  { key: 'ufDestination', label: 'UF destino' },
  { key: 'operationType', label: 'Operação' },
  { key: 'rate', label: 'Alíquota' }
];

const ufOptions = ['SP', 'RJ', 'MG', 'PR', 'RS', 'SC', 'BA', 'ES', 'GO', 'DF'];
const form = reactive({
  ufOrigin: '',
  ufDestination: '',
  operationType: 'interestadual' as FiscalIcmsMatrixRow['operationType'],
  rate: ''
});

function formatRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatOperationType(value: FiscalIcmsMatrixRow['operationType']): string {
  return value === 'interna' ? 'Interna' : 'Interestadual';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await fiscalService.listIcmsMatrix({
      search: search.value.trim() || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar Matriz Estado ICMS';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  search.value = '';
  void load();
}

function resetForm() {
  form.ufOrigin = '';
  form.ufDestination = '';
  form.operationType = 'interestadual';
  form.rate = '';
}

function openCreate() {
  resetForm();
  modalOpen.value = true;
}

function closeModal() {
  if (!saving.value) {
    modalOpen.value = false;
  }
}

async function createMatrix() {
  saving.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    if (!form.rate.trim()) {
      throw new Error('Informe a aliquota da Matriz Estado ICMS');
    }

    await fiscalService.createIcmsMatrix({
      ufOrigin: form.ufOrigin,
      ufDestination: form.ufDestination,
      operationType: form.operationType,
      rate: Number(form.rate)
    });
    successMessage.value = 'Matriz Estado ICMS cadastrada com sucesso.';
    modalOpen.value = false;
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar Matriz Estado ICMS';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-icms-matrix-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.matrix-toolbar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.matrix-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}
</style>

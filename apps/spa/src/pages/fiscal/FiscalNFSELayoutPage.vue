<template>
  <div class="fiscal-nfse-page">
    <AppPageHeader
      title="Tabela NFS-e"
      subtitle="Quer cadastrar NFS-e de forma prática? Saiba Mais"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'Tabela NFS-e']"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <section class="nfse-toolbar" aria-label="Filtros de NFS-e">
      <DsInput
        v-model="search"
        type="search"
        label="Buscar"
        placeholder="Buscar por código ou descrição"
        @keyup.enter="load"
      />
      <div class="toolbar-actions">
        <DsButton variant="secondary" @click="load">Buscar</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <DataTable
      :columns="columns"
      :rows="nfseLayouts"
      :loading="loading"
      empty-icon="📄"
      empty-title="Nenhum registro cadastrado"
      empty-description="Use Incluir Nova Tabela para cadastrar a primeira configuração de NFS-e."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton icon="+" @click="openCreate">Incluir Nova Tabela</DsButton>
      </template>
      <template #cell-status="{ row }">
        <DsBadge :variant="(row as FiscalNfseLayoutSummary).active ? 'success' : 'warning'" size="sm">
          {{ (row as FiscalNfseLayoutSummary).active ? 'Ativo' : 'Em homologação' }}
        </DsBadge>
      </template>
      <template #cell-environment="{ row }">
        {{ formatEnvironment((row as FiscalNfseLayoutSummary).environment) }}
      </template>
      <template #cell-serviceFocus="{ row }">
        {{ (row as FiscalNfseLayoutSummary).serviceFocus }}
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          size="sm"
          variant="ghost"
          @click="openEdit(row as FiscalNfseLayoutSummary)"
        >
          Editar
        </DsButton>
      </template>
    </DataTable>

    <DsModal :open="modalOpen" :title="modalTitle" size="md" @close="closeModal">
      <form class="nfse-form" @submit.prevent="saveLayout">
        <DsInput v-model="form.city" label="Município" required />
        <DsInput v-model="form.state" type="select" label="UF" required>
          <option value="">Selecione</option>
          <option v-for="option in stateOptions" :key="option" :value="option">{{ option }}</option>
        </DsInput>
        <DsInput v-model="form.municipalityCode" label="Código" placeholder="Código IBGE" />
        <DsInput v-model="form.provider" label="Descrição" placeholder="Prestador / layout municipal" required />
        <DsInput v-model="form.version" label="Versão" required />
        <DsInput v-model="form.environment" type="select" label="Ambiente" required>
          <option value="homologacao">Homologação</option>
          <option value="producao">Produção</option>
        </DsInput>
        <DsInput v-model="form.serviceCode" label="Código de serviço" />
        <DsInput v-model="form.serviceFocus" label="Foco operacional" />
        <label class="toggle-label">
          <input v-model="form.active" type="checkbox" />
          <span>Publicar tabela como ativa</span>
        </label>
      </form>

      <template #footer>
        <DsButton variant="ghost" @click="closeModal">Cancelar</DsButton>
        <DsButton :loading="saving" @click="saveLayout">Salvar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  fiscalService,
  type FiscalNfseLayoutSummary
} from '@/services/fiscal';

const nfseLayouts = ref<FiscalNfseLayoutSummary[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const successMessage = ref('');
const search = ref('');
const modalOpen = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  city: '',
  state: '',
  municipalityCode: '',
  provider: '',
  version: '',
  active: false,
  environment: 'homologacao' as FiscalNfseLayoutSummary['environment'],
  serviceCode: '',
  serviceFocus: ''
});

const columns: DataTableColumn[] = [
  { key: 'municipalityCode', label: 'Código' },
  { key: 'city', label: 'Descrição' },
  { key: 'state', label: 'UF' },
  { key: 'provider', label: 'Prestador' },
  { key: 'version', label: 'Versão' },
  { key: 'status', label: 'Status' },
  { key: 'environment', label: 'Ambiente' },
  { key: 'serviceCode', label: 'Serviço' },
  { key: 'serviceFocus', label: 'Foco Operacional' },
  { key: 'actions', label: 'Ações', width: '120px' }
];

const stateOptions = ['SP', 'RS', 'PR', 'RJ'];
const modalTitle = computed(() => (editingId.value ? 'Editar Tabela NFS-e' : 'Incluir Nova Tabela'));

function formatEnvironment(value: FiscalNfseLayoutSummary['environment']): string {
  return value === 'producao' ? 'Produção' : 'Homologação';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    nfseLayouts.value = await fiscalService.listNfseLayouts({
      search: search.value.trim() || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar Tabela NFS-e';
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  search.value = '';
  void load();
}

function openCreate() {
  editingId.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(layout: FiscalNfseLayoutSummary) {
  editingId.value = layout.id;
  form.city = layout.city;
  form.state = layout.state;
  form.municipalityCode = layout.municipalityCode;
  form.provider = layout.provider;
  form.version = layout.version;
  form.active = layout.active;
  form.environment = layout.environment;
  form.serviceCode = layout.serviceCode;
  form.serviceFocus = layout.serviceFocus;
  modalOpen.value = true;
}

function closeModal() {
  if (!saving.value) {
    modalOpen.value = false;
  }
}

function resetForm() {
  form.city = '';
  form.state = '';
  form.municipalityCode = '';
  form.provider = '';
  form.version = '';
  form.active = false;
  form.environment = 'homologacao';
  form.serviceCode = '';
  form.serviceFocus = '';
}

async function saveLayout() {
  saving.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const payload = {
      city: form.city.trim(),
      state: form.state.trim(),
      municipalityCode: form.municipalityCode.trim() || undefined,
      provider: form.provider.trim(),
      version: form.version.trim(),
      active: form.active,
      environment: form.environment,
      serviceCode: form.serviceCode.trim() || undefined,
      serviceFocus: form.serviceFocus.trim() || undefined
    };

    if (editingId.value) {
      await fiscalService.updateNfseLayout(editingId.value, payload);
      successMessage.value = 'Tabela NFS-e atualizada com sucesso.';
    } else {
      await fiscalService.createNfseLayout(payload);
      successMessage.value = 'Tabela NFS-e cadastrada com sucesso.';
    }

    modalOpen.value = false;
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar Tabela NFS-e';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.fiscal-nfse-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nfse-toolbar {
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

.nfse-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.toggle-label {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 40px;
  color: var(--color-text-secondary, #475569);
}

.toggle-label input {
  width: auto;
}
</style>

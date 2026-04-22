<template>
  <div class="fiscal-nfse-page">
    <AppPageHeader
      title="NFS-e"
      :breadcrumbs="['Estoque', 'Configurações Fiscais', 'NFS-e']"
      subtitle="Backoffice inicial para cadastro e ajuste de layouts municipais de NFS-e"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DsAlert variant="info">
      Esta página já permite cadastro e ajuste operacional de layouts NFS-e. Emissão,
      cancelamento e transmissão fiscal continuam fora da superfície disponível.
    </DsAlert>

    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <DsCard title="Novo layout municipal">
      <form class="layout-form" @submit.prevent="createLayout">
        <DsInput v-model="form.city" label="Município *" placeholder="Campinas" required />
        <DsInput v-model="form.state" type="select" label="UF *" required>
          <option value="">Selecione</option>
          <option v-for="option in stateOptions" :key="option" :value="option">{{ option }}</option>
        </DsInput>
        <DsInput v-model="form.municipalityCode" label="Código IBGE" placeholder="3509502" />
        <DsInput v-model="form.provider" label="Prestador *" placeholder="ISS Campinas" required />
        <DsInput v-model="form.version" label="Versão *" placeholder="v2026.1" required />
        <DsInput v-model="form.environment" type="select" label="Ambiente *" required>
          <option value="homologacao">Homologação</option>
          <option value="producao">Produção</option>
        </DsInput>
        <DsInput v-model="form.serviceCode" label="Código de serviço" placeholder="0407" />
        <DsInput
          v-model="form.serviceFocus"
          label="Foco operacional"
          placeholder="Consultas e serviços veterinários"
        />
        <label class="toggle-label">
          <input v-model="form.active" type="checkbox" />
          <span>Publicar layout como ativo</span>
        </label>
        <div class="layout-form__actions">
          <DsButton type="submit" variant="primary" :loading="submitting">
            {{ submitting ? 'Salvando...' : 'Cadastrar layout' }}
          </DsButton>
          <DsButton type="button" variant="ghost" @click="resetForm">Limpar</DsButton>
        </div>
      </form>
    </DsCard>

    <section class="filter-bar">
      <DsInput v-model="state" type="select" label="UF">
        <option value="">Todas</option>
        <option v-for="option in stateOptions" :key="option" :value="option">{{ option }}</option>
      </DsInput>
      <DsInput v-model="activeFilter" type="select" label="Status">
        <option value="">Todos</option>
        <option value="true">Ativos</option>
        <option value="false">Homologação / pausados</option>
      </DsInput>
      <div class="filter-actions">
        <DsButton variant="secondary" @click="load">Aplicar filtros</DsButton>
        <DsButton variant="ghost" @click="resetFilters">Limpar</DsButton>
      </div>
    </section>

    <section class="hub-kpis">
      <DsStatCard :label="`${nfseLayouts.length} município(s)`" value="" icon="🏙️" />
      <DsStatCard :label="`${activeLayouts} layout(s) ativos`" value="" icon="📄" />
    </section>

    <DataTable
      :columns="columns"
      :rows="nfseLayouts"
      :loading="loading"
      empty-icon="📄"
      empty-title="Nenhum layout de NFS-e encontrado"
      empty-description="A API fiscal ainda não retornou layouts de NFS-e para consulta."
      variant="hoverable"
    >
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
          variant="secondary"
          :loading="togglingLayoutId === (row as FiscalNfseLayoutSummary).id"
          @click="toggleLayoutStatus(row as FiscalNfseLayoutSummary)"
        >
          {{ (row as FiscalNfseLayoutSummary).active ? 'Pausar' : 'Ativar' }}
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  fiscalService,
  type FiscalNfseLayoutSummary
} from '@/services/fiscal';

const nfseLayouts = ref<FiscalNfseLayoutSummary[]>([]);
const loading = ref(false);
const submitting = ref(false);
const togglingLayoutId = ref('');
const error = ref('');
const successMessage = ref('');

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
  { key: 'city', label: 'Município' },
  { key: 'state', label: 'UF' },
  { key: 'municipalityCode', label: 'Código IBGE' },
  { key: 'provider', label: 'Prestador' },
  { key: 'version', label: 'Versão' },
  { key: 'status', label: 'Status' },
  { key: 'environment', label: 'Ambiente' },
  { key: 'serviceCode', label: 'Serviço' },
  { key: 'serviceFocus', label: 'Foco Operacional' },
  { key: 'actions', label: 'Ações', width: '120px' }
];

const activeLayouts = computed(() => nfseLayouts.value.filter((item) => item.active).length);
const stateOptions = ['SP', 'RS', 'PR', 'RJ'];
const state = ref('');
const activeFilter = ref<'true' | 'false' | ''>('');

function formatEnvironment(value: FiscalNfseLayoutSummary['environment']): string {
  return value === 'producao' ? 'Produção' : 'Homologação';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    nfseLayouts.value = await fiscalService.listNfseLayouts({
      state: state.value || undefined,
      active: activeFilter.value === '' ? undefined : activeFilter.value === 'true'
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar layouts';
  } finally {
    loading.value = false;
  }
}

async function createLayout() {
  submitting.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    await fiscalService.createNfseLayout({
      city: form.city,
      state: form.state,
      municipalityCode: form.municipalityCode || undefined,
      provider: form.provider,
      version: form.version,
      active: form.active,
      environment: form.environment,
      serviceCode: form.serviceCode || undefined,
      serviceFocus: form.serviceFocus || undefined
    });
    successMessage.value = 'Layout NFS-e cadastrado com sucesso.';
    resetForm();
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao cadastrar layout';
  } finally {
    submitting.value = false;
  }
}

async function toggleLayoutStatus(layout: FiscalNfseLayoutSummary) {
  togglingLayoutId.value = layout.id;
  error.value = '';
  successMessage.value = '';

  try {
    await fiscalService.updateNfseLayout(layout.id, {
      active: !layout.active,
      environment: !layout.active ? 'producao' : 'homologacao'
    });
    successMessage.value = layout.active
      ? 'Layout movido para homologação.'
      : 'Layout ativado para produção.';
    await load();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao atualizar layout';
  } finally {
    togglingLayoutId.value = '';
  }
}

function resetFilters() {
  state.value = '';
  activeFilter.value = '';
  void load();
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

onMounted(load);
</script>

<style scoped>
.fiscal-nfse-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.layout-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  align-items: end;
}

.layout-form__actions {
  display: flex;
  gap: 8px;
  align-items: center;
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

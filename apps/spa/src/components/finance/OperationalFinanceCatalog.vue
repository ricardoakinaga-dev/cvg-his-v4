<template>
  <div class="operational-catalog-page">
    <AppPageHeader
      :title="metadata.title"
      :breadcrumbs="metadata.breadcrumbs"
      :subtitle="metadata.subtitle"
      :secondary-actions="headerSecondaryActions"
      :primary-action="headerPrimaryAction"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success">{{ successMessage }}</DsAlert>
    <form
      class="catalog-filters"
      :aria-label="`Filtros de ${metadata.title}`"
      @submit.prevent="load(1)"
    >
      <DsInput
        :id="`${type}-search`"
        v-model="filters.search"
        type="search"
        label="Pesquisar"
        placeholder="Buscar por código ou nome"
      />
      <DsInput :id="`${type}-status`" v-model="filters.status" type="select" label="Status">
        <option value="">Todos</option>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
      </DsInput>
      <div class="catalog-filter-actions">
        <DsButton type="submit" variant="secondary" :loading="loading" :disabled="submitting">Aplicar filtros</DsButton>
        <DsButton type="button" variant="ghost" :disabled="loading || submitting" @click="clearFilters"
          >Limpar</DsButton
        >
      </div>
    </form>

    <section v-if="failed && !loading" class="catalog-recovery" role="status">
      <h2>Consulta indisponível</h2>
      <p>Não foi possível consultar os registros. Tente novamente para carregar os dados.</p>
      <DsButton variant="secondary" :disabled="submitting" @click="retryLoad">Tentar novamente</DsButton>
    </section>
    <DataTable v-else
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :empty-icon="metadata.emptyIcon"
      empty-title="Nenhum registro nesta consulta"
      empty-description="Ajuste os filtros ou crie o primeiro registro."
      :caption="metadata.title"
      row-key-field="id"
      variant="hoverable"
    >
      <template #cell-identification="{ row }">
        <strong>{{ catalogRow(row).name }}</strong>
        <small>{{ catalogRow(row).code }}</small>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="catalogRow(row).status === 'active' ? 'Ativo' : 'Inativo'"
          :variant="catalogRow(row).status === 'active' ? 'success' : 'neutral'"
        />
      </template>
      <template #cell-details="{ row }">
        <details class="configuration-details">
          <summary>Ver configuração</summary>
        <dl class="configuration-summary">
          <div v-for="detail in configurationDetails(catalogRow(row))" :key="detail.label">
            <dt>{{ detail.label }}</dt>
            <dd>{{ detail.value }}</dd>
          </div>
        </dl>
        </details>
      </template>
      <template #cell-version="{ row }">
        <span>v{{ catalogRow(row).version }}</span>
        <small>{{ formatDate(catalogRow(row).updatedAt) }}</small>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <DsButton size="sm" variant="secondary" :disabled="submitting" @click="openEdit(catalogRow(row))"
            >Editar</DsButton
          >
          <DsButton size="sm" variant="danger" :disabled="submitting" @click="openDelete(catalogRow(row))"
            >Excluir</DsButton
          >
        </div>
      </template>
      <template #emptyAction>
        <DsButton variant="primary" :disabled="submitting" @click="openCreate">Criar {{ metadata.singular }}</DsButton>
      </template>
    </DataTable>

    <nav v-if="ready && totalPages > 1" class="catalog-pagination" aria-label="Paginação do catálogo">
      <DsButton variant="secondary" :disabled="page <= 1 || loading || submitting" @click="load(page - 1, true)"
        >Anterior</DsButton
      >
      <span aria-live="polite">Página {{ page }} de {{ totalPages }}</span>
      <DsButton
        variant="secondary"
        :disabled="page >= totalPages || loading || submitting"
        @click="load(page + 1, true)"
        >Próxima</DsButton
      >
    </nav>

    <details class="catalog-summary">
      <summary>Resumo da consulta</summary>
      <dl>
        <div><dt>Registros encontrados</dt><dd>{{ ready ? totalItems : '—' }}</dd></div>
        <div><dt>Ativos nesta página</dt><dd>{{ ready ? activeCount : '—' }}</dd></div>
        <div><dt>Inativos nesta página</dt><dd>{{ ready ? inactiveCount : '—' }}</dd></div>
        <div><dt>Página</dt><dd>{{ ready ? `${page} de ${totalPages}` : '—' }}</dd></div>
      </dl>
    </details>

    <DsModal
      :open="formOpen"
      :teleport="false"
      :title="editingItem ? `Editar ${metadata.singular}` : createLabel"
      size="lg"
      @close="closeForm"
    >
      <DsAlert v-if="formError" variant="danger">{{ formError }}</DsAlert>
      <form class="catalog-form" @submit.prevent="submitForm">
        <DsInput
          :id="`${type}-form-code`"
          v-model="form.code"
          label="Código"
          :maxlength="64"
          autocomplete="off"
          required
        />
        <DsInput
          :id="`${type}-form-name`"
          v-model="form.name"
          label="Nome"
          :maxlength="160"
          autocomplete="off"
          required
        />
        <DsInput
          :id="`${type}-form-status`"
          v-model="form.status"
          type="select"
          label="Status"
          required
        >
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </DsInput>

        <template v-for="field in metadata.fields" :key="field.key">
          <DsInput
            v-if="field.kind === 'select'"
            :id="`${type}-form-${field.key}`"
            v-model="form.configuration[field.key]"
            type="select"
            :label="field.label"
            :hint="field.hint"
            required
          >
            <option v-for="option in field.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </DsInput>
          <DsInput
            v-else-if="field.kind === 'number'"
            :id="`${type}-form-${field.key}`"
            v-model.number="form.configuration[field.key]"
            type="number"
            :label="field.label"
            :hint="field.hint"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            required
          />
          <DsInput
            v-else
            :id="`${type}-form-${field.key}`"
            v-model="form.configuration[field.key]"
            :type="field.kind === 'list' ? 'textarea' : 'text'"
            :label="field.label"
            :hint="field.hint"
            autocomplete="off"
            required
          />
        </template>
      </form>
      <template #footer>
        <DsButton variant="secondary" :disabled="submitting" @click="closeForm">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submitForm"
        >
          {{ editingItem ? 'Salvar alterações' : 'Criar registro' }}
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="deleteOpen"
      :teleport="false"
      :title="`Excluir ${metadata.singular}`"
      size="sm"
      @close="closeDelete"
    >
      <DsAlert v-if="deleteError" variant="danger">{{ deleteError }}</DsAlert>
      <p v-if="deletingItem">
        Confirma a exclusão de <strong>{{ deletingItem.name }}</strong> ({{ deletingItem.code }})?
      </p>
      <template #footer>
        <DsButton variant="secondary" :disabled="submitting" @click="closeDelete"
          >Cancelar</DsButton
        >
        <DsButton variant="danger" :loading="submitting" @click="removeItem"
          >Excluir definitivamente</DsButton
        >
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  financeOperationalCatalogService,
  type FinanceOperationalCatalogInput,
  type FinanceOperationalCatalogItem,
  type FinanceOperationalCatalogStatus,
  type FinanceOperationalCatalogType
} from '@/services/financeOperationalCatalog';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

interface FieldOption {
  value: string;
  label: string;
}

interface FieldDefinition {
  key: string;
  label: string;
  kind: 'text' | 'select' | 'number' | 'list';
  hint?: string;
  options?: readonly FieldOption[];
  min?: number;
  max?: number;
  step?: number;
}

interface CatalogMetadata {
  title: string;
  singular: string;
  subtitle: string;
  breadcrumbs: string[];
  emptyIcon: string;
  fields: readonly FieldDefinition[];
}

const CATALOG_METADATA: Record<FinanceOperationalCatalogType, CatalogMetadata> = {
  banks: {
    title: 'Bancos',
    singular: 'Banco',
    subtitle: 'Cadastro operacional de bancos, contas, agência e uso financeiro',
    breadcrumbs: ['Financeiro', 'Cadastros', 'Bancos'],
    emptyIcon: '🏦',
    fields: [
      { key: 'bankCode', label: 'Código bancário', kind: 'text' },
      { key: 'agency', label: 'Agência', kind: 'text' },
      { key: 'accountNumber', label: 'Conta', kind: 'text' },
      {
        key: 'accountType',
        label: 'Tipo de conta',
        kind: 'select',
        options: [
          { value: 'checking', label: 'Conta corrente' },
          { value: 'savings', label: 'Poupança' },
          { value: 'payment', label: 'Conta pagamento' }
        ]
      },
      {
        key: 'usageKey',
        label: 'Uso',
        kind: 'select',
        options: [
          { value: 'settlement', label: 'Liquidação' },
          { value: 'card', label: 'Cartões' },
          { value: 'support', label: 'Apoio' }
        ]
      },
      { key: 'usageDescription', label: 'Descrição de uso', kind: 'text' },
      {
        key: 'reconciliationMode',
        label: 'Modo de conciliação',
        kind: 'select',
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'automatic', label: 'Automático' },
          { value: 'disabled', label: 'Desabilitado' }
        ]
      }
    ]
  },
  'payment-methods': {
    title: 'Formas de Pagamento',
    singular: 'Forma de pagamento',
    subtitle: 'Cadastro operacional de meios de pagamento, integrações e uso financeiro',
    breadcrumbs: ['Financeiro', 'Cadastros', 'Formas de Pagamento'],
    emptyIcon: '💳',
    fields: [
      {
        key: 'methodType',
        label: 'Tipo',
        kind: 'select',
        options: [
          { value: 'cash', label: 'Presencial' },
          { value: 'digital', label: 'Digital' },
          { value: 'credit', label: 'Crédito' },
          { value: 'receivable', label: 'Recebível' }
        ]
      },
      {
        key: 'integration',
        label: 'Integração',
        kind: 'select',
        options: [
          { value: 'cash-drawer', label: 'Gaveta' },
          { value: 'pix', label: 'PIX' },
          { value: 'card-machine', label: 'TEF/Maquininha' },
          { value: 'receivables', label: 'Contas a receber' }
        ]
      },
      { key: 'integrationDetail', label: 'Detalhe da integração', kind: 'text' },
      { key: 'usageDescription', label: 'Descrição de uso', kind: 'text' }
    ]
  },
  'card-machines': {
    title: 'Maquininhas',
    singular: 'Maquininha',
    subtitle: 'Terminais de cartão, provedores, unidades e domicílio bancário',
    breadcrumbs: ['Financeiro', 'Maquininha de Cartão', 'Maquininhas'],
    emptyIcon: '💳',
    fields: [
      { key: 'provider', label: 'Provedor', kind: 'text' },
      { key: 'serialNumber', label: 'Número de série', kind: 'text' },
      { key: 'unit', label: 'Unidade', kind: 'text' },
      { key: 'settlementBankCode', label: 'Código do banco de liquidação', kind: 'text' },
      {
        key: 'acceptedMethods',
        label: 'Formas aceitas',
        kind: 'list',
        hint: 'Separe os códigos por vírgula. Ex.: PIX, CARD_CREDIT, CARD_DEBIT'
      }
    ]
  },
  'split-rules': {
    title: 'Configuração do Split',
    singular: 'Regra de split',
    subtitle: 'Regras de split, recebedores, percentuais e prioridade de aplicação',
    breadcrumbs: ['Financeiro', 'Maquininha de Cartão', 'Configuração do Split'],
    emptyIcon: '🧩',
    fields: [
      { key: 'recipient', label: 'Recebedor', kind: 'text' },
      { key: 'percentage', label: 'Percentual', kind: 'number', min: 0.01, max: 100, step: 0.01 },
      { key: 'appliesTo', label: 'Aplicável a', kind: 'text' },
      { key: 'priority', label: 'Prioridade', kind: 'number', min: 0, step: 1 }
    ]
  }
};

const props = defineProps<{ type: FinanceOperationalCatalogType }>();
const columns: readonly DataTableColumn[] = [
  { key: 'identification', label: 'Identificação' },
  { key: 'status', label: 'Status' },
  { key: 'details', label: 'Configuração' },
  { key: 'version', label: 'Versão' },
  { key: 'actions', label: 'Ações', class: 'table__actions-col' }
];
const metadata = computed(() => CATALOG_METADATA[props.type]);
const items = ref<FinanceOperationalCatalogItem[]>([]);
const loading = ref(true);
const failed = ref(false);
const ready = computed(() => !loading.value && !failed.value);
let latestRequest = 0;
let contextVersion = 0;
const submitting = ref(false);
const error = ref('');
const successMessage = ref('');
const formError = ref('');
const deleteError = ref('');
const formOpen = ref(false);
const deleteOpen = ref(false);
const editingItem = ref<FinanceOperationalCatalogItem | null>(null);
const deletingItem = ref<FinanceOperationalCatalogItem | null>(null);
const page = ref(1);
const totalPages = ref(1);
const totalItems = ref(0);
const filters = reactive({
  search: '',
  status: '' as '' | FinanceOperationalCatalogStatus
});
const appliedFilters = reactive({ ...filters });
const retryQuery = reactive({ ...filters });
const retryPage = ref(1);
const createLabel = computed(() => `${props.type === 'banks' ? 'Novo' : 'Nova'} ${metadata.value.singular}`);

const form = reactive({
  code: '',
  name: '',
  status: 'active' as FinanceOperationalCatalogStatus,
  configuration: {} as Record<string, string | number>
});

const rows = computed(() => items.value as unknown as DataTableRow[]);
const activeCount = computed(() => items.value.filter((item) => item.status === 'active').length);
const inactiveCount = computed(
  () => items.value.filter((item) => item.status === 'inactive').length
);
const canSubmit = computed(() => {
  if (submitting.value || !form.code.trim() || !form.name.trim()) return false;
  return metadata.value.fields.every((field) => {
    const value = form.configuration[field.key];
    if (field.kind === 'number') {
      if (String(value ?? '').trim() === '') return false;
      const number = Number(value);
      if (!Number.isFinite(number) || (field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) return false;
      if (field.step !== undefined) {
        const steps = (number - (field.min ?? 0)) / field.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-8) return false;
      }
      return true;
    }
    return String(value ?? '').trim().length > 0;
  });
});
const headerPrimaryAction = computed(() => ({
  label: createLabel.value,
  disabled: submitting.value,
  onClick: () => openCreate()
}));
const headerSecondaryActions = computed(() => [
  {
    key: `refresh-${props.type}`,
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    disabled: loading.value || submitting.value,
    onClick: () => load(page.value, true)
  }
]);

onMounted(() => void load(1));
watch(
  () => props.type,
  () => {
    contextVersion += 1;
    formOpen.value = false;
    deleteOpen.value = false;
    editingItem.value = null;
    deletingItem.value = null;
    successMessage.value = '';
    page.value = 1;
    Object.assign(appliedFilters, { search: '', status: '' });
    clearFilters();
    resetForm();
  }
);

async function load(targetPage: number, useAppliedFilters = false, queryOverride?: typeof filters) {
  const request = ++latestRequest;
  const type = props.type;
  const query = { ...(queryOverride ?? (useAppliedFilters ? appliedFilters : filters)) };
  loading.value = true;
  error.value = '';
  try {
    const result = await financeOperationalCatalogService.list(type, {
      ...(query.search.trim() ? { search: query.search.trim() } : {}),
      ...(query.status ? { status: query.status } : {}),
      page: Math.max(1, targetPage),
      pageSize: 25
    });
    if (request !== latestRequest || type !== props.type) return;
    items.value = result.items;
    page.value = result.page;
    totalPages.value = result.totalPages;
    totalItems.value = result.totalItems;
    Object.assign(appliedFilters, query);
    failed.value = false;
  } catch {
    if (request !== latestRequest || type !== props.type) return;
    items.value = [];
    failed.value = true;
    Object.assign(retryQuery, query);
    retryPage.value = Math.max(1, targetPage);
    error.value = `Não foi possível carregar ${metadata.value.title.toLowerCase()}.`;
  } finally {
    if (request === latestRequest && type === props.type) loading.value = false;
  }
}

function retryLoad() {
  void load(retryPage.value, false, { ...retryQuery });
}

function clearFilters() {
  filters.search = '';
  filters.status = '';
  void load(1);
}

function resetForm() {
  form.code = '';
  form.name = '';
  form.status = 'active';
  form.configuration = Object.fromEntries(
    metadata.value.fields.map((field) => {
      if (field.kind === 'number') return [field.key, field.min ?? 0];
      if (field.kind === 'select') return [field.key, field.options?.[0]?.value ?? ''];
      return [field.key, ''];
    })
  );
}

function openCreate() {
  if (submitting.value) return;
  editingItem.value = null;
  formError.value = '';
  resetForm();
  formOpen.value = true;
}

function openEdit(item: FinanceOperationalCatalogItem) {
  if (!ready.value || submitting.value) return;
  editingItem.value = item;
  formError.value = '';
  form.code = item.code;
  form.name = item.name;
  form.status = item.status;
  form.configuration = Object.fromEntries(
    metadata.value.fields.map((field) => {
      const value = (item.configuration as unknown as Record<string, unknown>)[field.key];
      return [field.key, Array.isArray(value) ? value.join(', ') : (value as string | number)];
    })
  );
  formOpen.value = true;
}

function closeForm() {
  if (submitting.value) return;
  formOpen.value = false;
  editingItem.value = null;
  formError.value = '';
}

function serializeConfiguration(): Record<string, unknown> {
  return Object.fromEntries(
    metadata.value.fields.map((field) => {
      const value = form.configuration[field.key];
      if (field.kind === 'list') {
        return [
          field.key,
          String(value)
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        ];
      }
      if (field.kind === 'number') return [field.key, Number(value)];
      return [field.key, String(value).trim()];
    })
  );
}

async function submitForm() {
  if (!canSubmit.value) return;
  const version = contextVersion;
  submitting.value = true;
  formError.value = '';
  const input = {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    status: form.status,
    configuration: serializeConfiguration()
  } as unknown as FinanceOperationalCatalogInput;
  try {
    if (editingItem.value) {
      await financeOperationalCatalogService.update(
        props.type,
        editingItem.value.id,
        editingItem.value.version,
        input as never
      );
      if (version !== contextVersion) return;
      successMessage.value = 'Alterações salvas.';
    } else {
      await financeOperationalCatalogService.create(props.type, input as never);
      if (version !== contextVersion) return;
      successMessage.value = 'Registro criado.';
    }
    formOpen.value = false;
    editingItem.value = null;
    await load(page.value, true);
  } catch (submitError) {
    if (version !== contextVersion) return;
    formError.value = errorMessage(submitError, 'Não foi possível salvar o registro.');
  } finally {
    submitting.value = false;
  }
}

function openDelete(item: FinanceOperationalCatalogItem) {
  if (!ready.value || submitting.value) return;
  deletingItem.value = item;
  deleteError.value = '';
  deleteOpen.value = true;
}

function closeDelete() {
  if (submitting.value) return;
  deletingItem.value = null;
  deleteError.value = '';
  deleteOpen.value = false;
}

async function removeItem() {
  if (!deletingItem.value || submitting.value) return;
  const version = contextVersion;
  submitting.value = true;
  deleteError.value = '';
  try {
    await financeOperationalCatalogService.remove(props.type, deletingItem.value.id);
    if (version !== contextVersion) return;
    successMessage.value = 'Registro excluído.';
    deleteOpen.value = false;
    deletingItem.value = null;
    await load(page.value, true);
  } catch (removeError) {
    if (version !== contextVersion) return;
    deleteError.value = errorMessage(removeError, 'Não foi possível excluir o registro.');
  } finally {
    submitting.value = false;
  }
}

function configurationDetails(item: FinanceOperationalCatalogItem) {
  const configuration = item.configuration as unknown as Record<string, unknown>;
  return metadata.value.fields.map((field) => ({
    label: field.label,
    value: formatConfigurationValue(field, configuration[field.key])
  }));
}

function formatConfigurationValue(field: FieldDefinition, value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (field.kind === 'select') {
    return field.options?.find((option) => option.value === value)?.label ?? String(value ?? '—');
  }
  if (field.key === 'percentage') return `${value}%`;
  return String(value ?? '—');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}

function catalogRow(row: DataTableRow): FinanceOperationalCatalogItem {
  return row as unknown as FinanceOperationalCatalogItem;
}

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error && value.message ? value.message : fallback;
}

resetForm();
</script>

<style scoped>
.operational-catalog-page {
  display: grid;
  gap: 16px;
}

.catalog-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(240px, 2fr) minmax(160px, 1fr) auto;
}

.catalog-filter-actions,
.row-actions,
.catalog-pagination {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}


.configuration-summary {
  display: grid;
  gap: 3px;
  margin: 0;
}

.configuration-summary div {
  display: grid;
  gap: 4px;
  grid-template-columns: minmax(90px, 0.7fr) minmax(120px, 1.3fr);
}

.configuration-summary dt {
  color: var(--color-text-muted, #64748b);
}

.configuration-summary dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.catalog-pagination {
  justify-content: flex-end;
}

.catalog-form {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

small {
  color: var(--color-text-muted, #64748b);
  display: block;
  margin-top: 2px;
}

code {
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .catalog-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .catalog-filters {
    grid-template-columns: 1fr 1fr;
  }

  .catalog-filter-actions {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .catalog-filters,
  .catalog-form {
    grid-template-columns: 1fr;
  }

  .catalog-filter-actions {
    grid-column: auto;
  }
}

.catalog-summary { display: block; padding: 0 16px 16px; border: 1px solid var(--color-border); border-radius: 12px; }
.catalog-summary summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; font-weight: 600; }
.catalog-summary summary::before { content: '▸'; margin-right: 8px; }
.catalog-summary[open] summary::before { content: '▾'; }
.catalog-summary dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
.catalog-summary dt { color: var(--color-text-secondary); font-size: 13px; }
.catalog-summary dd { margin: 4px 0 0; font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
.catalog-recovery { padding: 24px; border: 1px solid var(--color-border); border-radius: 12px; }
.catalog-recovery h2 { font-size: 18px; margin: 0 0 8px; }
.catalog-recovery p { color: var(--color-text-secondary); }
.operational-catalog-page :deep(input), .operational-catalog-page :deep(select), .operational-catalog-page :deep(button) { min-height: 44px; }
.operational-catalog-page :deep(th:first-child), .operational-catalog-page :deep(td:first-child) { min-width: 240px; }
.operational-catalog-page :deep(.ds-modal__close) { min-width: 44px; }
.configuration-details summary { min-height: 44px; cursor: pointer; display: flex; align-items: center; white-space: nowrap; }
.configuration-details summary::before { content: '▸'; margin-right: 8px; }
.configuration-details[open] summary::before { content: '▾'; }
.operational-catalog-page :deep(td) { vertical-align: top; }
@media (max-width: 640px) {
  .catalog-filters { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
  .catalog-filter-actions { grid-column: 1 / -1; }
  .operational-catalog-page :deep(.app-page-header__action-group) { grid-template-columns: auto minmax(0, 1fr); }
  .operational-catalog-page :deep(.app-page-header__action-group > .app-page-header__primary) { grid-column: auto; }
  .operational-catalog-page :deep(.app-page-header__action-group .ds-btn__label) { white-space: normal; }
}
</style>

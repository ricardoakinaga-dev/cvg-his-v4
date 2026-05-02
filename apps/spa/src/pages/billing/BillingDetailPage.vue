<template>
  <div class="billing-detail-page">
    <div v-if="loading" class="page-loading">
      <SkeletonLoader variant="heading" width="40%" />
      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px">
        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="card" />
      </div>
    </div>

    <div v-else-if="error" role="alert">
      <DsAlert variant="danger">{{ error }}</DsAlert>
    </div>

    <template v-else-if="billingRecordMissing">
      <AppPageHeader
        title="Faturamento"
        :subtitle="billingHeaderSubtitle"
        :breadcrumb-items="headerBreadcrumbItems"
        :context-items="headerContextItems"
        :next-steps="headerNextSteps"
        :primary-action="headerPrimaryAction"
        :secondary-actions="headerSecondaryActions"
      />

      <DsCard title="Cobrança ainda não persistida">
        <div class="billing-empty-state">
          <p class="billing-empty-state__lead">
            Ainda não há cobrança persistida para este atendimento.
          </p>
          <p class="billing-empty-state__text">
            A leitura desta página não cria registro financeiro automaticamente. Gere uma
            estimativa somente quando houver ação explícita da recepção ou do financeiro.
          </p>
          <div class="billing-empty-state__actions">
            <DsButton variant="primary" :loading="creatingEstimate" @click="handleCreateEstimate">
              {{ creatingEstimate ? 'Gerando...' : 'Gerar estimativa' }}
            </DsButton>
            <DsButton variant="secondary" tag="a" href="/billing">Voltar</DsButton>
          </div>
        </div>
      </DsCard>
    </template>

    <template v-else-if="record">
      <AppPageHeader
        title="Faturamento"
        :subtitle="billingHeaderSubtitle"
        :breadcrumb-items="headerBreadcrumbItems"
        :context-items="headerContextItems"
        :next-steps="headerNextSteps"
        :primary-action="headerPrimaryAction"
        :secondary-actions="headerSecondaryActions"
      />

      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <div class="billing-detail-page__grid">
        <AppDetailSection title="Informações">
          <div class="detail-row">
            <span class="detail-row__label">Paciente</span>
            <span>{{ patientName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Tutor</span>
            <span>{{ ownerName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Moeda</span>
            <span>{{ record.currency }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Subtotal</span>
            <span class="billing-amount">{{ formatCurrency(record.subtotalAmount) }}</span>
          </div>
          <div v-if="record.administrativeNotes" class="detail-row">
            <span class="detail-row__label">Observações</span>
            <span>{{ record.administrativeNotes }}</span>
          </div>
        </AppDetailSection>

        <AppDetailSection :title="'Itens de Cobrança (' + items.length + ')'">
          <div v-if="itemsLoading" class="muted">Carregando itens...</div>
          <div v-else-if="items.length === 0" class="muted">Nenhum item adicionado ainda.</div>
          <div v-else class="items-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Valor Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in items" :key="item.id">
                  <td>{{ itemTypeLabel(item.itemType) }}</td>
                  <td>{{ item.description }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ formatCurrency(item.unitPriceAmount) }}</td>
                  <td class="billing-amount">{{ formatCurrency(item.totalAmount) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AppDetailSection>

        <AppDetailSection title="Histórico do Registro">
          <p class="muted" style="margin-bottom: 4px">
            Criado em: {{ formatDate(record.createdAt) }}
          </p>
          <p class="muted">Atualizado em: {{ formatDate(record.updatedAt) }}</p>
        </AppDetailSection>
      </div>
    </template>

    <!-- Add Item Modal -->
    <DsModal
      :open="showAddItemModal"
      :teleport="false"
      title="Adicionar Item de Cobrança"
      @close="showAddItemModal = false"
    >
      <DsAlert v-if="addItemError" variant="danger">{{ addItemError }}</DsAlert>

      <DsInput id="itemType" v-model="addItemForm.itemType" type="select" label="Tipo" required>
        <option value="service">Serviço</option>
        <option value="supply">Material</option>
        <option value="procedure">Procedimento</option>
        <option value="exam">Exame</option>
        <option value="daily_rate">Diária</option>
        <option value="other">Outro</option>
      </DsInput>

      <DsInput
        id="itemDescription"
        v-model="addItemForm.description"
        label="Descrição"
        placeholder="Ex: Consulta veterinária"
        required
      />

      <div class="form-row" style="margin-top: 12px">
        <DsInput
          id="itemQuantity"
          v-model.number="addItemForm.quantity"
          type="number"
          label="Quantidade"
          required
        />
        <DsInput
          id="itemPrice"
          v-model.number="addItemForm.unitPriceAmount"
          type="number"
          label="Valor Unitário (R$)"
          placeholder="0.00"
          required
        />
      </div>

      <template #footer>
        <DsButton variant="secondary" @click="showAddItemModal = false">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :disabled="!isAddItemValid || addingItem"
          @click="handleAddItem"
        >
          {{ addingItem ? 'Adicionando...' : 'Adicionar' }}
        </DsButton>
      </template>
    </DsModal>

    <!-- Status Update Modal -->
    <DsModal
      :open="showStatusModal"
      :teleport="false"
      title="Atualizar Status"
      @close="showStatusModal = false"
    >
      <DsInput id="newStatus" v-model="newStatus" type="select" label="Novo Status" required>
        <option value="open">Aberto</option>
        <option value="settled">Quitado</option>
      </DsInput>

      <DsInput
        id="adminNotes"
        v-model="adminNotes"
        type="textarea"
        label="Observações"
        placeholder="Observações administrativas..."
        :rows="3"
      />

      <template #footer>
        <DsButton variant="secondary" @click="showStatusModal = false">Cancelar</DsButton>
        <DsButton
          variant="primary"
          :disabled="!newStatus || updatingStatus"
          @click="handleUpdateStatus"
        >
          {{ updatingStatus ? 'Atualizando...' : 'Atualizar' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { billingService, isBillingRecordNotFoundError } from '@/services/billing';
import type {
  BillingRecordSummary,
  BillingItemSummary,
  BillingStatus,
  BillingItemType,
  CreateBillingItemRequest
} from '@/types/billing';
import { useEntityCache } from '@/composables/useEntityCache';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageContextItem,
  type PageNextStep
} from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';

const route = useRoute();
const encounterId = route.params.id as string;

const record = ref<BillingRecordSummary | null>(null);
const items = ref<BillingItemSummary[]>([]);
const loading = ref(true);
const itemsLoading = ref(false);
const billingRecordMissing = ref(false);
const creatingEstimate = ref(false);
const error = ref('');
const entityCache = useEntityCache();

const patientName = ref('');
const ownerName = ref('');

const showAddItemModal = ref(false);
const showStatusModal = ref(false);
const addingItem = ref(false);
const updatingStatus = ref(false);
const addItemError = ref('');
const newStatus = ref<BillingStatus>('open');
const adminNotes = ref('');

const addItemForm = ref({
  itemType: 'service' as BillingItemType,
  description: '',
  quantity: 1,
  unitPriceAmount: 0
});

const isAddItemValid = computed(() => {
  return (
    addItemForm.value.description.trim() &&
    addItemForm.value.quantity > 0 &&
    addItemForm.value.unitPriceAmount >= 0
  );
});

const statusLabelMap: Record<BillingStatus, string> = {
  draft: 'Rascunho',
  estimated: 'Estimado',
  open: 'Aberto',
  settled: 'Quitado'
};

const statusVariantMap: Record<BillingStatus, string> = {
  draft: 'neutral',
  estimated: 'info',
  open: 'warning',
  settled: 'success'
};

const itemTypeMap: Record<BillingItemType, string> = {
  service: 'Serviço',
  supply: 'Material',
  procedure: 'Procedimento',
  exam: 'Exame',
  daily_rate: 'Diária',
  other: 'Outro'
};

const summaryCards = computed(() => {
  if (!record.value) return [];
  return [
    { label: 'Paciente', value: patientName.value || '—', hint: 'Atendimento vinculado' },
    { label: 'Tutor', value: ownerName.value || '—', hint: 'Responsável principal' },
    { label: 'Status', value: billingStatusLabel(record.value.status), hint: 'Situação do faturamento' },
    { label: 'Subtotal', value: formatCurrency(record.value.subtotalAmount), hint: 'Total acumulado' }
  ];
});

const billingHeaderSubtitle = computed(() => {
  if (billingRecordMissing.value) {
    return `Atendimento ${encounterId.slice(0, 8)} sem cobrança persistida.`;
  }
  if (!record.value) return `Atendimento ${encounterId.slice(0, 8)} em carregamento.`;
  return `Atendimento ${encounterId.slice(0, 8)} · ${billingStatusLabel(record.value.status)} · ${items.value.length} item(ns)`;
});

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'finance', label: 'Financeiro', to: '/billing' },
  { key: 'billing', label: 'Faturamento', to: '/billing' },
  { key: 'encounter-billing', label: `Atendimento ${encounterId.slice(0, 8)}`, current: true }
]);

const headerContextItems = computed<PageContextItem[]>(() => {
  if (billingRecordMissing.value) {
    return [
      {
        key: 'encounter',
        label: 'Atendimento',
        value: encounterId.slice(0, 8)
      },
      {
        key: 'status',
        label: 'Status',
        value: 'Sem cobrança persistida',
        tone: 'neutral'
      },
      {
        key: 'items',
        label: 'Itens',
        value: String(items.value.length)
      }
    ];
  }
  if (!record.value) return [];
  return [
    {
      key: 'owner',
      label: 'Tutor',
      value: ownerName.value || 'Carregando'
    },
    {
      key: 'patient',
      label: 'Paciente',
      value: patientName.value || 'Carregando'
    },
    {
      key: 'status',
      label: 'Status',
      value: billingStatusLabel(record.value.status),
      tone: record.value.status === 'settled' ? 'success' : record.value.status === 'open' ? 'warning' : 'info'
    },
    {
      key: 'subtotal',
      label: 'Subtotal',
      value: formatCurrency(record.value.subtotalAmount),
      tone: record.value.subtotalAmount > 0 ? 'info' : 'neutral'
    },
    {
      key: 'items',
      label: 'Itens',
      value: String(items.value.length)
    }
  ];
});

const headerNextSteps = computed<PageNextStep[]>(() => {
  if (billingRecordMissing.value) {
    return [
      {
        key: 'create-estimate',
        label: 'Gerar estimativa',
        description: 'Cria cobrança somente após clique'
      }
    ];
  }
  if (!record.value) return [];
  if (record.value.status === 'draft') {
    return [
      {
        key: 'estimate',
        label: 'Gerar estimativa',
        description: 'Conferir itens antes de cobrar'
      }
    ];
  }
  if (record.value.status === 'estimated' || record.value.status === 'open') {
    return [
      {
        key: 'settle',
        label: 'Fechar cobrança',
        description: formatCurrency(record.value.subtotalAmount)
      }
    ];
  }
  return [
    {
      key: 'settled',
      label: 'Cobrança quitada',
      description: 'Revisar histórico ou voltar para lista',
      to: '/billing'
    }
  ];
});

const headerPrimaryAction = computed<PageAction | null>(() => {
  if (billingRecordMissing.value) {
    return {
      key: 'create-estimate',
      label: creatingEstimate.value ? 'Gerando...' : 'Gerar estimativa',
      loading: creatingEstimate.value,
      disabled: creatingEstimate.value,
      onClick: handleCreateEstimate
    };
  }
  if (!record.value) return null;
  if (record.value.status === 'draft') {
    return {
      key: 'estimate',
      label: 'Gerar Estimativa',
      onClick: handleCreateEstimate
    };
  }
  if (record.value.status === 'estimated' || record.value.status === 'open') {
    return {
      key: 'status',
      label: 'Atualizar Status',
      onClick: () => {
        showStatusModal.value = true;
      }
    };
  }
  return {
    key: 'back-to-billing',
    label: 'Ver faturamento',
    to: '/billing'
  };
});

const headerSecondaryActions = computed<PageAction[]>(() => {
  const actions: PageAction[] = [];
  if (record.value && record.value.status !== 'settled') {
    actions.push({
      key: 'add-item',
      label: 'Adicionar Item',
      variant: 'secondary',
      onClick: () => {
        showAddItemModal.value = true;
      }
    });
  }
  actions.push({
    key: 'back',
    label: 'Voltar',
    variant: 'secondary',
    href: '/billing'
  });
  return actions;
});

function billingStatusLabel(s: BillingStatus) {
  return statusLabelMap[s] || s;
}

function itemTypeLabel(t: BillingItemType) {
  return itemTypeMap[t] || t;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return d;
  }
}

async function loadEntityNames(rec: BillingRecordSummary) {
  patientName.value = await entityCache.getPatientName(rec.patientId);
  ownerName.value = await entityCache.getOwnerName(rec.ownerId);
}

async function handleCreateEstimate() {
  if (creatingEstimate.value) return;
  creatingEstimate.value = true;
  try {
    const updated = await billingService.createEstimate({
      encounterId
    });
    record.value = updated;
    billingRecordMissing.value = false;
    error.value = '';
    await loadEntityNames(updated);
    await loadItems();
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao gerar estimativa');
  } finally {
    creatingEstimate.value = false;
  }
}

async function handleAddItem() {
  if (!record.value || !isAddItemValid.value) return;
  addingItem.value = true;
  addItemError.value = '';

  try {
    const payload: CreateBillingItemRequest = {
      encounterId: record.value.encounterId,
      itemType: addItemForm.value.itemType,
      description: addItemForm.value.description.trim(),
      quantity: addItemForm.value.quantity,
      unitPriceAmount: addItemForm.value.unitPriceAmount
    };
    await billingService.addItem(payload);
    showAddItemModal.value = false;
    addItemForm.value = {
      itemType: 'service',
      description: '',
      quantity: 1,
      unitPriceAmount: 0
    };
    await loadItems();
    await loadRecord();
  } catch (err: unknown) {
    addItemError.value = err instanceof Error ? err.message : 'Erro ao adicionar item';
  } finally {
    addingItem.value = false;
  }
}

async function handleUpdateStatus() {
  if (!record.value || !newStatus.value) return;
  updatingStatus.value = true;

  try {
    const updated = await billingService.updateStatus(record.value.encounterId, {
      status: newStatus.value,
      administrativeNotes: adminNotes.value.trim() || undefined
    });
    record.value = updated;
    showStatusModal.value = false;
    newStatus.value = 'open';
    adminNotes.value = '';
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao atualizar status');
  } finally {
    updatingStatus.value = false;
  }
}

async function loadRecord() {
  error.value = '';
  billingRecordMissing.value = false;
  try {
    const rec = await billingService.getByEncounter(encounterId);
    record.value = rec;
    await loadEntityNames(rec);
  } catch (err: unknown) {
    if (isBillingRecordNotFoundError(err)) {
      record.value = null;
      items.value = [];
      billingRecordMissing.value = true;
      return;
    }
    error.value = err instanceof Error ? err.message : 'Erro ao carregar faturamento';
  }
}

async function loadItems() {
  itemsLoading.value = true;
  try {
    items.value = await billingService.listItems(encounterId);
  } catch {
    // Non-critical
  } finally {
    itemsLoading.value = false;
  }
}

onMounted(async () => {
  try {
    await loadRecord();
    await loadItems();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.billing-detail-page__grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.billing-amount {
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.items-table-wrapper {
  overflow-x: auto;
}

.billing-empty-state {
  display: grid;
  gap: 12px;
  max-width: 760px;
}

.billing-empty-state__lead {
  margin: 0;
  color: var(--color-text, #0f172a);
  font-size: 18px;
  font-weight: 700;
}

.billing-empty-state__text {
  margin: 0;
  color: var(--color-text-muted, #64748b);
  line-height: 1.5;
}

.billing-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
</style>

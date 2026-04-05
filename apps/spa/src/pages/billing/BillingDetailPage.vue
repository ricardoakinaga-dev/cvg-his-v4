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

    <template v-else-if="record">
      <AppPageHeader>
        <template #title>
          <span>💰 Faturamento</span>
          <br />
          <div style="margin-top: 8px">
            <StatusBadge
              :label="billingStatusLabel(record.status)"
              :variant="billingStatusVariant(record.status)"
            />
            <span class="muted" style="margin-left: 8px; font-size: 0.8em; font-weight: 400">
              Atendimento {{ encounterId.slice(0, 8) }}...
            </span>
          </div>
        </template>
        <template #actions>
          <DsButton
            v-if="record.status !== 'settled'"
            variant="secondary"
            @click="showAddItemModal = true"
          >
            + Adicionar Item
          </DsButton>
          <DsButton
            v-if="record.status === 'draft'"
            variant="primary"
            @click="handleCreateEstimate"
          >
            Gerar Estimativa
          </DsButton>
          <DsButton
            v-if="record.status === 'estimated' || record.status === 'open'"
            variant="secondary"
            @click="showStatusModal = true"
          >
            Atualizar Status
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/billing">Voltar</DsButton>
        </template>
      </AppPageHeader>

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
import { useRoute, useRouter } from 'vue-router';
import { billingService } from '@/services/billing';
import type {
  BillingRecordSummary,
  BillingItemSummary,
  BillingStatus,
  BillingItemType,
  CreateBillingItemRequest
} from '@/types/billing';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import SkeletonLoader from '@/components/SkeletonLoader.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';

const route = useRoute();
const router = useRouter();
const encounterId = route.params.id as string;

const record = ref<BillingRecordSummary | null>(null);
const items = ref<BillingItemSummary[]>([]);
const loading = ref(true);
const itemsLoading = ref(false);
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

function billingStatusLabel(s: BillingStatus) {
  return statusLabelMap[s] || s;
}

function billingStatusVariant(s: BillingStatus) {
  return (statusVariantMap[s] || 'default') as any;
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
  if (!record.value) return;
  try {
    const updated = await billingService.createEstimate({
      encounterId: record.value.encounterId
    });
    record.value = updated;
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao gerar estimativa');
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
  try {
    const rec = await billingService.getByEncounter(encounterId);
    record.value = rec;
    await loadEntityNames(rec);
  } catch (err: unknown) {
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

.billing-amount {
  font-weight: 600;
  color: var(--color-text, #0f172a);
}

.items-table-wrapper {
  overflow-x: auto;
}
</style>

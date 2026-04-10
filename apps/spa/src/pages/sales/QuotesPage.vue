<template>
  <div class="quotes-page">
    <AppPageHeader title="Orçamentos" subtitle="Workspace real para criação, itens e conversão em venda">
      <template #actions>
        <DsButton variant="secondary" :loading="listLoading" @click="loadQuotes">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="listError" variant="danger" dismissible @dismiss="listError = ''">
      {{ listError }}
    </DsAlert>
    <DsAlert v-if="detailError" variant="danger" dismissible @dismiss="detailError = ''">
      {{ detailError }}
    </DsAlert>
    <DsAlert v-if="formError" variant="danger" dismissible @dismiss="formError = ''">
      {{ formError }}
    </DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="workspace-grid">
      <DsCard title="Novo orçamento">
        <form class="form-grid" @submit.prevent="createQuote">
          <DsInput id="quote-owner" v-model="quoteForm.ownerId" label="Owner ID" placeholder="opcional" />
          <DsInput id="quote-valid-until" v-model="quoteForm.validUntil" type="date" label="Validade" />
          <DsInput id="quote-notes" v-model="quoteForm.notes" type="textarea" label="Observações" :rows="3" />
          <div class="form-actions">
            <DsButton variant="primary" :loading="creatingQuote">Criar orçamento</DsButton>
          </div>
        </form>
      </DsCard>

      <DsCard title="Lista de orçamentos">
        <div class="toolbar">
          <DsInput
            v-model="search"
            type="search"
            placeholder="Buscar por número ou observação"
            @keyup.enter="loadQuotes"
          />
          <DsButton variant="secondary" @click="loadQuotes">Buscar</DsButton>
        </div>
        <DataTable
          :columns="quoteColumns"
          :rows="quotes"
          :loading="listLoading"
          empty-icon="📝"
          empty-title="Nenhum orçamento encontrado"
          empty-description="Crie um orçamento para iniciar a trilha comercial."
          variant="hoverable"
        >
          <template #cell-status="{ row }">
            <StatusBadge :label="quoteStatusLabel((row as QuoteSummary).status)" :variant="quoteStatusVariant((row as QuoteSummary).status)" />
          </template>
          <template #cell-total="{ row }">
            {{ formatCurrency((row as QuoteSummary).total) }}
          </template>
          <template #cell-convertedToSaleId="{ row }">
            <code v-if="(row as QuoteSummary).convertedToSaleId">{{ (row as QuoteSummary).convertedToSaleId }}</code>
            <span v-else class="muted">—</span>
          </template>
          <template #cell-actions="{ row }">
            <DsButton size="sm" variant="secondary" @click="selectQuote((row as QuoteSummary).id)">Abrir</DsButton>
          </template>
        </DataTable>
      </DsCard>

      <DsCard title="Detalhes e itens">
        <div v-if="detailLoading" class="muted">Carregando orçamento...</div>
        <template v-else-if="selectedQuote">
          <div class="detail-grid">
            <div><strong>Número:</strong> {{ selectedQuote.number }}</div>
            <div><strong>Status:</strong> {{ quoteStatusLabel(selectedQuote.status) }}</div>
            <div><strong>Total:</strong> {{ formatCurrency(selectedQuote.total) }}</div>
            <div><strong>Validade:</strong> {{ formatDate(selectedQuote.validUntil ?? '') || '—' }}</div>
            <div><strong>Venda:</strong> {{ selectedQuote.convertedToSaleId ?? '—' }}</div>
          </div>

          <div class="action-row">
            <DsButton variant="secondary" :loading="actionLoading === 'print'" @click="previewQuote">Pré-visualizar</DsButton>
            <DsButton variant="primary" :loading="actionLoading === 'approve'" @click="approveQuote">Aprovar</DsButton>
            <DsButton variant="secondary" :loading="actionLoading === 'reject'" @click="rejectQuote">Rejeitar</DsButton>
            <DsButton variant="secondary" :loading="actionLoading === 'cancel'" @click="cancelQuote">Cancelar</DsButton>
            <DsButton variant="secondary" :loading="actionLoading === 'convert'" @click="convertQuote">Converter em venda</DsButton>
          </div>

          <DsCard title="Itens">
            <DataTable
              :columns="itemColumns"
              :rows="selectedItems"
              :loading="itemsLoading"
              empty-icon="📦"
              empty-title="Sem itens"
              empty-description="Adicione um item ao orçamento."
              variant="hoverable"
              :compact="true"
            >
              <template #cell-unitPrice="{ row }">{{ formatCurrency((row as QuoteItemSummary).unitPrice) }}</template>
              <template #cell-lineTotal="{ row }">{{ formatCurrency((row as QuoteItemSummary).lineTotal) }}</template>
            </DataTable>
          </DsCard>

          <form class="item-form" @submit.prevent="addItem">
            <h3 class="section-title">Adicionar item</h3>
            <div class="item-grid">
              <DsInput id="item-type" v-model="itemForm.itemType" type="select" label="Tipo">
                <option value="product">Produto</option>
                <option value="service">Serviço</option>
              </DsInput>
              <DsInput id="item-name" v-model="itemForm.nameSnapshot" label="Nome" required />
              <DsInput id="item-code" v-model="itemForm.codeSnapshot" label="Código" />
              <DsInput id="item-price" v-model.number="itemForm.unitPrice" type="number" label="Valor unitário" required />
              <DsInput id="item-qty" v-model.number="itemForm.quantity" type="number" label="Quantidade" required />
              <DsInput id="item-discount" v-model.number="itemForm.discountAmount" type="number" label="Desconto" />
              <DsInput id="item-notes" v-model="itemForm.notes" type="textarea" label="Observações" :rows="2" />
            </div>
            <div class="form-actions">
              <DsButton variant="primary" :loading="actionLoading === 'item'">Adicionar item</DsButton>
            </div>
          </form>

          <DsAlert v-if="printPreview" variant="info" size="sm">
            Prévia HTML carregada com sucesso. Use a aba de impressão do navegador se necessário.
          </DsAlert>
        </template>
        <div v-else class="muted">Selecione um orçamento na lista para operar itens e status.</div>
      </DsCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import { useListData } from '@/composables/useListData';
import { formatDate } from '@/utils/labels';
import { quoteService, type QuoteItemSummary, type QuoteSummary } from '@/services/quotes';
import type { DataTableColumn } from '@/components/DataTable.vue';

const quoteColumns: DataTableColumn[] = [
  { key: 'number', label: 'Número' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'convertedToSaleId', label: 'Venda' },
  { key: 'actions', label: 'Ações' }
];

const itemColumns: DataTableColumn[] = [
  { key: 'itemType', label: 'Tipo' },
  { key: 'nameSnapshot', label: 'Item' },
  { key: 'quantity', label: 'Qtd' },
  { key: 'unitPrice', label: 'Unitário' },
  { key: 'lineTotal', label: 'Total' }
];

const selectedQuoteId = ref('');
const selectedQuote = ref<QuoteSummary | null>(null);
const selectedItems = ref<QuoteItemSummary[]>([]);
const detailLoading = ref(false);
const itemsLoading = ref(false);
const formError = ref('');
const detailError = ref('');
const successMessage = ref('');
const creatingQuote = ref(false);
const actionLoading = ref('');
const printPreview = ref('');
const quoteForm = ref({
  ownerId: '',
  validUntil: '',
  notes: ''
});
const itemForm = ref({
  itemType: 'service' as const,
  nameSnapshot: '',
  codeSnapshot: '',
  unitPrice: 0,
  quantity: 1,
  discountAmount: 0,
  notes: ''
});

const {
  items: quotes,
  loading: listLoading,
  error: listError,
  search,
  load: loadQuotes
} = useListData<QuoteSummary>({
  fetchFn: (q) => quoteService.list(q),
  entityLabel: 'orçamentos',
  withSearch: true
});

watch(search, () => {
  void loadQuotes();
});

watch(
  quotes,
  (items) => {
    if (!selectedQuoteId.value && items.length > 0) {
      void selectQuote(items[0].id);
    }
  },
  { immediate: true }
);

async function selectQuote(quoteId: string) {
  selectedQuoteId.value = quoteId;
  detailLoading.value = true;
  detailError.value = '';
  printPreview.value = '';
  try {
    const detail = await quoteService.get(quoteId);
    selectedQuote.value = detail;
    selectedItems.value = [...detail.items];
  } catch (err: unknown) {
    detailError.value = err instanceof Error ? err.message : 'Erro ao carregar orçamento';
    selectedQuote.value = null;
    selectedItems.value = [];
  } finally {
    detailLoading.value = false;
  }
}

async function createQuote() {
  creatingQuote.value = true;
  formError.value = '';
  successMessage.value = '';
  try {
    const quote = await quoteService.create({
      ownerId: quoteForm.value.ownerId.trim() || null,
      validUntil: quoteForm.value.validUntil || null,
      notes: quoteForm.value.notes.trim() || null
    });
    successMessage.value = `Orçamento ${quote.number} criado com sucesso.`;
    quoteForm.value = { ownerId: '', validUntil: '', notes: '' };
    await loadQuotes();
    await selectQuote(quote.id);
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao criar orçamento';
  } finally {
    creatingQuote.value = false;
  }
}

async function addItem() {
  if (!selectedQuoteId.value) return;
  actionLoading.value = 'item';
  formError.value = '';
  try {
    await quoteService.addItem(selectedQuoteId.value, {
      itemType: itemForm.value.itemType,
      nameSnapshot: itemForm.value.nameSnapshot.trim(),
      codeSnapshot: itemForm.value.codeSnapshot.trim() || null,
      unitPrice: Number(itemForm.value.unitPrice),
      quantity: Number(itemForm.value.quantity),
      discountAmount: Number(itemForm.value.discountAmount) || 0,
      notes: itemForm.value.notes.trim() || null
    });
    itemForm.value = {
      itemType: 'service',
      nameSnapshot: '',
      codeSnapshot: '',
      unitPrice: 0,
      quantity: 1,
      discountAmount: 0,
      notes: ''
    };
    await selectQuote(selectedQuoteId.value);
    await loadQuotes();
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao adicionar item';
  } finally {
    actionLoading.value = '';
  }
}

async function approveQuote() {
  await runQuoteAction('approve', () => quoteService.approve(selectedQuoteId.value));
}

async function rejectQuote() {
  await runQuoteAction('reject', () => quoteService.reject(selectedQuoteId.value));
}

async function cancelQuote() {
  await runQuoteAction('cancel', () => quoteService.cancel(selectedQuoteId.value));
}

async function convertQuote() {
  actionLoading.value = 'convert';
  try {
    const result = await quoteService.convertToSale(selectedQuoteId.value);
    successMessage.value = `Orçamento convertido em venda ${result.counterSaleId}.`;
    await selectQuote(selectedQuoteId.value);
    await loadQuotes();
  } catch (err: unknown) {
    detailError.value = err instanceof Error ? err.message : 'Erro ao converter orçamento';
  } finally {
    actionLoading.value = '';
  }
}

async function previewQuote() {
  actionLoading.value = 'print';
  try {
    printPreview.value = await quoteService.print(selectedQuoteId.value);
    successMessage.value = 'Pré-visualização de impressão carregada.';
  } catch (err: unknown) {
    detailError.value = err instanceof Error ? err.message : 'Erro ao gerar impressão';
  } finally {
    actionLoading.value = '';
  }
}

async function runQuoteAction(
  action: 'approve' | 'reject' | 'cancel',
  fn: () => Promise<QuoteSummary>
) {
  actionLoading.value = action;
  try {
    await fn();
    successMessage.value = `Orçamento ${action === 'approve' ? 'aprovado' : action === 'reject' ? 'rejeitado' : 'cancelado'} com sucesso.`;
    await selectQuote(selectedQuoteId.value);
    await loadQuotes();
  } catch (err: unknown) {
    detailError.value = err instanceof Error ? err.message : 'Falha na ação do orçamento';
  } finally {
    actionLoading.value = '';
  }
}

function quoteStatusLabel(status: QuoteSummary['status']): string {
  return {
    draft: 'Rascunho',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado',
    cancelled: 'Cancelado'
  }[status];
}

function quoteStatusVariant(status: QuoteSummary['status']): 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'approved') return 'success';
  if (status === 'draft') return 'info';
  if (status === 'expired') return 'warning';
  return 'danger';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

onMounted(() => {
  void loadQuotes();
});
</script>

<style scoped>
.workspace-grid {
  display: grid;
  gap: 16px;
}

.toolbar,
.action-row,
.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-grid,
.item-grid {
  display: grid;
  gap: 12px;
}

.item-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  margin-bottom: 16px;
}

.section-title {
  margin: 16px 0 8px;
  font-size: 16px;
}

code {
  word-break: break-all;
}

.muted {
  color: var(--color-text-muted, #64748b);
}
</style>

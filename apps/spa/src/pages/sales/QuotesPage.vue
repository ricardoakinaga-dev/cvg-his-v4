<template>
  <div class="quotes-page">
    <AppPageHeader title="Orçamentos" subtitle="Atendimento > Orçamentos. Propostas comerciais por ID, cliente e data antes de virar venda ou comanda.">
      <template #actions>
        <DsButton variant="primary" @click="focusNewQuote">Incluir</DsButton>
        <DsButton variant="secondary" :loading="listLoading" @click="loadQuotes">🔄 Atualizar</DsButton>
        <DsButton tag="a" to="/counter-sales" variant="secondary">🛒 Vendas Assistidas</DsButton>
        <DsButton tag="a" to="/appointments" variant="ghost">📅 Ver Agenda</DsButton>
      </template>
    </AppPageHeader>

    <!-- Hub: KPI StatCards -->
    <section class="hub-kpis">
      <DsStatCard :label="quotes.length + ' orçamento(s)'" value="" icon="🧾" />
      <DsStatCard :label="approvedCount + ' aprovado(s)'" value="" icon="✅" />
      <DsStatCard :label="convertedCount + ' convertido(s)'" value="" icon="🛒" />
      <DsStatCard :label="totalVolumeFormatted" value="" icon="💵" />
    </section>

    <!-- Hub: Operational Alerts -->
    <section v-if="quoteAlerts.length > 0" class="hub-alerts">
      <DsAlert
        v-for="(alert, i) in quoteAlerts"
        :key="i"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <!-- Hub: Quick Actions -->
    <section class="hub-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" tag="a" to="/counter-sales" icon="🛒">
            Vendas Balcão
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/cash" icon="🏦">
            Ver Caixa
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/billing" icon="💰">
            Faturamento
          </DsButton>
          <DsButton variant="secondary" tag="a" to="/pix" icon="💸">
            PIX
          </DsButton>
          <DsButton variant="ghost" :loading="listLoading" @click="loadQuotes" icon="🔄">
            Atualizar
          </DsButton>
        </div>
      </DsCard>
    </section>

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
    <DsAlert v-if="workflowContext.ownerId" variant="info" size="sm">
      <strong>Orçamento iniciado pela recepção.</strong>
      Tutor {{ workflowContext.ownerId }} já está indicado no formulário. Nenhum orçamento foi criado automaticamente.
    </DsAlert>

    <div class="workspace-layout">
      <DsCard title="Painel comercial">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <section class="quote-flow-grid">
        <article v-for="step in quoteFlow" :key="step.title" class="quote-flow-card">
          <span>{{ step.eyebrow }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </article>
      </section>

      <div class="workspace-grid">
        <DsCard title="Incluir">
          <form ref="newQuoteFormRef" class="form-grid" @submit.prevent="createQuote">
            <DsInput id="quote-owner" v-model="quoteForm.ownerId" label="Cliente" placeholder="ID do tutor" />
            <DsInput id="quote-valid-until" v-model="quoteForm.validUntil" type="date" label="Validade" />
            <DsInput id="quote-notes" v-model="quoteForm.notes" type="textarea" label="Observações" :rows="3" />
            <div class="form-actions">
              <DsButton variant="primary" :loading="creatingQuote">Incluir</DsButton>
            </div>
          </form>
        </DsCard>

        <DsCard title="Orçamentos">
          <div class="legacy-filter-grid">
            <DsInput v-model="legacyFilters.id" label="ID" placeholder="Número ou ID" />
            <DsInput v-model="legacyFilters.client" label="Cliente" placeholder="Owner ID ou cliente" />
            <DsInput v-model="legacyFilters.date" type="date" label="Data" />
          </div>
          <div class="toolbar">
            <DsInput
              v-model="search"
              type="search"
              placeholder="Buscar por ID, cliente, data, número ou observação"
              @keyup.enter="loadQuotes"
            />
            <DsButton variant="secondary" @click="loadQuotes">Pesquisar</DsButton>
          </div>
          <DataTable
            :columns="quoteColumns"
            :rows="filteredQuoteRows"
            :loading="listLoading"
            empty-icon="📝"
            empty-title="Nenhum orçamento encontrado"
            empty-description="Crie um orçamento para iniciar a trilha comercial."
            variant="hoverable"
          >
            <template #cell-ownerId="{ row }">
              {{ quoteRow(row).ownerId ?? '—' }}
            </template>
            <template #cell-createdAt="{ row }">
              {{ formatDate(quoteRow(row).createdAt) }}
            </template>
            <template #cell-actions="{ row }">
              <DsButton size="sm" variant="secondary" @click="selectQuote(quoteRow(row).id)">
                Abrir
              </DsButton>
            </template>
          </DataTable>
        </DsCard>

        <DsCard title="Detalhes e itens">
          <div v-if="detailLoading" class="muted">Carregando orçamento...</div>
          <template v-else-if="selectedQuote">
            <div class="detail-grid">
              <div><strong>Número:</strong> {{ selectedQuote.number }}</div>
              <div><strong>Cliente:</strong> {{ selectedQuote.ownerId ?? '—' }}</div>
              <div><strong>Status:</strong> {{ quoteStatusLabel(selectedQuote.status) }}</div>
              <div><strong>Total:</strong> {{ formatCurrency(selectedQuote.total) }}</div>
              <div><strong>Validade:</strong> {{ formatDate(selectedQuote.validUntil ?? '') || '—' }}</div>
              <div><strong>Venda:</strong> {{ selectedQuote.convertedToSaleId ?? '—' }}</div>
            </div>

            <div class="quote-total-grid">
              <div class="summary-card">
                <span class="summary-card__label">Serviços</span>
                <strong class="summary-card__value">{{ formatCurrency(selectedServicesTotal) }}</strong>
                <span class="summary-card__hint">Descrição do Serviço</span>
              </div>
              <div class="summary-card">
                <span class="summary-card__label">Produtos</span>
                <strong class="summary-card__value">{{ formatCurrency(selectedProductsTotal) }}</strong>
                <span class="summary-card__hint">Qtd, código de barras e produto</span>
              </div>
              <div class="summary-card">
                <span class="summary-card__label">Outros</span>
                <strong class="summary-card__value">{{ formatCurrency(selectedOtherTotal) }}</strong>
                <span class="summary-card__hint">Descrição e valor livre</span>
              </div>
              <div class="summary-card">
                <span class="summary-card__label">Valor do Orçamento</span>
                <strong class="summary-card__value">{{ formatCurrency(selectedQuote.total) }}</strong>
                <span class="summary-card__hint">Total comercial consolidado</span>
              </div>
            </div>

            <div class="action-row">
              <DsButton variant="secondary" :loading="actionLoading === 'print'" @click="previewQuote">
                Pré-visualizar
              </DsButton>
              <DsButton variant="primary" :loading="actionLoading === 'approve'" @click="approveQuote">
                Aprovar
              </DsButton>
              <DsButton variant="secondary" :loading="actionLoading === 'reject'" @click="rejectQuote">
                Rejeitar
              </DsButton>
              <DsButton variant="secondary" :loading="actionLoading === 'cancel'" @click="cancelQuote">
                Cancelar
              </DsButton>
              <DsButton variant="secondary" :loading="actionLoading === 'convert'" @click="convertQuote">
                Converter em venda
              </DsButton>
            </div>

            <DsCard title="Itens">
              <DataTable
                :columns="itemColumns"
                :rows="quoteItemRows"
                :loading="itemsLoading"
                empty-icon="📦"
                empty-title="Sem itens"
                empty-description="Adicione um item ao orçamento."
                variant="hoverable"
                :compact="true"
              >
                <template #cell-unitPrice="{ row }">{{
                  formatCurrency(quoteItemRow(row).unitPrice)
                }}</template>
                <template #cell-lineTotal="{ row }">{{
                  formatCurrency(quoteItemRow(row).lineTotal)
                }}</template>
              </DataTable>
            </DsCard>

            <form class="item-form" @submit.prevent="addItem">
              <h3 class="section-title">Adicionar item</h3>
              <p class="muted">Composição Vetus: Inclusão de Serviço, Inclusão de Produto e Inserir Outros.</p>
              <div class="item-grid">
                <DsInput id="item-type" v-model="itemForm.itemType" type="select" label="Tipo">
                  <option value="service">Serviço</option>
                  <option value="product">Produto</option>
                  <option value="other">Outros</option>
                </DsInput>
                <DsInput id="item-name" v-model="itemForm.nameSnapshot" :label="itemNameLabel" required />
                <DsInput id="item-code" v-model="itemForm.codeSnapshot" :label="itemCodeLabel" />
                <DsInput
                  id="item-price"
                  v-model.number="itemForm.unitPrice"
                  type="number"
                  label="Valor unitário"
                  required
                />
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
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import { useListData } from '@/composables/useListData';
import { formatDate } from '@/utils/labels';
import { quoteService, type QuoteItemSummary, type QuoteSummary } from '@/services/quotes';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import { computed } from 'vue';

type QuoteFormItemType = 'product' | 'service' | 'other';

const quoteColumns: DataTableColumn[] = [
  { key: 'id', label: 'Id' },
  { key: 'ownerId', label: 'Cliente' },
  { key: 'createdAt', label: 'Data' },
  { key: 'actions', label: 'Abrir', class: 'table__actions-col' }
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
const newQuoteFormRef = ref<HTMLFormElement | null>(null);
const filteredQuoteRows = computed(() => filteredQuotes.value as unknown as DataTableRow[]);
const quoteItemRows = computed(() => selectedItems.value as unknown as DataTableRow[]);
const quoteForm = ref({
  ownerId: '',
  validUntil: '',
  notes: ''
});
const workflowContext = readWorkflowContext();
const itemForm = ref({
  itemType: 'service' as QuoteFormItemType,
  nameSnapshot: '',
  codeSnapshot: '',
  unitPrice: 0,
  quantity: 1,
  discountAmount: 0,
  notes: ''
});
const legacyFilters = ref({
  id: '',
  client: '',
  date: ''
});

const approvedCount = computed(() => quotes.value.filter((q) => q.status === 'approved').length);
const convertedCount = computed(() => quotes.value.filter((q) => q.convertedToSaleId).length);
const totalVolumeFormatted = computed(() =>
  formatCurrency(quotes.value.reduce((sum, q) => sum + q.total, 0))
);
const filteredQuotes = computed(() => {
  const id = normalizeSearch(legacyFilters.value.id);
  const client = normalizeSearch(legacyFilters.value.client);
  const date = legacyFilters.value.date;

  return quotes.value.filter((quote) => {
    const matchesId =
      !id || normalizeSearch(`${quote.id} ${quote.number}`).includes(id);
    const matchesClient =
      !client || normalizeSearch(quote.ownerId ?? '').includes(client);
    const quoteDate = quote.createdAt.slice(0, 10);
    const validDate = quote.validUntil ?? '';
    const matchesDate = !date || quoteDate === date || validDate === date;
    return matchesId && matchesClient && matchesDate;
  });
});
const selectedProductItems = computed(() =>
  selectedItems.value.filter((item) => item.itemType === 'product')
);
const selectedOtherItems = computed(() => selectedItems.value.filter((item) => isOtherQuoteItem(item)));
const selectedServiceItems = computed(() =>
  selectedItems.value.filter((item) => item.itemType === 'service' && !isOtherQuoteItem(item))
);
const selectedProductsTotal = computed(() =>
  selectedProductItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const selectedServicesTotal = computed(() =>
  selectedServiceItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const selectedOtherTotal = computed(() =>
  selectedOtherItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const itemNameLabel = computed(() => {
  if (itemForm.value.itemType === 'product') return 'Ou Descrição do Produto';
  if (itemForm.value.itemType === 'other') return 'Descrição';
  return 'Descrição do Serviço';
});
const itemCodeLabel = computed(() =>
  itemForm.value.itemType === 'product' ? 'Pesquisar Cod. Barras' : 'Código'
);
const quoteFlow = [
  {
    eyebrow: 'Proposta',
    title: 'Montar orçamento',
    description: 'Cliente, validade e observações criam a proposta comercial inicial.'
  },
  {
    eyebrow: 'Composição',
    title: 'Serviços, produtos e outros',
    description: 'Itens heterogêneos consolidam o valor do orçamento.'
  },
  {
    eyebrow: 'Decisão',
    title: 'Aprovar ou rejeitar',
    description: 'A proposta sai de rascunho antes de virar execução.'
  },
  {
    eyebrow: 'Conversão',
    title: 'Comanda, venda ou pacote',
    description: 'A conversão materializa a negociação em fluxo operacional ou comercial.'
  }
];

interface QuoteAlert {
  variant: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
}

const quoteAlerts = computed<QuoteAlert[]>(() => {
  const alerts: QuoteAlert[] = [];
  if (approvedCount.value > 0) {
    alerts.push({ variant: 'info', title: 'Aguardando conversão', message: `${approvedCount.value} orçamento(s) aprovado(s) e pronto(s) para converter em venda.` });
  }
  const expiredOrCancelled = quotes.value.filter((q) => q.status === 'expired' || q.status === 'cancelled' || q.status === 'rejected').length;
  if (expiredOrCancelled > 0) {
    alerts.push({ variant: 'warning', title: 'Orçamentos encerrados', message: `${expiredOrCancelled} orçamento(s) expirado(s), rejeitado(s) ou cancelado(s).` });
  }
  return alerts;
});

const summaryCards = computed(() => {
  const subtotal = quotes.value.reduce((sum, quote) => sum + quote.total, 0);
  return [
    { label: 'Orçamentos', value: quotes.value.length.toString(), hint: 'Total na fila comercial' },
    { label: 'Aprovados', value: approvedCount.value.toString(), hint: 'Prontos para conversão' },
    { label: 'Convertidos', value: convertedCount.value.toString(), hint: 'Já viraram venda' },
    { label: 'Volume', value: formatCurrency(subtotal), hint: 'Valor total catalogado' }
  ];
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
    quoteForm.value = {
      ownerId: workflowContext.ownerId || '',
      validUntil: '',
      notes: workflowContext.encounterId ? `Atendimento ${workflowContext.encounterId}` : ''
    };
    await loadQuotes();
    await selectQuote(quote.id);
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Erro ao criar orçamento';
  } finally {
    creatingQuote.value = false;
  }
}

function focusNewQuote() {
  newQuoteFormRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const input = newQuoteFormRef.value?.querySelector<HTMLInputElement>('input');
  input?.focus();
}

async function addItem() {
  if (!selectedQuoteId.value) return;
  actionLoading.value = 'item';
  formError.value = '';
  try {
    await quoteService.addItem(selectedQuoteId.value, {
      itemType: itemForm.value.itemType === 'other' ? 'service' : itemForm.value.itemType,
      nameSnapshot: itemForm.value.nameSnapshot.trim(),
      codeSnapshot:
        itemForm.value.itemType === 'other'
          ? 'OUTROS'
          : itemForm.value.codeSnapshot.trim() || null,
      unitPrice: Number(itemForm.value.unitPrice),
      quantity: Number(itemForm.value.quantity),
      discountAmount: Number(itemForm.value.discountAmount) || 0,
      notes:
        itemForm.value.itemType === 'other'
          ? itemForm.value.notes.trim() || 'Item livre de orçamento'
          : itemForm.value.notes.trim() || null
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

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function isOtherQuoteItem(item: QuoteItemSummary): boolean {
  return item.codeSnapshot === 'OUTROS' || item.notes?.toLowerCase().includes('item livre') === true;
}

onMounted(() => {
  if (workflowContext.ownerId && !quoteForm.value.ownerId) {
    quoteForm.value.ownerId = workflowContext.ownerId;
  }
  if (workflowContext.encounterId && !quoteForm.value.notes) {
    quoteForm.value.notes = `Atendimento ${workflowContext.encounterId}`;
  }
  void loadQuotes();
});

function readWorkflowContext() {
  if (typeof window === 'undefined') {
    return { encounterId: '', patientId: '', ownerId: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    encounterId: params.get('encounterId')?.trim() || '',
    patientId: params.get('patientId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || ''
  };
}

function quoteRow(row: unknown): QuoteSummary {
  return row as QuoteSummary;
}

function quoteItemRow(row: unknown): QuoteItemSummary {
  return row as QuoteItemSummary;
}
</script>

<style scoped>
.workspace-grid {
  display: grid;
  gap: 16px;
}

.workspace-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quote-flow-grid,
.quote-total-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.quote-flow-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92));
}

.quote-flow-card span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.quote-flow-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.hub-alerts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hub-actions {
  margin-bottom: 0;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar,
.action-row,
.form-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-grid,
.item-grid,
.legacy-filter-grid {
  display: grid;
  gap: 12px;
}

.legacy-filter-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 12px;
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
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

@media (max-width: 760px) {
  .legacy-filter-grid,
  .item-grid {
    grid-template-columns: 1fr;
  }
}
</style>

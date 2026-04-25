<template>
  <div class="sales-page">
    <AppPageHeader
      title="Venda de Produtos"
      :breadcrumbs="['Atendimentos', 'Atendimentos', 'Vendas']"
      subtitle="Atendimentos > Vendas. Índice beta de vendas abertas com ficha operacional herdada do fluxo legado."
    >
      <template #actions>
        <DsButton variant="secondary" tag="a" to="/counter-sales">Comandas</DsButton>
        <DsButton variant="secondary" tag="a" to="/quotes">Orçamentos</DsButton>
        <DsButton variant="secondary" @click="loadSales">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" to="/counter-sales">Nova Venda</DsButton>
      </template>
    </AppPageHeader>

    <section class="sales-kpis">
      <DsStatCard :value="openSales.length.toString()" label="vendas abertas" icon="🟠" />
      <DsStatCard :value="closedSales.length.toString()" label="vendas fechadas" icon="🟢" />
      <DsStatCard :value="totalProducts.toString()" label="produtos vendidos" icon="📦" />
      <DsStatCard :value="totalFinalFormatted" label="valor final" icon="💰" />
    </section>

    <section class="sales-flow-grid" aria-label="Leitura funcional de vendas">
      <article v-for="step in salesFlow" :key="step.title" class="sales-flow-card">
        <span>{{ step.eyebrow }}</span>
        <strong>{{ step.title }}</strong>
        <p>{{ step.description }}</p>
      </article>
    </section>

    <div class="sales-layout">
      <section class="sales-list">
        <DsCard title="Vendas abertas">
          <div v-if="loading" class="sales-empty">Carregando vendas...</div>
          <div v-else-if="errorMessage" class="sales-empty sales-empty--error">
            {{ errorMessage }}
            <DsButton size="sm" variant="secondary" @click="loadSales">Tentar novamente</DsButton>
          </div>

          <div class="sales-toolbar">
            <DsInput
              v-model="filters.search"
              type="search"
              label="Filtrar"
              placeholder="Busque por ID, ID no PDV, Nome ou CPF do Cliente"
              hint="Busque por ID, ID no PDV, Nome ou CPF do Cliente"
            />
            <DsInput v-model="filters.status" type="select" label="Status">
              <option value="all">Todas</option>
              <option value="open">Aberta</option>
              <option value="closed">Fechada</option>
              <option value="cancelled">Cancelada</option>
            </DsInput>
            <DsInput v-model="filters.order" type="select" label="Ordenação">
              <option value="date-desc">Data: desc</option>
              <option value="date-asc">Data: asc</option>
              <option value="total-desc">Valor: desc</option>
            </DsInput>
            <DsButton variant="secondary" @click="loadSales">Filtrar</DsButton>
          </div>

          <div class="sales-beta-toolbar">
            <label class="sales-select-all">
              <input type="checkbox" aria-label="Selecionar todas as vendas visíveis" />
              <span>Selecionar Tudo</span>
            </label>
            <span>{{ resultsSummary }}</span>
            <DsInput v-model="filters.pageSize" type="select" label="Resultados">
              <option value="20">20 resultados por página</option>
              <option value="50">50 resultados por página</option>
              <option value="100">100 resultados por página</option>
            </DsInput>
          </div>

          <div v-if="filteredSales.length === 0" class="sales-empty">
            Você ainda não tem vendas cadastradas
          </div>

          <div v-else class="sales-card-list">
            <article
              v-for="sale in filteredSales"
              :key="sale.id"
              class="sale-card"
              :class="{ 'sale-card--selected': sale.id === selectedSaleId }"
            >
              <div class="sale-card__header">
                <div>
                  <span class="sale-card__eyebrow">{{ sale.posId }}</span>
                  <h3>{{ sale.number }}</h3>
                  <p>{{ sale.customer }} · {{ sale.document }}</p>
                </div>
                <StatusBadge :label="statusLabel(sale.status)" :variant="statusVariant(sale.status)" />
              </div>

              <dl class="sale-facts">
                <div>
                  <dt>Data de Emissão</dt>
                  <dd>{{ sale.issueDate }}</dd>
                </div>
                <div>
                  <dt>Produtos</dt>
                  <dd>{{ sale.products.length }}</dd>
                </div>
                <div>
                  <dt>Valor Final</dt>
                  <dd>{{ formatCurrency(sale.finalValue) }}</dd>
                </div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>{{ paymentSummary(sale) }}</dd>
                </div>
              </dl>

              <div class="sale-card__actions">
                <DsButton size="sm" variant="primary" @click="selectSale(sale.id)">Abrir venda</DsButton>
                <DsButton size="sm" variant="secondary" tag="a" to="/counter-sales">Operar comanda</DsButton>
              </div>
            </article>
          </div>
        </DsCard>
      </section>

      <aside class="sales-workbench">
        <DsCard title="Ficha da Venda">
          <template v-if="selectedSale">
            <div class="selection-note">Venda {{ selectedSale.number }} selecionada</div>

            <dl class="detail-grid">
              <div>
                <dt>Id</dt>
                <dd>{{ selectedSale.id }}</dd>
              </div>
              <div>
                <dt>Data de Emissão</dt>
                <dd>{{ selectedSale.issueDate }}</dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>{{ selectedSale.customer }}</dd>
              </div>
              <div>
                <dt>CPF/CNPJ</dt>
                <dd>{{ selectedSale.document }}</dd>
              </div>
            </dl>

            <nav class="legacy-tabs" aria-label="Abas da venda">
              <span>Produtos Vendidos</span>
              <span>Observações</span>
              <span>Pagamentos</span>
              <span>Detalhes</span>
            </nav>

            <section class="workbench-section">
              <div class="section-header">
                <strong>Produtos Vendidos</strong>
                <DsButton size="sm" variant="secondary">Incluir Produto</DsButton>
              </div>
              <div class="product-grid product-grid--header">
                <span>Produto</span>
                <span>Profissional</span>
                <span>Quantidade</span>
                <span>Valor Unitário</span>
                <span>Valor Descontado</span>
                <span>Valor Total</span>
              </div>
              <div v-if="selectedSale.products.length === 0" class="sales-empty">
                Nenhum produto vendido
              </div>
              <div
                v-for="product in selectedSale.products"
                v-else
                :key="`${selectedSale.id}-${product.name}`"
                class="product-grid"
              >
                <span>{{ product.name }}</span>
                <span>{{ product.professional }}</span>
                <span>{{ product.quantity }}</span>
                <span>{{ formatCurrency(product.unitPrice) }}</span>
                <span>{{ formatCurrency(product.discountValue) }}</span>
                <span>{{ formatCurrency(product.totalValue) }}</span>
              </div>
            </section>

            <section class="workbench-section">
              <strong>Pagamentos</strong>
              <div class="payment-grid payment-grid--header">
                <span>Forma de Pagamento</span>
                <span>Valor</span>
              </div>
              <div v-if="selectedSale.payments.length === 0" class="sales-empty">
                Nenhuma pagamento para esta venda
              </div>
              <div v-for="payment in selectedSale.payments" v-else :key="payment.method" class="payment-grid">
                <span>{{ payment.method }}</span>
                <span>{{ formatCurrency(payment.amount) }}</span>
              </div>
            </section>

            <section class="workbench-section">
              <strong>Observações</strong>
              <p class="notes-box">{{ selectedSale.notes || 'Sem observações registradas.' }}</p>
            </section>

            <section class="total-grid" aria-label="Totais da venda">
              <div>
                <span>Valor da Venda</span>
                <strong>{{ formatCurrency(selectedSale.saleValue) }}</strong>
              </div>
              <div>
                <span>Desconto</span>
                <strong>{{ formatCurrency(selectedSale.discount) }}</strong>
              </div>
              <div>
                <span>Valor descontado</span>
                <strong>{{ formatCurrency(selectedSale.discountedValue) }}</strong>
              </div>
              <div>
                <span>Valor Final</span>
                <strong>{{ formatCurrency(selectedSale.finalValue) }}</strong>
              </div>
            </section>

            <div class="sale-actions">
              <DsButton variant="secondary">Salvar</DsButton>
              <DsButton variant="primary">Fechar</DsButton>
              <DsButton variant="secondary">Pesquisar</DsButton>
              <DsButton variant="secondary">Imprimir</DsButton>
              <DsButton variant="danger">Excluir Venda</DsButton>
            </div>

            <div class="legacy-shortcuts" aria-label="Atalhos do legado">
              <span>Insert: Inserir Produto</span>
              <span>End: Salvar/Fechar Venda</span>
              <span>Esc: Fechar Inclusão Itens</span>
            </div>
          </template>
          <p v-else class="sales-empty">Selecione uma venda para abrir a ficha transacional.</p>
        </DsCard>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { counterSalesService, type CounterSaleDetail, type CounterSalePaymentMethod } from '@/services/counterSales';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type SaleStatus = 'open' | 'closed' | 'cancelled';

interface SaleProduct {
  name: string;
  professional: string;
  quantity: number;
  unitPrice: number;
  discountValue: number;
  totalValue: number;
}

interface SalePayment {
  method: string;
  amount: number;
}

interface ProductSale {
  id: string;
  number: string;
  posId: string;
  issueDate: string;
  customer: string;
  document: string;
  status: SaleStatus;
  products: SaleProduct[];
  payments: SalePayment[];
  notes: string;
  saleValue: number;
  discount: number;
  discountedValue: number;
  finalValue: number;
}

const sales = ref<ProductSale[]>([]);
const loading = ref(false);
const errorMessage = ref('');

const filters = ref({
  search: '',
  status: 'open',
  order: 'date-desc',
  pageSize: '20'
});
const selectedSaleId = ref(sales.value[0]?.id ?? '');

const openSales = computed(() => sales.value.filter((sale) => sale.status === 'open'));
const closedSales = computed(() => sales.value.filter((sale) => sale.status === 'closed'));
const totalProducts = computed(() =>
  sales.value.reduce((sum, sale) => sum + sale.products.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)
);
const totalFinalFormatted = computed(() =>
  formatCurrency(sales.value.reduce((sum, sale) => sum + sale.finalValue, 0))
);
const filteredSales = computed(() => {
  const search = normalizeSearch(filters.value.search);
  const status = filters.value.status;
  const filtered = sales.value.filter((sale) => {
    const matchesStatus = status === 'all' || sale.status === status;
    const matchesSearch =
      !search ||
      normalizeSearch(`${sale.id} ${sale.number} ${sale.posId} ${sale.customer} ${sale.document}`).includes(search);
    return matchesStatus && matchesSearch;
  });

  return [...filtered].sort((left, right) => {
    if (filters.value.order === 'total-desc') return right.finalValue - left.finalValue;
    const leftTime = toSortableDate(left.issueDate);
    const rightTime = toSortableDate(right.issueDate);
    return filters.value.order === 'date-asc' ? leftTime - rightTime : rightTime - leftTime;
  });
});
const selectedSale = computed(() =>
  sales.value.find((sale) => sale.id === selectedSaleId.value) ?? null
);
const resultsSummary = computed(() => {
  const count = filteredSales.value.length;
  if (count === 0) return 'Mostrando 0 - 0 pág. de 0 resultados';
  return `Mostrando 1 - ${count} pág. de ${count} resultados`;
});

const salesFlow = [
  {
    eyebrow: 'Beta',
    title: 'Índice de vendas abertas',
    description: 'A superfície beta prioriza busca, status ABERTA, paginação e criação.'
  },
  {
    eyebrow: 'Legacy',
    title: 'Ficha transacional completa',
    description: 'O legado concentra produtos, observações, pagamentos, impressão e fechamento.'
  },
  {
    eyebrow: 'Comercial',
    title: 'Produto, cliente e pagamento',
    description: 'A venda é menos assistencial que a comanda e mais orientada ao produto.'
  },
  {
    eyebrow: 'Financeiro',
    title: 'Relatórios Comandas/Vendas',
    description: 'O fechamento repercute em caixa, cartões, contas e relatórios fiscais.'
  }
];

onMounted(() => {
  void loadSales();
});

watch(
  filteredSales,
  (items) => {
    if (items.length === 0) {
      selectedSaleId.value = '';
      return;
    }
    if (!items.some((sale) => sale.id === selectedSaleId.value)) {
      selectedSaleId.value = items[0].id;
    }
  },
  { immediate: true }
);

function selectSale(saleId: string) {
  selectedSaleId.value = saleId;
}

async function loadSales() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const summaries = await counterSalesService.list({ status: 'all' });
    const details = await Promise.all(summaries.map((sale) => counterSalesService.getById(sale.id)));
    sales.value = details.map(toProductSale);
  } catch (error) {
    sales.value = [];
    errorMessage.value =
      error instanceof Error
        ? `Não foi possível carregar as vendas: ${error.message}`
        : 'Não foi possível carregar as vendas.';
  } finally {
    loading.value = false;
  }
}

function toProductSale(sale: CounterSaleDetail): ProductSale {
  return {
    id: sale.id,
    number: sale.number,
    posId: sale.id,
    issueDate: formatDate(sale.createdAt),
    customer: sale.ownerId ? `Cliente ${sale.ownerId}` : 'Cliente não vinculado',
    document: sale.ownerId ?? 'Sem documento',
    status: sale.status,
    products: sale.items.map((item) => ({
      name: item.nameSnapshot,
      professional: item.itemType === 'service' ? 'Serviço' : 'Produto',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountValue: item.discountAmount,
      totalValue: item.lineTotal
    })),
    payments: sale.payments.map((payment) => ({
      method: paymentMethodLabel(payment.method),
      amount: payment.amount
    })),
    notes: sale.notes ?? '',
    saleValue: sale.subtotal,
    discount: sale.discountAmount,
    discountedValue: sale.discountAmount,
    finalValue: sale.total
  };
}

function paymentSummary(sale: ProductSale): string {
  if (sale.payments.length === 0) return 'Sem pagamento';
  return sale.payments.map((payment) => payment.method).join(', ');
}

function statusLabel(status: SaleStatus): string {
  return {
    open: 'Aberta',
    closed: 'Fechada',
    cancelled: 'Cancelada'
  }[status];
}

function statusVariant(status: SaleStatus): 'info' | 'success' | 'danger' {
  if (status === 'open') return 'info';
  if (status === 'closed') return 'success';
  return 'danger';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function paymentMethodLabel(method: CounterSalePaymentMethod): string {
  return {
    cash: 'Dinheiro',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
    bank_transfer: 'Transferência',
    check: 'Cheque',
    insurance: 'Convênio',
    other: 'Outros'
  }[method];
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function toSortableDate(value: string): number {
  const [day, month, year] = value.split('/');
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}
</script>

<style scoped>
.sales-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sales-kpis,
.sales-flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.sales-flow-card,
.sale-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.sales-flow-card span,
.sale-card__eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.sales-flow-card p,
.sale-card p {
  margin: 0;
  color: var(--color-text-secondary, #475569);
}

.sales-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(420px, 1fr);
  gap: 16px;
  align-items: start;
}

.sales-card-list,
.sales-workbench {
  display: grid;
  gap: 12px;
}

.sales-toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) minmax(150px, 0.35fr) minmax(150px, 0.35fr) max-content;
  gap: 12px;
  margin-bottom: 14px;
  align-items: end;
}

.sales-beta-toolbar {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) 220px;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: #ffffff;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.sales-select-all {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #f97316;
}

.sale-card--selected {
  border-color: var(--color-primary-300, #93c5fd);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
}

.sale-card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.sale-card__header h3 {
  margin: 2px 0;
}

.sale-facts,
.detail-grid,
.total-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.sale-facts div,
.detail-grid div,
.total-grid div {
  padding: 10px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.8);
}

dt,
.total-grid span {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

dd {
  margin: 2px 0 0;
  font-weight: 700;
  color: var(--color-text, #0f172a);
}

.sale-card__actions,
.sale-actions,
.section-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-header {
  justify-content: space-between;
  align-items: center;
}

.selection-note,
.sales-empty,
.notes-box {
  padding: 12px;
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
  color: var(--color-text-secondary, #475569);
}

.selection-note {
  margin-bottom: 12px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.legacy-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
}

.legacy-tabs span {
  padding: 8px 10px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 999px;
  font-weight: 700;
  color: var(--color-text-secondary, #475569);
}

.workbench-section {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
}

.product-grid,
.payment-grid {
  display: grid;
  gap: 8px;
  align-items: center;
}

.product-grid {
  grid-template-columns: 1.3fr 1fr 0.6fr 0.8fr 0.8fr 0.8fr;
}

.payment-grid {
  grid-template-columns: 1fr 0.5fr;
}

.product-grid--header,
.payment-grid--header {
  font-size: 12px;
  font-weight: 800;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
}

.total-grid {
  margin-top: 12px;
}

.total-grid strong {
  display: block;
  margin-top: 4px;
}

.sale-actions {
  margin-top: 12px;
}

.legacy-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.legacy-shortcuts span {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 4px 8px;
  border-radius: 4px;
  background: #64748b;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.legacy-shortcuts span:nth-child(2) {
  background: #15803d;
}

@media (max-width: 980px) {
  .sales-layout,
  .sales-toolbar,
  .sales-beta-toolbar,
  .product-grid {
    grid-template-columns: 1fr;
  }
}
</style>

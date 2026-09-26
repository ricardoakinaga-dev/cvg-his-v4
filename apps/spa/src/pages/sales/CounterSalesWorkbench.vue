<template>
  <section class="counter-sales-workbench">
    <DsCard title="Detalhes da Comanda">
      <div class="workbench-shell">
        <div class="workbench-main">
          <section class="workbench-section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Contexto assistencial</span>
                <h3>Animais Vinculados na Comanda</h3>
              </div>
              <span class="workbench-section__hint">
                {{ props.patientContexts.length }} animal(is)
              </span>
              <DsButton
                v-if="props.sale.ownerId"
                size="sm"
                variant="ghost"
                tag="a"
                :to="`/patients?ownerId=${props.sale.ownerId}`"
              >
                Ver cadastro
              </DsButton>
            </header>

            <div v-if="props.patientContexts.length > 0" class="patient-context-grid">
              <article
                v-for="context in props.patientContexts"
                :key="context.patient.id"
                class="patient-context-card"
              >
                <div class="patient-context-card__summary">
                  <div>
                    <strong>{{ context.patient.name }}</strong>
                    <div class="patient-context-card__meta">
                      {{ context.patient.species }}
                      <span v-if="context.patient.breed">· {{ context.patient.breed }}</span>
                    </div>
                  </div>

                  <div class="patient-context-card__badges">
                    <DsBadge :variant="context.encounter ? 'success' : 'default'">
                      {{ props.encounterBadgeLabel(context) }}
                    </DsBadge>
                    <DsBadge :variant="context.medicalRecord ? 'warning' : 'default'">
                      {{ props.medicalRecordBadgeLabel(context) }}
                    </DsBadge>
                  </div>
                </div>

                <div class="patient-context-card__journey">
                  <div class="journey-pill">
                    <span class="summary-card__label">Atendimento</span>
                    <strong>{{ props.patientEncounterSubtitle(context) }}</strong>
                  </div>
                  <div class="journey-pill">
                    <span class="summary-card__label">Prontuário</span>
                    <strong>{{ props.patientMedicalRecordSubtitle(context) }}</strong>
                  </div>
                </div>

                <div class="patient-context-card__actions">
                  <DsButton
                    size="sm"
                    variant="ghost"
                    tag="a"
                    :to="`/patients/${context.patient.id}`"
                  >
                    Cadastro
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="secondary"
                    tag="a"
                    :to="props.patientEncounterLink(context)"
                  >
                    {{ props.patientEncounterActionLabel(context) }}
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="primary"
                    tag="a"
                    :to="props.patientMedicalRecordLink(context)"
                  >
                    {{ props.patientMedicalRecordActionLabel(context) }}
                  </DsButton>
                </div>
              </article>
            </div>
            <div v-else class="counter-sales-empty">
              Nenhum animal relacionado ao tutor desta comanda.
            </div>
          </section>

          <section class="workbench-section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Execução assistencial</span>
                <h3>Serviços</h3>
              </div>
              <span class="workbench-section__hint">
                Total: {{ props.formatCurrency(props.selectedServicesTotal) }}
              </span>
            </header>

            <div v-if="props.patientContexts.length > 0" class="service-patient-list">
              <article
                v-for="context in props.patientContexts"
                :key="`service-${context.patient.id}`"
                class="service-patient-card"
              >
                <div>
                  <strong>{{ context.patient.name }}</strong>
                  <div class="patient-context-card__meta">
                    {{ context.patient.species }}
                    <span v-if="context.patient.breed">· {{ context.patient.breed }}</span>
                  </div>
                </div>
                <div class="service-patient-card__actions">
                  <DsButton
                    size="sm"
                    variant="ghost"
                    tag="a"
                    :to="`/patients/${context.patient.id}`"
                  >
                    Ver Detalhes do Animal
                  </DsButton>
                  <DsButton size="sm" variant="primary" @click="focusCatalogType('service')">
                    Incluir Serviços
                  </DsButton>
                </div>
              </article>
            </div>
            <div v-else class="counter-sales-empty">
              Vincule um animal para lançar serviços contextualizados na comanda.
            </div>
          </section>

          <section class="workbench-section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Lançamento operacional</span>
                <h3>Produtos</h3>
              </div>
            </header>

            <div class="catalog-toolbar">
              <DsInput
                :model-value="props.catalogForm.search"
                type="search"
                label="Catálogo"
                placeholder="Nome, código de barras, SKU ou serviço"
                @update:model-value="updateCatalogField('search', $event)"
              />
              <DsInput
                :model-value="props.catalogForm.itemType"
                type="select"
                label="Tipo"
                @update:model-value="updateCatalogField('itemType', $event)"
              >
                <option value="all">Todos</option>
                <option value="product">Produtos</option>
                <option value="service">Serviços</option>
              </DsInput>
              <DsInput
                :model-value="props.catalogForm.quantity"
                type="number"
                label="Quantidade"
                min="1"
                @update:model-value="updateCatalogField('quantity', $event)"
              />
              <DsInput
                :model-value="props.catalogForm.discountAmount"
                type="number"
                label="Desconto"
                min="0"
                step="0.01"
                @update:model-value="updateCatalogField('discountAmount', $event)"
              />
            </div>

            <div class="barcode-toolbar">
              <DsInput
                :model-value="props.barcodeForm.code"
                label="Código de barras"
                placeholder="Bipar ou digitar código de barras"
                @update:model-value="updateBarcodeField('code', $event)"
                @keyup.enter="addItemByBarcode"
              />
              <DsInput
                :model-value="props.barcodeForm.quantity"
                type="number"
                label="Qtd código"
                min="1"
                @update:model-value="updateBarcodeField('quantity', $event)"
              />
              <DsButton
                variant="primary"
                :loading="props.savingItem"
                :disabled="!props.canEdit"
                @click="addItemByBarcode"
              >
                Adicionar Produtos
              </DsButton>
            </div>

            <div v-if="props.barcodeMatchedOption" class="barcode-match">
              <strong>{{ props.barcodeMatchedOption.name }}</strong>
              <span>
                {{ props.barcodeMatchedOption.type === 'product' ? 'Produto' : 'Serviço' }}
                <span v-if="props.barcodeMatchedOption.code">
                  · {{ props.barcodeMatchedOption.code }}
                </span>
                · {{ props.formatCurrency(props.barcodeMatchedOption.basePrice) }}
              </span>
            </div>
            <div v-else-if="props.barcodeForm.code.trim()" class="counter-sales-empty">
              Nenhum item do catálogo corresponde ao código digitado.
            </div>

            <div class="catalog-results">
              <article
                v-for="option in props.visibleCatalogOptions"
                :key="`${option.type}-${option.id}`"
                class="catalog-card"
              >
                <div class="catalog-card__header">
                  <div>
                    <h4>{{ option.name }}</h4>
                    <div class="catalog-card__meta">
                      <span>{{ option.type === 'product' ? 'Produto' : 'Serviço' }}</span>
                      <span v-if="option.code">{{ option.code }}</span>
                      <span v-if="option.type === 'product'">
                        Estoque {{ option.onHandQuantity ?? '—' }}
                      </span>
                    </div>
                  </div>
                  <strong>{{ props.formatCurrency(option.basePrice) }}</strong>
                </div>

                <p class="catalog-card__hint">
                  {{ option.description || 'Sem descrição operacional cadastrada.' }}
                </p>

                <DsButton
                  size="sm"
                  variant="primary"
                  :loading="props.savingItem"
                  :disabled="!props.canEdit"
                  @click="addCatalogOption(option)"
                >
                  Adicionar na comanda
                </DsButton>
              </article>

              <div v-if="props.visibleCatalogOptions.length === 0" class="counter-sales-empty">
                Nenhum item de catálogo encontrado para o filtro atual.
              </div>
            </div>
          </section>

          <section class="workbench-section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Painel esquerdo</span>
                <h3>Serviços / Produtos</h3>
              </div>
            </header>

            <div class="item-total-grid">
              <div class="summary-card">
                <span class="summary-card__label">Produtos</span>
                <strong class="summary-card__value">
                  {{ props.formatCurrency(props.selectedProductsTotal) }}
                </strong>
              </div>
              <div class="summary-card">
                <span class="summary-card__label">Serviços</span>
                <strong class="summary-card__value">
                  {{ props.formatCurrency(props.selectedServicesTotal) }}
                </strong>
              </div>
            </div>

            <div v-if="props.sale.items.length > 0" class="item-list">
              <article v-for="item in props.sale.items" :key="item.id" class="line-item-card">
                <div class="line-item-card__header">
                  <div>
                    <strong>{{ item.nameSnapshot }}</strong>
                    <div class="line-item-card__meta">
                      <span>{{ item.itemType === 'product' ? 'Produto' : 'Serviço' }}</span>
                      <span v-if="item.codeSnapshot">{{ item.codeSnapshot }}</span>
                      <span>{{ props.formatCurrency(item.unitPrice) }}/un</span>
                    </div>
                  </div>
                  <strong>{{ props.formatCurrency(item.lineTotal) }}</strong>
                </div>

                <div class="line-item-card__controls">
                  <DsButton
                    size="sm"
                    variant="ghost"
                    :disabled="!props.canEdit || props.savingItem || item.quantity <= 1"
                    @click="changeItemQuantity(item, item.quantity - 1)"
                  >
                    -
                  </DsButton>
                  <span class="line-item-card__quantity">{{ item.quantity }}</span>
                  <DsButton
                    size="sm"
                    variant="ghost"
                    :disabled="!props.canEdit || props.savingItem"
                    @click="changeItemQuantity(item, item.quantity + 1)"
                  >
                    +
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="secondary"
                    :disabled="!props.canEdit || props.savingItem"
                    @click="applyDefaultDiscount(item)"
                  >
                    Editar desconto
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="danger"
                    :disabled="!props.canEdit || props.savingItem"
                    @click="removeItem(item.id)"
                  >
                    Excluir
                  </DsButton>
                </div>

                <div class="line-item-card__footer">
                  <span>Desconto atual: {{ props.formatCurrency(item.discountAmount) }}</span>
                  <span v-if="item.notes">{{ item.notes }}</span>
                </div>
              </article>
            </div>
            <div v-else class="counter-sales-empty">
              Nenhum item lançado ainda. Use o catálogo acima para montar a cobrança.
            </div>
          </section>

          <section class="workbench-section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">chat</span>
                <h3>Observações Gerais</h3>
              </div>
              <span class="workbench-section__hint">{{ props.notesLength }} / 1000</span>
            </header>
            <p class="counter-sale-observations">
              {{ props.sale.notes || 'Esta comanda ainda não possui observações gerais.' }}
            </p>
          </section>

          <section class="workbench-section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">medical_services</span>
                <h3>Histórico de Esteira</h3>
              </div>
            </header>
            <div v-if="props.timelineItems.length > 0" class="timeline-stack">
              <article
                v-for="event in props.timelineItems"
                :key="event.key"
                class="timeline-card"
              >
                <strong>{{ event.title }}</strong>
                <span>{{ event.description }}</span>
              </article>
            </div>
            <div v-else class="counter-sales-empty">
              Nenhum registro de esteira para esta comanda.
            </div>
          </section>

          <section class="workbench-section" data-testid="counter-sale-cancellation-history">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">audit</span>
                <h3>Histórico de cancelamentos</h3>
              </div>
              <span class="workbench-section__hint">
                {{ props.cancellationHistory.length }} registro(s)
              </span>
            </header>
            <div v-if="props.cancellationHistory.length > 0" class="timeline-stack">
              <article
                v-for="event in props.cancellationHistory"
                :key="event.eventId"
                class="timeline-card timeline-card--cancellation"
              >
                <strong>Cancelamento em {{ props.formatDateTime(event.cancelledAt) }}</strong>
                <span>Motivo: {{ event.reason }}</span>
                <span>Registrado por: {{ props.openedByLabel(event.cancelledByUserId) }}</span>
              </article>
            </div>
            <div v-else class="counter-sales-empty">
              Nenhum histórico de cancelamento disponível para esta comanda.
            </div>
          </section>
        </div>

        <aside class="workbench-sidebar">
          <section class="workbench-sidebar__section">
            <div class="sidebar-summary">
              <div class="sidebar-summary__header">
                <div>
                  <span class="workbench-section__eyebrow">Resumo da Conta</span>
                  <h3>Comanda ID: {{ props.sale.number }}</h3>
                </div>
                <DsBadge :variant="props.statusBadgeVariant(props.sale.status)">
                  {{ props.statusLabel(props.sale.status) }}
                </DsBadge>
              </div>

              <div class="sidebar-summary__grid">
                <div class="summary-card">
                  <span class="summary-card__label">Subtotal</span>
                  <strong class="summary-card__value">
                    {{ props.formatCurrency(props.sale.subtotal) }}
                  </strong>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Desconto</span>
                  <strong class="summary-card__value">
                    {{ props.formatCurrency(props.sale.discountAmount) }}
                  </strong>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Pago</span>
                  <strong class="summary-card__value">
                    {{ props.formatCurrency(props.sale.paidAmount) }}
                  </strong>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Total a pagar</span>
                  <strong class="summary-card__value">
                    {{ props.formatCurrency(props.sale.balanceDue) }}
                  </strong>
                </div>
              </div>

              <div class="sidebar-owner">
                <div>
                  <span class="summary-card__label">Cliente</span>
                  <strong>{{ props.owner?.fullName || 'Comanda sem tutor' }}</strong>
                </div>
                <div class="sidebar-owner__meta">
                  <span>{{ props.ownerPrimaryContactLabel(props.sale.ownerId) }}</span>
                  <span>ID {{ props.sale.id }}</span>
                  <span>Abertura {{ props.formatDateTime(props.sale.createdAt) }}</span>
                  <span>Aberta por: {{ props.openedByLabel(props.sale.openedByUserId) }}</span>
                  <span>{{ props.accountLabel(props.sale.accountId) }}</span>
                </div>
                <details class="sidebar-contact">
                  <summary>Ver Informações de Contato</summary>
                  <p>{{ props.ownerContactsSummary(props.sale.ownerId) }}</p>
                </details>
                <div class="sidebar-owner__actions">
                  <DsButton
                    v-if="props.sale.ownerId"
                    size="sm"
                    variant="ghost"
                    tag="a"
                    :to="`/owners/${props.sale.ownerId}`"
                  >
                    Ver cadastro do cliente
                  </DsButton>
                  <DsButton
                    size="sm"
                    variant="secondary"
                    :loading="props.printingSale"
                    @click="printSelectedSale"
                  >
                    Impressão operacional
                  </DsButton>
                  <DsButton size="sm" variant="ghost" tag="a" to="/queue">
                    Encaminhar Esteira
                  </DsButton>
                </div>
              </div>

              <div
                v-if="props.sale.receipt"
                class="receipt-summary"
                data-testid="counter-sale-receipt"
              >
                <div>
                  <span class="summary-card__label">Comprovante financeiro</span>
                  <strong>{{ props.formatCurrency(props.sale.receipt.amount) }}</strong>
                </div>
                <div class="receipt-summary__meta">
                  <span>ID {{ props.sale.receipt.id }}</span>
                  <span>{{ props.formatDateTime(props.sale.receipt.receivedAt) }}</span>
                  <span v-if="props.sale.receipt.journalEntryId">
                    Diário {{ props.sale.receipt.journalEntryId }}
                  </span>
                </div>
              </div>

              <div class="sidebar-actions">
                <DsButton
                  v-if="props.sale.status === 'open'"
                  variant="secondary"
                  :disabled="props.savingItem"
                  @click="applySaleAdjustment('expense')"
                >
                  Incluir Despesa Extra
                </DsButton>
                <DsButton
                  v-if="props.sale.status === 'open'"
                  variant="secondary"
                  :disabled="props.savingItem"
                  @click="applySaleAdjustment('discount')"
                >
                  Incluir Desconto
                </DsButton>
                <DsButton
                  v-if="props.sale.status === 'open'"
                  variant="primary"
                  :loading="props.transitioningSale"
                  @click="closeSale"
                >
                  Finalizar Comanda
                </DsButton>
                <DsButton
                  v-if="props.sale.status === 'open'"
                  variant="danger"
                  :loading="props.transitioningSale"
                  @click="openCancelModal"
                >
                  Cancelar Comanda
                </DsButton>
                <DsButton
                  v-if="props.sale.status === 'closed' && !props.sale.receipt"
                  variant="secondary"
                  :loading="props.transitioningSale"
                  @click="reopenSale"
                >
                  Reabrir Comanda
                </DsButton>
              </div>
            </div>
          </section>

          <section class="workbench-sidebar__section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Painel direito</span>
                <h3>Registrar pagamento</h3>
              </div>
            </header>

            <div class="payment-form">
              <DsInput
                :model-value="props.paymentForm.method"
                type="select"
                label="Método"
                @update:model-value="updatePaymentField('method', $event)"
              >
                <option value="pix">PIX</option>
                <option value="cash">Dinheiro</option>
                <option value="debit_card">Cartão débito</option>
                <option value="credit_card">Cartão crédito</option>
                <option value="bank_transfer">Transferência</option>
                <option value="check">Cheque</option>
                <option value="insurance">Convênio</option>
                <option value="other">Outro</option>
              </DsInput>
              <DsInput
                :model-value="props.paymentForm.amount"
                type="number"
                label="Valor"
                min="0.01"
                step="0.01"
                @update:model-value="updatePaymentField('amount', $event)"
              />
              <DsInput
                :model-value="props.paymentForm.installments"
                type="number"
                label="Parcelas"
                min="1"
                max="12"
                @update:model-value="updatePaymentField('installments', $event)"
              />
              <DsInput
                :model-value="props.paymentForm.reference"
                label="Referência"
                @update:model-value="updatePaymentField('reference', $event)"
              />
              <DsInput
                :model-value="props.paymentForm.notes"
                type="textarea"
                label="Observação"
                :rows="3"
                @update:model-value="updatePaymentField('notes', $event)"
              />

              <DsButton
                variant="secondary"
                :loading="props.savingPayment"
                :disabled="props.sale.status !== 'open'"
                @click="submitPayment"
              >
                Registrar pagamento
              </DsButton>
            </div>
          </section>

          <section class="workbench-sidebar__section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Histórico financeiro</span>
                <h3>Pagamentos já lançados</h3>
              </div>
            </header>

            <div v-if="props.sale.payments.length > 0" class="payment-list">
              <article
                v-for="payment in props.sale.payments"
                :key="payment.id"
                class="payment-card"
              >
                <div class="payment-card__header">
                  <strong>{{ props.paymentMethodLabel(payment.method) }}</strong>
                  <strong>{{ props.formatCurrency(payment.amount) }}</strong>
                </div>
                <div class="payment-card__meta">
                  <span>{{ props.formatDateTime(payment.createdAt) }}</span>
                  <span v-if="payment.reference">{{ payment.reference }}</span>
                  <span>{{ payment.installments }}x</span>
                </div>
              </article>
            </div>
            <div v-else class="counter-sales-empty">
              Nenhum pagamento registrado para esta comanda.
            </div>
          </section>

          <section v-if="props.ownerQuotes.length > 0" class="workbench-sidebar__section">
            <header class="workbench-section__header">
              <div>
                <span class="workbench-section__eyebrow">Pipeline comercial</span>
                <h3>Orçamentos aprovados do tutor</h3>
              </div>
            </header>

            <div class="quote-list">
              <article v-for="quote in props.ownerQuotes" :key="quote.id" class="quote-card">
                <div class="quote-card__header">
                  <strong>{{ quote.number }}</strong>
                  <strong>{{ props.formatCurrency(quote.total) }}</strong>
                </div>
                <div class="quote-card__meta">
                  <span>{{ quote.validUntil || 'Sem validade' }}</span>
                  <span>{{ quote.convertedToSaleId ? 'Convertido' : 'Pronto para conversão' }}</span>
                </div>
                <DsButton
                  size="sm"
                  variant="ghost"
                  :disabled="Boolean(quote.convertedToSaleId)"
                  @click="convertQuote(quote.id)"
                >
                  Converter em comanda
                </DsButton>
              </article>
            </div>
          </section>
        </aside>
      </div>

      <div class="command-bottom-actions">
        <DsButton variant="ghost" @click="clearSelection">Voltar para Comandas</DsButton>
        <DsButton variant="secondary" tag="a" to="/queue">Encaminhar Esteira</DsButton>
        <DsButton variant="secondary" :loading="props.printingSale" @click="printSelectedSale">
          Imprimir
        </DsButton>
        <DsButton
          v-if="props.sale.status === 'open'"
          variant="primary"
          :loading="props.transitioningSale"
          @click="closeSale"
        >
          Finalizar Comanda
        </DsButton>
      </div>
    </DsCard>
  </section>
</template>

<script setup lang="ts">
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import type {
  CounterSaleCancellationHistory,
  CounterSaleDetail,
  CounterSaleItemSummary,
  CounterSalePaymentMethod,
  CounterSaleStatus
} from '@/services/counterSales';
import type { EncounterSummary } from '@/types/encounter';
import type { MedicalRecordListSummary } from '@/types/medicalRecords';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import type { QuoteSummary } from '@/services/quotes';

export type CounterSalesCatalogItemType = 'all' | 'product' | 'service';
export type CounterSalesCatalogField =
  | 'search'
  | 'itemType'
  | 'quantity'
  | 'discountAmount';
export type CounterSalesBarcodeField = 'code' | 'quantity';
export type CounterSalesPaymentField =
  | 'method'
  | 'amount'
  | 'installments'
  | 'reference'
  | 'notes';

export interface CounterSalesCatalogOption {
  readonly id: string;
  readonly type: 'product' | 'service';
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly basePrice: number;
  readonly onHandQuantity?: number;
}

export interface CounterSalesSelectedPatientContext {
  readonly patient: PatientSummary;
  readonly encounter: EncounterSummary | null;
  readonly medicalRecord: MedicalRecordListSummary | null;
}

export interface CounterSalesTimelineItem {
  readonly key: string;
  readonly title: string;
  readonly description: string;
}

export interface CounterSalesCatalogForm {
  readonly search: string;
  readonly itemType: CounterSalesCatalogItemType;
  readonly quantity: number;
  readonly discountAmount: number;
}

export interface CounterSalesBarcodeForm {
  readonly code: string;
  readonly quantity: number;
}

export interface CounterSalesPaymentForm {
  readonly method: CounterSalePaymentMethod;
  readonly amount: number;
  readonly installments: number;
  readonly reference: string;
  readonly notes: string;
}

const props = defineProps<{
  sale: CounterSaleDetail;
  owner: OwnerSummary | null;
  patientContexts: readonly CounterSalesSelectedPatientContext[];
  ownerQuotes: readonly QuoteSummary[];
  visibleCatalogOptions: readonly CounterSalesCatalogOption[];
  barcodeMatchedOption: CounterSalesCatalogOption | null;
  timelineItems: readonly CounterSalesTimelineItem[];
  cancellationHistory: readonly CounterSaleCancellationHistory[];
  catalogForm: CounterSalesCatalogForm;
  barcodeForm: CounterSalesBarcodeForm;
  paymentForm: CounterSalesPaymentForm;
  canEdit: boolean;
  selectedProductsTotal: number;
  selectedServicesTotal: number;
  notesLength: number;
  savingItem: boolean;
  savingPayment: boolean;
  transitioningSale: boolean;
  printingSale: boolean;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string) => string;
  statusLabel: (status: CounterSaleStatus) => string;
  statusBadgeVariant: (status: CounterSaleStatus) => 'warning' | 'success' | 'danger';
  paymentMethodLabel: (method: CounterSalePaymentMethod | string) => string;
  ownerPrimaryContactLabel: (ownerId: string | null) => string;
  ownerContactsSummary: (ownerId: string | null) => string;
  openedByLabel: (userId: string) => string;
  accountLabel: (accountId: string) => string;
  encounterBadgeLabel: (context: CounterSalesSelectedPatientContext) => string;
  medicalRecordBadgeLabel: (context: CounterSalesSelectedPatientContext) => string;
  patientEncounterSubtitle: (context: CounterSalesSelectedPatientContext) => string;
  patientMedicalRecordSubtitle: (context: CounterSalesSelectedPatientContext) => string;
  patientEncounterLink: (context: CounterSalesSelectedPatientContext) => string;
  patientEncounterActionLabel: (context: CounterSalesSelectedPatientContext) => string;
  patientMedicalRecordLink: (context: CounterSalesSelectedPatientContext) => string;
  patientMedicalRecordActionLabel: (context: CounterSalesSelectedPatientContext) => string;
}>();

const emit = defineEmits<{
  'update-catalog-field': [field: CounterSalesCatalogField, value: string | number];
  'update-barcode-field': [field: CounterSalesBarcodeField, value: string | number];
  'update-payment-field': [field: CounterSalesPaymentField, value: string | number];
  'focus-catalog-type': [type: Exclude<CounterSalesCatalogItemType, 'all'>];
  'add-item-by-barcode': [];
  'add-catalog-option': [option: CounterSalesCatalogOption];
  'change-item-quantity': [item: CounterSaleItemSummary, quantity: number];
  'apply-default-discount': [item: CounterSaleItemSummary];
  'remove-item': [itemId: string];
  'apply-sale-adjustment': [kind: 'expense' | 'discount'];
  'submit-payment': [];
  'close-sale': [];
  'open-cancel-modal': [];
  'reopen-sale': [];
  'convert-quote': [quoteId: string];
  'print-sale': [];
  'clear-selection': [];
}>();

function updateCatalogField(field: CounterSalesCatalogField, value: string | number) {
  emit('update-catalog-field', field, value);
}

function updateBarcodeField(field: CounterSalesBarcodeField, value: string | number) {
  emit('update-barcode-field', field, value);
}

function updatePaymentField(field: CounterSalesPaymentField, value: string | number) {
  emit('update-payment-field', field, value);
}

function focusCatalogType(type: Exclude<CounterSalesCatalogItemType, 'all'>) {
  emit('focus-catalog-type', type);
}

function addItemByBarcode() {
  emit('add-item-by-barcode');
}

function addCatalogOption(option: CounterSalesCatalogOption) {
  emit('add-catalog-option', option);
}

function changeItemQuantity(item: CounterSaleItemSummary, quantity: number) {
  emit('change-item-quantity', item, quantity);
}

function applyDefaultDiscount(item: CounterSaleItemSummary) {
  emit('apply-default-discount', item);
}

function removeItem(itemId: string) {
  emit('remove-item', itemId);
}

function applySaleAdjustment(kind: 'expense' | 'discount') {
  emit('apply-sale-adjustment', kind);
}

function submitPayment() {
  emit('submit-payment');
}

function closeSale() {
  emit('close-sale');
}

function openCancelModal() {
  emit('open-cancel-modal');
}

function reopenSale() {
  emit('reopen-sale');
}

function convertQuote(quoteId: string) {
  emit('convert-quote', quoteId);
}

function printSelectedSale() {
  emit('print-sale');
}

function clearSelection() {
  emit('clear-selection');
}
</script>

<style scoped>
.counter-sales-workbench {
  min-width: 0;
}

.counter-sales-empty {
  color: var(--color-text-muted, #64748b);
}

.item-list,
.payment-list,
.quote-list,
.catalog-results {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.catalog-card,
.line-item-card,
.patient-context-card,
.payment-card,
.quote-card {
  border: 1px solid var(--color-border, #d7dee8);
  border-radius: 18px;
  padding: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 248, 252, 0.95)),
    radial-gradient(circle at top right, rgba(241, 144, 42, 0.08), transparent 42%);
}

.catalog-card__header,
.line-item-card__header,
.payment-card__header,
.quote-card__header,
.sidebar-summary__header,
.workbench-section__header,
.patient-context-card__summary {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.catalog-card__header h4,
.workbench-section__header h3,
.sidebar-summary__header h3 {
  margin: 4px 0 0;
}

.workbench-section__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.catalog-card__meta,
.line-item-card__meta,
.payment-card__meta,
.quote-card__meta,
.sidebar-owner__meta,
.patient-context-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.sidebar-summary__grid,
.item-total-grid,
.patient-context-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.summary-card {
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.summary-card__label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.summary-card__value {
  font-size: 18px;
}

.catalog-card__hint,
.counter-sale-observations {
  margin: 0;
  color: var(--color-text-muted, #64748b);
}

.sidebar-contact {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.sidebar-contact summary {
  padding: 10px 12px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.sidebar-contact p {
  margin: 0;
  padding: 0 12px 12px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.line-item-card__controls,
.sidebar-actions,
.sidebar-owner__actions,
.patient-context-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.workbench-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.8fr);
  gap: 16px;
}

.workbench-main,
.workbench-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workbench-section,
.workbench-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workbench-section__hint {
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 700;
}

.patient-context-card,
.patient-context-card__journey,
.timeline-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-patient-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.service-patient-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.service-patient-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.patient-context-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.patient-context-card__journey {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.barcode-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px max-content;
  gap: 12px;
  align-items: end;
}

.barcode-match {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px dashed rgba(15, 118, 110, 0.32);
  background: rgba(240, 253, 250, 0.9);
  color: #115e59;
}

.journey-pill {
  padding: 12px;
  border-radius: 14px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.timeline-card {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-left: 4px solid rgba(14, 165, 233, 0.7);
  border-radius: 14px;
  background: rgba(240, 249, 255, 0.76);
}

.timeline-card span {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.catalog-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px 140px 140px;
  gap: 12px;
  align-items: end;
}

.line-item-card__controls {
  align-items: center;
}

.line-item-card__quantity {
  min-width: 32px;
  text-align: center;
  font-weight: 700;
}

.line-item-card__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.sidebar-summary,
.sidebar-owner,
.payment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-card--cancellation {
  border-left-color: #dc2626;
  background: rgba(254, 242, 242, 0.82);
}

.receipt-summary {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid rgba(22, 163, 74, 0.28);
  border-left: 4px solid #16a34a;
  border-radius: 12px;
  background: rgba(240, 253, 244, 0.9);
}

.receipt-summary__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: var(--color-text-secondary, #475569);
  font-size: 12px;
}

.command-bottom-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(226, 232, 240, 0.92);
}

@media (max-width: 1100px) {
  .workbench-shell {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .catalog-toolbar,
  .barcode-toolbar {
    grid-template-columns: 1fr;
  }

  .service-patient-card,
  .command-bottom-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .service-patient-card__actions {
    justify-content: flex-start;
  }
}
</style>

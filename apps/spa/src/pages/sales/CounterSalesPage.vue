<template>
  <div class="counter-sales-page">
    <AppPageHeader
      title="Comandas"
      :breadcrumbs="['Início', 'Atendimento', 'Atendimentos', 'Comandas']"
      subtitle="Atendimento > Atendimentos > Comandas. Cards operacionais para localizar, abrir, compor, encaminhar e finalizar a cobrança do atendimento."
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loadingPage" @click="loadPage">Atualizar</DsButton>
        <DsButton variant="primary" @click="openCreateModal">+ Abrir Nova Comanda</DsButton>
      </template>
    </AppPageHeader>

    <CounterSalesKpiSummary
      :open-sales-label="`${openSalesCount} aberta(s)`"
      :closed-sales-label="`${closedSalesCount} fechada(s)`"
      :open-balance-label="formatCurrency(openBalanceTotal)"
      :gross-sales-label="formatCurrency(grossSalesTotal)"
    />

    <details class="counter-sales-report">
      <summary class="counter-sales-report__summary">
        <span>Relatório executivo próprio</span>
        <small
          >Indicadores e análise ficam recolhidos para não disputar atenção com a comanda.</small
        >
      </summary>
      <DsCard title="Relatório executivo próprio">
        <div class="report-toolbar">
          <DsInput v-model="reportFilters.dateFrom" type="date" label="Recorte de" />
          <DsInput v-model="reportFilters.dateTo" type="date" label="até" />
          <DsButton variant="secondary" :loading="loadingDashboard" @click="loadExecutiveDashboard">
            Atualizar leitura executiva
          </DsButton>
        </div>

        <DsAlert
          v-if="dashboardWarning"
          variant="warning"
          dismissible
          @dismiss="dashboardWarning = ''"
        >
          {{ dashboardWarning }}
        </DsAlert>

        <div v-if="commercialDashboard" class="executive-report">
          <div class="summary-grid">
            <div v-for="card in executiveSummaryCards" :key="card.label" class="summary-card">
              <span class="summary-card__label">{{ card.label }}</span>
              <strong class="summary-card__value">{{ card.value }}</strong>
              <span class="summary-card__hint">{{ card.hint }}</span>
            </div>
          </div>

          <div class="executive-report__grid">
            <article class="report-panel">
              <div class="report-panel__header">
                <div>
                  <span class="workbench-section__eyebrow">Leitura do caixa comercial</span>
                  <h3>Mix financeiro do período</h3>
                </div>
                <span class="report-panel__hint">{{ reportWindowLabel }}</span>
              </div>

              <div v-if="commercialDashboard.salesByPaymentMethod.length > 0" class="rank-list">
                <div
                  v-for="item in commercialDashboard.salesByPaymentMethod"
                  :key="item.method"
                  class="rank-list__item"
                >
                  <div>
                    <strong>{{ paymentMethodLabel(item.method) }}</strong>
                    <div class="rank-list__meta">
                      {{ paymentMethodShare(item.total) }} do total monitorado
                    </div>
                  </div>
                  <strong>{{ formatCurrency(item.total) }}</strong>
                </div>
              </div>
              <div v-else class="counter-sales-empty">
                Nenhum pagamento fechado encontrado no recorte informado.
              </div>
            </article>

            <article class="report-panel">
              <div class="report-panel__header">
                <div>
                  <span class="workbench-section__eyebrow">Performance do balcão</span>
                  <h3>Itens líderes</h3>
                </div>
                <span class="report-panel__hint">Top produtos e serviços</span>
              </div>

              <div class="leaderboard-grid">
                <div class="leaderboard-block">
                  <strong class="leaderboard-block__title">Produtos</strong>
                  <div v-if="commercialDashboard.topProducts.length > 0" class="rank-list">
                    <div
                      v-for="item in commercialDashboard.topProducts.slice(0, 5)"
                      :key="`product-${item.name}`"
                      class="rank-list__item"
                    >
                      <div>
                        <strong>{{ item.name }}</strong>
                        <div class="rank-list__meta">{{ item.quantity }} un.</div>
                      </div>
                      <strong>{{ formatCurrency(item.revenue) }}</strong>
                    </div>
                  </div>
                  <div v-else class="counter-sales-empty">Sem produtos fechados no recorte.</div>
                </div>

                <div class="leaderboard-block">
                  <strong class="leaderboard-block__title">Serviços</strong>
                  <div v-if="commercialDashboard.topServices.length > 0" class="rank-list">
                    <div
                      v-for="item in commercialDashboard.topServices.slice(0, 5)"
                      :key="`service-${item.name}`"
                      class="rank-list__item"
                    >
                      <div>
                        <strong>{{ item.name }}</strong>
                        <div class="rank-list__meta">{{ item.quantity }} ocorrência(s)</div>
                      </div>
                      <strong>{{ formatCurrency(item.revenue) }}</strong>
                    </div>
                  </div>
                  <div v-else class="counter-sales-empty">Sem serviços fechados no recorte.</div>
                </div>
              </div>
            </article>

            <article class="report-panel">
              <div class="report-panel__header">
                <div>
                  <span class="workbench-section__eyebrow">Operação e reposição</span>
                  <h3>Monitor de risco comercial</h3>
                </div>
                <span class="report-panel__hint">Quotes, conversão e estoque</span>
              </div>

              <div class="risk-stack">
                <div class="summary-card">
                  <span class="summary-card__label">Pipeline aprovado</span>
                  <strong class="summary-card__value">{{ approvedQuotesCount }}</strong>
                  <span class="summary-card__hint">Orçamentos aprovados ainda convertíveis</span>
                </div>
                <div class="summary-card">
                  <span class="summary-card__label">Taxa de conversão</span>
                  <strong class="summary-card__value">{{ quoteConversionRateLabel }}</strong>
                  <span class="summary-card__hint">Quotes convertidos em comanda</span>
                </div>
                <div v-if="lowStockAlerts.length > 0" class="alert-stack">
                  <div
                    v-for="alert in lowStockAlerts.slice(0, 4)"
                    :key="alert.code"
                    class="inline-alert"
                  >
                    <strong>{{ alert.name }}</strong>
                    <span>SKU {{ alert.code }} · {{ alert.onHand }}/{{ alert.reorderLevel }}</span>
                  </div>
                </div>
                <div v-else class="counter-sales-empty">
                  Nenhum alerta crítico de reposição retornado pelo dashboard.
                </div>
              </div>
            </article>
          </div>
        </div>

        <div v-else-if="loadingDashboard" class="counter-sales-empty">
          Carregando leitura executiva de comandas...
        </div>
        <div v-else class="counter-sales-empty">
          O relatório executivo não está disponível neste momento.
        </div>
      </DsCard>
    </details>

    <section v-if="integrationWarnings.length > 0" class="counter-sales-alerts">
      <DsAlert v-for="warning in integrationWarnings" :key="warning" variant="warning" dismissible>
        {{ warning }}
      </DsAlert>
    </section>

    <section v-if="operationalAlerts.length > 0" class="counter-sales-alerts">
      <DsAlert
        v-for="alert in operationalAlerts"
        :key="alert.title"
        :variant="alert.variant"
        dismissible
      >
        <strong>{{ alert.title }}</strong> — {{ alert.message }}
      </DsAlert>
    </section>

    <section
      v-if="workflowContext.ownerId"
      class="counter-sales-context"
      aria-label="Contexto da recepcao para comanda"
    >
      <div>
        <span class="counter-sales-context__eyebrow">Recepção</span>
        <h2>Comanda preparada pela recepção</h2>
        <p>
          Tutor {{ contextualOwnerLabel }} indicado para abertura manual.
          <span v-if="workflowContext.patientId">Paciente {{ contextualPatientLabel }}.</span>
          <span v-if="workflowContext.encounterId"
            >Atendimento {{ workflowContext.encounterId }}.</span
          >
          Nenhuma comanda foi criada automaticamente.
        </p>
      </div>
      <div class="counter-sales-context__actions">
        <DsButton
          v-if="workflowContext.patientId"
          variant="ghost"
          tag="a"
          :to="`/patients/${encode(workflowContext.patientId)}`"
        >
          Paciente
        </DsButton>
        <DsButton
          v-if="workflowContext.encounterId"
          variant="ghost"
          tag="a"
          :to="`/encounters/${encode(workflowContext.encounterId)}`"
        >
          Atendimento
        </DsButton>
        <DsButton
          v-if="workflowContext.encounterId"
          variant="ghost"
          tag="a"
          :to="`/medical-records/${encode(workflowContext.encounterId)}`"
        >
          Prontuário
        </DsButton>
        <DsButton variant="secondary" @click="openCreateModal">Abrir comanda manualmente</DsButton>
      </div>
    </section>

    <section class="counter-sales-actions">
      <DsCard title="Ações rápidas" variant="compact">
        <div class="quick-actions">
          <DsButton variant="primary" @click="openCreateModal">+ Abrir Nova Comanda</DsButton>
          <DsButton variant="secondary" tag="a" to="/appointments/new">Novo agendamento</DsButton>
          <DsButton variant="secondary" tag="a" to="/encounters/new">Novo atendimento</DsButton>
          <DsButton variant="secondary" tag="a" to="/billing">Faturamento</DsButton>
          <DsButton variant="secondary" tag="a" to="/cash">Caixa</DsButton>
        </div>
      </DsCard>
    </section>

    <section class="counter-sales-toolbar">
      <DsInput
        v-model="filters.search"
        type="search"
        label="Buscar comanda"
        placeholder="Buscar por Nome, CPF, E-mail ou ID"
      />
      <DsInput v-model="filters.status" type="select" label="Status">
        <option value="all">Todos</option>
        <option value="open">Abertas</option>
        <option value="closed">Fechadas</option>
        <option value="cancelled">Canceladas</option>
      </DsInput>
      <DsInput v-model="filters.dateFrom" type="date" label="Período de" />
      <DsInput v-model="filters.dateTo" type="date" label="até" />
      <div class="counter-sales-toolbar__actions">
        <DsButton variant="secondary" :loading="loadingPage" @click="loadPage"> Filtrar </DsButton>
      </div>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>
    <DsAlert v-if="successMessage" variant="success" dismissible @dismiss="successMessage = ''">
      {{ successMessage }}
    </DsAlert>

    <div class="counter-sales-layout">
      <CounterSalesCardList
        :sales="counterSaleCards"
        :loading="loadingPage"
        @select="selectSale"
      />

      <section class="counter-sales-workbench">
        <CounterSalesWorkbench
          v-if="selectedSale"
          :sale="selectedSale"
          :owner="selectedOwner"
          :patient-contexts="selectedPatientContexts"
          :owner-quotes="selectedOwnerQuotes"
          :visible-catalog-options="visibleCatalogOptions"
          :barcode-matched-option="barcodeMatchedOption"
          :timeline-items="selectedTimelineItems"
          :cancellation-history="selectedCancellationHistory"
          :catalog-form="catalogForm"
          :barcode-form="barcodeForm"
          :payment-form="paymentForm"
          :can-edit="canEditSelectedSale"
          :selected-products-total="selectedProductsTotal"
          :selected-services-total="selectedServicesTotal"
          :notes-length="selectedSaleNotesLength"
          :saving-item="savingItem"
          :saving-payment="savingPayment"
          :transitioning-sale="transitioningSale"
          :printing-sale="printingSale"
          :format-currency="formatCurrency"
          :format-date-time="formatDateTime"
          :status-label="statusLabel"
          :status-badge-variant="statusBadgeVariant"
          :payment-method-label="paymentMethodLabel"
          :owner-primary-contact-label="ownerPrimaryContactLabel"
          :owner-contacts-summary="ownerContactsSummary"
          :opened-by-label="openedByLabel"
          :account-label="accountLabel"
          :encounter-badge-label="encounterBadgeLabel"
          :medical-record-badge-label="medicalRecordBadgeLabel"
          :patient-encounter-subtitle="patientEncounterSubtitle"
          :patient-medical-record-subtitle="patientMedicalRecordSubtitle"
          :patient-encounter-link="patientEncounterLink"
          :patient-encounter-action-label="patientEncounterActionLabel"
          :patient-medical-record-link="patientMedicalRecordLink"
          :patient-medical-record-action-label="patientMedicalRecordActionLabel"
          @update-catalog-field="updateCatalogField"
          @update-barcode-field="updateBarcodeField"
          @update-payment-field="updatePaymentField"
          @focus-catalog-type="focusCatalogType"
          @add-item-by-barcode="addItemByBarcode"
          @add-catalog-option="addCatalogOption"
          @change-item-quantity="changeItemQuantity"
          @apply-default-discount="applyDefaultDiscount"
          @remove-item="removeItem"
          @apply-sale-adjustment="applySaleAdjustment"
          @submit-payment="submitPayment"
          @close-sale="closeSale"
          @open-cancel-modal="openCancelModal"
          @reopen-sale="reopenSale"
          @convert-quote="convertQuote"
          @print-sale="printSelectedSale"
          @clear-selection="selectedSaleId = ''"
        />

        <DsCard v-else title="Workbench de comanda">
          <EmptyState
            icon="🛒"
            title="Selecione uma comanda"
            description="Abra uma comanda existente ou crie uma nova para iniciar o workbench operacional."
          />
        </DsCard>
      </section>
    </div>

    <DsModal :open="createModalOpen" title="Abrir nova comanda" size="lg" @close="closeCreateModal">
      <div class="create-sale-modal">
        <div
          class="create-sale-modal__tabs"
          role="tablist"
          aria-label="Fluxo de abertura de comanda"
        >
          <button
            type="button"
            class="create-sale-modal__tab"
            :class="{ 'create-sale-modal__tab--active': createModalTab === 'registered' }"
            @click="createModalTab = 'registered'"
          >
            Cliente Cadastrado
          </button>
          <button
            type="button"
            class="create-sale-modal__tab"
            :class="{ 'create-sale-modal__tab--active': createModalTab === 'new' }"
            @click="createModalTab = 'new'"
          >
            Novo Cliente
          </button>
        </div>

        <template v-if="createModalTab === 'registered'">
          <div class="create-sale-modal__search">
            <DsInput
              v-model="ownerSearch"
              type="search"
              label="Buscar cliente"
              placeholder="Nome, id, CPF, telefone ou e-mail"
              @keyup.enter="loadModalOwners(1)"
            />
            <DsButton variant="secondary" :loading="ownersLoading" @click="loadModalOwners(1)">
              Filtrar
            </DsButton>
          </div>

          <div v-if="ownersLoading" class="counter-sales-empty">Carregando clientes...</div>
          <div v-else-if="modalOwners.length === 0" class="counter-sales-empty">
            Nenhum cliente encontrado para a busca atual.
          </div>
          <div v-else class="modal-owner-list">
            <article
              v-for="owner in modalOwners"
              :key="owner.id"
              class="modal-owner-card"
              :class="{ 'modal-owner-card--selected': selectedOwnerId === owner.id }"
            >
              <div class="modal-owner-card__header">
                <strong>{{ owner.fullName }}</strong>
                <span>{{ ownerPrimaryContactLabel(owner.id) }}</span>
              </div>
              <div class="modal-owner-card__meta">
                <span>{{ owner.documentId || 'Documento não informado' }}</span>
                <span>{{ ownerPatientsLabel(owner.id) }}</span>
              </div>
              <div class="modal-owner-card__actions">
                <DsButton size="sm" variant="secondary" @click="selectedOwnerId = owner.id">
                  {{ selectedOwnerId === owner.id ? 'Cliente selecionado' : 'Selecionar cliente' }}
                </DsButton>
                <DsButton size="sm" variant="ghost" @click="toggleOwnerDetails(owner.id)">
                  {{
                    expandedOwnerId === owner.id ? 'Ocultar informações' : 'Ver mais informações'
                  }}
                </DsButton>
              </div>
              <div v-if="expandedOwnerId === owner.id" class="modal-owner-card__details">
                <div class="detail-pill">
                  <span class="summary-card__label">Responsável financeiro</span>
                  <strong>{{ owner.financialResponsible ? 'Sim' : 'Não' }}</strong>
                </div>
                <div class="detail-pill">
                  <span class="summary-card__label">Observação administrativa</span>
                  <strong>{{ owner.administrativeNotes || 'Sem anotação' }}</strong>
                </div>
                <div class="detail-pill">
                  <span class="summary-card__label">Contatos</span>
                  <strong>{{ ownerContactsSummary(owner.id) }}</strong>
                </div>
              </div>
            </article>
          </div>

          <div v-if="modalTotalPages > 1" class="modal-pagination">
            <DsButton
              size="sm"
              variant="ghost"
              :disabled="modalPage <= 1 || ownersLoading"
              @click="loadModalOwners(modalPage - 1)"
            >
              Página anterior
            </DsButton>
            <span>Página {{ modalPage }} de {{ modalTotalPages }}</span>
            <DsButton
              size="sm"
              variant="ghost"
              :disabled="modalPage >= modalTotalPages || ownersLoading"
              @click="loadModalOwners(modalPage + 1)"
            >
              Próxima página
            </DsButton>
          </div>
        </template>

        <template v-else>
          <div class="create-sale-modal__new-grid">
            <DsInput v-model="newOwnerDraft.fullName" label="Nome completo" required />
            <DsInput v-model="newOwnerDraft.documentId" label="CPF/Documento" />
            <DsInput v-model="newOwnerDraft.email" label="E-mail" />
            <DsInput v-model="newOwnerDraft.whatsapp" label="WhatsApp" />
            <DsInput v-model="newOwnerDraft.phone" label="Telefone" />
          </div>
        </template>

        <DsInput
          v-model="createSaleNotes"
          type="textarea"
          label="Observação da comanda"
          :rows="3"
          placeholder="Contexto do balcão, vendedor, convênio ou nota operacional."
        />
      </div>

      <template #footer>
        <DsButton variant="ghost" @click="closeCreateModal">Cancelar</DsButton>
        <DsButton
          v-if="createModalTab === 'registered'"
          variant="primary"
          :loading="creatingSale"
          :disabled="!selectedOwnerId"
          @click="createSaleForSelectedOwner"
        >
          Criar comanda
        </DsButton>
        <DsButton v-else variant="primary" :loading="creatingSale" @click="createOwnerAndSale">
          Criar cliente e comanda
        </DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="cancelModalOpen"
      :teleport="false"
      title="Cancelar comanda"
      size="sm"
      @close="closeCancelModal"
    >
      <div class="cancel-sale-modal">
        <p v-if="selectedSale" class="cancel-sale-modal__description">
          Informe o motivo para cancelar a comanda {{ selectedSale.number }}. Este registro ficará
          disponível no histórico da comanda.
        </p>
        <DsInput
          id="counter-sale-cancel-reason"
          v-model="cancelReason"
          type="textarea"
          label="Motivo do cancelamento"
          placeholder="Descreva o motivo do cancelamento"
          :rows="4"
          :maxlength="CANCELLATION_REASON_MAX_LENGTH"
          :error="cancellationReasonError"
          required
          @blur="cancelReasonTouched = true"
        />
        <p class="cancel-sale-modal__hint">
          Obrigatório · {{ cancelReason.trim().length }} /
          {{ CANCELLATION_REASON_MAX_LENGTH }} caracteres
        </p>
      </div>
      <template #footer>
        <DsButton variant="ghost" :disabled="transitioningSale" @click="closeCancelModal">
          Voltar
        </DsButton>
        <DsButton
          variant="danger"
          :loading="transitioningSale"
          :disabled="!canConfirmCancellation"
          @click="confirmCancelSale"
        >
          {{ transitioningSale ? 'Cancelando...' : 'Confirmar cancelamento' }}
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import EmptyState from '@/components/EmptyState.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import CounterSalesKpiSummary from './CounterSalesKpiSummary.vue';
import CounterSalesCardList from './CounterSalesCardList.vue';
import type { CounterSalesCardModel } from './CounterSalesCard.vue';
import CounterSalesWorkbench, {
  type CounterSalesBarcodeField,
  type CounterSalesCatalogField,
  type CounterSalesPaymentField
} from './CounterSalesWorkbench.vue';
import {
  counterSalesService,
  type CounterSaleDetail,
  type CounterSaleItemSummary,
  type CounterSalePaymentMethod,
  type CounterSaleStatus,
  type CounterSalesCommercialDashboard
} from '@/services/counterSales';
import { encounterService } from '@/services/encounter';
import { inventoryService } from '@/services/inventory';
import { medicalRecordsService } from '@/services/medicalRecords';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { productsService, type ProductSummary } from '@/services/products';
import { quoteService, type QuoteSummary } from '@/services/quotes';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { EncounterSummary } from '@/types/encounter';
import type { InventoryItemSummary } from '@/types/inventory';
import type { MedicalRecordListSummary } from '@/types/medicalRecords';
import type { CreateOwnerRequest, OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import { formatOwnerContact } from '@/utils/labels';
type CatalogItemType = 'all' | 'product' | 'service';

const CANCELLATION_REASON_MAX_LENGTH = 500;
const CANCELLATION_REASON_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;

interface CatalogOption {
  id: string;
  type: 'product' | 'service';
  name: string;
  code: string | null;
  description: string | null;
  basePrice: number;
  onHandQuantity?: number;
}

interface OperationalAlert {
  title: string;
  message: string;
  variant: 'info' | 'warning' | 'danger';
}

interface SelectedPatientContext {
  patient: PatientSummary;
  encounter: EncounterSummary | null;
  medicalRecord: MedicalRecordListSummary | null;
}

interface TimelineItem {
  key: string;
  title: string;
  description: string;
}

const loadingPage = ref(false);
const loadingDashboard = ref(false);
const creatingSale = ref(false);
const savingItem = ref(false);
const savingPayment = ref(false);
const transitioningSale = ref(false);
const cancelModalOpen = ref(false);
const cancelReason = ref('');
const cancelReasonTouched = ref(false);
const ownersLoading = ref(false);
const printingSale = ref(false);
const error = ref('');
const successMessage = ref('');
const dashboardWarning = ref('');

const sales = ref<CounterSaleDetail[]>([]);
const selectedSaleId = ref('');
const workflowContext = readWorkflowContext();

const ownerMap = ref<Record<string, OwnerSummary>>({});
const patientMap = ref<Record<string, PatientSummary[]>>({});
const quotes = ref<QuoteSummary[]>([]);
const products = ref<ProductSummary[]>([]);
const serviceCatalog = ref<ServiceSummary[]>([]);
const inventoryItems = ref<InventoryItemSummary[]>([]);
const encounters = ref<EncounterSummary[]>([]);
const medicalRecords = ref<MedicalRecordListSummary[]>([]);
const commercialDashboard = ref<CounterSalesCommercialDashboard | null>(null);
const integrationWarnings = ref<string[]>([]);

const filters = reactive({
  search: '',
  status: 'all' as CounterSaleStatus | 'all',
  dateFrom: '',
  dateTo: ''
});

const reportFilters = reactive({
  dateFrom: '',
  dateTo: ''
});

const catalogForm = reactive({
  search: '',
  itemType: 'all' as CatalogItemType,
  quantity: 1,
  discountAmount: 0
});

const barcodeForm = reactive({
  code: '',
  quantity: 1
});

const paymentForm = reactive({
  method: 'pix' as CounterSalePaymentMethod,
  amount: 0,
  installments: 1,
  reference: '',
  notes: ''
});

const createModalOpen = ref(false);
const createModalTab = ref<'registered' | 'new'>('registered');
const ownerSearch = ref('');
const createSaleNotes = ref('');
const selectedOwnerId = ref('');
const expandedOwnerId = ref('');
const modalPage = ref(1);
const modalTotalPages = ref(1);
const modalOwners = ref<OwnerSummary[]>([]);
const newOwnerDraft = reactive({
  fullName: '',
  documentId: '',
  email: '',
  whatsapp: '',
  phone: ''
});

const selectedSale = computed(
  () => sales.value.find((sale) => sale.id === selectedSaleId.value) ?? null
);
const canEditSelectedSale = computed(() => selectedSale.value?.status === 'open');
const selectedOwner = computed(() => {
  const ownerId = selectedSale.value?.ownerId;
  return ownerId ? (ownerMap.value[ownerId] ?? null) : null;
});
const selectedOwnerPatients = computed(() => {
  const ownerId = selectedSale.value?.ownerId;
  return ownerId ? (patientMap.value[ownerId] ?? []) : [];
});
const selectedOwnerQuotes = computed(() => {
  const ownerId = selectedSale.value?.ownerId;
  if (!ownerId) return [];
  return quotes.value.filter((quote) => quote.ownerId === ownerId);
});
const contextualOwnerLabel = computed(() => {
  if (!workflowContext.ownerId) return 'não informado';
  return ownerMap.value[workflowContext.ownerId]?.fullName || workflowContext.ownerId;
});
const contextualPatientLabel = computed(() => {
  if (!workflowContext.patientId) return 'não informado';
  const patients = Object.values(patientMap.value).flat();
  return (
    patients.find((patient) => patient.id === workflowContext.patientId)?.name ||
    workflowContext.patientId
  );
});
const selectedProductItems = computed(
  () => selectedSale.value?.items.filter((item) => item.itemType === 'product') ?? []
);
const selectedServiceItems = computed(
  () => selectedSale.value?.items.filter((item) => item.itemType === 'service') ?? []
);
const selectedProductsTotal = computed(() =>
  selectedProductItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const selectedServicesTotal = computed(() =>
  selectedServiceItems.value.reduce((sum, item) => sum + item.lineTotal, 0)
);
const selectedSaleNotesLength = computed(() => selectedSale.value?.notes?.length ?? 0);
const selectedCancellationHistory = computed(() => selectedSale.value?.cancellationHistory ?? []);
const cancellationReasonError = computed(() => {
  if (!cancelReasonTouched.value) return undefined;
  const normalizedReason = cancelReason.value.trim();
  if (CANCELLATION_REASON_CONTROL_CHARACTERS.test(cancelReason.value)) {
    return 'O motivo do cancelamento não pode conter caracteres de controle.';
  }
  if (!normalizedReason) return 'O motivo do cancelamento é obrigatório.';
  if (normalizedReason.length > CANCELLATION_REASON_MAX_LENGTH) {
    return `O motivo do cancelamento deve ter no máximo ${CANCELLATION_REASON_MAX_LENGTH} caracteres.`;
  }
  return undefined;
});
const canConfirmCancellation = computed(() => {
  const length = cancelReason.value.trim().length;
  return (
    !transitioningSale.value &&
    !CANCELLATION_REASON_CONTROL_CHARACTERS.test(cancelReason.value) &&
    length >= 1 &&
    length <= CANCELLATION_REASON_MAX_LENGTH
  );
});

const selectedPatientContexts = computed<SelectedPatientContext[]>(() => {
  const recordByEncounterId = new Map(
    medicalRecords.value.map((record) => [record.record.encounterId, record] as const)
  );

  return selectedOwnerPatients.value.map((patient) => {
    const patientEncounters = encounters.value
      .filter((encounter) => encounter.patientId === patient.id)
      .slice()
      .sort((left, right) => {
        const leftWeight = left.status === 'closed' ? 0 : 1;
        const rightWeight = right.status === 'closed' ? 0 : 1;
        if (leftWeight !== rightWeight) {
          return rightWeight - leftWeight;
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
    const encounter = patientEncounters[0] ?? null;

    return {
      patient,
      encounter,
      medicalRecord: encounter ? (recordByEncounterId.get(encounter.id) ?? null) : null
    };
  });
});
const selectedTimelineItems = computed<TimelineItem[]>(() => {
  const sale = selectedSale.value;
  if (!sale) return [];

  const patientEvents = selectedPatientContexts.value.map((context) => ({
    key: `patient-${context.patient.id}`,
    title: `${context.patient.name} · ${context.encounter ? encounterStatusLabel(context.encounter.status) : 'Aguardando entrada'}`,
    description: context.encounter
      ? `Entrada: ${formatDateTime(context.encounter.openedAt)} · Setor receptor: Atendimento`
      : 'Urgência: Aguardando · Setor receptor: Clínica'
  }));

  const paymentEvents = sale.payments.map((payment) => ({
    key: `payment-${payment.id}`,
    title: `Pagamento ${paymentMethodLabel(payment.method)}`,
    description: `${formatCurrency(payment.amount)} registrado em ${formatDateTime(payment.createdAt)}`
  }));

  return [...patientEvents, ...paymentEvents];
});

const inventoryBySku = computed(
  () => new Map(inventoryItems.value.map((item) => [item.sku, item]))
);

const lowStockAlerts = computed(() => commercialDashboard.value?.lowStockAlerts ?? []);
const approvedQuotesCount = computed(
  () =>
    quotes.value.filter((quote) => quote.status === 'approved' && !quote.convertedToSaleId).length
);
const convertedQuotesCount = computed(
  () => quotes.value.filter((quote) => Boolean(quote.convertedToSaleId)).length
);
const quoteConversionRateLabel = computed(() => {
  const totalQuotes = quotes.value.length;
  if (totalQuotes === 0) return '0%';
  return formatPercent((convertedQuotesCount.value / totalQuotes) * 100);
});
const paymentMixTotal = computed(() =>
  (commercialDashboard.value?.salesByPaymentMethod ?? []).reduce((sum, item) => sum + item.total, 0)
);
const reportWindowLabel = computed(() => {
  if (!reportFilters.dateFrom && !reportFilters.dateTo) {
    return 'Janela padrão';
  }
  const from = reportFilters.dateFrom || 'início';
  const to = reportFilters.dateTo || 'agora';
  return `${from} → ${to}`;
});
const executiveSummaryCards = computed(() => {
  if (!commercialDashboard.value) return [];

  return [
    {
      label: 'Abertas agora',
      value: String(commercialDashboard.value.openSales),
      hint: 'Comandas ainda em operação'
    },
    {
      label: 'Fechadas hoje',
      value: String(commercialDashboard.value.closedToday),
      hint: 'Venda concluída no dia operacional'
    },
    {
      label: 'Receita bruta',
      value: formatCurrency(commercialDashboard.value.grossRevenueToday),
      hint: 'Produção comercial do dia'
    },
    {
      label: 'Receita líquida',
      value: formatCurrency(commercialDashboard.value.netRevenueToday),
      hint: 'Valor efetivamente capturado'
    },
    {
      label: 'Ticket médio',
      value: formatCurrency(commercialDashboard.value.avgTicket),
      hint: 'Média das comandas fechadas'
    },
    {
      label: 'Quotes convertidos',
      value: quoteConversionRateLabel.value,
      hint: `${convertedQuotesCount.value} de ${quotes.value.length} orçamento(s)`
    }
  ];
});

const catalogOptions = computed<CatalogOption[]>(() => {
  const productOptions = products.value.map((product) => ({
    id: product.id,
    type: 'product' as const,
    name: product.name,
    code: product.code,
    description: product.description,
    basePrice: product.basePrice,
    onHandQuantity: product.code
      ? inventoryBySku.value.get(product.code)?.onHandQuantity
      : undefined
  }));
  const serviceOptions = serviceCatalog.value.map((service) => ({
    id: service.id,
    type: 'service' as const,
    name: service.name,
    code: service.code,
    description: service.description,
    basePrice: service.basePrice
  }));

  return [...productOptions, ...serviceOptions];
});

const visibleCatalogOptions = computed(() => {
  const search = catalogForm.search.trim().toLowerCase();
  return catalogOptions.value
    .filter((option) => {
      const matchesType = catalogForm.itemType === 'all' || option.type === catalogForm.itemType;
      const matchesSearch =
        !search ||
        option.name.toLowerCase().includes(search) ||
        (option.code ?? '').toLowerCase().includes(search) ||
        (option.description ?? '').toLowerCase().includes(search);
      return matchesType && matchesSearch;
    })
    .slice(0, 12);
});

const barcodeMatchedOption = computed(() => {
  const normalizedCode = normalizeCatalogCode(barcodeForm.code);
  if (!normalizedCode) return null;

  return (
    catalogOptions.value.find(
      (option) => normalizeCatalogCode(option.code ?? '') === normalizedCode
    ) ?? null
  );
});

const filteredSales = computed(() => {
  const search = filters.search.trim().toLowerCase();
  return sales.value.filter((sale) => {
    const owner = sale.ownerId ? ownerMap.value[sale.ownerId] : null;
    const matchesSearch =
      !search ||
      sale.number.toLowerCase().includes(search) ||
      (sale.notes ?? '').toLowerCase().includes(search) ||
      (owner?.fullName ?? '').toLowerCase().includes(search) ||
      ownerPrimaryContactLabel(sale.ownerId).toLowerCase().includes(search);
    const matchesStatus = filters.status === 'all' || sale.status === filters.status;
    const matchesDateFrom = !filters.dateFrom || sale.createdAt >= `${filters.dateFrom}T00:00:00`;
    const matchesDateTo = !filters.dateTo || sale.createdAt <= `${filters.dateTo}T23:59:59`;
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });
});

const counterSaleCards = computed<readonly CounterSalesCardModel[]>(() =>
  filteredSales.value.map((sale) => ({
    id: sale.id,
    statusVariant: statusBadgeVariant(sale.status),
    statusLabel: statusLabel(sale.status),
    number: sale.number,
    openedAtLabel: formatDateTime(sale.createdAt),
    closedAtLabel: sale.closedAt ? formatDateTime(sale.closedAt) : '-',
    ownerNameLabel: ownerName(sale.ownerId),
    totalLabel: formatCurrency(sale.total),
    primaryContactLabel: ownerPrimaryContactLabel(sale.ownerId),
    patientsLabel: ownerPatientsLabel(sale.ownerId),
    openedByLabel: openedByLabel(sale.openedByUserId),
    accountLabel: accountLabel(sale.accountId),
    paidLabel: formatCurrency(sale.paidAmount),
    balanceLabel: formatCurrency(sale.balanceDue),
    notes: sale.notes,
    itemsCountLabel: saleItemsCountLabel(sale),
    productsTotalLabel: formatCurrency(saleItemsTotal(sale, 'product')),
    servicesTotalLabel: formatCurrency(saleItemsTotal(sale, 'service')),
    selected: sale.id === selectedSaleId.value,
    selectLabel: sale.id === selectedSaleId.value ? 'Atualizar comanda' : 'Ver comanda',
    ownerHref: sale.ownerId ? `/owners/${sale.ownerId}` : null
  }))
);

const openSalesCount = computed(() => sales.value.filter((sale) => sale.status === 'open').length);
const closedSalesCount = computed(
  () => sales.value.filter((sale) => sale.status === 'closed').length
);
const openBalanceTotal = computed(() =>
  sales.value
    .filter((sale) => sale.status === 'open')
    .reduce((sum, sale) => sum + sale.balanceDue, 0)
);
const grossSalesTotal = computed(() => sales.value.reduce((sum, sale) => sum + sale.total, 0));

const operationalAlerts = computed<OperationalAlert[]>(() => {
  const alerts: OperationalAlert[] = [];

  if (openSalesCount.value > 0) {
    alerts.push({
      title: 'Comandas em aberto',
      message: `${openSalesCount.value} comanda(s) ainda dependem de fechamento financeiro.`,
      variant: 'warning'
    });
  }

  const lowStock = visibleCatalogOptions.value.filter(
    (option) =>
      option.type === 'product' && option.onHandQuantity !== undefined && option.onHandQuantity <= 3
  );
  if (lowStock.length > 0) {
    alerts.push({
      title: 'Estoque crítico',
      message: `${lowStock.length} produto(s) exibem estoque baixo no catálogo da comanda.`,
      variant: 'info'
    });
  }

  if (approvedQuotesCount.value > 0) {
    alerts.push({
      title: 'Pipeline comercial pronto',
      message: `${approvedQuotesCount.value} orçamento(s) aprovados ainda podem virar comanda.`,
      variant: 'info'
    });
  }

  if (lowStockAlerts.value.length > 0) {
    alerts.push({
      title: 'Reposição prioritária',
      message: `${lowStockAlerts.value.length} SKU(s) vieram do dashboard executivo com sinal de baixa cobertura.`,
      variant: 'warning'
    });
  }

  return alerts;
});

onMounted(() => {
  void loadPage();
});

async function loadPage() {
  loadingPage.value = true;
  error.value = '';
  integrationWarnings.value = [];

  try {
    const [
      salesResult,
      quotesResult,
      productsResult,
      servicesResult,
      inventoryResult,
      encountersResult,
      recordsResult
    ] = await Promise.allSettled([
      counterSalesService.list({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      }),
      quoteService.list(undefined, 'approved'),
      productsService.list(),
      servicesService.list(),
      inventoryService.list(),
      encounterService.list(),
      medicalRecordsService.listAll()
    ]);

    if (salesResult.status === 'fulfilled') {
      sales.value = [];
      await hydrateSales(salesResult.value);
    } else {
      throw salesResult.reason;
    }

    quotes.value = quotesResult.status === 'fulfilled' ? quotesResult.value : [];
    products.value = productsResult.status === 'fulfilled' ? productsResult.value : [];
    serviceCatalog.value = servicesResult.status === 'fulfilled' ? servicesResult.value : [];
    inventoryItems.value = inventoryResult.status === 'fulfilled' ? inventoryResult.value : [];
    encounters.value = encountersResult.status === 'fulfilled' ? encountersResult.value : [];
    medicalRecords.value = recordsResult.status === 'fulfilled' ? recordsResult.value : [];

    const warnings: string[] = [];
    if (quotesResult.status !== 'fulfilled') {
      warnings.push('Pipeline comercial indisponível; a comanda continua operando sem quotes.');
    }
    if (encountersResult.status !== 'fulfilled') {
      warnings.push(
        'Contexto de atendimento indisponível; os atalhos assistenciais foram reduzidos.'
      );
    }
    if (recordsResult.status !== 'fulfilled') {
      warnings.push('Prontuário não respondeu; o vínculo clínico está em visão parcial.');
    }
    integrationWarnings.value = warnings;

    await loadExecutiveDashboard();

    const contextualSale = workflowContext.ownerId
      ? sales.value.find((sale) => sale.ownerId === workflowContext.ownerId)
      : null;

    if (selectedSaleId.value) {
      await selectSale(selectedSaleId.value);
    } else if (contextualSale) {
      await selectSale(contextualSale.id);
    } else if (sales.value[0]) {
      await selectSale(sales.value[0].id);
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Erro ao carregar comandas';
  } finally {
    loadingPage.value = false;
  }
}

async function loadExecutiveDashboard() {
  loadingDashboard.value = true;
  dashboardWarning.value = '';

  try {
    commercialDashboard.value = await counterSalesService.getCommercialDashboard({
      dateFrom: reportFilters.dateFrom || undefined,
      dateTo: reportFilters.dateTo || undefined
    });
  } catch (loadError) {
    commercialDashboard.value = null;
    dashboardWarning.value =
      loadError instanceof Error
        ? loadError.message
        : 'Não foi possível atualizar o relatório executivo de comandas.';
  } finally {
    loadingDashboard.value = false;
  }
}

async function hydrateSales(inputSales: Awaited<ReturnType<typeof counterSalesService.list>>) {
  const details = await Promise.all(inputSales.map((sale) => counterSalesService.getById(sale.id)));
  sales.value = details;

  const ownerIds = [...new Set(details.map((sale) => sale.ownerId).filter(Boolean))] as string[];
  await Promise.all(ownerIds.map(async (ownerId) => ensureOwnerLoaded(ownerId)));
}

async function ensureOwnerLoaded(ownerId: string) {
  if (ownerMap.value[ownerId]) {
    return;
  }

  const owner = await ownerService.getById(ownerId);
  ownerMap.value = {
    ...ownerMap.value,
    [ownerId]: owner
  };

  await ensurePatientsLoaded(ownerId);
}

async function ensurePatientsLoaded(ownerId: string) {
  if (patientMap.value[ownerId]) {
    return;
  }

  const response = await patientService.listPage({
    ownerId,
    page: 1,
    pageSize: 50
  });

  patientMap.value = {
    ...patientMap.value,
    [ownerId]: response.items ?? []
  };
}

async function selectSale(saleId: string) {
  selectedSaleId.value = saleId;
  const detail = await counterSalesService.getById(saleId);
  sales.value = sales.value.map((sale) => (sale.id === detail.id ? detail : sale));
  if (detail.ownerId) {
    await ensureOwnerLoaded(detail.ownerId);
  }
  paymentForm.amount = Math.max(detail.balanceDue, 0);
}

function ownerName(ownerId: string | null) {
  if (!ownerId) return 'Comanda sem tutor';
  return ownerMap.value[ownerId]?.fullName ?? `Tutor ${ownerId}`;
}

function ownerPrimaryContactLabel(ownerId: string | null) {
  if (!ownerId) return 'Sem contato';
  const owner = ownerMap.value[ownerId];
  const primary = owner?.contacts.find((contact) => contact.primary) ?? owner?.contacts[0];
  return primary ? formatOwnerContact(primary, 'Sem contato principal') : 'Sem contato principal';
}

function ownerPatientsLabel(ownerId: string | null) {
  if (!ownerId) return 'Sem vínculo animal';
  const patients = patientMap.value[ownerId] ?? [];
  if (patients.length === 0) return 'Sem animais cadastrados';
  if (patients.length === 1) return `1 animal: ${patients[0].name}`;
  return `${patients.length} animais vinculados`;
}

function ownerContactsSummary(ownerId: string | null) {
  if (!ownerId) return 'Sem contatos';
  const owner = ownerMap.value[ownerId];
  if (!owner || owner.contacts.length === 0) return 'Sem contatos';
  return owner.contacts.map((contact) => formatOwnerContact(contact)).join(' · ');
}

function saleItemsCountLabel(sale: CounterSaleDetail) {
  const products = sale.items.filter((item) => item.itemType === 'product').length;
  const services = sale.items.filter((item) => item.itemType === 'service').length;
  return `${products} produto(s) · ${services} serviço(s)`;
}

function saleItemsTotal(sale: CounterSaleDetail, type: CounterSaleItemSummary['itemType']) {
  return sale.items
    .filter((item) => item.itemType === type)
    .reduce((sum, item) => sum + item.lineTotal, 0);
}

function openedByLabel(userId: string) {
  return `Operador ${userId}`;
}

function accountLabel(accountId: string) {
  return `Empresa ${accountId}`;
}

function encounterBadgeLabel(context: SelectedPatientContext) {
  if (!context.encounter) return 'Sem atendimento';
  return encounterStatusLabel(context.encounter.status);
}

function medicalRecordBadgeLabel(context: SelectedPatientContext) {
  if (!context.medicalRecord) return 'Sem prontuário';
  return context.medicalRecord.record.status === 'open' ? 'Prontuário ativo' : 'Prontuário fechado';
}

function patientEncounterSubtitle(context: SelectedPatientContext) {
  if (!context.encounter) return 'Nenhum episódio clínico aberto';
  return `${encounterStatusLabel(context.encounter.status)} · ${formatDateTime(context.encounter.updatedAt)}`;
}

function patientMedicalRecordSubtitle(context: SelectedPatientContext) {
  if (!context.medicalRecord) return 'Abrirá junto com o atendimento';
  return `${context.medicalRecord.entryCount} entrada(s) · ${formatDateTime(context.medicalRecord.record.updatedAt)}`;
}

function patientEncounterLink(context: SelectedPatientContext) {
  if (context.encounter) {
    return `/encounters/${context.encounter.id}`;
  }
  return `/encounters/new?patientId=${encodeURIComponent(context.patient.id)}&ownerId=${encodeURIComponent(context.patient.primaryOwnerId)}`;
}

function patientEncounterActionLabel(context: SelectedPatientContext) {
  return context.encounter ? 'Atendimento' : 'Abrir atendimento';
}

function patientMedicalRecordLink(context: SelectedPatientContext) {
  if (context.encounter) {
    return `/medical-records/${context.encounter.id}`;
  }
  return `/encounters/new?patientId=${encodeURIComponent(context.patient.id)}&ownerId=${encodeURIComponent(context.patient.primaryOwnerId)}`;
}

function patientMedicalRecordActionLabel(context: SelectedPatientContext) {
  return context.medicalRecord ? 'Prontuário' : 'Abrir prontuário';
}

function encode(value: string) {
  return encodeURIComponent(value);
}

async function addCatalogOption(option: CatalogOption) {
  if (!selectedSale.value) return;
  if (!canEditSelectedSale.value) {
    error.value = 'Comandas fechadas ou canceladas não aceitam novos itens.';
    return;
  }

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.addItem(selectedSale.value.id, {
      itemType: option.type,
      catalogItemId: option.id,
      nameSnapshot: option.name,
      codeSnapshot: option.code,
      unitPrice: option.basePrice,
      quantity: catalogForm.quantity,
      discountAmount: catalogForm.discountAmount,
      notes: null
    });
    successMessage.value = `${option.name} adicionado à comanda ${selectedSale.value.number}.`;
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao adicionar item';
  } finally {
    savingItem.value = false;
  }
}

function focusCatalogType(type: Exclude<CatalogItemType, 'all'>) {
  catalogForm.itemType = type;
  catalogForm.search = '';
}

function updateCatalogField(field: CounterSalesCatalogField, value: string | number) {
  if (field === 'search' && typeof value === 'string') {
    catalogForm.search = value;
    return;
  }

  if (field === 'itemType' && (value === 'all' || value === 'product' || value === 'service')) {
    catalogForm.itemType = value;
    return;
  }

  if (field === 'quantity' || field === 'discountAmount') {
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return;
    catalogForm[field] = Math.max(field === 'quantity' ? 1 : 0, numericValue);
  }
}

function updateBarcodeField(field: CounterSalesBarcodeField, value: string | number) {
  if (field === 'code' && typeof value === 'string') {
    barcodeForm.code = value;
    return;
  }

  if (field === 'quantity') {
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return;
    barcodeForm.quantity = Math.max(1, numericValue);
  }
}

function updatePaymentField(field: CounterSalesPaymentField, value: string | number) {
  if (field === 'method' && typeof value === 'string') {
    const methods: readonly CounterSalePaymentMethod[] = [
      'cash',
      'credit_card',
      'debit_card',
      'pix',
      'bank_transfer',
      'check',
      'insurance',
      'other'
    ];
    if (methods.includes(value as CounterSalePaymentMethod)) {
      paymentForm.method = value as CounterSalePaymentMethod;
    }
    return;
  }

  if (field === 'reference' && typeof value === 'string') {
    paymentForm.reference = value;
    return;
  }

  if (field === 'notes' && typeof value === 'string') {
    paymentForm.notes = value;
    return;
  }

  if (field === 'amount' || field === 'installments') {
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return;
    paymentForm[field] = Math.max(field === 'installments' ? 1 : 0, numericValue);
  }
}

async function addItemByBarcode() {
  const option = barcodeMatchedOption.value;
  if (!option) {
    error.value = 'Código de barras não localizado no catálogo operacional.';
    return;
  }
  if (!selectedSale.value) return;
  if (!canEditSelectedSale.value) {
    error.value = 'Comandas fechadas ou canceladas não aceitam novos itens.';
    return;
  }

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.addItem(selectedSale.value.id, {
      itemType: option.type,
      catalogItemId: option.id,
      nameSnapshot: option.name,
      codeSnapshot: option.code,
      unitPrice: option.basePrice,
      quantity: barcodeForm.quantity > 0 ? barcodeForm.quantity : 1,
      discountAmount: 0,
      notes: 'Lançado por código de barras'
    });
    successMessage.value = `${option.name} lançado por código na comanda ${selectedSale.value.number}.`;
    barcodeForm.code = '';
    barcodeForm.quantity = 1;
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao lançar item por código';
  } finally {
    savingItem.value = false;
  }
}

async function changeItemQuantity(item: CounterSaleItemSummary, quantity: number) {
  if (!selectedSale.value || quantity < 1) return;
  if (!canEditSelectedSale.value) {
    error.value = 'Comandas fechadas ou canceladas não aceitam edição de itens.';
    return;
  }

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.updateItem(selectedSale.value.id, item.id, {
      quantity
    });
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao atualizar item';
  } finally {
    savingItem.value = false;
  }
}

async function applyDefaultDiscount(item: CounterSaleItemSummary) {
  if (!selectedSale.value) return;
  if (!canEditSelectedSale.value) {
    error.value = 'Comandas fechadas ou canceladas não aceitam desconto em itens.';
    return;
  }

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.updateItem(selectedSale.value.id, item.id, {
      discountAmount: Math.round(item.unitPrice * 0.1 * 100) / 100
    });
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao aplicar desconto';
  } finally {
    savingItem.value = false;
  }
}

async function applySaleAdjustment(kind: 'expense' | 'discount') {
  if (!selectedSale.value) return;

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.addItem(selectedSale.value.id, {
      itemType: 'service',
      catalogItemId: null,
      nameSnapshot: kind === 'expense' ? 'Despesa extra' : 'Desconto operacional',
      codeSnapshot: kind === 'expense' ? 'AJUSTE-DESPESA' : 'AJUSTE-DESCONTO',
      unitPrice: kind === 'expense' ? 10 : 0,
      quantity: 1,
      discountAmount: kind === 'expense' ? 0 : 10,
      notes:
        kind === 'expense'
          ? 'Ajuste lançado pelo resumo da conta'
          : 'Desconto lançado pelo resumo da conta'
    });
    successMessage.value =
      kind === 'expense' ? 'Despesa extra incluída na comanda.' : 'Desconto incluído na comanda.';
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao lançar ajuste na comanda';
  } finally {
    savingItem.value = false;
  }
}

async function removeItem(itemId: string) {
  if (!selectedSale.value) return;
  if (!canEditSelectedSale.value) {
    error.value = 'Comandas fechadas ou canceladas não aceitam remoção de itens.';
    return;
  }

  savingItem.value = true;
  error.value = '';
  try {
    await counterSalesService.removeItem(selectedSale.value.id, itemId);
    successMessage.value = 'Item removido da comanda.';
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao remover item';
  } finally {
    savingItem.value = false;
  }
}

async function submitPayment() {
  if (!selectedSale.value || selectedSale.value.status !== 'open') return;

  savingPayment.value = true;
  error.value = '';
  try {
    await counterSalesService.addPayment(selectedSale.value.id, {
      method: paymentForm.method,
      amount: paymentForm.amount,
      installments: paymentForm.installments,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null
    });
    successMessage.value = 'Pagamento registrado com sucesso.';
    paymentForm.reference = '';
    paymentForm.notes = '';
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao registrar pagamento';
  } finally {
    savingPayment.value = false;
  }
}

async function closeSale() {
  const sale = selectedSale.value;
  if (!sale) return;
  const saleId = sale.id;
  const saleNumber = sale.number;
  transitioningSale.value = true;
  error.value = '';
  try {
    const closed =
      sale.balanceDue > 0.01
        ? await counterSalesService.settle(saleId, [
            {
              method: paymentForm.method,
              amount: paymentForm.amount,
              installments: paymentForm.installments,
              reference: paymentForm.reference || null,
              notes: paymentForm.notes || null
            }
          ])
        : await counterSalesService.close(saleId);
    successMessage.value = closed.receipt
      ? `Comanda ${saleNumber} finalizada com recibo ${closed.receipt.id}.`
      : `Comanda ${saleNumber} finalizada.`;
    await loadPage();
    await selectSale(saleId);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao fechar comanda';
  } finally {
    transitioningSale.value = false;
  }
}

function openCancelModal() {
  if (!selectedSale.value || selectedSale.value.status !== 'open' || transitioningSale.value)
    return;
  cancelReason.value = '';
  cancelReasonTouched.value = false;
  cancelModalOpen.value = true;
}

function closeCancelModal() {
  if (transitioningSale.value) return;
  cancelModalOpen.value = false;
  cancelReason.value = '';
  cancelReasonTouched.value = false;
}

async function confirmCancelSale() {
  const sale = selectedSale.value;
  if (!sale) return;

  cancelReasonTouched.value = true;
  if (CANCELLATION_REASON_CONTROL_CHARACTERS.test(cancelReason.value)) {
    error.value = 'O motivo do cancelamento não pode conter caracteres de controle.';
    return;
  }
  const reason = cancelReason.value.trim();
  if (!reason) {
    error.value = 'O motivo do cancelamento é obrigatório.';
    return;
  }
  if (reason.length > CANCELLATION_REASON_MAX_LENGTH) {
    error.value = `O motivo do cancelamento deve ter no máximo ${CANCELLATION_REASON_MAX_LENGTH} caracteres.`;
    return;
  }

  transitioningSale.value = true;
  error.value = '';
  try {
    await counterSalesService.cancel(sale.id, reason);
    successMessage.value = `Comanda ${sale.number} cancelada.`;
    cancelModalOpen.value = false;
    await loadPage();
    await selectSale(sale.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao cancelar comanda';
  } finally {
    transitioningSale.value = false;
  }
}

async function reopenSale() {
  if (!selectedSale.value) return;
  transitioningSale.value = true;
  error.value = '';
  try {
    await counterSalesService.reopen(selectedSale.value.id);
    successMessage.value = `Comanda ${selectedSale.value.number} reaberta.`;
    await loadPage();
    await selectSale(selectedSale.value.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao reabrir comanda';
  } finally {
    transitioningSale.value = false;
  }
}

async function convertQuote(quoteId: string) {
  try {
    const conversion = await quoteService.convertToSale(quoteId);
    successMessage.value = `Orçamento convertido em comanda ${conversion.counterSaleId}.`;
    await loadPage();
    await selectSale(conversion.counterSaleId);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao converter orçamento';
  }
}

function openCreateModal() {
  createModalOpen.value = true;
  createModalTab.value = 'registered';
  ownerSearch.value = workflowContext.ownerId || '';
  createSaleNotes.value = '';
  selectedOwnerId.value = '';
  expandedOwnerId.value = '';
  modalPage.value = 1;
  modalTotalPages.value = 1;
  resetNewOwnerDraft();
  void loadModalOwners(1);
}

function closeCreateModal() {
  createModalOpen.value = false;
  expandedOwnerId.value = '';
}

function resetNewOwnerDraft() {
  newOwnerDraft.fullName = '';
  newOwnerDraft.documentId = '';
  newOwnerDraft.email = '';
  newOwnerDraft.whatsapp = '';
  newOwnerDraft.phone = '';
}

function toggleOwnerDetails(ownerId: string) {
  expandedOwnerId.value = expandedOwnerId.value === ownerId ? '' : ownerId;
}

async function loadModalOwners(page = modalPage.value) {
  ownersLoading.value = true;
  try {
    const response = await ownerService.listPage({
      search: ownerSearch.value.trim() || undefined,
      page,
      pageSize: 8,
      status: 'active'
    });
    modalPage.value = page;
    modalTotalPages.value = response.totalPages ?? 1;
    modalOwners.value = response.items ?? [];
    selectedOwnerId.value = modalOwners.value[0]?.id ?? '';
    expandedOwnerId.value = '';
    for (const owner of modalOwners.value) {
      ownerMap.value = {
        ...ownerMap.value,
        [owner.id]: owner
      };
      await ensurePatientsLoaded(owner.id);
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : 'Erro ao buscar clientes';
  } finally {
    ownersLoading.value = false;
  }
}

async function createSaleForSelectedOwner() {
  if (!selectedOwnerId.value) return;

  creatingSale.value = true;
  try {
    const sale = await counterSalesService.create({
      ownerId: selectedOwnerId.value,
      patientId:
        selectedOwnerId.value === workflowContext.ownerId
          ? workflowContext.patientId || null
          : null,
      encounterId:
        selectedOwnerId.value === workflowContext.ownerId
          ? workflowContext.encounterId || null
          : null,
      queueEntryId:
        selectedOwnerId.value === workflowContext.ownerId
          ? workflowContext.queueEntryId || null
          : null,
      notes: createSaleNotes.value || null
    });
    successMessage.value = `Comanda ${sale.number} aberta com sucesso.`;
    createModalOpen.value = false;
    await loadPage();
    await selectSale(sale.id);
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao abrir comanda';
  } finally {
    creatingSale.value = false;
  }
}

async function createOwnerAndSale() {
  if (!newOwnerDraft.fullName.trim()) {
    error.value = 'Nome completo é obrigatório para abrir a comanda.';
    return;
  }

  creatingSale.value = true;
  try {
    const contacts: CreateOwnerRequest['contacts'] = [];

    const appendContact = (contact: CreateOwnerRequest['contacts'][number]) => {
      contacts.push(contact);
    };

    if (newOwnerDraft.whatsapp) {
      appendContact({
        label: 'WhatsApp',
        value: newOwnerDraft.whatsapp,
        type: 'whatsapp',
        primary: true
      });
    }

    if (newOwnerDraft.phone) {
      appendContact({
        label: 'Telefone',
        value: newOwnerDraft.phone,
        type: 'phone'
      });
    }

    if (newOwnerDraft.email) {
      appendContact({
        label: 'E-mail',
        value: newOwnerDraft.email,
        type: 'email'
      });
    }

    const owner = await ownerService.create({
      fullName: newOwnerDraft.fullName.trim(),
      documentId: newOwnerDraft.documentId || undefined,
      contacts,
      financialResponsible: true
    });
    ownerMap.value = {
      ...ownerMap.value,
      [owner.id]: owner
    };

    const sale = await counterSalesService.create({
      ownerId: owner.id,
      notes: createSaleNotes.value || null
    });
    successMessage.value = `Cliente e comanda ${sale.number} criados com sucesso.`;
    createModalOpen.value = false;
    await loadPage();
    await selectSale(sale.id);
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao criar cliente e comanda';
  } finally {
    creatingSale.value = false;
  }
}

async function printSelectedSale() {
  if (!selectedSale.value || typeof window === 'undefined') return;

  printingSale.value = true;
  error.value = '';
  try {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=780');
    if (!printWindow) {
      throw new Error('Não foi possível abrir a janela de impressão.');
    }

    const html = buildOperationalPrintHtml(
      selectedSale.value,
      selectedOwner.value,
      selectedPatientContexts.value
    );
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    successMessage.value = `Impressão operacional preparada para a comanda ${selectedSale.value.number}.`;
  } catch (actionError) {
    error.value =
      actionError instanceof Error ? actionError.message : 'Erro ao preparar impressão da comanda';
  } finally {
    printingSale.value = false;
  }
}

function buildOperationalPrintHtml(
  sale: CounterSaleDetail,
  owner: OwnerSummary | null,
  patientContexts: readonly SelectedPatientContext[]
) {
  const ownerContact = owner
    ? (owner.contacts.find((contact) => contact.primary) ?? owner.contacts[0] ?? null)
    : null;
  const patientLines = patientContexts
    .map((context) => {
      const encounterLabel = context.encounter
        ? `${encounterStatusLabel(context.encounter.status)} (${context.encounter.id})`
        : 'Sem atendimento ativo';
      const recordLabel = context.medicalRecord
        ? `${context.medicalRecord.entryCount} entrada(s)`
        : 'Sem prontuário carregado';
      return `
        <tr>
          <td>${escapeHtml(context.patient.name)}</td>
          <td>${escapeHtml(context.patient.species)}${context.patient.breed ? ` · ${escapeHtml(context.patient.breed)}` : ''}</td>
          <td>${escapeHtml(encounterLabel)}</td>
          <td>${escapeHtml(recordLabel)}</td>
        </tr>
      `;
    })
    .join('');

  const itemLines = sale.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.nameSnapshot)}</td>
          <td>${escapeHtml(item.itemType === 'product' ? 'Produto' : 'Serviço')}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.unitPrice)}</td>
          <td>${formatCurrency(item.discountAmount)}</td>
          <td>${formatCurrency(item.lineTotal)}</td>
        </tr>
      `
    )
    .join('');

  const paymentLines = sale.payments
    .map(
      (payment) => `
        <tr>
          <td>${escapeHtml(paymentMethodLabel(payment.method))}</td>
          <td>${payment.installments}x</td>
          <td>${escapeHtml(payment.reference ?? '—')}</td>
          <td>${formatCurrency(payment.amount)}</td>
          <td>${escapeHtml(formatDateTime(payment.createdAt))}</td>
        </tr>
      `
    )
    .join('');

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>Impressão operacional ${escapeHtml(sale.number)}</title>
      <style>
        body { font-family: "Segoe UI", sans-serif; color: #0f172a; margin: 24px; }
        h1, h2, h3 { margin: 0; }
        .header, .block { margin-bottom: 24px; }
        .header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
        .headline { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
        .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
        .metric { border: 1px solid #d7dee8; border-radius: 14px; padding: 12px; background: #f8fafc; }
        .metric strong { display: block; margin-top: 6px; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 10px 8px; font-size: 13px; }
        th { color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.08em; }
        .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #e2e8f0; font-size: 12px; font-weight: 700; }
        .note { margin-top: 12px; color: #475569; font-size: 13px; }
        @media print {
          body { margin: 12px; }
        }
      </style>
    </head>
    <body>
      <section class="header">
        <div>
          <div class="headline">Comandas premium enterprise</div>
          <h1>${escapeHtml(sale.number)}</h1>
          <p class="note">Impressão operacional gerada em ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
        </div>
        <div>
          <div class="badge">${escapeHtml(statusLabel(sale.status))}</div>
          <p class="note">Abertura ${escapeHtml(formatDateTime(sale.createdAt))}</p>
        </div>
      </section>

      <section class="block">
        <div class="headline">Cliente e contexto</div>
        <h2>${escapeHtml(owner?.fullName ?? 'Comanda sem tutor')}</h2>
        <p class="note">
          ${escapeHtml(ownerContact ? formatOwnerContact(ownerContact, 'Sem contato principal') : 'Sem contato principal')}
          · ID ${escapeHtml(sale.id)}
        </p>
        <div class="grid">
          <div class="metric"><span>Subtotal</span><strong>${formatCurrency(sale.subtotal)}</strong></div>
          <div class="metric"><span>Desconto</span><strong>${formatCurrency(sale.discountAmount)}</strong></div>
          <div class="metric"><span>Pago</span><strong>${formatCurrency(sale.paidAmount)}</strong></div>
          <div class="metric"><span>Saldo</span><strong>${formatCurrency(sale.balanceDue)}</strong></div>
        </div>
      </section>

      <section class="block">
        <div class="headline">Vínculo assistencial por animal</div>
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Espécie</th>
              <th>Atendimento</th>
              <th>Prontuário</th>
            </tr>
          </thead>
          <tbody>${patientLines || '<tr><td colspan="4">Sem animais vinculados.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="block">
        <div class="headline">Itens da comanda</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Tipo</th>
              <th>Qtd</th>
              <th>Unitário</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${itemLines || '<tr><td colspan="6">Sem itens lançados.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="block">
        <div class="headline">Pagamentos</div>
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th>Parcelas</th>
              <th>Referência</th>
              <th>Valor</th>
              <th>Momento</th>
            </tr>
          </thead>
          <tbody>${paymentLines || '<tr><td colspan="5">Sem pagamentos lançados.</td></tr>'}</tbody>
        </table>
      </section>

      ${sale.notes ? `<p class="note"><strong>Observação:</strong> ${escapeHtml(sale.notes)}</p>` : ''}
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function encounterStatusLabel(status: EncounterSummary['status']): string {
  return {
    reception: 'Na recepção',
    in_triage: 'Em triagem',
    in_care: 'Em atendimento',
    observation: 'Em observação',
    closed: 'Encerrado'
  }[status];
}

function statusLabel(status: CounterSaleStatus): string {
  return {
    open: 'Aberta',
    closed: 'Fechada',
    cancelled: 'Cancelada'
  }[status];
}

function statusBadgeVariant(status: CounterSaleStatus): 'warning' | 'success' | 'danger' {
  if (status === 'open') return 'warning';
  if (status === 'closed') return 'success';
  return 'danger';
}

function paymentMethodLabel(method: CounterSalePaymentMethod | string): string {
  return (
    {
      cash: 'Dinheiro',
      credit_card: 'Cartão crédito',
      debit_card: 'Cartão débito',
      pix: 'PIX',
      bank_transfer: 'Transferência',
      check: 'Cheque',
      insurance: 'Convênio',
      other: 'Outro'
    }[method as CounterSalePaymentMethod] ?? method
  );
}

function paymentMethodShare(total: number): string {
  if (paymentMixTotal.value <= 0) return '0%';
  return formatPercent((total / paymentMixTotal.value) * 100);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function normalizeCatalogCode(value: string) {
  return value.trim().toLowerCase();
}

function readWorkflowContext() {
  if (typeof window === 'undefined') {
    return { encounterId: '', patientId: '', ownerId: '', queueEntryId: '' };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    encounterId: params.get('encounterId')?.trim() || '',
    patientId: params.get('patientId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || '',
    queueEntryId: params.get('queueEntryId')?.trim() || ''
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value));
}
</script>

<style scoped>
.counter-sales-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.counter-sales-alerts,
.counter-sales-actions,
.counter-sales-toolbar,
.counter-sales-report {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.counter-sales-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px 180px 180px max-content;
  gap: 12px;
}

.counter-sales-report__summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  font-weight: 700;
}

.counter-sales-report__summary small {
  color: var(--color-text-muted, #64748b);
  font-weight: 500;
}

.counter-sales-toolbar__actions {
  display: flex;
  align-items: end;
}

.counter-sales-context {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #bfdbfe;
  border-left: 4px solid #2563eb;
  border-radius: 8px;
  background: #eff6ff;
}

.counter-sales-context__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.counter-sales-context h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
}

.counter-sales-context p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
}

.counter-sales-context__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.report-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px)) max-content;
  gap: 12px;
  align-items: end;
}

.executive-report,
.risk-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.executive-report__grid,
.leaderboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.report-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(215, 222, 232, 0.85);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(244, 248, 252, 0.96)),
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.08), transparent 38%);
}

.report-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.report-panel__header h3 {
  margin: 4px 0 0;
}

.report-panel__hint,
.rank-list__meta,
.summary-card__hint,
.counter-sales-empty {
  color: var(--color-text-muted, #64748b);
}

.leaderboard-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-block__title {
  font-size: 13px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-list__item,
.inline-alert {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.alert-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.inline-alert {
  align-items: flex-start;
  flex-direction: column;
}

.counter-sales-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.quote-card,
.modal-owner-card {
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
.modal-owner-card__header,
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
.modal-owner-card__meta,
.sidebar-owner__meta,
.patient-context-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.sidebar-summary__grid,
.summary-grid,
.item-total-grid,
.patient-context-grid,
.create-sale-modal__new-grid {
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

.catalog-toolbar,
.create-sale-modal__search {
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
.payment-form,
.create-sale-modal,
.cancel-sale-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cancel-sale-modal__description,
.cancel-sale-modal__hint {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
}

.cancel-sale-modal__hint {
  font-size: 12px;
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

.create-sale-modal__tabs {
  display: inline-flex;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: var(--color-bg-subtle, #eef2f7);
}

.create-sale-modal__tab {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: transparent;
  font-weight: 700;
  cursor: pointer;
}

.create-sale-modal__tab--active {
  background: #ffffff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.modal-owner-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.modal-owner-card {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-owner-card__actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-start;
}

.modal-owner-card__details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.detail-pill {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.modal-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
}

.modal-owner-card--selected {
  border-color: rgba(15, 118, 110, 0.5);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
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
  .counter-sales-toolbar,
  .catalog-toolbar,
  .barcode-toolbar,
  .create-sale-modal__search,
  .report-toolbar {
    grid-template-columns: 1fr;
  }

  .service-patient-card,
  .counter-sales-context,
  .command-bottom-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .service-patient-card__actions {
    justify-content: flex-start;
  }

  .counter-sales-context__actions {
    justify-content: flex-start;
  }
}
</style>

<style>
:root[data-theme='dark'] .counter-sales-page .counter-sales-report__summary,
:root[data-theme='dark'] .counter-sales-page .report-panel,
:root[data-theme='dark'] .counter-sales-page .counter-sale-card,
:root[data-theme='dark'] .counter-sales-page .catalog-card,
:root[data-theme='dark'] .counter-sales-page .line-item-card,
:root[data-theme='dark'] .counter-sales-page .patient-context-card,
:root[data-theme='dark'] .counter-sales-page .payment-card,
:root[data-theme='dark'] .counter-sales-page .quote-card,
:root[data-theme='dark'] .counter-sales-page .modal-owner-card {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

:root[data-theme='dark'] .counter-sales-page .counter-sales-report__summary:hover,
:root[data-theme='dark'] .counter-sales-page .counter-sale-card:hover,
:root[data-theme='dark'] .counter-sales-page .catalog-card:hover,
:root[data-theme='dark'] .counter-sales-page .line-item-card:hover,
:root[data-theme='dark'] .counter-sales-page .patient-context-card:hover,
:root[data-theme='dark'] .counter-sales-page .payment-card:hover,
:root[data-theme='dark'] .counter-sales-page .quote-card:hover,
:root[data-theme='dark'] .counter-sales-page .modal-owner-card:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-hover);
}

:root[data-theme='dark'] .counter-sales-page .counter-sales-report__summary,
:root[data-theme='dark'] .counter-sales-page .counter-sales-context,
:root[data-theme='dark'] .counter-sales-page .service-patient-card,
:root[data-theme='dark'] .counter-sales-page .journey-pill,
:root[data-theme='dark'] .counter-sales-page .detail-pill,
:root[data-theme='dark'] .counter-sales-page .counter-sale-card__details,
:root[data-theme='dark'] .counter-sales-page .sidebar-contact,
:root[data-theme='dark'] .counter-sales-page .summary-card {
  border-color: var(--color-border);
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

:root[data-theme='dark'] .counter-sales-page .counter-sales-context {
  border-color: var(--color-primary-200);
  border-left-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

:root[data-theme='dark'] .counter-sales-page .counter-sales-context__eyebrow {
  color: var(--color-text-link);
}

:root[data-theme='dark'] .counter-sales-page .counter-sales-context h2,
:root[data-theme='dark'] .counter-sales-page .counter-sales-context p,
:root[data-theme='dark'] .counter-sales-page .counter-sale-card__field strong,
:root[data-theme='dark'] .counter-sales-page .barcode-match,
:root[data-theme='dark'] .counter-sales-page .timeline-card span {
  color: var(--color-text);
}

:root[data-theme='dark'] .counter-sales-page .rank-list__item,
:root[data-theme='dark'] .counter-sales-page .inline-alert {
  border-color: var(--color-border);
  background: var(--color-bg-subtle);
  color: var(--color-text);
}

:root[data-theme='dark'] .counter-sales-page .counter-sale-card--selected,
:root[data-theme='dark'] .counter-sales-page .modal-owner-card--selected {
  border-color: var(--color-warning-400);
  box-shadow: var(--shadow-md);
}

:root[data-theme='dark'] .counter-sales-page .barcode-match {
  border-color: var(--color-success-300);
  background: var(--color-success-50);
}

:root[data-theme='dark'] .counter-sales-page .timeline-card {
  border-left-color: var(--color-info-400);
  background: var(--color-info-50);
}

:root[data-theme='dark'] .counter-sales-page .timeline-card--cancellation {
  border-left-color: var(--color-danger-400);
  background: var(--color-danger-50);
}

:root[data-theme='dark'] .counter-sales-page .create-sale-modal__tabs {
  background: var(--color-bg-subtle);
}

:root[data-theme='dark'] .counter-sales-page .create-sale-modal__tab {
  color: var(--color-text-secondary);
}

:root[data-theme='dark'] .counter-sales-page .create-sale-modal__tab--active {
  background: var(--color-surface-hover);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

:root[data-theme='dark'] .counter-sales-page .command-bottom-actions {
  border-top-color: var(--color-border);
}
</style>

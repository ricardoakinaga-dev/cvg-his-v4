import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import type { CounterSaleDetail } from '@/services/counterSales';
import CounterSalesWorkbench from '../CounterSalesWorkbench.vue';

const sale: CounterSaleDetail = {
  id: 'sale-1',
  accountId: 'account-1',
  number: 'CS-000001',
  ownerId: null,
  patientId: null,
  encounterId: null,
  queueEntryId: null,
  billingRecordId: null,
  status: 'open',
  subtotal: 120,
  discountAmount: 0,
  total: 120,
  paidAmount: 0,
  balanceDue: 120,
  notes: 'Atendimento de balcão',
  openedByUserId: 'user-1',
  closedByUserId: null,
  closedAt: null,
  createdAt: '2026-09-22T10:00:00Z',
  updatedAt: '2026-09-22T10:00:00Z',
  items: [],
  payments: [],
  receipt: null,
  cancellationHistory: []
};

const catalogOption = {
  id: 'product-1',
  type: 'product' as const,
  name: 'Produto Sintético',
  code: 'SKU-1',
  description: 'Produto de teste',
  basePrice: 120,
  onHandQuantity: 5
};

const baseProps = {
  sale,
  owner: null,
  patientContexts: [],
  ownerQuotes: [],
  visibleCatalogOptions: [catalogOption],
  barcodeMatchedOption: catalogOption,
  timelineItems: [],
  cancellationHistory: [],
  catalogForm: { search: '', itemType: 'all' as const, quantity: 1, discountAmount: 0 },
  barcodeForm: { code: '', quantity: 1 },
  paymentForm: {
    method: 'pix' as const,
    amount: 120,
    installments: 1,
    reference: '',
    notes: ''
  },
  canEdit: true,
  selectedProductsTotal: 0,
  selectedServicesTotal: 0,
  notesLength: sale.notes?.length ?? 0,
  savingItem: false,
  savingPayment: false,
  transitioningSale: false,
  printingSale: false,
  formatCurrency: (value: number) => `R$ ${value.toFixed(2)}`,
  formatDateTime: () => '22/09/2026 10:00',
  statusLabel: () => 'Aberta',
  statusBadgeVariant: () => 'warning' as const,
  paymentMethodLabel: () => 'PIX',
  ownerPrimaryContactLabel: () => 'Sem contato',
  ownerContactsSummary: () => 'Sem contatos',
  openedByLabel: () => 'Operador user-1',
  accountLabel: () => 'Empresa account-1',
  encounterBadgeLabel: () => 'Sem atendimento',
  medicalRecordBadgeLabel: () => 'Sem prontuário',
  patientEncounterSubtitle: () => 'Nenhum episódio clínico aberto',
  patientMedicalRecordSubtitle: () => 'Abrirá junto com o atendimento',
  patientEncounterLink: () => '/encounters/new',
  patientEncounterActionLabel: () => 'Abrir atendimento',
  patientMedicalRecordLink: () => '/encounters/new',
  patientMedicalRecordActionLabel: () => 'Abrir prontuário'
};

describe('CounterSalesWorkbench', () => {
  it('keeps the selected sale presentation-bound and emits workflow intents', async () => {
    const wrapper = mount(CounterSalesWorkbench, { props: baseProps });

    expect(wrapper.text()).toContain('CS-000001');
    expect(wrapper.text()).toContain('Atendimento de balcão');
    expect(wrapper.text()).toContain('Produto Sintético');

    const addCatalogButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Adicionar na comanda'));
    expect(addCatalogButton).toBeTruthy();
    await addCatalogButton!.trigger('click');
    expect(wrapper.emitted('add-catalog-option')).toEqual([[catalogOption]]);

    const paymentButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Registrar pagamento'));
    expect(paymentButton).toBeTruthy();
    await paymentButton!.trigger('click');
    expect(wrapper.emitted('submit-payment')).toEqual([[]]);

    const backButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Voltar para Comandas'));
    await backButton!.trigger('click');
    expect(wrapper.emitted('clear-selection')).toEqual([[]]);
  });

  it('renders an empty operational history without inventing state', () => {
    const wrapper = mount(CounterSalesWorkbench, {
      props: { ...baseProps, visibleCatalogOptions: [] }
    });

    expect(wrapper.text()).toContain('Nenhum item de catálogo encontrado');
    expect(wrapper.text()).toContain('Nenhum registro de esteira');
    expect(wrapper.text()).toContain('Nenhum pagamento registrado');
  });
});

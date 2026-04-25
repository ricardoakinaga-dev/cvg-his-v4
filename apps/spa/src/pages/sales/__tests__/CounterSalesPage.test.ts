import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockCounterSalesList = vi.fn();
const mockCounterSalesGetById = vi.fn();
const mockCounterSalesCreate = vi.fn();
const mockCounterSalesAddItem = vi.fn();
const mockCounterSalesUpdateItem = vi.fn();
const mockCounterSalesRemoveItem = vi.fn();
const mockCounterSalesAddPayment = vi.fn();
const mockCounterSalesClose = vi.fn();
const mockCounterSalesCancel = vi.fn();
const mockCounterSalesReopen = vi.fn();
const mockCounterSalesCommercialDashboard = vi.fn();

const mockOwnerGetById = vi.fn();
const mockOwnerListPage = vi.fn();
const mockOwnerCreate = vi.fn();
const mockPatientListPage = vi.fn();
const mockProductsList = vi.fn();
const mockServicesList = vi.fn();
const mockInventoryList = vi.fn();
const mockQuotesList = vi.fn();
const mockQuoteConvert = vi.fn();
const mockEncounterList = vi.fn();
const mockMedicalRecordsListAll = vi.fn();

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    list: (...args: unknown[]) => mockCounterSalesList(...args),
    getById: (...args: unknown[]) => mockCounterSalesGetById(...args),
    getCommercialDashboard: (...args: unknown[]) => mockCounterSalesCommercialDashboard(...args),
    create: (...args: unknown[]) => mockCounterSalesCreate(...args),
    addItem: (...args: unknown[]) => mockCounterSalesAddItem(...args),
    updateItem: (...args: unknown[]) => mockCounterSalesUpdateItem(...args),
    removeItem: (...args: unknown[]) => mockCounterSalesRemoveItem(...args),
    addPayment: (...args: unknown[]) => mockCounterSalesAddPayment(...args),
    close: (...args: unknown[]) => mockCounterSalesClose(...args),
    cancel: (...args: unknown[]) => mockCounterSalesCancel(...args),
    reopen: (...args: unknown[]) => mockCounterSalesReopen(...args)
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    getById: (...args: unknown[]) => mockOwnerGetById(...args),
    listPage: (...args: unknown[]) => mockOwnerListPage(...args),
    create: (...args: unknown[]) => mockOwnerCreate(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    listPage: (...args: unknown[]) => mockPatientListPage(...args)
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: (...args: unknown[]) => mockProductsList(...args)
  }
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    list: (...args: unknown[]) => mockServicesList(...args)
  }
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: (...args: unknown[]) => mockInventoryList(...args)
  }
}));

vi.mock('@/services/quotes', () => ({
  quoteService: {
    list: (...args: unknown[]) => mockQuotesList(...args),
    convertToSale: (...args: unknown[]) => mockQuoteConvert(...args)
  }
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    list: (...args: unknown[]) => mockEncounterList(...args)
  }
}));

vi.mock('@/services/medicalRecords', () => ({
  medicalRecordsService: {
    listAll: (...args: unknown[]) => mockMedicalRecordsListAll(...args)
  }
}));

const saleSummary = {
  id: 'cs-1',
  accountId: 'acc-1',
  number: 'CS-000001',
  ownerId: 'owner-1',
  status: 'open',
  subtotal: 150,
  discountAmount: 0,
  total: 150,
  paidAmount: 50,
  balanceDue: 100,
  notes: 'Balcão recepção',
  openedByUserId: 'user-1',
  closedByUserId: null,
  closedAt: null,
  createdAt: '2026-04-15T10:00:00Z',
  updatedAt: '2026-04-15T10:00:00Z'
};

const saleDetail = {
  ...saleSummary,
  items: [
    {
      id: 'item-1',
      counterSaleId: 'cs-1',
      accountId: 'acc-1',
      itemType: 'service',
      catalogItemId: 'svc-1',
      nameSnapshot: 'Consulta clínica',
      codeSnapshot: 'CONS-1',
      unitPrice: 150,
      quantity: 1,
      discountAmount: 0,
      lineTotal: 150,
      notes: null,
      createdAt: '2026-04-15T10:00:00Z',
      updatedAt: '2026-04-15T10:00:00Z'
    }
  ],
  payments: [
    {
      id: 'pay-1',
      counterSaleId: 'cs-1',
      accountId: 'acc-1',
      method: 'pix',
      amount: 50,
      installments: 1,
      reference: 'PIX-001',
      notes: null,
      createdAt: '2026-04-15T10:10:00Z'
    }
  ]
};

describe('CounterSalesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(
      () =>
        ({
          document: {
            open: vi.fn(),
            write: vi.fn(),
            close: vi.fn()
          },
          focus: vi.fn(),
          print: vi.fn()
        }) as never
    );

    mockCounterSalesList.mockResolvedValue([saleSummary]);
    mockCounterSalesGetById.mockResolvedValue(saleDetail);
    mockCounterSalesCommercialDashboard.mockResolvedValue({
      openSales: 1,
      closedToday: 2,
      grossRevenueToday: 450,
      netRevenueToday: 420,
      avgTicket: 210,
      salesByPaymentMethod: [{ method: 'pix', total: 220 }],
      topProducts: [{ name: 'Antipulgas', quantity: 3, revenue: 240 }],
      topServices: [{ name: 'Consulta clínica', quantity: 2, revenue: 300 }],
      quotesIssued: 1,
      quotesConverted: 1,
      lowStockAlerts: [{ name: 'Antipulgas', code: 'SKU-123', onHand: 3, reorderLevel: 5 }]
    });
    mockCounterSalesCreate.mockResolvedValue({
      ...saleSummary,
      id: 'cs-2',
      number: 'CS-000002',
      paidAmount: 0,
      balanceDue: 0,
      subtotal: 0,
      total: 0
    });
    mockCounterSalesAddItem.mockResolvedValue({
      id: 'item-2',
      counterSaleId: 'cs-1',
      accountId: 'acc-1',
      itemType: 'product',
      catalogItemId: 'prod-1',
      nameSnapshot: 'Antipulgas',
      codeSnapshot: 'SKU-123',
      unitPrice: 80,
      quantity: 1,
      discountAmount: 0,
      lineTotal: 80,
      notes: null,
      createdAt: '2026-04-15T10:11:00Z',
      updatedAt: '2026-04-15T10:11:00Z'
    });
    mockCounterSalesUpdateItem.mockResolvedValue(saleDetail.items[0]);
    mockCounterSalesRemoveItem.mockResolvedValue(undefined);
    mockCounterSalesAddPayment.mockResolvedValue({
      id: 'pay-2',
      counterSaleId: 'cs-1',
      accountId: 'acc-1',
      method: 'cash',
      amount: 100,
      installments: 1,
      reference: 'CX-1',
      notes: null,
      createdAt: '2026-04-15T10:12:00Z'
    });
    mockCounterSalesClose.mockResolvedValue({ ...saleSummary, status: 'closed', balanceDue: 0 });
    mockCounterSalesCancel.mockResolvedValue({ ...saleSummary, status: 'cancelled' });
    mockCounterSalesReopen.mockResolvedValue({ ...saleSummary, status: 'open' });

    mockOwnerGetById.mockResolvedValue({
      id: 'owner-1',
      accountId: 'acc-1',
      fullName: 'Maria Costa',
      documentId: '123.456.789-00',
      contacts: [{ label: 'WhatsApp', value: '(11) 99999-9999', type: 'whatsapp', primary: true }],
      financialResponsible: true,
      administrativeNotes: 'VIP',
      status: 'active',
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z'
    });
    mockOwnerListPage.mockResolvedValue({
      items: [
        {
          id: 'owner-1',
          accountId: 'acc-1',
          fullName: 'Maria Costa',
          documentId: '123.456.789-00',
          contacts: [{ label: 'WhatsApp', value: '(11) 99999-9999', type: 'whatsapp', primary: true }],
          financialResponsible: true,
          administrativeNotes: null,
          status: 'active',
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z'
        }
      ],
      totalPages: 3
    });
    mockOwnerCreate.mockResolvedValue({
      id: 'owner-2',
      accountId: 'acc-1',
      fullName: 'Novo Cliente',
      documentId: '',
      contacts: [],
      financialResponsible: true,
      administrativeNotes: null,
      status: 'active',
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z'
    });

    mockPatientListPage.mockResolvedValue({
      items: [
        {
          id: 'pat-1',
          accountId: 'acc-1',
          name: 'Thor',
          species: 'Canino',
          breed: 'Labrador',
          sex: 'male',
          size: 'large',
          baseWeightKg: 28,
          birthDateApproximate: '2020-01-01',
          primaryOwnerId: 'owner-1',
          status: 'active',
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z'
        }
      ],
      totalPages: 1
    });

    mockProductsList.mockResolvedValue([
      {
        id: 'prod-1',
        accountId: 'acc-1',
        name: 'Antipulgas',
        code: 'SKU-123',
        description: 'Dose única',
        basePrice: 80,
        active: true,
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z'
      }
    ]);
    mockServicesList.mockResolvedValue([
      {
        id: 'svc-1',
        accountId: 'acc-1',
        name: 'Banho terapêutico',
        code: 'SERV-10',
        description: 'Tratamento dermatológico',
        basePrice: 120,
        active: true,
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z'
      }
    ]);
    mockInventoryList.mockResolvedValue([
      {
        id: 'inv-1',
        accountId: 'acc-1',
        sku: 'SKU-123',
        name: 'Antipulgas',
        unit: 'un',
        onHandQuantity: 3,
        reorderLevel: 2,
        unitCostAmount: 30,
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z'
      }
    ]);
    mockQuotesList.mockResolvedValue([
      {
        id: 'qt-1',
        accountId: 'acc-1',
        number: 'QT-0001',
        ownerId: 'owner-1',
        status: 'approved',
        validUntil: '2026-04-30',
        subtotal: 80,
        discountAmount: 0,
        total: 80,
        notes: null,
        createdByUserId: 'user-1',
        convertedToSaleId: null,
        convertedAt: null,
        createdAt: '2026-04-15T09:00:00Z',
        updatedAt: '2026-04-15T09:00:00Z'
      }
    ]);
    mockQuoteConvert.mockResolvedValue({ counterSaleId: 'cs-9', quoteId: 'qt-1' });
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'owner-1',
        visitType: 'walk_in',
        status: 'in_care',
        origin: 'reception',
        reason: 'Dor abdominal',
        openedAt: '2026-04-15T09:30:00Z',
        createdByUserId: 'user-1',
        updatedAt: '2026-04-15T10:30:00Z'
      }
    ]);
    mockMedicalRecordsListAll.mockResolvedValue([
      {
        record: {
          id: 'mr-1',
          accountId: 'acc-1',
          encounterId: 'enc-1',
          patientId: 'pat-1',
          status: 'open',
          createdAt: '2026-04-15T09:30:00Z',
          updatedAt: '2026-04-15T10:35:00Z'
        },
        entryCount: 3
      }
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('carrega o workbench premium e adiciona item e pagamento', async () => {
    const CounterSalesPage = (await import('../CounterSalesPage.vue')).default;
    const wrapper = mount(CounterSalesPage, { attachTo: document.body });

    await flushPromises();

    expect(wrapper.text()).toContain('Comandas');
    expect(wrapper.text()).toContain('Maria Costa');
    expect(wrapper.text()).toContain('Thor');
    expect(wrapper.text()).toContain('Consulta clínica');
    expect(wrapper.text()).toContain('ID da Comanda:');
    expect(wrapper.text()).toContain('Abertura:');
    expect(wrapper.text()).toContain('Fechamento:');
    expect(wrapper.text()).toContain('Cliente:');
    expect(wrapper.text()).toContain('Valor Total:');
    expect(wrapper.text()).toContain('Detalhes da Comanda');
    expect(wrapper.text()).toContain('Relatório executivo próprio');
    expect(wrapper.text()).toContain('Prontuário ativo');
    expect(wrapper.text()).toContain('Em atendimento');
    expect(wrapper.text()).toContain('Informações do cliente');
    expect(wrapper.text()).toContain('Serviços / Produtos');
    expect(wrapper.text()).toContain('Serviços');
    expect(wrapper.text()).toContain('Ver Detalhes do Animal');
    expect(wrapper.text()).toContain('Incluir Serviços');
    expect(wrapper.text()).toContain('Animais Vinculados na Comanda');
    expect(wrapper.text()).toContain('Observações Gerais');
    expect(wrapper.text()).toContain('Histórico de Esteira');
    expect(wrapper.text()).toContain('Resumo da Conta');
    expect(wrapper.text()).toContain('Ver Informações de Contato');
    expect(wrapper.text()).toContain('Incluir Despesa Extra');
    expect(wrapper.text()).toContain('Incluir Desconto');
    expect(wrapper.text()).toContain('Encaminhar Esteira');
    expect(wrapper.text()).toContain('Voltar para Comandas');
    expect(wrapper.text()).toContain('Imprimir');
    expect(wrapper.find('input[placeholder="Buscar por Nome, CPF, E-mail ou ID"]').exists()).toBe(true);

    const addItemButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Adicionar na comanda'));
    expect(addItemButton).toBeTruthy();
    await addItemButton!.trigger('click');
    await flushPromises();

    expect(mockCounterSalesAddItem).toHaveBeenCalledWith(
      'cs-1',
      expect.objectContaining({
        itemType: 'product',
        nameSnapshot: 'Antipulgas'
      })
    );

    const paymentButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Registrar pagamento'));
    expect(paymentButton).toBeTruthy();
    await paymentButton!.trigger('click');
    await flushPromises();

    expect(mockCounterSalesAddPayment).toHaveBeenCalledWith(
      'cs-1',
      expect.objectContaining({
        amount: 100
      })
    );
  });

  it('lança despesa extra e desconto pelo resumo da conta', async () => {
    const CounterSalesPage = (await import('../CounterSalesPage.vue')).default;
    const wrapper = mount(CounterSalesPage, { attachTo: document.body });

    await flushPromises();

    const expenseButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Incluir Despesa Extra'));
    expect(expenseButton).toBeTruthy();
    await expenseButton!.trigger('click');
    await flushPromises();

    expect(mockCounterSalesAddItem).toHaveBeenCalledWith(
      'cs-1',
      expect.objectContaining({
        nameSnapshot: 'Despesa extra',
        unitPrice: 10
      })
    );

    const discountButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Incluir Desconto'));
    expect(discountButton).toBeTruthy();
    await discountButton!.trigger('click');
    await flushPromises();

    expect(mockCounterSalesAddItem).toHaveBeenCalledWith(
      'cs-1',
      expect.objectContaining({
        nameSnapshot: 'Desconto operacional',
        discountAmount: 10
      })
    );
  });

  it('prepara impressão operacional da comanda selecionada', async () => {
    const CounterSalesPage = (await import('../CounterSalesPage.vue')).default;
    const wrapper = mount(CounterSalesPage, { attachTo: document.body });

    await flushPromises();

    const printButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Impressão operacional'));
    expect(printButton).toBeTruthy();
    await printButton!.trigger('click');
    await flushPromises();

    expect(window.open).toHaveBeenCalled();
  });

  it('lança item por código de barras no workbench', async () => {
    const CounterSalesPage = (await import('../CounterSalesPage.vue')).default;
    const wrapper = mount(CounterSalesPage, { attachTo: document.body });

    await flushPromises();

    const barcodeInput = wrapper.find('input[placeholder="Bipar ou digitar código de barras"]');
    expect(barcodeInput.exists()).toBe(true);
    await barcodeInput.setValue('SKU-123');

    const barcodeButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Adicionar Produtos'));
    expect(barcodeButton).toBeTruthy();
    await barcodeButton!.trigger('click');
    await flushPromises();

    expect(mockCounterSalesAddItem).toHaveBeenCalledWith(
      'cs-1',
      expect.objectContaining({
        itemType: 'product',
        codeSnapshot: 'SKU-123',
        notes: 'Lançado por código de barras'
      })
    );
  });

  it('abre modal e cria nova comanda para cliente cadastrado', async () => {
    const CounterSalesPage = (await import('../CounterSalesPage.vue')).default;
    const wrapper = mount(CounterSalesPage, { attachTo: document.body });

    await flushPromises();

    const openModalButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Abrir Nova Comanda'));
    expect(openModalButton).toBeTruthy();
    await openModalButton!.trigger('click');
    await flushPromises();

    const createButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Criar comanda')
    );
    expect(createButton).toBeTruthy();
    createButton!.dispatchEvent(new MouseEvent('click'));
    await flushPromises();

    expect(mockCounterSalesCreate).toHaveBeenCalledWith({
      ownerId: 'owner-1',
      notes: null
    });
  });

  it('expande informações do cliente e permite paginar no modal', async () => {
    const CounterSalesPage = (await import('../CounterSalesPage.vue')).default;
    const wrapper = mount(CounterSalesPage, { attachTo: document.body });

    await flushPromises();

    const openModalButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Abrir Nova Comanda'));
    expect(openModalButton).toBeTruthy();
    await openModalButton!.trigger('click');
    await flushPromises();

    const detailsButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Ver mais informações')
    );
    expect(detailsButton).toBeTruthy();
    detailsButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(document.body.textContent).toContain('Responsável financeiro');
    expect(document.body.textContent).toContain('Página 1 de 3');

    const nextPageButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Próxima página')
    );
    expect(nextPageButton).toBeTruthy();
    nextPageButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();

    expect(mockOwnerListPage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 8,
        status: 'active'
      })
    );
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockOwnerList = vi.fn();
const mockPatientList = vi.fn();
const mockProductList = vi.fn();
const mockCounterSalesList = vi.fn();
const mockLaboratoryListOrders = vi.fn();
const mockVaccinesDewormersList = vi.fn();
const mockBillingList = vi.fn();

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: (...args: unknown[]) => mockOwnerList(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: (...args: unknown[]) => mockPatientList(...args)
  }
}));

vi.mock('@/services/products', () => ({
  productsService: {
    list: (...args: unknown[]) => mockProductList(...args)
  }
}));

vi.mock('@/services/counterSales', () => ({
  counterSalesService: {
    list: (...args: unknown[]) => mockCounterSalesList(...args)
  }
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    listOrders: (...args: unknown[]) => mockLaboratoryListOrders(...args)
  }
}));

vi.mock('@/services/vaccinesDewormers', () => ({
  vaccinesDewormersService: {
    list: (...args: unknown[]) => mockVaccinesDewormersList(...args)
  }
}));

vi.mock('@/services/billing', () => ({
  billingService: {
    list: (...args: unknown[]) => mockBillingList(...args)
  }
}));

const allOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Maria Souza',
    documentId: '12345678900',
    contacts: [{ type: 'phone', value: '11999999999' }],
    financialResponsible: true,
    status: 'active'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'João Pereira',
    documentId: '98765432100',
    contacts: [{ type: 'email', value: 'joao@example.com' }],
    financialResponsible: false,
    status: 'inactive'
  }
];

const allPatients = [
  {
    id: 'patient-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'Canino',
    sex: 'male',
    chronicDisease: 'Doença renal crônica',
    allergy: 'Dipirona',
    primaryOwnerId: 'owner-1',
    createdAt: '2026-04-10T00:00:00Z'
  },
  {
    id: 'patient-2',
    accountId: 'acc-1',
    name: 'Luna',
    species: 'Felino',
    sex: 'female',
    primaryOwnerId: 'owner-2',
    createdAt: '2026-04-11T00:00:00Z'
  }
];

const ownersSearchResult = [allOwners[0]];
const patientsSearchResult = [allPatients[0]];
const laboratorySearchContext = [
  {
    id: 'lab-order-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    encounterId: 'encounter-1',
    requestedBy: 'vet-1',
    examType: 'HEM',
    code: 'HEM-001',
    description: 'Hemograma',
    status: 'requested',
    requestedAt: '2026-05-01T10:00:00Z',
    collectedAt: null,
    resultRecordedAt: null,
    resultSummary: null,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  }
];
const preventiveSearchContext = [
  {
    id: 'preventive-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    clientName: 'Maria Souza',
    animalName: 'Rex',
    eventDate: '2026-04-01',
    itemType: 'vaccine',
    description: 'V10',
    status: 'scheduled',
    observation: null,
    executedAt: null,
    executedObservation: null,
    rescheduledFromId: null,
    reminderEmailPreparedAt: null,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  }
];
const billingSearchContext = [
  {
    id: 'billing-1',
    accountId: 'acc-1',
    encounterId: 'encounter-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    status: 'open',
    subtotalAmount: 180,
    currency: 'BRL',
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  }
];
const productsSearchResult = [
  {
    id: 'product-1',
    accountId: 'acc-1',
    name: 'Ração Premium',
    code: 'RAC-001',
    description: 'Produto para venda e estoque',
    basePrice: 149.9,
    active: true,
    createdAt: '2026-04-10T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z'
  }
];
const counterSalesSearchResult = [
  {
    id: 'sale-1',
    accountId: 'acc-1',
    number: 'CS-0001',
    ownerId: 'owner-1',
    status: 'open',
    subtotal: 180,
    discountAmount: 0,
    total: 180,
    paidAmount: 50,
    balanceDue: 130,
    notes: null,
    openedByUserId: 'user-1',
    closedByUserId: null,
    closedAt: null,
    createdAt: '2026-04-10T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z'
  }
];

describe('MasterSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockOwnerList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allOwners);
      return Promise.resolve(ownersSearchResult);
    });
    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(patientsSearchResult);
    });
    mockProductList.mockResolvedValue(productsSearchResult);
    mockCounterSalesList.mockResolvedValue(counterSalesSearchResult);
    mockLaboratoryListOrders.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-1' ? laboratorySearchContext : []
      )
    );
    mockVaccinesDewormersList.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-1' ? preventiveSearchContext : []
      )
    );
    mockBillingList.mockImplementation((filters?: { ownerId?: string }) =>
      Promise.resolve(filters?.ownerId === 'owner-1' ? billingSearchContext : [])
    );
  });

  it('keeps empty state when search query is blank', async () => {
    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Busca federada');
    expect(wrapper.text()).not.toContain('Nenhum resultado encontrado');

    const buttons = wrapper.findAll('button');
    const buscarButton = buttons.find((button) => button.text() === 'Buscar');
    expect(buscarButton).toBeTruthy();
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(mockOwnerList).toHaveBeenCalledTimes(1);
    expect(mockPatientList).toHaveBeenCalledTimes(1);
    expect(mockProductList).not.toHaveBeenCalled();
    expect(mockCounterSalesList).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('resultado(s) para');
  });

  it('renders grouped results for owners, patients and links', async () => {
    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    await searchInput.setValue('rex');

    const buttons = wrapper.findAll('button');
    const buscarButton = buttons.find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(mockOwnerList).toHaveBeenLastCalledWith('rex');
    expect(mockPatientList).toHaveBeenLastCalledWith('rex');
    expect(mockProductList).toHaveBeenLastCalledWith('rex');
    expect(mockCounterSalesList).toHaveBeenLastCalledWith({ search: 'rex', status: 'all' });
    expect(mockLaboratoryListOrders).toHaveBeenCalledWith({ patientId: 'patient-1' });
    expect(mockVaccinesDewormersList).toHaveBeenCalledWith({
      patientId: 'patient-1',
      ownerId: 'owner-1',
      includeExecuted: true
    });
    expect(mockBillingList).toHaveBeenCalledWith({ ownerId: 'owner-1' });
    expect(wrapper.text()).toContain('5 resultado(s) para "rex"');
    expect(wrapper.text()).toContain('Tutores');
    expect(wrapper.text()).toContain('Pacientes');
    expect(wrapper.text()).toContain('Vínculos');
    expect(wrapper.text()).toContain('Produtos');
    expect(wrapper.text()).toContain('Comandas');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Prioridade 360');
    expect(wrapper.text()).toContain('Exames pendentes');
    expect(wrapper.text()).toContain('Principal');
    expect(wrapper.text()).toContain('Ração Premium');
    expect(wrapper.text()).toContain('R$');
    expect(wrapper.text()).toContain('CS-0001');
    expect(wrapper.text()).toContain('Aberta');
    expect(
      wrapper
        .findAll('a')
        .some((link) => link.attributes('href') === '/patients/patient-1' && link.text().includes('Abrir cockpit'))
    ).toBe(true);
    expect(
      wrapper
        .findAll('a')
        .some((link) => link.attributes('href') === '/products/product-1' && link.text().includes('Ver produto'))
    ).toBe(true);
    expect(
      wrapper
        .findAll('a')
        .some((link) => link.attributes('href') === '/counter-sales/sale-1' && link.text().includes('Operar'))
    ).toBe(true);
  });

  it('filters patient results by enriched priority 360', async () => {
    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(allPatients);
    });
    mockLaboratoryListOrders.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(filters?.patientId === 'patient-1' ? laboratorySearchContext : [])
    );
    mockVaccinesDewormersList.mockResolvedValue([]);
    mockBillingList.mockResolvedValue([]);

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('pet');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Luna');

    const priorityButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Filtrar prioridade 360'));
    expect(priorityButton).toBeTruthy();
    await priorityButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).not.toContain('Luna');
  });

  it('sorts patient results by priority 360 severity', async () => {
    const priorityPatients = [
      {
        id: 'patient-clear',
        accountId: 'acc-1',
        name: 'Nina',
        species: 'Canino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-12T00:00:00Z'
      },
      {
        id: 'patient-financial',
        accountId: 'acc-1',
        name: 'Bento',
        species: 'Canino',
        sex: 'male',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-13T00:00:00Z'
      },
      {
        id: 'patient-preventive',
        accountId: 'acc-1',
        name: 'Maya',
        species: 'Felino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-14T00:00:00Z'
      },
      {
        id: 'patient-lab',
        accountId: 'acc-1',
        name: 'Apollo',
        species: 'Canino',
        sex: 'male',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-15T00:00:00Z'
      }
    ];

    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(priorityPatients);
    });
    mockLaboratoryListOrders.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-lab'
          ? [{ ...laboratorySearchContext[0], patientId: 'patient-lab' }]
          : []
      )
    );
    mockVaccinesDewormersList.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-preventive'
          ? [{ ...preventiveSearchContext[0], patientId: 'patient-preventive', animalName: 'Maya' }]
          : []
      )
    );
    mockBillingList.mockImplementation(() =>
      Promise.resolve([{ ...billingSearchContext[0], patientId: 'patient-financial' }])
    );

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('prioridade');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    const text = wrapper.text();
    expect(text.indexOf('Apollo')).toBeLessThan(text.indexOf('Maya'));
    expect(text.indexOf('Maya')).toBeLessThan(text.indexOf('Bento'));
    expect(text.indexOf('Bento')).toBeLessThan(text.indexOf('Nina'));
    expect(text.indexOf('Exames pendentes')).toBeLessThan(text.indexOf('Preventivo vencido'));
    expect(text.indexOf('Preventivo vencido')).toBeLessThan(text.indexOf('Pendência financeira'));
    expect(text.indexOf('Pendência financeira')).toBeLessThan(text.indexOf('Sem alerta'));
  });

  it('summarizes patient counts by priority 360 severity', async () => {
    const priorityPatients = [
      {
        id: 'patient-clear',
        accountId: 'acc-1',
        name: 'Nina',
        species: 'Canino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-12T00:00:00Z'
      },
      {
        id: 'patient-clinical',
        accountId: 'acc-1',
        name: 'Thor',
        species: 'Canino',
        sex: 'male',
        chronicDisease: 'Cardiopatia',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-13T00:00:00Z'
      },
      {
        id: 'patient-financial',
        accountId: 'acc-1',
        name: 'Bento',
        species: 'Canino',
        sex: 'male',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-14T00:00:00Z'
      },
      {
        id: 'patient-preventive',
        accountId: 'acc-1',
        name: 'Maya',
        species: 'Felino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-15T00:00:00Z'
      },
      {
        id: 'patient-lab',
        accountId: 'acc-1',
        name: 'Apollo',
        species: 'Canino',
        sex: 'male',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-16T00:00:00Z'
      }
    ];

    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(priorityPatients);
    });
    mockLaboratoryListOrders.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-lab'
          ? [{ ...laboratorySearchContext[0], patientId: 'patient-lab' }]
          : []
      )
    );
    mockVaccinesDewormersList.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-preventive'
          ? [{ ...preventiveSearchContext[0], patientId: 'patient-preventive', animalName: 'Maya' }]
          : []
      )
    );
    mockBillingList.mockImplementation(() =>
      Promise.resolve([{ ...billingSearchContext[0], patientId: 'patient-financial' }])
    );

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('prioridade');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Resumo Prioridade 360');
    expect(wrapper.text()).toContain('Exames pendentes1');
    expect(wrapper.text()).toContain('Preventivo vencido1');
    expect(wrapper.text()).toContain('Pendência financeira1');
    expect(wrapper.text()).toContain('Atenção clínica1');
    expect(wrapper.text()).toContain('Sem alerta1');
  });

  it('filters patients by clicking a priority 360 summary item', async () => {
    const priorityPatients = [
      {
        id: 'patient-clear',
        accountId: 'acc-1',
        name: 'Nina',
        species: 'Canino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-12T00:00:00Z'
      },
      {
        id: 'patient-preventive',
        accountId: 'acc-1',
        name: 'Maya',
        species: 'Felino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-15T00:00:00Z'
      },
      {
        id: 'patient-lab',
        accountId: 'acc-1',
        name: 'Apollo',
        species: 'Canino',
        sex: 'male',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-16T00:00:00Z'
      }
    ];

    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(priorityPatients);
    });
    mockLaboratoryListOrders.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-lab'
          ? [{ ...laboratorySearchContext[0], patientId: 'patient-lab' }]
          : []
      )
    );
    mockVaccinesDewormersList.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-preventive'
          ? [{ ...preventiveSearchContext[0], patientId: 'patient-preventive', animalName: 'Maya' }]
          : []
      )
    );
    mockBillingList.mockResolvedValue([]);

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('prioridade');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    const preventiveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Preventivo vencido'));
    expect(preventiveButton).toBeTruthy();
    await preventiveButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Filtro ativo: Preventivo vencido');
    expect(wrapper.text()).toContain('Maya');
    expect(wrapper.text()).not.toContain('Apollo');
    expect(wrapper.text()).not.toContain('Nina');

    const clearButton = wrapper.findAll('button').find((button) => button.text().includes('Limpar prioridade'));
    expect(clearButton).toBeTruthy();
    await clearButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Maya');
    expect(wrapper.text()).toContain('Apollo');
    expect(wrapper.text()).toContain('Nina');
  });

  it('persists selected priority 360 severity between searches', async () => {
    localStorage.setItem('cvg-his-v2:master-search:priority360-filter', 'Preventivo vencido');

    const priorityPatients = [
      {
        id: 'patient-clear',
        accountId: 'acc-1',
        name: 'Nina',
        species: 'Canino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-12T00:00:00Z'
      },
      {
        id: 'patient-preventive',
        accountId: 'acc-1',
        name: 'Maya',
        species: 'Felino',
        sex: 'female',
        primaryOwnerId: 'owner-1',
        createdAt: '2026-04-15T00:00:00Z'
      }
    ];

    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve(priorityPatients);
    });
    mockLaboratoryListOrders.mockResolvedValue([]);
    mockVaccinesDewormersList.mockImplementation((filters?: { patientId?: string }) =>
      Promise.resolve(
        filters?.patientId === 'patient-preventive'
          ? [{ ...preventiveSearchContext[0], patientId: 'patient-preventive', animalName: 'Maya' }]
          : []
      )
    );
    mockBillingList.mockResolvedValue([]);

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('prioridade');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Filtro ativo: Preventivo vencido');
    expect(wrapper.text()).toContain('Maya');
    expect(wrapper.text()).not.toContain('Nina');

    const clearButton = wrapper.findAll('button').find((button) => button.text().includes('Limpar prioridade'));
    await clearButton!.trigger('click');
    expect(localStorage.getItem('cvg-his-v2:master-search:priority360-filter')).toBeNull();
  });

  it('shows no results message when the search returns nothing', async () => {
    mockOwnerList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allOwners);
      return Promise.resolve([]);
    });
    mockPatientList.mockImplementation((query?: string) => {
      if (!query) return Promise.resolve(allPatients);
      return Promise.resolve([]);
    });
    mockProductList.mockResolvedValue([]);
    mockCounterSalesList.mockResolvedValue([]);

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('sem-match');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum resultado encontrado para "sem-match"');
  });

  it('keeps partial results visible when one search group fails', async () => {
    mockProductList.mockRejectedValueOnce(new Error('Produtos indisponíveis'));

    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    await wrapper.find('input[type="search"]').setValue('rex');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Resultado parcial: produtos não responderam');
    expect(wrapper.text()).toContain('Maria Souza');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('CS-0001');
    expect(wrapper.text()).not.toContain('Ração Premium');
    expect(wrapper.text()).toContain('4 resultado(s) para "rex"');
  });

  it('clears query and aggregated results', async () => {
    const MasterSearchPage = (await import('../MasterSearchPage.vue')).default;
    const wrapper = mount(MasterSearchPage);

    await flushPromises();
    const searchInput = wrapper.find('input[type="search"]');
    await searchInput.setValue('rex');
    const buscarButton = wrapper.findAll('button').find((button) => button.text() === 'Buscar');
    await buscarButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('5 resultado(s) para "rex"');
    const limparButton = wrapper.findAll('button').find((button) => button.text() === 'Limpar');
    expect(limparButton).toBeTruthy();
    await limparButton!.trigger('click');
    await flushPromises();

    expect((searchInput.element as HTMLInputElement).value).toBe('');
    expect(wrapper.text()).not.toContain('resultado(s) para "rex"');
    expect(wrapper.text()).not.toContain('Maria Souza');
    expect(wrapper.text()).not.toContain('Rex');
    expect(wrapper.text()).not.toContain('Ração Premium');
    expect(wrapper.text()).not.toContain('CS-0001');
  });
});

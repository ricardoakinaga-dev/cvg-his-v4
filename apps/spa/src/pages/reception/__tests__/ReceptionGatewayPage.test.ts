import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Joao Silva',
    documentId: '123.456.789-00',
    contacts: [
      { label: 'Celular', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true }
    ],
    financialResponsible: true,
    administrativeNotes: '',
    status: 'active' as const,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z'
  }
];

const mockPatients = [
  {
    id: 'patient-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine',
    breed: 'SRD',
    sex: 'male' as const,
    primaryOwnerId: 'owner-1',
    chronicDisease: 'Doenca renal cronica',
    allergy: 'Dipirona',
    status: 'active' as const,
    createdAt: '2026-04-01T08:00:00Z',
    updatedAt: '2026-04-01T08:00:00Z'
  }
];

const mockOwnerList = vi.fn().mockResolvedValue(mockOwners);
const mockPatientList = vi.fn().mockResolvedValue(mockPatients);
const mockClinicalHandoffs = [
  {
    id: 'handoff-1',
    accountId: 'acc-1',
    encounterId: 'encounter-1',
    ownerId: 'owner-1',
    patientId: 'patient-1',
    originChannel: 'reception' as const,
    fromSector: 'clinic' as const,
    toSector: 'reception' as const,
    fromResponsibleId: 'user-vet',
    toResponsibleType: 'sector' as const,
    toResponsibleId: 'reception',
    clinicalSummary: 'Retorno com pendencia de orientacao',
    receptionInstructions: 'Confirmar tutor e entregar orientacoes',
    priority: 'high' as const,
    handoffStatus: 'sent_to_reception' as const,
    createdBy: 'user-vet',
    sentBy: 'user-vet',
    sentAt: '2026-05-01T10:00:00Z',
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  },
  {
    id: 'handoff-2',
    accountId: 'acc-1',
    encounterId: 'encounter-2',
    ownerId: 'owner-2',
    patientId: 'patient-2',
    originChannel: 'schedule' as const,
    fromSector: 'clinic' as const,
    toSector: 'reception' as const,
    fromResponsibleId: 'user-vet',
    toResponsibleType: 'sector' as const,
    toResponsibleId: 'reception',
    clinicalSummary: 'Caso recebido anteriormente',
    receptionInstructions: 'Conferencia ja feita',
    priority: 'medium' as const,
    handoffStatus: 'acknowledged_by_reception' as const,
    createdBy: 'user-vet',
    sentBy: 'user-vet',
    sentAt: '2026-05-01T09:00:00Z',
    acknowledgedBy: 'user-reception',
    acknowledgedAt: '2026-05-01T09:10:00Z',
    acknowledgeNote: 'Recebido pela recepcao',
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-05-01T09:10:00Z'
  }
];
const mockClinicalHandoffList = vi.fn().mockResolvedValue(mockClinicalHandoffs);
const mockClinicalHandoffAcknowledge = vi.fn().mockResolvedValue(mockClinicalHandoffs[1]);
const mockLaboratoryOrders = [
  {
    id: 'lab-order-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    encounterId: 'encounter-1',
    requestedBy: 'vet-1',
    examType: 'HEM',
    code: 'HEM-001',
    description: 'Hemograma',
    status: 'requested' as const,
    requestedAt: '2026-05-01T10:00:00Z',
    collectedAt: null,
    resultRecordedAt: null,
    resultSummary: null,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  },
  {
    id: 'lab-order-2',
    accountId: 'acc-1',
    patientId: 'patient-1',
    encounterId: 'encounter-1',
    requestedBy: 'vet-1',
    examType: 'BIO',
    code: 'BIO-001',
    description: 'Bioquimico',
    status: 'collected' as const,
    requestedAt: '2026-05-01T10:00:00Z',
    collectedAt: '2026-05-01T10:20:00Z',
    resultRecordedAt: null,
    resultSummary: null,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:20:00Z'
  }
];
const mockPreventiveEvents = [
  {
    id: 'preventive-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    clientName: 'Joao Silva',
    animalName: 'Rex',
    eventDate: '2026-04-01',
    itemType: 'vaccine' as const,
    description: 'V10',
    status: 'scheduled' as const,
    observation: null,
    executedAt: null,
    executedObservation: null,
    rescheduledFromId: null,
    reminderEmailPreparedAt: null,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  }
];
const mockLaboratoryListOrders = vi.fn().mockResolvedValue(mockLaboratoryOrders);
const mockVaccinesDewormersList = vi.fn().mockResolvedValue(mockPreventiveEvents);
const mockBillingRecords = [
  {
    id: 'billing-1',
    accountId: 'acc-1',
    encounterId: 'encounter-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    status: 'open' as const,
    subtotalAmount: 180,
    currency: 'BRL',
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z'
  }
];
const mockBillingList = vi.fn().mockResolvedValue(mockBillingRecords);
const mockQueueEntries = [
  {
    id: 'queue-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    appointmentId: null,
    encounterId: null,
    status: 'waiting' as const,
    priority: 'high' as const,
    reason: 'Consulta de rotina',
    checkedInAt: '2026-04-05T09:00:00Z',
    calledAt: null,
    createdAt: '2026-04-05T09:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z'
  },
  {
    id: 'queue-2',
    accountId: 'acc-1',
    patientId: 'patient-2',
    ownerId: 'owner-2',
    appointmentId: null,
    encounterId: 'encounter-2',
    status: 'in_care' as const,
    priority: 'medium' as const,
    reason: 'Retorno',
    checkedInAt: '2026-04-05T08:30:00Z',
    calledAt: '2026-04-05T08:35:00Z',
    createdAt: '2026-04-05T08:30:00Z',
    updatedAt: '2026-04-05T08:40:00Z'
  }
];
const mockListQueue = vi.fn().mockResolvedValue(mockQueueEntries);

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() {
      return mockOwnerList;
    }
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockPatientList;
    }
  }
}));

vi.mock('@/services/scheduling', () => ({
  listQueue: () => mockListQueue()
}));

vi.mock('@/services/clinicalHandoff', () => ({
  clinicalHandoffService: {
    get list() {
      return mockClinicalHandoffList;
    },
    get acknowledge() {
      return mockClinicalHandoffAcknowledge;
    }
  }
}));

vi.mock('@/services/laboratory', () => ({
  laboratoryService: {
    get listOrders() {
      return mockLaboratoryListOrders;
    }
  }
}));

vi.mock('@/services/vaccinesDewormers', () => ({
  vaccinesDewormersService: {
    get list() {
      return mockVaccinesDewormersList;
    }
  }
}));

vi.mock('@/services/billing', () => ({
  billingService: {
    get list() {
      return mockBillingList;
    }
  }
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function mountSearchPage() {
  const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
  return mount(ReceptionGatewayPage, {
    global: { stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } }
  });
}

describe('ReceptionGatewayPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnerList.mockResolvedValue(mockOwners);
    mockPatientList.mockResolvedValue(mockPatients);
    mockListQueue.mockResolvedValue(mockQueueEntries);
    mockClinicalHandoffList.mockResolvedValue(mockClinicalHandoffs);
    mockClinicalHandoffAcknowledge.mockResolvedValue(mockClinicalHandoffs[1]);
    mockLaboratoryListOrders.mockResolvedValue(mockLaboratoryOrders);
    mockVaccinesDewormersList.mockResolvedValue(mockPreventiveEvents);
    mockBillingList.mockResolvedValue(mockBillingRecords);
  });

  it('renders the reception gateway with primary operational actions', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    expect(wrapper.text()).toContain('Recepção');
    expect(wrapper.text()).toContain('Criar agendamento');
    expect(wrapper.text()).toContain('Abrir Agenda');
    expect(wrapper.text()).toContain('Abrir Esteira');
  });

  it('puts search results before operational summaries while retaining secondary controls in disclosures', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: { stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } }
    });
    await flushPromises();

    const search = wrapper.get('form[role="search"]');
    const queue = wrapper.get('.reception-funnel');
    expect(search.element.compareDocumentPosition(queue.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(queue.get('details').attributes('open')).toBeUndefined();
    expect(queue.get('details').text()).toContain('Finalizados');
    expect(queue.get('.queue-preview').element.closest('details')).toBeNull();
    const shortcuts = wrapper.get('.reception-shortcuts');
    expect(shortcuts.attributes('open')).toBeUndefined();
    expect(shortcuts.get('a[href="/appointments"]').text()).toBe('Abrir Agenda');
    expect(shortcuts.find('a[href="/owners/new"]').exists()).toBe(true);

    await search.get('input').setValue('Rex');
    await search.trigger('submit');
    await flushPromises();
    const results = wrapper.get('.reception-results');
    expect(search.element.nextElementSibling).toBe(results.element);
    expect(results.text()).toContain('Rex');
    expect(results.text()).toContain('Joao Silva');
    expect(results.element.closest('details')).toBeNull();
    wrapper.unmount();
  });

  it('searches owners and patients from the same field', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage);

    await wrapper.find('input[type="search"]').setValue('11999991111');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockOwnerList).toHaveBeenCalledWith({ search: '11999991111', status: 'all' });
    expect(mockPatientList).toHaveBeenCalledWith({ search: '11999991111', status: 'all' });
    expect(mockLaboratoryListOrders).toHaveBeenCalledWith({ patientId: 'patient-1' });
    expect(mockVaccinesDewormersList).toHaveBeenCalledWith({
      patientId: 'patient-1',
      ownerId: 'owner-1',
      includeExecuted: true
    });
    expect(mockBillingList).toHaveBeenCalledWith({ ownerId: 'owner-1' });
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Rex');
  });

  it('keeps the latest results when an older search resolves last', async () => {
    const oldOwners = deferred<typeof mockOwners>();
    mockOwnerList.mockReturnValueOnce(oldOwners.promise);
    const wrapper = await mountSearchPage();
    await wrapper.get('input[type="search"]').setValue('old');
    await wrapper.get('form').trigger('submit');
    mockOwnerList.mockResolvedValueOnce([{ ...mockOwners[0]!, fullName: 'Maria Atual' }]);
    mockPatientList.mockResolvedValueOnce([]);
    await wrapper.get('input[type="search"]').setValue('Maria');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    oldOwners.resolve(mockOwners);
    await flushPromises();
    expect(wrapper.get('.reception-results').text()).toContain('Maria Atual');
    expect(wrapper.get('.reception-results').text()).not.toContain('Joao Silva');
    expect(mockLaboratoryListOrders).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores an older rejection without releasing the current loading state', async () => {
    const oldOwners = deferred<typeof mockOwners>();
    const currentOwners = deferred<typeof mockOwners>();
    mockOwnerList.mockReturnValueOnce(oldOwners.promise).mockReturnValueOnce(currentOwners.promise);
    const wrapper = await mountSearchPage();
    await wrapper.get('input[type="search"]').setValue('old');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('input[type="search"]').setValue('current');
    await wrapper.get('form').trigger('submit');
    oldOwners.reject(new Error('Falha antiga'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Falha antiga');
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('true');

    currentOwners.resolve(mockOwners);
    await flushPromises();
    expect(wrapper.get('.reception-results').text()).toContain('Joao Silva');
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('false');
    wrapper.unmount();
  });

  it('preserves the latest error when an older successful search finishes later', async () => {
    const oldOwners = deferred<typeof mockOwners>();
    mockOwnerList.mockReturnValueOnce(oldOwners.promise).mockRejectedValueOnce(new Error('Falha atual'));
    const wrapper = await mountSearchPage();
    await wrapper.get('input[type="search"]').setValue('old');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('input[type="search"]').setValue('current');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    oldOwners.resolve(mockOwners);
    await flushPromises();
    expect(wrapper.text()).toContain('Falha atual');
    expect(wrapper.get('.reception-results').text()).not.toContain('Joao Silva');
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('false');
    wrapper.unmount();
  });

  it('does not let old patient context replace the current priority', async () => {
    const oldContext = deferred<typeof mockLaboratoryOrders>();
    const currentOwners = deferred<typeof mockOwners>();
    mockLaboratoryListOrders.mockReturnValueOnce(oldContext.promise);
    const wrapper = await mountSearchPage();
    await wrapper.get('input[type="search"]').setValue('Rex');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    mockOwnerList.mockReturnValueOnce(currentOwners.promise);
    mockLaboratoryListOrders.mockResolvedValueOnce([]);
    mockVaccinesDewormersList.mockResolvedValueOnce([]);
    mockBillingList.mockResolvedValueOnce([]);
    await wrapper.get('input[type="search"]').setValue('new');
    await wrapper.get('form').trigger('submit');
    currentOwners.resolve(mockOwners);
    await flushPromises();
    oldContext.resolve(mockLaboratoryOrders);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Exames pendentes');
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('false');
    wrapper.unmount();
  });

  it.each(['clear button', 'empty input', 'short input', 'empty submit'])(
    'invalidates a pending search after %s', async (action) => {
      const pendingOwners = deferred<typeof mockOwners>();
      mockOwnerList.mockReturnValueOnce(pendingOwners.promise);
      const wrapper = await mountSearchPage();
      await wrapper.get('input[type="search"]').setValue('Rex');
      await wrapper.get('form').trigger('submit');
      if (action === 'clear button') {
        await wrapper.get('form button[type="button"]').trigger('click');
      } else {
        await wrapper.get('input[type="search"]').setValue(action === 'short input' ? 'R' : '');
        if (action === 'empty submit') await wrapper.get('form').trigger('submit');
      }
      expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('false');
      pendingOwners.resolve(mockOwners);
      await flushPromises();
      expect(wrapper.find('.contextual-quick-actions').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Joao Silva');
      expect(mockLaboratoryListOrders).not.toHaveBeenCalled();
      wrapper.unmount();
    }
  );

  it('does not start patient context requests after unmount', async () => {
    const pendingOwners = deferred<typeof mockOwners>();
    mockOwnerList.mockReturnValueOnce(pendingOwners.promise);
    const wrapper = await mountSearchPage();
    await wrapper.get('input[type="search"]').setValue('Rex');
    await wrapper.get('form').trigger('submit');
    wrapper.unmount();
    pendingOwners.resolve(mockOwners);
    await flushPromises();
    expect(mockLaboratoryListOrders).not.toHaveBeenCalled();
  });

  it('exposes safe next steps without creating an encounter automatically', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await wrapper.find('input[type="search"]').setValue('Rex');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const links = wrapper.findAll('a');
    const hrefs = links.map((link) => link.attributes('href'));

    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).toContain('/patients/patient-1');
    expect(hrefs).toContain('/patients/new?ownerId=owner-1');
    expect(hrefs).toContain('/appointments/new?ownerId=owner-1&patientId=patient-1');
    expect(hrefs).toContain('/quotes?ownerId=owner-1');
    expect(hrefs).toContain('/counter-sales?ownerId=owner-1');
    expect(hrefs).toContain('/counter-sales?patientId=patient-1&ownerId=owner-1');
    expect(hrefs).toContain('/queue?patientId=patient-1&ownerId=owner-1&reason=Recepcao');
    expect(hrefs).toContain('/encounters/new?ownerId=owner-1&patientId=patient-1');
    expect(wrapper.text()).toContain('Ações rápidas contextuais');
    expect(wrapper.text()).toContain('Prioridade 360');
    expect(wrapper.text()).toContain('Exames pendentes');
    expect(wrapper.text()).toContain(
      '2 exame(s) pendente(s) e 1 preventivo(s) vencido(s). Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.'
    );
    expect(wrapper.text()).toContain('Abrir Rex');
    expect(wrapper.text()).toContain('Agendar paciente');
    expect(wrapper.text()).toContain('Preparar esteira');
    expect(wrapper.text()).toContain('Criar orçamento');
    expect(wrapper.text()).toContain('Abrir comanda');
    expect(wrapper.text()).toContain('Preparar check-in');
  });

  it('uses financial pending as priority after clinical and preventive signals', async () => {
    mockLaboratoryListOrders.mockResolvedValueOnce([]);
    mockVaccinesDewormersList.mockResolvedValueOnce([]);
    mockPatientList.mockResolvedValueOnce([
      {
        id: 'patient-1',
        accountId: 'acc-1',
        name: 'Rex',
        species: 'canine',
        breed: 'SRD',
        sex: 'male' as const,
        primaryOwnerId: 'owner-1',
        status: 'active' as const,
        createdAt: '2026-04-01T08:00:00Z',
        updatedAt: '2026-04-01T08:00:00Z'
      }
    ]);

    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await wrapper.find('input[type="search"]').setValue('Rex');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(wrapper.text()).toContain('Prioridade 360');
    expect(wrapper.text()).toContain('Pendência financeira');
    expect(wrapper.text().replace(/\s+/g, ' ')).toContain(
      'R$ 180,00 em aberto. Abrir cockpit 360 antes de seguir com agenda, esteira ou comanda.'
    );
  });

  it('shows contextual owner actions when only tutor is found', async () => {
    mockPatientList.mockResolvedValueOnce([]);

    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await wrapper.find('input[type="search"]').setValue('Joao');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));

    expect(wrapper.text()).toContain('Ações rápidas contextuais');
    expect(wrapper.text()).toContain('Abrir Joao Silva');
    expect(wrapper.text()).toContain('Cadastrar animal');
    expect(wrapper.text()).toContain('Agendar tutor');
    expect(wrapper.text()).toContain('Venda/comanda');
    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).toContain('/patients/new?ownerId=owner-1');
    expect(hrefs).toContain('/appointments/new?ownerId=owner-1');
    expect(hrefs).toContain('/counter-sales?ownerId=owner-1');
  });

  it('loads the central queue as the reception operational funnel', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();

    expect(mockListQueue).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Funil operacional');
    expect(wrapper.text()).toContain('Aguardando recepção');
    expect(wrapper.text()).toContain('1');
    expect(wrapper.text()).toContain('Em atendimento');
    expect(wrapper.text()).toContain('Consulta de rotina');
    expect(wrapper.text()).toContain('Retorno');

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toContain('/patients/patient-1');
    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).toContain('/encounters/encounter-2');
    expect(hrefs).toContain(
      '/counter-sales?encounterId=encounter-2&patientId=patient-2&ownerId=owner-2'
    );
  });

  it('shows a minimal handoff inbox without financial automation links', async () => {
    const ReceptionGatewayPage = (await import('../ReceptionGatewayPage.vue')).default;
    const wrapper = mount(ReceptionGatewayPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          }
        }
      }
    });

    await flushPromises();

    expect(mockClinicalHandoffList).toHaveBeenCalledWith();
    expect(wrapper.text()).toContain('Handoffs da recepção');
    expect(wrapper.text()).toContain('Aguardando ACK');
    expect(wrapper.text()).toContain('Alta ou crítica');
    expect(wrapper.text()).toContain('Retorno com pendencia de orientacao');
    expect(wrapper.text()).toContain('Confirmar tutor e entregar orientacoes');
    expect(wrapper.text()).not.toContain('Cobrança');

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toContain('/encounters/encounter-1');
    expect(hrefs).toContain('/patients/patient-1');
    expect(hrefs).toContain('/owners/owner-1');
    expect(hrefs).not.toContain('/billing/encounter-1');

    const acknowledgeButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Confirmar recebimento'));
    expect(acknowledgeButton).toBeTruthy();
    await acknowledgeButton!.trigger('click');
    await flushPromises();

    expect(mockClinicalHandoffAcknowledge).toHaveBeenCalledWith('handoff-1', {
      note: 'Recepcao confirmou recebimento do handoff clinico.'
    });
  });
});

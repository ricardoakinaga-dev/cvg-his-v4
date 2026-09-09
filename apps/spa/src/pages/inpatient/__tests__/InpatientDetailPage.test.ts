import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { InpatientStaySummary } from '@/types/inpatient';

const mockStay: InpatientStaySummary = {
  id: 'stay-1',
  accountId: 'acc-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  admittedByUserId: 'user-1',
  unit: 'Clinica',
  ward: 'A',
  bed: '01',
  status: 'admitted' as const,
  admittedAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z'
};

const mockProgressNotes = [
  {
    id: 'prog-1',
    accountId: 'acc-1',
    stayId: 'stay-1',
    encounterId: 'enc-1',
    note: 'Paciente apresentou melhora significativa.',
    authoredByUserId: 'user-1',
    createdAt: '2024-01-15T14:00:00Z'
  }
];

const mockOccurrences = [
  {
    id: 'occ-1',
    accountId: 'acc-1',
    stayId: 'stay-1',
    encounterId: 'enc-1',
    type: 'clinical' as const,
    severity: 'attention' as const,
    title: 'Hiporexia',
    description: 'Paciente recusou dieta no plantão.',
    authoredByUserId: 'user-1',
    createdAt: '2024-01-15T15:00:00Z'
  }
];

const mockDailyCharges = [
  {
    id: 'charge-1',
    accountId: 'acc-1',
    stayId: 'stay-1',
    encounterId: 'enc-1',
    patientId: 'pat-1',
    description: 'Diária UTI',
    chargeDate: '2024-01-15',
    quantity: 1,
    unitAmount: 180,
    totalAmount: 180,
    status: 'pending' as const,
    createdByUserId: 'user-1',
    createdAt: '2024-01-15T15:00:00Z',
    updatedAt: '2024-01-15T15:00:00Z'
  }
];

const mockBilledDailyCharge = {
  ...mockDailyCharges[0],
  id: 'charge-new',
  status: 'billed' as const,
  billingRecordId: 'bill-1'
};

const mockListFn = vi.fn().mockResolvedValue([mockStay]);
const mockProgressFn = vi.fn().mockResolvedValue(mockProgressNotes);
const mockAddProgressFn = vi.fn().mockResolvedValue({
  id: 'prog-new',
  accountId: 'acc-1',
  stayId: 'stay-1',
  encounterId: 'enc-1',
  note: 'Nova nota',
  authoredByUserId: 'user-1',
  createdAt: '2024-01-15T16:00:00Z'
});
const mockUpdateStatusFn = vi.fn().mockResolvedValue({ ...mockStay, status: 'stable' });
const mockListOccurrencesFn = vi.fn().mockResolvedValue(mockOccurrences);
const mockAddOccurrenceFn = vi.fn().mockResolvedValue({
  ...mockOccurrences[0],
  id: 'occ-new',
  title: 'Intercorrência respiratória',
  description: 'Paciente apresentou tosse no plantão.'
});
const mockListDailyChargesFn = vi.fn().mockResolvedValue(mockDailyCharges);
const mockCreateDailyChargeFn = vi.fn().mockResolvedValue({
  ...mockDailyCharges[0],
  id: 'charge-new',
  totalAmount: 360,
  quantity: 2
});
const mockMarkDailyChargeBilledFn = vi.fn().mockResolvedValue({
  ...mockDailyCharges[0],
  id: 'charge-new',
  status: 'billed',
  billingRecordId: 'bill-1'
});
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetUserName = vi.fn().mockResolvedValue('Dr. Smith');

vi.mock('@/services/inpatient', () => ({
  inpatientService: {
    get list() {
      return mockListFn;
    },
    get listProgress() {
      return mockProgressFn;
    },
    get addProgress() {
      return mockAddProgressFn;
    },
    get updateStatus() {
      return mockUpdateStatusFn;
    },
    get listOccurrences() {
      return mockListOccurrencesFn;
    },
    get addOccurrence() {
      return mockAddOccurrenceFn;
    },
    get listDailyCharges() {
      return mockListDailyChargesFn;
    },
    get createDailyCharge() {
      return mockCreateDailyChargeFn;
    },
    get markDailyChargeBilled() {
      return mockMarkDailyChargeBilledFn;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getUserName: mockGetUserName,
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

vi.mock('@/services/user', () => ({
  userService: {
    getById: vi.fn().mockResolvedValue({
      id: 'user-1',
      displayName: 'Dr. Smith',
      username: 'drsmith',
      email: 'smith@vet.com',
      roleCode: 'vet',
      status: 'active',
      accountId: 'acc-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    })
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'stay-1' } }),
  useRouter: () => ({ push: vi.fn() })
}));

describe('InpatientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue([mockStay]);
    mockProgressFn.mockResolvedValue(mockProgressNotes);
    mockListOccurrencesFn.mockResolvedValue(mockOccurrences);
    mockListDailyChargesFn.mockResolvedValue(mockDailyCharges);
  });

  it('renders stay information', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Detalhes da Internação');
    expect(wrapper.text()).toContain('Ver prontuário');
  });

  it('links inpatient detail to patient medical record', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
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

    expect(wrapper.find('a[href="/patients/pat-1"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/medical-records/enc-1"]').exists()).toBe(true);
  });

  it('shows error when stay not found', async () => {
    mockListFn.mockResolvedValue([]);
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Internação não encontrada');
    expect(wrapper.text()).toContain('Tentar novamente');
    expect(wrapper.find('.ds-alert__dismiss').exists()).toBe(false);
  });

  it('does not present zero-valued collection summaries while collections are loading', async () => {
    let resolveProgress!: (value: typeof mockProgressNotes) => void;
    let resolveDailyCharges!: (value: typeof mockDailyCharges) => void;
    mockProgressFn.mockReturnValueOnce(new Promise((resolve) => { resolveProgress = resolve; }));
    mockListDailyChargesFn.mockReturnValueOnce(new Promise((resolve) => { resolveDailyCharges = resolve; }));
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();

    const evolutionCard = wrapper.findAll('.summary-card').find((card) => card.text().includes('Evoluções'));
    const dailyCard = wrapper.findAll('.summary-card').find((card) => card.text().includes('Diárias'));
    expect(evolutionCard?.find('.summary-card__value').text()).toBe('…');
    expect(dailyCard?.find('.summary-card__value').text()).toBe('…');

    resolveProgress([]);
    resolveDailyCharges([]);
    await flushPromises();

    expect(evolutionCard?.find('.summary-card__value').text()).toBe('0');
    expect(dailyCard?.find('.summary-card__value').text()).toContain('R$');
  });

  it('displays progress notes section', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Evolução Clínica');
  });

  it('shows progress note content', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Paciente apresentou melhora significativa.');
  });

  it('shows inpatient occurrences and daily charges', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Ocorrências da Internação');
    expect(wrapper.text()).toContain('Hiporexia');
    expect(wrapper.text()).toContain('Diárias e Cobranças');
    expect(wrapper.text()).toContain('Diária UTI');
    expect(wrapper.text()).toContain('R$');
  });

  it('links billed inpatient daily charge to billing detail by encounter', async () => {
    mockListDailyChargesFn.mockResolvedValueOnce([mockBilledDailyCharge]);
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
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

    expect(wrapper.text()).toContain('Faturada');
    expect(wrapper.text()).toContain('Cobrança bill-1');
    expect(wrapper.find('a[href="/billing/enc-1"]').exists()).toBe(true);
  });

  it('creates structured inpatient occurrence from detail page', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const newOccurrenceBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Ocorrência'));
    await newOccurrenceBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    await wrapper.find('input#occurrenceTitle').setValue('Intercorrência respiratória');
    await wrapper.find('textarea#occurrenceDescription').setValue('Paciente apresentou tosse no plantão.');
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === 'Salvar Ocorrência');
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockAddOccurrenceFn).toHaveBeenCalledWith('stay-1', {
      type: 'clinical',
      severity: 'info',
      title: 'Intercorrência respiratória',
      description: 'Paciente apresentou tosse no plantão.'
    });
    expect(wrapper.text()).toContain('Ocorrência registrada com sucesso!');
  });

  it('creates and marks daily charge as billed from detail page', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const newChargeBtn = wrapper.findAll('button').find((b) => b.text().includes('Lançar Diária'));
    await newChargeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    await wrapper.find('input#dailyChargeDescription').setValue('Diária UTI');
    await wrapper.find('input#dailyChargeQuantity').setValue(2);
    await wrapper.find('input#dailyChargeUnitAmount').setValue(180);
    const saveBtn = wrapper.findAll('button').find((b) => b.text() === 'Lançar Diária');
    await saveBtn!.trigger('click');
    await flushPromises();

    expect(mockCreateDailyChargeFn).toHaveBeenCalledWith('stay-1', {
      description: 'Diária UTI',
      chargeDate: expect.any(String),
      quantity: 2,
      unitAmount: 180
    });
    expect(wrapper.text()).toContain('Diária lançada com sucesso!');

    const billBtn = wrapper.findAll('button').find((b) => b.text().includes('Marcar Faturada'));
    await billBtn!.trigger('click');
    await flushPromises();

    expect(mockMarkDailyChargeBilledFn).toHaveBeenCalledWith('stay-1', 'charge-new');
    expect(wrapper.text()).toContain('Diária marcada como faturada!');
  });

  it('resolves author name instead of showing UUID', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Dr. Smith');
    expect(wrapper.text()).not.toContain('user-1...');
  });

  it('shows status transition buttons for admitted stay', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Ações');
    expect(wrapper.text()).toContain('Marcar Estável');
    expect(wrapper.text()).toContain('Dar Alta');
  });

  it('hides status buttons for discharged stay', async () => {
    mockListFn.mockResolvedValue([
      { ...mockStay, status: 'discharged', dischargedAt: '2024-01-16T10:00:00Z' }
    ]);
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).not.toContain('Marcar Estável');
    expect(wrapper.text()).not.toContain('Dar Alta');
  });

  it('shows new evolution form button when stay is not discharged', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('+ Nova Evolução');
  });

  it('opens progress form when clicking Nova Evolução', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const novaBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Evolução'));
    expect(novaBtn).toBeTruthy();
    await novaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('textarea#progressNote').exists()).toBe(true);
    expect(wrapper.find('button:disabled').exists()).toBe(false);
  });

  it('shows validation error when submitting empty progress note', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const novaBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Evolução'));
    await novaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const salvarBtn = wrapper.findAll('button').find((b) => b.text() === 'Salvar');
    await salvarBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Nota é obrigatória');
  });

  it('submits progress note and shows success message', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const novaBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Evolução'));
    await novaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('textarea#progressNote');
    await textarea.setValue('Paciente evoluiu bem durante o turno.');

    const salvarBtn = wrapper.findAll('button').find((b) => b.text() === 'Salvar');
    await salvarBtn!.trigger('click');
    await flushPromises();

    expect(mockAddProgressFn).toHaveBeenCalledWith(
      'stay-1',
      'Paciente evoluiu bem durante o turno.'
    );
    expect(wrapper.text()).toContain('Evolução registrada com sucesso!');
    expect(wrapper.text()).toContain('Nova nota');
    expect(wrapper.find('textarea#progressNote').exists()).toBe(false);
  });

  it('cancels progress form when clicking Cancelar', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const novaBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Evolução'));
    await novaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('textarea#progressNote');
    await textarea.setValue('Test note');

    const cancelarBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancelar');
    await cancelarBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('textarea#progressNote').exists()).toBe(false);
  });

  it('updates status when clicking Marcar Estável', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const stableBtn = wrapper.findAll('button').find((b) => b.text().includes('Marcar Estável'));
    await stableBtn!.trigger('click');
    await flushPromises();

    expect(mockUpdateStatusFn).toHaveBeenCalledWith('stay-1', { status: 'stable' });
    expect(wrapper.text()).toContain('Status atualizado para Estável');
  });

  it('opens discharge modal when clicking Dar Alta', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const altaBtn = wrapper.findAll('button').find((b) => b.text().includes('Dar Alta'));
    await altaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.ds-modal').exists()).toBe(true);
    expect(wrapper.find('textarea#dischargeReason').exists()).toBe(true);
  });

  it('shows validation error when discharging without reason', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const altaBtn = wrapper.findAll('button').find((b) => b.text().includes('Dar Alta'));
    await altaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Confirmar Alta');
    await confirmBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Motivo da alta é obrigatório');
  });

  it('completes discharge flow with reason', async () => {
    mockUpdateStatusFn.mockResolvedValueOnce({
      ...mockStay,
      status: 'discharged',
      dischargedAt: '2024-01-16T10:00:00Z',
      dischargeReason: 'Alta médica'
    });

    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const altaBtn = wrapper.findAll('button').find((b) => b.text().includes('Dar Alta'));
    await altaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('textarea#dischargeReason');
    await textarea.setValue('Alta médica');

    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Confirmar Alta');
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(mockUpdateStatusFn).toHaveBeenCalledWith('stay-1', {
      status: 'discharged',
      dischargeReason: 'Alta médica'
    });
    expect(wrapper.text()).toContain('Alta registrada com sucesso!');
    expect(wrapper.find('.ds-modal').exists()).toBe(false);
  });

  it('shows empty state when no progress notes exist', async () => {
    mockProgressFn.mockResolvedValue([]);
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Nenhuma evolução registrada.');
  });

  it('shows error when submitting progress note fails', async () => {
    mockAddProgressFn.mockRejectedValueOnce(new Error('Failed to save'));

    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const novaBtn = wrapper.findAll('button').find((b) => b.text().includes('Nova Evolução'));
    await novaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('textarea#progressNote');
    await textarea.setValue('Nota que vai falhar.');

    const salvarBtn = wrapper.findAll('button').find((b) => b.text() === 'Salvar');
    await salvarBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to save');
    expect(wrapper.find('textarea#progressNote').exists()).toBe(true);
  });

  it('shows error when updating status fails', async () => {
    mockUpdateStatusFn.mockRejectedValueOnce(new Error('Permission denied'));

    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const stableBtn = wrapper.findAll('button').find((b) => b.text().includes('Marcar Estável'));
    await stableBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Permission denied');
  });

  it('shows error when discharge fails', async () => {
    mockUpdateStatusFn.mockRejectedValueOnce(new Error('Cannot discharge active treatment'));

    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    const altaBtn = wrapper.findAll('button').find((b) => b.text().includes('Dar Alta'));
    await altaBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    const textarea = wrapper.find('textarea#dischargeReason');
    await textarea.setValue('Alta solicitada');

    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Confirmar Alta');
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Cannot discharge active treatment');
    expect(wrapper.find('.ds-modal').exists()).toBe(true);
  });

  it('shows error when loading progress notes fails', async () => {
    mockProgressFn.mockRejectedValueOnce(new Error('Progress notes unavailable'));

    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Progress notes unavailable');
    expect(wrapper.text()).toContain('Recarregar evoluções');
    expect(wrapper.text()).not.toContain('Internação não encontrada');
  });

  it('shows error when loading stay fails', async () => {
    mockListFn.mockRejectedValueOnce(new Error('Network timeout'));

    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Network timeout');
  });

  it('exposes patient, location, bed and textual status as a semantic detail hierarchy', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();

    const detail = wrapper.find('dl.detail-grid');
    expect(detail.exists()).toBe(true);
    expect(wrapper.findAll('h2').map((heading) => heading.text())).toContain('Informações da Internação');
    expect(detail.find('dt').text()).toContain('Paciente');
    expect(detail.text()).toContain('Rex');
    const summary = wrapper.find('.summary-grid');
    expect(summary.text()).toContain('Clinica / A / 01');
    expect(summary.text()).toContain('Internado');
    expect(detail.text()).not.toContain('Clinica / A / 01');
    expect(detail.text()).toContain('Última atualização');
  });

  it('keeps the selected patient and bed visible while refreshing the same target', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    let resolvePending!: (value: typeof mockStay[]) => void;
    const pending = new Promise<typeof mockStay[]>((resolve) => {
      resolvePending = resolve;
    });
    mockListFn.mockReturnValueOnce(pending);
    const refreshButton = wrapper.find('button[aria-label="Atualizar dados da internação"]');
    expect(refreshButton.exists()).toBe(true);

    await refreshButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.detail-content').attributes('aria-busy')).toBe('true');
    expect(wrapper.find('.refresh-status').text()).toContain('Rex');
    expect(wrapper.find('.refresh-status').text()).toContain('leito 01');

    resolvePending([
      { ...mockStay, bed: '02', status: 'stable', updatedAt: '2024-01-15T16:00:00Z' }
    ]);
    await flushPromises();

    expect(wrapper.find('.summary-grid').text()).toContain('Clinica / A / 02');
    expect(wrapper.find('.summary-grid').text()).toContain('Estável');
    expect(wrapper.find('.refresh-status').exists()).toBe(false);
    expect(mockListFn).toHaveBeenCalledTimes(2);
    expect(mockProgressFn).toHaveBeenCalledTimes(1);
  });

  it('keeps the last readable context and offers a safe read retry when refresh fails', async () => {
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();
    mockListFn.mockRejectedValueOnce(new Error('Network timeout'));
    await wrapper.find('button[aria-label="Atualizar dados da internação"]').trigger('click');
    await flushPromises();

    const alert = wrapper.find('[role="alert"]');
    expect(alert.text()).toContain('Atualização da internação interrompida');
    expect(alert.text()).toContain('Não foi possível atualizar esta internação sem perder o contexto atual');
    expect(alert.text()).toContain('Network timeout');
    expect(wrapper.find('.detail-grid').text()).toContain('Rex');
    expect(wrapper.find('.detail-grid').text()).toContain('01');
    expect(alert.find('button').text()).toContain('Tentar novamente');
  });

  it('explains forbidden detail access without exposing a color-only state', async () => {
    mockListFn.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));
    const InpatientDetailPage = (await import('../InpatientDetailPage.vue')).default;
    const wrapper = mount(InpatientDetailPage, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' }
        }
      }
    });

    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain('Internação indisponível');
    expect(wrapper.text()).toContain('Você não tem permissão para consultar ou atualizar esta internação.');
    expect(wrapper.find('button').text()).toContain('Tentar novamente');
  });
});

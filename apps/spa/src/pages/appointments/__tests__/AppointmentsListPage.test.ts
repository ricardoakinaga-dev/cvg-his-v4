import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockApiRequest = vi.fn();
const mockGetSchedulingOverview = vi.fn();
const mockCheckInQueue = vi.fn();
const mockCancelAppointment = vi.fn();
const mockOwnerGetById = vi.fn();
const mockPatientGetById = vi.fn();
const mockServicesList = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    apiRequest: mockApiRequest
  };
});

vi.mock('@/services/scheduling', () => ({
  getSchedulingOverview: (...args: unknown[]) => mockGetSchedulingOverview(...args),
  checkInQueue: (...args: unknown[]) => mockCheckInQueue(...args)
}));

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    cancel: (...args: unknown[]) => mockCancelAppointment(...args)
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    getById: (...args: unknown[]) => mockOwnerGetById(...args)
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    getById: (...args: unknown[]) => mockPatientGetById(...args)
  }
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    list: () => mockServicesList()
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

vi.mock('@/components/appointments/AppointmentQuickCreateForm.vue', () => ({
  default: {
    template: `
      <div class="quick-create-stub">
        quick create
        <span class="scheduled-at">{{ presetScheduledAt }}</span>
        <span class="practitioner-id">{{ presetPractitionerStaffId }}</span>
      </div>
    `,
    props: ['presetScheduledAt', 'presetPractitionerStaffId']
  }
}));

vi.mock('@/components/appointments/AppointmentClientSelectorModal.vue', () => ({
  default: {
    template: `
      <div v-if="open" class="client-selector-stub">
        <button class="select-client" @click="$emit('selected', { id: 'owner-1', fullName: 'Maria Silva', documentId: '111', contacts: [{ label: 'WhatsApp', value: '1199999', type: 'whatsapp', primary: true }], financialResponsible: true, status: 'active', accountId: 'acc-1', createdAt: '', updatedAt: '' })">
          select client
        </button>
      </div>
    `,
    props: ['open']
  }
}));

const overviewPayload = {
  viewMode: 'day' as const,
  windowStart: '2026-04-12T00:00:00.000Z',
  windowEnd: '2026-04-13T00:00:00.000Z',
  stats: {
    total: 2,
    scheduled: 1,
    checkedIn: 1,
    completed: 0,
    cancelled: 0,
    conflicts: 1,
    unassigned: 0
  },
  professionals: [
    {
      id: 'staff_vet',
      fullName: 'Veterinário Responsável',
      department: 'Clinica',
      jobTitle: 'Médico Veterinário',
      specialty: 'Clínico geral',
      unit: 'Clinica',
      status: 'active' as const
    }
  ],
  blocks: [
    {
      id: 'block-1',
      accountId: 'acc-1',
      title: 'Intervalo operacional',
      kind: 'lunch_break' as const,
      startsAt: '2026-04-12T12:00:00.000Z',
      endsAt: '2026-04-12T13:00:00.000Z',
      practitionerStaffId: 'staff_vet',
      unit: 'Clinica'
    }
  ],
  filterOptions: {
    units: ['Clinica'],
    specialties: ['Clínico geral'],
    statuses: ['scheduled', 'checked_in', 'completed', 'cancelled'] as const
  },
  items: [
    {
      id: 'appt-1',
      accountId: 'acc-1',
      patientId: 'pat-1',
      ownerId: 'owner-1',
      scheduledAt: '2026-04-12T09:00:00.000Z',
      endsAt: '2026-04-12T09:30:00.000Z',
      durationMinutes: 30,
      visitType: 'scheduled' as const,
      reason: 'Consulta de rotina',
      practitionerStaffId: 'staff_vet',
      practitionerName: 'Veterinário Responsável',
      unit: 'Clinica',
      specialty: 'Clínico geral',
      status: 'scheduled' as const,
      conflicts: [],
      operational: {
        stage: 'scheduled' as const,
        label: 'Agendado',
        source: 'appointment' as const,
        updatedAt: '2026-04-12T08:00:00.000Z'
      },
      createdAt: '2026-04-12T08:00:00.000Z',
      updatedAt: '2026-04-12T08:00:00.000Z'
    },
    {
      id: 'appt-2',
      accountId: 'acc-1',
      patientId: 'pat-2',
      ownerId: 'owner-2',
      scheduledAt: '2026-04-12T10:00:00.000Z',
      endsAt: '2026-04-12T10:30:00.000Z',
      durationMinutes: 30,
      visitType: 'return' as const,
      reason: 'Retorno',
      practitionerStaffId: 'staff_vet',
      practitionerName: 'Veterinário Responsável',
      unit: 'Clinica',
      specialty: 'Clínico geral',
      status: 'checked_in' as const,
      conflicts: [
        {
          type: 'staff_overlap' as const,
          severity: 'critical' as const,
          message: 'O profissional já está alocado em outro atendimento neste intervalo.',
          startsAt: '2026-04-12T10:00:00.000Z',
          endsAt: '2026-04-12T10:30:00.000Z',
          appointmentId: 'appt-2'
        }
      ],
      operational: {
        stage: 'in_triage' as const,
        label: 'Em triagem',
        source: 'queue' as const,
        queueEntryId: 'queue-1',
        queueStatus: 'in_triage' as const,
        encounterId: 'enc-2',
        updatedAt: '2026-04-12T10:05:00.000Z'
      },
      createdAt: '2026-04-12T09:00:00.000Z',
      updatedAt: '2026-04-12T09:00:00.000Z'
    }
  ]
};

describe('AppointmentsListPage', () => {
  const mountPage = async () => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    return mount(AppointmentsListPage, {
      global: {
        stubs: {
          DsModal: {
            template: '<div v-if="open" class="ds-modal-stub"><slot /></div>',
            props: ['open', 'title', 'size']
          }
        }
      }
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-12T09:00:00.000Z'));
    mockApiRequest.mockResolvedValue({
      access: { permissionCodes: ['scheduling.read', 'scheduling.manage'] }
    });
    mockGetSchedulingOverview.mockResolvedValue(overviewPayload);
    mockServicesList.mockResolvedValue([{ id: 'svc-1', name: 'Consulta', code: null, description: null, basePrice: 100, active: true, accountId: 'acc-1', createdAt: '', updatedAt: '' }]);
    mockOwnerGetById.mockImplementation(async (id: string) => ({ id, fullName: id === 'owner-1' ? 'Maria Silva' : 'João Costa' }));
    mockPatientGetById.mockImplementation(async (id: string) => ({ id, name: id === 'pat-1' ? 'Rex' : 'Luna' }));
    mockCheckInQueue.mockResolvedValue({});
    mockCancelAppointment.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the premium cockpit summary and professional column', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Veterinário Responsável');
    expect(wrapper.text()).toContain('Conflitos');
    expect(wrapper.text()).toContain('Intervalo operacional');
    expect(wrapper.text()).toContain('Em triagem');
    expect(wrapper.text()).toContain('Cliente/Tutor');
    expect(wrapper.text()).toContain('Filtrar por...');
    expect(wrapper.text()).toContain('Disponibilidade');
    expect(wrapper.text()).toContain('10 livres');
    expect(wrapper.text()).toContain('2 agendamentos · 1 bloqueios/folgas');
    expect(wrapper.text()).toContain('Legenda operacional');
    expect(wrapper.text()).toContain('Referência Vetus');
  });

  it('reloads the overview when switching to week view', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const weekToggle = wrapper.findAll('button').find((button) => button.text().trim() === 'Semana');
    expect(weekToggle).toBeDefined();

    await weekToggle!.trigger('click');
    await flushPromises();

    const lastCall = mockGetSchedulingOverview.mock.calls.at(-1)?.[0];
    expect(lastCall?.viewMode).toBe('week');
  });

  it('opens the client selector first and then the quick create modal', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const quickCreateButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Criar agendamento')
    );
    expect(quickCreateButton).toBeDefined();

    await quickCreateButton!.trigger('click');
    await flushPromises();

    expect(wrapper.find('.client-selector-stub').exists()).toBe(true);

    await wrapper.find('.select-client').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('quick create');
  });

  it('opens quick create from an empty slot with contextual presets', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const emptySlot = wrapper.findAll('button').find((button) => button.text().trim() === 'Disponível');
    expect(emptySlot).toBeDefined();

    await emptySlot!.trigger('click');
    await flushPromises();

    expect(wrapper.find('.client-selector-stub').exists()).toBe(true);

    await wrapper.find('.select-client').trigger('click');
    await flushPromises();

    expect(wrapper.find('.quick-create-stub').exists()).toBe(true);
    expect(wrapper.find('.scheduled-at').text()).toBe('2026-04-12T07:00');
    expect(wrapper.find('.practitioner-id').text()).toBe('');
  });

  it('opens appointment details in the drawer without leaving the agenda', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const appointmentButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Rex')
    );
    expect(appointmentButton).toBeDefined();

    await appointmentButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Ver detalhe completo');
    expect(wrapper.text()).toContain('Maria Silva');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Aberto a partir da grade da agenda');
    expect(wrapper.find('.appointment-details-card--from-agenda').exists()).toBe(true);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('allows cancelling a scheduled appointment from the drawer', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const appointmentButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Rex')
    );
    expect(appointmentButton).toBeDefined();

    await appointmentButton!.trigger('click');
    await flushPromises();

    const cancelButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Cancelar Agendamento')
    );
    expect(cancelButton).toBeDefined();

    await cancelButton!.trigger('click');
    await flushPromises();

    expect(mockCancelAppointment).toHaveBeenCalledWith('appt-1', 'Cancelado pela agenda operacional');
  });

  it('shows slot creation entry in month view', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const monthToggle = wrapper.findAll('button').find((button) => button.text().trim() === 'Mês');
    expect(monthToggle).toBeDefined();

    await monthToggle!.trigger('click');
    await flushPromises();

    const monthCreateButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Novo agendamento')
    );
    expect(monthCreateButton).toBeDefined();
  });

  it('opens quick create when clicking the empty month surface', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const monthToggle = wrapper.findAll('button').find((button) => button.text().trim() === 'Mês');
    expect(monthToggle).toBeDefined();

    await monthToggle!.trigger('click');
    await flushPromises();

    const emptyMonthSurface = wrapper.find('.month-cell__empty-surface');
    expect(emptyMonthSurface.exists()).toBe(true);

    await emptyMonthSurface.trigger('click');
    await flushPromises();

    expect(wrapper.find('.client-selector-stub').exists()).toBe(true);
  });

  it('shows edit action in the drawer with prefilled full-form link', async () => {
    const wrapper = await mountPage();

    await flushPromises();

    const appointmentButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Rex')
    );
    expect(appointmentButton).toBeDefined();

    await appointmentButton!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Editar');
    expect(wrapper.html()).toContain('/appointments/new?appointmentId=appt-1');
    expect(wrapper.html()).toContain('scheduledAt=2026-04-12T09%3A00%3A00.000Z');
    expect(wrapper.html()).toContain('practitionerStaffId=staff_vet');
  });

  it('shows contextual empty state for the selected day when there are no appointments', async () => {
    mockGetSchedulingOverview.mockResolvedValue({
      ...overviewPayload,
      items: [],
      stats: {
        ...overviewPayload.stats,
        total: 0,
        scheduled: 0,
        checkedIn: 0,
        conflicts: 0
      }
    });

    const wrapper = await mountPage();

    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum agendamento em domingo, 12 de abril');
    expect(wrapper.text()).toContain('Não há compromissos visíveis para domingo, 12 de abril na visão Dia.');
    expect(wrapper.text()).toContain('Criar agendamento para domingo, 12 de abril');
  });

  it('compacts dense slots and shows a summary for additional appointments', async () => {
    mockGetSchedulingOverview.mockResolvedValue({
      ...overviewPayload,
      items: [
        ...overviewPayload.items,
        {
          id: 'appt-3',
          accountId: 'acc-1',
          patientId: 'pat-3',
          ownerId: 'owner-3',
          scheduledAt: '2026-04-12T09:05:00.000Z',
          endsAt: '2026-04-12T09:35:00.000Z',
          durationMinutes: 30,
          visitType: 'scheduled',
          reason: 'Revisão rápida',
          practitionerStaffId: 'staff_vet',
          practitionerName: 'Veterinário Responsável',
          unit: 'Clinica',
          specialty: 'Clínico geral',
          status: 'scheduled',
          conflicts: [],
          operational: {
            stage: 'scheduled',
            label: 'Agendado',
            source: 'appointment',
            updatedAt: '2026-04-12T08:10:00.000Z'
          },
          createdAt: '2026-04-12T08:10:00.000Z',
          updatedAt: '2026-04-12T08:10:00.000Z'
        },
        {
          id: 'appt-4',
          accountId: 'acc-1',
          patientId: 'pat-4',
          ownerId: 'owner-4',
          scheduledAt: '2026-04-12T09:10:00.000Z',
          endsAt: '2026-04-12T09:40:00.000Z',
          durationMinutes: 30,
          visitType: 'scheduled',
          reason: 'Vacinação',
          practitionerStaffId: 'staff_vet',
          practitionerName: 'Veterinário Responsável',
          unit: 'Clinica',
          specialty: 'Clínico geral',
          status: 'scheduled',
          conflicts: [],
          operational: {
            stage: 'scheduled',
            label: 'Agendado',
            source: 'appointment',
            updatedAt: '2026-04-12T08:20:00.000Z'
          },
          createdAt: '2026-04-12T08:20:00.000Z',
          updatedAt: '2026-04-12T08:20:00.000Z'
        }
      ]
    });
    mockOwnerGetById.mockImplementation(async (id: string) => ({
      id,
      fullName: ({ 'owner-1': 'Maria Silva', 'owner-2': 'João Costa', 'owner-3': 'Ana Lima', 'owner-4': 'Paulo Reis' } as Record<string, string>)[id] || id
    }));
    mockPatientGetById.mockImplementation(async (id: string) => ({
      id,
      name: ({ 'pat-1': 'Rex', 'pat-2': 'Luna', 'pat-3': 'Mel', 'pat-4': 'Thor' } as Record<string, string>)[id] || id
    }));

    const wrapper = await mountPage();

    await flushPromises();

    expect(wrapper.findAll('.timeline-item--dense').length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain('+1 adicionais');
  });

  it('shows access empty state when the session lacks scheduling.read', async () => {
    mockApiRequest.mockResolvedValue({
      access: { permissionCodes: ['owners.read'] }
    });

    const wrapper = await mountPage();

    await flushPromises();

    expect(mockGetSchedulingOverview).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Acesso indisponível para agenda');
  });
});

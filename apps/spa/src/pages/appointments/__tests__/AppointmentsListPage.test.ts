import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import type { LocationQuery } from 'vue-router';
import { agendaContextKey, type AgendaContextMemory } from '../agendaContext';

enableAutoUnmount(afterEach);

const mockApiRequest = vi.fn();
const mockGetSchedulingOverview = vi.fn();
const mockCheckInQueue = vi.fn();
const mockNoShowQueueEntry = vi.fn();
const mockCancelAppointment = vi.fn();
const mockOwnerGetById = vi.fn();
const mockPatientGetById = vi.fn();
const mockServicesList = vi.fn();
const mockRouterPush = vi.fn();
const mockRoute = reactive<{ path: string; query: LocationQuery }>({ path: '/appointments', query: {} });
const mockRouterReplace = vi.fn();

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    apiRequest: mockApiRequest
  };
});

vi.mock('@/services/scheduling', () => ({
  getSchedulingOverview: (...args: unknown[]) => mockGetSchedulingOverview(...args),
  checkInQueue: (...args: unknown[]) => mockCheckInQueue(...args),
  noShowQueueEntry: (...args: unknown[]) => mockNoShowQueueEntry(...args)
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
  useRoute: () => mockRoute,
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('AppointmentsListPage', () => {
  const mountPage = async (memory: AgendaContextMemory = { current: null }) => {
    const AppointmentsListPage = (await import('../AppointmentsListPage.vue')).default;
    return mount(AppointmentsListPage, {
      global: {
        provide: { [agendaContextKey as symbol]: memory },
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
    mockRoute.path = '/appointments';
    mockRoute.query = {};
    mockRouterReplace.mockImplementation(async ({ query }: { query: LocationQuery }) => { mockRoute.query = query; });
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
    mockNoShowQueueEntry.mockResolvedValue({});
    mockCancelAppointment.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads a structural deep link and ignores free text query parameters', async () => {
    mockRoute.query = { agendaDate: '2026-04-15', agendaView: 'week', agendaStatus: 'checked_in', agendaProfessional: 'staff_vet', agendaService: 'svc-1', agendaUnit: 'Clinica', agendaSpecialty: 'Clínico geral', agendaMarker: 'Vacina', search: 'private text', unrelated: 'keep' };
    const wrapper = await mountPage();
    await flushPromises();
    expect(mockGetSchedulingOverview).toHaveBeenCalledTimes(1);
    expect(mockGetSchedulingOverview.mock.calls[0][0]).toMatchObject({ referenceDate: '2026-04-15T00:00:00.000Z', viewMode: 'week', statuses: ['checked_in'], practitionerStaffId: 'staff_vet', serviceId: 'svc-1', unit: 'Clinica', specialty: 'Clínico geral', search: undefined });
    expect(wrapper.find('#markerFilter').element).toHaveProperty('value', 'Vacina');
    expect(wrapper.find('#search').element).toHaveProperty('value', '');
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    await flushPromises();
    expect(mockGetSchedulingOverview).toHaveBeenCalledTimes(2);
    expect(mockRoute.query).toMatchObject({ unrelated: 'keep', agendaDate: '2026-04-22', agendaView: 'week' });
  });

  it('sanitizes free-text already present in a deep-link URL on first render', async () => {
    mockRoute.query = {
      agendaDate: '2026-04-15',
      agendaView: 'list',
      search: 'nome privado',
      clientSearch: 'tutor privado',
      unrelated: 'keep'
    };
    const wrapper = await mountPage();
    await flushPromises();

    expect(mockRoute.query).toMatchObject({
      agendaDate: '2026-04-15',
      agendaView: 'list',
      unrelated: 'keep'
    });
    expect(mockRoute.query.search).toBeUndefined();
    expect(mockRoute.query.clientSearch).toBeUndefined();
    expect(wrapper.find('#search').element).toHaveProperty('value', '');
    expect(wrapper.find('#clientFilter').element).toHaveProperty('value', '');
  });

  it('keeps structural context synchronized when opened through an Agenda alias', async () => {
    mockRoute.path = '/agenda';
    mockRoute.query = { agendaDate: '2026-04-15', agendaView: 'list' };
    const wrapper = await mountPage();
    await flushPromises();

    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    await flushPromises();

    expect(mockRoute.path).toBe('/agenda');
    expect(mockRoute.query).toMatchObject({ agendaDate: '2026-04-16', agendaView: 'list' });
  });

  it('restores workspace context on return and never serializes typed text', async () => {
    const memory: AgendaContextMemory = { current: null };
    const wrapper = await mountPage(memory);
    await flushPromises();
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    await wrapper.find('#clientFilter').setValue('Maria particular');
    await wrapper.find('#search').setValue('Rex particular');
    await flushPromises();
    expect(JSON.stringify(mockRoute.query)).not.toContain('particular');
    expect(memory.current).toMatchObject({ date: '2026-04-13', clientSearch: 'Maria particular', search: 'Rex particular' });
    wrapper.unmount();
    mockRoute.query = {};
    const returned = await mountPage(memory);
    await flushPromises();
    expect(returned.find('#clientFilter').element).toHaveProperty('value', 'Maria particular');
    expect(mockGetSchedulingOverview.mock.calls.at(-1)?.[0]).toMatchObject({ referenceDate: '2026-04-13T00:00:00.000Z', search: 'Rex particular' });
  });

  it('restores external query changes exactly once and keeps row focus identity stable', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('.agenda-appointment-row').attributes('data-focus-key')).toBe('appointment-appt-1');
    mockRouterReplace.mockClear();
    mockGetSchedulingOverview.mockResolvedValueOnce({ ...overviewPayload, items: [{ ...overviewPayload.items[0], scheduledAt: '2026-04-16T09:00:00.000Z' }] });
    mockRoute.query = { agendaDate: '2026-04-16', agendaView: 'list' };
    await flushPromises();
    expect(mockGetSchedulingOverview).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.mini-calendar__day--selected').attributes('aria-label')).toBe('Selecionar 2026-04-16');
    expect(wrapper.find('.agenda-appointment-row time').attributes('datetime')).toBe('2026-04-16T09:00:00.000Z');
    mockRoute.query = { agendaDate: '2026-04-12', agendaView: 'list' };
    await flushPromises();
    expect(mockGetSchedulingOverview).toHaveBeenCalledTimes(3);
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it('does not rewrite the destination URL while leaving the agenda', async () => {
    const memory: AgendaContextMemory = { current: null };
    const wrapper = await mountPage(memory);
    await flushPromises();
    mockRouterReplace.mockClear();
    mockRoute.path = '/queue';
    mockRoute.query = { agendaDate: '2026-04-20', agendaView: 'week' };
    await flushPromises();
    expect(mockGetSchedulingOverview).toHaveBeenCalledTimes(1);
    expect(mockRouterReplace).not.toHaveBeenCalled();
    wrapper.unmount();
    expect(memory.current?.date).toBe('2026-04-12');
  });

  it('reloads structural URL context with free text reset in a fresh workspace', async () => {
    mockRoute.query = { agendaDate: '2026-04-17', agendaView: 'list' };
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('#search').setValue('private search');
    await wrapper.find('#clientFilter').setValue('private client');
    await flushPromises();
    wrapper.unmount();
    const reloaded = await mountPage();
    await flushPromises();
    expect(reloaded.find('#search').element).toHaveProperty('value', '');
    expect(reloaded.find('#clientFilter').element).toHaveProperty('value', '');
    expect(mockGetSchedulingOverview.mock.calls.at(-1)?.[0].referenceDate).toBe('2026-04-17T00:00:00.000Z');
  });

  it('renders the Vetus-like agenda board and professional column', async () => {
    const wrapper = await mountPage();

    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Criar agendamento');
    expect(wrapper.text()).toContain('Veterinário Responsável');
    expect(wrapper.text()).toContain('Intervalo operacional');
    expect(wrapper.text()).toContain('Em triagem');
    expect(wrapper.text()).toContain('Realizar check-in no horário');
    expect(wrapper.text()).toContain('Acompanhar atendimento');
    expect(wrapper.text()).toContain('Ver fila');
    expect(wrapper.text()).toContain('Tutor');
    expect(wrapper.text()).toContain('Filtrar por...');
    expect(wrapper.text()).toContain('Status:');
    expect(wrapper.text()).toContain('Pesquisar Profissional');
    expect(wrapper.text()).toContain('Marcador');
    expect(wrapper.text()).toContain('Hoje');
    expect(wrapper.text()).toContain('Mês');
    expect(wrapper.text()).toContain('Semana');
    expect(wrapper.text()).toContain('Dia');
    expect(wrapper.text()).toContain('Legenda operacional');
    expect(wrapper.text()).toContain('Folga');
    expect(wrapper.text()).toContain('Aberto');
    expect(wrapper.text()).toContain('Confirmado');
    expect(wrapper.text()).toContain('Executado');
    expect(wrapper.text()).toContain('Não compareceu');
    expect(wrapper.text()).toContain('Vacina');
    expect(wrapper.text()).toContain('Vermífugo');
    expect(wrapper.text()).toContain('Retorno');
  });

  it('defaults to a complete chronological list with native detail buttons', async () => {
    mockGetSchedulingOverview.mockResolvedValue({ ...overviewPayload, items: [...overviewPayload.items].reverse() });
    const wrapper = await mountPage();
    await flushPromises();
    const rows = wrapper.findAll('.agenda-appointment-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].element.tagName).toBe('BUTTON');
    expect(rows[0].attributes('type')).toBe('button');
    expect(rows[0].text()).toContain('Rex');
    expect(rows[0].text()).toContain('Maria Silva');
    expect(rows[0].text()).toContain('12/04/2026');
    expect(rows[1].text()).toContain('Luna');
    expect(rows[1].text()).toContain('Em triagem');
    expect(wrapper.find('.time-matrix').exists()).toBe(false);
    expect(wrapper.find('.app-page-header__context').exists()).toBe(false);
    expect(wrapper.findAll('.agenda-grid-summary')).toHaveLength(1);
    expect(wrapper.find('.agenda-grid-summary').text()).toContain('Horários disponíveis');
    expect(mockGetSchedulingOverview.mock.calls.at(-1)?.[0].viewMode).toBe('day');
    await rows[1].trigger('click');
    await flushPromises();
    expect(wrapper.find('.appointment-details-card--from-agenda').exists()).toBe(true);
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('keeps header actions and the operational next step accessible', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    const header = wrapper.find('.app-page-header');
    expect(header.exists()).toBe(true);
    expect(header.text()).toContain('Acompanhar check-ins');
    expect(header.text()).toContain('Abrir formulário completo');
    expect(
      header.findAll('a').some((link) => link.attributes('href') === '/queue')
    ).toBe(true);
    const initialCalls = mockGetSchedulingOverview.mock.calls.length;
    await header.findAll('button').find((button) => button.text() === 'Atualizar')!.trigger('click');
    await flushPromises();
    expect(mockGetSchedulingOverview.mock.calls.length).toBe(initialCalls + 1);
  });

  it('retains every dense and late-night appointment in the list', async () => {
    mockGetSchedulingOverview.mockResolvedValue({ ...overviewPayload, items: Array.from({ length: 8 }, (_, index) => ({
      ...overviewPayload.items[0], id: `dense-${index}`, scheduledAt: `2026-04-12T23:0${index}:00.000Z`
    })).reverse() });
    const wrapper = await mountPage();
    await flushPromises();
    const times = wrapper.findAll('.agenda-appointment-row time');
    expect(times).toHaveLength(8);
    expect(times[0].attributes('datetime')).toBe('2026-04-12T23:00:00.000Z');
    expect(times[7].attributes('datetime')).toBe('2026-04-12T23:07:00.000Z');
  });

  it('preserves loading and failed overview feedback', async () => {
    let rejectOverview!: (reason: Error) => void;
    mockGetSchedulingOverview.mockReturnValue(new Promise((_, reject) => { rejectOverview = reject; }));
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('.page-loading').exists()).toBe(true);
    expect(wrapper.find('.agenda-appointment-list').exists()).toBe(false);
    rejectOverview(new Error('Agenda temporariamente indisponível'));
    await flushPromises();
    expect(wrapper.find('.page-loading').exists()).toBe(false);
    expect(wrapper.text()).toContain('Agenda temporariamente indisponível');
    expect(wrapper.text()).toContain('Agenda indisponível');
  });

  it.each(['resolve', 'reject'] as const)('ignores an old overview %s after the selected date finishes', async (outcome) => {
    const old = deferred<typeof overviewPayload>();
    const current = deferred<typeof overviewPayload>();
    mockGetSchedulingOverview.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    expect(mockGetSchedulingOverview.mock.calls.at(-1)?.[0].referenceDate).toBe('2026-04-13T00:00:00.000Z');
    current.resolve({ ...overviewPayload, items: [{ ...overviewPayload.items[1], scheduledAt: '2026-04-13T10:00:00.000Z' }] });
    await flushPromises();
    if (outcome === 'resolve') old.resolve(overviewPayload);
    else old.reject(new Error('obsolete failure'));
    await flushPromises();
    expect(wrapper.find('.mini-calendar__day--selected').attributes('aria-label')).toBe('Selecionar 2026-04-13');
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(1);
    expect(wrapper.find('.agenda-appointment-row time').attributes('datetime')).toBe('2026-04-13T10:00:00.000Z');
    expect(wrapper.text()).not.toContain('obsolete failure');
    expect(wrapper.find('.page-loading').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps the current loading state when an older request finishes first', async () => {
    const old = deferred<typeof overviewPayload>();
    const current = deferred<typeof overviewPayload>();
    mockGetSchedulingOverview.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    old.resolve(overviewPayload);
    await flushPromises();
    expect(wrapper.find('.page-loading').exists()).toBe(true);
    expect(mockOwnerGetById).not.toHaveBeenCalled();
    current.reject(new Error('current failure'));
    await flushPromises();
    expect(wrapper.find('.page-loading').exists()).toBe(false);
    expect(wrapper.text()).toContain('current failure');
    expect(wrapper.find('.agenda-appointment-row').exists()).toBe(false);
    wrapper.unmount();
  });

  it('does not render the previous day under a failed newly selected date', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    mockGetSchedulingOverview.mockRejectedValueOnce(new Error('new date failed'));
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('.agenda-appointment-row').exists()).toBe(false);
    expect(wrapper.text()).toContain('new date failed');
    wrapper.unmount();
  });

  it('renders appointments before optional services and names finish, then enriches names', async () => {
    const names = deferred<{ id: string; name: string }>();
    const services = deferred<[]>();
    mockPatientGetById.mockReturnValue(names.promise);
    mockServicesList.mockReturnValueOnce(services.promise);
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('.page-loading').exists()).toBe(false);
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(2);
    names.resolve({ id: 'pat-1', name: 'Nome carregado' });
    services.resolve([]);
    await flushPromises();
    expect(wrapper.find('.agenda-appointment-row').text()).toContain('Nome carregado');
    wrapper.unmount();
  });

  it.each(['resolve', 'reject'] as const)('ignores overview %s after unmount without starting name requests', async (outcome) => {
    const pending = deferred<typeof overviewPayload>();
    mockGetSchedulingOverview.mockReturnValueOnce(pending.promise);
    const wrapper = await mountPage();
    await flushPromises();
    wrapper.unmount();
    if (outcome === 'resolve') pending.resolve(overviewPayload);
    else pending.reject(new Error('after unmount'));
    await flushPromises();
    expect(mockOwnerGetById).not.toHaveBeenCalled();
    expect(mockPatientGetById).not.toHaveBeenCalled();
  });

  it('keeps newer filter results and names when older enrichment resolves last', async () => {
    const oldNames = deferred<{ id: string; name: string }>();
    mockPatientGetById.mockReturnValue(oldNames.promise);
    const wrapper = await mountPage();
    await flushPromises();
    mockPatientGetById.mockResolvedValue({ id: 'pat-1', name: 'Nome atual' });
    mockGetSchedulingOverview.mockResolvedValueOnce({ ...overviewPayload, items: [overviewPayload.items[0]] });
    await wrapper.find('#practitionerFilter').setValue('staff_vet');
    await flushPromises();
    expect(mockGetSchedulingOverview.mock.calls.at(-1)?.[0].practitionerStaffId).toBe('staff_vet');
    oldNames.resolve({ id: 'pat-1', name: 'Nome antigo' });
    await flushPromises();
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(1);
    expect(wrapper.find('.agenda-appointment-row').text()).toContain('Nome atual');
    expect(wrapper.text()).not.toContain('Nome antigo');
    wrapper.unmount();
  });

  it('invalidates pending responses when the current request loses permission', async () => {
    const { ApiError } = await import('@/services/api');
    const old = deferred<typeof overviewPayload>();
    mockGetSchedulingOverview.mockReturnValueOnce(old.promise).mockRejectedValueOnce(new ApiError('Forbidden', 403, 'Forbidden'));
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    await flushPromises();
    old.resolve(overviewPayload);
    await flushPromises();
    expect(wrapper.text()).toContain('Acesso indisponível para agenda');
    expect(wrapper.find('.page-loading').exists()).toBe(false);
    expect(mockPatientGetById).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('ignores a stale permission error after a newer overview succeeds', async () => {
    const { ApiError } = await import('@/services/api');
    const old = deferred<typeof overviewPayload>();
    mockGetSchedulingOverview.mockReturnValueOnce(old.promise);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.find('[aria-label="Próximo período"]').trigger('click');
    await flushPromises();
    old.reject(new ApiError('Forbidden', 403, 'Forbidden'));
    await flushPromises();
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('Acesso indisponível para agenda');
    wrapper.unmount();
  });

  it('does not start an overview when the session resolves after unmount', async () => {
    const session = deferred<{ access: { permissionCodes: string[] } }>();
    mockApiRequest.mockReturnValueOnce(session.promise);
    const wrapper = await mountPage();
    wrapper.unmount();
    session.resolve({ access: { permissionCodes: ['scheduling.read'] } });
    await flushPromises();
    expect(mockGetSchedulingOverview).not.toHaveBeenCalled();
  });

  it('filters the list and exposes an empty state without dropping matching appointments', async () => {
    const wrapper = await mountPage();
    await flushPromises();
    expect(wrapper.find('.agenda-filter-toggle').attributes('aria-expanded')).toBe('false');
    await wrapper.find('.agenda-filter-toggle').trigger('click');
    expect(wrapper.find('.agenda-filter-toggle').attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('.mini-calendar__day--selected').attributes('aria-current')).toBe('date');
    const scheduledStatus = wrapper.find('.status-chip');
    expect(scheduledStatus.attributes('aria-pressed')).toBe('false');
    await scheduledStatus.trigger('click');
    await flushPromises();
    expect(wrapper.find('.status-chip').attributes('aria-pressed')).toBe('true');
    await wrapper.find('#clientFilter').setValue('Maria');
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(1);
    expect(wrapper.find('.agenda-appointment-row').text()).toContain('Rex');
    await wrapper.find('#clientFilter').setValue('inexistente');
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(0);
    expect(wrapper.text()).toContain('Nenhum agendamento neste período');
    await wrapper.find('#clientFilter').setValue('');
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(2);
  });

  it('returns from calendar mode to the daily list and keeps read-only details accessible', async () => {
    mockApiRequest.mockResolvedValue({ access: { permissionCodes: ['scheduling.read'] } });
    const wrapper = await mountPage();
    await flushPromises();
    for (const label of ['Semana', 'Lista']) {
      await wrapper.findAll('button').find((button) => button.text().trim() === label)!.trigger('click');
      await flushPromises();
    }
    expect(wrapper.findAll('.agenda-appointment-row')).toHaveLength(2);
    expect(mockGetSchedulingOverview.mock.calls.at(-1)?.[0].viewMode).toBe('day');
    expect(wrapper.text()).not.toContain('Criar agendamento');
    expect(wrapper.text()).not.toContain('Abrir formulário completo');
    await wrapper.find('.agenda-appointment-row').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Ver detalhe completo');
    expect(wrapper.text()).not.toContain('Cancelar Agendamento');
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

  it('renders week and day appointment surfaces as native keyboard controls', async () => {
    const wrapper = await mountPage();

    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Semana')!.trigger('click');
    await flushPromises();

    const weekCard = wrapper.find('.timeline-item');
    expect(weekCard.attributes('role')).toBeUndefined();
    const weekSurface = weekCard.find('.timeline-item__surface');
    expect(weekSurface.attributes('type')).toBe('button');
    expect(weekSurface.attributes('aria-label')).toContain('Pressione Enter ou Espaço');
    await weekSurface.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Ver detalhe completo');

    await wrapper.findAll('button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
    await flushPromises();
    const dayCard = wrapper.find('.timeline-item');
    const daySurface = dayCard.find('.timeline-item__surface');
    expect(daySurface.attributes('type')).toBe('button');
    await daySurface.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Ver detalhe completo');
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
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
    await flushPromises();

    const emptySlot = wrapper.findAll('button').find((button) => button.text().trim() === 'Disponível');
    expect(emptySlot).toBeDefined();

    await emptySlot!.trigger('click');
    await flushPromises();

    expect(wrapper.find('.client-selector-stub').exists()).toBe(true);

    await wrapper.find('.select-client').trigger('click');
    await flushPromises();

    expect(wrapper.find('.quick-create-stub').exists()).toBe(true);
    expect(wrapper.find('.scheduled-at').text()).toBe('2026-04-12T00:00');
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

  it('blocks a competing no-show while check-in is still in flight', async () => {
    const checkIn = deferred<void>();
    mockCheckInQueue.mockReturnValueOnce(checkIn.promise);
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.findAll('.view-toggle__button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
    await flushPromises();

    const checkInButton = wrapper.findAll('button').find((button) => button.text().trim() === 'Check-in');
    const noShowButton = wrapper.findAll('button').find((button) => button.text().trim() === 'No-show');
    expect(checkInButton).toBeDefined();
    expect(noShowButton).toBeDefined();

    await checkInButton!.trigger('click');
    await flushPromises();
    expect(checkInButton!.attributes('disabled')).toBeDefined();
    expect(noShowButton!.attributes('disabled')).toBeDefined();

    await noShowButton!.trigger('click');
    expect(mockCancelAppointment).not.toHaveBeenCalled();

    checkIn.resolve();
    await flushPromises();
    expect(mockCheckInQueue).toHaveBeenCalledTimes(1);
  });

  it('uses the queue no-show contract for queue-linked appointments', async () => {
    mockGetSchedulingOverview.mockResolvedValue({
      ...overviewPayload,
      items: overviewPayload.items.map((item) =>
        item.id === 'appt-1'
          ? {
              ...item,
              operational: {
                ...item.operational,
                source: 'queue' as const,
                queueEntryId: 'queue-no-show-1',
                queueStatus: 'waiting' as const
              }
            }
          : item
      )
    });
    const wrapper = await mountPage();
    await flushPromises();
    await wrapper.findAll('.view-toggle__button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
    await flushPromises();

    const noShowButton = wrapper.findAll('button').find((button) => button.text().trim() === 'No-show');
    expect(noShowButton).toBeDefined();
    await noShowButton!.trigger('click');
    await flushPromises();

    expect(mockNoShowQueueEntry).toHaveBeenCalledWith('queue-no-show-1');
    expect(mockCancelAppointment).not.toHaveBeenCalled();
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

  it('keeps the operational grid visible when the selected day has no appointments', async () => {
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
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('0 agendados · 45 horários disponíveis');
    expect(wrapper.text()).toContain('00:00');
    expect(wrapper.text()).toContain('22:00');
    expect(wrapper.findAll('.time-matrix__empty-button').length).toBeGreaterThan(40);
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
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Dia')!.trigger('click');
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

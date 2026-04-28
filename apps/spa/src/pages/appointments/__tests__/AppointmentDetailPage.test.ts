import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockAppointment = {
  id: 'appt-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  scheduledAt: '2024-01-15T10:00:00Z',
  visitType: 'scheduled' as const,
  reason: 'Consulta de rotina',
  status: 'scheduled' as const,
  createdAt: '2024-01-14T10:00:00Z',
  updatedAt: '2024-01-14T10:00:00Z'
};

const mockGetByIdFn = vi.fn().mockResolvedValue(mockAppointment);
const mockCancelFn = vi.fn().mockResolvedValue(mockAppointment);
const mockStartEncounterFn = vi.fn().mockResolvedValue({ id: 'enc-1' });
const mockPatientGetById = vi.fn().mockResolvedValue({
  id: 'pat-1',
  accountId: 'acc-1',
  name: 'Rex',
  species: 'canine',
  breed: 'SRD',
  sex: 'male',
  primaryOwnerId: 'owner-1',
  status: 'active',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
});
const mockEncounterList = vi.fn().mockResolvedValue([]);
const mockGetPatientName = vi.fn().mockResolvedValue('Rex');
const mockGetOwnerName = vi.fn().mockResolvedValue('Joao Silva');
const mockGetOwnerById = vi.fn().mockResolvedValue({
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'Joao Silva',
  contacts: [
    { label: 'WhatsApp', value: '(11) 98888-2222', type: 'whatsapp' as const, primary: true }
  ],
  financialResponsible: true,
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
});
const mockRouterPush = vi.fn();

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    get getById() {
      return mockGetByIdFn;
    },
    get cancel() {
      return mockCancelFn;
    },
    get startEncounter() {
      return mockStartEncounterFn;
    }
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get getById() {
      return mockPatientGetById;
    }
  }
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
    get list() {
      return mockEncounterList;
    }
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    get getById() {
      return mockGetOwnerById;
    }
  }
}));

vi.mock('@/composables/useEntityCache', () => ({
  useEntityCache: () => ({
    getPatientName: mockGetPatientName,
    getOwnerName: mockGetOwnerName,
    getUserName: vi.fn().mockResolvedValue(''),
    preloadUserNames: vi.fn().mockResolvedValue(undefined),
    loading: new Set()
  })
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'appt-1' },
    path: '/appointments/appt-1'
  }),
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('AppointmentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdFn.mockResolvedValue(mockAppointment);
    mockCancelFn.mockResolvedValue(mockAppointment);
    mockStartEncounterFn.mockResolvedValue({ id: 'enc-1' });
    mockPatientGetById.mockResolvedValue({
      id: 'pat-1',
      accountId: 'acc-1',
      name: 'Rex',
      species: 'canine',
      breed: 'SRD',
      sex: 'male',
      primaryOwnerId: 'owner-1',
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
    mockEncounterList.mockResolvedValue([]);
    mockGetPatientName.mockResolvedValue('Rex');
    mockGetOwnerName.mockResolvedValue('Joao Silva');
    mockGetOwnerById.mockResolvedValue({
      id: 'owner-1',
      accountId: 'acc-1',
      fullName: 'Joao Silva',
      contacts: [
        { label: 'WhatsApp', value: '(11) 98888-2222', type: 'whatsapp', primary: true }
      ],
      financialResponsible: true,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    });
    mockRouterPush.mockResolvedValue(undefined);
    history.replaceState({}, '', '/');
  });

  it('renders the page title', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Agendamento');
  });

  it('shows loading state when appointment is not yet loaded', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    expect(wrapper.text()).toContain('Carregando');
    expect(wrapper.find('.page-loading').exists()).toBe(true);
  });

  it('shows error state when API fails to load appointment', async () => {
    mockGetByIdFn.mockRejectedValue(new Error('Not found'));

    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage, {
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
    expect(wrapper.text()).toContain('Carregando ou agendamento');
  });

  it('renders appointment details when loaded', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Consulta de rotina');
  });

  it('shows status badge with correct label', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Agendado');
  });

  it('shows visit type label', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Agendado');
  });

  it('shows cancel button for scheduled appointments', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const cancelBtn = wrapper.findAll('button').find((b) => b.text().includes('Cancelar'));
    expect(cancelBtn).toBeTruthy();
  });

  it('does not show cancel button for completed appointments', async () => {
    mockGetByIdFn.mockResolvedValue({ ...mockAppointment, status: 'completed' });

    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancelar Agendamento'));
    expect(cancelBtn).toBeFalsy();
  });

  it('cancels appointment when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const freshAppt = { ...mockAppointment, status: 'scheduled' as const };
    mockGetByIdFn.mockResolvedValue(freshAppt);
    mockCancelFn.mockResolvedValue(freshAppt);

    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancelar Agendamento'));
    await cancelBtn!.trigger('click');

    await flushPromises();
    expect(mockCancelFn).toHaveBeenCalledWith('appt-1');
    expect(wrapper.text()).toContain('Cancelado');
  });

  it('shows error when cancel fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockCancelFn.mockRejectedValue(new Error('Erro ao cancelar'));

    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const cancelBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cancelar Agendamento'));
    expect(cancelBtn).toBeTruthy();
    await cancelBtn!.trigger('click');

    await flushPromises();
    expect(alertMock).toHaveBeenCalledWith('Erro ao cancelar');

    alertMock.mockRestore();
  });

  it('opens confirmation before starting encounter', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const startBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Iniciar Atendimento'));
    expect(startBtn).toBeTruthy();

    await startBtn!.trigger('click');
    await flushPromises();

    expect(mockStartEncounterFn).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Confirmar início do atendimento');
    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.text()).toContain('Rex');
    expect(wrapper.text()).toContain('Ativo');
    expect(wrapper.text()).toContain('Será criado novo atendimento');
  });

  it('cancels start encounter confirmation without calling the backend', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const startBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Iniciar Atendimento'));
    await startBtn!.trigger('click');
    await flushPromises();

    const cancelConfirmBtn = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Cancelar');
    expect(cancelConfirmBtn).toBeTruthy();
    await cancelConfirmBtn!.trigger('click');
    await flushPromises();

    expect(mockStartEncounterFn).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('Confirmar início do atendimento');
  });

  it('starts encounter only after confirmation', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const startBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Iniciar Atendimento'));
    await startBtn!.trigger('click');
    await flushPromises();

    const confirmBtn = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Confirmar');
    expect(confirmBtn).toBeTruthy();
    await confirmBtn!.trigger('click');
    await flushPromises();

    expect(mockStartEncounterFn).toHaveBeenCalledWith('appt-1');
    expect(mockRouterPush).toHaveBeenCalledWith('/encounters/enc-1');
  });

  it('warns when the patient has an active encounter that may be reused', async () => {
    mockEncounterList.mockResolvedValue([
      {
        id: 'enc-active-1',
        accountId: 'acc-1',
        patientId: 'pat-1',
        ownerId: 'owner-1',
        visitType: 'scheduled',
        status: 'in_care',
        origin: 'schedule',
        reason: 'Consulta em andamento',
        openedAt: '2024-01-15T09:00:00Z',
        createdByUserId: 'usr-1',
        updatedAt: '2024-01-15T09:30:00Z'
      }
    ]);

    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    const startBtn = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Iniciar Atendimento'));
    await startBtn!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Será reutilizado atendimento existente');
    expect(wrapper.text()).toContain('enc-acti');
  });

  it('shows back link to appointments list', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage, {
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
    const backLink = wrapper.findAll('a').find((a) => a.text() === 'Voltar');
    expect(backLink).toBeTruthy();
    expect(backLink!.attributes('href')).toBe('/appointments');
  });

  it('shows a WhatsApp confirmation link when the tutor has a WhatsApp contact', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage, {
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
    const whatsappLink = wrapper
      .findAll('a')
      .find((a) => a.text().includes('Abrir WhatsApp'));
    expect(whatsappLink).toBeTruthy();
    const href = whatsappLink!.attributes('href') ?? '';
    expect(href).toContain('wa.me/11988882222');
    expect(decodeURIComponent(href)).toContain('Confirmamos o agendamento de Rex');
  });

  it('shows administrative info (created/updated dates)', async () => {
    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Criado em');
    expect(wrapper.text()).toContain('Atualizado em');
  });

  it('loads appointment from history state when available', async () => {
    history.replaceState({ appointment: mockAppointment }, '', '/');

    const AppointmentDetailPage = (await import('../AppointmentDetailPage.vue')).default;
    const wrapper = mount(AppointmentDetailPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Rex');
    expect(mockGetByIdFn).not.toHaveBeenCalled();

    history.replaceState({}, '', '/');
  });
});

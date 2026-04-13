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

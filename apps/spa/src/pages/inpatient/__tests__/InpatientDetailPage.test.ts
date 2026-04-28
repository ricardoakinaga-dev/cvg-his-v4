import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockStay = {
  id: 'stay-1',
  accountId: 'acc-1',
  encounterId: 'enc-1',
  patientId: 'pat-1',
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
    expect(wrapper.text()).toContain('Nenhuma evolução registrada.');
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
});

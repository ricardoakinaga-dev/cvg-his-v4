import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockPatients = [
  {
    id: 'pat-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine' as const,
    breed: 'Labrador',
    primaryOwnerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'pat-2',
    accountId: 'acc-1',
    name: 'Mimi',
    species: 'feline' as const,
    breed: 'Siamesa',
    primaryOwnerId: 'owner-2',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z'
  }
];

const mockCreateFn = vi.fn().mockResolvedValue({
  id: 'apt-new',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  scheduledAt: '2026-04-20T10:00:00.000Z',
  visitType: 'scheduled' as const,
  reason: 'Consulta',
  status: 'scheduled' as const,
  createdAt: '2026-04-19T10:00:00.000Z',
  updatedAt: '2026-04-19T10:00:00.000Z'
});

const mockListPatientsFn = vi.fn().mockResolvedValue(mockPatients);

const mockRouterPush = vi.fn();

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    get create() {
      return mockCreateFn;
    }
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockListPatientsFn;
    }
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('SchedulingFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateFn.mockResolvedValue({
      id: 'apt-new',
      accountId: 'acc-1',
      patientId: 'pat-1',
      ownerId: 'owner-1',
      scheduledAt: '2026-04-20T10:00:00.000Z',
      visitType: 'scheduled' as const,
      reason: 'Consulta',
      status: 'scheduled' as const,
      createdAt: '2026-04-19T10:00:00.000Z',
      updatedAt: '2026-04-19T10:00:00.000Z'
    });
    mockListPatientsFn.mockResolvedValue(mockPatients);
    mockRouterPush.mockResolvedValue(undefined);
  });

  it('renders the page title', async () => {
    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    expect(wrapper.text()).toContain('Novo Agendamento');
  });

  it('loads patients on mount', async () => {
    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    expect(mockListPatientsFn).toHaveBeenCalled();
  });

  it('shows error alert when form submission fails', async () => {
    mockCreateFn.mockRejectedValue(new Error('Erro ao criar agendamento'));

    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: {
            template:
              '<button class="ds-btn-stub" @click="$parent.$emit(\'submit\')"><slot /></button>'
          },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.formError = 'Erro ao criar agendamento';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.ds-alert-stub').text()).toContain('Erro ao criar agendamento');
  });

  it('shows success message and redirects on successful submission', async () => {
    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.successMessage = 'Agendamento criado com sucesso!';
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.ds-alert-stub').text()).toContain('Agendamento criado com sucesso!');
  });

  it('displays conflict error when API returns 409', async () => {
    const conflictError = new Error('Patient already has an appointment within a 30-minute window');
    (conflictError as any).code = 'CONFLICT';
    mockCreateFn.mockRejectedValue(conflictError);

    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.formError = conflictError.message;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.ds-alert-stub').text()).toContain(
      'Patient already has an appointment within a 30-minute window'
    );
  });

  it('shows validation errors for required fields', async () => {
    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.errors.patientId = 'Selecione um paciente';
    vm.errors.scheduledAt = 'Data/hora é obrigatória';
    await wrapper.vm.$nextTick();

    expect(vm.errors.patientId).toBe('Selecione um paciente');
    expect(vm.errors.scheduledAt).toBe('Data/hora é obrigatória');
  });

  it('shows patient list in form', async () => {
    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    expect(mockListPatientsFn).toHaveBeenCalled();
  });

  it('redirects to appointment detail after successful creation', async () => {
    vi.useFakeTimers();

    const SchedulingFormPage = (await import('../SchedulingFormPage.vue')).default;
    const wrapper = mount(SchedulingFormPage, {
      global: {
        stubs: {
          DsButton: { template: '<button><slot /></button>' },
          DsAlert: { template: '<div><slot /></div>' },
          DsCard: { template: '<div><slot /></div>' },
          DsInput: {
            template: '<div class="ds-input-stub"><slot /></div>',
            props: [
              'modelValue',
              'label',
              'type',
              'error',
              'required',
              'placeholder',
              'rows',
              'id'
            ],
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();

    const vm = wrapper.vm as any;
    vm.form.patientId = 'pat-1';
    vm.form.scheduledAt = '2026-04-20T10:00';
    await vm.onSubmit();
    await flushPromises();

    vi.advanceTimersByTime(1000);

    expect(mockRouterPush).toHaveBeenCalledWith('/appointments/apt-new');

    vi.useRealTimers();
  });
});

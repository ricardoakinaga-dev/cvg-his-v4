import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockPatients = [
  {
    id: 'pat-1',
    accountId: 'acc-1',
    name: 'Rex',
    species: 'canine' as const,
    breed: 'Golden Retriever',
    sex: 'male' as const,
    size: 'large' as const,
    baseWeightKg: 30.5,
    birthDateApproximate: '2020-05-15',
    primaryOwnerId: 'owner-1',
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'pat-2',
    accountId: 'acc-1',
    name: 'Mimi',
    species: 'feline' as const,
    breed: '',
    sex: 'female' as const,
    size: 'small' as const,
    baseWeightKg: 4.2,
    birthDateApproximate: '',
    primaryOwnerId: 'owner-2',
    status: 'active' as const,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  }
];

const mockListFn = vi.fn().mockResolvedValue(mockPatients);
const mockCreateFn = vi.fn().mockResolvedValue({ id: 'appt-new' });
const mockRouterPush = vi.fn();

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockListFn;
    }
  }
}));

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    get create() {
      return mockCreateFn;
    }
  }
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('AppointmentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockPatients);
    mockCreateFn.mockResolvedValue({ id: 'appt-new' });
    mockRouterPush.mockResolvedValue(undefined);
  });

  it('renders the page title', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    expect(wrapper.text()).toContain('Novo Agendamento');
  });

  it('loads patient list on mount', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    expect(mockListFn).toHaveBeenCalled();
  });

  it('shows error when patient list fails to load', async () => {
    mockListFn.mockRejectedValue(new Error('Erro ao carregar lista de pacientes'));

    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    expect(wrapper.text()).toContain('Erro ao carregar lista de pacientes');
  });

  it('renders form fields', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    expect(wrapper.find('#scheduledAt').exists()).toBe(true);
    expect(wrapper.find('#visitType').exists()).toBe(true);
    expect(wrapper.find('#reason').exists()).toBe(true);
  });

  it('shows validation error when submitting without patient', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Selecione um paciente');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('shows validation error when submitting without date', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    const scheduledInput = wrapper.find('#scheduledAt');
    await scheduledInput.setValue('');
    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Data/hora');
    expect(wrapper.text()).toContain('obrigat');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('submits form successfully with valid data', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SearchSelect: {
            template:
              '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['id', 'modelValue', 'options', 'loading', 'placeholder'],
            emits: ['update:modelValue', 'change']
          }
        }
      }
    });

    await flushPromises();
    const patientInput = wrapper.find('#patientId');
    await patientInput.setValue('pat-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(mockCreateFn).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Agendamento criado com sucesso');
  });

  it('shows error alert when create fails', async () => {
    mockCreateFn.mockRejectedValue(new Error('Conflito de horario'));

    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SearchSelect: {
            template:
              '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['id', 'modelValue', 'options', 'loading', 'placeholder'],
            emits: ['update:modelValue', 'change']
          }
        }
      }
    });

    await flushPromises();
    const patientInput = wrapper.find('#patientId');
    await patientInput.setValue('pat-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Conflito de horario');
  });

  it('navigates to detail page after successful creation', async () => {
    vi.useFakeTimers();
    mockCreateFn.mockResolvedValue({ id: 'appt-new-123' });

    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SearchSelect: {
            template:
              '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['id', 'modelValue', 'options', 'loading', 'placeholder'],
            emits: ['update:modelValue', 'change']
          }
        }
      }
    });

    await flushPromises();
    const patientInput = wrapper.find('#patientId');
    await patientInput.setValue('pat-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    vi.advanceTimersByTime(1000);
    expect(mockRouterPush).toHaveBeenCalledWith('/appointments/appt-new-123');

    vi.useRealTimers();
  });

  it('shows cancel link back to appointments', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    const cancelLink = wrapper.findAll('a').find((a) => a.text() === 'Cancelar');
    expect(cancelLink).toBeTruthy();
    expect(cancelLink!.attributes('href')).toBe('/appointments');
  });

  it('shows visit type options', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
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
    const select = wrapper.find('#visitType');
    const options = select.findAll('option');
    expect(options).toHaveLength(3);
    expect(options[0].text()).toContain('Agendado');
    expect(options[1].text()).toContain('Walk-in');
    expect(options[2].text()).toContain('Retorno');
  });

  it('disables submit button while submitting', async () => {
    let resolveCreate: (value: any) => void;
    const slowCreate = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateFn.mockImplementation(() => slowCreate);

    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SearchSelect: {
            template:
              '<input :id="id" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
            props: ['id', 'modelValue', 'options', 'loading', 'placeholder'],
            emits: ['update:modelValue', 'change']
          }
        }
      }
    });

    await flushPromises();
    const patientInput = wrapper.find('#patientId');
    await patientInput.setValue('pat-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('Salvando');

    resolveCreate!({ id: 'appt-new' });
    await flushPromises();
  });
});

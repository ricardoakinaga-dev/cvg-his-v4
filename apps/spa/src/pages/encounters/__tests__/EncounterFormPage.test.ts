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
const mockCreateFn = vi.fn().mockResolvedValue({ id: 'enc-new' });
const mockRouterPush = vi.fn();

vi.mock('@/services/patient', () => ({
  patientService: {
    get list() {
      return mockListFn;
    }
  }
}));

vi.mock('@/services/encounter', () => ({
  encounterService: {
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

describe('EncounterFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFn.mockResolvedValue(mockPatients);
    mockCreateFn.mockResolvedValue({ id: 'enc-new' });
    mockRouterPush.mockResolvedValue(undefined);
    history.replaceState({}, '', '/');
  });

  it('renders the page title', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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
    expect(wrapper.text()).toContain('Abrir Atendimento');
  });

  it('loads patient list on mount', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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
    expect(wrapper.find('#visitType').exists()).toBe(true);
    expect(wrapper.find('#origin').exists()).toBe(true);
    expect(wrapper.find('#reason').exists()).toBe(true);
  });

  it('shows validation error when patient is not selected', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

  it('shows validation error when reason is empty', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

    expect(wrapper.text()).toContain('Motivo');
    expect(wrapper.text()).toContain('obrigat');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('submits form successfully with valid data', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

    const reasonTextarea = wrapper.find('#reason');
    await reasonTextarea.setValue('Febre alta e vomito');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(mockCreateFn).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Atendimento aberto com sucesso');
  });

  it('preserves appointmentId from query params when creating encounter', async () => {
    history.replaceState({}, '', '/encounters/new?appointmentId=appt-1&patientId=pat-1&ownerId=owner-1');

    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SearchSelect: {
            template:
              '<input id="patientId" :value="modelValue" @input="select($event.target.value)" />',
            props: ['modelValue', 'options'],
            emits: ['update:modelValue', 'change'],
            methods: {
              select(value: string) {
                this.$emit('update:modelValue', value);
                this.$emit('change', this.options.find((option: any) => option.value === value) ?? null);
              }
            }
          }
        }
      }
    });

    await flushPromises();
    await wrapper.find('#patientId').setValue('pat-1');
    const reasonTextarea = wrapper.find('#reason');
    await reasonTextarea.setValue('Consulta agendada');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(mockCreateFn).toHaveBeenCalledWith({
      patientId: 'pat-1',
      ownerId: 'owner-1',
      appointmentId: 'appt-1',
      visitType: 'scheduled',
      origin: 'schedule',
      reason: 'Consulta agendada'
    });
  });

  it('allows canonical prefixed patient and owner identifiers when creating an encounter', async () => {
    mockListFn.mockResolvedValue([
      ...mockPatients,
      {
        id: 'patient_mogeb6qv_5b0gq64z',
        accountId: 'acc-1',
        name: 'DANI',
        species: 'canine' as const,
        breed: 'SRD',
        sex: 'female' as const,
        primaryOwnerId: 'owner_ricardo_akinaga',
        status: 'active' as const,
        createdAt: '2026-02-27T00:00:00Z',
        updatedAt: '2026-02-27T00:00:00Z'
      }
    ]);
    history.replaceState(
      {},
      '',
      '/encounters/new?patientId=patient_mogeb6qv_5b0gq64z&ownerId=owner_ricardo_akinaga'
    );

    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to"><slot /></a>',
            props: ['to']
          },
          SearchSelect: {
            template:
              '<input id="patientId" :value="modelValue" @input="select($event.target.value)" />',
            props: ['modelValue', 'options'],
            emits: ['update:modelValue', 'change'],
            methods: {
              select(value: string) {
                this.$emit('update:modelValue', value);
                this.$emit('change', this.options.find((option: any) => option.value === value) ?? null);
              }
            }
          }
        }
      }
    });

    await flushPromises();
    await wrapper.find('#patientId').setValue('patient_mogeb6qv_5b0gq64z');
    await wrapper.find('#reason').setValue('Consulta');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).not.toContain('identificador legado do Vetus');
    expect(mockCreateFn).toHaveBeenCalledWith({
      patientId: 'patient_mogeb6qv_5b0gq64z',
      ownerId: 'owner_ricardo_akinaga',
      visitType: 'walk_in',
      origin: 'reception',
      reason: 'Consulta'
    });
  });

  it('shows error alert when create fails', async () => {
    mockCreateFn.mockRejectedValue(new Error('Paciente ja em atendimento'));

    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

    const reasonTextarea = wrapper.find('#reason');
    await reasonTextarea.setValue('Febre alta');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Paciente ja em atendimento');
  });

  it('navigates to detail page after successful creation', async () => {
    vi.useFakeTimers();
    mockCreateFn.mockResolvedValue({ id: 'enc-new-456' });

    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

    const reasonTextarea = wrapper.find('#reason');
    await reasonTextarea.setValue('Consulta de rotina');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    vi.advanceTimersByTime(1000);
    expect(mockRouterPush).toHaveBeenCalledWith('/encounters/enc-new-456');

    vi.useRealTimers();
  });

  it('shows cancel link back to encounters list', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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
    expect(cancelLink!.attributes('href')).toBe('/encounters');
  });

  it('shows visit type options', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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
    expect(options[0].text()).toContain('Walk-in');
    expect(options[1].text()).toContain('Agendado');
    expect(options[2].text()).toContain('Retorno');
  });

  it('shows origin options', async () => {
    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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
    const select = wrapper.find('#origin');
    const options = select.findAll('option');
    expect(options).toHaveLength(3);
    expect(options[0].text()).toContain('Recep');
    expect(options[1].text()).toContain('Agendamento');
    expect(options[2].text()).toContain('Retorno');
  });

  it('disables submit button while submitting', async () => {
    let resolveCreate: (value: any) => void;
    const slowCreate = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateFn.mockImplementation(() => slowCreate);

    const EncounterFormPage = (await import('../EncounterFormPage.vue')).default;
    const wrapper = mount(EncounterFormPage, {
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

    const reasonTextarea = wrapper.find('#reason');
    await reasonTextarea.setValue('Febre alta');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('Abrindo');

    resolveCreate!({ id: 'enc-new' });
    await flushPromises();
  });
});

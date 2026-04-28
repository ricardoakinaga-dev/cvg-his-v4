import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockOwners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Joao Silva',
    documentId: '123.456.789-00',
    contacts: [
      { label: 'Celular', type: 'phone' as const, value: '(11) 99999-1111', primary: true }
    ],
    financialResponsible: true,
    administrativeNotes: '',
    status: 'active' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'Maria Santos',
    documentId: '',
    contacts: [
      { label: 'WhatsApp', type: 'whatsapp' as const, value: '(11) 88888-2222', primary: true }
    ],
    financialResponsible: false,
    administrativeNotes: 'Cliente especial',
    status: 'inactive' as const,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z'
  }
];

const mockPatient = {
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
};

const mockOwnerListFn = vi.fn().mockResolvedValue(mockOwners);
const mockPatientGetByIdFn = vi.fn().mockResolvedValue(mockPatient);
const mockPatientCreateFn = vi.fn().mockResolvedValue({ id: 'pat-new' });
const mockPatientUpdateFn = vi.fn().mockResolvedValue(mockPatient);
const mockBreedListFn = vi.fn().mockResolvedValue([
  {
    id: 'breed-1',
    accountId: 'acc-1',
    name: 'Golden Retriever',
    code: 'CAN-GOLD',
    species: 'canine',
    description: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]);
const mockAnimalSpeciesListFn = vi.fn().mockResolvedValue([
  {
    id: 'species-1',
    accountId: 'acc-1',
    name: 'Canino',
    code: 'CANINE',
    systemCode: 'canine',
    description: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'species-2',
    accountId: 'acc-1',
    name: 'Felino',
    code: 'FELINE',
    systemCode: 'feline',
    description: null,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
]);
const mockRouterPush = vi.fn();
const mockRouteParams = vi.fn().mockReturnValue({ params: {}, path: '/patients/new' });

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() {
      return mockOwnerListFn;
    }
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    get getById() {
      return mockPatientGetByIdFn;
    },
    get create() {
      return mockPatientCreateFn;
    },
    get update() {
      return mockPatientUpdateFn;
    }
  }
}));

vi.mock('@/services/breeds', () => ({
  breedsService: {
    get list() {
      return mockBreedListFn;
    }
  }
}));

vi.mock('@/services/species', async () => {
  const actual = await vi.importActual<typeof import('@/services/species')>('@/services/species');
  return {
    ...actual,
    animalSpeciesService: {
      get list() {
        return mockAnimalSpeciesListFn;
      }
    }
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => mockRouteParams(),
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('PatientFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOwnerListFn.mockResolvedValue(mockOwners);
    mockPatientGetByIdFn.mockResolvedValue(mockPatient);
    mockPatientCreateFn.mockResolvedValue({ id: 'pat-new' });
    mockPatientUpdateFn.mockResolvedValue(mockPatient);
    mockBreedListFn.mockResolvedValue([
      {
        id: 'breed-1',
        accountId: 'acc-1',
        name: 'Golden Retriever',
        code: 'CAN-GOLD',
        species: 'canine',
        description: null,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'breed-yorkshire-terrier',
        accountId: 'acc-1',
        name: 'Yorkshire Terrier',
        code: 'CAN-YORKSHIRE-TERRIER',
        species: 'canine',
        description: 'Raça canina seedada para paridade Vetus',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);
    mockAnimalSpeciesListFn.mockResolvedValue([
      {
        id: 'species-1',
        accountId: 'acc-1',
        name: 'Canino',
        code: 'CANINE',
        systemCode: 'canine',
        description: null,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'species-2',
        accountId: 'acc-1',
        name: 'Felino',
        code: 'FELINE',
        systemCode: 'feline',
        description: null,
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
    ]);
    mockRouterPush.mockResolvedValue(undefined);
    mockRouteParams.mockReturnValue({ params: {}, path: '/patients/new' });
  });

  it('renders the page title for new patient', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(wrapper.text()).toContain('Cadastrar Novo Animal');
  });

  it('renders the page title for edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(wrapper.text()).toContain('Editar Animal');
  });

  it('renders form fields', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(wrapper.find('#name').exists()).toBe(true);
    expect(wrapper.find('#species').exists()).toBe(true);
    expect(wrapper.find('#sex').exists()).toBe(true);
    expect(wrapper.find('#breed').exists()).toBe(true);
    expect(wrapper.find('#size').exists()).toBe(true);
    expect(wrapper.find('#baseWeightKg').exists()).toBe(true);
    expect(wrapper.find('#isNeutered').exists()).toBe(true);
    expect(wrapper.find('#microchip').exists()).toBe(true);
    expect(wrapper.find('#pedigreeNumber').exists()).toBe(true);
    expect(wrapper.find('#color').exists()).toBe(true);
    expect(wrapper.find('#chronicDisease').exists()).toBe(true);
    expect(wrapper.find('#allergy').exists()).toBe(true);
    expect(wrapper.find('#temperament').exists()).toBe(true);
    expect(wrapper.find('#legacyVetusId').exists()).toBe(true);
    expect(wrapper.find('#originalCreatedAt').exists()).toBe(true);
    expect(wrapper.find('#generalNotes').exists()).toBe(true);
  });

  it('shows Yorkshire Terrier as a selectable seeded breed', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    await wrapper.find('#species').setValue('canine');
    await wrapper.vm.$nextTick();

    const breedOptions = wrapper.findAll('#breed option').map((option) => option.text());
    expect(breedOptions).toContain('Yorkshire Terrier');
  });

  it('loads owner list on mount', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(mockOwnerListFn).toHaveBeenCalled();
  });

  it('requires selecting a client before the new animal flow is ready to save', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toContain('Necessário vincular o animal a um Cliente');
    expect(wrapper.text()).toContain('Vincular Cliente');
    expect(wrapper.find('#ownerSearch').attributes('placeholder')).toBe('Buscar por Nome, CPF, E-mail ou ID');

    await wrapper.findAll('button.client-option')[0].trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Vincular Cliente')!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.find('.client-link-card').exists()).toBe(false);
  });

  it('shows error when owner list fails to load', async () => {
    mockOwnerListFn.mockRejectedValue(new Error('Erro ao carregar lista de tutores'));

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(wrapper.text()).toContain('Erro ao carregar lista de clientes');
  });

  it('shows validation error when name is empty', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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

    expect(wrapper.text()).toContain('Nome');
    expect(wrapper.text()).toContain('obrigat');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
  });

  it('shows validation error when species is not selected', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Rex');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Esp');
    expect(wrapper.text()).toContain('obrigat');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
  });

  it('shows validation error when sex is not selected', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Rex');

    const speciesSelect = wrapper.find('#species');
    await speciesSelect.setValue('canine');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Sexo');
    expect(wrapper.text()).toContain('obrigat');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
  });

  it('shows validation error when owner is not selected', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Rex');

    const speciesSelect = wrapper.find('#species');
    await speciesSelect.setValue('canine');

    const sexSelect = wrapper.find('#sex');
    await sexSelect.setValue('male');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('cliente');
    expect(wrapper.text()).toContain('respons');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
  });

  it('submits form successfully with valid data', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Rex');

    const speciesSelect = wrapper.find('#species');
    await speciesSelect.setValue('canine');

    const sexSelect = wrapper.find('#sex');
    await sexSelect.setValue('male');

    const ownerInput = wrapper.find('#primaryOwnerId');
    await ownerInput.setValue('owner-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(mockPatientCreateFn).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Animal cadastrado com sucesso');
  });

  it('shows error alert when create fails', async () => {
    mockPatientCreateFn.mockRejectedValue(new Error('Paciente ja existe'));

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Rex');

    const speciesSelect = wrapper.find('#species');
    await speciesSelect.setValue('canine');

    const sexSelect = wrapper.find('#sex');
    await sexSelect.setValue('male');

    const ownerInput = wrapper.find('#primaryOwnerId');
    await ownerInput.setValue('owner-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Paciente ja existe');
  });

  it('loads existing patient data in edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(mockPatientGetByIdFn).toHaveBeenCalledWith('pat-1');

    const nameInput = wrapper.find('#name') as any;
    expect(nameInput.element.value).toBe('Rex');
  });

  it('submits update in edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    await flushPromises();

    expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-1', expect.any(Object));
    expect(wrapper.text()).toContain('Animal atualizado com sucesso');
  });

  it('shows error when loading patient fails in edit mode', async () => {
    mockPatientGetByIdFn.mockRejectedValue(new Error('Paciente nao encontrado'));
    mockRouteParams.mockReturnValue({ params: { id: 'pat-999' }, path: '/patients/pat-999/edit' });

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(wrapper.text()).toContain('Paciente');
    expect(wrapper.text()).toContain('nao encontrado');
  });

  it('shows cancel link back to patients list', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    expect(cancelLink!.attributes('href')).toBe('/patients');
  });

  it('disables submit button while submitting', async () => {
    let resolveCreate: (value: any) => void;
    const slowCreate = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    mockPatientCreateFn.mockImplementation(() => slowCreate);

    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
            emits: ['update:modelValue']
          }
        }
      }
    });

    await flushPromises();
    const nameInput = wrapper.find('#name');
    await nameInput.setValue('Rex');

    const speciesSelect = wrapper.find('#species');
    await speciesSelect.setValue('canine');

    const sexSelect = wrapper.find('#sex');
    await sexSelect.setValue('male');

    const ownerInput = wrapper.find('#primaryOwnerId');
    await ownerInput.setValue('owner-1');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('Salvando');

    resolveCreate!({ id: 'pat-new' });
    await flushPromises();
  });

  it('shows species options', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    const select = wrapper.find('#species');
    const options = select.findAll('option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[1].text()).toContain('Canino');
    expect(options[2].text()).toContain('Felino');
  });

  it('shows status options including deceased', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
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
    const select = wrapper.find('#status');
    const options = select.findAll('option');
    expect(options).toHaveLength(3);
    expect(options[0].text()).toContain('Ativo');
    expect(options[1].text()).toContain('Inativo');
    expect(options[2].text()).toContain('Falecido');
  });
});

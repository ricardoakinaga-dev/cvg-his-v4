import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive, defineComponent } from 'vue';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createUnsavedChangesCoordinator, unsavedChangesCoordinatorKey } from '@/composables/unsavedChangesCoordinator';
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils';

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
const mockOwnerGetByIdFn = vi.fn();
const mockOwnerListPageFn = vi.fn();
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
let realRouting = false;
const mockRouterPush = vi.fn();
const mockRouteParams = vi.fn().mockReturnValue({ params: {}, path: '/patients/new' });

vi.mock('@/services/owner', () => ({
  ownerService: {
    get list() { return mockOwnerListFn; },
    get listPage() { return mockOwnerListPageFn; },
    get getById() { return mockOwnerGetByIdFn; }
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

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRoute: () => realRouting ? actual.useRoute() : mockRouteParams(),
    useRouter: () => realRouting ? actual.useRouter() : { push: mockRouterPush },
    onBeforeRouteLeave: (...args: Parameters<typeof actual.onBeforeRouteLeave>) => { if (realRouting) actual.onBeforeRouteLeave(...args); },
    onBeforeRouteUpdate: (...args: Parameters<typeof actual.onBeforeRouteUpdate>) => { if (realRouting) actual.onBeforeRouteUpdate(...args); }
  };
});

enableAutoUnmount(afterEach);
afterEach(() => { vi.useRealTimers(); });

async function mountForm() {
  const PatientFormPage = (await import('../PatientFormPage.vue')).default;
  const wrapper = mount(PatientFormPage, { global: { stubs: { RouterLink: { template: '<a :href="to"><slot /></a>', props: ['to'] } } } });
  await flushPromises();
  return wrapper;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function linkOwner(wrapper: Awaited<ReturnType<typeof mountForm>>, index = 0) {
  await wrapper.findAll('button.client-option')[index].trigger('click');
  await wrapper.findAll('button').find((button) => /^Vincular tutor$/.test(button.text()))!.trigger('click');
}

describe('PatientFormPage', () => {
  beforeEach(() => {
    realRouting = false;
    vi.clearAllMocks();
    mockOwnerListFn.mockResolvedValue(mockOwners);
    mockOwnerListPageFn.mockImplementation(async () => ({ items: await mockOwnerListFn() }));
    mockOwnerGetByIdFn.mockImplementation(async (id: string) => { const owner = mockOwners.find((item) => item.id === id); if (!owner) throw new Error('Tutor não encontrado'); return owner; });
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
    expect(wrapper.text()).toContain('Novo paciente');
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
    expect(wrapper.text()).toContain('Editar paciente');
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
    expect(wrapper.find('#ownerSearch').attributes('required')).toBeDefined();
    expect(wrapper.find('label[for="ownerSearch"]').text()).toContain('Tutor responsável');
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
          }
        }
      }
    });

    await flushPromises();

    expect(wrapper.text()).toMatch(/tutor/i);
    expect(wrapper.text()).toContain('Vincular tutor');
    expect(wrapper.find('#ownerSearch').attributes('placeholder')).toBe('Nome, documento ou contato');

    await linkOwner(wrapper);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Joao Silva');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Trocar tutor')).toBe(true);
    expect(wrapper.findAll('button.client-option')).toHaveLength(0);
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
    expect(wrapper.text()).toMatch(/Erro ao carregar.*(?:clientes|tutores)/i);
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

    expect(wrapper.text()).toMatch(/cliente|tutor/i);
    expect(wrapper.text()).toContain('respons');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
  });

  it('shows a navigable validation summary and focuses the first invalid field', async () => {
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const wrapper = mount(PatientFormPage, {
      attachTo: document.body,
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
    await wrapper.find('form').trigger('submit');

    const summary = wrapper.get('#patient-form-error-summary');
    expect(summary.attributes('aria-labelledby')).toBe('patient-form-error-summary-title');
    expect(wrapper.find('form').attributes('novalidate')).toBeDefined();
    expect(wrapper.find('form').attributes('aria-describedby')).toBe('patient-form-error-summary');
    expect(summary.findAll('a')).toHaveLength(4);
    expect(summary.text()).toContain('Nome do animal');
    expect(summary.text()).toContain('Tutor responsável');
    expect(document.activeElement).toBe(wrapper.find('#name').element);
    expect(wrapper.find('#ownerSearch').attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('#ownerSearch').attributes('aria-describedby')).toBe('ownerSearch-error');
    expect(wrapper.find('#ownerSearch').attributes('required')).toBeDefined();

    await summary.find('a[href="#sex"]').trigger('click');
    expect(document.activeElement).toBe(wrapper.find('#sex').element);
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

    await linkOwner(wrapper);

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

    await linkOwner(wrapper);

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
    expect(wrapper.text()).toContain('Não foi possível carregar o paciente');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Tentar novamente');
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

    await linkOwner(wrapper);

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

  it('shows the real inactive tutor status without silently forbidding the relationship', async () => {
    const wrapper = await mountForm();
    const candidate = wrapper.findAll('button.client-option').find((item) => item.text().includes('Maria Santos'))!;
    expect(candidate.text()).toContain('Inativo');
    expect(candidate.attributes('disabled')).toBeUndefined();
    await candidate.trigger('click');
    expect(candidate.attributes('aria-pressed')).toBe('true');
  });

  it('does not silently link an unknown owner from the route query', async () => {
    mockRouteParams.mockReturnValue({ params: {}, query: { ownerId: 'missing-owner' }, path: '/patients/new' });
    const wrapper = await mountForm();
    await wrapper.find('#name').setValue('Rex');
    await wrapper.find('#species').setValue('canine');
    await wrapper.find('#sex').setValue('male');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockOwnerGetByIdFn).toHaveBeenCalledWith('missing-owner');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
    expect(wrapper.text()).toMatch(/não encontrado|não foi possível|Erro/i);
  });

  it.each(['empty', 'failure'])('does not invent selectable species when the catalog is %s', async (mode) => {
    if (mode === 'empty') mockAnimalSpeciesListFn.mockResolvedValue([]);
    else mockAnimalSpeciesListFn.mockRejectedValue(new Error('Catálogo indisponível'));
    const wrapper = await mountForm();
    expect(wrapper.findAll('#species option').filter((option) => option.attributes('value'))).toHaveLength(0);
    expect(wrapper.text()).toMatch(/espécie/i);
  });

  it('never updates a patient whose edit record failed to load', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-missing' }, path: '/patients/pat-missing/edit' });
    mockPatientGetByIdFn.mockRejectedValue(new Error('Paciente nao encontrado'));
    const wrapper = await mountForm();
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false);
    expect(wrapper.find('form').exists()).toBe(false);
    expect(mockPatientUpdateFn).not.toHaveBeenCalled();
  });

  it('freezes clinical fields and rejects duplicate submissions while an update is pending', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });
    const request = deferred<typeof mockPatient>();
    mockPatientUpdateFn.mockReturnValue(request.promise);
    const wrapper = await mountForm();
    await wrapper.find('form').trigger('submit');
    expect(wrapper.find('#name').element.matches(':disabled')).toBe(true);
    expect(wrapper.find('#species').element.matches(':disabled')).toBe(true);
    await wrapper.find('form').trigger('submit');
    expect(mockPatientUpdateFn).toHaveBeenCalledTimes(1);
    request.resolve(mockPatient);
    await flushPromises();
  });

  it('ignores an older edit load after the route changes to another patient', async () => {
    const route = reactive({ params: { id: 'pat-1' }, query: {}, path: '/patients/pat-1/edit' });
    mockRouteParams.mockReturnValue(route);
    const first = deferred<typeof mockPatient>();
    mockPatientGetByIdFn.mockImplementation((id: string) => id === 'pat-1' ? first.promise : Promise.resolve({ ...mockPatient, id: 'pat-2', name: 'Luna' }));
    const wrapper = await mountForm();
    route.params.id = 'pat-2';
    route.path = '/patients/pat-2/edit';
    await flushPromises();
    first.resolve(mockPatient);
    await flushPromises();
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Luna');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-2', expect.objectContaining({ name: 'Luna' }));
  });


  it.each(['create', 'update'])('preserves every clinical payload field on %s', async (mode) => {
    if (mode === 'update') mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });
    const wrapper = await mountForm();
    if (mode === 'create') await linkOwner(wrapper);
    const values = {
      name: '  Pipoca  ', species: 'canine', breed: 'Yorkshire Terrier', sex: 'female',
      size: 'small', baseWeightKg: '4.5', birthDateApproximate: '2021-02-03',
      isNeutered: 'false', microchip: ' CHIP-99 ', pedigreeNumber: ' PED-1 ', color: ' Branco ',
      chronicDisease: ' Diabetes ', allergy: ' Dipirona ', temperament: ' Calmo ',
      generalNotes: ' Retorno em 30 dias ', legacyVetusId: ' VET-7 ', originalCreatedAt: '2022-03-04', status: 'inactive'
    };
    for (const [id, value] of Object.entries(values)) await wrapper.find(`#${id}`).setValue(value);
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    const payload = {
      name: 'Pipoca', species: 'canine', breed: 'Yorkshire Terrier', sex: 'female',
      size: 'small', baseWeightKg: 4.5, birthDateApproximate: '2021-02-03',
      isNeutered: false, microchip: 'CHIP-99', pedigreeNumber: 'PED-1', color: 'Branco',
      chronicDisease: 'Diabetes', allergy: 'Dipirona', temperament: 'Calmo',
      generalNotes: 'Retorno em 30 dias', legacyVetusId: 'VET-7', originalCreatedAt: '2022-03-04',
      primaryOwnerId: 'owner-1', status: 'inactive'
    };
    if (mode === 'create') expect(mockPatientCreateFn).toHaveBeenCalledWith(payload);
    else expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-1', payload);
  });

  it('keeps recorded legacy species and breed selectable when catalogs omit them', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });
    mockPatientGetByIdFn.mockResolvedValue({ ...mockPatient, species: 'legacy-species', breed: 'Raça antiga' });
    mockAnimalSpeciesListFn.mockResolvedValue([]);
    mockBreedListFn.mockResolvedValue([]);
    const wrapper = await mountForm();
    expect(wrapper.find('#species option[value="legacy-species"]').exists()).toBe(true);
    expect(wrapper.find('#breed option[value="Raça antiga"]').exists()).toBe(true);
    await wrapper.find('form').trigger('submit');
    expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-1', expect.objectContaining({ species: 'legacy-species', breed: 'Raça antiga' }));
  });

  it('resolves a query tutor omitted from the currently loaded page', async () => {
    mockOwnerListFn.mockResolvedValue([mockOwners[1]]);
    mockRouteParams.mockReturnValue({ params: {}, query: { ownerId: 'owner-1' }, path: '/patients/new' });
    const wrapper = await mountForm();
    expect(mockOwnerGetByIdFn).toHaveBeenCalledWith('owner-1');
    expect(wrapper.text()).toContain('Joao Silva');
    await wrapper.find('#name').setValue('Rex');
    await wrapper.find('#species').setValue('canine');
    await wrapper.find('#sex').setValue('male');
    await wrapper.find('form').trigger('submit');
    expect(mockPatientCreateFn).toHaveBeenCalledWith(expect.objectContaining({ primaryOwnerId: 'owner-1' }));
  });

  it('cancels delayed save navigation on unmount', async () => {
    vi.useFakeTimers();
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });
    const wrapper = await mountForm();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    wrapper.unmount();
    await vi.runAllTimersAsync();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('does not announce or navigate an earlier write after route context changes', async () => {
    vi.useFakeTimers();
    const route = reactive({ params: { id: 'pat-1' }, query: {}, path: '/patients/pat-1/edit' });
    mockRouteParams.mockReturnValue(route);
    const request = deferred<typeof mockPatient>();
    mockPatientUpdateFn.mockReturnValue(request.promise);
    const wrapper = await mountForm();
    await wrapper.find('form').trigger('submit');
    route.params.id = 'pat-2';
    route.path = '/patients/pat-2/edit';
    await flushPromises();
    request.resolve(mockPatient);
    await flushPromises();
    await vi.runAllTimersAsync();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('Animal atualizado com sucesso');
  });


  it('requires confirmation after selecting exactly one tutor through the named button group', async () => {
    const wrapper = await mountForm();
    const group = wrapper.find('[role="group"][aria-label="Tutores encontrados"]');
    expect(group.exists()).toBe(true);
    const candidates = group.findAll('button.client-option');
    expect(candidates.every((item) => item.attributes('aria-pressed') === 'false')).toBe(true);
    await candidates[0].trigger('click');
    await candidates[1].trigger('click');
    expect(candidates.map((item) => item.attributes('aria-pressed'))).toEqual(['false', 'true']);
    await wrapper.find('#name').setValue('Rex');
    await wrapper.find('#species').setValue('canine');
    await wrapper.find('#sex').setValue('male');
    await wrapper.find('form').trigger('submit');
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
    await wrapper.findAll('button').find((button) => button.text() === 'Vincular tutor')!.trigger('click');
    await wrapper.find('form').trigger('submit');
    expect(mockPatientCreateFn).toHaveBeenCalledWith(expect.objectContaining({ primaryOwnerId: 'owner-2' }));
  });

  it('submits tutor search to the owner service without submitting the clinical form', async () => {
    const wrapper = await mountForm();
    await wrapper.find('#ownerSearch').setValue('Maria');
    await wrapper.findAll('button').find((button) => button.text() === 'Buscar tutor')!.trigger('click');
    await flushPromises();
    expect(mockOwnerListPageFn).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Maria', page: 1, pageSize: 12 }));
    expect(mockPatientCreateFn).not.toHaveBeenCalled();
  });


  it('uses server paging metadata to request the next tutor page', async () => {
    mockOwnerListPageFn.mockImplementation(async ({ page }: { page: number }) => ({
      items: [mockOwners[page - 1]], page, pageSize: 1, total: 2, totalPages: 2
    }));
    const wrapper = await mountForm();
    expect(wrapper.findAll('.client-option')).toHaveLength(1);
    expect(wrapper.find('.client-option').text()).toContain('Joao Silva');
    await wrapper.findAll('button').find((button) => button.text() === 'Próxima')!.trigger('click');
    await flushPromises();
    expect(mockOwnerListPageFn).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 12 }));
    expect(wrapper.find('.client-option').text()).toContain('Maria Santos');
    expect(wrapper.text()).toContain('Página 2 de 2');
  });

  it('paginates a complete tutor response locally without dropping records beyond the first twelve', async () => {
    const owners = Array.from({ length: 13 }, (_, index) => ({ ...mockOwners[0], id: `owner-page-${index}`, fullName: `Tutor ${index}` }));
    mockOwnerListFn.mockResolvedValue(owners);
    const wrapper = await mountForm();
    expect(wrapper.findAll('.client-option')).toHaveLength(12);
    await wrapper.findAll('button').find((button) => button.text() === 'Próxima')!.trigger('click');
    expect(wrapper.findAll('.client-option')).toHaveLength(1);
    expect(wrapper.find('.client-option').text()).toContain('Tutor 12');
    expect(mockOwnerListPageFn).toHaveBeenCalledTimes(1);
  });

  it('retries failed tutor loading and recovers the selectable list', async () => {
    mockOwnerListFn.mockRejectedValueOnce(new Error('Offline'));
    const wrapper = await mountForm();
    expect(wrapper.findAll('.client-option')).toHaveLength(0);
    await wrapper.findAll('button').find((button) => button.text() === 'Recarregar tutores')!.trigger('click');
    await flushPromises();
    expect(wrapper.findAll('.client-option')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('Erro ao carregar lista de tutores');
  });

  it('retries failed species loading without leaving invented fallback options', async () => {
    mockAnimalSpeciesListFn.mockRejectedValueOnce(new Error('Offline'));
    const wrapper = await mountForm();
    expect(wrapper.findAll('#species option')).toHaveLength(1);
    await wrapper.findAll('button').find((button) => button.text() === 'Recarregar espécies')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('#species option[value="canine"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Erro ao carregar lista de espécies');
  });

  it('retries failed edit loading before enabling patient updates', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });
    mockPatientGetByIdFn.mockRejectedValueOnce(new Error('Offline'));
    const wrapper = await mountForm();
    expect(wrapper.find('form').exists()).toBe(false);
    await wrapper.findAll('button').find((button) => button.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Rex');
    await wrapper.find('form').trigger('submit');
    expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-1', expect.objectContaining({ name: 'Rex' }));
  });


  it('preserves the current tutor until a replacement is explicitly confirmed', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'pat-1' }, path: '/patients/pat-1/edit' });
    const wrapper = await mountForm();
    await wrapper.findAll('button').find((button) => button.text() === 'Trocar tutor')!.trigger('click');
    await wrapper.findAll('.client-option')[1].trigger('click');
    await wrapper.findAll('button').find((button) => button.text() === 'Manter tutor atual')!.trigger('click');
    await wrapper.find('form').trigger('submit');
    expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-1', expect.objectContaining({ primaryOwnerId: 'owner-1' }));
  });

  it('cancels scheduled navigation when the route changes after a successful save', async () => {
    vi.useFakeTimers();
    const route = reactive({ params: { id: 'pat-1' }, query: {}, path: '/patients/pat-1/edit' });
    mockRouteParams.mockReturnValue(route);
    const wrapper = await mountForm();
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Animal atualizado com sucesso');
    mockPatientGetByIdFn.mockResolvedValue({ ...mockPatient, id: 'pat-2', name: 'Luna' });
    route.params.id = 'pat-2';
    route.path = '/patients/pat-2/edit';
    await flushPromises();
    await vi.runAllTimersAsync();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Luna');
  });

  it('resolves the new patient tutor while a previous patient write is pending', async () => {
    const route = reactive({ params: { id: 'pat-1' }, query: {}, path: '/patients/pat-1/edit' });
    mockRouteParams.mockReturnValue(route);
    mockPatientGetByIdFn.mockImplementation((id: string) => Promise.resolve({ ...mockPatient, id, primaryOwnerId: id === 'pat-2' ? 'owner-2' : 'owner-1' }));
    const request = deferred<typeof mockPatient>();
    mockPatientUpdateFn.mockReturnValue(request.promise);
    const wrapper = await mountForm();
    await wrapper.find('form').trigger('submit');
    route.params.id = 'pat-2';
    route.path = '/patients/pat-2/edit';
    await flushPromises();
    expect(wrapper.find('.linked-owner').text()).toContain('Maria Santos');
    expect(wrapper.find('#name').element.matches(':disabled')).toBe(true);
    request.resolve(mockPatient);
    await flushPromises();
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });

  it('keeps a successfully created patient locked until navigation to prevent duplicate creation', async () => {
    vi.useFakeTimers();
    const wrapper = await mountForm();
    await linkOwner(wrapper);
    await wrapper.find('#name').setValue('Rex');
    await wrapper.find('#species').setValue('canine');
    await wrapper.find('#sex').setValue('male');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Animal cadastrado com sucesso');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockPatientCreateFn).toHaveBeenCalledTimes(1);
    expect(wrapper.find('#name').element.matches(':disabled')).toBe(true);
    await vi.runAllTimersAsync();
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
  });

  it('turns a duplicate conflict into a recoverable action and preserves the draft', async () => {
    mockPatientCreateFn.mockRejectedValueOnce(Object.assign(new Error('Possible duplicate patient detected'), {
      status: 409,
      body: {
        code: 'CONFLICT',
        message: 'Possible duplicate patient detected',
        details: { patientId: 'patient-existing' }
      }
    }));
    const wrapper = await mountForm();
    await linkOwner(wrapper);
    await wrapper.find('#name').setValue('Rex');
    await wrapper.find('#species').setValue('canine');
    await wrapper.find('#sex').setValue('male');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.duplicate-feedback-region').exists()).toBe(true);
    expect(wrapper.text()).toContain('Nada novo foi criado');
    expect(wrapper.find('.form-feedback-region').exists()).toBe(false);
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Rex');
    await wrapper.findAll('button').find((button) => button.text() === 'Abrir animal existente')!.trigger('click');
    expect(mockRouterPush).toHaveBeenCalledWith('/patients/patient-existing');
  });

  async function mountRouted(path = '/patients/pat-1/edit') {
    realRouting = true;
    const PatientFormPage = (await import('../PatientFormPage.vue')).default;
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/patients/new', component: PatientFormPage },
      { path: '/patients/:id/edit', component: PatientFormPage },
      { path: '/patients/:id?', component: { template: '<p>Destino</p>' } }
    ] });
    await router.push(path);
    await router.isReady();
    const coordinator = createUnsavedChangesCoordinator();
    const wrapper = mount(defineComponent({ template: '<RouterView />' }), { global: {
      plugins: [router], provide: { [unsavedChangesCoordinatorKey as symbol]: coordinator }, stubs: { Teleport: true }
    } });
    await flushPromises();
    return { wrapper, router, coordinator };
  }

  it('keeps hydrated edit data clean and permits leaving without confirmation', async () => {
    const { wrapper, router } = await mountRouted();
    expect((wrapper.find('#breed').element as HTMLSelectElement).value).toBe('Golden Retriever');
    await router.push('/patients');
    expect(router.currentRoute.value.path).toBe('/patients');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('keeps initial owner query hydration clean', async () => {
    const { wrapper, router } = await mountRouted('/patients/new?ownerId=owner-2');
    expect(wrapper.find('.linked-owner').text()).toContain('Maria Santos');
    await router.push('/patients');
    expect(router.currentRoute.value.path).toBe('/patients');
  });

  it('protects dirty edits before switching the owner query that reloads the form', async () => {
    const { wrapper, router } = await mountRouted('/patients/new?ownerId=owner-1');
    await wrapper.find('#name').setValue('Rascunho antes de trocar o tutor');

    const declined = router.push('/patients/new?ownerId=owner-2');
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').text()).toContain('Alterações não salvas');
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Rascunho antes de trocar o tutor');
    await wrapper.find('#patient-continue-editing').trigger('click');
    await declined;

    expect(router.currentRoute.value.fullPath).toBe('/patients/new?ownerId=owner-1');
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Rascunho antes de trocar o tutor');

    const accepted = router.push('/patients/new?ownerId=owner-2');
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Descartar e sair')!.trigger('click');
    await accepted;
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe('/patients/new?ownerId=owner-2');
    expect(wrapper.find('.linked-owner').text()).toContain('Maria Santos');
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('');
  });

  it('declines leaving with edits intact, then discards on explicit confirmation', async () => {
    const { wrapper, router } = await mountRouted();
    await wrapper.find('#name').setValue('Rascunho');
    const declined = router.push('/patients');
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').text()).toContain('Alterações não salvas');
    await wrapper.find('#patient-continue-editing').trigger('click');
    await declined;
    expect(router.currentRoute.value.path).toBe('/patients/pat-1/edit');
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Rascunho');
    const accepted = router.push('/patients');
    await flushPromises();
    await wrapper.findAll('button').find(button => button.text() === 'Descartar e sair')!.trigger('click');
    await accepted;
    expect(router.currentRoute.value.path).toBe('/patients');
  });

  it('protects dirty edits before switching the loaded patient', async () => {
    const { wrapper, router } = await mountRouted();
    await wrapper.find('#name').setValue('Não perder');
    const navigation = router.push('/patients/pat-2/edit');
    await flushPromises();
    await wrapper.find('#patient-continue-editing').trigger('click');
    await navigation;
    expect(mockPatientGetByIdFn).toHaveBeenCalledTimes(1);
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Não perder');
  });

  it('retains dirty protection after a failed save', async () => {
    const { wrapper, router } = await mountRouted();
    mockPatientUpdateFn.mockRejectedValueOnce(new Error('Falha ao salvar'));
    await wrapper.find('#name').setValue('Rascunho');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Falha ao salvar');
    const navigation = router.push('/patients');
    await flushPromises();
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    await wrapper.find('#patient-continue-editing').trigger('click');
    await navigation;
    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Rascunho');
  });

  it('marks a confirmed save clean before its scheduled navigation', async () => {
    vi.useFakeTimers();
    const { wrapper, router } = await mountRouted();
    await wrapper.find('#name').setValue('Nome salvo');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockPatientUpdateFn).toHaveBeenCalledWith('pat-1', expect.objectContaining({ name: 'Nome salvo' }));
    await vi.runAllTimersAsync();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/patients/pat-1');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
  });

  it('coordinates logout confirmation and unregisters on unmount', async () => {
    const { wrapper, coordinator } = await mountRouted();
    await wrapper.find('#name').setValue('Rascunho');
    const logout = coordinator.confirmAndDiscard();
    await flushPromises();
    await wrapper.find('#patient-continue-editing').trigger('click');
    expect(await logout).toBe(false);
    const pending = coordinator.confirmAndDiscard();
    await flushPromises();
    wrapper.unmount();
    expect(await pending).toBe(false);
    expect(await coordinator.confirmAndDiscard()).toBe(true);
  });

});

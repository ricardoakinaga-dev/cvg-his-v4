import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockOwner = {
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'Joao Silva',
  documentId: '123.456.789-00',
  contacts: [{ label: 'Celular', type: 'phone' as const, value: '(11) 99999-1111', primary: true }],
  financialResponsible: true,
  administrativeNotes: '',
  status: 'active' as const,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockGetByIdFn = vi.fn().mockResolvedValue(mockOwner);
const mockCreateFn = vi.fn().mockResolvedValue({ id: 'owner-new' });
const mockUpdateFn = vi.fn().mockResolvedValue(mockOwner);
const mockRouterPush = vi.fn();
const mockRouteParams = vi.fn().mockReturnValue({ params: {}, path: '/owners/new' });

vi.mock('@/services/owner', () => ({
  ownerService: {
    get getById() {
      return mockGetByIdFn;
    },
    get create() {
      return mockCreateFn;
    },
    get update() {
      return mockUpdateFn;
    }
  }
}));

vi.mock('vue-router', () => ({
  useRoute: () => mockRouteParams(),
  useRouter: () => ({
    push: mockRouterPush
  })
}));

describe('OwnerFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByIdFn.mockResolvedValue(mockOwner);
    mockCreateFn.mockResolvedValue({ id: 'owner-new' });
    mockUpdateFn.mockResolvedValue(mockOwner);
    mockRouterPush.mockResolvedValue(undefined);
    mockRouteParams.mockReturnValue({ params: {}, path: '/owners/new' });
  });

  it('renders the page title for new owner', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(wrapper.text()).toContain('Novo Tutor');
  });

  it('renders the page title for edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'owner-1' }, path: '/owners/owner-1/edit' });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(wrapper.text()).toContain('Editar Tutor');
  });

  it('renders form fields', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(wrapper.find('#fullName').exists()).toBe(true);
    expect(wrapper.find('#documentId').exists()).toBe(true);
    expect(wrapper.find('#notes').exists()).toBe(true);
  });

  it('renders contact section with add button', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(wrapper.text()).toContain('Contatos');
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar'));
    expect(addBtn).toBeTruthy();
  });

  it('adds a new contact row when clicking add', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    const initialContacts = wrapper.findAll('.contact-row');
    expect(initialContacts).toHaveLength(1);

    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.contact-row')).toHaveLength(2);
  });

  it('removes a contact row when clicking remove', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    const addBtn = wrapper.findAll('button').find((b) => b.text().includes('Adicionar'));
    await addBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.contact-row')).toHaveLength(2);

    const removeBtn = wrapper.findAll('button').find((b) => b.text().includes('Remover'));
    await removeBtn!.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.contact-row')).toHaveLength(1);
  });

  it('shows validation error when fullName is empty', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('shows validation error when no contact has value', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    const nameInput = wrapper.find('#fullName');
    await nameInput.setValue('Joao Silva');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('contato');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('submits form successfully with valid data', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    const nameInput = wrapper.find('#fullName');
    await nameInput.setValue('Joao Silva');

    const contactValue = wrapper.find('#contact-value-0');
    await contactValue.setValue('(11) 99999-1111');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(mockCreateFn).toHaveBeenCalled();
    expect(wrapper.text()).toContain('Tutor cadastrado com sucesso');
  });

  it('shows error alert when create fails', async () => {
    mockCreateFn.mockRejectedValue(new Error('Documento ja cadastrado'));

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    const nameInput = wrapper.find('#fullName');
    await nameInput.setValue('Joao Silva');

    const contactValue = wrapper.find('#contact-value-0');
    await contactValue.setValue('(11) 99999-1111');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Documento ja cadastrado');
  });

  it('loads existing owner data in edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'owner-1' }, path: '/owners/owner-1/edit' });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(mockGetByIdFn).toHaveBeenCalledWith('owner-1');

    const nameInput = wrapper.find('#fullName') as any;
    expect(nameInput.element.value).toBe('Joao Silva');
  });

  it('submits update in edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'owner-1' }, path: '/owners/owner-1/edit' });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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

    expect(mockUpdateFn).toHaveBeenCalledWith('owner-1', expect.any(Object));
    expect(wrapper.text()).toContain('Tutor atualizado com sucesso');
  });

  it('shows error when loading owner fails in edit mode', async () => {
    mockGetByIdFn.mockRejectedValue(new Error('Tutor nao encontrado'));
    mockRouteParams.mockReturnValue({
      params: { id: 'owner-999' },
      path: '/owners/owner-999/edit'
    });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(wrapper.text()).toContain('Tutor');
    expect(wrapper.text()).toContain('nao encontrado');
  });

  it('shows cancel link back to owners list', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(cancelLink!.attributes('href')).toBe('/owners');
  });

  it('disables submit button while submitting', async () => {
    let resolveCreate: (value: any) => void;
    const slowCreate = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    mockCreateFn.mockImplementation(() => slowCreate);

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    const nameInput = wrapper.find('#fullName');
    await nameInput.setValue('Joao Silva');

    const contactValue = wrapper.find('#contact-value-0');
    await contactValue.setValue('(11) 99999-1111');

    const form = wrapper.find('form');
    await form.trigger('submit');
    await wrapper.vm.$nextTick();

    const submitBtn = wrapper.find('button[type="submit"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('Salvando');

    resolveCreate!({ id: 'owner-new' });
    await flushPromises();
  });

  it('renders status select with options', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, {
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
    expect(options).toHaveLength(2);
    expect(options[0].text()).toBe('Ativo');
    expect(options[1].text()).toBe('Inativo');
  });
});

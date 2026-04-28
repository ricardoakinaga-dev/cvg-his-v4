import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const mockOwner = {
  id: 'owner-1',
  accountId: 'acc-1',
  fullName: 'Joao Silva',
  documentId: '123.456.789-00',
  contacts: [
    { label: 'Telefone 1', type: 'phone' as const, value: '(11) 3333-1111', primary: false },
    { label: 'Celular', type: 'whatsapp' as const, value: '(11) 99999-1111', primary: true },
    { label: 'E-mail', type: 'email' as const, value: 'joao@email.com', primary: false }
  ],
  profile: {
    birthDate: '1990-05-10',
    sex: 'male' as const,
    group: 'VIP',
    receiveSms: true,
    personType: 'individual' as const,
    rg: '11.222.333-4'
  },
  address: {
    zipCode: '01234-567',
    street: 'Rua das Flores',
    number: '100',
    complement: 'Casa',
    city: 'Sao Paulo',
    state: 'SP',
    district: 'Centro',
    reference: 'Proximo ao metro',
    cityCode: '3550308'
  },
  financialProfile: {
    allowedDebtLimit: 200,
    creditBalance: 15,
    availablePoints: 120,
    blockedPoints: 10
  },
  financialResponsible: true,
  administrativeNotes: 'Cliente preferencial',
  legacyVetusId: '3835',
  originalCreatedAt: '2024-05-03',
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

  it('renders the new customer title', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Cadastrar Novo Cliente');
  });

  it('renders the new grouped form fields', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();
    expect(wrapper.find('#fullName').exists()).toBe(true);
    expect(wrapper.find('#birthDate').exists()).toBe(true);
    expect(wrapper.find('#phone1').exists()).toBe(true);
    expect(wrapper.find('#mobile').exists()).toBe(true);
    expect(wrapper.find('#legacyVetusId').exists()).toBe(true);
    expect(wrapper.find('#originalCreatedAt').exists()).toBe(true);
    expect(wrapper.find('#documentId').exists()).toBe(true);
    expect(wrapper.find('#zipCode').exists()).toBe(true);
    expect(wrapper.find('#cityCode').exists()).toBe(true);
    expect(wrapper.find('#notes').exists()).toBe(true);
    expect(wrapper.find('#allowedDebtLimit').exists()).toBe(true);
    expect(wrapper.find('#creditBalance').exists()).toBe(true);
    expect(wrapper.find('#availablePoints').exists()).toBe(true);
    expect(wrapper.find('#blockedPoints').exists()).toBe(true);
    expect(wrapper.text()).toContain('Identificação do Cliente');
    expect(wrapper.text()).toContain('Informações de Contato');
    expect(wrapper.text()).toContain('Documentação do Cliente');
    expect(wrapper.text()).toContain('Endereço do Cliente');
    expect(wrapper.text()).toContain('Observações Gerais');
  });

  it('shows validation error when name is empty', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();
    await wrapper.find('form').trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Nome é obrigatório');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('shows validation error when no contact is provided', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();
    await wrapper.find('#fullName').setValue('Joao Silva');
    await wrapper.find('form').trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Preencha pelo menos um telefone, celular ou e-mail');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('submits the new customer payload successfully', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();
    await wrapper.find('#fullName').setValue('Joao Silva');
    await wrapper.find('#mobile').setValue('(11) 99999-1111');
    await wrapper.find('#email').setValue('joao@email.com');
    await wrapper.find('#documentId').setValue('123.456.789-00');
    await wrapper.find('#zipCode').setValue('01234-567');
    await wrapper.find('#cityCode').setValue('3550308');
    await wrapper.find('#allowedDebtLimit').setValue('150');
    await wrapper.find('#legacyVetusId').setValue('3835');
    await wrapper.find('#originalCreatedAt').setValue('2024-05-03');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockCreateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Joao Silva',
        documentId: '123.456.789-00',
        contacts: expect.arrayContaining([
          expect.objectContaining({ type: 'whatsapp', value: '(11) 99999-1111', primary: true }),
          expect.objectContaining({ type: 'email', value: 'joao@email.com' })
        ]),
        address: expect.objectContaining({ zipCode: '01234-567' }),
        financialProfile: expect.objectContaining({ allowedDebtLimit: 150 }),
        legacyVetusId: '3835',
        originalCreatedAt: '2024-05-03'
      })
    );
    expect(wrapper.text()).toContain('Cliente cadastrado com sucesso');
  });

  it('hydrates the expanded fields in edit mode', async () => {
    mockRouteParams.mockReturnValue({ params: { id: 'owner-1' }, path: '/owners/owner-1/edit' });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Editar Cliente');
    expect((wrapper.find('#birthDate').element as HTMLInputElement).value).toBe('1990-05-10');
    expect((wrapper.find('#group').element as HTMLInputElement).value).toBe('VIP');
    expect((wrapper.find('#mobile').element as HTMLInputElement).value).toBe('(11) 99999-1111');
    expect((wrapper.find('#zipCode').element as HTMLInputElement).value).toBe('01234-567');
    expect((wrapper.find('#reference').element as HTMLInputElement).value).toBe('Proximo ao metro');
    expect((wrapper.find('#cityCode').element as HTMLInputElement).value).toBe('3550308');
    expect((wrapper.find('#legacyVetusId').element as HTMLInputElement).value).toBe('3835');
    expect((wrapper.find('#originalCreatedAt').element as HTMLInputElement).value).toBe('2024-05-03');
  });
});

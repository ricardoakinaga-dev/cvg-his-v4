import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

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
const mockRoute = reactive({ params: {} as Record<string, string>, path: '/owners/new' });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

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

vi.mock('vue-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('vue-router')>(),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn(),
  useRoute: () => mockRoute,
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
    mockRoute.params = {};
    mockRoute.path = '/owners/new';
  });

  it('renders the new customer title', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();
    expect(wrapper.text()).toContain('Cadastrar Novo Tutor');
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
    expect(wrapper.text()).toContain('Identificação do Tutor');
    expect(wrapper.text()).toContain('Informações de Contato');
    expect(wrapper.find('#owner-contact-title').text()).toContain('*');
    expect(wrapper.find('.contact-fields').attributes('role')).toBe('group');
    expect(wrapper.find('.contact-fields').attributes('aria-required')).toBe('true');
    expect(wrapper.find('.contact-fields').attributes('aria-describedby')).toBe('owner-contact-hint');
    expect(wrapper.text()).toContain('Documentação do Tutor');
    expect(wrapper.text()).toContain('Endereço do Tutor');
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
    expect(wrapper.find('.contact-fields').attributes('aria-describedby')).toBe('owner-contact-hint owner-contact-error');
    expect(wrapper.find('#owner-contact-error').attributes('role')).toBe('alert');
    expect(wrapper.find('#phone1').attributes('aria-invalid')).toBe('true');
    expect(wrapper.find('#phone1').attributes('aria-describedby')).toBe('owner-contact-hint owner-contact-error');
    expect(mockCreateFn).not.toHaveBeenCalled();
  });

  it('shows a navigable validation summary and focuses the first invalid field', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, { attachTo: document.body });

    await flushPromises();
    await wrapper.find('form').trigger('submit');

    const summary = wrapper.get('#owner-form-error-summary');
    expect(summary.attributes('aria-labelledby')).toBe('owner-form-error-summary-title');
    expect(wrapper.find('form').attributes('novalidate')).toBeDefined();
    expect(wrapper.find('form').attributes('aria-describedby')).toBe('owner-form-error-summary');
    expect(summary.findAll('a')).toHaveLength(2);
    expect(summary.text()).toContain('Nome: Nome é obrigatório');
    expect(summary.text()).toContain('Contato: Preencha pelo menos um telefone');
    expect(document.activeElement).toBe(wrapper.find('#fullName').element);
    expect(wrapper.find('#fullName').attributes('aria-invalid')).toBe('true');

    await summary.find('a[href="#phone1"]').trigger('click');
    expect(document.activeElement).toBe(wrapper.find('#phone1').element);
    expect(wrapper.find('#phone1').attributes('aria-invalid')).toBe('true');
    wrapper.unmount();
  });

  it('opens a collapsed required contact section before focusing its validation link', async () => {
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, { attachTo: document.body });

    await flushPromises();
    await wrapper.find('form').trigger('submit');
    const contactSection = wrapper.findAll('details.owner-section')[1];
    expect((contactSection.element as HTMLDetailsElement).open).toBe(true);
    await contactSection.find('summary').trigger('click');
    expect((contactSection.element as HTMLDetailsElement).open).toBe(false);

    await wrapper.get('#owner-form-error-summary a[href="#phone1"]').trigger('click');
    expect((contactSection.element as HTMLDetailsElement).open).toBe(true);
    expect(document.activeElement).toBe(wrapper.find('#phone1').element);
    wrapper.unmount();
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
    expect(wrapper.text()).toContain('Tutor cadastrado com sucesso');
  });

  it('hydrates the expanded fields in edit mode', async () => {
    mockRoute.params = { id: 'owner-1' };
    mockRoute.path = '/owners/owner-1/edit';

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);

    await flushPromises();

    expect(wrapper.text()).toContain('Editar Tutor');
    expect((wrapper.find('#birthDate').element as HTMLInputElement).value).toBe('1990-05-10');
    expect((wrapper.find('#group').element as HTMLInputElement).value).toBe('VIP');
    expect((wrapper.find('#mobile').element as HTMLInputElement).value).toBe('(11) 99999-1111');
    expect((wrapper.find('#zipCode').element as HTMLInputElement).value).toBe('01234-567');
    expect((wrapper.find('#reference').element as HTMLInputElement).value).toBe('Proximo ao metro');
    expect((wrapper.find('#cityCode').element as HTMLInputElement).value).toBe('3550308');
    expect((wrapper.find('#legacyVetusId').element as HTMLInputElement).value).toBe('3835');
    expect((wrapper.find('#originalCreatedAt').element as HTMLInputElement).value).toBe('2024-05-03');
  });

  it('reloads the current owner and ignores a late previous response after a route switch', async () => {
    const first = deferred<typeof mockOwner>();
    const secondOwner = { ...mockOwner, id: 'owner-2', fullName: 'Marina Costa', status: 'inactive' as const };
    mockRoute.params = { id: 'owner-1' };
    mockRoute.path = '/owners/owner-1/edit';
    mockGetByIdFn.mockImplementation((id: string) => id === 'owner-1' ? first.promise : Promise.resolve(secondOwner));

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);
    mockRoute.params = { id: 'owner-2' };
    mockRoute.path = '/owners/owner-2/edit';
    await flushPromises();

    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe('Marina Costa');
    first.resolve(mockOwner);
    await flushPromises();
    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe('Marina Costa');
  });

  it('rejects a successful owner response whose identity differs from the edit route', async () => {
    mockRoute.params = { id: 'owner-expected' };
    mockRoute.path = '/owners/owner-expected/edit';
    mockGetByIdFn.mockResolvedValue({ ...mockOwner, id: 'owner-other' });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);
    await flushPromises();

    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('não corresponde ao endereço solicitado');
  });

  it('does not report update success when the returned owner belongs to another route', async () => {
    mockRoute.params = { id: 'owner-1' };
    mockRoute.path = '/owners/owner-1/edit';
    mockUpdateFn.mockResolvedValue({ ...mockOwner, id: 'owner-other' });

    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);
    await flushPromises();
    await wrapper.find('#fullName').setValue('Joao Silva');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('não corresponde ao endereço solicitado');
    expect(wrapper.text()).not.toContain('Tutor atualizado com sucesso');
  });
  it('does not duplicate a pending save or navigate away from edits made during it', async () => {
    const request = deferred<{ id: string }>();
    mockCreateFn.mockReturnValueOnce(request.promise);
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);
    await flushPromises();
    await wrapper.find('#fullName').setValue('Nome enviado');
    await wrapper.find('#mobile').setValue('11999990000');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('form').trigger('submit');
    expect(mockCreateFn).toHaveBeenCalledTimes(1);
    await wrapper.find('#fullName').setValue('Alteração posterior');
    request.resolve({ id: 'created' });
    await flushPromises();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe('Alteração posterior');
    mockUpdateFn.mockResolvedValueOnce({ ...mockOwner, id: 'created' });
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockCreateFn).toHaveBeenCalledTimes(1);
    expect(mockUpdateFn).toHaveBeenCalledWith('created', expect.objectContaining({ fullName: 'Alteração posterior' }));
    wrapper.unmount();
  });

  it('preserves entered values after a failed save', async () => {
    mockCreateFn.mockRejectedValueOnce(new Error('Serviço indisponível'));
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);
    await flushPromises();
    await wrapper.find('#fullName').setValue('Rascunho');
    await wrapper.find('#mobile').setValue('11999990000');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Serviço indisponível');
    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe('Rascunho');
    expect(mockRouterPush).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('turns a duplicate conflict into a recoverable action and preserves the draft', async () => {
    mockCreateFn.mockRejectedValueOnce(Object.assign(new Error('Possible duplicate owner detected'), {
      status: 409,
      body: {
        code: 'CONFLICT',
        message: 'Possible duplicate owner detected',
        details: { ownerId: 'owner-existing' }
      }
    }));
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage, { attachTo: document.body });

    await flushPromises();
    await wrapper.find('#fullName').setValue('Maria Silva');
    await wrapper.find('#documentId').setValue('111.111.111-11');
    await wrapper.find('#mobile').setValue('11999991111');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.duplicate-feedback-region').exists()).toBe(true);
    expect(wrapper.text()).toContain('Nada novo foi criado');
    expect(wrapper.find('.form-feedback-region').exists()).toBe(false);
    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe('Maria Silva');
    expect((wrapper.find('#documentId').element as HTMLInputElement).value).toBe('111.111.111-11');
    await wrapper.findAll('button').find((button) => button.text() === 'Abrir tutor existente')!.trigger('click');
    expect(mockRouterPush).toHaveBeenCalledWith('/owners/owner-existing');
    wrapper.unmount();
  });

  it('blocks mutation after failed hydration and allows a successful retry', async () => {
    mockRoute.params = { id: 'owner-1' };
    mockRoute.path = '/owners/owner-1/edit';
    mockGetByIdFn.mockRejectedValueOnce(new Error('Falha de conexão'));
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage);
    await flushPromises();
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined();
    await wrapper.find('form').trigger('submit');
    expect(mockUpdateFn).not.toHaveBeenCalled();
    await wrapper.findAll('button').find(b => b.text() === 'Tentar carregar novamente')!.trigger('click');
    await flushPromises();
    expect(wrapper.find('fieldset').attributes('disabled')).toBeUndefined();
    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe(mockOwner.fullName);
    wrapper.unmount();
  });

  it('keeps edits entered while an existing tutor update is pending', async () => {
    mockRoute.params = { id: 'owner-1' }; mockRoute.path = '/owners/owner-1/edit';
    const request = deferred<typeof mockOwner>(); mockUpdateFn.mockReturnValueOnce(request.promise);
    const OwnerFormPage = (await import('../OwnerFormPage.vue')).default;
    const wrapper = mount(OwnerFormPage); await flushPromises();
    await wrapper.find('#fullName').setValue('Nome enviado para atualização');
    await wrapper.find('form').trigger('submit');
    await wrapper.find('#fullName').setValue('Edição posterior ao envio');
    request.resolve({ ...mockOwner, fullName: 'Nome enviado para atualização' }); await flushPromises();
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect((wrapper.find('#fullName').element as HTMLInputElement).value).toBe('Edição posterior ao envio');
    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(mockUpdateFn).toHaveBeenLastCalledWith('owner-1', expect.objectContaining({ fullName: 'Edição posterior ao envio' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/owners/owner-1');
    wrapper.unmount();
  });

});

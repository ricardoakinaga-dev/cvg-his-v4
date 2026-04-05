import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UserFormPage from '../UserFormPage.vue';

const mockPush = vi.fn();
const mockGetById = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: { id: 'usr-1' },
    path: '/users/usr-1/edit'
  }),
  useRouter: () => ({
    push: mockPush
  })
}));

vi.mock('@/services/user', () => ({
  userService: {
    get getById() {
      return mockGetById;
    },
    get create() {
      return mockCreate;
    },
    get update() {
      return mockUpdate;
    }
  }
}));

describe('UserFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockResolvedValue({
      id: 'usr-1',
      displayName: 'João Silva',
      email: 'joao@email.com',
      username: 'joao.silva',
      phone: '(11) 99999-1111',
      department: 'clinica_geral',
      roleCode: 'veterinarian',
      jobTitle: 'Médico Veterinário',
      status: 'active'
    });
  });

  const mountOptions = {
    global: {
      stubs: {
        DsButton: { template: '<button class="ds-btn-stub"><slot /></button>' },
        DsInput: {
          template: '<div class="ds-input-stub"><slot /></div>',
          props: ['modelValue', 'label', 'error', 'required', 'type', 'id']
        },
        DsAlert: { template: '<div class="ds-alert-stub"><slot /></div>' },
        DsCard: { template: '<div class="ds-card-stub"><slot name="title"/><slot /></div>' },
        AppPageHeader: {
          template: '<div class="app-page-header-stub"><slot name="title"/><slot name="actions"/></div>'
        }
      }
    }
  };

  it('renders the edit page title when editing', async () => {
    const wrapper = mount(UserFormPage, mountOptions);
    await flushPromises();
    expect(wrapper.text()).toContain('Editar Usuário');
  });

  it('loads user data on mount if editing', async () => {
    mount(UserFormPage, mountOptions);
    await flushPromises();
    expect(mockGetById).toHaveBeenCalledWith('usr-1');
  });

  it('submits update changes when form is valid', async () => {
    const wrapper = mount(UserFormPage, mountOptions);
    await flushPromises();

    // Since we stubbed DsInput, doing a standard form submit won't be easy via DOM directly. 
    // We can interact directly with the form submission.
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();

    expect(mockUpdate).toHaveBeenCalledWith('usr-1', expect.objectContaining({
      displayName: 'João Silva',
      email: 'joao@email.com'
    }));
  });
});

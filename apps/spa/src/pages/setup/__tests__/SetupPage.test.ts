import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetchSetupState = vi.fn();
const mockCompleteInitialSetup = vi.fn();

vi.mock('@/services/setup', () => ({
  MIN_PASSWORD_LENGTH: 12,
  MAX_PASSWORD_LENGTH: 128,
  MIN_SETUP_TOKEN_LENGTH: 43,
  fetchSetupState: (...args: unknown[]) => mockFetchSetupState(...args),
  completeInitialSetup: (...args: unknown[]) => mockCompleteInitialSetup(...args)
}));

const BOOTSTRAP_TOKEN = '0123456789abcdef'.repeat(4);

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchSetupState.mockReset();
    mockCompleteInitialSetup.mockReset();
  });

  it('announces the status check without exposing the form early', async () => {
    mockFetchSetupState.mockReturnValue(new Promise(() => undefined));

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.get('[role="status"]').text()).toContain('Verificando');
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('shows an accessible form only when setup is required and available', async () => {
    mockFetchSetupState.mockResolvedValue({ setupRequired: true, setupAvailable: true });

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage);
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.get('label[for="setup-token"]').text()).toContain('Token de instalação');
    expect(wrapper.get('label[for="setup-clinic"]').text()).toContain('Nome da clínica');
    expect(wrapper.get('label[for="setup-password-confirm"]').text()).toContain('Confirme a senha');
    expect(wrapper.get('#setup-token').attributes('autocomplete')).toBe('off');
    expect(wrapper.text()).toContain('ao menos 43 caracteres');
  });

  it('shows an operator recovery state when setup is required but unavailable', async () => {
    mockFetchSetupState
      .mockResolvedValueOnce({ setupRequired: true, setupAvailable: false })
      .mockResolvedValueOnce({ setupRequired: true, setupAvailable: true });

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage);
    await flushPromises();

    expect(wrapper.text()).toContain('indisponível');
    expect(wrapper.text()).toContain('operador');
    expect(wrapper.find('form').exists()).toBe(false);

    await wrapper.get('button[data-action="retry-status"]').trigger('click');
    await flushPromises();

    expect(mockFetchSetupState).toHaveBeenCalledTimes(2);
    expect(wrapper.find('form').exists()).toBe(true);
  });

  it('offers recovery after a status failure and does not open setup optimistically', async () => {
    mockFetchSetupState
      .mockRejectedValueOnce(new Error('network detail must not leak'))
      .mockResolvedValueOnce({ setupRequired: false, setupAvailable: false });

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage);
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível verificar');
    expect(wrapper.text()).not.toContain('network detail must not leak');
    expect(wrapper.find('form').exists()).toBe(false);

    await wrapper.get('button[data-action="retry-status"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('já foi configurada');
  });

  it('keeps completion visible and sends neither confirmation nor token in the body input', async () => {
    mockFetchSetupState.mockResolvedValue({ setupRequired: true, setupAvailable: true });
    mockCompleteInitialSetup.mockResolvedValue({ setupCompleted: true, requiresLogin: true });
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });
    await flushPromises();

    await wrapper.get('#setup-token').setValue(BOOTSTRAP_TOKEN);
    await wrapper.get('#setup-clinic').setValue('Clínica Central');
    await wrapper.get('#setup-username').setValue('admin');
    await wrapper.get('#setup-fullname').setValue('Maria Silva');
    await wrapper.get('#setup-email').setValue('admin@clinica.test');
    await wrapper.get('#setup-password').setValue('Clinica2026!vet');
    await wrapper.get('#setup-password-confirm').setValue('Clinica2026!vet');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mockCompleteInitialSetup).toHaveBeenCalledWith(
      {
        clinicName: 'Clínica Central',
        adminUsername: 'admin',
        adminFullName: 'Maria Silva',
        adminEmail: 'admin@clinica.test',
        adminPassword: 'Clinica2026!vet'
      },
      BOOTSTRAP_TOKEN
    );
    expect(wrapper.get('[role="status"]').text()).toContain('concluída');
    expect(wrapper.text()).toContain('Continuar para o login');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(storageSpy).not.toHaveBeenCalled();
    storageSpy.mockRestore();
  });

  it('validates password confirmation, announces the error and focuses the invalid field', async () => {
    mockFetchSetupState.mockResolvedValue({ setupRequired: true, setupAvailable: true });

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage, { attachTo: document.body });
    await flushPromises();

    await wrapper.get('#setup-token').setValue(BOOTSTRAP_TOKEN);
    await wrapper.get('#setup-clinic').setValue('Clínica Central');
    await wrapper.get('#setup-username').setValue('admin');
    await wrapper.get('#setup-email').setValue('admin@clinica.test');
    await wrapper.get('#setup-password').setValue('Clinica2026!vet');
    await wrapper.get('#setup-password-confirm').setValue('different-password');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('senhas não conferem');
    expect(document.activeElement?.id).toBe('setup-password-confirm');
    expect(mockCompleteInitialSetup).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('requires the API token minimum length without applying a format rule', async () => {
    mockFetchSetupState.mockResolvedValue({ setupRequired: true, setupAvailable: true });

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage, { attachTo: document.body });
    await flushPromises();

    await wrapper.get('#setup-token').setValue('short-token');
    await wrapper.get('#setup-clinic').setValue('Clínica Central');
    await wrapper.get('#setup-username').setValue('admin');
    await wrapper.get('#setup-email').setValue('admin@clinica.test');
    await wrapper.get('#setup-password').setValue('Clinica2026!vet');
    await wrapper.get('#setup-password-confirm').setValue('Clinica2026!vet');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('#setup-token-error').text()).toContain('ao menos 43 caracteres');
    expect(document.activeElement?.id).toBe('setup-token');
    expect(mockCompleteInitialSetup).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('uses a generic live error for a failed completion and permits retry', async () => {
    mockFetchSetupState.mockResolvedValue({ setupRequired: true, setupAvailable: true });
    mockCompleteInitialSetup
      .mockRejectedValueOnce(new Error('database host and stack details'))
      .mockResolvedValueOnce({ setupCompleted: true, requiresLogin: true });

    const SetupPage = (await import('../SetupPage.vue')).default;
    const wrapper = mount(SetupPage);
    await flushPromises();

    await wrapper.get('#setup-token').setValue(BOOTSTRAP_TOKEN);
    await wrapper.get('#setup-clinic').setValue('Clínica Central');
    await wrapper.get('#setup-username').setValue('admin');
    await wrapper.get('#setup-email').setValue('admin@clinica.test');
    await wrapper.get('#setup-password').setValue('Clinica2026!vet');
    await wrapper.get('#setup-password-confirm').setValue('Clinica2026!vet');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível concluir');
    expect(wrapper.text()).not.toContain('database host');
    expect((wrapper.get('#setup-token').element as HTMLInputElement).value).toBe('');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });
});

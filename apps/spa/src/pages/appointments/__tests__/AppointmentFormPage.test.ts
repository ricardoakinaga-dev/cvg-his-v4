import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mockRouterPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

vi.mock('@/components/appointments/AppointmentQuickCreateForm.vue', () => ({
  default: {
    template: `
      <div>
        <button class="emit-created" @click="$emit('created', { id: 'appt-new' })">created</button>
        <button class="emit-cancel" @click="$emit('cancel')">cancel</button>
      </div>
    `
  }
}));

describe('AppointmentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the quick scheduling header', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage);

    expect(wrapper.text()).toContain('Novo Agendamento');
    expect(wrapper.text()).toContain('fluxo rápido');
  });

  it('redirects to the appointment detail after creation', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage);

    await wrapper.find('.emit-created').trigger('click');

    expect(mockRouterPush).toHaveBeenCalledWith('/appointments/appt-new');
  });

  it('returns to the cockpit when the quick form is cancelled', async () => {
    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage);

    await wrapper.find('.emit-cancel').trigger('click');

    expect(mockRouterPush).toHaveBeenCalledWith('/appointments');
  });
});

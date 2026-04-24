import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const mockRouterPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush
  })
}));

vi.mock('@/components/appointments/AppointmentQuickCreateForm.vue', () => ({
  default: {
    template: '<div class="quick-create-form-stub">quick create form</div>',
    props: [
      'presetOwnerId',
      'presetPatientId',
      'presetScheduledAt',
      'presetDurationMinutes',
      'presetPractitionerStaffId',
      'presetVisitType',
      'presetServiceId',
      'presetUnit',
      'presetSpecialty',
      'presetResourceLabel',
      'presetReason'
    ]
  }
}));

describe('AppointmentFormPage', () => {
  const originalLocation = window.location;

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('shows contextual title when opened as edit with prefill query', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        search: '?appointmentId=appt-1&ownerId=owner-1&patientId=pat-1'
      }
    });

    const AppointmentFormPage = (await import('../AppointmentFormPage.vue')).default;
    const wrapper = mount(AppointmentFormPage);

    expect(wrapper.text()).toContain('Editar agendamento');
    expect(wrapper.text()).toContain('Ajuste os dados do compromisso');
    expect(wrapper.text()).toContain('Voltar à agenda');
  });
});

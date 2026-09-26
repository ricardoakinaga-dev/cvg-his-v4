import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import type { AppointmentSummary } from '@/types/appointment';
import AppointmentCreateFlow from '../AppointmentCreateFlow.vue';

enableAutoUnmount(afterEach);

const createdAppointment: AppointmentSummary = {
  id: 'appointment-created',
  accountId: 'account-1',
  patientId: 'patient-1',
  ownerId: 'owner-1',
  scheduledAt: '2026-04-12T09:00',
  durationMinutes: 30,
  visitType: 'scheduled',
  reason: 'Consulta de rotina',
  practitionerStaffId: 'staff-1',
  status: 'scheduled',
  createdAt: '2026-04-12T08:00:00.000Z',
  updatedAt: '2026-04-12T08:00:00.000Z'
};

function mountFlow(open = true) {
  return mount(AppointmentCreateFlow, {
    props: {
      open,
      slotPreset: {
        date: '2026-04-12',
        hour: 9,
        practitionerStaffId: 'staff-1'
      },
      professionals: []
    },
    global: {
      stubs: {
        DsModal: {
          props: ['open'],
          template: '<div v-if="open" class="modal-stub"><slot /></div>'
        },
        AppointmentClientSelectorModal: {
          props: ['open'],
          template: `
            <div v-if="open" class="client-selector-stub">
              <button
                type="button"
                class="select-client"
                @click="$emit('selected', { id: 'owner-1', accountId: 'account-1', fullName: 'Maria Silva', contacts: [], financialResponsible: true, status: 'active', createdAt: '', updatedAt: '' })"
              >
                Selecionar cliente
              </button>
            </div>
          `
        },
        AppointmentQuickCreateForm: {
          props: ['presetScheduledAt', 'presetPractitionerStaffId'],
          template: `
            <div class="quick-create-stub">
              <span class="scheduled-at">{{ presetScheduledAt }}</span>
              <span class="practitioner-id">{{ presetPractitionerStaffId }}</span>
              <button type="button" class="create" @click="$emit('created', createdAppointment)">Criar</button>
              <button type="button" class="cancel" @click="$emit('cancel')">Cancelar</button>
            </div>
          `,
          data: () => ({ createdAppointment })
        }
      }
    }
  });
}

describe('AppointmentCreateFlow', () => {
  it('preserves the slot preset while moving from client selection to quick create', async () => {
    const wrapper = mountFlow();

    expect(wrapper.find('.client-selector-stub').exists()).toBe(true);
    await wrapper.find('.select-client').trigger('click');

    expect(wrapper.find('.client-selector-stub').exists()).toBe(false);
    expect(wrapper.find('.quick-create-stub').exists()).toBe(true);
    expect(wrapper.find('.scheduled-at').text()).toBe('2026-04-12T09:00');
    expect(wrapper.find('.practitioner-id').text()).toBe('staff-1');
  });

  it('forwards creation and closes the local flow state', async () => {
    const wrapper = mountFlow();
    await wrapper.find('.select-client').trigger('click');
    await wrapper.find('.create').trigger('click');

    expect(wrapper.emitted('created')).toEqual([[createdAppointment]]);
    expect(wrapper.find('.client-selector-stub').exists()).toBe(false);
    expect(wrapper.find('.quick-create-stub').exists()).toBe(false);
  });

  it('forwards close without reopening the selector', async () => {
    const wrapper = mountFlow();
    await wrapper.find('.select-client').trigger('click');
    await wrapper.find('.cancel').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
    expect(wrapper.find('.quick-create-stub').exists()).toBe(false);
  });
});

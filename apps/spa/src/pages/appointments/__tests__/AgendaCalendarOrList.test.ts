import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import AgendaCalendarOrList from '../AgendaCalendarOrList.vue';
import type { SchedulingCockpitAppointmentSummary } from '@/types/appointment';

enableAutoUnmount(afterEach);

const appointment: SchedulingCockpitAppointmentSummary = {
  id: 'appt-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  scheduledAt: '2026-04-12T09:00:00.000Z',
  endsAt: '2026-04-12T09:30:00.000Z',
  durationMinutes: 30,
  visitType: 'scheduled',
  reason: 'Consulta',
  practitionerStaffId: 'staff-vet',
  practitionerName: 'Veterinário Responsável',
  serviceName: 'Consulta clínica',
  unit: 'Clínica',
  specialty: 'Clínico geral',
  status: 'scheduled',
  conflicts: [],
  operational: {
    stage: 'scheduled',
    label: 'Agendado',
    source: 'appointment',
    updatedAt: '2026-04-12T08:00:00.000Z'
  },
  createdAt: '2026-04-12T08:00:00.000Z',
  updatedAt: '2026-04-12T08:00:00.000Z'
};

const baseProps = {
  selectedView: 'list' as const,
  viewMode: 'day' as const,
  referenceDate: '2026-04-12',
  items: [appointment],
  blocks: [],
  professionalColumns: [
    { id: 'unassigned', label: 'Sem profissional' },
    { id: 'staff-vet', label: 'Veterinário Responsável' }
  ],
  canManageScheduling: true,
  ownerCache: { 'owner-1': 'Maria Silva' },
  patientCache: { 'pat-1': 'Rex' },
  actionLoadingId: '',
  actionKind: '' as const,
  canCheckIn: () => true,
  canMarkNoShow: () => true,
  shouldShowQueueAction: () => false,
  shouldShowEncounterAction: () => false,
  encounterActionLabel: () => 'Atendimento'
};

const global = {
  stubs: {
    DsButton: {
      inheritAttrs: true,
      template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>'
    },
    DsCard: {
      template: '<div v-bind="$attrs"><slot /></div>'
    },
    EmptyState: {
      props: ['title', 'description'],
      template: '<div class="empty-state-stub"><strong>{{ title }}</strong><span>{{ description }}</span></div>'
    }
  }
};

describe('AgendaCalendarOrList', () => {
  it('renders the list presentation and emits the appointment intent', async () => {
    const wrapper = mount(AgendaCalendarOrList, {
      props: baseProps,
      global
    });

    expect(wrapper.find('.agenda-appointment-row').text()).toContain('Rex');
    expect(wrapper.find('.agenda-appointment-row').text()).toContain('Maria Silva');

    await wrapper.find('.agenda-appointment-row').trigger('click');

    expect(wrapper.emitted('open-appointment')).toEqual([[appointment]]);
  });

  it('renders the day grid and emits a slot intent without owning creation', async () => {
    const wrapper = mount(AgendaCalendarOrList, {
      props: {
        ...baseProps,
        selectedView: 'day',
        viewMode: 'day'
      },
      global
    });

    const slot = wrapper.find('.time-matrix__empty-button');
    expect(slot.exists()).toBe(true);

    await slot.trigger('click');

    expect(wrapper.emitted('create-slot')).toEqual([
      [{ date: '2026-04-12', practitionerStaffId: 'unassigned' }]
    ]);
  });

  it('emits view changes for dense calendar overflow', async () => {
    const denseItems = Array.from({ length: 3 }, (_, index) => ({
      ...appointment,
      id: `appt-${index + 1}`,
      scheduledAt: `2026-04-12T09:${String(index).padStart(2, '0')}:00.000Z`
    }));
    const wrapper = mount(AgendaCalendarOrList, {
      props: {
        ...baseProps,
        selectedView: 'day',
        viewMode: 'day',
        items: denseItems
      },
      global
    });

    const more = wrapper.find('.timeline-slot-summary--action');
    expect(more.exists()).toBe(true);

    await more.trigger('click');

    expect(wrapper.emitted('change-view')).toEqual([['list']]);
  });
});

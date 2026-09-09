import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import AppointmentDetailsDrawer from '@/components/appointments/AppointmentDetailsDrawer.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import type { SchedulingCockpitAppointmentSummary } from '@/types/appointment';

const appointment: SchedulingCockpitAppointmentSummary = {
  id: 'appointment-1', accountId: 'account-1', patientId: 'patient-1', ownerId: 'owner-1',
  scheduledAt: '2026-09-07T12:00:00Z', endsAt: '2026-09-07T12:30:00Z',
  createdAt: '2026-09-07T12:00:00Z', updatedAt: '2026-09-07T12:00:00Z',
  visitType: 'scheduled', status: 'scheduled', reason: '', conflicts: [],
  operational: { stage: 'scheduled', label: 'Agendado', source: 'appointment', updatedAt: '2026-09-07T12:00:00Z' }
};
const wrappers: VueWrapper[] = [];
afterEach(() => {
  wrappers.splice(0).reverse().forEach((wrapper) => wrapper.unmount());
  document.body.replaceChildren();
});

async function open(initiallyOpen = false) {
  const trigger = document.createElement('button');
  trigger.textContent = 'Agenda appointment';
  document.body.append(trigger);
  trigger.focus();
  const wrapper = mount(AppointmentDetailsDrawer, {
    attachTo: document.body,
    props: { appointment: initiallyOpen ? appointment : null, canCancel: true }
  });
  wrappers.push(wrapper);
  if (!initiallyOpen) await wrapper.setProps({ appointment });
  await nextTick();
  return { wrapper, trigger };
}

function key(key: string, shiftKey = false, target: EventTarget = document.activeElement!) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('AppointmentDetailsDrawer keyboard lifecycle', () => {
  it.each([false, true])('focuses the close control and returns focus after Escape (initially open: %s)', async (initiallyOpen) => {
    const { wrapper, trigger } = await open(initiallyOpen);
    expect(document.activeElement).toBe(wrapper.get('[aria-label="Fechar painel"]').element);
    expect(key('Escape').defaultPrevented).toBe(true);
    expect(wrapper.emitted('close')).toHaveLength(1);
    await wrapper.setProps({ appointment: null });
    await nextTick();
    expect(document.activeElement).toBe(trigger);
    key('Escape');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('wraps Tab in both directions, skips disabled actions, and recovers focus outside the panel', async () => {
    const { wrapper, trigger } = await open();
    await wrapper.setProps({ actionLoadingId: appointment.id, actionKind: 'cancel' });
    const first = wrapper.get('[aria-label="Fechar painel"]').element;
    const last = wrapper.get('a[href^="/appointments/new"]').element;
    expect(key('Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
    expect(key('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    expect(key('Tab').defaultPrevented).toBe(false);
    trigger.focus();
    key('Tab');
    expect(document.activeElement).toBe(first);
    expect(wrapper.get('.appointment-details-drawer__backdrop').attributes('tabindex')).toBe('-1');
  });

  it('lets a teleported confirmation modal own Escape and Tab, then resumes drawer handling', async () => {
    const { wrapper } = await open();
    const modal = mount(DsModal, { attachTo: document.body, props: { open: false, title: 'Confirmar' }, slots: { default: '<button>Confirmar</button>' } });
    wrappers.push(modal);
    await modal.setProps({ open: true });
    await nextTick();
    key('Tab', true);
    expect(document.activeElement?.textContent).toBe('Confirmar');
    key('Escape');
    expect(modal.emitted('close')).toHaveLength(1);
    expect(wrapper.emitted('close')).toBeUndefined();
    await modal.setProps({ open: false });
    await nextTick();
    key('Escape');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('closes even if focus has drifted to the background, and cleans up on unmount', async () => {
    const { wrapper, trigger } = await open();
    const onClose = vi.fn();
    await wrapper.setProps({ onClose });
    trigger.focus();
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
    (wrapper.get('[aria-label="Fechar painel"]').element as HTMLElement).focus();
    wrapper.unmount();
    wrappers.splice(wrappers.indexOf(wrapper), 1);
    expect(document.activeElement).toBe(trigger);
    key('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus after button close and captures a fresh trigger when reopened', async () => {
    const { wrapper, trigger } = await open();
    await wrapper.get('[aria-label="Fechar painel"]').trigger('click');
    await wrapper.setProps({ appointment: null });
    await nextTick();
    expect(document.activeElement).toBe(trigger);
    const second = document.createElement('button');
    document.body.append(second);
    second.focus();
    await wrapper.setProps({ appointment });
    await wrapper.setProps({ appointment: { ...appointment, id: 'appointment-2' } });
    await wrapper.setProps({ appointment: null });
    await nextTick();
    expect(document.activeElement).toBe(second);
  });
});

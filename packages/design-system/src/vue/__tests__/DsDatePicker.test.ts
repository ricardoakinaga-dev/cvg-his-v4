import { DOMWrapper, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import DsDatePicker from '../DsDatePicker.vue';

async function settle() {
  await nextTick();
  await nextTick();
}

describe('DsDatePicker.vue', () => {
  it('exposes an accessible dialog and restores focus after Escape', async () => {
    const wrapper = mount(DsDatePicker, {
      props: {
        id: 'visit-date',
        label: 'Data da consulta',
        modelValue: new Date(2026, 0, 15)
      },
      attachTo: document.body
    });

    const input = wrapper.get('input');
    expect(input.attributes('aria-haspopup')).toBe('dialog');
    expect(input.attributes('aria-controls')).toBe('visit-date-calendar');
    expect(input.attributes('aria-expanded')).toBe('false');

    await input.trigger('click');
    await settle();

    const dialog = document.querySelector<HTMLElement>('#visit-date-calendar');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('visit-date-calendar-title');

    const selected = dialog?.querySelector<HTMLElement>('[role="gridcell"][aria-selected="true"]');
    expect(selected).not.toBeNull();
    expect(selected?.getAttribute('aria-label')).toContain('15 de janeiro de 2026');
    expect(document.activeElement).toBe(selected);

    await new DOMWrapper(dialog!).trigger('keydown', { key: 'Escape' });
    await settle();
    expect(document.querySelector('#visit-date-calendar')).toBeNull();
    expect(document.activeElement).toBe(input.element);

    wrapper.unmount();
  });

  it('uses grid buttons with roving focus and keyboard selection', async () => {
    const wrapper = mount(DsDatePicker, {
      props: { id: 'keyboard-date', modelValue: new Date(2026, 0, 15) },
      attachTo: document.body
    });

    await wrapper.get('input').trigger('click');
    await settle();
    const dialog = document.querySelector<HTMLElement>('#keyboard-date-calendar')!;
    const selected = dialog.querySelector<HTMLElement>('[aria-selected="true"]')!;
    const selectedIndex = Number(selected.dataset.dayIndex);
    expect(selected.getAttribute('role')).toBe('gridcell');
    expect(selected.getAttribute('tabindex')).toBe('0');
    expect(dialog.querySelectorAll('[role="gridcell"]').length).toBeGreaterThan(20);

    await new DOMWrapper(selected).trigger('keydown', { key: 'ArrowRight' });
    const next = dialog.querySelector<HTMLElement>(`[data-day-index="${selectedIndex + 1}"]`)!;
    expect(document.activeElement).toBe(next);

    await new DOMWrapper(next).trigger('keydown', { key: ' ' });
    await settle();
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);

    wrapper.unmount();
  });
});

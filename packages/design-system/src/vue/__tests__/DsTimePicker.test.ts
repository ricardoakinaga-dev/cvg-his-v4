import { DOMWrapper, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import DsTimePicker from '../DsTimePicker.vue';

async function settle() {
  await nextTick();
  await nextTick();
}

describe('DsTimePicker.vue', () => {
  it('exposes a named dialog and restores focus after Escape', async () => {
    const wrapper = mount(DsTimePicker, {
      props: { id: 'visit-time', label: 'Horário', modelValue: '14:30' },
      attachTo: document.body
    });

    const input = wrapper.get('input');
    expect(input.attributes('aria-haspopup')).toBe('dialog');
    expect(input.attributes('aria-controls')).toBe('visit-time-dropdown');

    await input.trigger('click');
    await settle();
    const dialog = document.querySelector<HTMLElement>('#visit-time-dropdown');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('visit-time-dropdown-title');
    const selected = dialog?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    expect(selected?.getAttribute('aria-label')).toBe('14 horas');
    expect(document.activeElement).toBe(selected);

    await new DOMWrapper(dialog!).trigger('keydown', { key: 'Escape' });
    await settle();
    expect(document.querySelector('#visit-time-dropdown')).toBeNull();
    expect(document.activeElement).toBe(input.element);
    wrapper.unmount();
  });

  it('uses tab and option semantics with a keyboard roving target', async () => {
    const wrapper = mount(DsTimePicker, {
      props: { id: 'keyboard-time', modelValue: '14:30' },
      attachTo: document.body
    });
    await wrapper.get('input').trigger('click');
    await settle();
    const dialog = document.querySelector<HTMLElement>('#keyboard-time-dropdown')!;
    const selected = dialog.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')!;
    expect(dialog.querySelector('[role="tab"][aria-selected="true"]')).not.toBeNull();
    expect(selected.getAttribute('tabindex')).toBe('0');

    await new DOMWrapper(selected).trigger('keydown', { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      dialog.querySelector('[role="option"][data-option-index="18"]')
    );

    wrapper.unmount();
  });
});

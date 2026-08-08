import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DsModal from '../DsModal.vue';

describe('DsModal.vue', () => {
  it('names the dialog, traps focus and restores focus to the opener', async () => {
    const opener = document.createElement('button');
    opener.id = 'modal-opener';
    document.body.appendChild(opener);
    opener.focus();

    const wrapper = mount(DsModal, {
      props: { open: false, title: 'Editar registro', teleport: false },
      attachTo: document.body,
      slots: {
        default: '<button id="first-action">Primeiro</button><button id="last-action">Último</button>'
      }
    });

    await wrapper.setProps({ open: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-labelledby')).toMatch(/^ds-modal-/);

    const firstAction = wrapper.get('#first-action');
    firstAction.element.focus();
    const lastAction = wrapper.get('#last-action');
    lastAction.element.focus();
    await wrapper.get('.ds-modal-overlay').trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(wrapper.get('.ds-modal__close').element);

    await wrapper.setProps({ open: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(opener);

    wrapper.unmount();
    opener.remove();
  });

  it('provides an accessible name when the visual title is omitted', () => {
    const wrapper = mount(DsModal, {
      props: { open: true, teleport: false },
      attachTo: document.body,
      slots: { default: '<p>Conteúdo</p>' }
    });

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('Dialog');
    wrapper.unmount();
  });
});

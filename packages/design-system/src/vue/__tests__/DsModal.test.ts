import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DsModal from '../DsModal.vue';

describe('DsModal.vue', () => {
  it('focuses the requested field when a dialog opens', async () => {
    const wrapper = mount(DsModal, {
      props: { open: false, teleport: false, initialFocus: '#dialog-search' },
      attachTo: document.body,
      slots: { default: '<input id="dialog-search" aria-label="Buscar rotina" />' }
    });
    await wrapper.setProps({ open: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(wrapper.get('#dialog-search').element);
    wrapper.unmount();
  });

  it('names the dialog, traps focus and restores focus to the opener', async () => {
    const opener = document.createElement('button');
    opener.id = 'modal-opener';
    document.body.appendChild(opener);
    opener.focus();

    const wrapper = mount(DsModal, {
      props: { open: false, title: 'Editar registro', teleport: false },
      attachTo: document.body,
      slots: {
        default: '<button id="first-action">Primeiro</button><button id="last-action">Último</button><button disabled>Indisponível</button>'
      }
    });

    await wrapper.setProps({ open: true });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialog = wrapper.get('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
    expect(dialog.attributes('aria-labelledby')).toMatch(/^ds-modal-/);
    expect(dialog.attributes('aria-describedby')).toMatch(/^ds-modal-/);
    expect(wrapper.get('.ds-modal__close').attributes('type')).toBe('button');

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

  it('does not trap focus on disabled controls', async () => {
    const wrapper = mount(DsModal, {
      props: { open: true, title: 'Ação', teleport: false },
      attachTo: document.body,
      slots: {
        default: '<button id="enabled-action">Disponível</button><button disabled>Indisponível</button>'
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    wrapper.get('#enabled-action').element.focus();
    await wrapper.get('.ds-modal-overlay').trigger('keydown', { key: 'Tab' });

    expect(document.activeElement).toBe(wrapper.get('.ds-modal__close').element);
    wrapper.unmount();
  });

  it('locks body scrolling while open and restores the previous value', async () => {
    document.body.style.overflow = 'auto';
    const wrapper = mount(DsModal, {
      props: { open: true, teleport: false },
      attachTo: document.body,
      slots: { default: '<p>Conteúdo</p>' }
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.style.overflow).toBe('hidden');

    await wrapper.setProps({ open: false });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.body.style.overflow).toBe('auto');

    wrapper.unmount();
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

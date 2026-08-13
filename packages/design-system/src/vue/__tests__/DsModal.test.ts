import { afterEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import DsModal from '../DsModal.vue';

describe('DsModal', () => {
  afterEach(() => {
    document.body.classList.remove('ds-modal-open');
    document.body.innerHTML = '';
  });

  it('locks background scrolling and restores focus when closed', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Abrir';
    document.body.appendChild(opener);
    opener.focus();

    const wrapper = mount(DsModal, {
      attachTo: document.body,
      props: { open: true, title: 'Confirmar', teleport: false },
      slots: { default: '<button class="modal-action">Confirmar</button>' }
    });
    await flushPromises();

    expect(document.body.classList.contains('ds-modal-open')).toBe(true);
    expect(document.activeElement).not.toBe(opener);

    await wrapper.setProps({ open: false });
    await flushPromises();

    expect(document.body.classList.contains('ds-modal-open')).toBe(false);
    expect(document.activeElement).toBe(opener);
    wrapper.unmount();
  });

  it('closes with Escape', async () => {
    const wrapper = mount(DsModal, {
      attachTo: document.body,
      props: { open: true, title: 'Confirmar', teleport: false }
    });

    await wrapper.get('.ds-modal-overlay').trigger('keydown', { key: 'Escape' });

    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });
});

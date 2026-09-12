import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type PwaTestState = {
  needRefresh: { value: boolean };
  messages: { value: unknown[] };
  isOffline: { value: boolean };
};

async function settle() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 350));
}

vi.mock('@/composables/usePWA', async () => {
  const { ref } = await import('vue');
  const state = {
    needRefresh: ref(false),
    messages: ref([]),
    isOffline: ref(false)
  };
  (globalThis as typeof globalThis & { __pwaTestState?: PwaTestState }).__pwaTestState = state;
  return {
    usePWA: () => ({
      needRefresh: state.needRefresh,
      messages: state.messages,
      updateServiceWorker: async () => undefined
    }),
    useNetworkStatus: () => ({ isOffline: state.isOffline })
  };
});

import PWAUpdateToast from '../PWAUpdateToast.vue';

describe('PWAUpdateToast.vue', () => {
  beforeEach(() => {
    const state = (globalThis as typeof globalThis & { __pwaTestState?: PwaTestState })
      .__pwaTestState!;
    state.needRefresh.value = false;
    state.messages.value = [];
    state.isOffline.value = false;
  });

  it('names update and dismiss controls and supports dismissing the toast', async () => {
    const wrapper = mount(PWAUpdateToast, { attachTo: document.body });
    const state = (globalThis as typeof globalThis & { __pwaTestState?: PwaTestState })
      .__pwaTestState!;
    state.needRefresh.value = true;
    await settle();

    const toast = document.querySelector<HTMLElement>('.pwa-toast');
    expect(toast?.getAttribute('aria-live')).toBe('polite');
    expect(toast?.getAttribute('aria-labelledby')).toBe('pwa-update-toast-title');
    const dismiss = toast?.querySelector<HTMLButtonElement>('.toast-btn.secondary');
    expect(dismiss?.getAttribute('aria-label')).toBe('Dispensar notificação de atualização');
    expect(dismiss?.classList.contains('toast-btn')).toBe(true);

    dismiss?.click();
    await settle();
    expect(document.querySelector('.pwa-toast')).toBeNull();
    wrapper.unmount();
  });

  it('announces the offline state as a live region', async () => {
    const wrapper = mount(PWAUpdateToast, { attachTo: document.body });
    const state = (globalThis as typeof globalThis & { __pwaTestState?: PwaTestState })
      .__pwaTestState!;
    state.isOffline.value = true;
    await nextTick();
    const banner = document.querySelector<HTMLElement>('.offline-banner');
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.getAttribute('aria-live')).toBe('polite');
    expect(banner?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    wrapper.unmount();
  });
});

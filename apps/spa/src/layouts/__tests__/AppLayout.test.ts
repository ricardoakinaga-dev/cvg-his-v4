import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import AppLayout from '../AppLayout.vue';

function mockCompactViewport(matches = true) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQuery = {
    matches,
    media: '(max-width: 1024px)',
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  } as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
  return mediaQuery;
}

async function mountLayout() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Inicio</div>' } },
      { path: '/reception', component: { template: '<div>Recepcao</div>' } },
      { path: '/:pathMatch(.*)*', component: { template: '<div>Outra pagina</div>' } }
    ]
  });
  await router.push('/');
  await router.isReady();

  const wrapper = mount(AppLayout, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: {
        DsModal: {
          props: ['open'],
          template: '<div v-if="open" class="ds-modal-stub"><slot /></div>'
        }
      }
    }
  });
  await flushPromises();

  return { wrapper, router };
}

describe('AppLayout responsive navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.body.classList.remove('mobile-navigation-open');
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('opens a dismissible navigation drawer on tablet and mobile viewports', async () => {
    mockCompactViewport();
    const { wrapper } = await mountLayout();
    const trigger = wrapper.get('[data-testid="mobile-navigation-trigger"]');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('#primary-navigation').attributes('aria-hidden')).toBe('true');

    await trigger.trigger('click');

    expect(trigger.attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('.app-layout').classes()).toContain('app-layout--mobile-nav-open');
    expect(wrapper.get('#primary-navigation').attributes('aria-hidden')).toBe('false');
    expect(wrapper.get('[data-testid="mobile-navigation-backdrop"]').exists()).toBe(true);
    expect(document.body.classList.contains('mobile-navigation-open')).toBe(true);

    await wrapper.get('[data-testid="mobile-navigation-backdrop"]').trigger('click');

    expect(trigger.attributes('aria-expanded')).toBe('false');
    expect(document.body.classList.contains('mobile-navigation-open')).toBe(false);
  });

  it('keeps navigation labels and account actions available when the desktop sidebar preference is collapsed', async () => {
    localStorage.setItem('cvg-his-v2:spa:sidebar-collapsed', 'true');
    mockCompactViewport();
    const { wrapper } = await mountLayout();

    expect(wrapper.find('.sidebar__group-label').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-account-actions"]').text()).toContain('Sair');
  });

  it('closes the drawer with Escape and after route navigation', async () => {
    mockCompactViewport();
    const { wrapper, router } = await mountLayout();
    const trigger = wrapper.get('[data-testid="mobile-navigation-trigger"]');

    await trigger.trigger('click');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect(trigger.attributes('aria-expanded')).toBe('false');

    await trigger.trigger('click');
    await router.push('/reception');
    await flushPromises();
    expect(trigger.attributes('aria-expanded')).toBe('false');
  });
});

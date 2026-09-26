import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';

import AppLayout from '@/layouts/AppLayout.vue';
import { apiRequest } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { navigationPermissionCodes } from '@/navigation-permission-catalog';

vi.mock('@/services/api', () => ({ apiRequest: vi.fn() }));

const wrappers: VueWrapper[] = [];
let compactViewport = false;
const originalWindowMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

function stubMatchMedia() {
  const implementation = (query: string) => ({
    matches: query === '(max-width: 860px)' && compactViewport,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  });
  vi.stubGlobal('matchMedia', implementation);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: implementation
  });
}

async function mountLayout(compact: boolean) {
  compactViewport = compact;
  stubMatchMedia();
  const pinia = createPinia();
  setActivePinia(pinia);
  const appStore = useAppStore(pinia);
  const authStore = useAuthStore(pinia);
  appStore.sidebarCollapsed = compact;
  authStore.accessToken = 'component-test-session';
  vi.mocked(apiRequest).mockResolvedValue({
    access: { permissionCodes: [...new Set(Object.values(navigationPermissionCodes).flat())] }
  } as never);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/__compact-navigation-test',
        component: { template: '<button id="background-action">Background action</button>' }
      }
    ]
  });
  await router.push('/__compact-navigation-test');
  await router.isReady();

  const wrapper = mount(AppLayout, {
    attachTo: document.body,
    global: {
      plugins: [pinia, router],
      stubs: { RouterLink: { template: '<a href="#navigation-test"><slot /></a>' } }
    }
  });
  wrappers.push(wrapper);
  await flushPromises();
  await nextTick();
  return { wrapper, appStore };
}

function keydown(target: HTMLElement, key: string, shiftKey = false, ctrlKey = false) {
  const event = new KeyboardEvent('keydown', {
    key,
    shiftKey,
    ctrlKey,
    bubbles: true,
    cancelable: true
  });
  target.dispatchEvent(event);
  return event;
}

function focusableDescendants(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(
    'button, a[href], input, select, textarea, summary, [tabindex], [contenteditable="true"]'
  )].filter((element) => {
    const style = window.getComputedStyle(element);
    let hiddenByLayout = false;
    for (let current: HTMLElement | null = element; current && current !== container; current = current.parentElement) {
      const currentStyle = window.getComputedStyle(current);
      if (current.hidden || current.hasAttribute('inert') ||
        current.getAttribute('aria-hidden') === 'true' || currentStyle.display === 'none' ||
        currentStyle.contentVisibility === 'hidden'
      ) {
        hiddenByLayout = true;
        break;
      }
    }
    let inClosedDetailsContent = false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName !== 'DETAILS' || parent.hasAttribute('open')) continue;
      const summary = [...parent.children].find((child) => child.tagName === 'SUMMARY');
      if (!summary?.contains(element)) {
        inClosedDetailsContent = true;
        break;
      }
    }
    return element.tabIndex >= 0 &&
      !element.matches(':disabled, [aria-disabled="true"]') &&
      !hiddenByLayout &&
      !inClosedDetailsContent &&
      style.visibility !== 'hidden' && style.visibility !== 'collapse';
  });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.body.replaceChildren();
});

afterEach(() => {
  wrappers.splice(0).reverse().forEach((wrapper) => wrapper.unmount());
  document.body.replaceChildren();
  localStorage.clear();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  if (originalWindowMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalWindowMatchMedia);
  } else {
    Reflect.deleteProperty(window, 'matchMedia');
  }
});

describe('AppLayout compact navigation keyboard contract', () => {
  it('contains focus, closes with Escape and backdrop, and restores the opener', async () => {
    const { wrapper, appStore } = await mountLayout(true);
    const opener = wrapper.get('.topbar__collapse-btn').element as HTMLButtonElement;
    opener.focus();
    await wrapper.get('.topbar__collapse-btn').trigger('click');
    await nextTick();
    await nextTick();

    const sidebar = wrapper.get('.sidebar').element as HTMLElement;
    expect(sidebar.getAttribute('role')).toBe('dialog');
    expect(sidebar.getAttribute('aria-modal')).toBe('true');
    expect(sidebar.getAttribute('aria-label')).toBe('Navegação lateral');
    expect(sidebar.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(wrapper.get('#sidebar-module-search').element);
    expect(wrapper.get('.skip-link').element.hasAttribute('inert')).toBe(true);
    expect(wrapper.get('.topbar').element.hasAttribute('inert')).toBe(true);
    expect(wrapper.get('#main-content').element.hasAttribute('inert')).toBe(true);
    expect(wrapper.get('.sidebar__backdrop').element.getAttribute('tabindex')).toBe('-1');
    expect(wrapper.get('.sidebar__backdrop').element.getAttribute('aria-hidden')).toBe('true');

    const disabledButton = document.createElement('button');
    disabledButton.disabled = true;
    const hiddenLink = document.createElement('a');
    hiddenLink.href = '#hidden-navigation-item';
    hiddenLink.hidden = true;
    const disabledLink = document.createElement('a');
    disabledLink.href = '#disabled-navigation-item';
    disabledLink.setAttribute('aria-disabled', 'true');
    const cssHiddenParent = document.createElement('div');
    cssHiddenParent.style.display = 'none';
    const cssHiddenButton = document.createElement('button');
    cssHiddenButton.textContent = 'CSS hidden navigation action';
    cssHiddenParent.append(cssHiddenButton);
    sidebar.append(disabledButton, hiddenLink, disabledLink, cssHiddenParent);

    const focusable = focusableDescendants(sidebar);
    const first = focusable[0];
    const last = focusable.at(-1);
    expect(first).toBe(wrapper.get('#sidebar-module-search').element);
    expect(last).toBeDefined();
    expect(focusable).not.toContain(disabledButton);
    expect(focusable).not.toContain(hiddenLink);
    expect(focusable).not.toContain(disabledLink);
    expect(focusable).not.toContain(cssHiddenButton);

    last!.focus();
    expect(keydown(last!, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    first!.focus();
    expect(keydown(first!, 'Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    opener.focus();
    expect(keydown(opener, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    opener.focus();
    expect(keydown(opener, 'Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);

    expect(keydown(first!, 'Escape').defaultPrevented).toBe(true);
    await nextTick();
    await nextTick();
    expect(appStore.sidebarCollapsed).toBe(true);
    expect(sidebar.getAttribute('role')).toBe(null);
    expect(sidebar.getAttribute('aria-modal')).toBe(null);
    expect(wrapper.get('.topbar').element.hasAttribute('inert')).toBe(false);
    expect(wrapper.get('#main-content').element.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(opener);

    await wrapper.get('.topbar__collapse-btn').trigger('click');
    await nextTick();
    await nextTick();
    expect(document.activeElement).toBe(wrapper.get('#sidebar-module-search').element);
    await wrapper.get('.sidebar__backdrop').trigger('click');
    await nextTick();
    await nextTick();
    expect(appStore.sidebarCollapsed).toBe(true);
    expect(document.activeElement).toBe(opener);
  });

  it('keeps desktop navigation non-modal and does not contain Tab', async () => {
    const { wrapper } = await mountLayout(false);
    const sidebar = wrapper.get('.sidebar').element as HTMLElement;
    const opener = wrapper.get('.topbar__collapse-btn').element as HTMLButtonElement;
    const last = focusableDescendants(sidebar).at(-1);

    expect(sidebar.getAttribute('role')).toBe(null);
    expect(sidebar.getAttribute('aria-modal')).toBe(null);
    expect(sidebar.hasAttribute('inert')).toBe(false);
    expect(wrapper.get('.skip-link').element.hasAttribute('inert')).toBe(false);
    expect(wrapper.get('.topbar').element.hasAttribute('inert')).toBe(false);
    expect(wrapper.get('#main-content').element.hasAttribute('inert')).toBe(false);
    expect(last).toBeDefined();
    expect(keydown(last!, 'Tab').defaultPrevented).toBe(false);
    expect(document.activeElement).not.toBe(opener);
  });

  it('lets an open command dialog keep Tab and Escape while the sidebar stays open', async () => {
    const { wrapper, appStore } = await mountLayout(true);
    const sidebar = wrapper.get('.sidebar').element as HTMLElement;
    await wrapper.get('.topbar__collapse-btn').trigger('click');
    await nextTick();
    await nextTick();
    const searchInput = wrapper.get('#sidebar-module-search').element as HTMLInputElement;
    const openPalette = keydown(searchInput, 'k', false, true);
    await nextTick();
    await nextTick();

    const commandInput = document.getElementById('command-palette-input') as HTMLInputElement | null;
    expect(openPalette.defaultPrevented).toBe(true);
    expect(commandInput).not.toBeNull();
    expect(document.activeElement).toBe(commandInput);
    expect(commandInput?.closest('[role="dialog"]')).not.toBe(sidebar);
    expect(keydown(commandInput!, 'Tab').defaultPrevented).toBe(false);

    expect(keydown(commandInput!, 'Escape').defaultPrevented).toBe(true);
    await nextTick();
    await nextTick();
    expect(document.getElementById('command-palette-input')).toBeNull();
    expect(appStore.sidebarCollapsed).toBe(false);
    expect(sidebar.getAttribute('role')).toBe('dialog');
  });

  it('focuses the dialog itself when no visible sidebar controls remain', async () => {
    const { wrapper } = await mountLayout(true);
    await wrapper.get('.topbar__collapse-btn').trigger('click');
    await nextTick();
    await nextTick();

    const sidebar = wrapper.get('.sidebar').element as HTMLElement;
    const searchInput = wrapper.get('#sidebar-module-search').element as HTMLInputElement;
    sidebar.querySelectorAll<HTMLElement>('*').forEach((element) => {
      element.hidden = true;
    });

    expect(keydown(searchInput, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(sidebar);
  });
});

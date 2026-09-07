import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

import AdministrationSettingsPage from '../AdministrationSettingsPage.vue';
import { useAppStore } from '@/stores/app';
import { THEME_STORAGE_KEY, useThemeStore } from '@/stores/theme';

function mountPage() {
  const pinia = createPinia();
  setActivePinia(pinia);

  const wrapper = mount(AdministrationSettingsPage, {
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a :href="to"><slot /></a>'
        }
      }
    }
  });

  return { wrapper, pinia };
}

describe('AdministrationSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
  });

  it('renders a real platform control center with routed domain links', () => {
    const { wrapper } = mountPage();

    expect(wrapper.text()).toContain('Configurações');
    expect(wrapper.text()).toContain('Controles por domínio');
    expect(wrapper.text()).toContain('Nada é simulado nesta visão.');
    expect(wrapper.find('a[href="/access-control"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/api-keys"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/fiscal"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/company-sectors"]').exists()).toBe(true);
  });

  it('applies theme and navigation preferences through their stores', async () => {
    const { wrapper, pinia } = mountPage();
    const themeStore = useThemeStore(pinia);
    const appStore = useAppStore(pinia);

    const darkButton = wrapper.findAll('button').find((button) => button.text() === 'Escuro');
    expect(darkButton).toBeDefined();
    await darkButton!.trigger('click');

    expect(themeStore.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(wrapper.text()).toContain('Tema escuro aplicado.');

    const navigationButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Recolher menu') || button.text().includes('Expandir menu'));
    expect(navigationButton).toBeDefined();
    const collapsedBefore = appStore.sidebarCollapsed;
    await navigationButton!.trigger('click');

    expect(appStore.sidebarCollapsed).toBe(!collapsedBefore);
    expect(wrapper.text()).toContain(appStore.sidebarCollapsed ? 'Menu recolhido.' : 'Menu expandido.');
  });
});

import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const routeMock = vi.hoisted(() => ({
  path: '/finance/split',
  meta: {
    title: 'Configuração do Split',
    breadcrumbParent: 'Financeiro',
    icon: '🧩'
  }
}));

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return {
    ...actual,
    useRoute: () => routeMock
  };
});

describe('PlaceholderPage', () => {
  it('renders a Vetus-like operational surface for navbar items without dedicated pages', async () => {
    const PlaceholderPage = (await import('../PlaceholderPage.vue')).default;
    const wrapper = mount(PlaceholderPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          }
        }
      }
    });

    expect(wrapper.text()).toContain('Configuração do Split');
    expect(wrapper.text()).toContain('Financeiro');
    expect(wrapper.text()).toContain('Maquininha de Cartão');
    expect(wrapper.text()).toContain('Registros de Configuração do Split');
    expect(wrapper.text()).toContain('Fluxo Vetus');
    expect(wrapper.text()).toContain('Maquininhas');
    expect(wrapper.text()).toContain('Exportar');
    expect(wrapper.text()).not.toContain('ainda nao foi disponibilizado');
  });
});

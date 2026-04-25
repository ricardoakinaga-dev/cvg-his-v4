import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

const mockApiRequest = vi.fn();
const mockInitWidgets = vi.fn();

const mockAppStore = {
  recentRoutes: [],
  favoriteRoutes: []
};

vi.mock('@/services/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

vi.mock('@/stores/app', () => ({
  useAppStore: () => mockAppStore
}));

vi.mock('@/stores/widgets', () => ({
  useWidgetStore: () => ({
    initWidgets: mockInitWidgets
  })
}));

function currentMonthDayDate(year: string): string {
  return `${year}-${new Date().toISOString().slice(5, 10)}`;
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockReset();
    mockInitWidgets.mockReset();
  });

  it('loads the Vetus-like home panels allowed by the current session permissions', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: [
              'counter_sale.read',
              'owners.read',
              'patients.read',
              'scheduling.read',
              'product.read'
            ]
          }
        });
      }

      if (path === '/counter-sales?status=open') {
        return Promise.resolve({ items: [{ id: 'sale-open-tile' }, { id: 'sale-open-tile-2' }] });
      }

      if (typeof path === 'string' && path.startsWith('/counter-sales?status=open&dateFrom=')) {
        return Promise.resolve({
          items: [
            {
              id: 'sale-open-1',
              number: 'CS-000001',
              ownerId: null,
              balanceDue: 202.52,
              createdAt: '2026-04-25T10:00:00.000Z'
            }
          ]
        });
      }

      if (path === '/counter-sales?status=closed') {
        return Promise.resolve({ items: [{ id: 'sale-closed-1' }] });
      }

      if (path === '/owners') {
        return Promise.resolve({
          items: [
            {
              id: 'owner-1',
              fullName: 'Cliente Aniversariante',
              profile: { birthDate: currentMonthDayDate('1990') }
            },
            { id: 'owner-2', fullName: 'Cliente Sem Aniversário' }
          ]
        });
      }

      if (path === '/patients') {
        return Promise.resolve({
          items: [
            {
              id: 'patient-1',
              name: 'Animal Aniversariante',
              primaryOwnerId: 'owner-1',
              birthDateApproximate: currentMonthDayDate('2020')
            }
          ]
        });
      }

      if (path === '/appointments') {
        return Promise.resolve({ total: 3, items: [] });
      }

      if (path === '/products') {
        return Promise.resolve({ total: 4, items: [] });
      }

      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          }
        }
      }
    });

    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith('/auth/session');
    expect(mockApiRequest).toHaveBeenCalledWith('/counter-sales?status=open');
    expect(mockApiRequest).toHaveBeenCalledWith('/counter-sales?status=closed');
    expect(mockApiRequest).toHaveBeenCalledWith('/owners');
    expect(mockApiRequest).toHaveBeenCalledWith('/patients');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/queue');
    expect(mockApiRequest).toHaveBeenCalledWith('/appointments');
    expect(mockApiRequest).toHaveBeenCalledWith('/products');
    expect(
      mockApiRequest.mock.calls.some(
        ([path]) =>
          typeof path === 'string' && path.startsWith('/counter-sales?status=open&dateFrom=')
      )
    ).toBe(true);

    expect(wrapper.text()).toContain('Início');
    expect(wrapper.text()).toContain('Ver fila');
    expect(wrapper.text()).toContain('Comandas abertas');
    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Produtos');
    expect(wrapper.text()).toContain('Vendas');
    expect(wrapper.text().replace(/\u00a0/g, ' ')).toContain('Total a pagar: R$ 202,52');
    expect(wrapper.text()).toContain('Cliente Aniversariante');
    expect(wrapper.text()).toContain('Animal Aniversariante');
    expect(wrapper.text()).not.toContain('Contexto');
    expect(mockInitWidgets).toHaveBeenCalledTimes(1);
  });
});

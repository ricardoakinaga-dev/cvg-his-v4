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

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiRequest.mockReset();
    mockInitWidgets.mockReset();
  });

  it('loads only metrics allowed by the current session permissions', async () => {
    mockApiRequest.mockImplementation((path: string) => {
      if (path === '/auth/session') {
        return Promise.resolve({
          access: {
            permissionCodes: ['owners.read', 'patients.read']
          }
        });
      }

      if (path === '/owners') {
        return Promise.resolve({ items: [{ id: 'owner-1' }, { id: 'owner-2' }] });
      }

      if (path === '/patients') {
        return Promise.resolve({ items: [{ id: 'patient-1' }] });
      }

      return Promise.reject(new Error(`Unexpected path: ${path}`));
    });

    const DashboardPage = (await import('../DashboardPage.vue')).default;
    const wrapper = mount(DashboardPage);

    await flushPromises();

    expect(mockApiRequest).toHaveBeenCalledWith('/auth/session');
    expect(mockApiRequest).toHaveBeenCalledWith('/patients');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/owners');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/appointments');
    expect(mockApiRequest).not.toHaveBeenCalledWith('/queue');

    expect(wrapper.text()).toContain('Início');
    expect(wrapper.text()).toContain('Ver fila');
    expect(wrapper.text()).toContain('Pacientes');
    expect(wrapper.text()).not.toContain('Fila operacional');
    expect(wrapper.text()).not.toContain('Contexto');
    expect(mockInitWidgets).toHaveBeenCalledTimes(1);
  });
});

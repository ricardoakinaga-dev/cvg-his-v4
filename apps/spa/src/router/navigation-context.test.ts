import { beforeEach, describe, expect, it, vi } from 'vitest';

const app = vi.hoisted(() => ({ setPageTitle: vi.fn(), addRecentRoute: vi.fn() }));
vi.mock('@/stores/app', () => ({ useAppStore: () => app }));
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ isAuthenticated: true, needsMfa: false }) }));
vi.mock('./public-routes', () => ({ publicRoutes: [
  { path: '/context-first', component: { template: '<h1>Primeira tarefa</h1>' }, meta: { title: 'Primeira tarefa', breadcrumb: 'Primeira' } },
  { path: '/context-second', component: { template: '<h1>Segunda tarefa</h1>' }, meta: { title: 'Segunda tarefa', breadcrumb: 'Segunda' } }
] }));
import { router } from './index';

describe('navigation context after guards', () => {
  beforeEach(async () => {
    await router.push('/context-first');
    vi.clearAllMocks();
  });

  it('keeps the title and recents when a leave guard declines', async () => {
    const title = document.title;
    const remove = router.beforeEach(to => to.path !== '/context-second');
    try {
      await router.push('/context-second');
      expect(router.currentRoute.value.path).toBe('/context-first');
      expect(document.title).toBe(title);
      expect(app.setPageTitle).not.toHaveBeenCalled();
      expect(app.addRecentRoute).not.toHaveBeenCalled();
    } finally { remove(); }
  });

  it('does not record duplicate navigation as a new visit', async () => {
    await router.push('/context-first');
    expect(app.addRecentRoute).not.toHaveBeenCalled();
  });

  it('updates context after a successful navigation', async () => {
    await router.push('/context-second');
    expect(document.title).toBe('Segunda tarefa · CVG HIS SPA');
    expect(app.setPageTitle).toHaveBeenCalledWith('Segunda tarefa');
    expect(app.addRecentRoute).toHaveBeenCalledWith(expect.objectContaining({ path: '/context-second' }));
  });
});

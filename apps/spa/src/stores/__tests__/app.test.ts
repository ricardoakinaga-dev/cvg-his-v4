import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppStore } from '../app';

const legacyRecentKey = 'cvg-his-v2:spa:recent-routes';
const legacyFavoriteKey = 'cvg-his-v2:spa:favorite-routes';

describe('app workspace navigation state', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('migrates legacy navigation state into the authenticated workspace namespace', () => {
    localStorage.setItem(
      legacyRecentKey,
      JSON.stringify([{ path: '/appointments', label: 'Agenda', icon: 'calendar' }])
    );
    localStorage.setItem(legacyFavoriteKey, JSON.stringify(['/appointments']));

    const store = useAppStore();
    store.setWorkspaceIdentity('account-a:user-a');

    expect(store.recentRoutes).toHaveLength(1);
    expect(store.favoriteRoutes).toEqual(['/appointments']);
    expect(localStorage.getItem(legacyRecentKey)).toBeNull();
    expect(localStorage.getItem(legacyFavoriteKey)).toBeNull();
    expect(
      localStorage.getItem('cvg-his-v2:spa:recent-routes:workspace:account-a%3Auser-a')
    ).toContain('/appointments');
  });

  it('does not expose one user\'s route identifiers to another user in the same browser', () => {
    const store = useAppStore();
    store.setWorkspaceIdentity('account-a:user-a');
    store.addRecentRoute({ path: '/patients/patient-a', label: 'Paciente A' });
    store.toggleFavoriteRoute('/patients/patient-a');

    store.setWorkspaceIdentity(null);
    expect(store.recentRoutes).toEqual([]);
    expect(store.favoriteRoutes).toEqual([]);

    store.setWorkspaceIdentity('account-b:user-b');
    expect(store.recentRoutes).toEqual([]);
    expect(store.favoriteRoutes).toEqual([]);

    store.setWorkspaceIdentity('account-a:user-a');
    expect(store.recentRoutes.map((route) => route.path)).toEqual(['/patients/patient-a']);
    expect(store.favoriteRoutes).toEqual(['/patients/patient-a']);
  });
});

import { ref, readonly } from 'vue';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

interface EntityCacheOptions<T> {
  fetchFn: (id: string) => Promise<T>;
  staleAfterMs?: number;
}

const ownerCache = new Map<string, CacheEntry<{ id: string; fullName: string }>>();
const patientCache = new Map<string, CacheEntry<{ id: string; name: string }>>();
const userCache = new Map<string, CacheEntry<{ id: string; displayName: string }>>();

const ownerPromises = new Map<string, Promise<{ id: string; fullName: string }>>();
const patientPromises = new Map<string, Promise<{ id: string; name: string }>>();
const userPromises = new Map<string, Promise<{ id: string; displayName: string }>>();

export function useEntityCache() {
  const loading = ref<Set<string>>(new Set());

  async function getOwnerName(id: string): Promise<string> {
    if (!id) return '—';
    const cached = ownerCache.get(id);
    if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
      return cached.data.fullName;
    }
    const existing = ownerPromises.get(id);
    if (existing) {
      return (await existing).fullName;
    }
    loading.value.add(id);
    try {
      const { ownerService } = await import('@/services/owner');
      const promise = ownerService.getById(id).then((owner) => {
        ownerCache.set(id, {
          data: { id: owner.id, fullName: owner.fullName },
          fetchedAt: Date.now()
        });
        ownerPromises.delete(id);
        return { id: owner.id, fullName: owner.fullName };
      });
      ownerPromises.set(id, promise);
      const result = await promise;
      return result.fullName;
    } catch {
      ownerPromises.delete(id);
      return `Tutor ${id.slice(0, 8)}...`;
    } finally {
      loading.value.delete(id);
    }
  }

  async function getPatientName(id: string): Promise<string> {
    if (!id) return '—';
    const cached = patientCache.get(id);
    if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
      return cached.data.name;
    }
    const existing = patientPromises.get(id);
    if (existing) {
      return (await existing).name;
    }
    loading.value.add(id);
    try {
      const { patientService } = await import('@/services/patient');
      const promise = patientService.getById(id).then((patient) => {
        patientCache.set(id, {
          data: { id: patient.id, name: patient.name },
          fetchedAt: Date.now()
        });
        patientPromises.delete(id);
        return { id: patient.id, name: patient.name };
      });
      patientPromises.set(id, promise);
      const result = await promise;
      return result.name;
    } catch {
      patientPromises.delete(id);
      return `Paciente ${id.slice(0, 8)}...`;
    } finally {
      loading.value.delete(id);
    }
  }

  async function getUserName(id: string): Promise<string> {
    if (!id) return '—';
    const cached = userCache.get(id);
    if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
      return cached.data.displayName;
    }
    const existing = userPromises.get(id);
    if (existing) {
      return (await existing).displayName;
    }
    loading.value.add(id);
    try {
      const { userService } = await import('@/services/user');
      const promise = userService.getById(id).then((user) => {
        userCache.set(id, {
          data: { id: user.id, displayName: user.displayName },
          fetchedAt: Date.now()
        });
        userPromises.delete(id);
        return { id: user.id, displayName: user.displayName };
      });
      userPromises.set(id, promise);
      const result = await promise;
      return result.displayName;
    } catch {
      userPromises.delete(id);
      return `User ${id.slice(0, 8)}...`;
    } finally {
      loading.value.delete(id);
    }
  }

  function preloadOwners(owners: { id: string; fullName: string }[]) {
    for (const owner of owners) {
      ownerCache.set(owner.id, {
        data: { id: owner.id, fullName: owner.fullName },
        fetchedAt: Date.now()
      });
    }
  }

  function preloadPatients(patients: { id: string; name: string }[]) {
    for (const patient of patients) {
      patientCache.set(patient.id, {
        data: { id: patient.id, name: patient.name },
        fetchedAt: Date.now()
      });
    }
  }

  async function preloadUsers(users: { id: string; displayName: string }[]) {
    for (const user of users) {
      userCache.set(user.id, {
        data: { id: user.id, displayName: user.displayName },
        fetchedAt: Date.now()
      });
    }
  }

  async function preloadUserNames(ids: string[]): Promise<void> {
    const uncached = ids.filter((id) => {
      if (!id) return false;
      const cached = userCache.get(id);
      return !cached || Date.now() - cached.fetchedAt >= 5 * 60 * 1000;
    });

    if (uncached.length === 0) return;

    try {
      const { userService } = await import('@/services/user');
      const allUsers = await userService.list();
      const userMap = new Map(allUsers.map((u) => [u.id, u.displayName]));

      for (const id of uncached) {
        const name = userMap.get(id);
        if (name) {
          userCache.set(id, {
            data: { id, displayName: name },
            fetchedAt: Date.now()
          });
        }
      }
    } catch {
      // Fallback: individual fetches will happen on demand
    }
  }

  function clearCache() {
    ownerCache.clear();
    patientCache.clear();
    userCache.clear();
    ownerPromises.clear();
    patientPromises.clear();
    userPromises.clear();
  }

  return {
    getOwnerName,
    getPatientName,
    getUserName,
    preloadOwners,
    preloadPatients,
    preloadUsers,
    preloadUserNames,
    clearCache,
    loading: readonly(loading)
  };
}

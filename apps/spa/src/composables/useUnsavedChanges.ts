import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, type RouteLocationNormalized } from 'vue-router';
import { unsavedChangesCoordinatorKey } from './unsavedChangesCoordinator';

/** Component-local protection. No personal data is persisted in browser storage. */
export function useUnsavedChanges(snapshot: () => string, options: {
  resetsForm?: (to: RouteLocationNormalized, from: RouteLocationNormalized) => boolean;
} = {}) {
  const cleanSnapshot = ref(snapshot());
  const dirty = computed(() => snapshot() !== cleanSnapshot.value);
  const leaveRequested = ref(false);
  const coordinator = inject(unsavedChangesCoordinatorKey, undefined);
  let pending: Promise<boolean> | undefined;
  let settle: ((leave: boolean) => void) | undefined;

  function resolveLeave(leave: boolean) {
    leaveRequested.value = false;
    settle?.(leave);
    settle = undefined;
    pending = undefined;
  }

  function requestLeave() {
    if (!dirty.value) return true;
    if (!pending) {
      pending = new Promise<boolean>((resolve) => { settle = resolve; });
      leaveRequested.value = true;
    }
    return pending;
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return;
    event.preventDefault();
    event.returnValue = '';
  }

  onBeforeRouteLeave(requestLeave);
  onBeforeRouteUpdate((to, from) =>
    (to.path === from.path && !options.resetsForm?.(to, from)) || requestLeave()
  );
  const unregister = coordinator?.register({ snapshot, confirm: requestLeave, discard: (value) => { cleanSnapshot.value = value; } });
  onMounted(() => window.addEventListener('beforeunload', beforeUnload));
  onBeforeUnmount(() => {
    unregister?.();
    window.removeEventListener('beforeunload', beforeUnload);
    resolveLeave(false);
  });

  return {
    dirty,
    leaveRequested,
    resolveLeave,
    markClean(value = snapshot()) { cleanSnapshot.value = value; }
  };
}

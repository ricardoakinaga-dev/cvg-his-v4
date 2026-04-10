import { ref } from 'vue';

type RegisterSWOptions = {
  immediate?: boolean;
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: Error) => void;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration?: ServiceWorkerRegistration) => void;
};

export function useRegisterSW(_options?: RegisterSWOptions) {
  const needRefresh = ref(false);
  const offlineReady = ref(false);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async () => undefined,
    regist: async () => undefined
  };
}

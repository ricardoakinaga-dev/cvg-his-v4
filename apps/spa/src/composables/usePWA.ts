import { ref, onMounted, onUnmounted } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { spaRuntimeConfig } from '@/config/runtime';

export interface PWAMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  action?: {
    text: string;
    handler: () => void;
  };
}

const messages = ref<PWAMessage[]>([]);
const disablePwa =
  spaRuntimeConfig.disablePwa ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export function usePWA() {
  if (disablePwa) {
    const offlineReady = ref(false);
    const needRefresh = ref(false);
    const updateServiceWorker = async () => {};
    return {
      needRefresh,
      offlineReady,
      updateServiceWorker,
      messages,
      dismissMessage: () => {
        messages.value = [];
      },
      dismissAndUpdate: () => {
        messages.value = [];
      },
      regist: async () => undefined
    };
  }

  const {
    needRefresh,
    updateServiceWorker,
    offlineReady,
    regist
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log('[PWA] Service worker registered:', swUrl, r);
    },
    onRegisterError(error) {
      console.error('[PWA] Registration error:', error);
    },
    onNeedRefresh() {
      console.log('[PWA] New content available, refresh needed');
      messages.value.push({
        type: 'info',
        message: 'Nova versão disponível!',
        action: {
          text: 'Atualizar',
          handler: () => {
            updateServiceWorker();
          }
        }
      });
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline');
      offlineReady.value = true;
      messages.value.push({
        type: 'success',
        message: 'Pronto para usar offline!'
      });
      // Auto-hide after 3 seconds
      setTimeout(() => {
        dismissMessage();
      }, 3000);
    },
    onRegistered(registration) {
      console.log('[PWA] SW registered:', registration);
    }
  });

  const dismissMessage = () => {
    messages.value = [];
  };

  const dismissAndUpdate = () => {
    dismissMessage();
    updateServiceWorker();
  };

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    messages,
    dismissMessage,
    dismissAndUpdate,
    regist
  };
}

// Hook to track online/offline status
export function useNetworkStatus() {
  const isOnline = ref(navigator.onLine);
  const isOffline = ref(!navigator.onLine);

  const updateNetworkStatus = () => {
    isOnline.value = navigator.onLine;
    isOffline.value = !navigator.onLine;
  };

  onMounted(() => {
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  });

  onUnmounted(() => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  });

  return {
    isOnline,
    isOffline
  };
}

// Composable to use in components that need offline awareness
export function useOfflineData<T>(key: string, fetchFn: () => Promise<T>, options?: {
  ttl?: number; // Time to live in milliseconds
  enabled?: boolean;
}) {
  const { isOnline } = useNetworkStatus();
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const lastFetched = ref<number | null>(null);

  const cacheKey = `pwa-cache-${key}`;
  const ttl = options?.ttl || 5 * 60 * 1000; // Default 5 minutes

  const getCached = (): T | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
          return cachedData;
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  };

  const setCached = (value: T) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: value,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore cache errors
    }
  };

  const fetchData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const result = await fetchFn();
      data.value = result;
      lastFetched.value = Date.now();
      setCached(result);
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e));
      // Try to return cached data on error
      const cached = getCached();
      if (cached) {
        data.value = cached;
      }
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    // Try to get cached data first
    const cached = getCached();
    if (cached) {
      data.value = cached;
    }

    // Fetch fresh data if online
    if (isOnline.value && options?.enabled !== false) {
      fetchData();
    }
  });

  return {
    data,
    loading,
    error,
    lastFetched,
    refetch: fetchData
  };
}

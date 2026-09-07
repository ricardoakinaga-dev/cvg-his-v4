import { ref, onMounted, onBeforeUnmount, getCurrentInstance, type Ref } from 'vue';

export interface UseListDataOptions<T> {
  fetchFn: (search?: string) => Promise<T[]>;
  entityLabel: string;
  withSearch?: boolean;
  onLoaded?: (items: T[]) => Promise<void>;
}

export function useListData<T>(options: UseListDataOptions<T>) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref('');
  const search = ref('');
  let latestRequest = 0;
  let disposed = false;

  async function load() {
    if (disposed) return;
    const request = ++latestRequest;
    const isCurrent = () => !disposed && request === latestRequest;
    const searchValue = options.withSearch ? search.value || undefined : undefined;
    loading.value = true;
    if (!isCurrent()) return;
    error.value = '';
    if (!isCurrent()) return;
    try {
      const result = await options.fetchFn(searchValue);
      if (!isCurrent()) return;
      items.value = result;
      // Publishing items can synchronously trigger a watcher that starts a new load.
      if (isCurrent() && options.onLoaded) {
        await options.onLoaded(items.value);
      }
    } catch (err: unknown) {
      if (isCurrent()) {
        error.value = err instanceof Error ? err.message : `Erro ao carregar ${options.entityLabel}`;
      }
    } finally {
      if (isCurrent()) loading.value = false;
    }
  }

  if (getCurrentInstance()) {
    onMounted(load);
    onBeforeUnmount(() => {
      disposed = true;
      latestRequest++;
    });
  }

  return {
    items,
    loading,
    error,
    search,
    load
  };
}

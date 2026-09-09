import { ref, onMounted, onBeforeUnmount, getCurrentInstance, type Ref } from 'vue';

export interface UseListDataOptions<T> {
  fetchFn: (search?: string) => Promise<T[]>;
  entityLabel: string;
  withSearch?: boolean;
  onLoaded?: (items: T[]) => Promise<void>;
  /** Remove stale rows when the server says the caller is no longer allowed to see them. */
  clearItemsOnErrorStatuses?: readonly number[];
}

function readErrorMetadata(error: unknown): { status: number | null; code: string | null } {
  if (!error || typeof error !== 'object') return { status: null, code: null };
  const record = error as Record<string, unknown>;
  const rawStatus = record.status ?? record.statusCode;
  const status = typeof rawStatus === 'number' && Number.isFinite(rawStatus)
    ? rawStatus
    : typeof rawStatus === 'string' && /^\d+$/.test(rawStatus)
      ? Number(rawStatus)
      : null;
  const code = typeof record.code === 'string'
    ? record.code
    : ['AbortError', 'NetworkError', 'TypeError'].includes(String(record.name))
      ? String(record.name)
      : null;
  return { status, code };
}

export function useListData<T>(options: UseListDataOptions<T>) {
  const items = ref<T[]>([]) as Ref<T[]>;
  const loading = ref(false);
  const error = ref('');
  const errorStatus = ref<number | null>(null);
  const errorCode = ref<string | null>(null);
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
    errorStatus.value = null;
    errorCode.value = null;
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
        const metadata = readErrorMetadata(err);
        errorStatus.value = metadata.status;
        errorCode.value = metadata.code;
        if (options.clearItemsOnErrorStatuses?.includes(metadata.status ?? -1)) {
          items.value = [];
        }
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
    errorStatus,
    errorCode,
    search,
    load
  };
}

import { ref, onMounted, type Ref } from 'vue';

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
  const search = options.withSearch ? ref('') : null;

  async function load() {
    loading.value = true;
    error.value = '';
    try {
      const searchValue = search?.value || undefined;
      items.value = await options.fetchFn(searchValue);
      if (options.onLoaded) {
        await options.onLoaded(items.value);
      }
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : `Erro ao carregar ${options.entityLabel}`;
    } finally {
      loading.value = false;
    }
  }

  onMounted(load);

  return {
    items,
    loading,
    error,
    search,
    load
  };
}

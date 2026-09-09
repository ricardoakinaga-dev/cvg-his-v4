import { mount } from '@vue/test-utils';
import { defineComponent, h, watch } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { useListData } from '../useListData';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useListData request ownership', () => {
  it.each(['resolve', 'reject'] as const)(
    'ignores an older fetch that %ss after the latest succeeds',
    async (outcome) => {
      const old = deferred<string[]>();
      const current = deferred<string[]>();
      const onLoaded = vi.fn(async () => {});
      const list = useListData({
        fetchFn: vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise),
        entityLabel: 'items',
        onLoaded
      });
      const first = list.load();
      const second = list.load();
      current.resolve(['current']);
      await second;
      if (outcome === 'resolve') old.resolve(['old']);
      else old.reject(new Error('old failure'));
      await first;
      expect(list.items.value).toEqual(['current']);
      expect(list.error.value).toBe('');
      expect(list.loading.value).toBe(false);
      expect(onLoaded).toHaveBeenCalledTimes(1);
      expect(onLoaded).toHaveBeenCalledWith(['current']);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'keeps the current fetch loading when the older fetch %ss',
    async (outcome) => {
      const old = deferred<string[]>();
      const current = deferred<string[]>();
      const onLoaded = vi.fn(async () => {});
      const list = useListData({
        fetchFn: vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise),
        entityLabel: 'items',
        onLoaded
      });
      const first = list.load();
      const second = list.load();
      if (outcome === 'resolve') old.resolve(['old']);
      else old.reject(new Error('old failure'));
      await first;
      expect(list.items.value).toEqual([]);
      expect(list.error.value).toBe('');
      expect(list.loading.value).toBe(true);
      expect(onLoaded).not.toHaveBeenCalled();
      current.reject(new Error('current failure'));
      await second;
      expect(list.error.value).toBe('current failure');
      expect(list.loading.value).toBe(false);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'does not let an older onLoaded that %ss finish a newer load',
    async (outcome) => {
      const oldCallback = deferred<void>();
      const currentCallback = deferred<void>();
      const onLoaded = vi.fn().mockReturnValueOnce(oldCallback.promise).mockReturnValueOnce(currentCallback.promise);
      const list = useListData({
        fetchFn: vi.fn().mockResolvedValueOnce(['old']).mockResolvedValueOnce(['current']),
        entityLabel: 'items',
        onLoaded
      });
      const first = list.load();
      await Promise.resolve();
      const second = list.load();
      await Promise.resolve();
      expect(onLoaded).toHaveBeenCalledTimes(2);
      if (outcome === 'resolve') oldCallback.resolve();
      else oldCallback.reject(new Error('old callback failure'));
      await first;
      expect(list.items.value).toEqual(['current']);
      expect(list.error.value).toBe('');
      expect(list.loading.value).toBe(true);
      currentCallback.reject(new Error('current callback failure'));
      await second;
      expect(list.error.value).toBe('current callback failure');
      expect(list.loading.value).toBe(false);
    }
  );

  it.each(['resolve', 'reject'] as const)(
    'ignores a fetch that %ss after unmount and makes subsequent loads inert',
    async (outcome) => {
      const request = deferred<string[]>();
      const fetchFn = vi.fn(() => request.promise);
      const onLoaded = vi.fn(async () => {});
      let list!: ReturnType<typeof useListData<string>>;
      const wrapper = mount(defineComponent({
        setup() {
          list = useListData({ fetchFn, entityLabel: 'items', onLoaded });
          return () => h('div');
        }
      }));
      expect(fetchFn).toHaveBeenCalledTimes(1);
      wrapper.unmount();
      const snapshot = [list.items.value, list.error.value, list.loading.value];
      if (outcome === 'resolve') request.resolve(['late']);
      else request.reject(new Error('late failure'));
      await request.promise.catch(() => {});
      await Promise.resolve();
      expect([list.items.value, list.error.value, list.loading.value]).toEqual(snapshot);
      expect(onLoaded).not.toHaveBeenCalled();
      await list.load();
      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
  );

  it('ignores onLoaded rejection after unmount', async () => {
    const callback = deferred<void>();
    let list!: ReturnType<typeof useListData<string>>;
    const wrapper = mount(defineComponent({
      setup() {
        list = useListData({ fetchFn: async () => ['loaded'], entityLabel: 'items', onLoaded: () => callback.promise });
        return () => h('div');
      }
    }));
    await Promise.resolve();
    wrapper.unmount();
    callback.reject(new Error('late callback failure'));
    await callback.promise.catch(() => {});
    expect(list.items.value).toEqual(['loaded']);
    expect(list.error.value).toBe('');
    expect(list.loading.value).toBe(true);
  });

  it('retries the current search and keeps prior data while clearing the current error', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(['initial']).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(['filtered']);
    const list = useListData({ fetchFn, entityLabel: 'items', withSearch: true });
    await list.load();
    list.search.value = 'ana';
    await list.load();
    expect(list.items.value).toEqual(['initial']);
    expect(list.error.value).toBe('offline');
    const retry = list.load();
    expect(list.error.value).toBe('');
    expect(list.loading.value).toBe(true);
    await retry;
    expect(fetchFn.mock.calls).toEqual([[undefined], ['ana'], ['ana']]);
    expect(list.search.value).toBe('ana');
    expect(list.items.value).toEqual(['filtered']);
  });

  it.each(['resolve', 'reject'] as const)(
    'preserves the latest failure and retry context when an older fetch %ss',
    async (outcome) => {
      const old = deferred<string[]>();
      const current = deferred<string[]>();
      const fetchFn = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise).mockResolvedValueOnce(['retried']);
      const onLoaded = vi.fn(async () => {});
      const list = useListData({ fetchFn, entityLabel: 'items', withSearch: true, onLoaded });
      list.search.value = 'old query';
      const first = list.load();
      list.search.value = 'current query';
      const second = list.load();
      current.reject(new Error('current failure'));
      await second;
      if (outcome === 'resolve') old.resolve(['old']);
      else old.reject(new Error('old failure'));
      await first;
      expect(list.items.value).toEqual([]);
      expect(list.error.value).toBe('current failure');
      expect(list.loading.value).toBe(false);
      expect(onLoaded).not.toHaveBeenCalled();
      await list.load();
      expect(fetchFn.mock.calls).toEqual([['old query'], ['current query'], ['current query']]);
      expect(list.items.value).toEqual(['retried']);
      expect(list.error.value).toBe('');
    }
  );

  it('does not invoke an obsolete callback if an item watcher starts a newer load', async () => {
    const current = deferred<string[]>();
    const onLoaded = vi.fn(async () => {});
    const list = useListData({
      fetchFn: vi.fn().mockResolvedValueOnce(['old']).mockReturnValueOnce(current.promise),
      entityLabel: 'items', onLoaded
    });
    let second!: Promise<void>;
    const stop = watch(list.items, () => { second = list.load(); }, { flush: 'sync', once: true });
    await list.load();
    expect(onLoaded).not.toHaveBeenCalled();
    expect(list.loading.value).toBe(true);
    current.resolve(['current']);
    await second;
    expect(onLoaded).toHaveBeenCalledExactlyOnceWith(['current']);
    stop();
  });

  it('exposes transport metadata without changing the existing error message contract', async () => {
    const failure = Object.assign(new Error('private upstream details'), {
      status: 503,
      code: 'UPSTREAM_UNAVAILABLE'
    });
    const list = useListData({
      fetchFn: vi.fn().mockRejectedValue(failure),
      entityLabel: 'items'
    });

    await list.load();

    expect(list.error.value).toBe('private upstream details');
    expect(list.errorStatus.value).toBe(503);
    expect(list.errorCode.value).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('clears rows when a configured authorization status invalidates visibility', async () => {
    const list = useListData({
      fetchFn: vi.fn()
        .mockResolvedValueOnce(['visible'])
        .mockRejectedValueOnce(Object.assign(new Error('forbidden'), { status: 403 })),
      entityLabel: 'items',
      clearItemsOnErrorStatuses: [403]
    });

    await list.load();
    expect(list.items.value).toEqual(['visible']);
    await list.load();

    expect(list.items.value).toEqual([]);
    expect(list.errorStatus.value).toBe(403);
  });
});

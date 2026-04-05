import { describe, it, expect, vi } from 'vitest';
import { useListData } from '@/composables/useListData';

describe('useListData', () => {
  it('initializes with empty items, not loading, no error', () => {
    const fetchFn = vi.fn().mockResolvedValue([]);
    const { items, loading, error } = useListData({
      fetchFn,
      entityLabel: 'test'
    });
    expect(items.value).toEqual([]);
    expect(loading.value).toBe(false);
    expect(error.value).toBe('');
  });

  it('fetches data when load is called', async () => {
    const data = [{ id: '1', name: 'Test' }];
    const fetchFn = vi.fn().mockResolvedValue(data);
    const { items, loading, error, load } = useListData({
      fetchFn,
      entityLabel: 'test'
    });
    await load();
    expect(fetchFn).toHaveBeenCalled();
    expect(items.value).toEqual(data);
    expect(loading.value).toBe(false);
    expect(error.value).toBe('');
  });

  it('sets error on fetch failure', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const { loading, error, load } = useListData({
      fetchFn,
      entityLabel: 'test'
    });
    await load();
    expect(loading.value).toBe(false);
    expect(error.value).toBe('Network error');
  });

  it('uses generic error message when error is not an Error', async () => {
    const fetchFn = vi.fn().mockRejectedValue('string error');
    const { error, load } = useListData({
      fetchFn,
      entityLabel: 'items'
    });
    await load();
    expect(error.value).toBe('Erro ao carregar items');
  });

  it('calls onLoaded callback after fetch', async () => {
    const onLoaded = vi.fn();
    const data = [{ id: '1' }];
    const fetchFn = vi.fn().mockResolvedValue(data);
    const { load } = useListData({
      fetchFn,
      entityLabel: 'test',
      onLoaded
    });
    await load();
    expect(onLoaded).toHaveBeenCalledWith(data);
  });

  it('can reload multiple times', async () => {
    const fetchFn = vi.fn().mockResolvedValue([]);
    const { load } = useListData({
      fetchFn,
      entityLabel: 'test'
    });
    await load();
    await load();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityForm } from '../useFormValidation';

describe('useEntityForm success transition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('blocks a second write while the success feedback owns the redirect', async () => {
    const createFn = vi.fn(async () => ({ id: 'entity-1' }));
    const form = useEntityForm({
      createFn,
      entityLabel: 'Registro',
      redirectBase: '/records',
      rules: {
        name: [(value: unknown) => (String(value ?? '').trim() ? null : 'Nome obrigatório')]
      }
    });

    await expect(form.handleSubmit(() => ({ name: 'Primeiro' }), { name: 'Primeiro' })).resolves.toBe(true);
    await expect(form.handleSubmit(() => ({ name: 'Segundo' }), { name: 'Segundo' })).resolves.toBe(false);

    expect(createFn).toHaveBeenCalledOnce();
    expect(form.successMessage.value).toBe('Registro cadastrado com sucesso!');
  });
});

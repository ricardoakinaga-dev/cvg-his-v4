import { describe, it, expect, vi } from 'vitest';
import { useFormValidation, useEntityForm } from '@/composables/useFormValidation';

describe('useFormValidation', () => {
  it('initializes with empty errors and false submitting', () => {
    const { errors, formError, successMessage, submitting } = useFormValidation();
    expect(Object.keys(errors).length).toBe(0);
    expect(formError.value).toBe('');
    expect(successMessage.value).toBe('');
    expect(submitting.value).toBe(false);
  });

  it('validates fields with rules', () => {
    const { validate, validateField, errors } = useFormValidation({
      rules: {
        name: [(v: unknown) => (!(v as string)?.trim() ? 'Required' : null)],
        email: [(v: unknown) => (!(v as string)?.includes('@') ? 'Invalid email' : null)]
      }
    });

    expect(validateField('name', '')).toBe(false);
    expect(errors['name']).toBe('Required');

    expect(validateField('name', 'John')).toBe(true);
    expect(errors['name']).toBeUndefined();
  });

  it('validates all fields at once with validate()', () => {
    const { validate, errors, touched } = useFormValidation({
      rules: {
        name: [(v: unknown) => (!(v as string)?.trim() ? 'Name is required' : null)],
        email: [(v: unknown) => (!(v as string)?.includes('@') ? 'Invalid email' : null)]
      }
    });

    const valid = validate({ name: '', email: 'bad' });

    expect(valid).toBe(false);
    expect(errors['name']).toBe('Name is required');
    expect(errors['email']).toBe('Invalid email');
    expect(touched['name']).toBe(true);
    expect(touched['email']).toBe(true);
  });

  it('returns true when all fields pass validation', () => {
    const { validate, errors } = useFormValidation({
      rules: {
        name: [(v: unknown) => (!(v as string)?.trim() ? 'Required' : null)]
      }
    });

    const valid = validate({ name: 'John' });

    expect(valid).toBe(true);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('clears all errors', () => {
    const { errors, setFieldError, clearErrors } = useFormValidation();
    setFieldError('name', 'Error');
    expect(errors['name']).toBe('Error');
    clearErrors();
    expect(Object.keys(errors).length).toBe(0);
  });

  it('marks all fields as touched', () => {
    const { touched, markAllTouched } = useFormValidation({
      rules: { name: [], email: [] }
    });
    expect(touched['name']).toBeUndefined();
    markAllTouched();
    expect(touched['name']).toBe(true);
    expect(touched['email']).toBe(true);
  });
});

describe('useEntityForm', () => {
  it('creates entity on submit', async () => {
    const createFn = vi.fn().mockResolvedValue({ id: 'new-id' });
    const { handleSubmit, formError, successMessage, submitting } = useEntityForm({
      createFn,
      entityLabel: 'item',
      redirectBase: '/items'
    });

    const result = await handleSubmit(() => ({ name: 'Test' }), { name: 'Test' });

    expect(result).toBe(true);
    expect(createFn).toHaveBeenCalledWith({ name: 'Test' });
    expect(successMessage.value).toContain('cadastrado com sucesso');
    expect(formError.value).toBe('');
    expect(submitting.value).toBe(false);
  });

  it('updates entity when in edit mode', async () => {
    const createFn = vi.fn();
    const updateFn = vi.fn().mockResolvedValue(undefined);
    const { handleSubmit, formError, successMessage } = useEntityForm({
      createFn,
      updateFn,
      entityLabel: 'item',
      redirectBase: '/items',
      isEdit: { value: true } as any,
      entityId: { value: '123' } as any
    });

    await handleSubmit(() => ({ name: 'Updated' }), { name: 'Updated' });

    expect(updateFn).toHaveBeenCalledWith('123', { name: 'Updated' });
    expect(successMessage.value).toContain('atualizado com sucesso');
    expect(formError.value).toBe('');
  });

  it('handles create error', async () => {
    const createFn = vi.fn().mockRejectedValue(new Error('Duplicate'));
    const { handleSubmit, formError } = useEntityForm({
      createFn,
      entityLabel: 'item',
      redirectBase: '/items'
    });

    await handleSubmit(() => ({ name: 'Test' }), { name: 'Test' });

    expect(formError.value).toBe('Duplicate');
  });
});

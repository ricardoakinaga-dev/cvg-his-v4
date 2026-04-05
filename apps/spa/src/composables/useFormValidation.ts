import { ref, reactive } from 'vue';
import type { Ref } from 'vue';

export type ValidationRule = (value: unknown) => string | null;

export interface UseFormValidationOptions {
  rules?: Record<string, ValidationRule[]>;
}

export function useFormValidation(options: UseFormValidationOptions = {}) {
  const errors = reactive<Record<string, string>>({});
  const touched = reactive<Record<string, boolean>>({});
  const formError = ref('');
  const successMessage = ref('');
  const submitting = ref(false);

  function validateField(field: string, value: unknown): boolean {
    const rules = options.rules?.[field] || [];
    for (const rule of rules) {
      const result = rule(value);
      if (result) {
        errors[field] = result;
        return false;
      }
    }
    delete errors[field];
    return true;
  }

  function validate(values: Record<string, unknown>): boolean {
    Object.keys(errors).forEach((k) => delete errors[k]);
    let valid = true;

    if (options.rules) {
      for (const field of Object.keys(options.rules)) {
        touched[field] = true;
        const fieldRules = options.rules[field] || [];
        for (const rule of fieldRules) {
          const result = rule(values[field]);
          if (result) {
            errors[field] = result;
            valid = false;
            break;
          }
        }
      }
    }

    return valid;
  }

  function setFieldError(field: string, message: string) {
    errors[field] = message;
  }

  function clearErrors() {
    Object.keys(errors).forEach((k) => delete errors[k]);
  }

  function touchField(field: string) {
    touched[field] = true;
  }

  function markAllTouched() {
    if (options.rules) {
      for (const field of Object.keys(options.rules)) {
        touched[field] = true;
      }
    }
  }

  return {
    errors,
    touched,
    formError,
    successMessage,
    submitting,
    validate,
    validateField,
    setFieldError,
    clearErrors,
    touchField,
    markAllTouched
  };
}

export function useEntityForm<TCreate, TUpdate = TCreate>(options: {
  createFn: (payload: TCreate) => Promise<{ id: string }>;
  updateFn?: (id: string, payload: TUpdate) => Promise<void>;
  entityLabel: string;
  successLabel?: string;
  redirectBase: string;
  rules?: Record<string, ValidationRule[]>;
  isEdit?: Ref<boolean>;
  entityId?: Ref<string>;
}) {
  const validation = useFormValidation({ rules: options.rules });
  const isEdit = options.isEdit || ref(false);
  const entityId = options.entityId || ref('');

  async function handleSubmit(
    buildPayload: () => TCreate | TUpdate,
    values: Record<string, unknown>
  ): Promise<boolean> {
    validation.markAllTouched();
    validation.formError.value = '';
    validation.successMessage.value = '';

    if (!validation.validate(values)) return false;

    validation.submitting.value = true;

    try {
      if (isEdit.value && options.updateFn) {
        await options.updateFn(entityId.value, buildPayload() as TUpdate);
        validation.successMessage.value = `${options.successLabel || options.entityLabel} atualizado com sucesso!`;
        setTimeout(() => {
          window.location.href = `${options.redirectBase}/${entityId.value}`;
        }, 1000);
      } else {
        const created = await options.createFn(buildPayload() as TCreate);
        validation.successMessage.value = `${options.successLabel || options.entityLabel} cadastrado com sucesso!`;
        setTimeout(() => {
          window.location.href = `${options.redirectBase}/${created.id}`;
        }, 1000);
      }
      return true;
    } catch (err: unknown) {
      validation.formError.value =
        err instanceof Error ? err.message : `Erro ao salvar ${options.entityLabel}`;
      return false;
    } finally {
      validation.submitting.value = false;
    }
  }

  return {
    ...validation,
    isEdit,
    entityId,
    handleSubmit
  };
}

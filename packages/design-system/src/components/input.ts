export interface InputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  attributes?: Record<string, string>;
}

export function renderInput(props: InputProps): string {
  const {
    id,
    label,
    type = 'text',
    placeholder,
    value,
    required = false,
    disabled = false,
    error,
    helpText,
    className = '',
    attributes = {}
  } = props;

  const hasError = !!error;
  const inputClasses = [
    'ds-input',
    hasError ? 'ds-input--error' : '',
    disabled ? 'ds-input--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const inputAttrs = {
    id,
    type,
    class: inputClasses,
    placeholder,
    value,
    required: required ? 'required' : undefined,
    disabled: disabled ? 'disabled' : undefined,
    'aria-invalid': hasError ? 'true' : undefined,
    'aria-describedby': hasError ? `${id}-error` : helpText ? `${id}-help` : undefined,
    ...attributes
  };

  const attrStr = Object.entries(inputAttrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const labelHtml = `<label for="${id}" class="ds-input__label">${label}${required ? ' <span class="ds-input__required" aria-hidden="true">*</span>' : ''}</label>`;
  const inputHtml = `<input ${attrStr} />`;
  const errorHtml = hasError
    ? `<p id="${id}-error" class="ds-input__error" role="alert">${error}</p>`
    : '';
  const helpHtml =
    helpText && !hasError ? `<p id="${id}-help" class="ds-input__help">${helpText}</p>` : '';

  return `<div class="ds-input__wrapper">${labelHtml}${inputHtml}${errorHtml}${helpHtml}</div>`;
}

export interface TextareaProps {
  id: string;
  label: string;
  placeholder?: string;
  value?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function renderTextarea(props: TextareaProps): string {
  const {
    id,
    label,
    placeholder,
    value,
    rows = 4,
    required = false,
    disabled = false,
    error,
    className = ''
  } = props;

  const hasError = !!error;
  const classes = [
    'ds-input',
    'ds-input--textarea',
    hasError ? 'ds-input--error' : '',
    disabled ? 'ds-input--disabled' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const attrs = {
    id,
    class: classes,
    placeholder,
    rows: String(rows),
    required: required ? 'required' : undefined,
    disabled: disabled ? 'disabled' : undefined,
    'aria-invalid': hasError ? 'true' : undefined,
    'aria-describedby': hasError ? `${id}-error` : undefined
  };

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const labelHtml = `<label for="${id}" class="ds-input__label">${label}</label>`;
  const textareaHtml = `<textarea ${attrStr}>${value ?? ''}</textarea>`;
  const errorHtml = hasError
    ? `<p id="${id}-error" class="ds-input__error" role="alert">${error}</p>`
    : '';

  return `<div class="ds-input__wrapper">${labelHtml}${textareaHtml}${errorHtml}</div>`;
}

export interface SelectProps {
  id: string;
  label: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function renderSelect(props: SelectProps): string {
  const {
    id,
    label,
    options,
    value,
    required = false,
    disabled = false,
    error,
    className = ''
  } = props;

  const hasError = !!error;
  const classes = ['ds-input', 'ds-input--select', hasError ? 'ds-input--error' : '', className]
    .filter(Boolean)
    .join(' ');

  const optionsHtml = options
    .map((opt) => {
      const selected = opt.value === value ? ' selected' : '';
      const optDisabled = opt.disabled ? ' disabled' : '';
      return `<option value="${opt.value}"${selected}${optDisabled}>${opt.label}</option>`;
    })
    .join('');

  const attrs = {
    id,
    class: classes,
    required: required ? 'required' : undefined,
    disabled: disabled ? 'disabled' : undefined,
    'aria-invalid': hasError ? 'true' : undefined
  };

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const labelHtml = `<label for="${id}" class="ds-input__label">${label}</label>`;
  const selectHtml = `<select ${attrStr}>${optionsHtml}</select>`;
  const errorHtml = hasError
    ? `<p id="${id}-error" class="ds-input__error" role="alert">${error}</p>`
    : '';

  return `<div class="ds-input__wrapper">${labelHtml}${selectHtml}${errorHtml}</div>`;
}

export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: string;
  ariaLabel?: string;
  className?: string;
  attributes?: Record<string, string>;
}

export function renderButton(props: ButtonProps): string {
  const {
    label,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    icon,
    ariaLabel,
    className = '',
    attributes = {}
  } = props;

  const classes = [
    'ds-btn',
    `ds-btn--${variant}`,
    `ds-btn--${size}`,
    disabled ? 'ds-btn--disabled' : '',
    loading ? 'ds-btn--loading' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const attrs = {
    type,
    class: classes,
    disabled: disabled || loading ? 'disabled' : undefined,
    'aria-label': ariaLabel || label,
    'aria-busy': loading ? 'true' : undefined,
    ...attributes
  };

  const attrStr = Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const iconHtml = icon ? `<span class="ds-btn__icon" aria-hidden="true">${icon}</span>` : '';
  const spinnerHtml = loading ? '<span class="ds-btn__spinner" aria-hidden="true"></span>' : '';
  const labelHtml = `<span class="ds-btn__label">${label}</span>`;

  return `<button ${attrStr}>${spinnerHtml}${iconHtml}${labelHtml}</button>`;
}

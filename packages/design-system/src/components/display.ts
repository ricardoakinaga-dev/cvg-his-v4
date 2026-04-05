export interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: string;
  children: string;
  className?: string;
  variant?: 'default' | 'elevated' | 'glass';
}

export function renderCard(props: CardProps): string {
  const { title, subtitle, headerAction, children, className = '', variant = 'default' } = props;

  const classes = ['ds-card', `ds-card--${variant}`, className].filter(Boolean).join(' ');

  const headerHtml = title
    ? `<div class="ds-card__header">
        <div>
          <h3 class="ds-card__title">${title}</h3>
          ${subtitle ? `<p class="ds-card__subtitle">${subtitle}</p>` : ''}
        </div>
        ${headerAction ? `<div class="ds-card__action">${headerAction}</div>` : ''}
      </div>`
    : '';

  return `<div class="${classes}">${headerHtml}<div class="ds-card__body">${children}</div></div>`;
}

export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  dot?: boolean;
  className?: string;
}

export function renderBadge(props: BadgeProps): string {
  const { label, variant = 'default', dot = false, className = '' } = props;

  const classes = ['ds-badge', `ds-badge--${variant}`, dot ? 'ds-badge--dot' : '', className]
    .filter(Boolean)
    .join(' ');

  const dotHtml = dot ? '<span class="ds-badge__dot"></span>' : '';

  return `<span class="${classes}" role="status">${dotHtml}${label}</span>`;
}

export interface AlertProps {
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  dismissible?: boolean;
  className?: string;
}

export function renderAlert(props: AlertProps): string {
  const { message, variant = 'info', title, dismissible = false, className = '' } = props;

  const icons: Record<string, string> = {
    info: '&#9432;',
    success: '&#10003;',
    warning: '&#9888;',
    danger: '&#10007;'
  };

  const classes = [
    'ds-alert',
    `ds-alert--${variant}`,
    dismissible ? 'ds-alert--dismissible' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const titleHtml = title ? `<strong class="ds-alert__title">${title}</strong>` : '';
  const dismissHtml = dismissible
    ? `<button class="ds-alert__dismiss" aria-label="Fechar alerta" type="button">&times;</button>`
    : '';

  return `<div class="${classes}" role="alert">
    <span class="ds-alert__icon" aria-hidden="true">${icons[variant]}</span>
    <div class="ds-alert__content">${titleHtml}<p class="ds-alert__message">${message}</p></div>
    ${dismissHtml}
  </div>`;
}

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function renderSpinner(props: SpinnerProps): string {
  const { size = 'md', label = 'Carregando...', className = '' } = props;

  const classes = ['ds-spinner', `ds-spinner--${size}`, className].filter(Boolean).join(' ');

  return `<div class="${classes}" role="status" aria-label="${label}">
    <span class="ds-spinner__visual" aria-hidden="true"></span>
    <span class="ds-spinner__label sr-only">${label}</span>
  </div>`;
}

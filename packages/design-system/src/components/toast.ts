export interface ToastProps {
  id: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  duration?: number;
  dismissible?: boolean;
  className?: string;
}

export function renderToast(props: ToastProps): string {
  const { id, message, variant = 'info', title, dismissible = true, className = '' } = props;

  const icons: Record<string, string> = {
    info: '&#9432;',
    success: '&#10003;',
    warning: '&#9888;',
    danger: '&#10007;'
  };

  const classes = ['ds-toast', `ds-toast--${variant}`, className].filter(Boolean).join(' ');

  const titleHtml = title ? `<strong class="ds-toast__title">${title}</strong>` : '';
  const dismissHtml = dismissible
    ? `<button class="ds-toast__dismiss" type="button" aria-label="Fechar notificação">&times;</button>`
    : '';

  return `<div class="${classes}" role="status" aria-live="polite" id="${id}">
    <span class="ds-toast__icon" aria-hidden="true">${icons[variant]}</span>
    <div class="ds-toast__content">${titleHtml}<p class="ds-toast__message">${message}</p></div>
    ${dismissHtml}
  </div>`;
}

export interface ToastStackProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function renderToastStack(props: ToastStackProps): string {
  const { toasts, position = 'top-right' } = props;

  const classes = ['ds-toast-stack', `ds-toast-stack--${position}`].join(' ');

  const toastsHtml = toasts.map((t) => renderToast(t)).join('');

  return `<div class="${classes}" aria-label="Notificações">${toastsHtml}</div>`;
}

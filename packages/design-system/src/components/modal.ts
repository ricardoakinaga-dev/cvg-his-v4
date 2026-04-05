export interface ModalProps {
  id: string;
  title: string;
  children: string;
  footer?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  open?: boolean;
  closeLabel?: string;
  className?: string;
}

export function renderModal(props: ModalProps): string {
  const {
    id,
    title,
    children,
    footer,
    size = 'md',
    open = false,
    closeLabel = 'Fechar',
    className = ''
  } = props;

  const classes = ['ds-modal__overlay', open ? 'ds-modal__overlay--open' : '', className]
    .filter(Boolean)
    .join(' ');

  const dialogClasses = ['ds-modal', `ds-modal--${size}`].filter(Boolean).join(' ');

  const footerHtml = footer ? `<div class="ds-modal__footer">${footer}</div>` : '';

  return `<div class="${classes}" role="presentation" ${open ? 'data-open' : ''}>
    <div class="${dialogClasses}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="ds-modal__header">
        <h2 id="${id}-title" class="ds-modal__title">${title}</h2>
        <button class="ds-modal__close" type="button" aria-label="${closeLabel}">&times;</button>
      </div>
      <div class="ds-modal__body">${children}</div>
      ${footerHtml}
    </div>
  </div>`;
}

export interface DialogProps {
  id: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  open?: boolean;
}

export function renderDialog(props: DialogProps): string {
  const {
    id,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    variant = 'default',
    open = false
  } = props;

  const confirmVariant =
    variant === 'danger'
      ? 'ds-btn--danger'
      : variant === 'warning'
        ? 'ds-btn--warning'
        : 'ds-btn--primary';

  return renderModal({
    id,
    title,
    children: `<p>${message}</p>`,
    footer: `<div class="ds-modal__actions">
      <button class="ds-btn ds-btn--secondary" type="button">${cancelLabel}</button>
      <button class="ds-btn ${confirmVariant}" type="button">${confirmLabel}</button>
    </div>`,
    size: 'sm',
    open
  });
}

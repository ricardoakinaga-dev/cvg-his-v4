export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: string;
  className?: string;
}

export function renderEmptyState(props: EmptyStateProps): string {
  const { icon = '&#128196;', title, description, action, className = '' } = props;

  const classes = ['ds-empty-state', className].filter(Boolean).join(' ');

  const descHtml = description ? `<p class="ds-empty-state__description">${description}</p>` : '';
  const actionHtml = action ? `<div class="ds-empty-state__action">${action}</div>` : '';

  return `<div class="${classes}" role="status">
    <span class="ds-empty-state__icon" aria-hidden="true">${icon}</span>
    <h3 class="ds-empty-state__title">${title}</h3>
    ${descHtml}
    ${actionHtml}
  </div>`;
}

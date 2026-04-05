export interface SearchBarProps {
  id?: string;
  placeholder?: string;
  value?: string;
  label?: string;
  actionButton?: string;
  className?: string;
}

export function renderSearchBar(props: SearchBarProps): string {
  const {
    id = 'search',
    placeholder = 'Buscar...',
    value,
    label = 'Buscar',
    actionButton,
    className = ''
  } = props;

  const classes = ['ds-search-bar', className].filter(Boolean).join(' ');

  const actionHtml = actionButton ? `<div class="ds-search-bar__action">${actionButton}</div>` : '';

  return `<div class="${classes}" role="search">
    <label for="${id}" class="sr-only">${label}</label>
    <span class="ds-search-bar__icon" aria-hidden="true">&#128269;</span>
    <input type="search" id="${id}" class="ds-search-bar__input" placeholder="${placeholder}" value="${value ?? ''}" />
    ${actionHtml}
  </div>`;
}

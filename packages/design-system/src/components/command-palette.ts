export interface CommandPaletteItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  group?: string;
}

export interface CommandPaletteProps {
  id?: string;
  placeholder?: string;
  items: CommandPaletteItem[];
  open?: boolean;
  className?: string;
}

export function renderCommandPalette(props: CommandPaletteProps): string {
  const {
    id = 'command-palette',
    placeholder = 'Digite um comando ou busque...',
    items,
    open = false,
    className = ''
  } = props;

  const classes = ['ds-command-palette__overlay', open ? 'ds-command-palette__overlay--open' : '']
    .filter(Boolean)
    .join(' ');

  const dialogClasses = ['ds-command-palette', className].filter(Boolean).join(' ');

  // Group items
  const groups = new Map<string, CommandPaletteItem[]>();
  for (const item of items) {
    const group = item.group ?? '';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(item);
  }

  const itemsHtml = Array.from(groups.entries())
    .map(([groupName, groupItems]) => {
      const groupHeader = groupName
        ? `<div class="ds-command-palette__group-header">${groupName}</div>`
        : '';
      const itemsList = groupItems
        .map((item) => {
          const iconHtml = item.icon
            ? `<span class="ds-command-palette__item-icon" aria-hidden="true">${item.icon}</span>`
            : '';
          const shortcutHtml = item.shortcut
            ? `<kbd class="ds-command-palette__shortcut">${item.shortcut}</kbd>`
            : '';
          return `<div class="ds-command-palette__item" role="option" id="${id}-item-${item.id}">
        ${iconHtml}
        <span class="ds-command-palette__item-label">${item.label}</span>
        ${shortcutHtml}
      </div>`;
        })
        .join('');
      return `${groupHeader}${itemsList}`;
    })
    .join('');

  return `<div class="${classes}" role="presentation" ${open ? 'data-open' : ''}>
    <div class="${dialogClasses}" role="dialog" aria-modal="true" aria-label="Paleta de comandos">
      <div class="ds-command-palette__search">
        <span class="ds-command-palette__search-icon" aria-hidden="true">&#128269;</span>
        <input type="text" class="ds-command-palette__input" placeholder="${placeholder}" aria-label="${placeholder}" />
        <kbd class="ds-command-palette__escape-hint">ESC</kbd>
      </div>
      <div class="ds-command-palette__results" role="listbox" aria-label="Resultados">
        ${itemsHtml}
      </div>
      <div class="ds-command-palette__footer">
        <span><kbd>&#8593;</kbd><kbd>&#8595;</kbd> navegar</span>
        <span><kbd>Enter</kbd> selecionar</span>
        <span><kbd>Esc</kbd> fechar</span>
      </div>
    </div>
  </div>`;
}

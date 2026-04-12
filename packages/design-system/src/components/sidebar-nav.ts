import type { SidebarNavProps } from '../vue/index.js';

// Re-export types for render function signature
export type { SidebarNavProps } from '../vue/index.js';

export function renderSidebarNav(props: SidebarNavProps): string {
  const collapsed = props.collapsed ?? false;
  const groups = props.groups ?? [];
  const ariaLabel = props.ariaLabel ?? 'Navegação principal';

  const groupsHtml = groups
    .map((group) => {
      const itemsHtml = group.items
        .map(
          (item) => `
          <li>
            <${item.href ? 'a' : 'span'} href="${item.href ?? '#'}" class="ds-sidebar-nav__item ${item.active ? 'ds-sidebar-nav__item--active' : ''}" ${item.active ? 'aria-current="page"' : ''}>
              <span class="ds-sidebar-nav__item-icon">${item.icon ?? '•'}</span>
              <span class="ds-sidebar-nav__item-label">${item.label}</span>
            </${item.href ? 'a' : 'span'}>
          </li>
        `
        )
        .join('');

      return `
        <li class="ds-sidebar-nav__group">
          <div class="ds-sidebar-nav__group-header">
            <span class="ds-sidebar-nav__group-icon">${group.icon ?? '•'}</span>
            ${!collapsed ? `<span class="ds-sidebar-nav__group-label">${group.label}</span>` : ''}
          </div>
          ${!collapsed ? `<ul class="ds-sidebar-nav__item-list" role="list">${itemsHtml}</ul>` : ''}
        </li>
      `;
    })
    .join('');

  return `
    <nav class="ds-sidebar-nav" aria-label="${ariaLabel}">
      <ul class="ds-sidebar-nav__group-list" role="list">${groupsHtml}</ul>
    </nav>
  `.trim();
}

import type { DsBreadcrumbProps, BreadcrumbItem } from '../vue/index.js';

// Re-export types for render function signature
export type { DsBreadcrumbProps as BreadcrumbProps } from '../vue/index.js';

export function renderBreadcrumb(props: DsBreadcrumbProps): string {
  const items = props.items ?? [];
  const separator = props.separator ?? '/';
  const ariaLabel = props.ariaLabel ?? 'Breadcrumb';

  const itemHtml = items
    .map((item: BreadcrumbItem, index: number) => {
      const isLast = index === items.length - 1;
      if (isLast) {
        return `<span class="ds-breadcrumb__current" aria-current="page">${item.label}</span>`;
      }
      return `<a href="${item.href ?? '#'}" class="ds-breadcrumb__link">${item.label}</a>`;
    })
    .join(`<span class="ds-breadcrumb__separator" aria-hidden="true">${separator}</span>`);

  return `
    <nav class="ds-breadcrumb" aria-label="${ariaLabel}">
      <ol class="ds-breadcrumb__list">
        ${items.map((item: BreadcrumbItem, index: number) => `
          <li class="ds-breadcrumb__item">
            ${index < items.length - 1
              ? `<a href="${item.href ?? '#'}" class="ds-breadcrumb__link">${item.label}</a>`
              : `<span class="ds-breadcrumb__current" aria-current="page">${item.label}</span>`
            }
            ${index < items.length - 1
              ? `<span class="ds-breadcrumb__separator" aria-hidden="true">${separator}</span>`
              : ''}
          </li>
        `).join('')}
      </ol>
    </nav>
  `.trim();
}

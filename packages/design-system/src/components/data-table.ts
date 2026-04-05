export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps {
  columns: DataTableColumn[];
  rows: Record<string, string | number | boolean | null | undefined>[];
  caption?: string;
  striped?: boolean;
  compact?: boolean;
  hoverable?: boolean;
  emptyMessage?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
}

export function renderDataTable(props: DataTableProps): string {
  const {
    columns,
    rows,
    caption,
    striped = false,
    compact = false,
    hoverable = true,
    emptyMessage = 'Nenhum registro encontrado',
    sortColumn,
    sortDirection = 'asc',
    className = ''
  } = props;

  const classes = [
    'ds-table',
    striped ? 'ds-table--striped' : '',
    compact ? 'ds-table--compact' : '',
    hoverable ? 'ds-table--hoverable' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  const captionHtml = caption
    ? `<caption class="ds-table__caption sr-only">${caption}</caption>`
    : '';

  const theadHtml = `
    <thead>
      <tr>
        ${columns
          .map((col) => {
            const alignClass = col.align ? `ds-table__th--${col.align}` : '';
            const sortableClass = col.sortable ? 'ds-table__th--sortable' : '';
            const sortIcon =
              sortColumn === col.key
                ? `<span class="ds-table__sort-icon" aria-hidden="true">${sortDirection === 'asc' ? '&#9650;' : '&#9660;'}</span>`
                : '';
            const ariaSort =
              sortColumn === col.key
                ? `aria-sort="${sortDirection === 'asc' ? 'ascending' : 'descending'}"`
                : '';
            const widthStyle = col.width ? ` style="width:${col.width}"` : '';
            return `<th class="ds-table__th ${alignClass} ${sortableClass}"${widthStyle}${ariaSort}>
            <span class="ds-table__th-content">${col.label}${sortIcon}</span>
          </th>`;
          })
          .join('')}
      </tr>
    </thead>
  `;

  const tbodyHtml =
    rows.length > 0
      ? `<tbody>
        ${rows
          .map(
            (row, i) => `
          <tr class="ds-table__row">
            ${columns
              .map((col) => {
                const alignClass = col.align ? `ds-table__td--${col.align}` : '';
                const value = row[col.key];
                const displayValue = value !== null && value !== undefined ? String(value) : '';
                return `<td class="ds-table__td ${alignClass}">${displayValue}</td>`;
              })
              .join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>`
      : `<tbody>
        <tr>
          <td class="ds-table__empty" colspan="${columns.length}">
            <div class="ds-empty-state">
              <span class="ds-empty-state__icon" aria-hidden="true">&#128196;</span>
              <p class="ds-empty-state__message">${emptyMessage}</p>
            </div>
          </td>
        </tr>
      </tbody>`;

  return `<div class="ds-table__wrapper"><table class="${classes}">${captionHtml}${theadHtml}${tbodyHtml}</table></div>`;
}

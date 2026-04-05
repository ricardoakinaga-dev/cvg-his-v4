export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange?: string;
  className?: string;
}

export function renderPagination(props: PaginationProps): string {
  const { currentPage, totalPages, totalItems, itemsPerPage, className = '' } = props;

  const classes = ['ds-pagination', className].filter(Boolean).join(' ');

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const infoHtml =
    totalItems && itemsPerPage
      ? `<span class="ds-pagination__info">${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems}</span>`
      : `<span class="ds-pagination__info">Página ${currentPage} de ${totalPages}</span>`;

  const pages: (number | 'ellipsis')[] = [];
  const maxVisible = 7;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const pageButtonsHtml = pages
    .map((page) => {
      if (page === 'ellipsis') {
        return `<span class="ds-pagination__ellipsis" aria-hidden="true">…</span>`;
      }
      const isActive = page === currentPage;
      return `<button class="ds-pagination__page ${isActive ? 'ds-pagination__page--active' : ''}"
      type="button"
      aria-label="Página ${page}"
      aria-current="${isActive ? 'page' : 'false'}"
      ${isActive ? 'disabled' : ''}>${page}</button>`;
    })
    .join('');

  return `<nav class="${classes}" aria-label="Paginação">
    ${infoHtml}
    <div class="ds-pagination__controls">
      <button class="ds-pagination__nav" type="button" aria-label="Página anterior" ${hasPrev ? '' : 'disabled'}>
        &#8249;
      </button>
      ${pageButtonsHtml}
      <button class="ds-pagination__nav" type="button" aria-label="Próxima página" ${hasNext ? '' : 'disabled'}>
        &#8250;
      </button>
    </div>
  </nav>`;
}

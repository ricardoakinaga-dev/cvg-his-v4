import { describe, it, expect } from 'vitest';
import { renderDataTable } from '../../../packages/design-system/src/components/data-table.js';
import { renderModal, renderDialog } from '../../../packages/design-system/src/components/modal.js';
import {
  renderToast,
  renderToastStack
} from '../../../packages/design-system/src/components/toast.js';
import { renderTabs } from '../../../packages/design-system/src/components/tabs.js';
import { renderEmptyState } from '../../../packages/design-system/src/components/empty-state.js';
import { renderSearchBar } from '../../../packages/design-system/src/components/search-bar.js';
import { renderPagination } from '../../../packages/design-system/src/components/pagination.js';
import { renderCommandPalette } from '../../../packages/design-system/src/components/command-palette.js';

describe('Design System — DataTable', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'amount', label: 'Amount', align: 'right' as const }
  ];

  const rows = [
    { name: 'Item 1', status: 'Active', amount: 100 },
    { name: 'Item 2', status: 'Inactive', amount: 200 }
  ];

  it('should render a basic table', () => {
    const html = renderDataTable({ columns, rows });
    expect(html).toContain('<table');
    expect(html).toContain('ds-table');
    expect(html).toContain('Name');
    expect(html).toContain('Status');
    expect(html).toContain('Item 1');
    expect(html).toContain('Item 2');
  });

  it('should render sortable columns', () => {
    const html = renderDataTable({ columns, rows });
    expect(html).toContain('ds-table__th--sortable');
  });

  it('should show sort indicator when column is sorted', () => {
    const html = renderDataTable({ columns, rows, sortColumn: 'status', sortDirection: 'asc' });
    expect(html).toContain('aria-sort="ascending"');
    expect(html).toContain('&#9650;');
  });

  it('should render alignment classes', () => {
    const html = renderDataTable({ columns, rows });
    expect(html).toContain('ds-table__td--right');
  });

  it('should render striped variant', () => {
    const html = renderDataTable({ columns, rows, striped: true });
    expect(html).toContain('ds-table--striped');
  });

  it('should render compact variant', () => {
    const html = renderDataTable({ columns, rows, compact: true });
    expect(html).toContain('ds-table--compact');
  });

  it('should render empty state when no rows', () => {
    const html = renderDataTable({ columns, rows: [] });
    expect(html).toContain('ds-table__empty');
    expect(html).toContain('Nenhum registro encontrado');
  });

  it('should render custom empty message', () => {
    const html = renderDataTable({ columns, rows: [], emptyMessage: 'Custom message' });
    expect(html).toContain('Custom message');
  });

  it('should render caption for accessibility', () => {
    const html = renderDataTable({ columns, rows, caption: 'User list' });
    expect(html).toContain('ds-table__caption');
    expect(html).toContain('User list');
    expect(html).toContain('sr-only');
  });
});

describe('Design System — Modal', () => {
  it('should render a modal with title and content', () => {
    const html = renderModal({ id: 'test', title: 'Test Modal', children: '<p>Content</p>' });
    expect(html).toContain('ds-modal');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('Test Modal');
    expect(html).toContain('<p>Content</p>');
  });

  it('should render with footer', () => {
    const html = renderModal({
      id: 'test',
      title: 'Test',
      children: '<p>Body</p>',
      footer: '<button>Save</button>'
    });
    expect(html).toContain('ds-modal__footer');
    expect(html).toContain('<button>Save</button>');
  });

  it('should render size variants', () => {
    const sm = renderModal({ id: 'test', title: 'T', children: '', size: 'sm' });
    expect(sm).toContain('ds-modal--sm');

    const lg = renderModal({ id: 'test', title: 'T', children: '', size: 'lg' });
    expect(lg).toContain('ds-modal--lg');

    const xl = renderModal({ id: 'test', title: 'T', children: '', size: 'xl' });
    expect(xl).toContain('ds-modal--xl');
  });

  it('should render open state', () => {
    const html = renderModal({ id: 'test', title: 'T', children: '', open: true });
    expect(html).toContain('ds-modal__overlay--open');
    expect(html).toContain('data-open');
  });

  it('should render close button with aria-label', () => {
    const html = renderModal({ id: 'test', title: 'T', children: '' });
    expect(html).toContain('ds-modal__close');
    expect(html).toContain('aria-label="Fechar"');
  });
});

describe('Design System — Dialog', () => {
  it('should render a confirmation dialog', () => {
    const html = renderDialog({ id: 'confirm', title: 'Confirm', message: 'Are you sure?' });
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Confirm');
    expect(html).toContain('Are you sure?');
    expect(html).toContain('Confirmar');
    expect(html).toContain('Cancelar');
  });

  it('should render danger variant', () => {
    const html = renderDialog({
      id: 'delete',
      title: 'Delete',
      message: 'Really?',
      variant: 'danger'
    });
    expect(html).toContain('ds-btn--danger');
  });

  it('should render warning variant', () => {
    const html = renderDialog({
      id: 'warn',
      title: 'Warning',
      message: 'Careful',
      variant: 'warning'
    });
    expect(html).toContain('ds-btn--warning');
  });
});

describe('Design System — Toast', () => {
  it('should render a toast with variants', () => {
    const info = renderToast({ id: 't1', message: 'Info', variant: 'info' });
    expect(info).toContain('ds-toast--info');
    expect(info).toContain('role="status"');
    expect(info).toContain('aria-live="polite"');

    const success = renderToast({ id: 't2', message: 'OK', variant: 'success' });
    expect(success).toContain('ds-toast--success');

    const danger = renderToast({ id: 't3', message: 'Error', variant: 'danger' });
    expect(danger).toContain('ds-toast--danger');
  });

  it('should render toast with title', () => {
    const html = renderToast({ id: 't1', message: 'msg', title: 'Title' });
    expect(html).toContain('ds-toast__title');
    expect(html).toContain('Title');
  });

  it('should render dismissible toast', () => {
    const html = renderToast({ id: 't1', message: 'msg', dismissible: true });
    expect(html).toContain('ds-toast__dismiss');
    expect(html).toContain('aria-label="Fechar notificação"');
  });

  it('should render toast stack', () => {
    const html = renderToastStack({
      toasts: [
        { id: 't1', message: 'First' },
        { id: 't2', message: 'Second' }
      ],
      position: 'top-right'
    });
    expect(html).toContain('ds-toast-stack');
    expect(html).toContain('ds-toast-stack--top-right');
    expect(html).toContain('First');
    expect(html).toContain('Second');
  });
});

describe('Design System — Tabs', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3', disabled: true }
  ];

  const panels: Record<string, string> = {
    tab1: '<p>Content 1</p>',
    tab2: '<p>Content 2</p>',
    tab3: '<p>Content 3</p>'
  };

  it('should render tabs with panels', () => {
    const html = renderTabs({ tabs, panels });
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('Tab 1');
    expect(html).toContain('Tab 2');
  });

  it('should mark active tab', () => {
    const html = renderTabs({ tabs, panels, activeTab: 'tab2' });
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('ds-tabs__tab--active');
    expect(html).toContain('ds-tabs__panel--active');
  });

  it('should render disabled tab', () => {
    const html = renderTabs({ tabs, panels });
    expect(html).toContain('aria-disabled="true"');
  });

  it('should link tabs to panels via aria-controls', () => {
    const html = renderTabs({ tabs, panels, activeTab: 'tab1' });
    expect(html).toContain('aria-controls="panel-tab1"');
    expect(html).toContain('aria-labelledby="tab-tab1"');
  });
});

describe('Design System — EmptyState', () => {
  it('should render with title', () => {
    const html = renderEmptyState({ title: 'No data' });
    expect(html).toContain('ds-empty-state');
    expect(html).toContain('No data');
    expect(html).toContain('role="status"');
  });

  it('should render with description', () => {
    const html = renderEmptyState({ title: 'No data', description: 'Try again' });
    expect(html).toContain('ds-empty-state__description');
    expect(html).toContain('Try again');
  });

  it('should render with action', () => {
    const html = renderEmptyState({ title: 'No data', action: '<button>Create</button>' });
    expect(html).toContain('ds-empty-state__action');
    expect(html).toContain('<button>Create</button>');
  });

  it('should render with custom icon', () => {
    const html = renderEmptyState({ title: 'No results', icon: '&#128270;' });
    expect(html).toContain('&#128270;');
  });
});

describe('Design System — SearchBar', () => {
  it('should render a search bar', () => {
    const html = renderSearchBar({});
    expect(html).toContain('ds-search-bar');
    expect(html).toContain('role="search"');
    expect(html).toContain('type="search"');
    expect(html).toContain('Buscar');
  });

  it('should render with custom placeholder', () => {
    const html = renderSearchBar({ placeholder: 'Search patients...' });
    expect(html).toContain('Search patients...');
  });

  it('should render with value', () => {
    const html = renderSearchBar({ value: 'existing query' });
    expect(html).toContain('value="existing query"');
  });

  it('should render with action button', () => {
    const html = renderSearchBar({ actionButton: '<button>Filter</button>' });
    expect(html).toContain('ds-search-bar__action');
    expect(html).toContain('<button>Filter</button>');
  });

  it('should have sr-only label', () => {
    const html = renderSearchBar({});
    expect(html).toContain('sr-only');
  });
});

describe('Design System — Pagination', () => {
  it('should render pagination with info', () => {
    const html = renderPagination({
      currentPage: 1,
      totalPages: 10,
      totalItems: 100,
      itemsPerPage: 10
    });
    expect(html).toContain('ds-pagination');
    expect(html).toContain('aria-label="Paginação"');
    expect(html).toContain('1–10 de 100');
  });

  it('should render page buttons', () => {
    const html = renderPagination({ currentPage: 1, totalPages: 5 });
    expect(html).toContain('Página 1');
    expect(html).toContain('Página 5');
  });

  it('should mark active page', () => {
    const html = renderPagination({ currentPage: 3, totalPages: 5 });
    expect(html).toContain('ds-pagination__page--active');
    expect(html).toContain('aria-current="page"');
  });

  it('should disable prev on first page', () => {
    const html = renderPagination({ currentPage: 1, totalPages: 5 });
    const prevMatch = html.match(/aria-label="Página anterior"[^>]*>/);
    expect(prevMatch).toBeDefined();
    expect(prevMatch![0]).toContain('disabled');
  });

  it('should disable next on last page', () => {
    const html = renderPagination({ currentPage: 5, totalPages: 5 });
    const nextMatch = html.match(/aria-label="Próxima página"[^>]*>/);
    expect(nextMatch).toBeDefined();
    expect(nextMatch![0]).toContain('disabled');
  });

  it('should render ellipsis for many pages', () => {
    const html = renderPagination({ currentPage: 5, totalPages: 20 });
    expect(html).toContain('ds-pagination__ellipsis');
  });
});

describe('Design System — CommandPalette', () => {
  const items = [
    { id: 'new-patient', label: 'New Patient', icon: '🐾', group: 'Patients' },
    { id: 'search', label: 'Search', icon: '🔍', shortcut: 'Ctrl+K', group: 'Navigation' },
    { id: 'settings', label: 'Settings', icon: '⚙️', group: 'Navigation' }
  ];

  it('should render command palette', () => {
    const html = renderCommandPalette({ items });
    expect(html).toContain('ds-command-palette');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('role="listbox"');
  });

  it('should render with groups', () => {
    const html = renderCommandPalette({ items });
    expect(html).toContain('ds-command-palette__group-header');
    expect(html).toContain('Patients');
    expect(html).toContain('Navigation');
  });

  it('should render items with icons and shortcuts', () => {
    const html = renderCommandPalette({ items });
    expect(html).toContain('🐾');
    expect(html).toContain('Ctrl+K');
    expect(html).toContain('New Patient');
  });

  it('should render open state', () => {
    const html = renderCommandPalette({ items, open: true });
    expect(html).toContain('ds-command-palette__overlay--open');
    expect(html).toContain('data-open');
  });

  it('should render footer with keyboard hints', () => {
    const html = renderCommandPalette({ items });
    expect(html).toContain('ds-command-palette__footer');
    expect(html).toContain('navegar');
    expect(html).toContain('selecionar');
    expect(html).toContain('fechar');
  });

  it('should render search input', () => {
    const html = renderCommandPalette({ items });
    expect(html).toContain('ds-command-palette__input');
    expect(html).toContain('Digite um comando ou busque...');
  });

  it('should render escape hint', () => {
    const html = renderCommandPalette({ items });
    expect(html).toContain('ds-command-palette__escape-hint');
    expect(html).toContain('ESC');
  });
});

describe('Design System — Advanced Components Accessibility', () => {
  it('DataTable should have sr-only caption', () => {
    const html = renderDataTable({
      columns: [{ key: 'a', label: 'A' }],
      rows: [],
      caption: 'Data table'
    });
    expect(html).toContain('sr-only');
  });

  it('Modal should have aria-labelledby', () => {
    const html = renderModal({ id: 'm1', title: 'Title', children: '' });
    expect(html).toContain('aria-labelledby="m1-title"');
  });

  it('Tabs should have proper tab-panel association', () => {
    const html = renderTabs({
      tabs: [{ id: 't1', label: 'T1' }],
      panels: { t1: 'Content' }
    });
    expect(html).toContain('aria-controls="panel-t1"');
    expect(html).toContain('aria-labelledby="tab-t1"');
  });

  it('Toast should have aria-live polite', () => {
    const html = renderToast({ id: 't1', message: 'msg' });
    expect(html).toContain('aria-live="polite"');
  });

  it('SearchBar should have role="search"', () => {
    const html = renderSearchBar({});
    expect(html).toContain('role="search"');
  });

  it('Pagination should have aria-label', () => {
    const html = renderPagination({ currentPage: 1, totalPages: 3 });
    expect(html).toContain('aria-label="Paginação"');
  });

  it('CommandPalette should have aria-modal', () => {
    const html = renderCommandPalette({ items: [] });
    expect(html).toContain('aria-modal="true"');
  });
});

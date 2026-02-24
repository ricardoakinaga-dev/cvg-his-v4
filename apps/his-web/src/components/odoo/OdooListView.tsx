/**
 * OdooListView - Odoo-style List View Component
 * 
 * Features:
 * - Search bar with query input
 * - Filter chips for quick filtering
 * - Sort dropdown
 * - Action buttons (Export, New)
 * - DataTable with row hover and actions
 * - Pagination
 * - Responsive design
 */

'use client';

import { useState, useMemo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import styles from './OdooListView.module.css';

/**
 * Column definition
 */
export interface OdooListColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
}

/**
 * Filter option
 */
export interface OdooListFilter {
  id: string;
  label: string;
  value: string;
  active?: boolean;
}

/**
 * Sort option
 */
export interface OdooListSortOption {
  value: string;
  label: string;
}

/**
 * Action button
 */
export interface OdooListAction {
  id: string;
  label: string;
  iconName?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface OdooListViewProps<T> {
  title: string;
  columns: OdooListColumn<T>[];
  data: T[];
  keyField: keyof T;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: OdooListFilter[];
  onFilterChange?: (filterId: string) => void;
  sortOptions?: OdooListSortOption[];
  sortValue?: string;
  onSortChange?: (value: string) => void;
  actions?: OdooListAction[];
  onRowClick?: (row: T) => void;
  onRowAction?: (action: string, row: T) => void;
  rowActions?: { id: string; label: string; iconName?: string }[];
  loading?: boolean;
  emptyMessage?: string;
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
}

/**
 * Icons
 */
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

/**
 * OdooListView Component
 */
export function OdooListView<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  keyField,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  onFilterChange,
  sortOptions,
  sortValue,
  onSortChange,
  actions,
  onRowClick,
  onRowAction,
  rowActions,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  totalCount,
  pageSize = 20,
  currentPage = 1,
  onPageChange,
  className,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: OdooListViewProps<T>) {
  const [localSearch, setLocalSearch] = useState(searchValue);

  // Handle search
  const handleSearch = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map((row) => row[keyField] as string | number));
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  // Calculate pagination
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;

  // Get cell value
  const getCellValue = (row: T, key: string): unknown => {
    if (key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = row;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value;
    }
    return row[key];
  };

  return (
    <div className={clsx(styles.container, className)}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{title}</h1>
          {totalCount !== undefined && (
            <span className={styles.count}>{totalCount} registros</span>
          )}
        </div>
        <div className={styles.headerRight}>
          {actions?.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              leftIcon={action.iconName === 'plus' ? <PlusIcon /> : action.iconName === 'export' ? <ExportIcon /> : undefined}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Search */}
        <div className={styles.search}>
          <span className={styles.searchIcon}>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={styles.searchInput}
            aria-label="Buscar"
          />
        </div>

        {/* Filters */}
        {filters && filters.length > 0 && (
          <div className={styles.filters}>
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={clsx(styles.filterChip, filter.active && styles.filterActive)}
                onClick={() => onFilterChange?.(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* Sort */}
        {sortOptions && sortOptions.length > 0 && (
          <select
            value={sortValue}
            onChange={(e) => onSortChange?.(e.target.value)}
            className={styles.sortSelect}
            aria-label="Ordenar por"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {selectable && (
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={styles.th}
                >
                  {column.header}
                </th>
              ))}
              {rowActions && rowActions.length > 0 && (
                <th className={styles.actionsCell}>Ações</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className={styles.loadingCell}>
                  <div className={styles.loading}>Carregando...</div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} className={styles.emptyCell}>
                  <div className={styles.empty}>{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const rowKey = String(row[keyField]);
                const isSelected = selectedIds.includes(row[keyField] as string | number);

                return (
                  <motion.tr
                    key={rowKey}
                    className={clsx(styles.tr, isSelected && styles.selected)}
                    onClick={() => onRowClick?.(row)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {selectable && (
                      <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row[keyField] as string | number)}
                          aria-label={`Selecionar ${rowKey}`}
                        />
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = getCellValue(row, String(column.key));
                      return (
                        <td key={String(column.key)} className={styles.td}>
                          {column.render ? column.render(value, row) : String(value ?? '-')}
                        </td>
                      );
                    })}
                    {rowActions && rowActions.length > 0 && (
                      <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.rowActions}>
                          {rowActions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => onRowAction?.(action.id, row)}
                              className={styles.rowAction}
                              title={action.label}
                              type="button"
                              aria-label={action.label}
                            >
                              <MoreIcon />
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages}
          </span>
          <div className={styles.paginationButtons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OdooListView;

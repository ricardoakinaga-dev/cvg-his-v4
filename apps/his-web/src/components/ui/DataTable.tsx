/**
 * DataTable - Premium Table Component
 * 
 * A flexible table component with sorting, hover states, and empty states.
 * Uses CSS tokens for consistent styling.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { EmptyState } from './EmptyState';
import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T, index: number) => ReactNode;
}

export interface DataTableProps<T> extends Omit<HTMLAttributes<HTMLTableElement>, 'children'> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowClick?: (item: T, index: number) => void;
  onRowHover?: (item: T | null, index: number | null) => void;
  stickyHeader?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  loading?: boolean;
  hoverable?: boolean;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  onRowHover,
  stickyHeader = false,
  emptyMessage = 'Nenhum registro encontrado',
  emptyDescription,
  emptyAction,
  loading = false,
  hoverable = true,
  striped = false,
  bordered = false,
  compact = false,
  className = '',
  ...props
}: DataTableProps<T>) {
  const tableClassName = [
    styles.table,
    stickyHeader ? styles.stickyHeader : '',
    hoverable ? styles.hoverable : '',
    striped ? styles.striped : '',
    bordered ? styles.bordered : '',
    compact ? styles.compact : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <TableSkeleton columns={columns.length} rows={5} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.emptyWrapper}>
        <EmptyState
          title={emptyMessage}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={tableClassName} {...props}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={styles.headerCell}
                style={{
                  width: column.width,
                  textAlign: column.align || 'left',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <motion.tr
              key={keyExtractor(item, index)}
              className={`${styles.row} ${onRowClick ? styles.clickable : ''}`}
              onClick={() => onRowClick?.(item, index)}
              onMouseEnter={() => onRowHover?.(item, index)}
              onMouseLeave={() => onRowHover?.(null, null)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={styles.cell}
                  style={{ textAlign: column.align || 'left' }}
                >
                  {column.render
                    ? column.render(item, index)
                    : (item[column.key] as ReactNode)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * TableSkeleton - Loading skeleton for table
 */
export function TableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <div className={styles.skeletonWrapper}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.skeletonRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`cvg-skeleton ${styles.skeletonCell}`}
              style={{
                width: colIndex === 0 ? '60%' : `${40 + Math.random() * 40}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Simple table components for custom layouts
 */
export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div className={styles.wrapper}>
        <table ref={ref} className={`${styles.table} ${className}`} {...props}>
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

export interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export function TableHeader({ children, className = '', ...props }: TableHeaderProps) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  );
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export function TableBody({ children, className = '', ...props }: TableBodyProps) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  );
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  hoverable?: boolean;
  clickable?: boolean;
}

export function TableRow({
  children,
  hoverable = true,
  clickable = false,
  className = '',
  ...props
}: TableRowProps) {
  const rowClassName = [
    styles.row,
    hoverable ? styles.hoverable : '',
    clickable ? styles.clickable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={rowClassName} {...props}>
      {children}
    </tr>
  );
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | null;
}

export function TableHeaderCell({
  children,
  align = 'left',
  sortable = false,
  sorted = null,
  className = '',
  ...props
}: TableHeaderCellProps) {
  const cellClassName = [
    styles.headerCell,
    sortable ? styles.sortable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <th className={cellClassName} style={{ textAlign: align }} {...props}>
      <span className={styles.headerContent}>
        {children}
        {sortable && (
          <span className={styles.sortIcon}>
            {sorted === 'asc' ? '↑' : sorted === 'desc' ? '↓' : '↕'}
          </span>
        )}
      </span>
    </th>
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}

export function TableCell({
  children,
  align = 'left',
  className = '',
  ...props
}: TableCellProps) {
  return (
    <td className={`${styles.cell} ${className}`} style={{ textAlign: align }} {...props}>
      {children}
    </td>
  );
}

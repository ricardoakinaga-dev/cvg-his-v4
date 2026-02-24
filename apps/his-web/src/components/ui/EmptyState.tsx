/**
 * EmptyState - Premium Empty State Component
 * 
 * A component for displaying empty states with icon, title, description, and action.
 * Uses CSS tokens for consistent styling.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import styles from './EmptyState.module.css';

export interface EmptyStateProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'minimal';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'md',
  variant = 'default',
  className = '',
  style,
  ...props
}: EmptyStateProps) {
  const containerClassName = [
    styles.container,
    styles[size],
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      className={containerClassName}
      style={style}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      {...props}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </motion.div>
  );
}

/**
 * Default icons for common empty states
 */
export function EmptyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`${styles.defaultIcon} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

export function SearchEmptyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`${styles.defaultIcon} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11h6" />
    </svg>
  );
}

export function FolderEmptyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`${styles.defaultIcon} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function UsersEmptyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`${styles.defaultIcon} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function DocumentEmptyIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`${styles.defaultIcon} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

/**
 * NoResults - Empty state for search/filter results
 */
export function NoResults({
  query,
  onClear,
  className = '',
}: {
  query?: string;
  onClear?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={<SearchEmptyIcon />}
      title="Nenhum resultado encontrado"
      description={
        query
          ? `Não encontramos resultados para "${query}"`
          : 'Tente ajustar os filtros ou termos de busca'
      }
      action={
        onClear && (
          <button onClick={onClear} className={styles.clearButton}>
            Limpar filtros
          </button>
        )
      }
      className={className}
    />
  );
}

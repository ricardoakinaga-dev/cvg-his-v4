/**
 * Badge - Premium Badge Component
 * 
 * A small label component for status, counts, and categories.
 * Uses CSS tokens for consistent styling.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { HTMLAttributes, forwardRef } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  outline?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      dot = false,
      outline = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const badgeClassName = [
      styles.badge,
      styles[variant],
      styles[size],
      outline ? styles.outline : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={badgeClassName} {...props}>
        {dot && <span className={styles.dot} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * StatusBadge - Badge with status indicator
 */
export type StatusType = 'active' | 'inactive' | 'pending' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  status: StatusType;
}

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'success', label: 'Ativo' },
  inactive: { variant: 'default', label: 'Inativo' },
  pending: { variant: 'warning', label: 'Pendente' },
  success: { variant: 'success', label: 'Sucesso' },
  warning: { variant: 'warning', label: 'Atenção' },
  danger: { variant: 'danger', label: 'Crítico' },
  info: { variant: 'info', label: 'Info' },
};

export function StatusBadge({
  status,
  children,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} dot {...props}>
      {children || config.label}
    </Badge>
  );
}

/**
 * CountBadge - Badge for counts/notifications
 */
export interface CountBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  count: number;
  max?: number;
  showZero?: boolean;
}

export function CountBadge({
  count,
  max = 99,
  showZero = false,
  className = '',
  ...props
}: CountBadgeProps) {
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span className={`${styles.countBadge} ${className}`} {...props}>
      {displayCount}
    </span>
  );
}

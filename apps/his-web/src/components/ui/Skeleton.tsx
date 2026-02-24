/**
 * Skeleton - Premium Skeleton Loading Component
 * 
 * A skeleton loading component with shimmer animation.
 * Uses CSS tokens for consistent styling.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { CSSProperties, HTMLAttributes, forwardRef } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'shimmer' | 'pulse' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width,
      height,
      variant = 'text',
      animation = 'shimmer',
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const skeletonClassName = [
      styles.skeleton,
      styles[variant],
      animation !== 'none' ? styles[animation] : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const computedStyle: CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={skeletonClassName}
        style={computedStyle}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * SkeletonText - Multiple skeleton lines for text content
 */
export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lastLineWidth?: string | number;
  gap?: number;
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  gap = 8,
  className = '',
  style,
  ...props
}: SkeletonTextProps) {
  return (
    <div
      className={`${styles.textContainer} ${className}`}
      style={{ gap: `${gap}px`, ...style }}
      {...props}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Skeleton for card component
 */
export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  hasHeader?: boolean;
  hasFooter?: boolean;
  lines?: number;
}

export function SkeletonCard({
  hasHeader = true,
  hasFooter = false,
  lines = 3,
  className = '',
  style,
  ...props
}: SkeletonCardProps) {
  return (
    <div className={`${styles.card} ${className}`} style={style} {...props}>
      {hasHeader && (
        <div className={styles.cardHeader}>
          <Skeleton variant="text" width="40%" height={20} />
          <Skeleton variant="rounded" width={80} height={32} />
        </div>
      )}
      <div className={styles.cardBody}>
        <SkeletonText lines={lines} />
      </div>
      {hasFooter && (
        <div className={styles.cardFooter}>
          <Skeleton variant="rounded" width={100} height={36} />
          <Skeleton variant="rounded" width={100} height={36} />
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonAvatar - Skeleton for avatar
 */
export function SkeletonAvatar({
  size = 40,
  className = '',
}: {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const computedSize = typeof size === 'number' ? size : sizeMap[size];

  return (
    <Skeleton
      variant="circular"
      width={computedSize}
      height={computedSize}
      className={className}
    />
  );
}

/**
 * SkeletonTable - Skeleton for table
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`${styles.table} ${className}`}>
      <div className={styles.tableHeader}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={`${60 + Math.random() * 40}%`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonList - Skeleton for list items
 */
export function SkeletonList({
  items = 5,
  hasAvatar = true,
  hasSecondary = false,
  className = '',
}: {
  items?: number;
  hasAvatar?: boolean;
  hasSecondary?: boolean;
  className?: string;
}) {
  return (
    <div className={`${styles.list} ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className={styles.listItem}>
          {hasAvatar && <SkeletonAvatar size="md" />}
          <div className={styles.listContent}>
            <Skeleton variant="text" width="70%" />
            {hasSecondary && (
              <Skeleton variant="text" width="40%" height={12} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

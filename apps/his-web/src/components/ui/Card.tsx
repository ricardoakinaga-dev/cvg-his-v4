/**
 * Card - Premium Card Component
 * 
 * A flexible card component with header, body, and footer sections.
 * Uses CSS tokens for consistent styling.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode, HTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'none',
      hoverable = false,
      clickable = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const cardClassName = [
      styles.card,
      styles[variant],
      padding !== 'none' ? styles[`padding-${padding}`] : '',
      hoverable ? styles.hoverable : '',
      clickable ? styles.clickable : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (clickable) {
      return (
        <motion.div
          ref={ref}
          className={cardClassName}
          whileHover={hoverable ? { y: -2, boxShadow: 'var(--cvg-shadow-lg)' } : undefined}
          whileTap={{ scale: 0.995 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={cardClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader - Header section of a card
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ children, action, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`${styles.header} ${className}`} {...props}>
      <div className={styles.headerContent}>{children}</div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
}

/**
 * CardTitle - Title in card header
 */
export function CardTitle({
  children,
  className = '',
  as: Component = 'h3',
}: {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}) {
  return (
    <Component className={`${styles.title} ${className}`}>
      {children}
    </Component>
  );
}

/**
 * CardDescription - Description in card header
 */
export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`${styles.description} ${className}`}>{children}</p>;
}

/**
 * CardBody - Main content area of a card
 */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div className={`${styles.body} ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * CardFooter - Footer section of a card
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
}

export function CardFooter({ children, align = 'right', className = '', ...props }: CardFooterProps) {
  return (
    <div className={`${styles.footer} ${styles[`footer-${align}`]} ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * CardSection - A section within a card body
 */
export function CardSection({
  children,
  title,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`${styles.section} ${className}`}>
      {title && <h4 className={styles.sectionTitle}>{title}</h4>}
      {children}
    </div>
  );
}

/**
 * CardDivider - Divider between card sections
 */
export function CardDivider({ className = '' }: { className?: string }) {
  return <hr className={`${styles.divider} ${className}`} />;
}

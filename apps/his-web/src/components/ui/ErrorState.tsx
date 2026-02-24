/**
 * ErrorState - Premium Error State Component
 * 
 * A component for displaying error states with icon, title, message, and retry action.
 * Uses CSS tokens for consistent styling.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import styles from './ErrorState.module.css';

export interface ErrorStateProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  retryText?: string;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'inline' | 'minimal';
}

export function ErrorState({
  title = 'Ocorreu um erro',
  message,
  error,
  onRetry,
  retryText = 'Tentar novamente',
  icon,
  size = 'md',
  variant = 'default',
  className = '',
  style,
  ...props
}: ErrorStateProps) {
  // Extract message from error object if not provided
  const displayMessage = message || (error instanceof Error ? error.message : error) || 'Algo deu errado. Por favor, tente novamente.';

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
      role="alert"
      {...props}
    >
      {icon !== null && (
        <div className={styles.icon}>
          {icon || <ErrorIcon />}
        </div>
      )}
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{displayMessage}</p>
      </div>
      {onRetry && (
        <div className={styles.action}>
          <button
            onClick={onRetry}
            className={styles.retryButton}
            type="button"
          >
            <svg
              className={styles.retryIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {retryText}
          </button>
        </div>
      )}
    </motion.div>
  );
}

/**
 * ErrorIcon - Default error icon
 */
export function ErrorIcon({ className = '' }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * WarningIcon - Warning icon for non-critical errors
 */
export function WarningIcon({ className = '' }: { className?: string }) {
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
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * NetworkErrorIcon - Icon for network/connection errors
 */
export function NetworkErrorIcon({ className = '' }: { className?: string }) {
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
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
      <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * NotFoundError - 404-style error state
 */
export function NotFoundError({
  title = 'Página não encontrada',
  message = 'A página que você está procurando não existe ou foi movida.',
  onRetry,
  retryText = 'Voltar ao início',
  ...props
}: Omit<ErrorStateProps, 'error' | 'icon'>) {
  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      retryText={retryText}
      icon={<NotFoundIcon />}
      {...props}
    />
  );
}

export function NotFoundIcon({ className = '' }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

/**
 * PermissionError - Permission denied error state
 */
export function PermissionError({
  title = 'Acesso negado',
  message = 'Você não tem permissão para acessar este recurso.',
  onRetry,
  retryText = 'Voltar',
  ...props
}: Omit<ErrorStateProps, 'error' | 'icon'>) {
  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      retryText={retryText}
      icon={<LockIcon />}
      {...props}
    />
  );
}

export function LockIcon({ className = '' }: { className?: string }) {
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * InlineError - Minimal inline error message
 */
export function InlineError({
  message,
  onRetry,
  retryText = 'Tentar novamente',
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}) {
  return (
    <div className={`${styles.inline} ${className}`} role="alert">
      <ErrorIcon className={styles.inlineIcon} />
      <span className={styles.inlineMessage}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className={styles.inlineRetry}
          type="button"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

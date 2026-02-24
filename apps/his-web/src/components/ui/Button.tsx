/**
 * Button - Premium Button Component
 * 
 * A versatile button component with multiple variants, sizes, and states.
 * Uses CSS tokens for consistent styling and framer-motion for smooth animations.
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Spinner = () => (
  <svg
    className={styles.spinner}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray="32"
    />
  </svg>
);

const variantClasses: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
  success: styles.success,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const buttonClassName = [
      styles.button,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? styles.fullWidth : '',
      isDisabled ? styles.disabled : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        className={buttonClassName}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        whileHover={isDisabled ? {} : { scale: 1.01, y: -0.5 }}
        whileTap={isDisabled ? {} : { scale: 0.99, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        {...(props as HTMLMotionProps<'button'>)}
      >
        <span className={styles.content}>
          {isLoading && <Spinner />}
          {!isLoading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
          <span className={styles.label}>{children}</span>
          {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

/**
 * IconButton - Button with only an icon
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const buttonClassName = [
      styles.button,
      styles.iconButton,
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        className={buttonClassName}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {icon}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * ButtonGroup - Container for grouped buttons
 */
export function ButtonGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${styles.group} ${className}`}>{children}</div>;
}

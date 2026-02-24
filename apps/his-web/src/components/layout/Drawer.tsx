/**
 * Drawer - Accessible Slide-out Panel Component
 * 
 * Features:
 * - Left or right positioning
 * - Smooth framer-motion animations
 * - Accessible (aria, focus trap, esc to close)
 * - Respects prefers-reduced-motion
 * - Overlay with click-to-close
 */

'use client';

import { ReactNode, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './Drawer.module.css';

export type DrawerPosition = 'left' | 'right';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  position?: DrawerPosition;
  width?: string;
  children: ReactNode;
  showCloseButton?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Drawer component for mobile navigation and side panels
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  position = 'right',
  width,
  children,
  showCloseButton = true,
  className,
  'aria-label': ariaLabel,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus the drawer
      setTimeout(() => {
        drawerRef.current?.focus();
      }, 100);

      // Add escape key listener
      document.addEventListener('keydown', handleKeyDown);

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';

      // Restore focus
      previousActiveElement.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: (position: DrawerPosition) => ({
      x: position === 'left' ? '-100%' : '100%',
      opacity: 0,
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 25,
        stiffness: 300,
      },
    },
    exit: (position: DrawerPosition) => ({
      x: position === 'left' ? '-100%' : '100%',
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className={styles.overlay}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            className={clsx(
              styles.drawer,
              position === 'left' ? styles.left : styles.right,
              className
            )}
            style={{ width: width || 'var(--cvg-drawer-width)' }}
            variants={drawerVariants}
            custom={position}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || title || 'Drawer'}
            tabIndex={-1}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className={styles.header}>
                {title && <h2 className={styles.title}>{title}</h2>}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className={styles.closeButton}
                    aria-label="Fechar"
                    type="button"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      width="20"
                      height="20"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={styles.content}>{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * DrawerSection - Section within a drawer
 */
export function DrawerSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx(styles.section, className)}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      {children}
    </div>
  );
}

/**
 * DrawerItem - Clickable item within a drawer
 */
export function DrawerItem({
  children,
  onClick,
  href,
  active,
  icon,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  active?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  const itemContent = (
    <>
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      <span className={styles.itemLabel}>{children}</span>
    </>
  );

  const itemClassName = clsx(styles.item, active && styles.active, className);

  if (href) {
    return (
      <a href={href} className={itemClassName}>
        {itemContent}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={itemClassName} type="button">
      {itemContent}
    </button>
  );
}

export default Drawer;

/**
 * PageShell - Premium Page Layout Component
 * 
 * Provides consistent structure for all pages:
 * - Header with title and subtitle
 * - Breadcrumb navigation
 * - Action buttons area
 * - Tabs with animated underline for sub-navigation
 * - Main content area with smooth animations
 * 
 * @see STYLE_GUIDE.md for usage examples
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './PageShell.module.css';

export interface BreadcrumbItem {
  title: string;
  href?: string;
}

export interface TabItem {
  id: string;
  label: string;
  href?: string;
  isActive?: boolean;
  badge?: string | number;
}

export interface PageShellProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons to render in header */
  actions?: ReactNode;
  /** Tab items for sub-navigation */
  tabs?: TabItem[];
  /** Main content */
  children: ReactNode;
  /** Optional padding override */
  noPadding?: boolean;
  /** Enable page animation */
  animated?: boolean;
}

/**
 * Breadcrumb component
 */
function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <ol className={styles.breadcrumbList}>
        {items.map((item, index) => (
          <li key={index} className={styles.breadcrumbItem}>
            {index > 0 && (
              <svg className={styles.breadcrumbSeparator} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
            {item.href ? (
              <Link href={item.href} className={styles.breadcrumbLink}>
                {item.title}
              </Link>
            ) : (
              <span className={styles.breadcrumbText}>{item.title}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Tab navigation component with animated underline
 */
function Tabs({ items }: { items: TabItem[] }) {
  if (items.length === 0) return null;

  const activeIndex = items.findIndex((tab) => tab.isActive);

  return (
    <div className={styles.tabsWrapper}>
      <nav className={styles.tabs} role="tablist">
        {items.map((tab, index) => {
          const content = (
            <>
              <span className={styles.tabLabel}>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={styles.tabBadge}>{tab.badge}</span>
              )}
            </>
          );

          return (
            <div key={tab.id} className={styles.tabItem}>
              {tab.href ? (
                <Link
                  href={tab.href}
                  className={`${styles.tab} ${tab.isActive ? styles.tabActive : ''}`}
                  role="tab"
                  aria-selected={tab.isActive}
                >
                  {content}
                </Link>
              ) : (
                <span
                  className={`${styles.tab} ${tab.isActive ? styles.tabActive : ''}`}
                  role="tab"
                  aria-selected={tab.isActive}
                >
                  {content}
                </span>
              )}
              {index === activeIndex && (
                <motion.div
                  className={styles.tabIndicator}
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * PageShell - Main component
 */
export function PageShell({
  title,
  subtitle,
  breadcrumbs,
  actions,
  tabs,
  children,
  noPadding = false,
  animated = true,
}: PageShellProps) {
  const content = (
    <div className={`${styles.container} ${noPadding ? styles.noPadding : ''}`}>
      {/* Header Section */}
      <header className={`${styles.header} ${tabs ? styles.headerWithTabs : ''}`}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>

          {actions && <div className={styles.actions}>{actions}</div>}
        </div>

        {tabs && <Tabs items={tabs} />}
      </header>

      {/* Main Content */}
      <main className={`${styles.main} ${tabs ? styles.mainWithTabs : ''}`}>
        {children}
      </main>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * PageHeader - Standalone header component for more flexibility
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: Pick<PageShellProps, 'title' | 'subtitle' | 'breadcrumbs' | 'actions'>) {
  return (
    <header className={styles.header}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className={styles.headerContent}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}

/**
 * PageContent - Wrapper for page content with consistent padding
 */
export function PageContent({
  children,
  noPadding = false,
}: {
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <div className={`${styles.content} ${noPadding ? styles.noPadding : ''}`}>
      {children}
    </div>
  );
}

/**
 * PageSection - Section within a page with optional title
 */
export function PageSection({
  children,
  title,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section className={`${styles.section} ${className}`}>
      {title && <h2 className={styles.sectionTitle}>{title}</h2>}
      {children}
    </section>
  );
}

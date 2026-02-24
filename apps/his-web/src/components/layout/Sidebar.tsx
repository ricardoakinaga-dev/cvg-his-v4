/**
 * Sidebar - Premium Navigation Component
 * 
 * Features:
 * - Renders navigation groups and items from NAV_TREE
 * - Filters items by user permissions
 * - Collapsible state for desktop with localStorage persistence
 * - Mobile responsive with overlay
 * - Smooth animations with framer-motion
 * - Premium styling with CSS tokens
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_TREE, filterNavByPermissions, type NavGroup, type NavItem } from '../../lib/nav';
import { Can } from '../auth/Can';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// Mock permissions for dev mode - all permissions
const DEV_PERMISSIONS = [
  'rbac.manage',
  'audit.read',
  'system.health.read',
  'owner.read',
  'owner.write',
  'patient.read',
  'patient.write',
  'encounter.read',
  'encounter.write',
  'note.read',
  'note.write',
  'bedmap.read',
  'bed.read',
  'inpatient.read',
  'medadmin.read',
  'document.read',
];

/**
 * Navigation Icons - SVG icons for each section
 */
function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
  const iconMap: Record<string, JSX.Element> = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    clinic: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    inpatient: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    lab: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2v6.5a.5.5 0 0 0 .5.5H21" />
        <path d="M4.5 22h15a2 2 0 0 0 2-2V7.5L14.5 2H6.5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z" />
        <path d="M8 13h8" />
        <path d="M8 17h8" />
      </svg>
    ),
    imaging: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    stock: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    finance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    admin: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  };

  return (
    <span className={styles.navIcon} style={{ width: size, height: size }}>
      {iconMap[name] || (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )}
    </span>
  );
}

/**
 * Navigation Item Component
 */
function NavItemLink({ item, isActive, isCollapsed }: { item: NavItem; isActive: boolean; isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <Link
        href={item.href}
        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        title={item.title}
        aria-current={isActive ? 'page' : undefined}
      >
        <NavIcon name={item.iconName} size={20} />
      </Link>
    );
  }

  const linkContent = (
    <Link
      href={item.href}
      className={`${styles.navItem} ${isActive ? styles.active : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <NavIcon name={item.iconName} size={18} />
      <span className={styles.navItemLabel}>{item.title}</span>
      {isActive && (
        <motion.div
          className={styles.activeIndicator}
          layoutId="activeIndicator"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );

  // If item has permissions, wrap in Can component
  if (item.requiredPermissions && item.requiredPermissions.length > 0) {
    return (
      <Can permission={item.requiredPermissions[0]}>
        {linkContent}
      </Can>
    );
  }

  return linkContent;
}

/**
 * Navigation Group Component
 */
function NavGroupSection({
  group,
  pathname,
  isCollapsed,
}: {
  group: NavGroup;
  pathname: string;
  isCollapsed: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isCollapsed) {
    return (
      <div className={styles.collapsedGroup}>
        <Link
          href={group.items[0]?.href || '#'}
          className={styles.collapsedGroupButton}
          title={group.title}
        >
          <NavIcon name={group.iconName} size={20} />
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.navGroup}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={styles.navGroupHeader}
        aria-expanded={isExpanded}
        type="button"
      >
        <span className={styles.navGroupTitle}>{group.title}</span>
        <motion.span
          className={styles.navGroupChevron}
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            className={styles.navGroupItems}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {group.items.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

              return (
                <NavItemLink key={item.href} item={item} isActive={isActive} isCollapsed={false} />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Main Sidebar Component
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>(DEV_PERMISSIONS);

  // Load collapsed state from localStorage
  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(savedCollapsed === 'true');
    }
    setUserPermissions(DEV_PERMISSIONS);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }
  }, [isCollapsed, mounted]);

  // Filter navigation by permissions
  const filteredNav = useMemo(() => {
    if (!mounted) {
      return NAV_TREE;
    }
    return filterNavByPermissions(NAV_TREE, userPermissions);
  }, [userPermissions, mounted]);

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
        animate={{ width: isCollapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {/* Header */}
        <div className={styles.header}>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                className={styles.brand}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <h1 className={styles.brandTitle}>CVG HIS</h1>
                <span className={styles.brandSubtitle}>v2.0 Enterprise</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={styles.collapseButton}
            title={isCollapsed ? 'Expandir' : 'Colapsar'}
            type="button"
            aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              {isCollapsed ? (
                <polyline points="9 18 15 12 9 6" />
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {filteredNav.map((group) => (
            <NavGroupSection
              key={group.id}
              group={group}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* User Section */}
        <div className={styles.userSection}>
          {isCollapsed ? (
            <div className={styles.userAvatarCollapsed} aria-label="Usuário" />
          ) : (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar} />
              <div className={styles.userDetails}>
                <span className={styles.userName}>
                  {mounted ? 'Desenvolvedor' : '...'}
                </span>
                <span className={styles.userRole}>Admin Total</span>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

/**
 * BottomNav - Mobile Bottom Navigation Component
 * 
 * Features:
 * - Appears only on viewport <= 900px
 * - 4-5 navigation items max
 * - "More" item opens a Drawer with all modules (Odoo-like app switcher)
 * - Items filtered by RBAC
 * - Smooth animations with framer-motion
 * - Touch-friendly targets (min 44px)
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Drawer, DrawerItem, DrawerSection } from './Drawer';
import { NAV_TREE, filterNavByPermissions, type NavGroup } from '../../lib/nav';
import styles from './BottomNav.module.css';

// Mock permissions for dev mode
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
 * Navigation item for bottom nav
 */
interface BottomNavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  matchPaths?: string[];
}

/**
 * Primary navigation items for bottom nav (4-5 max)
 */
const PRIMARY_NAV_ITEMS: BottomNavItem[] = [
  {
    id: 'dashboard',
    label: 'Início',
    href: '/dashboard',
    iconName: 'dashboard',
  },
  {
    id: 'geral',
    label: 'Geral',
    href: '/geral/clientes',
    iconName: 'users',
    matchPaths: ['/geral', '/owners', '/patients'],
  },
  {
    id: 'clinica',
    label: 'Clínica',
    href: '/clinica/atendimentos',
    iconName: 'clinic',
    matchPaths: ['/clinica', '/encounters', '/reception'],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    href: '/financeiro/servicos',
    iconName: 'finance',
    matchPaths: ['/financeiro'],
  },
  {
    id: 'more',
    label: 'Mais',
    href: '#more',
    iconName: 'more',
  },
];

/**
 * Navigation Icons - SVG icons for bottom nav
 */
function NavIcon({ name, size = 24 }: { name: string; size?: number }) {
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
    finance: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    more: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
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
    <span className={styles.icon} style={{ width: size, height: size }}>
      {iconMap[name] || (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )}
    </span>
  );
}

/**
 * BottomNav Component
 */
export function BottomNav() {
  const pathname = usePathname();
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
  const [userPermissions] = useState<string[]>(DEV_PERMISSIONS);

  // Filter navigation by permissions
  const filteredNav = useMemo(() => {
    return filterNavByPermissions(NAV_TREE, userPermissions);
  }, [userPermissions]);

  // Check if item is active
  const isItemActive = (item: BottomNavItem): boolean => {
    if (item.id === 'more') return false;
    if (item.matchPaths) {
      return item.matchPaths.some((path) => pathname.startsWith(path));
    }
    return pathname.startsWith(item.href);
  };

  // Handle item click
  const handleItemClick = (item: BottomNavItem) => {
    if (item.id === 'more') {
      setIsMoreDrawerOpen(true);
    }
  };

  return (
    <>
      <nav className={styles.bottomNav} aria-label="Navegação principal">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = isItemActive(item);
          const isMore = item.id === 'more';

          const content = (
            <>
              <NavIcon name={item.iconName} size={24} />
              <span className={styles.label}>{item.label}</span>
              {isActive && (
                <motion.div
                  className={styles.activeIndicator}
                  layoutId="bottomNavActive"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </>
          );

          if (isMore) {
            return (
              <button
                key={item.id}
                className={clsx(styles.item, isActive && styles.active)}
                onClick={() => handleItemClick(item)}
                aria-label="Ver mais módulos"
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(styles.item, isActive && styles.active)}
              aria-current={isActive ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* More Drawer - Odoo-like App Switcher */}
      <Drawer
        isOpen={isMoreDrawerOpen}
        onClose={() => setIsMoreDrawerOpen(false)}
        title="Módulos"
        position="left"
        aria-label="Lista de módulos"
      >
        {filteredNav.map((group: NavGroup) => (
          <DrawerSection key={group.id} title={group.title}>
            {group.items.map((navItem) => (
              <DrawerItem
                key={navItem.href}
                href={navItem.href}
                icon={<NavIcon name={navItem.iconName} size={20} />}
                active={pathname.startsWith(navItem.href)}
              >
                {navItem.title}
              </DrawerItem>
            ))}
          </DrawerSection>
        ))}
      </Drawer>
    </>
  );
}

export default BottomNav;

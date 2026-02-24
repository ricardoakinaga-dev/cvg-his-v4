/**
 * Topbar - Premium Top Navigation Component
 * 
 * Features:
 * - Hospital name and branding
 * - Global search (placeholder)
 * - Quick links for common actions
 * - User menu with logout
 * - Responsive design
 */

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clearAuthSession } from '../../lib/auth';
import { Button } from '../ui/Button';
import styles from './Topbar.module.css';

interface TopbarProps {
  onToggleMenu?: () => void;
}

export function Topbar({ onToggleMenu }: TopbarProps): JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // If login, don't show
  if (pathname.startsWith('/login')) {
    return null;
  }

  const handleLogout = async () => {
    await clearAuthSession();
    router.replace('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Mobile Menu Button */}
        <button
          onClick={onToggleMenu}
          className={styles.menuButton}
          aria-label="Abrir menu"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Global Search */}
        <div className={`${styles.searchWrapper} ${isSearchFocused ? styles.focused : ''}`}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Buscar pacientes, tutores, atendimentos..."
            className={styles.searchInput}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            aria-label="Busca global"
          />
          <kbd className={styles.searchShortcut}>⌘K</kbd>
        </div>
      </div>

      <div className={styles.center}>
        {/* Hospital Name */}
        <div className={styles.hospitalInfo}>
          <span className={styles.hospitalName}>Centro Veterinário Guarapiranga</span>
        </div>
      </div>

      <div className={styles.right}>
        {/* Quick Links */}
        <nav className={styles.quickLinks} aria-label="Links rápidos">
          <span className={styles.quickLinksLabel}>Cadastros</span>
          <div className={styles.quickLinksItems}>
            <Link
              href="/owners"
              className={`${styles.quickLink} ${pathname.startsWith('/owners') ? styles.active : ''}`}
            >
              Tutores
            </Link>
            <Link
              href="/patients"
              className={`${styles.quickLink} ${pathname.startsWith('/patients') ? styles.active : ''}`}
            >
              Pacientes
            </Link>
          </div>
        </nav>

        {/* Notifications */}
        <button className={styles.iconButton} aria-label="Notificações" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.notificationBadge}>3</span>
        </button>

        {/* User Menu */}
        <div className={styles.userMenu}>
          <button className={styles.userButton} type="button" aria-label="Menu do usuário">
            <div className={styles.userAvatar}>
              <span>DR</span>
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>Desenvolvedor</span>
              <span className={styles.userRole}>Admin</span>
            </div>
            <svg className={styles.userChevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Sair do sistema"
          className={styles.logoutButton}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className={styles.logoutText}>Sair</span>
        </Button>
      </div>
    </header>
  );
}

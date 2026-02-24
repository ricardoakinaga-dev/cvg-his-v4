/**
 * FloatingActionButton (FAB) - Contextual Action Button
 * 
 * Features:
 * - Contextual action based on current route
 * - Appears on mobile/tablet (viewport <= 900px)
 * - Smooth animations with framer-motion
 * - Touch-friendly (56px)
 * - Respects prefers-reduced-motion
 */

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './FloatingActionButton.module.css';

/**
 * FAB configuration per route
 */
interface FabConfig {
  label: string;
  href?: string;
  onClick?: () => void;
  iconName: string;
  show?: boolean;
}

/**
 * Route-based FAB configurations
 */
const FAB_CONFIGS: Record<string, FabConfig> = {
  '/geral/clientes': {
    label: 'Novo Cliente',
    href: '/geral/clientes/novo',
    iconName: 'plus',
  },
  '/geral/animais': {
    label: 'Novo Animal',
    href: '/geral/animais/novo',
    iconName: 'plus',
  },
  '/financeiro/servicos': {
    label: 'Novo Serviço',
    href: '/financeiro/servicos/novo',
    iconName: 'plus',
  },
  '/admin/usuarios': {
    label: 'Novo Usuário',
    href: '/admin/usuarios/novo',
    iconName: 'plus',
  },
  '/admin/perfis': {
    label: 'Novo Perfil',
    href: '/admin/perfis/novo',
    iconName: 'plus',
  },
  '/estoque/produtos': {
    label: 'Novo Produto',
    href: '/estoque/produtos/novo',
    iconName: 'plus',
  },
};

/**
 * Get FAB config for a given pathname
 */
function getFabConfig(pathname: string): FabConfig | null {
  // Check for exact match first
  if (FAB_CONFIGS[pathname]) {
    return FAB_CONFIGS[pathname];
  }

  // Check for partial match (e.g., /geral/clientes should match /geral/clientes)
  for (const route of Object.keys(FAB_CONFIGS)) {
    if (pathname.startsWith(route) && !pathname.includes('/novo') && !pathname.includes('/editar')) {
      return FAB_CONFIGS[route];
    }
  }

  return null;
}

/**
 * Icon component
 */
function FabIcon({ name }: { name: string }) {
  const iconMap: Record<string, JSX.Element> = {
    plus: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    edit: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  };

  return (
    <span className={styles.icon}>
      {iconMap[name] || iconMap.plus}
    </span>
  );
}

/**
 * FloatingActionButton Component
 */
export function FloatingActionButton() {
  const pathname = usePathname();
  const router = useRouter();

  // Get FAB config for current route
  const config = useMemo(() => getFabConfig(pathname), [pathname]);

  // Handle click
  const handleClick = () => {
    if (config?.onClick) {
      config.onClick();
    } else if (config?.href) {
      router.push(config.href);
    }
  };

  // Don't render if no config or on new/edit pages
  if (!config || pathname.includes('/novo') || pathname.includes('/editar')) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.button
        className={styles.fab}
        onClick={handleClick}
        aria-label={config.label}
        type="button"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
        }}
      >
        <FabIcon name={config.iconName} />
        <span className={styles.label}>{config.label}</span>
      </motion.button>
    </AnimatePresence>
  );
}

/**
 * ExtendedFAB - FAB with visible label (for tablet)
 */
export function ExtendedFAB({
  label,
  iconName = 'plus',
  onClick,
  href,
  className,
}: {
  label: string;
  iconName?: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  const content = (
    <>
      <FabIcon name={iconName} />
      <span className={styles.label}>{label}</span>
    </>
  );

  return (
    <motion.button
      className={clsx(styles.fab, styles.extended, className)}
      onClick={handleClick}
      aria-label={label}
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {content}
    </motion.button>
  );
}

export default FloatingActionButton;

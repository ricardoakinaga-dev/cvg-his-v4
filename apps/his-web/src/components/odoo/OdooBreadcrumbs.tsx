/**
 * OdooBreadcrumbs - Odoo-style Breadcrumb Navigation
 * 
 * Features:
 * - Hierarchical navigation path
 * - Clickable links for parent items
 * - Current page as text (not link)
 * - Compact mobile view
 * - Accessible navigation
 */

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './OdooBreadcrumbs.module.css';

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  id: string | number;
}

export interface OdooBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  compact?: boolean;
}

/**
 * OdooBreadcrumbs Component
 */
export function OdooBreadcrumbs({ items, className, compact = false }: OdooBreadcrumbsProps) {
  return (
    <nav
      className={clsx(styles.breadcrumbs, compact && styles.compact, className)}
      aria-label="Breadcrumb"
    >
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isHome = index === 0;

          return (
            <motion.li
              key={item.id}
              className={styles.item}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.15 }}
            >
              {/* Separator */}
              {index > 0 && (
                <span className={styles.separator} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
              )}

              {/* Item */}
              {isLast ? (
                <span className={styles.current} aria-current="page">
                  {isHome && <HomeIcon />}
                  {item.label}
                </span>
              ) : (
                <Link href={item.href || '#'} className={styles.link}>
                  {isHome && <HomeIcon />}
                  <span className={styles.label}>{item.label}</span>
                </Link>
              )}
            </motion.li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Home Icon
 */
function HomeIcon() {
  return (
    <span className={styles.homeIcon} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </span>
  );
}

/**
 * Generate breadcrumbs from pathname
 */
export function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [
    { id: 'home', label: 'Início', href: '/dashboard' },
  ];

  // Map of route segments to labels
  const labelMap: Record<string, string> = {
    geral: 'Geral',
    clientes: 'Clientes',
    animais: 'Animais',
    clinica: 'Clínica',
    atendimentos: 'Atendimentos',
    prescricoes: 'Prescrições',
    prontuario: 'Prontuário',
    solicitacoes: 'Solicitações',
    financeiro: 'Financeiro',
    servicos: 'Serviços',
    orcamentos: 'Orçamentos',
    comandas: 'Comandas',
    pagamentos: 'Pagamentos',
    faturas: 'Faturas',
    caixa: 'Caixa',
    admin: 'Administrativo',
    usuarios: 'Usuários',
    perfis: 'Perfis',
    permissoes: 'Permissões',
    auditoria: 'Auditoria',
    estoque: 'Estoque',
    produtos: 'Produtos',
    lotes: 'Lotes',
    movimentacoes: 'Movimentações',
    kardex: 'Kardex',
    internacao: 'Internação',
    painel: 'Painel',
    leitos: 'Leitos',
    evolucao: 'Evolução',
    medicacoes: 'Medicações',
    laboratorio: 'Laboratório',
    pedidos: 'Pedidos',
    coleta: 'Coleta',
    laudos: 'Laudos',
    resultados: 'Resultados',
    imagem: 'Imagem',
    agenda: 'Agenda',
    settings: 'Configurações',
    novo: 'Novo',
    editar: 'Editar',
  };

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const isId = /^\d+$/.test(segment) || /^[a-f0-9-]{36}$/.test(segment);

    if (isId) {
      // For ID segments, use a generic label
      items.push({
        id: segment,
        label: 'Detalhes',
        href: isLast ? undefined : currentPath,
      });
    } else {
      items.push({
        id: segment,
        label: labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: isLast ? undefined : currentPath,
      });
    }
  });

  return items;
}

export default OdooBreadcrumbs;

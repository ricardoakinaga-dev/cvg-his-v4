/**
 * OdooStatusBar - Odoo-style Status Badge Component
 * 
 * Features:
 * - Status badges (Draft, Active, Archived, Pending, Done)
 * - Animated transitions
 * - Accessible labels
 * - Consistent with Odoo UI patterns
 */

'use client';

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import styles from './OdooStatusBar.module.css';

/**
 * Status types
 */
export type OdooStatus = 'draft' | 'active' | 'archived' | 'pending' | 'done' | 'cancelled';

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<OdooStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: styles.draft },
  active: { label: 'Ativo', className: styles.active },
  archived: { label: 'Arquivado', className: styles.archived },
  pending: { label: 'Pendente', className: styles.pending },
  done: { label: 'Concluído', className: styles.done },
  cancelled: { label: 'Cancelado', className: styles.cancelled },
};

export interface OdooStatusBarProps {
  status: OdooStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

/**
 * OdooStatusBar Component
 */
export function OdooStatusBar({
  status,
  label,
  size = 'md',
  animated = true,
  className,
}: OdooStatusBarProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label || config.label;

  const content = (
    <span className={clsx(styles.badge, config.className, styles[size], className)}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{displayLabel}</span>
    </span>
  );

  if (animated) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        {content}
      </motion.span>
    );
  }

  return content;
}

/**
 * Status selector dropdown
 */
export interface StatusOption {
  value: OdooStatus;
  label: string;
}

export interface OdooStatusSelectProps {
  value: OdooStatus;
  options?: StatusOption[];
  onChange: (status: OdooStatus) => void;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
  { value: 'archived', label: 'Arquivado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'done', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
];

export function OdooStatusSelect({
  value,
  options = DEFAULT_OPTIONS,
  onChange,
  disabled = false,
  className,
}: OdooStatusSelectProps) {
  return (
    <div className={clsx(styles.selectWrapper, className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as OdooStatus)}
        disabled={disabled}
        className={clsx(styles.select, STATUS_CONFIG[value].className)}
        aria-label="Alterar status"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.selectBadge}>
        <OdooStatusBar status={value} animated={false} size="sm" />
      </span>
    </div>
  );
}

/**
 * Status history item
 */
export interface StatusHistoryItem {
  status: OdooStatus;
  label?: string;
  timestamp: string;
  user?: string;
}

export interface OdooStatusHistoryProps {
  items: StatusHistoryItem[];
  className?: string;
}

export function OdooStatusHistory({ items, className }: OdooStatusHistoryProps) {
  return (
    <div className={clsx(styles.history, className)}>
      <h4 className={styles.historyTitle}>Histórico de Status</h4>
      <ul className={styles.historyList}>
        {items.map((item, index) => (
          <li key={index} className={styles.historyItem}>
            <OdooStatusBar status={item.status} label={item.label} size="sm" animated={false} />
            <span className={styles.historyMeta}>
              {item.timestamp}
              {item.user && <span className={styles.historyUser}> por {item.user}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default OdooStatusBar;

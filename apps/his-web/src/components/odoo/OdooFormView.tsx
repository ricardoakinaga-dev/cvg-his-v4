/**
 * OdooFormView - Odoo-style Form View Component
 * 
 * Features:
 * - FormHeader with title, status badge, and actions
 * - NotebookTabs for organizing content in tabs
 * - SidePanel for chatter/communication (placeholder)
 * - Responsive design
 * - Form sections with proper labeling
 */

'use client';

import { useState, ReactNode, useReducer } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { OdooStatusBar, type OdooStatus } from './OdooStatusBar';
import styles from './OdooFormView.module.css';

/**
 * Tab definition
 */
export interface OdooFormTab {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

/**
 * Form action
 */
export interface OdooFormAction {
  id: string;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  iconName?: string;
}

export interface OdooFormViewProps {
  title: string;
  subtitle?: string;
  status?: OdooStatus;
  statusLabel?: string;
  tabs: OdooFormTab[];
  defaultTabId?: string;
  actions?: OdooFormAction[];
  secondaryActions?: OdooFormAction[];
  onSave?: () => void;
  onDiscard?: () => void;
  saveLoading?: boolean;
  hasChanges?: boolean;
  sidePanel?: ReactNode;
  showSidePanel?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Icons
 */
function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function DiscardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

/**
 * OdooFormView Component
 */
export function OdooFormView({
  title,
  subtitle,
  status,
  statusLabel,
  tabs,
  defaultTabId,
  actions,
  secondaryActions,
  onSave,
  onDiscard,
  saveLoading = false,
  hasChanges = false,
  sidePanel,
  showSidePanel = false,
  className,
  children,
}: OdooFormViewProps) {
  const [activeTabId, setActiveTabId] = useState(defaultTabId || tabs[0]?.id);
  const [showSecondaryMenu, toggleSecondaryMenu] = useReducer((s) => !s, false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className={clsx(styles.container, showSidePanel && styles.withSidePanel, className)}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {status && (
              <OdooStatusBar status={status} label={statusLabel} size="md" />
            )}
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.headerRight}>
          {/* Secondary Actions */}
          {secondaryActions && secondaryActions.length > 0 && (
            <div className={styles.secondaryActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSecondaryMenu}
                aria-label="Mais ações"
              >
                <MenuIcon />
              </Button>
              <AnimatePresence>
                {showSecondaryMenu && (
                  <motion.div
                    className={styles.secondaryMenu}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {secondaryActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.onClick();
                          toggleSecondaryMenu();
                        }}
                        className={styles.secondaryMenuItem}
                        disabled={action.disabled}
                        type="button"
                      >
                        {action.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Discard */}
          {onDiscard && hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              leftIcon={<DiscardIcon />}
            >
              Descartar
            </Button>
          )}

          {/* Save */}
          {onSave && (
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              loading={saveLoading}
              disabled={!hasChanges}
              leftIcon={<SaveIcon />}
            >
              Salvar
            </Button>
          )}

          {/* Custom Actions */}
          {actions?.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              loading={action.loading}
              disabled={action.disabled}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Notebook Tabs */}
      <div className={styles.notebook}>
        <div className={styles.tabsWrapper}>
          <div className={styles.tabs} role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTabId === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={clsx(
                  styles.tab,
                  activeTabId === tab.id && styles.tabActive,
                  tab.disabled && styles.tabDisabled
                )}
                onClick={() => !tab.disabled && setActiveTabId(tab.id)}
                disabled={tab.disabled}
                type="button"
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={styles.tabBadge}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div
          className={styles.tabContent}
          role="tabpanel"
          id={`tabpanel-${activeTabId}`}
          aria-labelledby={activeTabId}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTabId}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className={styles.tabPanel}
            >
              {activeTab?.content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Children (alternative to tabs) */}
      {children}

      {/* Side Panel */}
      {showSidePanel && sidePanel && (
        <div className={styles.sidePanel}>
          {sidePanel}
        </div>
      )}
    </div>
  );
}

/**
 * Form Section Component
 */
export interface OdooFormSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function OdooFormSection({
  title,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: OdooFormSectionProps) {
  const [isCollapsed, toggleCollapsed] = useReducer(
    (s) => !s,
    defaultCollapsed
  );

  return (
    <div className={clsx(styles.section, isCollapsed && styles.sectionCollapsed, className)}>
      {title && (
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>{title}</h3>
          {collapsible && (
            <button
              onClick={toggleCollapsed}
              className={styles.sectionToggle}
              type="button"
              aria-expanded={!isCollapsed}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="16"
                height="16"
                style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={styles.sectionContent}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Form Field Component
 */
export interface OdooFormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
  helpText?: string;
  className?: string;
  labelWidth?: string;
}

export function OdooFormField({
  label,
  children,
  required = false,
  error,
  helpText,
  className,
  labelWidth,
}: OdooFormFieldProps) {
  return (
    <div className={clsx(styles.field, error && styles.fieldError, className)}>
      <label
        className={styles.fieldLabel}
        style={{ width: labelWidth || 'var(--cvg-form-label-width)' }}
      >
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <div className={styles.fieldContent}>
        {children}
        {helpText && <span className={styles.helpText}>{helpText}</span>}
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    </div>
  );
}

/**
 * Form Row Component (for multiple fields in a row)
 */
export interface OdooFormRowProps {
  children: ReactNode;
  className?: string;
}

export function OdooFormRow({ children, className }: OdooFormRowProps) {
  return <div className={clsx(styles.row, className)}>{children}</div>;
}

/**
 * Odoo Chatter (placeholder for communication/log)
 */
export interface OdooChatterProps {
  messages?: Array<{
    id: string | number;
    author: string;
    timestamp: string;
    content: string;
  }>;
  className?: string;
}

export function OdooChatter({ messages = [], className }: OdooChatterProps) {
  return (
    <div className={clsx(styles.chatter, className)}>
      <h4 className={styles.chatterTitle}>Histórico</h4>
      {messages.length === 0 ? (
        <p className={styles.chatterEmpty}>Nenhuma mensagem</p>
      ) : (
        <ul className={styles.chatterList}>
          {messages.map((msg) => (
            <li key={msg.id} className={styles.chatterItem}>
              <div className={styles.chatterMeta}>
                <span className={styles.chatterAuthor}>{msg.author}</span>
                <span className={styles.chatterTime}>{msg.timestamp}</span>
              </div>
              <p className={styles.chatterContent}>{msg.content}</p>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.chatterInput}>
        <textarea
          placeholder="Escreva uma mensagem..."
          className={styles.chatterTextarea}
          rows={2}
        />
        <Button variant="primary" size="sm">
          Enviar
        </Button>
      </div>
    </div>
  );
}

export default OdooFormView;

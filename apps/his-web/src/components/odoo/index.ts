/**
 * Odoo-style UI Components
 * 
 * Export all Odoo primitives for use in modules.
 */

export { OdooBreadcrumbs, generateBreadcrumbsFromPath, type BreadcrumbItem, type OdooBreadcrumbsProps } from './OdooBreadcrumbs';
export { OdooListView, type OdooListColumn, type OdooListFilter, type OdooListSortOption, type OdooListAction, type OdooListViewProps } from './OdooListView';
export { 
  OdooFormView, 
  OdooFormSection, 
  OdooFormField, 
  OdooFormRow, 
  OdooChatter,
  type OdooFormTab,
  type OdooFormAction,
  type OdooFormViewProps,
  type OdooFormSectionProps,
  type OdooFormFieldProps,
  type OdooFormRowProps,
  type OdooChatterProps,
} from './OdooFormView';
export { OdooStatusBar, OdooStatusSelect, OdooStatusHistory, type OdooStatus, type StatusOption, type StatusHistoryItem, type OdooStatusBarProps, type OdooStatusSelectProps, type OdooStatusHistoryProps } from './OdooStatusBar';

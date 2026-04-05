/**
 * Design System Vue Components — Type Definitions
 *
 * These types mirror the props interfaces defined in each Vue SFC.
 * They are re-exported here so consumers can import types without
 * needing to resolve .vue files in their TypeScript config.
 */

export interface DsButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  tag?: 'button' | 'a';
  href?: string;
  to?: string;
  ariaLabel?: string;
  icon?: string;
}

export interface DsCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'compact';
  interactive?: boolean;
  tag?: 'div' | 'article' | 'section' | 'a';
  title?: string;
  ariaLabel?: string;
}

export interface DsBadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
  ariaLabel?: string;
}

export interface DsAlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  icon?: string;
  dismissible?: boolean;
}

export interface DsModalProps {
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  teleport?: boolean;
}

export interface DsTabItem {
  key?: string | number;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface DsTabsProps {
  tabs: DsTabItem[];
  modelValue: string | number;
  ariaLabel?: string;
}

export interface DsSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  inline?: boolean;
  ariaLabel?: string;
}

export interface DsInputProps {
  modelValue?: string;
  label?: string;
  placeholder?: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'tel'
    | 'url'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'search'
    | 'textarea'
    | 'select';
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
  maxlength?: number;
  autocomplete?: string;
  rows?: number;
  id?: string;
  step?: string | number;
  min?: string | number;
  max?: string | number;
}

export interface DsCheckboxProps {
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export interface DsRadioProps {
  value: any;
  name?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
}

export type { AuthState } from './auth';

export interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

export interface NavItem {
  label: string;
  path: string;
  icon?: string;
  requiresAuth?: boolean;
}

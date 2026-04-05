export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  user: {
    id: string | null;
    email: string | null;
    name: string | null;
    roles: string[];
  };
}

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

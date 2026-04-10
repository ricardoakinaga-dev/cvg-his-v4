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
    accountId: string | null;
  };
}

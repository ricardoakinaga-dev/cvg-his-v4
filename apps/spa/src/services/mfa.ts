import { apiRequest } from './api';

export interface MfaStatusResponse {
  isActive: boolean;
  isRequired: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
}

export interface MfaRecoveryCodesResponse {
  recoveryCodes: readonly string[];
}

export const mfaService = {
  async getStatus(): Promise<MfaStatusResponse> {
    return apiRequest<MfaStatusResponse>('/mfa/status');
  },

  async initiateSetup(): Promise<MfaSetupResponse> {
    return apiRequest<MfaSetupResponse>('/mfa/setup', {
      method: 'POST'
    });
  },

  async confirmSetup(token: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/mfa/setup/confirm', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async disable(token: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  async regenerateRecoveryCodes(): Promise<MfaRecoveryCodesResponse> {
    return apiRequest<MfaRecoveryCodesResponse>('/mfa/recovery-codes/regenerate', {
      method: 'POST'
    });
  }
};
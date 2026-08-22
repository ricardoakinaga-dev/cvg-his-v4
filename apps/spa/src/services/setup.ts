import { apiRequest } from './api';

/** Mirrors the server-side policy; the API remains authoritative. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;
/** 32 random bytes in base64url without padding; the API remains authoritative. */
export const MIN_SETUP_TOKEN_LENGTH = 43;

export interface SetupState {
  readonly setupRequired: boolean;
  readonly setupAvailable: boolean;
}

export interface InitialSetupInput {
  readonly clinicName: string;
  readonly adminUsername: string;
  readonly adminFullName: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
}

export interface InitialSetupResult {
  readonly setupCompleted: boolean;
  readonly requiresLogin: boolean;
}

interface SetupStatusResponse {
  readonly setupRequired?: unknown;
  readonly setupAvailable?: unknown;
}

interface SetupCompletionResponse {
  readonly setupCompleted?: unknown;
  readonly requiresLogin?: unknown;
}

/** Returns the two independent facts needed by the first-access UI. */
export async function fetchSetupState(): Promise<SetupState> {
  const response = await apiRequest<SetupStatusResponse>('/auth/setup/status', {
    method: 'GET',
    skipAuth: true
  });

  if (
    typeof response.setupRequired !== 'boolean'
    || (response.setupAvailable !== undefined && typeof response.setupAvailable !== 'boolean')
  ) {
    throw new Error('Invalid setup status response');
  }

  // Missing availability is unsafe to assume: legacy APIs remain readable but
  // do not expose a form that their runtime may be unable to submit.
  return {
    setupRequired: response.setupRequired === true,
    setupAvailable: response.setupAvailable === true
  };
}

/** Compatibility helper for callers that only need the legacy boolean. */
export async function fetchSetupStatus(): Promise<boolean> {
  return (await fetchSetupState()).setupRequired;
}

/**
 * Completes installation with the operator-entered credential in the POST
 * body. The service never generates or persists it and returns only whitelisted
 * completion flags, even if an older API responds with session fields.
 */
export async function completeInitialSetup(
  input: InitialSetupInput,
  setupToken: string
): Promise<InitialSetupResult> {
  const response = await apiRequest<SetupCompletionResponse>('/auth/setup', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ token: setupToken, ...input })
  });

  if (response.setupCompleted !== true || response.requiresLogin !== true) {
    throw new Error('Invalid setup completion response');
  }

  return {
    setupCompleted: true,
    requiresLogin: true
  };
}

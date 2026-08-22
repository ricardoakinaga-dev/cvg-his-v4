/**
 * First-run setup endpoints.
 *
 * These are the only routes that can create an account without an existing
 * identity, so they are constrained on every axis available: they refuse to run
 * once any user exists, require the bootstrap token, are rate limited, and
 * enforce a password policy before anything is written.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import { ValidationError } from '@cvg-his-v2/shared-errors';

import { readJsonBody } from '../helpers/common.js';
import { getClientIp } from './auth-routes.js';
import {
  InstallationAlreadyProvisionedError,
  isSetupRequired,
  provisionInitialInstallation
} from '../setup-provisioning.js';
import { isValidSetupToken } from '../setup-token.js';

export const MIN_ADMIN_PASSWORD_LENGTH = 12;
export const MAX_ADMIN_PASSWORD_LENGTH = 128;
export const SETUP_MAX_BODY_BYTES = 16 * 1024;
const MAX_FIELD_LENGTH = 255;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SetupRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  blocked: boolean;
  retryAfterMs: number;
}

interface SetupRateLimiter {
  check(input: { ip: string; route: string }): Promise<SetupRateLimitInfo>;
}

interface SetupLogger {
  error(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
}

export interface SetupRoutesHandlers {
  readonly setupRateLimiter: SetupRateLimiter;
  readonly logger: SetupLogger;
  readonly setupBootstrapToken?: string;
  readonly trustedProxyCidrs?: readonly string[];
  /** Absent when the API runs in in-memory mode, where setup does not apply. */
  readonly getPool?: () => import('pg').Pool;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function sendRateLimited(response: ServerResponse, info: SetupRateLimitInfo): boolean {
  response.setHeader('X-RateLimit-Limit', String(info.limit));
  response.setHeader('X-RateLimit-Remaining', String(info.remaining));
  response.setHeader('X-RateLimit-Reset', String(info.reset));

  if (!info.blocked) {
    return false;
  }

  response.setHeader('Retry-After', String(Math.ceil(info.retryAfterMs / 1000)));
  sendJson(response, 429, {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
    retryAfterMs: info.retryAfterMs
  });
  return true;
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Rejects passwords that are short or built from a single character class.
 *
 * The initial account is the most privileged one in the installation and is
 * chosen without any administrator to review it, so the policy is enforced
 * server-side rather than left to the wizard UI.
 */
export function validateAdminPassword(password: string): string | null {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `A senha do administrador deve ter ao menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`;
  }

  if (password.length > MAX_ADMIN_PASSWORD_LENGTH) {
    return `A senha do administrador deve ter no máximo ${MAX_ADMIN_PASSWORD_LENGTH} caracteres.`;
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((pattern) =>
    pattern.test(password)
  ).length;

  if (classes < 3) {
    return 'A senha do administrador deve combinar ao menos três de: minúsculas, maiúsculas, números e símbolos.';
  }

  return null;
}

interface ValidatedSetupInput {
  readonly clinicName: string;
  readonly adminUsername: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly adminFullName: string;
}

function validateSetupPayload(
  payload: Record<string, unknown>
): { ok: true; value: ValidatedSetupInput } | { ok: false; message: string } {
  const clinicName = readString(payload, 'clinicName');
  const adminUsername = readString(payload, 'adminUsername');
  const adminEmail = readString(payload, 'adminEmail');
  const adminFullName = readString(payload, 'adminFullName');
  const adminPassword = typeof payload.adminPassword === 'string' ? payload.adminPassword : '';

  if (clinicName.length === 0 || clinicName.length > MAX_FIELD_LENGTH) {
    return { ok: false, message: 'Informe o nome da clínica.' };
  }
  if (!USERNAME_PATTERN.test(adminUsername)) {
    return {
      ok: false,
      message: 'Usuário inválido. Use de 3 a 128 caracteres entre letras, números, ponto, hífen ou sublinhado.'
    };
  }
  if (!EMAIL_PATTERN.test(adminEmail) || adminEmail.length > 320) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }
  if (adminFullName.length > MAX_FIELD_LENGTH) {
    return { ok: false, message: 'Nome completo excede o tamanho permitido.' };
  }

  const passwordError = validateAdminPassword(adminPassword);
  if (passwordError) {
    return { ok: false, message: passwordError };
  }

  return {
    ok: true,
    value: { clinicName, adminUsername, adminEmail, adminPassword, adminFullName }
  };
}

export async function handleSetupRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: SetupRoutesHandlers
): Promise<boolean> {
  const { setupRateLimiter, logger, getPool } = handlers;

  const isStatusRoute = pathname === '/auth/setup/status' && request.method === 'GET';
  const isSetupRoute = pathname === '/auth/setup' && request.method === 'POST';
  if (!isStatusRoute && !isSetupRoute) {
    return false;
  }

  const rateLimitInfo = await setupRateLimiter.check({
    ip: getClientIp(request, handlers.trustedProxyCidrs),
    route: isStatusRoute ? '/auth/setup/status' : '/auth/setup'
  });
  if (sendRateLimited(response, rateLimitInfo)) {
    return true;
  }

  // In-memory runtimes have no installation to provision; report setup as done
  // so the SPA falls through to the normal login screen.
  if (!getPool) {
    if (isStatusRoute) {
      return sendJson(response, 200, { setupRequired: false, setupAvailable: false });
    }
    return sendJson(response, 409, {
      code: 'SETUP_UNAVAILABLE',
      message: 'Setup is not available without a configured database.'
    });
  }

  let setupRequired: boolean;
  try {
    setupRequired = await isSetupRequired(getPool());
  } catch (error) {
    logger.error('setup status check failed', { correlationId, error });
    return sendJson(response, 503, {
      code: 'SETUP_STATUS_UNAVAILABLE',
      message: 'Could not determine installation state.'
    });
  }

  if (isStatusRoute) {
    return sendJson(response, 200, {
      setupRequired,
      setupAvailable: Boolean(handlers.setupBootstrapToken)
    });
  }

  if (!setupRequired) {
    return sendJson(response, 409, {
      code: 'SETUP_ALREADY_COMPLETED',
      message: 'Installation has already been provisioned.'
    });
  }

  if (!handlers.setupBootstrapToken) {
    return sendJson(response, 503, {
      code: 'SETUP_DISABLED',
      message: 'Initial setup is disabled until the operator configures a bootstrap secret.'
    });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await readJsonBody(request, SETUP_MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof ValidationError) {
      const tooLarge = error.message === 'Request body is too large';
      return sendJson(response, tooLarge ? 413 : 400, {
        code: tooLarge ? 'SETUP_PAYLOAD_TOO_LARGE' : 'INVALID_JSON_BODY',
        message: tooLarge ? 'Setup payload is too large.' : error.message
      });
    }
    throw error;
  }

  if (rawPayload === null || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return sendJson(response, 400, {
      code: 'INVALID_SETUP_PAYLOAD',
      message: 'Setup payload must be a JSON object.'
    });
  }
  const payload = rawPayload as Record<string, unknown>;

  if (!isValidSetupToken(handlers.setupBootstrapToken, payload.token)) {
    logger.warn('setup attempt rejected: invalid bootstrap token', {
      correlationId,
      ip: getClientIp(request, handlers.trustedProxyCidrs)
    });
    return sendJson(response, 401, {
      code: 'INVALID_SETUP_TOKEN',
      message: 'Token de instalação inválido.'
    });
  }

  const validation = validateSetupPayload(payload);
  if (!validation.ok) {
    return sendJson(response, 400, {
      code: 'INVALID_SETUP_PAYLOAD',
      message: validation.message
    });
  }

  let provisioned: Awaited<ReturnType<typeof provisionInitialInstallation>>;
  try {
    provisioned = await provisionInitialInstallation(getPool(), {
      ...validation.value,
      correlationId
    });
  } catch (error) {
    if (error instanceof InstallationAlreadyProvisionedError) {
      // Lost the race against a concurrent setup request.
      return sendJson(response, 409, {
        code: 'SETUP_ALREADY_COMPLETED',
        message: 'Installation has already been provisioned.'
      });
    }

    logger.error('installation provisioning failed', { correlationId, error });
    return sendJson(response, 500, {
      code: 'SETUP_FAILED',
      message: 'Não foi possível concluir a instalação.'
    });
  }

  logger.info('installation provisioned', {
    correlationId,
    accountId: provisioned.accountId,
    clinicSlug: provisioned.clinicSlug
  });

  // Authentication is deliberately a separate, normal login. This gives every
  // hot replica the same repository-authoritative path and prevents a response
  // convenience failure from obscuring an already-committed installation.
  return sendJson(response, 201, { setupCompleted: true, requiresLogin: true });
}

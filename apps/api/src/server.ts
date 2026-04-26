import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { getPool } from '@cvg-his-v2/shared-database';
import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import { createAuthRateLimiter } from './http/auth-rate-limiter.js';
import type { SecretsManager } from '@cvg-his-v2/secrets';
import type {
  AddInpatientProgressRequest,
  ArchiveClinicalEntryRequest,
  AssignBedRequest,
  CloseEncounterRequest,
  CreateAttachmentRequest,
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  CreateClinicalEntryRequest,
  CreateDischargeRequest,
  CreateEncounterRequest,
  CreateInpatientAdmissionRequest,
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  CreateNotificationRequest,
  CreatePrescriptionExecutionRequest,
  CreateSectorRequest,
  CreateBedRequest,
  CreateSurgeryCaseRequest,
  CreateTriageRequest,
  UpdateTriageRequest,
  ExecutePrescriptionRequest,
  LogAdministrationEventRequest,
  ProcessNotificationsRequest,
  SuspendPrescriptionRequest,
  TransitionEncounterRequest,
  UpdateBillingStatusRequest,
  UpdateClinicalEntryRequest,
  UpdateDischargeRequest,
  UpdateInpatientStatusRequest,
  UpdateSurgeryStatusRequest,
  UpdateUserRequest,
  CreateWebhookRequest,
  UpdateWebhookRequest
} from '@cvg-his-v2/shared-contracts';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  toErrorResponse
} from '@cvg-his-v2/shared-errors';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import {
  resolveTenantFromRequest,
  runWithTenantContext,
  withTenantQuery
} from '@cvg-his-v2/tenant-context';
import type {
  ApiKeySummary,
  AuthenticatedPrincipal,
  CorrelationId,
  ModuleName,
  SchedulingAppointmentSummary
} from '@cvg-his-v2/shared-types';

import {
  createInMemoryOidcStateStore,
  createStatelessOidcStateStore,
  handleAuthRoutes
} from './routes/auth-routes.js';
import { handleOpenApiRoutes } from './routes/openapi-routes.js';
import { handleFiscalRoutes } from './routes/fiscal-routes.js';
import { handleHealthRoutes } from './routes/health-routes.js';
import { handleLaboratoryRoutes } from './routes/laboratory-routes.js';
import { handleLgpdRoutes } from './routes/lgpd-routes.js';
import { handlePaymentsRoutes } from './routes/payments-routes.js';
import { handleEmailRoutes } from './routes/email-routes.js';
import { handleSmsRoutes } from './routes/sms-routes.js';
import { handleFinancialRoutes } from './routes/financial-routes.js';
import { handleSchedulingRoutes } from './routes/scheduling-routes.js';
import { handleAgendaConfigRoutes } from './routes/agenda-config-routes.js';
import { handleGoogleCalendarRoutes } from './routes/google-calendar-routes.js';
import { handleLaboratoryIntegrationRoutes } from './routes/laboratory-integration-routes.js';
import { handleMlRoutes } from './routes/ml-routes.js';
import { handleSoc2Routes } from './routes/soc2-routes.js';
import { handleWebhooksRoutes } from './routes/webhooks-routes.js';
import { handleFeatureFlagsRoutes } from './routes/feature-flags-routes.js';
import { handleAdministrativeReportsRoutes } from './routes/administrative-reports-routes.js';
import { handleDischargesRoutes } from './routes/discharges-routes.js';
import { handleBillingRoutes } from './routes/billing-routes.js';
import { handleExpensesCatalogRoutes } from './routes/expenses-catalog-routes.js';
import { handlePrescriptionExecutionsRoutes } from './routes/prescription-executions-routes.js';
import { handleInventoryRoutes } from './routes/inventory-routes.js';
import { handleInventoryWarehousesRoutes } from './routes/inventory-warehouses-routes.js';
import { handleInventoryManufacturersRoutes } from './routes/inventory-manufacturers-routes.js';
import { handleInventoryProductGroupsRoutes } from './routes/inventory-product-groups-routes.js';
import { handleCompanySectorsRoutes } from './routes/company-sectors-routes.js';
import { handleMeasurementUnitsRoutes } from './routes/measurement-units-routes.js';
import { handleCommercialRoutes } from './routes/commercial-routes.js';
import { handleSurgeryRoutes } from './routes/surgery-routes.js';
import { handleWhatsAppRoutes } from './routes/whatsapp-routes.js';
import { handleAccessControlRoutes } from './routes/access-control-routes.js';
import { handleInpatientRoutes } from './routes/inpatient-routes.js';
import { handleApiKeysRoutes } from './routes/api-keys-routes.js';
import { handleInternalEventsRoutes } from './routes/internal-events-routes.js';
import { handleCounterSalesRoutes } from './routes/counter-sales-routes.js';
import { handleOwnersRoutes } from './routes/owners-routes.js';
import { handlePatientsRoutes } from './routes/patients-routes.js';
import { handleUsersStaffQuotesRoutes } from './routes/users-staff-quotes-routes.js';
import {
  ChaosEngine,
  databaseFailureExperiment,
  redisFailureExperiment,
  networkLatencyExperiment,
  workerFailureExperiment,
  apiLatencyExperiment
} from '@cvg-his-v2/chaos';
import type { SectorBedServiceOptions } from '@cvg-his-v2/module-inpatient';
import { createApiRuntime, type RuntimeRepositories } from './runtime.js';
import { LocalPixPaymentGateway, PagarMePaymentGatewayAdapter } from './payment-gateway.js';
import {
  LocalEmailGateway,
  ResendEmailGatewayAdapter
} from './email-gateway.js';
import { InMemoryEmailDeliveryRepository } from './email-delivery-repository.js';
import { LocalSmsGateway, TwilioSmsGatewayAdapter } from './sms-gateway.js';
import { InMemorySmsDeliveryRepository } from './sms-delivery-repository.js';
import {
  GoogleCalendarGatewayAdapter,
  LocalGoogleCalendarGateway
} from './google-calendar-gateway.js';
import { InMemoryGoogleCalendarSyncRepository } from './google-calendar-sync-repository.js';
import { InMemoryLaboratoryResultImportRepository } from './laboratory-result-import-repository.js';
import {
  getMetricsText,
  httpErrorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  normalizeRoute,
  recordRequestSloObservation,
  updateAppMetrics,
  createFeatureFlagMetricsCollector
} from './metrics.js';
import {
  describeChaosExperiment,
  resolveOperationalRuntimeState
} from './chaos-operational-state.js';
import {
  tracingMiddleware,
  extractTraceContext,
  createSpan,
  endSpan,
  withSpanContext,
  injectTraceContext,
  formatTraceParent,
  type Span
} from './tracing.js';
import { generateSLOReport, getSLOConfigs } from './slos.js';
import type { FileStorage } from '@cvg-his-v2/module-attachments';
import { getAppState } from './app-state.js';
import {
  WebAuthnServiceImpl,
  InMemoryWebAuthnRepository
} from '@cvg-his-v2/module-mfa';
import {
  AbacEngine,
  type ActorAttributes,
  type ResourceAttributes,
  type EnvironmentAttributes
} from '@cvg-his-v2/module-access-control';
import {
  type OIDCConfig
} from '@cvg-his-v2/module-auth';
import {
  MfaControlService,
  VulnerabilityControlService,
  AccessReviewControlService,
  DisasterRecoveryControlService,
  IncidentResponseControlService
} from '@cvg-his-v2/module-soc2';
import { FiscalService } from '@cvg-his-v2/module-fiscal';
import { DatabaseFeatureFlagRepository } from '@cvg-his-v2/module-feature-flags';
import { createApiFeatureFlags, type ApiFeatureFlagsSnapshot } from './feature-flags.js';
import {
  DemandForecastingService,
  LabAnomalyDetectionService,
  OcrFiscalService
} from '@cvg-his-v2/module-ml';
import { MlTelemetryService } from './ml-telemetry.js';

export interface ApiServerOptions {
  readonly appName: string;
  readonly environment: string;
  readonly version: string;
  readonly corsAllowedOrigins?: readonly string[];
  readonly authSecret: string;
  readonly authVerifierSecrets?: readonly string[];
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly authRateLimitMaxRequests?: number;
  readonly authRateLimitWindowMs?: number;
  readonly enableMfa?: boolean;
  readonly mfaEncryptionKey?: string;
  readonly repositories?: RuntimeRepositories;
  readonly fileStorage?: FileStorage;
  readonly sectorBedOptions?: SectorBedServiceOptions;
  readonly featureFlagsProvider?: string;
  /** Pre-resolved feature flags snapshot (GAP-06: avoids async call inside createApiServer) */
  readonly featureFlags?: ApiFeatureFlagsSnapshot;
  /** Gates distributed runtime state (Redis-backed session, encounter timeline, etc.) */
  readonly runtimeDistributedStateEnabled?: boolean;
  readonly pagarmeApiKey?: string;
  readonly pagarmePixKey?: string;
  /** When true, forces LocalPixPaymentGateway (mock) even if pagarme keys are set. Default: false (PagarMe default). */
  readonly pixMockMode?: boolean;
  readonly resendApiKey?: string;
  readonly emailFrom?: string;
  readonly emailMockMode?: boolean;
  readonly smsApiKey?: string;
  readonly smsFrom?: string;
  readonly smsMockMode?: boolean;
  readonly googleCalendarAccessToken?: string;
  readonly googleCalendarCalendarId?: string;
  readonly googleCalendarMockMode?: boolean;
  /** Redis URL for distributed rate limiting. When set, auth rate limiter uses Redis backend. */
  readonly redisUrl?: string;
  /** Secrets manager for reading credentials at startup. Uses EnvSecretsProvider when omitted. */
  readonly secretsManager?: SecretsManager;
}

export type ApiServer = ReturnType<typeof createServer> & {
  readonly ready: Promise<void>;
};

const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3002',
  'http://localhost:3002',
  'http://127.0.0.1:3102',
  'http://localhost:3102',
  'http://127.0.0.1:3112',
  'http://localhost:3112',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:5173'
] as const;
const DEFAULT_CORS_ALLOW_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const DEFAULT_CORS_ALLOW_HEADERS =
  'accept, authorization, content-type, x-correlation-id, x-request-id';
const DEFAULT_CORS_EXPOSE_HEADERS =
  'x-correlation-id, x-request-id, x-trace-id, traceparent, tracestate';
const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const OIDC_STATE_TTL_MS = 10 * 60 * 1000;

function registerChaosExperimentOnce(chaos: ChaosEngine, experiment: { id: string }): void {
  const alreadyRegistered = chaos.listExperiments().some((item) => item.id === experiment.id);
  if (!alreadyRegistered) {
    chaos.register(experiment as never);
  }
}

function isProductionLikeEnvironment(environment: string): boolean {
  return (
    environment === 'production'
    || environment === 'staging'
    || environment === 'prod'
    || environment === 'stage'
  );
}

function isSecureRequest(request: IncomingMessage): boolean {
  if ((request.socket as { encrypted?: boolean }).encrypted) {
    return true;
  }

  const forwardedProto = request.headers['x-forwarded-proto'];
  const headerValue = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return headerValue?.split(',')[0].trim().toLowerCase() === 'https';
}

function appendVaryHeader(response: ServerResponse, headerName: string): void {
  const current = response.getHeader('vary');
  const values = new Set<string>();
  const rawValues = Array.isArray(current)
    ? current
    : typeof current === 'string'
      ? current.split(',')
      : [];

  for (const value of rawValues) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      values.add(trimmed);
    }
  }

  values.add(headerName);
  response.setHeader('vary', Array.from(values).join(', '));
}

function normalizeRequestOrigin(request: IncomingMessage): string | undefined {
  const originHeader = request.headers.origin;
  const rawOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (!rawOrigin) {
    return undefined;
  }

  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    return parsed.origin;
  } catch {
    return undefined;
  }
}

function applySecurityHeaders(
  request: IncomingMessage,
  response: ServerResponse,
  environment: string
): void {
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('x-xss-protection', '0');
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  response.setHeader('x-permitted-cross-domain-policies', 'none');
  response.setHeader('cross-origin-opener-policy', 'same-origin');
  response.setHeader('cross-origin-resource-policy', 'same-origin');
  response.setHeader(
    'permissions-policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  response.setHeader('cache-control', 'no-store, no-cache, must-revalidate');
  response.setHeader(
    'content-security-policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );

  if (isProductionLikeEnvironment(environment) && isSecureRequest(request)) {
    response.setHeader(
      'strict-transport-security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

function applyCorsPolicy(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: readonly string[]
): { allowed: boolean; message?: string } {
  appendVaryHeader(response, 'Origin');
  appendVaryHeader(response, 'Access-Control-Request-Headers');
  response.setHeader('access-control-allow-headers', DEFAULT_CORS_ALLOW_HEADERS);
  response.setHeader('access-control-allow-methods', DEFAULT_CORS_ALLOW_METHODS);
  response.setHeader('access-control-expose-headers', DEFAULT_CORS_EXPOSE_HEADERS);
  response.setHeader('access-control-max-age', '600');

  const originHeader = request.headers.origin;
  if (!originHeader) {
    return { allowed: true };
  }

  const normalizedOrigin = normalizeRequestOrigin(request);
  if (!normalizedOrigin) {
    return {
      allowed: false,
      message: 'Origin header is invalid. Only http(s) origins are accepted.'
    };
  }

  if (!allowedOrigins.includes(normalizedOrigin)) {
    return {
      allowed: false,
      message: `Origin ${normalizedOrigin} is not allowed by CORS policy.`
    };
  }

  response.setHeader('access-control-allow-origin', normalizedOrigin);
  return { allowed: true };
}

type ResponsibilityTermUsageContext =
  | 'atendimento'
  | 'internacao'
  | 'procedimento'
  | 'autorizacao'
  | 'outro';

interface ResponsibilityTermSummary {
  readonly id: string;
  readonly accountId: string;
  readonly title: string;
  readonly code: string | null;
  readonly usageContext: ResponsibilityTermUsageContext;
  readonly content: string;
  readonly active: boolean;
  readonly requiresOwnerSignature: boolean;
  readonly requiresWitnessSignature: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ResponsibilityTermInput {
  readonly title?: string;
  readonly code?: string | null;
  readonly usageContext?: ResponsibilityTermUsageContext;
  readonly content?: string;
  readonly active?: boolean;
  readonly requiresOwnerSignature?: boolean;
  readonly requiresWitnessSignature?: boolean;
}

interface ResponsibilityTermListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly usageContext?: string;
}

interface ResponsibilityTermStore {
  create(accountId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary>;
  update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary>;
  getOrThrow(termId: string): Promise<ResponsibilityTermSummary>;
  list(accountId: string, filters: ResponsibilityTermListFilters): Promise<ResponsibilityTermSummary[]>;
  delete(termId: string): Promise<void>;
}

const responsibilityTermUsageContexts = new Set<ResponsibilityTermUsageContext>([
  'atendimento',
  'internacao',
  'procedimento',
  'autorizacao',
  'outro'
]);
const responsibilityTermMaxTitleLength = 160;
const responsibilityTermMaxCodeLength = 80;
const responsibilityTermMaxContentLength = 20000;

function normalizeResponsibilityTermUsageContext(
  value: ResponsibilityTermUsageContext | undefined
): ResponsibilityTermUsageContext {
  if (!value) return 'atendimento';
  if (!responsibilityTermUsageContexts.has(value)) {
    throw new ValidationError('usageContext is invalid');
  }
  return value;
}

function normalizeResponsibilityTermTitle(value: string | undefined): string {
  const title = requireNonEmptyString(value, 'title').trim();
  if (title.length > responsibilityTermMaxTitleLength) {
    throw new ValidationError(`title must have at most ${responsibilityTermMaxTitleLength} characters`);
  }
  return title;
}

function normalizeResponsibilityTermCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > responsibilityTermMaxCodeLength) {
    throw new ValidationError(`code must have at most ${responsibilityTermMaxCodeLength} characters`);
  }
  return code;
}

function normalizeResponsibilityTermContent(value: string | undefined): string {
  const content = requireNonEmptyString(value, 'content').trim();
  if (content.length > responsibilityTermMaxContentLength) {
    throw new ValidationError(`content must have at most ${responsibilityTermMaxContentLength} characters`);
  }
  return content;
}

function mapResponsibilityTermRow(row: Record<string, unknown>): ResponsibilityTermSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    title: row.title as string,
    code: (row.code as string | null) ?? null,
    usageContext: row.usage_context as ResponsibilityTermUsageContext,
    content: row.content as string,
    active: row.active as boolean,
    requiresOwnerSignature: row.requires_owner_signature as boolean,
    requiresWitnessSignature: row.requires_witness_signature as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryResponsibilityTermStore implements ResponsibilityTermStore {
  readonly #terms = new Map<string, ResponsibilityTermSummary>();

  async create(
    accountId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const now = new Date().toISOString();
    const term: ResponsibilityTermSummary = {
      id: createCorrelationId('term'),
      accountId,
      title: normalizeResponsibilityTermTitle(input.title),
      code: normalizeResponsibilityTermCode(input.code),
      usageContext: normalizeResponsibilityTermUsageContext(input.usageContext),
      content: normalizeResponsibilityTermContent(input.content),
      active: input.active ?? true,
      requiresOwnerSignature: input.requiresOwnerSignature ?? true,
      requiresWitnessSignature: input.requiresWitnessSignature ?? false,
      createdAt: now,
      updatedAt: now
    };

    this.#terms.set(term.id, term);
    return term;
  }

  async update(
    termId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const existing = await this.getOrThrow(termId);
    const updated: ResponsibilityTermSummary = {
      ...existing,
      title: input.title !== undefined ? normalizeResponsibilityTermTitle(input.title) : existing.title,
      code: input.code !== undefined ? normalizeResponsibilityTermCode(input.code) : existing.code,
      usageContext:
        input.usageContext !== undefined
          ? normalizeResponsibilityTermUsageContext(input.usageContext)
          : existing.usageContext,
      content:
        input.content !== undefined
          ? normalizeResponsibilityTermContent(input.content)
          : existing.content,
      active: input.active ?? existing.active,
      requiresOwnerSignature: input.requiresOwnerSignature ?? existing.requiresOwnerSignature,
      requiresWitnessSignature: input.requiresWitnessSignature ?? existing.requiresWitnessSignature,
      updatedAt: new Date().toISOString()
    };

    this.#terms.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(termId: string): Promise<ResponsibilityTermSummary> {
    const term = this.#terms.get(termId);
    if (!term) {
      throw new NotFoundError('Responsibility term not found', { termId });
    }
    return term;
  }

  async list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]> {
    let items = Array.from(this.#terms.values()).filter((term) => term.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((term) => term.active === filters.active);
    }

    if (
      filters.usageContext &&
      responsibilityTermUsageContexts.has(filters.usageContext as ResponsibilityTermUsageContext)
    ) {
      items = items.filter((term) => term.usageContext === filters.usageContext);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (term) =>
          term.title.toLowerCase().includes(search) ||
          (term.code?.toLowerCase().includes(search) ?? false) ||
          term.content.toLowerCase().includes(search)
      );
    }

    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  async delete(termId: string): Promise<void> {
    this.#terms.delete(termId);
  }
}

class DatabaseResponsibilityTermStore implements ResponsibilityTermStore {
  async create(
    accountId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const now = new Date();
    const term: ResponsibilityTermSummary = {
      id: createCorrelationId('term'),
      accountId,
      title: normalizeResponsibilityTermTitle(input.title),
      code: normalizeResponsibilityTermCode(input.code),
      usageContext: normalizeResponsibilityTermUsageContext(input.usageContext),
      content: normalizeResponsibilityTermContent(input.content),
      active: input.active ?? true,
      requiresOwnerSignature: input.requiresOwnerSignature ?? true,
      requiresWitnessSignature: input.requiresWitnessSignature ?? false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO responsibility_terms (
           id,
           account_id,
           title,
           code,
           usage_context,
           content,
           active,
           requires_owner_signature,
           requires_witness_signature,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          term.id,
          term.accountId,
          term.title,
          term.code,
          term.usageContext,
          term.content,
          term.active,
          term.requiresOwnerSignature,
          term.requiresWitnessSignature,
          new Date(term.createdAt),
          new Date(term.updatedAt)
        ]
      );
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async update(
    termId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const existing = await this.getOrThrow(termId);
    const updated: ResponsibilityTermSummary = {
      ...existing,
      title: input.title !== undefined ? normalizeResponsibilityTermTitle(input.title) : existing.title,
      code: input.code !== undefined ? normalizeResponsibilityTermCode(input.code) : existing.code,
      usageContext:
        input.usageContext !== undefined
          ? normalizeResponsibilityTermUsageContext(input.usageContext)
          : existing.usageContext,
      content:
        input.content !== undefined
          ? normalizeResponsibilityTermContent(input.content)
          : existing.content,
      active: input.active ?? existing.active,
      requiresOwnerSignature: input.requiresOwnerSignature ?? existing.requiresOwnerSignature,
      requiresWitnessSignature: input.requiresWitnessSignature ?? existing.requiresWitnessSignature,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE responsibility_terms
         SET title = $2,
             code = $3,
             usage_context = $4,
             content = $5,
             active = $6,
             requires_owner_signature = $7,
             requires_witness_signature = $8,
             updated_at = $9
         WHERE id = $1
         RETURNING *`,
        [
          termId,
          updated.title,
          updated.code,
          updated.usageContext,
          updated.content,
          updated.active,
          updated.requiresOwnerSignature,
          updated.requiresWitnessSignature,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Responsibility term not found', { termId });
      }
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async getOrThrow(termId: string): Promise<ResponsibilityTermSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM responsibility_terms WHERE id = $1', [termId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Responsibility term not found', { termId });
      }
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM responsibility_terms WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (
        filters.usageContext &&
        responsibilityTermUsageContexts.has(filters.usageContext as ResponsibilityTermUsageContext)
      ) {
        sql += ` AND usage_context = $${nextParam}`;
        params.push(filters.usageContext);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (title ILIKE $${nextParam} OR code ILIKE $${nextParam} OR content ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY title ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapResponsibilityTermRow(row));
    });
  }

  async delete(termId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM responsibility_terms WHERE id = $1', [termId]);
    });
  }
}

function createResponsibilityTermStore(): ResponsibilityTermStore {
  try {
    getPool();
    return new DatabaseResponsibilityTermStore();
  } catch {
    return new InMemoryResponsibilityTermStore();
  }
}

type BreedSpecies = 'canine' | 'feline' | 'avian' | 'rodent' | 'reptile' | 'other';

interface BreedSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly species: BreedSpecies;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface BreedInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly species?: BreedSpecies;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface BreedListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly species?: string;
}

interface BreedStore {
  create(accountId: string, input: BreedInput): Promise<BreedSummary>;
  update(breedId: string, input: BreedInput): Promise<BreedSummary>;
  getOrThrow(breedId: string): Promise<BreedSummary>;
  list(accountId: string, filters: BreedListFilters): Promise<BreedSummary[]>;
  delete(breedId: string): Promise<void>;
}

const breedSpeciesValues = new Set<BreedSpecies>([
  'canine',
  'feline',
  'avian',
  'rodent',
  'reptile',
  'other'
]);
const breedMaxNameLength = 160;
const breedMaxCodeLength = 80;
const breedMaxDescriptionLength = 1000;

function normalizeBreedSpecies(value: BreedSpecies | undefined): BreedSpecies {
  if (!value) return 'canine';
  if (!breedSpeciesValues.has(value)) {
    throw new ValidationError('species is invalid');
  }
  return value;
}

function normalizeBreedName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > breedMaxNameLength) {
    throw new ValidationError(`name must have at most ${breedMaxNameLength} characters`);
  }
  return name;
}

function normalizeBreedCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > breedMaxCodeLength) {
    throw new ValidationError(`code must have at most ${breedMaxCodeLength} characters`);
  }
  return code;
}

function normalizeBreedDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > breedMaxDescriptionLength) {
    throw new ValidationError(`description must have at most ${breedMaxDescriptionLength} characters`);
  }
  return description;
}

function mapBreedRow(row: Record<string, unknown>): BreedSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    species: row.species as BreedSpecies,
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryBreedStore implements BreedStore {
  readonly #breeds = new Map<string, BreedSummary>();

  async create(accountId: string, input: BreedInput): Promise<BreedSummary> {
    const now = new Date().toISOString();
    const breed: BreedSummary = {
      id: createCorrelationId('breed'),
      accountId,
      name: normalizeBreedName(input.name),
      code: normalizeBreedCode(input.code),
      species: normalizeBreedSpecies(input.species),
      description: normalizeBreedDescription(input.description),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#breeds.set(breed.id, breed);
    return breed;
  }

  async update(breedId: string, input: BreedInput): Promise<BreedSummary> {
    const existing = await this.getOrThrow(breedId);
    const updated: BreedSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeBreedName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeBreedCode(input.code) : existing.code,
      species: input.species !== undefined ? normalizeBreedSpecies(input.species) : existing.species,
      description:
        input.description !== undefined
          ? normalizeBreedDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    this.#breeds.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(breedId: string): Promise<BreedSummary> {
    const breed = this.#breeds.get(breedId);
    if (!breed) {
      throw new NotFoundError('Breed not found', { breedId });
    }
    return breed;
  }

  async list(accountId: string, filters: BreedListFilters): Promise<BreedSummary[]> {
    let items = Array.from(this.#breeds.values()).filter((breed) => breed.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((breed) => breed.active === filters.active);
    }

    if (filters.species && breedSpeciesValues.has(filters.species as BreedSpecies)) {
      items = items.filter((breed) => breed.species === filters.species);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (breed) =>
          breed.name.toLowerCase().includes(search) ||
          (breed.code?.toLowerCase().includes(search) ?? false) ||
          (breed.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(breedId: string): Promise<void> {
    this.#breeds.delete(breedId);
  }
}

class DatabaseBreedStore implements BreedStore {
  async create(accountId: string, input: BreedInput): Promise<BreedSummary> {
    const now = new Date();
    const breed: BreedSummary = {
      id: createCorrelationId('breed'),
      accountId,
      name: normalizeBreedName(input.name),
      code: normalizeBreedCode(input.code),
      species: normalizeBreedSpecies(input.species),
      description: normalizeBreedDescription(input.description),
      active: input.active ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO breeds (
           id,
           account_id,
           name,
           code,
           species,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          breed.id,
          breed.accountId,
          breed.name,
          breed.code,
          breed.species,
          breed.description,
          breed.active,
          new Date(breed.createdAt),
          new Date(breed.updatedAt)
        ]
      );
      return mapBreedRow(result.rows[0]);
    });
  }

  async update(breedId: string, input: BreedInput): Promise<BreedSummary> {
    const existing = await this.getOrThrow(breedId);
    const updated: BreedSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeBreedName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeBreedCode(input.code) : existing.code,
      species: input.species !== undefined ? normalizeBreedSpecies(input.species) : existing.species,
      description:
        input.description !== undefined
          ? normalizeBreedDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE breeds
         SET name = $2,
             code = $3,
             species = $4,
             description = $5,
             active = $6,
             updated_at = $7
         WHERE id = $1
         RETURNING *`,
        [
          breedId,
          updated.name,
          updated.code,
          updated.species,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Breed not found', { breedId });
      }
      return mapBreedRow(result.rows[0]);
    });
  }

  async getOrThrow(breedId: string): Promise<BreedSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM breeds WHERE id = $1', [breedId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Breed not found', { breedId });
      }
      return mapBreedRow(result.rows[0]);
    });
  }

  async list(accountId: string, filters: BreedListFilters): Promise<BreedSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM breeds WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.species && breedSpeciesValues.has(filters.species as BreedSpecies)) {
        sql += ` AND species = $${nextParam}`;
        params.push(filters.species);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapBreedRow(row));
    });
  }

  async delete(breedId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM breeds WHERE id = $1', [breedId]);
    });
  }
}

function createBreedStore(): BreedStore {
  try {
    getPool();
    return new DatabaseBreedStore();
  } catch {
    return new InMemoryBreedStore();
  }
}

type AnimalSpeciesSystemCode = 'canine' | 'feline' | 'avian' | 'rodent' | 'reptile' | 'other';

interface AnimalSpeciesSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly systemCode: AnimalSpeciesSystemCode;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface AnimalSpeciesInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly systemCode?: AnimalSpeciesSystemCode;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface AnimalSpeciesListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly systemCode?: string;
}

interface AnimalSpeciesStore {
  create(accountId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary>;
  update(speciesId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary>;
  getOrThrow(speciesId: string): Promise<AnimalSpeciesSummary>;
  list(accountId: string, filters: AnimalSpeciesListFilters): Promise<AnimalSpeciesSummary[]>;
  delete(speciesId: string): Promise<void>;
}

const animalSpeciesSystemCodes = new Set<AnimalSpeciesSystemCode>([
  'canine',
  'feline',
  'avian',
  'rodent',
  'reptile',
  'other'
]);
const animalSpeciesMaxNameLength = 160;
const animalSpeciesMaxCodeLength = 80;
const animalSpeciesMaxDescriptionLength = 1000;

function normalizeAnimalSpeciesSystemCode(
  value: AnimalSpeciesSystemCode | undefined
): AnimalSpeciesSystemCode {
  if (!value) return 'other';
  if (!animalSpeciesSystemCodes.has(value)) {
    throw new ValidationError('systemCode is invalid');
  }
  return value;
}

function normalizeAnimalSpeciesName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > animalSpeciesMaxNameLength) {
    throw new ValidationError(`name must have at most ${animalSpeciesMaxNameLength} characters`);
  }
  return name;
}

function normalizeAnimalSpeciesCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > animalSpeciesMaxCodeLength) {
    throw new ValidationError(`code must have at most ${animalSpeciesMaxCodeLength} characters`);
  }
  return code;
}

function normalizeAnimalSpeciesDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > animalSpeciesMaxDescriptionLength) {
    throw new ValidationError(`description must have at most ${animalSpeciesMaxDescriptionLength} characters`);
  }
  return description;
}

function mapAnimalSpeciesRow(row: Record<string, unknown>): AnimalSpeciesSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    systemCode: row.system_code as AnimalSpeciesSystemCode,
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryAnimalSpeciesStore implements AnimalSpeciesStore {
  readonly #species = new Map<string, AnimalSpeciesSummary>();

  async create(accountId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary> {
    const now = new Date().toISOString();
    const species: AnimalSpeciesSummary = {
      id: createCorrelationId('species'),
      accountId,
      name: normalizeAnimalSpeciesName(input.name),
      code: normalizeAnimalSpeciesCode(input.code),
      systemCode: normalizeAnimalSpeciesSystemCode(input.systemCode),
      description: normalizeAnimalSpeciesDescription(input.description),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#species.set(species.id, species);
    return species;
  }

  async update(
    speciesId: string,
    input: AnimalSpeciesInput
  ): Promise<AnimalSpeciesSummary> {
    const existing = await this.getOrThrow(speciesId);
    const updated: AnimalSpeciesSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeAnimalSpeciesName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeAnimalSpeciesCode(input.code) : existing.code,
      systemCode:
        input.systemCode !== undefined
          ? normalizeAnimalSpeciesSystemCode(input.systemCode)
          : existing.systemCode,
      description:
        input.description !== undefined
          ? normalizeAnimalSpeciesDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    this.#species.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(speciesId: string): Promise<AnimalSpeciesSummary> {
    const species = this.#species.get(speciesId);
    if (!species) {
      throw new NotFoundError('Animal species not found', { speciesId });
    }
    return species;
  }

  async list(
    accountId: string,
    filters: AnimalSpeciesListFilters
  ): Promise<AnimalSpeciesSummary[]> {
    let items = Array.from(this.#species.values()).filter((species) => species.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((species) => species.active === filters.active);
    }

    if (filters.systemCode && animalSpeciesSystemCodes.has(filters.systemCode as AnimalSpeciesSystemCode)) {
      items = items.filter((species) => species.systemCode === filters.systemCode);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (species) =>
          species.name.toLowerCase().includes(search) ||
          (species.code?.toLowerCase().includes(search) ?? false) ||
          species.systemCode.toLowerCase().includes(search) ||
          (species.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(speciesId: string): Promise<void> {
    this.#species.delete(speciesId);
  }
}

class DatabaseAnimalSpeciesStore implements AnimalSpeciesStore {
  async create(accountId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary> {
    const now = new Date();
    const species: AnimalSpeciesSummary = {
      id: createCorrelationId('species'),
      accountId,
      name: normalizeAnimalSpeciesName(input.name),
      code: normalizeAnimalSpeciesCode(input.code),
      systemCode: normalizeAnimalSpeciesSystemCode(input.systemCode),
      description: normalizeAnimalSpeciesDescription(input.description),
      active: input.active ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO animal_species (
           id,
           account_id,
           name,
           code,
           system_code,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          species.id,
          species.accountId,
          species.name,
          species.code,
          species.systemCode,
          species.description,
          species.active,
          new Date(species.createdAt),
          new Date(species.updatedAt)
        ]
      );
      return mapAnimalSpeciesRow(result.rows[0]);
    });
  }

  async update(
    speciesId: string,
    input: AnimalSpeciesInput
  ): Promise<AnimalSpeciesSummary> {
    const existing = await this.getOrThrow(speciesId);
    const updated: AnimalSpeciesSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeAnimalSpeciesName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeAnimalSpeciesCode(input.code) : existing.code,
      systemCode:
        input.systemCode !== undefined
          ? normalizeAnimalSpeciesSystemCode(input.systemCode)
          : existing.systemCode,
      description:
        input.description !== undefined
          ? normalizeAnimalSpeciesDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE animal_species
         SET name = $2,
             code = $3,
             system_code = $4,
             description = $5,
             active = $6,
             updated_at = $7
         WHERE id = $1
         RETURNING *`,
        [
          speciesId,
          updated.name,
          updated.code,
          updated.systemCode,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Animal species not found', { speciesId });
      }
      return mapAnimalSpeciesRow(result.rows[0]);
    });
  }

  async getOrThrow(speciesId: string): Promise<AnimalSpeciesSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM animal_species WHERE id = $1', [speciesId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Animal species not found', { speciesId });
      }
      return mapAnimalSpeciesRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: AnimalSpeciesListFilters
  ): Promise<AnimalSpeciesSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM animal_species WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.systemCode && animalSpeciesSystemCodes.has(filters.systemCode as AnimalSpeciesSystemCode)) {
        sql += ` AND system_code = $${nextParam}`;
        params.push(filters.systemCode);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR system_code ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapAnimalSpeciesRow(row));
    });
  }

  async delete(speciesId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM animal_species WHERE id = $1', [speciesId]);
    });
  }
}

function createAnimalSpeciesStore(): AnimalSpeciesStore {
  try {
    getPool();
    return new DatabaseAnimalSpeciesStore();
  } catch {
    return new InMemoryAnimalSpeciesStore();
  }
}

interface CoatColorSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly colorGroup: string | null;
  readonly hexColor: string | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CoatColorInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly colorGroup?: string | null;
  readonly hexColor?: string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface CoatColorListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly colorGroup?: string;
}

interface CoatColorStore {
  create(accountId: string, input: CoatColorInput): Promise<CoatColorSummary>;
  update(coatColorId: string, input: CoatColorInput): Promise<CoatColorSummary>;
  getOrThrow(coatColorId: string): Promise<CoatColorSummary>;
  list(accountId: string, filters: CoatColorListFilters): Promise<CoatColorSummary[]>;
  delete(coatColorId: string): Promise<void>;
}

const coatColorMaxNameLength = 160;
const coatColorMaxCodeLength = 80;
const coatColorMaxGroupLength = 80;
const coatColorMaxDescriptionLength = 1000;
const coatColorHexPattern = /^#[0-9A-Fa-f]{6}$/;

function normalizeCoatColorName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > coatColorMaxNameLength) {
    throw new ValidationError(`name must have at most ${coatColorMaxNameLength} characters`);
  }
  return name;
}

function normalizeCoatColorCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > coatColorMaxCodeLength) {
    throw new ValidationError(`code must have at most ${coatColorMaxCodeLength} characters`);
  }
  return code;
}

function normalizeCoatColorGroup(value: string | null | undefined): string | null {
  const colorGroup = value?.trim() || null;
  if (colorGroup && colorGroup.length > coatColorMaxGroupLength) {
    throw new ValidationError(`colorGroup must have at most ${coatColorMaxGroupLength} characters`);
  }
  return colorGroup;
}

function normalizeCoatColorHex(value: string | null | undefined): string | null {
  const hexColor = value?.trim() || null;
  if (hexColor && !coatColorHexPattern.test(hexColor)) {
    throw new ValidationError('hexColor must be a valid #RRGGBB value');
  }
  return hexColor;
}

function normalizeCoatColorDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > coatColorMaxDescriptionLength) {
    throw new ValidationError(`description must have at most ${coatColorMaxDescriptionLength} characters`);
  }
  return description;
}

function mapCoatColorRow(row: Record<string, unknown>): CoatColorSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    colorGroup: (row.color_group as string | null) ?? null,
    hexColor: (row.hex_color as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryCoatColorStore implements CoatColorStore {
  readonly #coatColors = new Map<string, CoatColorSummary>();

  async create(accountId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const now = new Date().toISOString();
    const coatColor: CoatColorSummary = {
      id: createCorrelationId('coat-color'),
      accountId,
      name: normalizeCoatColorName(input.name),
      code: normalizeCoatColorCode(input.code),
      colorGroup: normalizeCoatColorGroup(input.colorGroup),
      hexColor: normalizeCoatColorHex(input.hexColor),
      description: normalizeCoatColorDescription(input.description),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#coatColors.set(coatColor.id, coatColor);
    return coatColor;
  }

  async update(coatColorId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const existing = await this.getOrThrow(coatColorId);
    const updated: CoatColorSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCoatColorName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCoatColorCode(input.code) : existing.code,
      colorGroup:
        input.colorGroup !== undefined
          ? normalizeCoatColorGroup(input.colorGroup)
          : existing.colorGroup,
      hexColor:
        input.hexColor !== undefined ? normalizeCoatColorHex(input.hexColor) : existing.hexColor,
      description:
        input.description !== undefined
          ? normalizeCoatColorDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    this.#coatColors.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(coatColorId: string): Promise<CoatColorSummary> {
    const coatColor = this.#coatColors.get(coatColorId);
    if (!coatColor) {
      throw new NotFoundError('Coat color not found', { coatColorId });
    }
    return coatColor;
  }

  async list(accountId: string, filters: CoatColorListFilters): Promise<CoatColorSummary[]> {
    let items = Array.from(this.#coatColors.values()).filter((coatColor) => coatColor.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((coatColor) => coatColor.active === filters.active);
    }

    if (filters.colorGroup) {
      const colorGroup = filters.colorGroup.toLowerCase();
      items = items.filter((coatColor) => coatColor.colorGroup?.toLowerCase() === colorGroup);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (coatColor) =>
          coatColor.name.toLowerCase().includes(search) ||
          (coatColor.code?.toLowerCase().includes(search) ?? false) ||
          (coatColor.colorGroup?.toLowerCase().includes(search) ?? false) ||
          (coatColor.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(coatColorId: string): Promise<void> {
    this.#coatColors.delete(coatColorId);
  }
}

class DatabaseCoatColorStore implements CoatColorStore {
  async create(accountId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const now = new Date();
    const coatColor: CoatColorSummary = {
      id: createCorrelationId('coat-color'),
      accountId,
      name: normalizeCoatColorName(input.name),
      code: normalizeCoatColorCode(input.code),
      colorGroup: normalizeCoatColorGroup(input.colorGroup),
      hexColor: normalizeCoatColorHex(input.hexColor),
      description: normalizeCoatColorDescription(input.description),
      active: input.active ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO coat_colors (
           id,
           account_id,
           name,
           code,
           color_group,
           hex_color,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          coatColor.id,
          coatColor.accountId,
          coatColor.name,
          coatColor.code,
          coatColor.colorGroup,
          coatColor.hexColor,
          coatColor.description,
          coatColor.active,
          new Date(coatColor.createdAt),
          new Date(coatColor.updatedAt)
        ]
      );
      return mapCoatColorRow(result.rows[0]);
    });
  }

  async update(coatColorId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const existing = await this.getOrThrow(coatColorId);
    const updated: CoatColorSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCoatColorName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCoatColorCode(input.code) : existing.code,
      colorGroup:
        input.colorGroup !== undefined
          ? normalizeCoatColorGroup(input.colorGroup)
          : existing.colorGroup,
      hexColor:
        input.hexColor !== undefined ? normalizeCoatColorHex(input.hexColor) : existing.hexColor,
      description:
        input.description !== undefined
          ? normalizeCoatColorDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE coat_colors
         SET name = $2,
             code = $3,
             color_group = $4,
             hex_color = $5,
             description = $6,
             active = $7,
             updated_at = $8
         WHERE id = $1
         RETURNING *`,
        [
          coatColorId,
          updated.name,
          updated.code,
          updated.colorGroup,
          updated.hexColor,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Coat color not found', { coatColorId });
      }
      return mapCoatColorRow(result.rows[0]);
    });
  }

  async getOrThrow(coatColorId: string): Promise<CoatColorSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM coat_colors WHERE id = $1', [coatColorId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Coat color not found', { coatColorId });
      }
      return mapCoatColorRow(result.rows[0]);
    });
  }

  async list(accountId: string, filters: CoatColorListFilters): Promise<CoatColorSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM coat_colors WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.colorGroup) {
        sql += ` AND color_group ILIKE $${nextParam}`;
        params.push(filters.colorGroup);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR color_group ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapCoatColorRow(row));
    });
  }

  async delete(coatColorId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM coat_colors WHERE id = $1', [coatColorId]);
    });
  }
}

function createCoatColorStore(): CoatColorStore {
  try {
    getPool();
    return new DatabaseCoatColorStore();
  } catch {
    return new InMemoryCoatColorStore();
  }
}

interface CustomerGroupSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly segment: string | null;
  readonly discountPercent: number;
  readonly paymentTermDays: number;
  readonly creditLimitAmount: number | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CustomerGroupInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly segment?: string | null;
  readonly discountPercent?: number | string | null;
  readonly paymentTermDays?: number | string | null;
  readonly creditLimitAmount?: number | string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface CustomerGroupListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly segment?: string;
}

interface CustomerGroupStore {
  create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary>;
  update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary>;
  getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary>;
  list(accountId: string, filters: CustomerGroupListFilters): Promise<CustomerGroupSummary[]>;
  delete(customerGroupId: string): Promise<void>;
}

const customerGroupMaxNameLength = 160;
const customerGroupMaxCodeLength = 80;
const customerGroupMaxSegmentLength = 80;
const customerGroupMaxDescriptionLength = 1000;

function normalizeCustomerGroupName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > customerGroupMaxNameLength) {
    throw new ValidationError(`name must have at most ${customerGroupMaxNameLength} characters`);
  }
  return name;
}

function normalizeCustomerGroupCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > customerGroupMaxCodeLength) {
    throw new ValidationError(`code must have at most ${customerGroupMaxCodeLength} characters`);
  }
  return code;
}

function normalizeCustomerGroupSegment(value: string | null | undefined): string | null {
  const segment = value?.trim() || null;
  if (segment && segment.length > customerGroupMaxSegmentLength) {
    throw new ValidationError(`segment must have at most ${customerGroupMaxSegmentLength} characters`);
  }
  return segment;
}

function normalizeCustomerGroupDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > customerGroupMaxDescriptionLength) {
    throw new ValidationError(`description must have at most ${customerGroupMaxDescriptionLength} characters`);
  }
  return description;
}

function normalizeCustomerGroupNumber(
  value: number | string | null | undefined,
  field: string,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return Number(numberValue.toFixed(2));
}

function normalizeCustomerGroupCreditLimit(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new ValidationError('creditLimitAmount must be greater than or equal to 0');
  }
  return Number(numberValue.toFixed(2));
}

function mapCustomerGroupRow(row: Record<string, unknown>): CustomerGroupSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    segment: (row.segment as string | null) ?? null,
    discountPercent: Number(row.discount_percent ?? 0),
    paymentTermDays: Number(row.payment_term_days ?? 0),
    creditLimitAmount: row.credit_limit_amount === null ? null : Number(row.credit_limit_amount),
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function createCustomerGroupSummary(accountId: string, input: CustomerGroupInput): CustomerGroupSummary {
  const now = new Date().toISOString();
  return {
    id: createCorrelationId('customer-group'),
    accountId,
    name: normalizeCustomerGroupName(input.name),
    code: normalizeCustomerGroupCode(input.code),
    segment: normalizeCustomerGroupSegment(input.segment),
    discountPercent: normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0),
    paymentTermDays: Math.round(
      normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
    ),
    creditLimitAmount: normalizeCustomerGroupCreditLimit(input.creditLimitAmount),
    description: normalizeCustomerGroupDescription(input.description),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now
  };
}

class InMemoryCustomerGroupStore implements CustomerGroupStore {
  readonly #customerGroups = new Map<string, CustomerGroupSummary>();

  async create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const customerGroup = createCustomerGroupSummary(accountId, input);
    this.#customerGroups.set(customerGroup.id, customerGroup);
    return customerGroup;
  }

  async update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const existing = await this.getOrThrow(customerGroupId);
    const updated: CustomerGroupSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCustomerGroupName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCustomerGroupCode(input.code) : existing.code,
      segment:
        input.segment !== undefined
          ? normalizeCustomerGroupSegment(input.segment)
          : existing.segment,
      discountPercent:
        input.discountPercent !== undefined
          ? normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0)
          : existing.discountPercent,
      paymentTermDays:
        input.paymentTermDays !== undefined
          ? Math.round(normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0))
          : existing.paymentTermDays,
      creditLimitAmount:
        input.creditLimitAmount !== undefined
          ? normalizeCustomerGroupCreditLimit(input.creditLimitAmount)
          : existing.creditLimitAmount,
      description:
        input.description !== undefined
          ? normalizeCustomerGroupDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };
    this.#customerGroups.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary> {
    const customerGroup = this.#customerGroups.get(customerGroupId);
    if (!customerGroup) {
      throw new NotFoundError('Customer group not found', { customerGroupId });
    }
    return customerGroup;
  }

  async list(accountId: string, filters: CustomerGroupListFilters): Promise<CustomerGroupSummary[]> {
    let items = Array.from(this.#customerGroups.values()).filter((customerGroup) => customerGroup.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((customerGroup) => customerGroup.active === filters.active);
    }
    if (filters.segment) {
      const segment = filters.segment.toLowerCase();
      items = items.filter((customerGroup) => customerGroup.segment?.toLowerCase() === segment);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (customerGroup) =>
          customerGroup.name.toLowerCase().includes(search) ||
          (customerGroup.code?.toLowerCase().includes(search) ?? false) ||
          (customerGroup.segment?.toLowerCase().includes(search) ?? false) ||
          (customerGroup.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(customerGroupId: string): Promise<void> {
    this.#customerGroups.delete(customerGroupId);
  }
}

class DatabaseCustomerGroupStore implements CustomerGroupStore {
  async create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const customerGroup = createCustomerGroupSummary(accountId, input);
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO customer_groups (
           id,
           account_id,
           name,
           code,
           segment,
           discount_percent,
           payment_term_days,
           credit_limit_amount,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          customerGroup.id,
          customerGroup.accountId,
          customerGroup.name,
          customerGroup.code,
          customerGroup.segment,
          customerGroup.discountPercent,
          customerGroup.paymentTermDays,
          customerGroup.creditLimitAmount,
          customerGroup.description,
          customerGroup.active,
          new Date(customerGroup.createdAt),
          new Date(customerGroup.updatedAt)
        ]
      );
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const existing = await this.getOrThrow(customerGroupId);
    const updated: CustomerGroupSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCustomerGroupName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCustomerGroupCode(input.code) : existing.code,
      segment:
        input.segment !== undefined
          ? normalizeCustomerGroupSegment(input.segment)
          : existing.segment,
      discountPercent:
        input.discountPercent !== undefined
          ? normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0)
          : existing.discountPercent,
      paymentTermDays:
        input.paymentTermDays !== undefined
          ? Math.round(normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0))
          : existing.paymentTermDays,
      creditLimitAmount:
        input.creditLimitAmount !== undefined
          ? normalizeCustomerGroupCreditLimit(input.creditLimitAmount)
          : existing.creditLimitAmount,
      description:
        input.description !== undefined
          ? normalizeCustomerGroupDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE customer_groups
         SET name = $2,
             code = $3,
             segment = $4,
             discount_percent = $5,
             payment_term_days = $6,
             credit_limit_amount = $7,
             description = $8,
             active = $9,
             updated_at = $10
         WHERE id = $1
         RETURNING *`,
        [
          customerGroupId,
          updated.name,
          updated.code,
          updated.segment,
          updated.discountPercent,
          updated.paymentTermDays,
          updated.creditLimitAmount,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Customer group not found', { customerGroupId });
      }
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM customer_groups WHERE id = $1', [customerGroupId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Customer group not found', { customerGroupId });
      }
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async list(accountId: string, filters: CustomerGroupListFilters): Promise<CustomerGroupSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM customer_groups WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.segment) {
        sql += ` AND segment ILIKE $${nextParam}`;
        params.push(filters.segment);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR segment ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapCustomerGroupRow(row));
    });
  }

  async delete(customerGroupId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM customer_groups WHERE id = $1', [customerGroupId]);
    });
  }
}

function createCustomerGroupStore(): CustomerGroupStore {
  try {
    getPool();
    return new DatabaseCustomerGroupStore();
  } catch {
    return new InMemoryCustomerGroupStore();
  }
}

type PreventiveItemType = 'vaccine' | 'dewormer' | 'other';
type PreventiveEventStatus = 'scheduled' | 'executed';

interface PreventiveEventSummary {
  readonly id: string;
  readonly accountId: string;
  readonly clientName: string;
  readonly animalName: string;
  readonly eventDate: string;
  readonly itemType: PreventiveItemType;
  readonly description: string;
  readonly status: PreventiveEventStatus;
  readonly observation: string | null;
  readonly executedAt: string | null;
  readonly executedObservation: string | null;
  readonly rescheduledFromId: string | null;
  readonly reminderEmailPreparedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface PreventiveEventInput {
  readonly clientName?: string;
  readonly animalName?: string;
  readonly eventDate?: string;
  readonly itemType?: PreventiveItemType;
  readonly description?: string;
  readonly observation?: string | null;
  readonly status?: PreventiveEventStatus;
}

interface PreventiveEventExecuteInput {
  readonly observation?: string | null;
  readonly rescheduleTo?: string | null;
}

interface PreventiveEventListFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly client?: string;
  readonly animal?: string;
  readonly includeExecuted?: boolean;
  readonly itemType?: string;
}

interface PreventiveEmailResult {
  readonly preparedCount: number;
  readonly preparedAt: string;
}

interface PreventiveEventStore {
  create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary>;
  update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary>;
  getOrThrow(eventId: string): Promise<PreventiveEventSummary>;
  list(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEventSummary[]>;
  delete(eventId: string): Promise<void>;
  execute(eventId: string, input: PreventiveEventExecuteInput): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }>;
  prepareEmail(eventId: string): Promise<PreventiveEventSummary>;
  prepareBulkEmail(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEmailResult>;
}

const preventiveItemTypes = new Set<PreventiveItemType>(['vaccine', 'dewormer', 'other']);
const preventiveStatuses = new Set<PreventiveEventStatus>(['scheduled', 'executed']);
const preventiveMaxNameLength = 160;
const preventiveMaxDescriptionLength = 255;
const preventiveMaxObservationLength = 1000;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizePreventiveText(value: string | undefined, field: string, maxLength: number): string {
  const text = requireNonEmptyString(value, field).trim();
  if (text.length > maxLength) {
    throw new ValidationError(`${field} must have at most ${maxLength} characters`);
  }
  return text;
}

function normalizePreventiveOptionalText(
  value: string | null | undefined,
  field: string,
  maxLength: number
): string | null {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) {
    throw new ValidationError(`${field} must have at most ${maxLength} characters`);
  }
  return text;
}

function normalizePreventiveDate(value: string | undefined, field: string): string {
  const date = requireNonEmptyString(value, field).trim();
  if (!isoDatePattern.test(date) || Number.isNaN(new Date(`${date}T12:00:00Z`).getTime())) {
    throw new ValidationError(`${field} must be a valid YYYY-MM-DD date`);
  }
  return date;
}

function normalizePreventiveOptionalDate(value: string | null | undefined, field: string): string | null {
  if (!value?.trim()) return null;
  return normalizePreventiveDate(value, field);
}

function normalizePreventiveItemType(value: PreventiveItemType | undefined): PreventiveItemType {
  if (!value) return 'vaccine';
  if (!preventiveItemTypes.has(value)) {
    throw new ValidationError('itemType is invalid');
  }
  return value;
}

function normalizePreventiveStatus(value: PreventiveEventStatus | undefined): PreventiveEventStatus {
  if (!value) return 'scheduled';
  if (!preventiveStatuses.has(value)) {
    throw new ValidationError('status is invalid');
  }
  return value;
}

function mapPreventiveDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapPreventiveTimestamp(value: unknown): string | null {
  if (!value) return null;
  return new Date(value as string | Date).toISOString();
}

function mapPreventiveEventRow(row: Record<string, unknown>): PreventiveEventSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    clientName: row.client_name as string,
    animalName: row.animal_name as string,
    eventDate: mapPreventiveDate(row.event_date),
    itemType: row.item_type as PreventiveItemType,
    description: row.description as string,
    status: row.status as PreventiveEventStatus,
    observation: (row.observation as string | null) ?? null,
    executedAt: mapPreventiveTimestamp(row.executed_at),
    executedObservation: (row.executed_observation as string | null) ?? null,
    rescheduledFromId: (row.rescheduled_from_id as string | null) ?? null,
    reminderEmailPreparedAt: mapPreventiveTimestamp(row.reminder_email_prepared_at),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function createPreventiveEventSummary(
  accountId: string,
  input: PreventiveEventInput,
  rescheduledFromId: string | null = null
): PreventiveEventSummary {
  const now = new Date().toISOString();
  return {
    id: createCorrelationId('preventive'),
    accountId,
    clientName: normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength),
    animalName: normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength),
    eventDate: normalizePreventiveDate(input.eventDate, 'eventDate'),
    itemType: normalizePreventiveItemType(input.itemType),
    description: normalizePreventiveText(input.description, 'description', preventiveMaxDescriptionLength),
    status: normalizePreventiveStatus(input.status),
    observation: normalizePreventiveOptionalText(input.observation, 'observation', preventiveMaxObservationLength),
    executedAt: null,
    executedObservation: null,
    rescheduledFromId,
    reminderEmailPreparedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

class InMemoryPreventiveEventStore implements PreventiveEventStore {
  readonly #events = new Map<string, PreventiveEventSummary>();

  async create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const event = createPreventiveEventSummary(accountId, input);
    this.#events.set(event.id, event);
    return event;
  }

  async update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      clientName:
        input.clientName !== undefined
          ? normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength)
          : existing.clientName,
      animalName:
        input.animalName !== undefined
          ? normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength)
          : existing.animalName,
      eventDate:
        input.eventDate !== undefined ? normalizePreventiveDate(input.eventDate, 'eventDate') : existing.eventDate,
      itemType: input.itemType !== undefined ? normalizePreventiveItemType(input.itemType) : existing.itemType,
      description:
        input.description !== undefined
          ? normalizePreventiveText(input.description, 'description', preventiveMaxDescriptionLength)
          : existing.description,
      status: input.status !== undefined ? normalizePreventiveStatus(input.status) : existing.status,
      observation:
        input.observation !== undefined
          ? normalizePreventiveOptionalText(input.observation, 'observation', preventiveMaxObservationLength)
          : existing.observation,
      updatedAt: new Date().toISOString()
    };
    this.#events.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(eventId: string): Promise<PreventiveEventSummary> {
    const event = this.#events.get(eventId);
    if (!event) {
      throw new NotFoundError('Preventive event not found', { eventId });
    }
    return event;
  }

  async list(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEventSummary[]> {
    let items = Array.from(this.#events.values()).filter((event) => event.accountId === accountId);
    items = applyPreventiveFilters(items, filters);
    return items.sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.clientName.localeCompare(b.clientName));
  }

  async delete(eventId: string): Promise<void> {
    this.#events.delete(eventId);
  }

  async execute(eventId: string, input: PreventiveEventExecuteInput): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }> {
    const existing = await this.getOrThrow(eventId);
    const now = new Date().toISOString();
    const event: PreventiveEventSummary = {
      ...existing,
      status: 'executed',
      executedAt: now,
      executedObservation: normalizePreventiveOptionalText(
        input.observation,
        'observation',
        preventiveMaxObservationLength
      ),
      observation:
        normalizePreventiveOptionalText(input.observation, 'observation', preventiveMaxObservationLength) ??
        existing.observation,
      updatedAt: now
    };
    this.#events.set(event.id, event);

    const rescheduleTo = normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo');
    if (!rescheduleTo) return { event, rescheduledEvent: null };

    const rescheduledEvent: PreventiveEventSummary = {
      ...existing,
      id: createCorrelationId('preventive'),
      eventDate: rescheduleTo,
      status: 'scheduled',
      executedAt: null,
      executedObservation: null,
      rescheduledFromId: event.id,
      reminderEmailPreparedAt: null,
      observation: 'Reagendado apos baixa.',
      createdAt: now,
      updatedAt: now
    };
    this.#events.set(rescheduledEvent.id, rescheduledEvent);
    return { event, rescheduledEvent };
  }

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      reminderEmailPreparedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.#events.set(updated.id, updated);
    return updated;
  }

  async prepareBulkEmail(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEmailResult> {
    const preparedAt = new Date().toISOString();
    const items = await this.list(accountId, filters);
    let preparedCount = 0;
    for (const item of items.filter((event) => event.status === 'scheduled')) {
      this.#events.set(item.id, { ...item, reminderEmailPreparedAt: preparedAt, updatedAt: preparedAt });
      preparedCount++;
    }
    return { preparedCount, preparedAt };
  }
}

function applyPreventiveFilters(
  items: PreventiveEventSummary[],
  filters: PreventiveEventListFilters
): PreventiveEventSummary[] {
  const client = filters.client?.trim().toLowerCase();
  const animal = filters.animal?.trim().toLowerCase();
  const dateFrom = filters.dateFrom ? normalizePreventiveDate(filters.dateFrom, 'dateFrom') : null;
  const dateTo = filters.dateTo ? normalizePreventiveDate(filters.dateTo, 'dateTo') : null;

  return items.filter((event) => {
    if (!filters.includeExecuted && event.status === 'executed') return false;
    if (dateFrom && event.eventDate < dateFrom) return false;
    if (dateTo && event.eventDate > dateTo) return false;
    if (filters.itemType && preventiveItemTypes.has(filters.itemType as PreventiveItemType) && event.itemType !== filters.itemType) {
      return false;
    }
    if (client && !event.clientName.toLowerCase().includes(client)) return false;
    if (animal && !event.animalName.toLowerCase().includes(animal)) return false;
    return true;
  });
}

class DatabasePreventiveEventStore implements PreventiveEventStore {
  async create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const event = createPreventiveEventSummary(accountId, input);
    return await this.insertEvent(event);
  }

  async update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      clientName:
        input.clientName !== undefined
          ? normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength)
          : existing.clientName,
      animalName:
        input.animalName !== undefined
          ? normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength)
          : existing.animalName,
      eventDate:
        input.eventDate !== undefined ? normalizePreventiveDate(input.eventDate, 'eventDate') : existing.eventDate,
      itemType: input.itemType !== undefined ? normalizePreventiveItemType(input.itemType) : existing.itemType,
      description:
        input.description !== undefined
          ? normalizePreventiveText(input.description, 'description', preventiveMaxDescriptionLength)
          : existing.description,
      status: input.status !== undefined ? normalizePreventiveStatus(input.status) : existing.status,
      observation:
        input.observation !== undefined
          ? normalizePreventiveOptionalText(input.observation, 'observation', preventiveMaxObservationLength)
          : existing.observation,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE preventive_events
         SET client_name = $2,
             animal_name = $3,
             event_date = $4,
             item_type = $5,
             description = $6,
             status = $7,
             observation = $8,
             updated_at = $9
         WHERE id = $1
         RETURNING *`,
        [
          eventId,
          updated.clientName,
          updated.animalName,
          updated.eventDate,
          updated.itemType,
          updated.description,
          updated.status,
          updated.observation,
          new Date(updated.updatedAt)
        ]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async getOrThrow(eventId: string): Promise<PreventiveEventSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM preventive_events WHERE id = $1', [eventId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async list(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEventSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM preventive_events WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (!filters.includeExecuted) {
        sql += ` AND status <> $${nextParam}`;
        params.push('executed');
        nextParam++;
      }
      if (filters.dateFrom) {
        sql += ` AND event_date >= $${nextParam}`;
        params.push(normalizePreventiveDate(filters.dateFrom, 'dateFrom'));
        nextParam++;
      }
      if (filters.dateTo) {
        sql += ` AND event_date <= $${nextParam}`;
        params.push(normalizePreventiveDate(filters.dateTo, 'dateTo'));
        nextParam++;
      }
      if (filters.itemType && preventiveItemTypes.has(filters.itemType as PreventiveItemType)) {
        sql += ` AND item_type = $${nextParam}`;
        params.push(filters.itemType);
        nextParam++;
      }
      if (filters.client) {
        sql += ` AND client_name ILIKE $${nextParam}`;
        params.push(`%${filters.client}%`);
        nextParam++;
      }
      if (filters.animal) {
        sql += ` AND animal_name ILIKE $${nextParam}`;
        params.push(`%${filters.animal}%`);
        nextParam++;
      }

      sql += ' ORDER BY event_date ASC, client_name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapPreventiveEventRow(row));
    });
  }

  async delete(eventId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM preventive_events WHERE id = $1', [eventId]);
    });
  }

  async execute(eventId: string, input: PreventiveEventExecuteInput): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }> {
    const existing = await this.getOrThrow(eventId);
    const executedObservation = normalizePreventiveOptionalText(
      input.observation,
      'observation',
      preventiveMaxObservationLength
    );
    const now = new Date();

    return await withTenantQuery(getPool(), async (client) => {
      await client.query('BEGIN');
      try {
        const updateResult = await client.query(
          `UPDATE preventive_events
           SET status = 'executed',
               executed_at = $2,
               executed_observation = $3,
               observation = COALESCE($3, observation),
               updated_at = $2
           WHERE id = $1
           RETURNING *`,
          [eventId, now, executedObservation]
        );
        const event = mapPreventiveEventRow(updateResult.rows[0]);

        const rescheduleTo = normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo');
        if (!rescheduleTo) {
          await client.query('COMMIT');
          return { event, rescheduledEvent: null };
        }

        const rescheduledEvent = createPreventiveEventSummary(
          existing.accountId,
          {
            clientName: existing.clientName,
            animalName: existing.animalName,
            eventDate: rescheduleTo,
            itemType: existing.itemType,
            description: existing.description,
            observation: 'Reagendado apos baixa.',
            status: 'scheduled'
          },
          event.id
        );
        const insertResult = await this.insertEventWithClient(client, rescheduledEvent);
        await client.query('COMMIT');
        return { event, rescheduledEvent: insertResult };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    const preparedAt = new Date();
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE preventive_events
         SET reminder_email_prepared_at = $2,
             updated_at = $2
         WHERE id = $1
         RETURNING *`,
        [eventId, preparedAt]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async prepareBulkEmail(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEmailResult> {
    const preparedAt = new Date();
    const items = await this.list(accountId, { ...filters, includeExecuted: false });
    if (items.length === 0) {
      return { preparedCount: 0, preparedAt: preparedAt.toISOString() };
    }

    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE preventive_events
         SET reminder_email_prepared_at = $2,
             updated_at = $2
         WHERE account_id = $1
           AND id = ANY($3::varchar[])`,
        [accountId, preparedAt, items.map((item) => item.id)]
      );
    });

    return { preparedCount: items.length, preparedAt: preparedAt.toISOString() };
  }

  private async insertEvent(event: PreventiveEventSummary): Promise<PreventiveEventSummary> {
    return await withTenantQuery(getPool(), async (client) => this.insertEventWithClient(client, event));
  }

  private async insertEventWithClient(
    client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
    event: PreventiveEventSummary
  ): Promise<PreventiveEventSummary> {
    const result = await client.query(
      `INSERT INTO preventive_events (
         id,
         account_id,
         client_name,
         animal_name,
         event_date,
         item_type,
         description,
         status,
         observation,
         executed_at,
         executed_observation,
         rescheduled_from_id,
         reminder_email_prepared_at,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        event.id,
        event.accountId,
        event.clientName,
        event.animalName,
        event.eventDate,
        event.itemType,
        event.description,
        event.status,
        event.observation,
        event.executedAt ? new Date(event.executedAt) : null,
        event.executedObservation,
        event.rescheduledFromId,
        event.reminderEmailPreparedAt ? new Date(event.reminderEmailPreparedAt) : null,
        new Date(event.createdAt),
        new Date(event.updatedAt)
      ]
    );
    return mapPreventiveEventRow(result.rows[0]);
  }
}

function createPreventiveEventStore(): PreventiveEventStore {
  try {
    getPool();
    return new DatabasePreventiveEventStore();
  } catch {
    return new InMemoryPreventiveEventStore();
  }
}

export function createApiServer(options: ApiServerOptions): ApiServer {
  const logger = createLogger(options.appName);
  const corsAllowedOrigins = options.corsAllowedOrigins ?? DEFAULT_CORS_ALLOWED_ORIGINS;
  const effectiveRuntimeDistributedStateEnabled =
    options.runtimeDistributedStateEnabled
    ?? options.featureFlags?.runtimeDistributedStateEnabled
    ?? false;
  const {
    accessControl,
    users,
    staff,
    owners,
    patients,
    encounters,
    scheduling,
    triage,
    medicalRecords,
    attachments,
    inpatient,
    sectorBedService,
    surgery,
    diagnostics,
    laboratory,
    billing,
    encounterFinancial,
    commercial,
    inventory,
    notifications,
    audit,
    discharges,
    prescriptionExecutions,
    products,
    services,
    counterSales,
    quotes,
    cash,
    auth,
    lgpd,
    webhooks,
    apiKeys,
    eventBus,
    pixTransactions,
    cardTransactions,
    smartScheduling,
    initialize
  } = createApiRuntime({
    authSecret: options.authSecret,
    authVerifierSecrets: options.authVerifierSecrets,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
    enableMfa: options.enableMfa,
    mfaEncryptionKey: options.mfaEncryptionKey,
    repositories: options.repositories,
    fileStorage: options.fileStorage,
    sectorBedOptions: options.sectorBedOptions,
    runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
    notificationsWhatsappRemindersEnabled:
      options.featureFlags?.notificationsWhatsappRemindersEnabled,
    preserveSeedUsersWithRepository: options.environment === 'test'
  });
  // PagarMe is preferred only when both credentials are present.
  // Without complete credentials, the runtime must fall back to LocalPix so
  // bootstrap, test, and validation environments stay operational.
  const hasPagarmeCredentials = Boolean(options.pagarmeApiKey && options.pagarmePixKey);
  const usePixMock = options.pixMockMode === true || !hasPagarmeCredentials;
  const paymentGateway = usePixMock
    ? new LocalPixPaymentGateway()
    : new PagarMePaymentGatewayAdapter({
        apiKey: options.pagarmeApiKey!,
        pixKey: options.pagarmePixKey!
      });

  const paymentGatewayLabel =
    paymentGateway instanceof PagarMePaymentGatewayAdapter ? 'PagarMePixAdapter' : 'LocalPixPaymentGateway';
  logger.info('payment gateway initialized', { provider: paymentGatewayLabel });
  const useEmailMock = options.emailMockMode === true || !options.resendApiKey;
  const emailGateway = useEmailMock
      ? new LocalEmailGateway()
      : new ResendEmailGatewayAdapter({
        apiKey: options.resendApiKey!,
        from: options.emailFrom ?? 'noreply@cvg-his.local'
      });
  const emailDeliveries = new InMemoryEmailDeliveryRepository();
  const useSmsMock = options.smsMockMode === true || !options.smsApiKey;
  const smsGateway = useSmsMock
    ? new LocalSmsGateway()
    : new TwilioSmsGatewayAdapter({
        apiKey: options.smsApiKey!,
        from: options.smsFrom ?? 'CVGHIS'
      });
  const smsDeliveries = new InMemorySmsDeliveryRepository();
  const hasGoogleCalendarCredentials = Boolean(
    options.googleCalendarAccessToken && options.googleCalendarCalendarId
  );
  const useGoogleCalendarMock =
    options.googleCalendarMockMode === true || !hasGoogleCalendarCredentials;
  const googleCalendarGateway = useGoogleCalendarMock
    ? new LocalGoogleCalendarGateway()
    : new GoogleCalendarGatewayAdapter({
        accessToken: options.googleCalendarAccessToken!,
        calendarId: options.googleCalendarCalendarId!
      });
  const googleCalendarSyncs = new InMemoryGoogleCalendarSyncRepository();
  const laboratoryResultImports = new InMemoryLaboratoryResultImportRepository();
  const ocrFiscal = new OcrFiscalService();
  const demandForecasting = new DemandForecastingService();
  const labAnomalyDetection = new LabAnomalyDetectionService();
  const fiscal = new FiscalService();
  const mlTelemetry = new MlTelemetryService();
  const responsibilityTerms = createResponsibilityTermStore();
  const breeds = createBreedStore();
  const animalSpecies = createAnimalSpeciesStore();
  const coatColors = createCoatColorStore();
  const customerGroups = createCustomerGroupStore();
  const preventiveEvents = createPreventiveEventStore();

  // Rate limiter for auth endpoints (GAP-11: uses createAuthRateLimiter helper)
  // GAP-05: runtimeDistributedStateEnabled gates Redis backend for distributed rate limiting
  const authRateLimiter = createAuthRateLimiter(logger, {
    authRateLimitWindowMs: options.authRateLimitWindowMs,
    authRateLimitMaxRequests: options.authRateLimitMaxRequests,
    redisUrl: options.redisUrl,
    runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled
  });

  // ABAC engine — layered on top of RBAC for fine-grained policy enforcement
  const abacEngine = new AbacEngine();

  // Feature flag repository and provider for operational catalog (PR-FF-12)
  const featureFlagRepository = new DatabaseFeatureFlagRepository();

  // GAP-06: feature flags already resolved in index.ts (db-backed provider with metrics)
  const featureFlags = options.featureFlags ?? {
    providerName: 'unknown',
    enabledKeys: [],
    decisions: {},
    authOidcEnabled: false,
    authWebauthnEnabled: false,
    runtimeDistributedStateEnabled: false,
    fiscalBackofficeEnabled: false,
    notificationsWhatsappRemindersEnabled: false,
    notificationsWhatsappInboundActionsEnabled: false,
    mlSmartSchedulingEnabled: true,
    mlForecastingEnabled: true,
    mlAnomalyDetectionEnabled: true,
    mlOcrFiscalEnabled: true,
    provider: { name: 'unknown', evaluate: async () => ({ key: '', enabled: false, provider: 'unknown', reason: 'unknown', evaluatedAt: '', definition: {} as never, context: {} as never }) } as never
  };

  /**
   * Build ABAC actor attributes from the authenticated principal.
   */
  function buildActorAttributes(
    principal: AuthenticatedPrincipal,
    request?: IncomingMessage
  ): ActorAttributes {
    const memberships = accessControl.listMemberships(principal.user.id as never);
    const branchIdHeader = request?.headers['x-branch-id'];
    const branchIds =
      typeof branchIdHeader === 'string' && branchIdHeader.trim().length > 0
        ? [branchIdHeader.trim()]
        : [];
    return {
      userId: principal.user.id as never,
      accountId: principal.user.accountId as never,
      roleCodes: principal.access.roleCodes,
      department: undefined,
      jobTitle: undefined,
      staffId: undefined,
      branchIds,
      teamIds: memberships.teams.map((t) => t.id),
      sectorIds: memberships.sectors.map((s) => s.id),
      sectorCodes: memberships.sectors.map((s) => s.code),
      isActive: principal.user.status === 'active'
    };
  }

  /**
   * Build ABAC environment attributes from the HTTP request.
   */
  function buildEnvironmentAttributes(request: IncomingMessage): EnvironmentAttributes {
    const now = new Date();
    return {
      timestamp: now.toISOString(),
      dayOfWeek: now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      hourOfDay: now.getHours(),
      ipAddress: request.headers['x-forwarded-for']?.toString().split(',')[0].trim()
        ?? request.socket.remoteAddress,
      userAgent: request.headers['user-agent']
    };
  }

  /**
   * Enforce ABAC policy for a given action.
   * Throws ForbiddenError if the policy denies the request.
   */
  function enforceAbac(
    actionCode: string,
    principal: AuthenticatedPrincipal,
    resource: ResourceAttributes,
    request: IncomingMessage
  ): void {
    const actor = buildActorAttributes(principal, request);
    const environment = buildEnvironmentAttributes(request);
    abacEngine.enforce(actionCode, actor, resource, environment);
  }

  // WebAuthn service (in-memory repository for dev; replace with DB repo in prod)
  const webauthnRepository = new InMemoryWebAuthnRepository();
  const webauthnService = new WebAuthnServiceImpl(webauthnRepository);
  const webauthnChallenges = new Map<string, { challenge: string; createdAt: number }>();

  // OIDC state storage:
  // - in-memory by default
  // - stateless signed payload when distributed runtime state is enabled
  const oidcStateStore = effectiveRuntimeDistributedStateEnabled
    ? createStatelessOidcStateStore(options.authSecret)
    : createInMemoryOidcStateStore();

  // OIDC configuration (configure via environment in production)
  const oidcConfig: OIDCConfig | null = (() => {
    const issuer = process.env['OIDC_ISSUER'];
    const clientId = process.env['OIDC_CLIENT_ID'];
    const clientSecret = process.env['OIDC_CLIENT_SECRET'];
    const redirectUri = process.env['OIDC_REDIRECT_URI'];
    if (!issuer || !clientId || !clientSecret || !redirectUri) {
      return null;
    }
    return {
      issuer,
      clientId,
      clientSecret,
      redirectUri,
      scope: 'openid profile email',
      authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
      tokenEndpoint: `${issuer}/protocol/openid-connect/token`,
      userinfoEndpoint: `${issuer}/protocol/openid-connect/userinfo`,
      endSessionEndpoint: `${issuer}/protocol/openid-connect/logout`
    };
  })();

  // SOC2 control service instances for evidence collection
  const soc2MfaControl = new MfaControlService({
    requiredForRoles: ['admin', 'finance'],
    requiredForApiKeys: true,
    failedLoginLockoutAttempts: 5,
    lockoutDurationMinutes: 15,
    sessionTimeoutMinutes: 30
  });
  const soc2VulnControl = new VulnerabilityControlService();
  const soc2AccessControl = new AccessReviewControlService();
  const soc2DrControl = new DisasterRecoveryControlService();
  const soc2IncidentControl = new IncidentResponseControlService();

  const notificationPersistence = notifications as unknown as {
    listFromRepository(
      status?: 'queued' | 'sent' | 'read',
      accountId?: string
    ): Promise<readonly unknown[]>;
    listJobsFromRepository(status?: string, accountId?: string): Promise<readonly unknown[]>;
    processPendingFromRepository(
      payload?: ProcessNotificationsRequest,
      accountId?: string
    ): Promise<readonly unknown[]>;
  };
  const scopedScheduling = scheduling as unknown as {
    listAppointments(accountId?: string): readonly unknown[];
    getQueue(accountId?: string): readonly unknown[];
    getAppointmentOrThrow(appointmentId: string): SchedulingAppointmentSummary;
    cancelAppointment(
      appointmentId: string,
      reason?: string
    ): Promise<SchedulingAppointmentSummary>;
    checkIn(
      accountId: string,
      payload: { patientId: string; ownerId: string; appointmentId?: string; reason?: string }
    ): Promise<unknown>;
  };

  const ready = initialize().catch((err) => {
    logger.error('Failed to initialize services from database', {
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  });

  // Initialize chaos engine and register experiments
  const chaos = ChaosEngine.getInstance();
  registerChaosExperimentOnce(chaos, databaseFailureExperiment);
  registerChaosExperimentOnce(chaos, redisFailureExperiment);
  registerChaosExperimentOnce(chaos, networkLatencyExperiment);
  registerChaosExperimentOnce(chaos, workerFailureExperiment);
  registerChaosExperimentOnce(chaos, apiLatencyExperiment);

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    // Apply W3C trace context propagation before handling
    tracingMiddleware(request, response, () => {
      void handleRequest(request, response);
    });
  });

  return Object.assign(server, { ready });

  async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    const parentCtx = extractTraceContext(request);
    const span = createSpan(`HTTP ${request.method ?? 'UNKNOWN'} ${request.url ?? '/'}`, parentCtx ?? null);
    (request as IncomingMessage & { span?: Span }).span = span;

    const startTime = process.hrtime.bigint();
    const correlationIdHeader = request.headers['x-correlation-id'];
    const correlationId =
      typeof correlationIdHeader === 'string' ? correlationIdHeader : createCorrelationId('api');

    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('x-request-id', correlationId);
    response.setHeader('x-trace-id', span.context.traceId);
    applySecurityHeaders(request, response, options.environment);
    const corsDecision = applyCorsPolicy(request, response, corsAllowedOrigins);

    // Inject trace context into response for downstream propagation
    response.setHeader('tracestate', `cvg-api`);
    response.setHeader('traceparent', formatTraceParent(span.context.traceId, span.context.spanId, span.context.traceFlags));
    response.on('finish', () => {
      const durationNs = process.hrtime.bigint() - startTime;
      const durationSec = Number(durationNs) / 1e9;
      const url = new URL(request.url ?? '/', 'http://localhost');
      const route = normalizeRoute(url.pathname);
      const method = request.method ?? 'UNKNOWN';
      const statusCode = response.statusCode;

      httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
      httpRequestDurationSeconds.observe(
        { method, route, status_code: String(statusCode) },
        durationSec
      );
      recordRequestSloObservation({
        durationMs: durationSec * 1000,
        statusCode
      });

      if (statusCode >= 400) {
        const category = statusCode >= 500 ? '5xx' : '4xx';
        httpErrorsTotal.inc({ status_category: category });
      }

      span.attributes['http.method'] = method;
      span.attributes['http.route'] = route;
      span.attributes['http.target'] = request.url ?? '/';
      span.attributes['http.status_code'] = statusCode;
      span.attributes['http.duration_ms'] = Math.round(durationSec * 1000);
      span.attributes['request.correlation_id'] = correlationId;

      // End the tracing span
      endSpan(span, statusCode >= 400 ? 'error' : 'ok');
    });

    if (!corsDecision.allowed) {
      response.statusCode = 403;
      response.end(
        JSON.stringify({
          code: 'CORS_ORIGIN_DENIED',
          message: corsDecision.message
        })
      );
      return;
    }

    try {
      span.attributes['http.method'] = request.method ?? 'UNKNOWN';
      span.attributes['http.target'] = request.url ?? '/';
      span.attributes['request.correlation_id'] = correlationId;
      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = url.pathname;

      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }

      // Public operational endpoints must work without tenant or auth headers.
      if (handleHealthRoutes(request, response, options)) {
        return;
      }

      if (request.url === '/metrics' && request.method === 'GET') {
        const appState = getAppState();
        const activeExperimentIds = chaos.listActiveExperiments().map((experiment) => experiment.id);
        const operationalState = resolveOperationalRuntimeState({
          appState,
          activeExperimentIds,
          runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
          redisUrl: options.redisUrl
        });
        updateAppMetrics({
          uptime: Math.round(process.uptime()),
          activeRequests: 0,
          dbHealthy: operationalState.databaseHealthy,
          persistenceMode: operationalState.persistenceMode,
          redisHealthy: operationalState.redisHealthy,
          rateLimiterMode: operationalState.rateLimiterMode,
          runtimeDistributedStateEnabled: operationalState.runtimeDistributedStateEnabled
        });

        const metricsText = await getMetricsText();
        response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
        response.statusCode = 200;
        response.end(metricsText);
        return;
      }

      // Chaos engineering endpoints (operational - protected by network policy in production)
      const chaosMatch = request.url?.match(/^\/chaos\/experiments\/([^/]+)\/(start|stop)$/);
      if (chaosMatch && request.method === 'POST') {
        const [, experimentId, action] = chaosMatch;
        try {
          if (action === 'start') {
            // Parse body for durationMs and other options
            const chunks: Buffer[] = [];
            for await (const chunk of request) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const bodyText = Buffer.concat(chunks).toString('utf8');
            const body = bodyText ? JSON.parse(bodyText) : {};
            const result = await chaos.start(experimentId, body);
            response.setHeader('content-type', 'application/json');
            response.statusCode = result.ok ? 200 : 409;
            response.end(JSON.stringify(result));
          } else {
            const result = await chaos.stop(experimentId);
            response.setHeader('content-type', 'application/json');
            response.statusCode = result.ok ? 200 : 409;
            response.end(JSON.stringify(result));
          }
        } catch (err) {
          logger.error('Chaos endpoint error', { experimentId, action, error: err instanceof Error ? err.message : String(err) });
          response.setHeader('content-type', 'application/json');
          response.statusCode = 500;
          response.end(JSON.stringify({ ok: false, error: 'Internal error' }));
        }
        return;
      }

      // List all available chaos experiments
      if (request.url === '/chaos/experiments' && request.method === 'GET') {
        const appState = getAppState();
        const activeExperimentIds = chaos.listActiveExperiments().map((experiment) => experiment.id);
        const operationalState = resolveOperationalRuntimeState({
          appState,
          activeExperimentIds,
          runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
          redisUrl: options.redisUrl
        });
        const experiments = chaos.listExperiments().map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          active: chaos.isActive(e.id),
          runbook: describeChaosExperiment(e.id)?.runbook,
          indicators: describeChaosExperiment(e.id)?.indicators ?? [],
          runtimeImpact: {
            summary: describeChaosExperiment(e.id)?.summary ?? 'No operational summary registered.',
            databaseHealthy: e.id === 'database-failure' ? false : operationalState.databaseHealthy,
            persistenceMode: e.id === 'database-failure' ? 'in-memory' : operationalState.persistenceMode,
            workerReady: e.id === 'worker-failure' ? false : operationalState.workerReady,
            redisHealthy: e.id === 'redis-failure' ? false : operationalState.redisHealthy,
            rateLimiterMode:
              e.id === 'redis-failure'
                ? 'in-memory-fallback'
                : operationalState.rateLimiterMode
          }
        }));
        response.setHeader('content-type', 'application/json');
        response.statusCode = 200;
        response.end(JSON.stringify({ runtimeState: operationalState, experiments }));
        return;
      }

      if (handleOpenApiRoutes(request, response)) {
        return;
      }

      // Extract accountId from Authorization header if present
      let accountId: string | undefined = undefined;
      let userId: string | undefined;
      const authHeader = request.headers['authorization'];
      if (authHeader) {
        const accessToken = extractBearerToken(authHeader);
        if (accessToken) {
          try {
            const principal = auth.authenticateAccessToken(accessToken);
            accountId = principal.user.accountId;
            userId = principal.user.id;
          } catch {
            // Token invalid or expired - will be rejected at route level if needed
          }
        }
      }

      // API key requests also need tenant context before route-level auth runs.
      if (!accountId) {
        const apiKeyValue = readHeader(request, 'x-api-key') ?? readHeader(request, 'X-API-Key');
        if (apiKeyValue) {
          try {
            const apiKey = await apiKeys.validate(apiKeyValue);
            if (apiKey) {
              accountId = apiKey.accountId;
            }
          } catch {
            // Invalid API keys are rejected later at route level.
          }
        }
      }

      const isPublicTenantlessRoute =
        pathname.startsWith('/auth/')
        || pathname.startsWith('/api/auth/')
        || pathname === '/webhooks/whatsapp/inbound'
        || pathname === '/api/webhooks/whatsapp/inbound';

      const tenantCtx = isPublicTenantlessRoute
        ? {
            tenantId: '00000000-0000-0000-0000-000000000001',
            accountId,
            branchId: request.headers['x-branch-id'] as string | undefined,
            userId,
            correlationId
          }
        : resolveTenantFromRequest(request, {
            defaultTenantId: '00000000-0000-0000-0000-000000000001',
            fallbackAccountId: accountId,
            fallbackUserId: userId
          });

      span.attributes['tenant.id'] = tenantCtx.tenantId;
      if (tenantCtx.accountId) {
        span.attributes['account.id'] = tenantCtx.accountId;
      }
      if (tenantCtx.userId) {
        span.attributes['user.id'] = tenantCtx.userId;
      }
      const originHeader = request.headers.origin;
      if (typeof originHeader === 'string' && originHeader.length > 0) {
        span.attributes['http.origin'] = originHeader;
      }
      const userAgent = request.headers['user-agent'];
      if (typeof userAgent === 'string' && userAgent.length > 0) {
        span.attributes['http.user_agent'] = userAgent;
      }

      return await withSpanContext(span, async () => runWithTenantContext(tenantCtx, async () => {

        if (
          await handleAuthRoutes(pathname, request, response, correlationId, {
            auth,
            authRateLimiter,
            logger,
            appName: options.appName,
            featureFlags,
            webauthnService,
            webauthnChallenges,
            oidcConfig,
            webauthnChallengeTtlMs: WEBAUTHN_CHALLENGE_TTL_MS,
            oidcStateStore,
            oidcStateTtlMs: OIDC_STATE_TTL_MS,
            requirePrincipal,
            appendAudit
          })
        ) {
          return;
        }

        // ========================================================================
        // LGPD Endpoints
        // ========================================================================

        if (
          await handleLgpdRoutes(pathname, request, response, correlationId, {
            lgpd,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (
          await handleSoc2Routes(pathname, request, response, correlationId, {
            requirePrincipal,
            appendAudit,
            logError: (message, context) => logger.error(message, context),
            abacEngine,
            mfaControl: soc2MfaControl,
            vulnerabilityControl: soc2VulnControl,
            accessControl: soc2AccessControl,
            drControl: soc2DrControl,
            incidentControl: soc2IncidentControl
          })
        ) {
          return;
        }

        // Feature flags operational catalog — PR-FF-12
        if (
          await handleFeatureFlagsRoutes(pathname, request, response, correlationId, {
            featureFlagRepository,
            featureFlagProvider: featureFlags.provider,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (
          await handleLaboratoryRoutes(pathname, request, response, correlationId, {
            laboratory,
            audit,
            requirePrincipal,
            onOrderCreated: (order, principalUserId) => {
              medicalRecords.appendAdvancedCareEvent(
                order.encounterId as never,
                principalUserId as never,
                'diagnostic_requested',
                `Diagnostic order requested: ${order.examType}`
              );
            },
            onOrderStatusChanged: (order, payload, principalUserId) => {
              if (payload.status === 'collected') {
                medicalRecords.appendAdvancedCareEvent(
                  order.encounterId as never,
                  principalUserId as never,
                  'diagnostic_collected',
                  `Diagnostic order collected by ${payload.collectedByUserId ?? principalUserId}`
                );
              } else if (payload.status === 'resulted') {
                medicalRecords.appendAdvancedCareEvent(
                  order.encounterId as never,
                  principalUserId as never,
                  'diagnostic_resulted',
                  `Diagnostic result registered: ${payload.resultSummary ?? order.examType}`
                );
              }
            }
          })
        ) {
          return;
        }

        if (
          await handleFiscalRoutes(pathname, request, response, correlationId, {
            fiscal,
            audit,
            requirePrincipal,
            fiscalBackofficeEnabled: featureFlags.fiscalBackofficeEnabled
          })
        ) {
          return;
        }

        if (
          await handleSchedulingRoutes(pathname, request, response, correlationId, {
            scheduling,
            encounters,
            smartScheduling,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (
          await handleAgendaConfigRoutes(pathname, request, response, correlationId, {
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (pathname === '/medical-records' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'medical-records.read');
          const encounterId = url.searchParams.get('encounterId');

          if (encounterId) {
            const record = await medicalRecords.getRecordByEncounterOrThrowAsync(
              encounterId as never
            );
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'medical-records',
              'read_record',
              'medical-record',
              record.id,
              `Medical record read for encounter ${encounterId}`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(
              JSON.stringify({
                record,
                entries: await medicalRecords.listEntriesByEncounterAsync(encounterId as never)
              })
            );
            return;
          }

          const items = await medicalRecords.listAll(principal.user.accountId as never);
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/medical-records/entries' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'medical-records.read');
          const encounterId = requireNonEmptyString(
            url.searchParams.get('encounterId'),
            'encounterId'
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'medical-records',
            'list_entries',
            'clinical-entry',
            encounterId,
            'Clinical entries listed',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await medicalRecords.listEntriesByEncounterAsync(encounterId as never)
            })
          );
          return;
        }

        if (pathname === '/medical-records/entries' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'medical-records.manage');
          const payload = (await readJsonBody(request)) as CreateClinicalEntryRequest;
          // ABAC enforcement: only clinical staff can write medical records
          enforceAbac(
            'medical-records.manage',
            principal,
            {
              resourceType: 'patient',
              resourceId: payload.patientId,
              patientId: payload.patientId as never,
              encounterId: payload.encounterId as never,
              accountId: principal.user.accountId as never
            },
            request
          );
          const entry = medicalRecords.addEntry(principal.user.id, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'medical-records',
            'create_entry',
            'clinical-entry',
            entry.id,
            `${entry.entryType} created for encounter ${entry.encounterId}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(entry));
          return;
        }

        if (pathname.startsWith('/medical-records/entries/')) {
          const medicalRecordEntryParts = pathname.split('/');
          const entryId = requireNonEmptyString(medicalRecordEntryParts[3], 'entryId');

          if (
            request.method === 'GET'
            && medicalRecordEntryParts.length === 5
            && medicalRecordEntryParts[4] === 'revisions'
          ) {
            const principal = requirePrincipal(request, 'medical-records.read');
            const revisions = await medicalRecords.getEntryRevisionsAsync(entryId as never);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'medical-records',
              'read_revisions',
              'clinical-entry',
              entryId,
              `Clinical entry ${entryId} revision history inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify({ items: revisions }));
            return;
          }

          const principal = requirePrincipal(request, 'medical-records.manage');

          if (request.method === 'PATCH' && medicalRecordEntryParts.length === 4) {
            const payload = (await readJsonBody(request)) as UpdateClinicalEntryRequest;
            const entry = medicalRecords.updateEntry(principal.user.id, entryId as never, payload);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'medical-records',
              'update_entry',
              'clinical-entry',
              entry.id,
              `Clinical entry ${entry.id} updated to version ${entry.version}`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(entry));
            return;
          }

          if (request.method === 'DELETE' && medicalRecordEntryParts.length === 4) {
            const payload = (await readJsonBody(request).catch(
              () => ({}) as ArchiveClinicalEntryRequest
            )) as ArchiveClinicalEntryRequest;
            const entry = medicalRecords.archiveEntry(principal.user.id, entryId as never, payload);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'medical-records',
              'archive_entry',
              'clinical-entry',
              entry.id,
              `Clinical entry ${entry.id} archived`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(entry));
            return;
          }
        }

        if (pathname === '/medical-records/timeline' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'medical-records.read');
          const encounterId = requireNonEmptyString(
            url.searchParams.get('encounterId'),
            'encounterId'
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'medical-records',
            'read_timeline',
            'clinical-timeline',
            encounterId,
            'Clinical timeline inspected',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await medicalRecords.listTimelineByEncounterAsync(encounterId as never)
            })
          );
          return;
        }

        if (pathname === '/attachments' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'attachments.read');
          const linkedEntityType = requireNonEmptyString(
            url.searchParams.get('linkedEntityType'),
            'linkedEntityType'
          ) as 'encounter' | 'medical_record' | 'diagnostic_order';
          const linkedEntityId = requireNonEmptyString(
            url.searchParams.get('linkedEntityId'),
            'linkedEntityId'
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'attachments',
            'list',
            'attachment',
            linkedEntityId,
            'Clinical attachments listed',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await attachments.listByLinkedEntity(linkedEntityType, linkedEntityId)
            })
          );
          return;
        }

        if (pathname === '/attachments' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'attachments.manage');
          const payload = (await readJsonBody(request)) as CreateAttachmentRequest;
          const attachment = await attachments.upload(principal.user.id, payload);

          if (payload.linkedEntityType === 'encounter') {
            medicalRecords.ensureRecord(payload.linkedEntityId as never);
            medicalRecords.appendAttachmentEvent(
              payload.linkedEntityId as never,
              principal.user.id,
              attachment.id,
              `Attachment added to encounter ${payload.linkedEntityId}`
            );
          } else if (payload.linkedEntityType === 'medical_record') {
            const record = await medicalRecords.getRecordOrThrowAsync(
              payload.linkedEntityId as never
            );
            medicalRecords.appendAttachmentEvent(
              record.encounterId,
              principal.user.id,
              attachment.id,
              `Attachment added to medical record ${record.id}`
            );
          } else {
            const order = diagnostics.getOrThrow(payload.linkedEntityId as never);
            medicalRecords.appendAttachmentEvent(
              order.encounterId,
              principal.user.id,
              attachment.id,
              `Attachment added to diagnostic order ${order.id}`
            );
          }

          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'attachments',
            'upload',
            'attachment',
            attachment.id,
            `Attachment ${attachment.fileName} uploaded`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(attachment));
          return;
        }

        if (pathname === '/inpatient' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'inpatient.read');
          const encounterId = url.searchParams.get('encounterId') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inpatient',
            'list',
            'inpatient-stay',
            encounterId ?? 'all',
            'Inpatient stays listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: inpatient.list(encounterId as never) }));
          return;
        }

        if (pathname === '/notifications' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'notifications.read');
          const status = url.searchParams.get('status') as 'queued' | 'sent' | 'read' | null;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'notifications',
            'list',
            'notification',
            status ?? 'all',
            'Operational notifications listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await notificationPersistence.listFromRepository(
                status ?? undefined,
                principal.user.accountId
              )
            })
          );
          return;
        }

        if (pathname === '/notifications/jobs' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'notifications.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'notifications',
            'list_jobs',
            'notification-job',
            'all',
            'Notification jobs listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await notificationPersistence.listJobsFromRepository(
                undefined,
                principal.user.accountId
              )
            })
          );
          return;
        }

        if (pathname === '/notifications' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'notifications.manage');
          const payload = (await readJsonBody(request)) as CreateNotificationRequest;
          const notification = await notifications.create(
            principal.user.id,
            principal.user.accountId,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'notifications',
            'create',
            'notification',
            notification.id,
            `Notification queued for category ${notification.category}`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(notification));
          return;
        }

        if (pathname === '/notifications/process' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'notifications.manage');
          const payload = (await readJsonBody(request).catch(
            () => ({})
          )) as ProcessNotificationsRequest;
          const processed = await notificationPersistence.processPendingFromRepository(
            payload,
            principal.user.accountId
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'notifications',
            'process_jobs',
            'notification-job',
            String(processed.length),
            `Processed ${processed.length} notification jobs`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: processed }));
          return;
        }

        if (pathname === '/encounters' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'encounters.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'list',
            'encounter',
            'all',
            'Encounters listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: encounters.listAll() }));
          return;
        }

        if (pathname === '/encounters' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'encounters.manage');
          const payload = (await readJsonBody(request)) as CreateEncounterRequest;
          const encounter = encounters.openEncounter(
            principal.user.accountId,
            principal.user.id,
            payload
          );
          if (encounter.queueEntryId) {
            const queueEntry = await scheduling.attachEncounter(
              encounter.queueEntryId,
              encounter.id
            );
            encounters.appendTimeline(encounter.id, {
              accountId: encounter.accountId,
              eventType: 'queue_checked_in',
              summary: `Patient checked in with priority ${queueEntry.priority}`,
              actorUserId: principal.user.id
            });
            if (queueEntry.calledAt) {
              encounters.appendTimeline(encounter.id, {
                accountId: encounter.accountId,
                eventType: 'queue_called',
                summary: 'Queue entry had already been called',
                actorUserId: principal.user.id
              });
            }
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'open',
            'encounter',
            encounter.id,
            `Encounter opened for patient ${encounter.patientId}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(encounter));
          return;
        }

        if (
          pathname.startsWith('/encounters/') &&
          pathname.endsWith('/timeline') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'encounters.read');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'read_timeline',
            'encounter-timeline',
            encounterId,
            'Encounter timeline inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({ items: await encounters.listTimelineAsync(encounterId as never) })
          );
          return;
        }

        if (
          pathname.startsWith('/encounters/') &&
          pathname.endsWith('/transition') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'encounters.manage');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          const payload = (await readJsonBody(request)) as TransitionEncounterRequest;
          const encounter = encounters.transitionEncounter(
            encounterId as never,
            principal.user.id,
            payload
          );
          await syncQueueWithEncounter(encounter.id, encounter.status);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'transition',
            'encounter',
            encounter.id,
            `Encounter transitioned to ${encounter.status}`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(encounter));
          return;
        }

        if (
          pathname.startsWith('/encounters/') &&
          pathname.endsWith('/close') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'encounters.manage');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          const payload = (await readJsonBody(request)) as CloseEncounterRequest;
          const encounter = encounters.closeEncounter(
            encounterId as never,
            principal.user.id,
            payload
          );
          await syncQueueWithEncounter(encounter.id, encounter.status);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'close',
            'encounter',
            encounter.id,
            `Encounter closed: ${encounter.closeReason}`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(encounter));
          return;
        }

        if (await handleFinancialRoutes(pathname, request, response, correlationId, {
          encounterFinancial,
          billing,
          audit,
          pixTransactions,
          cardTransactions,
          requirePrincipal
        })) { return; }

        if (await handleAdministrativeReportsRoutes(pathname, request, response, correlationId, {
          billing,
          encounterFinancial,
          pixTransactions,
          quotes,
          counterSales,
          cash,
          fiscal,
          audit,
          requirePrincipal
        })) { return; }

        if (pathname.startsWith('/encounters/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'encounters.read');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          const encounter = encounters.getOrThrow(encounterId as never);

          if (pathname.endsWith('/summary')) {
            const timeline = await encounters.listTimelineAsync(encounterId as never);
            const orders = diagnostics.list(encounterId as never);
            let financial = null;

            try {
              financial = await encounterFinancial.getSummary(encounterId as never);
            } catch {
              financial = null;
            }

            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'encounters',
              'read_summary',
              'encounter',
              encounter.id,
              `Encounter ${encounter.id} summary inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(
              JSON.stringify({
                encounter,
                timeline,
                diagnostics: {
                  totalOrders: orders.length,
                  pendingOrders: orders.filter((order) => order.status !== 'resulted').length,
                  releasedResults: orders.filter((order) => order.status === 'resulted').length,
                  latestOrders: orders.slice(0, 5)
                },
                financial
              })
            );
            return;
          }

          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'read',
            'encounter',
            encounter.id,
            `Encounter ${encounter.id} inspected`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(encounter));
          return;
        }

        if (pathname.startsWith('/encounters/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'encounters.manage');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          encounters.deleteEncounter(encounterId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'encounters',
            'delete',
            'encounter',
            encounterId,
            `Encounter ${encounterId} deleted`,
            'high',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if (pathname === '/triage' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'triage.read');
          const encounterId = url.searchParams.get('encounterId') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'triage',
            'list',
            'triage-record',
            encounterId ?? 'all',
            'Triage records listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: triage.list(encounterId as never) }));
          return;
        }

        if (pathname === '/triage' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'triage.manage');
          const payload = (await readJsonBody(request)) as CreateTriageRequest;
          const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId');
          const currentEncounter = encounters.getOrThrow(encounterId as never);
          if (currentEncounter.status === 'reception') {
            encounters.transitionEncounter(currentEncounter.id, principal.user.id, {
              nextStatus: 'in_triage'
            });
            await syncQueueWithEncounter(currentEncounter.id, 'in_triage');
          }
          const record = await triage.createTriage(principal.user.id, payload);
          encounters.appendTimeline(record.encounterId, {
            accountId: record.accountId,
            eventType: 'triage_recorded',
            summary: `Initial triage recorded with priority ${record.priority}`,
            actorUserId: principal.user.id
          });
          const encounter = encounters.transitionEncounter(record.encounterId, principal.user.id, {
            nextStatus: record.destination
          });
          await syncQueueWithEncounter(encounter.id, encounter.status);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'triage',
            'create',
            'triage-record',
            record.id,
            `Initial triage recorded for encounter ${record.encounterId}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(record));
          return;
        }

        if (
          pathname.startsWith('/triage/') &&
          pathname.endsWith('/history') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'triage.read');
          const triageId = requireNonEmptyString(pathname.split('/')[2], 'triageId');
          const record = triage.getOrThrow(triageId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'triage',
            'read_history',
            'triage-record-version',
            record.id,
            `Triage history inspected for encounter ${record.encounterId}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: triage.listVersions(triageId as never) }));
          return;
        }

        if (pathname.startsWith('/triage/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'triage.manage');
          const triageId = requireNonEmptyString(pathname.split('/')[2], 'triageId');
          const payload = (await readJsonBody(request)) as UpdateTriageRequest;
          const before = triage.getOrThrow(triageId as never);
          const record = await triage.updateTriage(triageId as never, payload, principal.user.id);
          encounters.appendTimeline(record.encounterId, {
            accountId: record.accountId,
            eventType: 'triage_recorded',
            summary: `Triage updated from ${before.priority}/${before.destination} to ${record.priority}/${record.destination}`,
            actorUserId: principal.user.id
          });
          const encounter = encounters.getOrThrow(record.encounterId);
          if (encounter.status !== 'closed' && encounter.status !== record.destination) {
            const transitioned = encounters.transitionEncounter(
              record.encounterId,
              principal.user.id,
              {
                nextStatus: record.destination
              }
            );
            await syncQueueWithEncounter(transitioned.id, transitioned.status);
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'triage',
            'update',
            'triage-record',
            record.id,
            `Triage updated for encounter ${record.encounterId}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(record));
          return;
        }

        if (
          await handleCounterSalesRoutes(pathname, request, response, correlationId, {
            counterSales,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (
          await handleCommercialRoutes(pathname, request, response, correlationId, {
            commercial,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (
          await handleOwnersRoutes(pathname, request, response, correlationId, {
            owners,
            patients,
            encounters,
            audit,
            requirePrincipal,
            enforceAbac
          })
        ) {
          return;
        }

        if (
          await handlePatientsRoutes(pathname, request, response, correlationId, {
            patients,
            owners,
            encounters,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        // --- Users, Staff, Quotes (delegated) ---
        if (
          await handleUsersStaffQuotesRoutes(pathname, request, response, correlationId, {
            users,
            staff,
            quotes,
            counterSales,
            accessControl,
            audit,
            requirePrincipal
          })
        ) {
          return;
        }

        if (pathname === '/products' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'product.read');
          const search = url.searchParams.get('search') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'products',
            'list',
            'product',
            search ?? 'all',
            'Products catalog inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: products.list(principal.user.accountId as never, { search })
            })
          );
          return;
        }

        if (pathname === '/products' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'product.write');
          const payload = (await readJsonBody(request)) as {
            name: string;
            code?: string | null;
            description?: string | null;
            basePrice: number;
            active?: boolean;
          };
          const product = await products.create(principal.user.accountId as never, {
            name: requireNonEmptyString(payload.name, 'name'),
            code: payload.code,
            description: payload.description,
            basePrice: payload.basePrice,
            active: payload.active
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'products',
            'create',
            'product',
            product.id,
            `Product ${product.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(product));
          return;
        }

        if (pathname.startsWith('/products/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'product.read');
          const productId = requireNonEmptyString(pathname.split('/')[2], 'productId');
          const product = products.getOrThrow(productId);
          if (product.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Product not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'products',
            'read',
            'product',
            product.id,
            `Product ${product.name} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(product));
          return;
        }

        if (pathname.startsWith('/products/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'product.write');
          const productId = requireNonEmptyString(pathname.split('/')[2], 'productId');
          const existingProduct = products.getOrThrow(productId);
          if (existingProduct.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Product not found for current account');
          }
          const payload = (await readJsonBody(request)) as {
            name?: string;
            code?: string | null;
            description?: string | null;
            basePrice?: number;
            active?: boolean;
          };
          const product = await products.update(productId, {
            name: payload.name,
            code: payload.code,
            description: payload.description,
            basePrice: payload.basePrice,
            active: payload.active
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'products',
            'update',
            'product',
            product.id,
            `Product ${product.name} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(product));
          return;
        }

        if (pathname === '/services' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const search = url.searchParams.get('search') ?? undefined;
          const activeParam = url.searchParams.get('active');
          const active =
            activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'services',
            'list',
            'service',
            search ?? 'all',
            'Services catalog inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: services.list(principal.user.accountId as never, { search, active })
            })
          );
          return;
        }

        if (pathname === '/services' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as {
            name: string;
            code?: string | null;
            description?: string | null;
            basePrice: number;
            active?: boolean;
          };
          const service = await services.create(principal.user.accountId as never, {
            name: requireNonEmptyString(payload.name, 'name'),
            code: payload.code,
            description: payload.description,
            basePrice: payload.basePrice,
            active: payload.active
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'services',
            'create',
            'service',
            service.id,
            `Service ${service.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(service));
          return;
        }

        if (pathname.startsWith('/services/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const serviceId = requireNonEmptyString(pathname.split('/')[2], 'serviceId');
          const service = services.getOrThrow(serviceId);
          if (service.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Service not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'services',
            'read',
            'service',
            service.id,
            `Service ${service.name} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(service));
          return;
        }

        if (pathname.startsWith('/services/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const serviceId = requireNonEmptyString(pathname.split('/')[2], 'serviceId');
          const existingService = services.getOrThrow(serviceId);
          if (existingService.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Service not found for current account');
          }
          const payload = (await readJsonBody(request)) as {
            name?: string;
            code?: string | null;
            description?: string | null;
            basePrice?: number;
            active?: boolean;
          };
          const service = await services.update(serviceId, {
            name: payload.name,
            code: payload.code,
            description: payload.description,
            basePrice: payload.basePrice,
            active: payload.active
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'services',
            'update',
            'service',
            service.id,
            `Service ${service.name} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(service));
          return;
        }

        if ((pathname === '/breeds' || pathname === '/breed') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const search = url.searchParams.get('search') ?? undefined;
          const activeParam = url.searchParams.get('active');
          const species = url.searchParams.get('species') ?? undefined;
          const active =
            activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
          const items = await breeds.list(principal.user.accountId, {
            search,
            active,
            species
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'breeds',
            'list',
            'breed',
            search ?? species ?? 'all',
            'Breeds catalog inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/breeds' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as BreedInput;
          const breed = await breeds.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'breeds',
            'create',
            'breed',
            breed.id,
            `Breed ${breed.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(breed));
          return;
        }

        if (pathname.startsWith('/breeds/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const breedId = requireNonEmptyString(pathname.split('/')[2], 'breedId');
          const breed = await breeds.getOrThrow(breedId);
          if (breed.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Breed not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'breeds',
            'read',
            'breed',
            breed.id,
            `Breed ${breed.name} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(breed));
          return;
        }

        if (pathname.startsWith('/breeds/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const breedId = requireNonEmptyString(pathname.split('/')[2], 'breedId');
          const existingBreed = await breeds.getOrThrow(breedId);
          if (existingBreed.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Breed not found for current account');
          }
          const payload = (await readJsonBody(request)) as BreedInput;
          const breed = await breeds.update(breedId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'breeds',
            'update',
            'breed',
            breed.id,
            `Breed ${breed.name} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(breed));
          return;
        }

        if (pathname.startsWith('/breeds/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'service.write');
          const breedId = requireNonEmptyString(pathname.split('/')[2], 'breedId');
          const existingBreed = await breeds.getOrThrow(breedId);
          if (existingBreed.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Breed not found for current account');
          }
          await breeds.delete(breedId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'breeds',
            'delete',
            'breed',
            breedId,
            `Breed ${existingBreed.name} deleted`,
            'medium',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if ((pathname === '/species' || pathname === '/specie') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const search = url.searchParams.get('search') ?? undefined;
          const activeParam = url.searchParams.get('active');
          const systemCode = url.searchParams.get('systemCode') ?? undefined;
          const active =
            activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
          const items = await animalSpecies.list(principal.user.accountId, {
            search,
            active,
            systemCode
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'species',
            'list',
            'animal-species',
            search ?? systemCode ?? 'all',
            'Animal species catalog inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/species' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as AnimalSpeciesInput;
          const species = await animalSpecies.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'species',
            'create',
            'animal-species',
            species.id,
            `Animal species ${species.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(species));
          return;
        }

        if (pathname.startsWith('/species/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const speciesId = requireNonEmptyString(pathname.split('/')[2], 'speciesId');
          const species = await animalSpecies.getOrThrow(speciesId);
          if (species.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Animal species not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'species',
            'read',
            'animal-species',
            species.id,
            `Animal species ${species.name} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(species));
          return;
        }

        if (pathname.startsWith('/species/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const speciesId = requireNonEmptyString(pathname.split('/')[2], 'speciesId');
          const existingSpecies = await animalSpecies.getOrThrow(speciesId);
          if (existingSpecies.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Animal species not found for current account');
          }
          const payload = (await readJsonBody(request)) as AnimalSpeciesInput;
          const species = await animalSpecies.update(speciesId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'species',
            'update',
            'animal-species',
            species.id,
            `Animal species ${species.name} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(species));
          return;
        }

        if (pathname.startsWith('/species/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'service.write');
          const speciesId = requireNonEmptyString(pathname.split('/')[2], 'speciesId');
          const existingSpecies = await animalSpecies.getOrThrow(speciesId);
          if (existingSpecies.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Animal species not found for current account');
          }
          await animalSpecies.delete(speciesId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'species',
            'delete',
            'animal-species',
            speciesId,
            `Animal species ${existingSpecies.name} deleted`,
            'medium',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if (
          (pathname === '/coat-colors' || pathname === '/coat-color' || pathname === '/pelagens') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'service.read');
          const search = url.searchParams.get('search') ?? undefined;
          const activeParam = url.searchParams.get('active');
          const colorGroup = url.searchParams.get('colorGroup') ?? undefined;
          const active =
            activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
          const items = await coatColors.list(principal.user.accountId, {
            search,
            active,
            colorGroup
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'coat-colors',
            'list',
            'coat-color',
            search ?? colorGroup ?? 'all',
            'Coat colors catalog inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/coat-colors' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as CoatColorInput;
          const coatColor = await coatColors.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'coat-colors',
            'create',
            'coat-color',
            coatColor.id,
            `Coat color ${coatColor.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(coatColor));
          return;
        }

        if (pathname.startsWith('/coat-colors/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const coatColorId = requireNonEmptyString(pathname.split('/')[2], 'coatColorId');
          const coatColor = await coatColors.getOrThrow(coatColorId);
          if (coatColor.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Coat color not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'coat-colors',
            'read',
            'coat-color',
            coatColor.id,
            `Coat color ${coatColor.name} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(coatColor));
          return;
        }

        if (pathname.startsWith('/coat-colors/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const coatColorId = requireNonEmptyString(pathname.split('/')[2], 'coatColorId');
          const existingCoatColor = await coatColors.getOrThrow(coatColorId);
          if (existingCoatColor.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Coat color not found for current account');
          }
          const payload = (await readJsonBody(request)) as CoatColorInput;
          const coatColor = await coatColors.update(coatColorId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'coat-colors',
            'update',
            'coat-color',
            coatColor.id,
            `Coat color ${coatColor.name} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(coatColor));
          return;
        }

        if (pathname.startsWith('/coat-colors/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'service.write');
          const coatColorId = requireNonEmptyString(pathname.split('/')[2], 'coatColorId');
          const existingCoatColor = await coatColors.getOrThrow(coatColorId);
          if (existingCoatColor.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Coat color not found for current account');
          }
          await coatColors.delete(coatColorId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'coat-colors',
            'delete',
            'coat-color',
            coatColorId,
            `Coat color ${existingCoatColor.name} deleted`,
            'medium',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if (
          (pathname === '/customer-groups' || pathname === '/customer-group' || pathname === '/grupos-de-clientes') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'service.read');
          const search = url.searchParams.get('search') ?? undefined;
          const activeParam = url.searchParams.get('active');
          const segment = url.searchParams.get('segment') ?? undefined;
          const active =
            activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
          const items = await customerGroups.list(principal.user.accountId, {
            search,
            active,
            segment
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'customer-groups',
            'list',
            'customer-group',
            search ?? segment ?? 'all',
            'Customer groups catalog inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/customer-groups' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as CustomerGroupInput;
          const customerGroup = await customerGroups.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'customer-groups',
            'create',
            'customer-group',
            customerGroup.id,
            `Customer group ${customerGroup.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(customerGroup));
          return;
        }

        if (pathname.startsWith('/customer-groups/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const customerGroupId = requireNonEmptyString(pathname.split('/')[2], 'customerGroupId');
          const customerGroup = await customerGroups.getOrThrow(customerGroupId);
          if (customerGroup.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Customer group not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'customer-groups',
            'read',
            'customer-group',
            customerGroup.id,
            `Customer group ${customerGroup.name} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(customerGroup));
          return;
        }

        if (pathname.startsWith('/customer-groups/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const customerGroupId = requireNonEmptyString(pathname.split('/')[2], 'customerGroupId');
          const existingCustomerGroup = await customerGroups.getOrThrow(customerGroupId);
          if (existingCustomerGroup.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Customer group not found for current account');
          }
          const payload = (await readJsonBody(request)) as CustomerGroupInput;
          const customerGroup = await customerGroups.update(customerGroupId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'customer-groups',
            'update',
            'customer-group',
            customerGroup.id,
            `Customer group ${customerGroup.name} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(customerGroup));
          return;
        }

        if (pathname.startsWith('/customer-groups/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'service.write');
          const customerGroupId = requireNonEmptyString(pathname.split('/')[2], 'customerGroupId');
          const existingCustomerGroup = await customerGroups.getOrThrow(customerGroupId);
          if (existingCustomerGroup.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Customer group not found for current account');
          }
          await customerGroups.delete(customerGroupId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'customer-groups',
            'delete',
            'customer-group',
            customerGroupId,
            `Customer group ${existingCustomerGroup.name} deleted`,
            'medium',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if (pathname === '/vaccines-dewormers' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const includeExecutedParam = url.searchParams.get('includeExecuted');
          const filters: PreventiveEventListFilters = {
            dateFrom: url.searchParams.get('dateFrom') ?? undefined,
            dateTo: url.searchParams.get('dateTo') ?? undefined,
            client: url.searchParams.get('client') ?? undefined,
            animal: url.searchParams.get('animal') ?? undefined,
            itemType: url.searchParams.get('itemType') ?? undefined,
            includeExecuted: includeExecutedParam?.toLowerCase() === 'true'
          };
          const items = await preventiveEvents.list(principal.user.accountId, filters);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'list',
            'preventive-event',
            filters.client ?? filters.animal ?? filters.itemType ?? 'all',
            'Preventive events inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/vaccines-dewormers' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as PreventiveEventInput;
          const event = await preventiveEvents.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'create',
            'preventive-event',
            event.id,
            `Preventive event ${event.description} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(event));
          return;
        }

        if (pathname === '/vaccines-dewormers/reminders/email' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request).catch(() => ({}))) as PreventiveEventListFilters;
          const result = await preventiveEvents.prepareBulkEmail(principal.user.accountId, {
            dateFrom: payload.dateFrom,
            dateTo: payload.dateTo,
            client: payload.client,
            animal: payload.animal,
            itemType: payload.itemType,
            includeExecuted: false
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'prepare-email',
            'preventive-event',
            'bulk',
            `Preventive reminder emails prepared for ${result.preparedCount} event(s)`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(result));
          return;
        }

        if (pathname.startsWith('/vaccines-dewormers/') && pathname.endsWith('/execute') && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
          const existingEvent = await preventiveEvents.getOrThrow(eventId);
          if (existingEvent.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Preventive event not found for current account');
          }
          const payload = (await readJsonBody(request)) as PreventiveEventExecuteInput;
          const result = await preventiveEvents.execute(eventId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'execute',
            'preventive-event',
            eventId,
            `Preventive event ${existingEvent.description} executed`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(result));
          return;
        }

        if (pathname.startsWith('/vaccines-dewormers/') && pathname.endsWith('/email') && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
          const existingEvent = await preventiveEvents.getOrThrow(eventId);
          if (existingEvent.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Preventive event not found for current account');
          }
          const event = await preventiveEvents.prepareEmail(eventId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'prepare-email',
            'preventive-event',
            event.id,
            `Preventive reminder email prepared for ${event.description}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(event));
          return;
        }

        if (pathname.startsWith('/vaccines-dewormers/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
          const event = await preventiveEvents.getOrThrow(eventId);
          if (event.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Preventive event not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'read',
            'preventive-event',
            event.id,
            `Preventive event ${event.description} inspected`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(event));
          return;
        }

        if (pathname.startsWith('/vaccines-dewormers/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
          const existingEvent = await preventiveEvents.getOrThrow(eventId);
          if (existingEvent.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Preventive event not found for current account');
          }
          const payload = (await readJsonBody(request)) as PreventiveEventInput;
          const event = await preventiveEvents.update(eventId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'update',
            'preventive-event',
            event.id,
            `Preventive event ${event.description} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(event));
          return;
        }

        if (pathname.startsWith('/vaccines-dewormers/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'service.write');
          const eventId = requireNonEmptyString(pathname.split('/')[2], 'eventId');
          const existingEvent = await preventiveEvents.getOrThrow(eventId);
          if (existingEvent.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Preventive event not found for current account');
          }
          await preventiveEvents.delete(eventId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'vaccines-dewormers',
            'delete',
            'preventive-event',
            eventId,
            `Preventive event ${existingEvent.description} deleted`,
            'medium',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if (pathname === '/responsibility-terms' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const search = url.searchParams.get('search') ?? undefined;
          const activeParam = url.searchParams.get('active');
          const usageContext = url.searchParams.get('usageContext') ?? undefined;
          const active =
            activeParam === null ? undefined : activeParam.toLowerCase() === 'true';
          const items = await responsibilityTerms.list(principal.user.accountId, {
            search,
            active,
            usageContext
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'responsibility-terms',
            'list',
            'responsibility-term',
            search ?? 'all',
            'Responsibility terms inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/responsibility-terms' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'service.write');
          const payload = (await readJsonBody(request)) as ResponsibilityTermInput;
          const term = await responsibilityTerms.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'responsibility-terms',
            'create',
            'responsibility-term',
            term.id,
            `Responsibility term ${term.title} created`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(term));
          return;
        }

        if (pathname.startsWith('/responsibility-terms/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'service.read');
          const termId = requireNonEmptyString(pathname.split('/')[2], 'termId');
          const term = await responsibilityTerms.getOrThrow(termId);
          if (term.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Responsibility term not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'responsibility-terms',
            'read',
            'responsibility-term',
            term.id,
            `Responsibility term ${term.title} inspected`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(term));
          return;
        }

        if (pathname.startsWith('/responsibility-terms/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'service.write');
          const termId = requireNonEmptyString(pathname.split('/')[2], 'termId');
          const existingTerm = await responsibilityTerms.getOrThrow(termId);
          if (existingTerm.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Responsibility term not found for current account');
          }
          const payload = (await readJsonBody(request)) as ResponsibilityTermInput;
          const term = await responsibilityTerms.update(termId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'responsibility-terms',
            'update',
            'responsibility-term',
            term.id,
            `Responsibility term ${term.title} updated`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(term));
          return;
        }

        if (pathname.startsWith('/responsibility-terms/') && request.method === 'DELETE') {
          const principal = requirePrincipal(request, 'service.write');
          const termId = requireNonEmptyString(pathname.split('/')[2], 'termId');
          const existingTerm = await responsibilityTerms.getOrThrow(termId);
          if (existingTerm.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Responsibility term not found for current account');
          }
          await responsibilityTerms.delete(termId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'responsibility-terms',
            'delete',
            'responsibility-term',
            termId,
            `Responsibility term ${existingTerm.title} deleted`,
            'high',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        // --- Access Control + Audit (delegated) ---
        if (await handleAccessControlRoutes(pathname, request, response, correlationId, {
          accessControl,
          users,
          audit,
          requirePrincipal
        })) { return; }

        // --- Inpatient (sectors, beds, inpatient stays) (delegated) ---
        if (await handleInpatientRoutes(pathname, request, response, correlationId, {
          inpatient,
          sectorBedService,
          audit,
          requirePrincipal
        })) { return; }


        // --- CEP Lookup (ViaCEP) ---

        if (pathname === '/cep/lookup' && request.method === 'GET') {
          const cep = url.searchParams.get('cep');
          if (!cep) {
            response.statusCode = 400;
            response.end(
              JSON.stringify({
                code: 'VALIDATION_ERROR',
                message: 'CEP parameter required',
                correlationId
              })
            );
            return;
          }
          const cleanCep = cep.replace(/\D/g, '');
          if (cleanCep.length !== 8) {
            response.statusCode = 400;
            response.end(
              JSON.stringify({
                code: 'VALIDATION_ERROR',
                message: 'CEP must have 8 digits',
                correlationId
              })
            );
            return;
          }
          try {
            const viaCepResp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
              signal: AbortSignal.timeout(5000)
            });
            const viaCepData = (await viaCepResp.json()) as Record<string, unknown>;
            if (viaCepData.erro) {
              response.statusCode = 404;
              response.end(
                JSON.stringify({ code: 'NOT_FOUND', message: 'CEP not found', correlationId })
              );
              return;
            }
            response.statusCode = 200;
            response.end(
              JSON.stringify({
                cep: viaCepData.cep,
                street: viaCepData.logradouro,
                complement: viaCepData.complemento,
                district: viaCepData.bairro,
                city: viaCepData.localidade,
                state: viaCepData.uf,
                ibge: viaCepData.ibge,
                found: true
              })
            );
          } catch (err) {
            response.statusCode = 502;
            response.end(
              JSON.stringify({
                code: 'SERVICE_UNAVAILABLE',
                message: 'CEP service unavailable',
                correlationId
              })
            );
          }
          return;
        }

        // --- Discharges (delegated) ---
        if (await handleDischargesRoutes(pathname, request, response, correlationId, {
          discharges,
          audit,
          requirePrincipal
        })) { return; }

        // --- Billing (delegated) ---
        if (await handleBillingRoutes(pathname, request, response, correlationId, {
          billing,
          audit,
          requirePrincipal,
          enforceAbac
        })) { return; }

        // --- Prescription Executions (delegated) ---
        if (await handlePrescriptionExecutionsRoutes(pathname, request, response, correlationId, {
          prescriptionExecutions,
          audit,
          requirePrincipal
        })) { return; }

        // --- Inventory (delegated) ---
        if (await handleInventoryRoutes(pathname, request, response, correlationId, {
          inventory,
          audit,
          requirePrincipal,
          enforceAbac
        })) { return; }

        // --- Inventory warehouses (delegated) ---
        if (await handleInventoryWarehousesRoutes(pathname, request, response, correlationId, {
          audit,
          requirePrincipal
        })) { return; }

        // --- Inventory manufacturers (delegated) ---
        if (await handleInventoryManufacturersRoutes(pathname, request, response, correlationId, {
          audit,
          requirePrincipal
        })) { return; }

        // --- Inventory product groups (delegated) ---
        if (await handleInventoryProductGroupsRoutes(pathname, request, response, correlationId, {
          audit,
          requirePrincipal
        })) { return; }

        // --- Company sectors (delegated) ---
        if (await handleCompanySectorsRoutes(pathname, request, response, correlationId, {
          audit,
          requirePrincipal
        })) { return; }

        // --- Measurement units (delegated) ---
        if (await handleMeasurementUnitsRoutes(pathname, request, response, correlationId, {
          audit,
          requirePrincipal
        })) { return; }

        // --- Surgery (delegated) ---
        if (await handleSurgeryRoutes(pathname, request, response, correlationId, {
          surgery,
          audit,
          requirePrincipal
        })) { return; }

        // --- Webhooks (delegated to webhooks-routes) ---
        const webhooksHandled = handleWebhooksRoutes(pathname, request, response, correlationId, {
          webhooks,
          audit,
          requirePrincipal
        });
        if (await webhooksHandled) return;

        // --- API Keys (delegated) ---
        if (await handleApiKeysRoutes(pathname, request, response, correlationId, {
          apiKeys,
          accessControl,
          audit,
          enforceAbac,
          requirePrincipal
        })) { return; }

        // --- Expenses Catalog (delegated) ---
        if (await handleExpensesCatalogRoutes(pathname, request, response, correlationId, {
          audit,
          requirePrincipal
        })) { return; }

        // --- Internal Events (delegated) ---
        if (handleInternalEventsRoutes(pathname, request, response, correlationId, {
          eventBus,
          requirePrincipal
        })) { return; }

        // --- Payments (delegated to payments-routes) ---
        const paymentsHandled = handlePaymentsRoutes(pathname, request, response, correlationId, {
          eventBus,
          paymentGateway,
          apiKeys,
          audit,
          cardTransactions
        });
        if (await paymentsHandled) return;

        const emailHandled = await handleEmailRoutes(pathname, request, response, correlationId, {
          emailGateway,
          emailDeliveries,
          emailMode: useEmailMock ? 'mock' : 'provider',
          emailFrom: options.emailFrom ?? 'noreply@cvg-his.local',
          resendConfigured: Boolean(options.resendApiKey),
          apiKeys,
          audit
        });
        if (emailHandled) return;

        const smsHandled = await handleSmsRoutes(pathname, request, response, correlationId, {
          smsGateway,
          smsDeliveries,
          smsMode: useSmsMock ? 'mock' : 'provider',
          smsFrom: options.smsFrom ?? 'CVGHIS',
          smsConfigured: Boolean(options.smsApiKey),
          apiKeys,
          audit
        });
        if (smsHandled) return;

        const googleCalendarHandled = await handleGoogleCalendarRoutes(
          pathname,
          request,
          response,
          correlationId,
          {
            scheduling,
            googleCalendarGateway,
            googleCalendarSyncs,
            googleCalendarMode: useGoogleCalendarMock ? 'mock' : 'provider',
            googleCalendarConfigured: hasGoogleCalendarCredentials,
            googleCalendarCalendarId: options.googleCalendarCalendarId,
            apiKeys,
            audit
          }
        );
        if (googleCalendarHandled) return;

        const laboratoryIntegrationHandled = await handleLaboratoryIntegrationRoutes(
          pathname,
          request,
          response,
          correlationId,
          {
            laboratory,
            laboratoryResultImports,
            apiKeys,
            audit
          }
        );
        if (laboratoryIntegrationHandled) return;

        if (await handleMlRoutes(pathname, request, response, correlationId, {
          scheduling,
          laboratory,
          ocrFiscal,
          demandForecasting,
          labAnomalyDetection,
          telemetry: mlTelemetry,
          audit,
          featureFlags,
          requirePrincipal
        })) { return; }

        // --- WhatsApp (delegated) ---
        if (await handleWhatsAppRoutes(pathname, request, response, correlationId, {
          scheduling,
          audit,
          requirePrincipal,
          notificationsWhatsappInboundActionsEnabled:
            featureFlags.notificationsWhatsappInboundActionsEnabled
        })) { return; }

        response.statusCode = 404;
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Route not found', correlationId })
        );
      }));
    } catch (error) {
      span.attributes['error.type'] =
        error instanceof Error ? error.constructor.name : typeof error;
      logger.error('request failed', { correlationId, error });
      const errorResponse = toErrorResponse(error, correlationId);
      response.statusCode = errorResponse.statusCode;
      response.end(JSON.stringify(errorResponse.body));
    }
  }

  function requirePrincipal(request: IncomingMessage, permissionCode: string) {
    const accessToken = extractBearerToken(readHeader(request, 'authorization'));
    if (!accessToken) {
      throw new AuthenticationError();
    }

    const principal = auth.authenticateAccessToken(accessToken);
    accessControl.assertAuthorized({
      actor: principal.user,
      access: principal.access,
      permissionCode,
      accountId: principal.user.accountId
    });
    return principal;
  }

  async function requireApiKey(request: IncomingMessage, permissionCode: string) {
    const apiKeyValue = readHeader(request, 'x-api-key') ?? readHeader(request, 'X-API-Key');
    if (!apiKeyValue) {
      throw new AuthenticationError('API key required');
    }

    const apiKey = await apiKeys.validate(apiKeyValue);
    if (!apiKey) {
      throw new AuthenticationError('Invalid API key');
    }

    if (!apiKey.permissions.includes(permissionCode)) {
      throw new ForbiddenError(`API key lacks required permission: ${permissionCode}`);
    }

    void apiKeys.updateLastUsed(apiKey.id);
    return { apiKey };
  }

  function sanitizeApiKey(apiKey: ApiKeySummary): Omit<ApiKeySummary, 'keyHash'> {
    const { keyHash: _keyHash, ...safe } = apiKey;
    return safe;
  }

  async function syncQueueWithEncounter(
    encounterId: string,
    status: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed'
  ) {
    const encounter = encounters.getOrThrow(encounterId as never);
    if (!encounter.queueEntryId) {
      return;
    }

    if (status === 'closed') {
      await scheduling.completeQueueEntry(encounter.queueEntryId);
      return;
    }

    if (status === 'reception') {
      return;
    }

    const queueStatus =
      status === 'in_triage' ? 'in_triage' : status === 'in_care' ? 'in_care' : 'observation';
    await scheduling.transitionQueueForEncounter(encounter.queueEntryId, queueStatus);
  }

  function appendAudit(
    actorId: string,
    accountId: string,
    module: string,
    action: string,
    entityType: string,
    entityId: string,
    payloadSummary: string,
    riskLevel: 'low' | 'medium' | 'high',
    correlationId: string
  ) {
    audit.write({
      actorId,
      accountId: accountId as never,
      module,
      action,
      entityType,
      entityId,
      payloadSummary,
      riskLevel,
      correlationId
    });
  }

}

function readHeader(request: IncomingMessage, headerName: string): string | undefined {
  const value = request.headers[headerName];
  return typeof value === 'string' ? value : undefined;
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    throw new ValidationError('Request body is required');
  }

  const body = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(body) as unknown;
  } catch (error) {
    throw new ValidationError('Request body must be valid JSON', {
      cause: error
    });
  }
}

// --- Body Validation Helper (F06 Hardening) ---

interface FieldSpec {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  enum?: readonly string[];
}

function validateRequestBody(
  body: Record<string, unknown>,
  fields: Record<string, FieldSpec>,
  correlationId: string
): void {
  for (const [key, spec] of Object.entries(fields)) {
    const value = body[key];

    if (spec.required && (value === undefined || value === null)) {
      throw new ValidationError(`Field '${key}' is required`, { correlationId, field: key });
    }

    if (value === undefined || value === null) continue;

    // Type check
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== spec.type) {
      throw new ValidationError(
        `Field '${key}' must be of type '${spec.type}', got '${actualType}'`,
        { correlationId, field: key }
      );
    }

    // String validations
    if (spec.type === 'string' && typeof value === 'string') {
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        throw new ValidationError(
          `Field '${key}' must have at least ${spec.minLength} characters`,
          { correlationId, field: key }
        );
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        throw new ValidationError(`Field '${key}' must have at most ${spec.maxLength} characters`, {
          correlationId,
          field: key
        });
      }
      if (spec.enum && !spec.enum.includes(value)) {
        throw new ValidationError(`Field '${key}' must be one of: ${spec.enum.join(', ')}`, {
          correlationId,
          field: key
        });
      }
    }
  }
}

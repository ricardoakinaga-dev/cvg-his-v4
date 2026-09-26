import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import {
  getDatabaseTransactionScope,
  getPool,
  getTenantTransactionContext,
  runInTenantTransaction,
  runWithoutDatabaseTransactionScope,
  withTenantTransaction
} from '@cvg-his-v2/shared-database';
import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';
import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import { isSecureRequest } from './http/security-headers.js';
import { requireApiKey as requireApiKeyHelper, sanitizeApiKey } from './helpers/auth-helpers.js';
import { createAuthRateLimiter } from './http/auth-rate-limiter.js';
import {
  assertPixProviderWebhookReadiness,
  handlePixProviderWebhookRoutes,
  PIX_PROVIDER_WEBHOOK_PATH,
  type PixProviderEventIngressRepository,
  type PixProviderWebhookRateLimiter
} from './routes/pix-provider-webhook-routes.js';
import type { PixProviderWebhookKey } from './pix-provider-webhook-verifier.js';
import {
  HmacLaboratoryProviderSignatureVerifier,
  type LaboratoryProviderKey
} from './laboratory-provider-ingress.js';
import type { SecretsManager } from '@cvg-his-v2/secrets';
import { MAX_ATTACHMENT_JSON_BODY_BYTES } from '@cvg-his-v2/shared-contracts';
import type {
  AddInpatientProgressRequest,
  ArchiveClinicalEntryRequest,
  AssignBedRequest,
  CloseEncounterRequest,
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  CreateClinicalEntryRequest,
  CreateDischargeRequest,
  CreateEncounterRequest,
  CreateInpatientAdmissionRequest,
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  CreatePrescriptionExecutionRequest,
  CreateSectorRequest,
  CreateBedRequest,
  CreateSurgeryCaseRequest,
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
  AppError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  toErrorResponse
} from '@cvg-his-v2/shared-errors';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import {
  requireAccountId,
  resolveTenantFromRequest,
  runWithTenantContext,
  withTenantQuery
} from '@cvg-his-v2/tenant-context';
import type {
  AuthenticatedPrincipal,
  ClinicalHandoffPriority,
  ClinicalHandoffStatus,
  CorrelationId,
  ModuleName,
  SchedulingAppointmentSummary,
  AccountId,
  CacheSyncBus
} from '@cvg-his-v2/shared-types';
import {
  createInMemoryOidcStateStore,
  createStatelessOidcStateStore,
  getClientIp,
  handleAuthRoutes
} from './routes/auth-routes.js';
import { handleSetupRoutes } from './routes/setup-routes.js';
import { handleOpenApiRoutes } from './routes/openapi-routes.js';
import { handleFiscalRoutes } from './routes/fiscal-routes.js';
import { handleHealthRoutes, resolveRedisHealthStatus } from './routes/health-routes.js';
import { handleLaboratoryRoutes } from './routes/laboratory-routes.js';
import { handleLgpdRoutes } from './routes/lgpd-routes.js';
import { handlePaymentsRoutes } from './routes/payments-routes.js';
import { handleEmailRoutes } from './routes/email-routes.js';
import { handleSmsRoutes } from './routes/sms-routes.js';
import { handleFinancialRoutes } from './routes/financial-routes.js';
import {
  assertEncounterHasNoCashReceipt,
  handleEncounterCashReceiptRoutes
} from './routes/encounter-cash-receipt-routes.js';
import { handleCashRoutes } from './routes/cash-routes.js';
import { handleSchedulingRoutes } from './routes/scheduling-routes.js';
import { handleAgendaConfigRoutes } from './routes/agenda-config-routes.js';
import { handleGoogleCalendarRoutes } from './routes/google-calendar-routes.js';
import {
  assertLaboratoryProviderIngressReadiness,
  handleLaboratoryIntegrationRoutes
} from './routes/laboratory-integration-routes.js';
import { handleMlRoutes } from './routes/ml-routes.js';
import { handleSoc2Routes } from './routes/soc2-routes.js';
import { handleWebhooksRoutes } from './routes/webhooks-routes.js';
import { handleFeatureFlagsRoutes } from './routes/feature-flags-routes.js';
import { handleAdministrativeReportsRoutes } from './routes/administrative-reports-routes.js';
import { handleDischargesRoutes } from './routes/discharges-routes.js';
import { handleBillingRoutes } from './routes/billing-routes.js';
import { EncounterCashReceiptCommand } from './commands/encounter-cash-receipt.js';
import { EncounterCashReceiptReversalCommand } from './commands/encounter-cash-receipt-reversal.js';
import { RequestEncounterPixPaymentCommand } from './commands/request-encounter-pix-payment.js';
import { assertEncounterHasNoActivePixAttempt } from './encounter-pix-payment-attempt-repository.js';
import {
  applyPixPaymentAttemptRateLimit,
  handlePixPaymentAttemptRoutes,
  requirePixPaymentAttemptIdempotencyKey
} from './routes/pix-payment-attempt-routes.js';
import { handleExpensesCatalogRoutes } from './routes/expenses-catalog-routes.js';
import { handlePrescriptionRoutes } from './routes/prescription-routes.js';
import { handlePrescriptionExecutionsRoutes } from './routes/prescription-executions-routes.js';
import { handleInventoryRoutes } from './routes/inventory-routes.js';
import { handleInventoryWarehousesRoutes } from './routes/inventory-warehouses-routes.js';
import { handleInventoryManufacturersRoutes } from './routes/inventory-manufacturers-routes.js';
import { handleInventoryProductGroupsRoutes } from './routes/inventory-product-groups-routes.js';
import { handleCompanySectorsRoutes } from './routes/company-sectors-routes.js';
import { handleMeasurementUnitsRoutes } from './routes/measurement-units-routes.js';
import { handleCommercialRoutes } from './routes/commercial-routes.js';
import { handleCommissionRoutes } from './routes/commission-routes.js';
import { handleReportsRoutes } from './routes/reports-routes.js';
import { handleAdvancePaymentsRoutes } from './routes/advance-payments-routes.js';
import { handleMarketingRoutes } from './routes/marketing-routes.js';
import { handleSurgeryRoutes } from './routes/surgery-routes.js';
import { handleWhatsAppRoutes } from './routes/whatsapp-routes.js';
import { handleAccessControlRoutes } from './routes/access-control-routes.js';
import { handleInpatientListRoute, handleInpatientRoutes } from './routes/inpatient-routes.js';
import { handleNotificationReadRoutes } from './routes/notification-read-routes.js';
import { handleNotificationWriteRoutes } from './routes/notification-write-routes.js';
import { handleChaosExperimentListRoute } from './routes/chaos-experiment-list-route.js';
import {
  handleClinicalHandoffDetailReadRoute,
  handleClinicalHandoffsReadRoute
} from './routes/clinical-handoffs-read-routes.js';
import { handleClinicalHandoffSendRoute } from './routes/clinical-handoff-send-route.js';
import { handleClinicalHandoffAcknowledgeRoute } from './routes/clinical-handoff-acknowledge-route.js';
import { handleClinicalHandoffWorkflowRoutes } from './routes/clinical-handoff-workflow-routes.js';
import { handleEncounterListRoute } from './routes/encounter-list-route.js';
import { handleCepLookupRoute } from './routes/cep-lookup-route.js';
import { handleMetricsReadRoute } from './routes/metrics-read-route.js';
import { handleApiKeysRoutes } from './routes/api-keys-routes.js';
import { handleInternalEventsRoutes } from './routes/internal-events-routes.js';
import {
  isCashDrawerMutationPath,
  paginateList,
  parseIncludeArchived
} from './request-boundaries.js';
import {
  handlePixProviderSettlementRoutes,
  type PixProviderSettlementDlqRepository
} from './routes/pix-provider-settlement-routes.js';
import { handleCounterSalesRoutes } from './routes/counter-sales-routes.js';
import { handleOwnersRoutes } from './routes/owners-routes.js';
import { handlePatientsRoutes } from './routes/patients-routes.js';
import { handleVetusImportRoutes } from './routes/vetus-import-routes.js';
import { handleUsersStaffQuotesRoutes } from './routes/users-staff-quotes-routes.js';
import { handleProductServiceCatalogRoutes } from './routes/product-service-catalog-routes.js';
import { handleAnimalCatalogRoutes } from './routes/animal-catalog-routes.js';
import { handleCustomerGroupRoutes } from './routes/customer-group-routes.js';
import { handleResponsibilityTermRoutes } from './routes/responsibility-term-routes.js';
import { handlePreventiveEventRoutes } from './routes/preventive-event-routes.js';
import { handleTriageReadRoutes } from './routes/triage-read-routes.js';
import { handleTriageCreateRoute } from './routes/triage-create-routes.js';
import { handleTriageUpdateRoute } from './routes/triage-update-routes.js';
import {
  handleEncounterReadRoutes,
  handleEncounterTimelineRoute
} from './routes/encounter-read-routes.js';
import {
  handleMedicalRecordReadRoutes,
  handleMedicalRecordTimelineRoute
} from './routes/medical-record-read-routes.js';
import { handleAttachmentReadRoutes } from './routes/attachment-read-routes.js';
import { handleAttachmentContentReadRoute } from './routes/attachment-content-read-route.js';
import { handleAttachmentUploadRoute } from './routes/attachment-upload-route.js';
export { decodeAttachmentContent } from './helpers/attachment-upload-content.js';
import { handleEncounterDeleteRoutes } from './routes/encounter-delete-routes.js';
import { handleAttachmentDownloadUrlRoutes } from './routes/attachment-download-url-routes.js';
import {
  isDatabaseFailureMutationPath,
  isDatabaseFailurePublicMutationPath
} from './database-chaos-write-guard.js';
import {
  ChaosEngine,
  DATABASE_FAILURE_ID,
  databaseFailureExperiment,
  redisFailureExperiment,
  networkLatencyExperiment,
  workerFailureExperiment,
  apiLatencyExperiment,
  providerFailureExperiment,
  chaosMetrics
} from '@cvg-his-v2/chaos';
import type { SectorBedServiceOptions } from '@cvg-his-v2/module-inpatient';
import { createApiRuntime, type RuntimeRepositories } from './runtime.js';
import { createClinicalOperationalMetricsProvider } from './clinical-operational-metrics.js';
import { LocalPixPaymentGateway, PagarMePaymentGatewayAdapter } from './payment-gateway.js';
import { LocalEmailGateway, ResendEmailGatewayAdapter } from './email-gateway.js';
import { InMemoryEmailDeliveryRepository } from './email-delivery-repository.js';
import { LocalSmsGateway, TwilioSmsGatewayAdapter } from './sms-gateway.js';
import { InMemorySmsDeliveryRepository } from './sms-delivery-repository.js';
import {
  GoogleCalendarGatewayAdapter,
  LocalGoogleCalendarGateway
} from './google-calendar-gateway.js';
import { InMemoryGoogleCalendarSyncRepository } from './google-calendar-sync-repository.js';
import { InMemoryLaboratoryResultImportRepository } from './laboratory-result-import-repository.js';
import { createTenantCommandRunner } from './helpers/tenant-command.js';
import { acquireAuthorizationTransactionLock } from './helpers/authorization-transaction-lock.js';
import { getInitializedDatabasePool } from './helpers/initialized-database-pool.js';
import {
  createReplayGuard,
  extractReportCommandReference,
  idempotencyAuthorizationPermissions,
  isDischargeMutationPath,
  isInpatientMutationPath,
  isMedicalRecordsMutationPath,
  isPrescriptionExecutionMutationPath,
  isReplayGuardExempt,
  resolveReportCommandReportId
} from './helpers/idempotency-authorization.js';
import { createVetusCacheRefresher } from './helpers/vetus-cache-recovery.js';
import { createResponsibilityTermStore } from './repositories/responsibility-term-store.js';
import {
  createAnimalSpeciesStore,
  createBreedStore,
  createCoatColorStore
} from './repositories/animal-catalog-stores.js';
import { createCustomerGroupStore } from './repositories/customer-group-store.js';
import { createPreventiveEventStore } from './repositories/preventive-event-store.js';
import { readJsonBody, readJsonBodyOrEmpty } from './helpers/request-body.js';
import {
  createEncounterAccountGuard,
  createEncounterReadThroughGuard,
  createEncounterQueueSynchronizer,
  readHeader,
  validateRequestBody
} from './helpers/api-server-boundaries.js';
import {
  applyBufferedResponse,
  createBufferedResponse,
  type BufferedResponseSnapshot
} from './helpers/response-buffer.js';
import {
  verifyAttachmentDownloadToken,
  type AttachmentDownloadClaims
} from './helpers/attachment-download-token.js';
import {
  getMetricsText,
  decrementActiveRequests,
  incrementActiveRequests,
  updateAppMetrics,
  updateDatabasePoolMetrics,
  refreshClinicalOperationalMetrics,
  type ClinicalOperationalMetricsSnapshot,
  createFeatureFlagMetricsCollector
} from './metrics.js';
import {
  describeChaosExperiment,
  resolveOperationalRuntimeState
} from './chaos-operational-state.js';
import {
  tracingMiddleware,
  createSpan,
  withSpanContext,
  injectTraceContext,
  formatTraceParent,
  sanitizeHttpTarget,
  type Span,
  type TraceableIncomingMessage
} from './tracing.js';
import { assertDistributedStateReadiness } from './distributed-runtime-readiness.js';
import { attachHttpRequestTelemetry } from './http-request-telemetry.js';
export { assertDistributedStateReadiness } from './distributed-runtime-readiness.js';
import { generateSLOReport, getSLOConfigs } from './slos.js';
import type { AttachmentSecurityScanner, FileStorage } from '@cvg-his-v2/module-attachments';
import { getAppState } from './app-state.js';
import {
  InMemoryWebAuthnChallengeStore,
  InMemoryWebAuthnRepository,
  WebAuthnServiceImpl,
  type WebAuthnChallengeStore,
  type WebAuthnRepository
} from '@cvg-his-v2/module-mfa';
import {
  AbacEngine,
  type ActorAttributes,
  type ResourceAttributes,
  type EnvironmentAttributes
} from '@cvg-his-v2/module-access-control';
import { type OIDCConfig } from '@cvg-his-v2/module-auth';
import {
  MfaControlService,
  VulnerabilityControlService,
  AccessReviewControlService,
  DisasterRecoveryControlService,
  IncidentResponseControlService
} from '@cvg-his-v2/module-soc2';
import {
  FiscalService,
  type FiscalNfseRuntimeConfig,
  type NfseIssuer,
  type NfseProvider
} from '@cvg-his-v2/module-fiscal';
import { DatabaseFeatureFlagRepository } from '@cvg-his-v2/module-feature-flags';
import type { JsonValue, TenantUnitOfWork } from '@cvg-his-v2/shared-database';
import type { EvaluationContext } from '@cvg-his-v2/shared-feature-flags';
import { createApiFeatureFlags, type ApiFeatureFlagsSnapshot } from './feature-flags.js';
import {
  DemandForecastingService,
  LabAnomalyDetectionService,
  OcrFiscalService
} from '@cvg-his-v2/module-ml';
import { MlTelemetryService } from './ml-telemetry.js';
import { InMemoryAgendaConfigRepository } from './repositories/agenda-config-repository.js';
import {
  InMemoryVetusImportLogRepository,
  type VetusImportLogRepository
} from './repositories/vetus-import-log-repository.js';
import type { WorkflowTaskService } from '@cvg-his-v2/module-workflows';
import { handleWorkflowTaskRoutes } from './routes/workflow-task-routes.js';
import {
  createApiWorkflowTaskService,
  createWorkflowTaskSchemaReadinessGuard
} from './helpers/workflow-task-runtime.js';
import { PagarMePixChargeClient } from './pagarme-pix-charge-client.js';
import { handlePagarMePixWebhookRoutes } from './routes/pagarme-pix-webhook-routes.js';
export function buildAuthenticatedActorAttributes(
  principal: AuthenticatedPrincipal,
  memberships: {
    readonly teams: readonly { readonly id: string }[];
    readonly sectors: readonly { readonly id: string; readonly code: string }[];
  }
): ActorAttributes {
  return {
    userId: principal.user.id as never,
    accountId: principal.user.accountId as never,
    roleCodes: principal.access.roleCodes,
    department: undefined,
    jobTitle: undefined,
    staffId: undefined,
    branchIds: [],
    teamIds: memberships.teams.map((team) => team.id),
    sectorIds: memberships.sectors.map((sector) => sector.id),
    sectorCodes: memberships.sectors.map((sector) => sector.code),
    isActive: principal.user.status === 'active'
  };
}
export interface ApiServerOptions {
  readonly appName: string;
  readonly environment: string;
  readonly version: string;
  readonly corsAllowedOrigins?: readonly string[];
  readonly authSecret: string;
  readonly authVerifierSecrets?: readonly string[];
  /** Dedicated collector credential. Browser/session tokens never authorize metrics. */
  readonly metricsAuthToken?: string;
  /** Optional authenticated operator access for the SLO report UI surface. */
  readonly authorizeSlo?: (request: IncomingMessage) => Promise<void>;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly authRateLimitMaxRequests?: number;
  readonly authRateLimitWindowMs?: number;
  readonly authRateLimiter?: ApiRateLimiter;
  readonly pixPaymentAttemptRateLimiter?: ApiRateLimiter;
  readonly trustedProxyCidrs?: readonly string[];
  readonly enableMfa?: boolean;
  readonly mfaEncryptionKey?: string;
  readonly mfaEncryptionKeyVersion?: string;
  readonly mfaEncryptionKeyring?: Readonly<Record<string, string>>;
  /** Authoritative WebAuthn RP ID, supplied by deployment configuration. */
  readonly webauthnRpId?: string;
  /** Browser origins accepted by the WebAuthn verifier. */
  readonly webauthnOrigins?: readonly string[];
  readonly repositories?: RuntimeRepositories;
  /** Durable clinical workflow/reminder control plane. Tests may inject an in-memory service. */
  readonly workflowTaskService?: WorkflowTaskService;
  readonly clinicalOperationalMetricsProvider?: () => Promise<ClinicalOperationalMetricsSnapshot>;
  readonly fileStorage?: FileStorage;
  readonly attachmentScanner?: AttachmentSecurityScanner;
  readonly sectorBedOptions?: SectorBedServiceOptions;
  readonly unitOfWork?: TenantUnitOfWork;
  /** Optional database transaction primitive for database-backed runtimes that do not expose idempotency UoW. */
  readonly tenantTransaction?: <T>(
    accountId: string,
    command: () => Promise<T>,
    metadata?: { readonly actorUserId: string; readonly correlationId: string }
  ) => Promise<T>;
  /** Explicitly disables partial clinical repositories in degraded/local runtimes. */
  readonly medicalRecordsPersistenceMode?: 'repositories' | 'memory';
  /** R2-ARC-03: cross-replica cache synchronization bus (see ApiRuntimeOptions.cacheSync). */
  readonly cacheSync?: CacheSyncBus;
  readonly featureFlagsProvider?: string;
  /** Pre-resolved feature flags snapshot (GAP-06: avoids async call inside createApiServer) */
  readonly featureFlags?: ApiFeatureFlagsSnapshot;
  /** Gates distributed runtime state (Redis-backed session, encounter timeline, etc.) */
  readonly runtimeDistributedStateEnabled?: boolean;
  /** Keeps canonical seed principals available with repository-backed runtime. */
  readonly preserveSeedUsersWithRepository?: boolean;
  /** Keeps canonical owner/patient registry seeds available with repository-backed runtime. */
  readonly preserveSeedMasterDataWithRepository?: boolean;
  /** Enforces UUID entity identifiers for the canonical SQL persistence mode. */
  readonly requireUuidEntityIdentifiers?: boolean;
  /** Keeps auxiliary catalog stores aligned with the persistence mode selected by bootstrap. */
  readonly useDatabaseCatalogStores?: boolean;
  readonly vetusImportLogRepository?: VetusImportLogRepository;
  /** Token required by the first-run setup wizard. Setup is disabled when absent. */
  readonly setupBootstrapToken?: string;
  readonly pagarmeApiKey?: string;
  readonly pagarmePixKey?: string;
  readonly nfseProvider?: NfseProvider;
  readonly nfseApiUrl?: string;
  readonly nfseApiKey?: string;
  readonly nfseMunicipalityCode?: string;
  readonly nfseCertificate?: Buffer;
  readonly nfseIssuer?: NfseIssuer;
  readonly nfseRegime?: FiscalNfseRuntimeConfig['regime'];
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
  readonly whatsappWebhookSecret?: string;
  /** Redis URL for distributed rate limiting. When set, auth rate limiter uses Redis backend. */
  readonly redisUrl?: string;
  /** Key-bound synthetic PIX webhook credentials. Never log or expose secret bytes. */
  readonly pixProviderWebhookKeyring?: ReadonlyMap<string, PixProviderWebhookKey>;
  /** Explicit local/test capability switch; never enable in production-like environments. */
  readonly pixProviderWebhookSyntheticEnabled?: boolean;
  /** Durable receipt+delivery repository for the synthetic PIX callback. */
  readonly pixProviderEventIngressRepository?: PixProviderEventIngressRepository;
  /** Tenant-scoped operator surface for terminal PIX settlement deliveries. */
  readonly pixProviderSettlementDlqRepository?: PixProviderSettlementDlqRepository;
  /** Injectable rate limiter for the public synthetic PIX callback. */
  readonly pixProviderWebhookRateLimiter?: PixProviderWebhookRateLimiter;
  /** Account-bound HMAC keys for the local equipment-bridge ingress. */
  readonly laboratoryProviderKeyring?: ReadonlyMap<string, LaboratoryProviderKey>;
  /** Injectable clock for deterministic local/test equipment-bridge verification. */
  readonly laboratoryProviderNowSeconds?: () => number;
  /** Secrets manager for reading credentials at startup. Uses EnvSecretsProvider when omitted. */
  readonly secretsManager?: SecretsManager;
}
export type ApiRateLimiter = Pick<ReturnType<typeof createAuthRateLimiter>, 'check'> &
  Partial<Pick<ReturnType<typeof createAuthRateLimiter>, 'healthCheck' | 'close'>>;
export type ApiServer = ReturnType<typeof createServer> & {
  readonly ready: Promise<void>;
  readonly closeDependencies: () => Promise<void>;
  readonly assertDistributedRuntimeReadiness: () => Promise<void>;
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
  'accept, authorization, content-type, content-encoding, idempotency-key, x-api-key, x-correlation-id, x-request-id, x-lab-provider-key-id, x-lab-timestamp, x-lab-signature';
const DEFAULT_CORS_EXPOSE_HEADERS =
  'x-correlation-id, x-request-id, x-trace-id, traceparent, tracestate';
const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const OIDC_STATE_TTL_MS = 10 * 60 * 1000;
function configuredMetricsAuthToken(
  options: Pick<ApiServerOptions, 'metricsAuthToken'>
): string | undefined {
  return options.metricsAuthToken?.trim() || process.env['METRICS_AUTH_TOKEN']?.trim() || undefined;
}

function resolveRequestCorrelationId(): string {
  // Never trust caller-selected values here: correlation IDs are copied into
  // logs and durable event metadata, so even well-shaped input can contain PII.
  return createCorrelationId('api');
}

function registerChaosExperimentOnce(chaos: ChaosEngine, experiment: { id: string }): void {
  const alreadyRegistered = chaos.listExperiments().some((item) => item.id === experiment.id);
  if (!alreadyRegistered) {
    chaos.register(experiment as never);
  }
}
function isLocalDevelopmentOrTestEnvironment(environment: string): boolean {
  const normalized = environment.trim().toLowerCase();
  return normalized === 'development' || normalized === 'dev' || normalized === 'test';
}
export function assertWebAuthnDurableStateReadiness(options: {
  readonly environment: string;
  readonly enabled: boolean;
  readonly credentialRepository?: WebAuthnRepository;
  readonly challengeStore?: WebAuthnChallengeStore;
  readonly verifierConfigured?: boolean;
}): void {
  if (!options.enabled || isLocalDevelopmentOrTestEnvironment(options.environment)) {
    return;
  }
  const missing: string[] = [];
  if (
    !options.credentialRepository ||
    options.credentialRepository instanceof InMemoryWebAuthnRepository
  ) {
    missing.push('credential repository');
  }
  if (!options.challengeStore || options.challengeStore instanceof InMemoryWebAuthnChallengeStore) {
    missing.push('challenge store');
  }
  if (missing.length > 0) {
    missing.push('full FIDO2 verifier');
    throw new Error(
      `Production-like WebAuthn requires durable WebAuthn state (${missing.join(', ')})`
    );
  }
  if (!options.verifierConfigured) {
    throw new Error(
      'Production-like WebAuthn is disabled until an authoritative RP ID and browser origin are configured'
    );
  }
}
export function assertProductionProviderReadiness(
  options: Pick<
    ApiServerOptions,
    | 'pagarmeApiKey'
    | 'pagarmePixKey'
    | 'nfseProvider'
    | 'nfseApiUrl'
    | 'nfseApiKey'
    | 'nfseMunicipalityCode'
    | 'nfseCertificate'
    | 'nfseIssuer'
    | 'pixMockMode'
    | 'resendApiKey'
    | 'emailMockMode'
    | 'smsApiKey'
    | 'smsMockMode'
    | 'googleCalendarAccessToken'
    | 'googleCalendarCalendarId'
    | 'googleCalendarMockMode'
    | 'attachmentScanner'
    | 'fileStorage'
  > & { readonly environment: string }
): void {
  if (!isProductionLikeEnvironment(options.environment)) {
    return;
  }
  const missingProviders: string[] = [];
  if (options.pixMockMode === true || !options.pagarmeApiKey || !options.pagarmePixKey) {
    missingProviders.push('Pagar.me PIX (PAGARME_API_KEY/PAGARME_PIX_KEY)');
  }
  if (
    !options.nfseProvider ||
    !options.nfseApiUrl ||
    !options.nfseMunicipalityCode ||
    // The emitter has no PFX/XML signing path yet: a certificate alone cannot
    // issue documents, so only an API credential makes the provider usable.
    !options.nfseApiKey?.trim() ||
    !options.nfseIssuer
  ) {
    missingProviders.push(
      'NFS-e municipal provider (NFSE_PROVIDER/NFSE_API_URL/NFSE_MUNICIPALITY_CODE/NFSE_API_KEY/NFSE_ISSUER_JSON; certificate-only signing is not supported)'
    );
  }
  if (options.emailMockMode === true || !options.resendApiKey) {
    missingProviders.push('Resend (RESEND_API_KEY)');
  }
  if (options.smsMockMode === true || !options.smsApiKey) {
    missingProviders.push('SMS provider (SMS_API_KEY)');
  }
  if (
    options.googleCalendarMockMode === true ||
    !options.googleCalendarAccessToken ||
    !options.googleCalendarCalendarId
  ) {
    missingProviders.push(
      'Google Calendar (GOOGLE_CALENDAR_ACCESS_TOKEN/GOOGLE_CALENDAR_CALENDAR_ID)'
    );
  }
  if (options.attachmentScanner?.productionReady !== true) {
    missingProviders.push('ClamAV attachment scanner (ATTACHMENT_SCANNER_HOST)');
  }
  if (options.fileStorage?.productionReady !== true) {
    missingProviders.push('private S3/MinIO attachment storage (ATTACHMENT_STORAGE_S3_*)');
  }
  if (missingProviders.length > 0) {
    throw new Error(
      `Production-like API cannot start with mock or missing providers: ${missingProviders.join(', ')}`
    );
  }
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
    response.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
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
  response.setHeader('access-control-allow-credentials', 'true');
  return { allowed: true };
}

function shouldUseTenantCommand(pathname: string, method: string | undefined): boolean {
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return false;
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) return false;
  if (pathname === '/webhooks/whatsapp/inbound' || pathname === '/api/webhooks/whatsapp/inbound') {
    return false;
  }
  // Cash-receipt handlers authenticate before they invoke their own
  // idempotent command runner. Keeping these routes outside the dispatcher
  // UoW ensures a completed replay cannot bypass the billing.manage guard.
  if (
    method === 'POST' &&
    /^\/encounters\/[^/]+\/cash-receipts(?:\/[^/]+\/reverse)?$/.test(pathname)
  ) {
    return false;
  }
  if (isCashDrawerMutationPath(pathname, method)) return false;
  // Chaos experiments intentionally alter process-wide state and are not
  // tenant data commands. Their own authorization and audit remain separate.
  if (pathname.startsWith('/chaos/')) return false;
  // The equipment bridge authenticates an exact raw request body with HMAC.
  // It owns its durable idempotency boundary, so the generic tenant-command
  // envelope must not consume or parse the stream before the route sees it.
  if (
    method === 'POST' &&
    (pathname === '/integrations/laboratory/equipment-results/imports' ||
      /^\/integrations\/laboratory\/equipment-results\/imports\/[^/]+\/retry$/.test(pathname))
  ) {
    return false;
  }
  return true;
}

function sendDatabasePersistenceUnavailable(response: ServerResponse, correlationId: string): void {
  response.setHeader('content-type', 'application/json');
  response.setHeader('cache-control', 'no-store');
  response.setHeader('retry-after', '5');
  response.statusCode = 503;
  response.end(
    JSON.stringify({
      code: 'DATABASE_PERSISTENCE_UNAVAILABLE',
      message: 'Durable persistence is temporarily unavailable; retry after readiness is restored.',
      correlationId
    })
  );
}

function isPixPaymentAttemptCreate(pathname: string, method: string | undefined): boolean {
  return method === 'POST' && /^\/encounters\/[^/]+\/payments\/pix-attempts$/.test(pathname);
}

function derivePixPaymentAttemptLedgerKey(requestKey: string): string {
  const digest = createHash('sha256')
    .update('cvg:pix-attempt-ledger:v1\0', 'utf8')
    .update(requestKey, 'utf8')
    .digest('hex');
  return `pix-attempt-sha256:${digest}`;
}

async function readTenantCommandPayload(request: IncomingMessage, url: URL): Promise<JsonValue> {
  const body = await readJsonBodyOrEmpty(
    request,
    url.pathname === '/attachments' ? MAX_ATTACHMENT_JSON_BODY_BYTES : 1_048_576
  );
  const commandBody =
    url.pathname === '/attachments' &&
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body)
      ? {
          ...(body as Record<string, unknown>),
          // Never duplicate a binary upload into the idempotency payload. The
          // declared checksum remains part of the command identity while the
          // route receives the cached original body below.
          ...(typeof (body as Record<string, unknown>).contentBase64 === 'string'
            ? {
                contentBase64: `omitted:${String((body as Record<string, unknown>).checksum ?? '')}`
              }
            : {})
        }
      : body;
  return {
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    body: commandBody as JsonValue
  };
}

export function createApiServer(options: ApiServerOptions): ApiServer {
  const logger = createLogger(options.appName);
  const metricsAuthToken = configuredMetricsAuthToken(options);
  if (isProductionLikeEnvironment(options.environment) && !metricsAuthToken) {
    throw new Error(
      'Production-like API requires METRICS_AUTH_TOKEN; refusing to expose an unauthenticated collector surface'
    );
  }
  const agendaConfigRepository =
    options.repositories?.agendaConfig ?? new InMemoryAgendaConfigRepository();
  const corsAllowedOrigins = options.corsAllowedOrigins ?? DEFAULT_CORS_ALLOWED_ORIGINS;
  const effectiveRuntimeDistributedStateEnabled =
    options.runtimeDistributedStateEnabled ??
    options.featureFlags?.runtimeDistributedStateEnabled ??
    false;
  const evaluateFeatureFlag = options.featureFlags?.evaluate;
  const workflowTasks =
    options.workflowTaskService ?? createApiWorkflowTaskService(options.environment);
  const {
    accessControl,
    users,
    staff,
    owners,
    patients,
    encounters,
    clinicalHandoffs,
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
    ledger,
    financialPayables,
    financialStatements,
    commercial,
    commissions,
    packages,
    reports,
    inventory,
    procurement,
    notifications,
    audit,
    discharges,
    prescriptions,
    prescriptionExecutions,
    products,
    services,
    counterSales,
    quotes,
    cash,
    auth,
    lgpd,
    marketing,
    webhooks,
    apiKeys,
    eventBus,
    pixTransactions,
    cardTransactions,
    smartScheduling,
    whatsAppProvider,
    initialize
  } = createApiRuntime({
    authSecret: options.authSecret,
    authVerifierSecrets: options.authVerifierSecrets,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
    enableMfa: options.enableMfa,
    mfaEncryptionKey: options.mfaEncryptionKey,
    mfaEncryptionKeyVersion: options.mfaEncryptionKeyVersion,
    mfaEncryptionKeyring: options.mfaEncryptionKeyring,
    repositories: options.repositories,
    fileStorage: options.fileStorage,
    attachmentScanner: options.attachmentScanner,
    sectorBedOptions: options.sectorBedOptions,
    runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
    notificationsWhatsappRemindersEnabled:
      options.featureFlags?.notificationsWhatsappRemindersEnabled,
    notificationsWhatsappRemindersEvaluator: evaluateFeatureFlag
      ? async (accountId: string): Promise<boolean> =>
          (
            await evaluateFeatureFlag('notifications.whatsapp.reminders.enabled', {
              environment: options.environment,
              accountId
            })
          ).enabled
      : undefined,
    preserveSeedUsersWithRepository:
      options.preserveSeedUsersWithRepository ?? options.environment === 'test',
    preserveSeedMasterDataWithRepository: options.preserveSeedMasterDataWithRepository ?? false,
    requireUuidEntityIdentifiers: options.requireUuidEntityIdentifiers,
    unitOfWork: options.unitOfWork,
    tenantTransaction: options.tenantTransaction,
    medicalRecordsPersistenceMode: options.medicalRecordsPersistenceMode,
    cacheSync: options.cacheSync,
    workflowTaskService: workflowTasks
  });
  const requireEncounterForAccount = createEncounterAccountGuard(encounters);
  const fetchEncounterForAccount = createEncounterReadThroughGuard(encounters);
  const syncQueueWithEncounter = createEncounterQueueSynchronizer(encounters, scheduling);
  const runTenantCommand = createTenantCommandRunner({
    environment: options.environment,
    unitOfWork: options.unitOfWork,
    transaction:
      options.tenantTransaction ??
      (options.unitOfWork
        ? async <T>(
            accountId: string,
            command: () => Promise<T>,
            metadata?: { readonly actorUserId: string; readonly correlationId: string }
          ): Promise<T> => withTenantTransaction(accountId, async () => command(), metadata)
        : undefined)
  });
  const clinicalOperationalMetricsProvider =
    options.clinicalOperationalMetricsProvider ??
    createClinicalOperationalMetricsProvider({
      users,
      inpatient,
      encounters,
      workflowTasks,
      prescriptionExecutions,
      diagnostics,
      clinicalHandoffs
    });
  const ensureWorkflowTaskSchemaReady = createWorkflowTaskSchemaReadinessGuard(options.environment);
  const refreshAccessControlCaches = async (accountId: AccountId): Promise<void> => {
    try {
      await Promise.all([
        accessControl.hydrateFromDatabase(accountId),
        audit.refreshFromDatabase(accountId)
      ]);
      accessControl.completeAccountMutation(accountId);
    } catch {
      accessControl.invalidateAccount(accountId);
      throw new AppError(
        'ACCESS_CONTROL_CACHE_RECOVERY_FAILED',
        'Access control state could not be reloaded; privileged access is temporarily unavailable',
        503
      );
    }
  };
  const refreshVetusCaches = createVetusCacheRefresher({ owners, patients, audit });
  const refreshDischargeCaches = async (accountId: AccountId): Promise<void> => {
    await Promise.all([
      discharges.refreshAccount(accountId),
      inpatient.refreshAccount(accountId),
      audit.refreshFromDatabase(accountId)
    ]);
  };
  const refreshInpatientCaches = async (accountId: AccountId): Promise<void> => {
    await Promise.all([
      inpatient.refreshAccount(accountId),
      medicalRecords.refreshAccount(accountId),
      billing.refreshFromDatabase(accountId),
      audit.refreshFromDatabase(accountId)
    ]);
  };
  const refreshEncounterCashReceiptCaches = async (accountId: AccountId): Promise<void> => {
    await Promise.all([
      billing.refreshFromDatabase(accountId),
      cash.hydrateFromDatabase(accountId),
      audit.refreshFromDatabase(accountId)
    ]);
  };
  const refreshPrescriptionExecutionCaches = async (accountId: AccountId): Promise<void> => {
    await Promise.all([
      prescriptionExecutions.hydrateFromDatabase(accountId),
      audit.refreshFromDatabase(accountId)
    ]);
  };
  const encounterCashReceiptRepository = options.repositories?.encounterCashReceipt;
  const encounterCashReceiptCommand = encounterCashReceiptRepository
    ? new EncounterCashReceiptCommand(encounterCashReceiptRepository)
    : undefined;
  const encounterCashReceiptReversalRepository = options.repositories?.encounterCashReceiptReversal;
  const encounterCashReceiptReversalCommand = encounterCashReceiptReversalRepository
    ? new EncounterCashReceiptReversalCommand(encounterCashReceiptReversalRepository)
    : undefined;
  const encounterPixPaymentAttemptRepository = options.repositories?.encounterPixPaymentAttempt;
  const encounterPixPaymentAttemptCommand = encounterPixPaymentAttemptRepository
    ? new RequestEncounterPixPaymentCommand(encounterPixPaymentAttemptRepository, {
        allowSyntheticProviders:
          options.pixMockMode === true && isLocalDevelopmentOrTestEnvironment(options.environment)
      })
    : undefined;
  // Local providers are deliberately limited to development/test environments.
  const hasPagarmeCredentials = Boolean(options.pagarmeApiKey && options.pagarmePixKey);
  // Encounter PIX attempts go to Pagar.me whenever real credentials are
  // configured; otherwise the synthetic provider (blocked in production).
  const encounterPixProviderKey =
    hasPagarmeCredentials && options.pixMockMode !== true ? 'pagarme' : 'local-pix';
  const pagarmePixChargeClient =
    encounterPixProviderKey === 'pagarme'
      ? new PagarMePixChargeClient({ apiKey: options.pagarmeApiKey! })
      : undefined;
  assertProductionProviderReadiness(options);
  const usePixMock = options.pixMockMode === true || !hasPagarmeCredentials;
  assertPixProviderWebhookReadiness({
    environment: options.environment,
    syntheticEnabled: options.pixProviderWebhookSyntheticEnabled,
    keyring: options.pixProviderWebhookKeyring,
    repository: options.pixProviderEventIngressRepository
  });
  const paymentGateway = usePixMock
    ? new LocalPixPaymentGateway()
    : new PagarMePaymentGatewayAdapter({
        apiKey: options.pagarmeApiKey!,
        pixKey: options.pagarmePixKey!,
        pixTransactions,
        cardTransactions
      });

  const paymentGatewayLabel =
    paymentGateway instanceof PagarMePaymentGatewayAdapter
      ? 'PagarMePixAdapter'
      : 'LocalPixPaymentGateway';
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
  const laboratoryResultImports =
    options.repositories?.laboratoryResultImport ?? new InMemoryLaboratoryResultImportRepository();
  assertLaboratoryProviderIngressReadiness({
    environment: options.environment,
    keyring: options.laboratoryProviderKeyring,
    repository: laboratoryResultImports
  });
  const laboratoryProviderSignatureVerifier =
    options.laboratoryProviderKeyring && options.laboratoryProviderKeyring.size > 0
      ? new HmacLaboratoryProviderSignatureVerifier(options.laboratoryProviderKeyring)
      : undefined;
  const ocrFiscal = new OcrFiscalService();
  const demandForecasting = new DemandForecastingService();
  const labAnomalyDetection = new LabAnomalyDetectionService();
  const nfseRuntime =
    options.nfseProvider && options.nfseApiUrl && options.nfseMunicipalityCode
      ? {
          provider: options.nfseProvider,
          apiUrl: options.nfseApiUrl,
          municipalityCode: options.nfseMunicipalityCode,
          apiKey: options.nfseApiKey,
          certificate: options.nfseCertificate,
          issuer: options.nfseIssuer,
          regime: options.nfseRegime
        }
      : undefined;
  const fiscal = new FiscalService(undefined, undefined, {
    allowNfseSimulation: !isProductionLikeEnvironment(options.environment),
    nfse: nfseRuntime
  });
  const mlTelemetry = new MlTelemetryService();
  const useDatabaseCatalogStores = options.useDatabaseCatalogStores ?? true;
  const responsibilityTerms = createResponsibilityTermStore(useDatabaseCatalogStores);
  const breeds = createBreedStore(useDatabaseCatalogStores);
  const animalSpecies = createAnimalSpeciesStore(useDatabaseCatalogStores);
  const coatColors = createCoatColorStore(useDatabaseCatalogStores);
  const customerGroups = createCustomerGroupStore(useDatabaseCatalogStores);
  const preventiveEvents = createPreventiveEventStore(useDatabaseCatalogStores);
  const vetusImportLogStore =
    options.vetusImportLogRepository ?? new InMemoryVetusImportLogRepository();

  // Rate limiter for auth endpoints (GAP-11: uses createAuthRateLimiter helper)
  // GAP-05: runtimeDistributedStateEnabled gates Redis backend for distributed rate limiting
  const authRateLimiter =
    options.authRateLimiter ??
    createAuthRateLimiter(logger, {
      authRateLimitWindowMs: options.authRateLimitWindowMs,
      authRateLimitMaxRequests: options.authRateLimitMaxRequests,
      redisUrl: options.redisUrl,
      runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
      requireDistributed: ['production', 'prod', 'staging', 'stage'].includes(options.environment)
    });

  const pixPaymentAttemptRateLimiter =
    options.pixPaymentAttemptRateLimiter ??
    createAuthRateLimiter(logger, {
      authRateLimitWindowMs: 60_000,
      authRateLimitMaxRequests: 120,
      redisUrl: options.redisUrl,
      runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
      requireDistributed: ['production', 'prod', 'staging', 'stage'].includes(options.environment)
    });

  const pixProviderWebhookRateLimiter =
    options.pixProviderWebhookRateLimiter ??
    createAuthRateLimiter(logger, {
      authRateLimitWindowMs: 60_000,
      authRateLimitMaxRequests: 120,
      redisUrl: options.redisUrl,
      runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
      requireDistributed: ['production', 'prod', 'staging', 'stage'].includes(options.environment)
    });

  // Health/readiness must observe the same limiter instance that serves auth
  // traffic. Passing a separate URL-only signal would report a false healthy
  // state when Redis is configured but unreachable.
  const healthRouteOptions: ApiServerOptions = {
    ...options,
    metricsAuthToken,
    authorizeSlo: async (request) => {
      // Health routes execute before the normal tenant-resolution phase. A
      // session-backed SLO request still needs the same authoritative ACL
      // read as any other protected route, so establish the verified token
      // context before invoking the final guard. Without this, the database
      // session repository cannot bind its tenant transaction and the browser
      // receives a misleading metrics 401 after login.
      const accessToken = extractBearerToken(readHeader(request, 'authorization'));
      if (!accessToken) {
        await requirePrincipal(request, 'audit.read');
        return;
      }
      const tokenContext = auth.getVerifiedAccessTokenContext(accessToken);
      const correlationId = requestCorrelationIds.get(request) ?? createCorrelationId('slo');
      await runWithTenantContext(
        {
          tenantId: '00000000-0000-0000-0000-000000000001',
          accountId: tokenContext.accountId,
          userId: tokenContext.userId,
          correlationId
        },
        () => requirePrincipal(request, 'audit.read')
      );
    },
    authRateLimiter,
    pixPaymentAttemptRateLimiter,
    pixProviderWebhookRateLimiter
  };

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
    provider: {
      name: 'unknown',
      evaluate: async () => ({
        key: '',
        enabled: false,
        provider: 'unknown',
        reason: 'unknown',
        evaluatedAt: '',
        definition: {} as never,
        context: {} as never
      })
    } as never
  };

  /**
   * Build ABAC actor attributes from the authenticated principal.
   */
  function buildActorAttributes(principal: AuthenticatedPrincipal): ActorAttributes {
    const memberships = accessControl.listMemberships(principal.user.id as never);
    return buildAuthenticatedActorAttributes(principal, memberships);
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
      ipAddress: getClientIp(request, options.trustedProxyCidrs),
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
    const actor = buildActorAttributes(principal);
    const environment = buildEnvironmentAttributes(request);
    abacEngine.enforce(actionCode, actor, resource, environment);
  }

  // WebAuthn state is durable whenever a repository-backed runtime supplies it.
  // In-memory doubles are deliberately limited to local development/test.
  const localWebAuthnState = isLocalDevelopmentOrTestEnvironment(options.environment);
  const webauthnRepository =
    options.repositories?.webauthn ??
    (localWebAuthnState ? new InMemoryWebAuthnRepository() : undefined);
  const webauthnChallengeStore =
    options.repositories?.webauthnChallenge ??
    (localWebAuthnState ? new InMemoryWebAuthnChallengeStore() : undefined);
  assertWebAuthnDurableStateReadiness({
    environment: options.environment,
    enabled: featureFlags.authWebauthnEnabled,
    credentialRepository: webauthnRepository,
    challengeStore: webauthnChallengeStore,
    verifierConfigured:
      typeof options.webauthnRpId === 'string' &&
      options.webauthnRpId.trim().length > 0 &&
      Array.isArray(options.webauthnOrigins) &&
      options.webauthnOrigins.length > 0
  });
  const webauthnService = webauthnRepository
    ? new WebAuthnServiceImpl(webauthnRepository, {
        rpId: options.webauthnRpId ?? 'localhost',
        origins: options.webauthnOrigins ?? ['http://localhost:3000']
      })
    : undefined;
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
      accountId: string,
      status?: 'queued' | 'sent' | 'read'
    ): Promise<readonly unknown[]>;
    listJobsFromRepository(accountId: string, status?: string): Promise<readonly unknown[]>;
    processPendingFromRepository(
      accountId: string,
      payload?: ProcessNotificationsRequest
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
  registerChaosExperimentOnce(chaos, providerFailureExperiment);

  const accessTokenSynchronizationErrors = new WeakMap<IncomingMessage, AppError>();
  const requestCorrelationIds = new WeakMap<IncomingMessage, string>();
  const requestRoles = new WeakMap<IncomingMessage, readonly string[]>();
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    // Create and activate the W3C request span before any route or dependency
    // code runs. The promise is intentionally observed so an unexpected
    // handler failure cannot become an unhandled rejection.
    void tracingMiddleware(request, response, () => handleRequest(request, response)).catch(
      (error: unknown) => {
        logger.error('unhandled HTTP request failure after tracing middleware', {
          error: error instanceof Error ? error.message : String(error)
        });
        if (!response.headersSent) {
          response.statusCode = 500;
          response.end(
            JSON.stringify({ code: 'INTERNAL_ERROR', message: 'Internal server error' })
          );
        } else if (!response.writableEnded) {
          response.destroy(error instanceof Error ? error : undefined);
        }
      }
    );
  });
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;

  const rateLimiterDependencies = [
    authRateLimiter,
    pixPaymentAttemptRateLimiter,
    pixProviderWebhookRateLimiter
  ];
  let closeDependenciesPromise: Promise<void> | undefined;
  const closeDependencies = (): Promise<void> => {
    closeDependenciesPromise ??= Promise.all(
      rateLimiterDependencies.map((rateLimiter) => rateLimiter.close?.())
    ).then(() => undefined);
    return closeDependenciesPromise;
  };

  let distributedReadinessPromise: Promise<void> | undefined;
  const assertDistributedRuntimeReadiness = (): Promise<void> => {
    distributedReadinessPromise ??= assertDistributedStateReadiness({
      environment: options.environment,
      runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
      redisUrl: options.redisUrl,
      authRateLimiter,
      pixPaymentAttemptRateLimiter,
      pixProviderWebhookRateLimiter
    });
    return distributedReadinessPromise;
  };

  return Object.assign(server, { ready, closeDependencies, assertDistributedRuntimeReadiness });

  async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    incrementActiveRequests();
    let activeRequest = true;
    const finishActiveRequest = () => {
      if (!activeRequest) return;
      activeRequest = false;
      decrementActiveRequests();
    };
    response.once('finish', finishActiveRequest);
    response.once('close', finishActiveRequest);

    const traceableRequest = request as TraceableIncomingMessage;
    const span =
      traceableRequest.span ??
      createSpan(
        `HTTP ${request.method ?? 'UNKNOWN'} ${sanitizeHttpTarget(request.url)}`,
        traceableRequest.traceContext ?? null
      );
    traceableRequest.span = span;

    const startTime = process.hrtime.bigint();
    const correlationId = resolveRequestCorrelationId();
    traceableRequest.correlationId = correlationId;
    requestCorrelationIds.set(request, correlationId);

    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('x-request-id', correlationId);
    response.setHeader('x-trace-id', span.context.traceId);
    applySecurityHeaders(request, response, options.environment);
    const requestPathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const isSyntheticPixWebhook =
      options.pixProviderWebhookSyntheticEnabled === true &&
      requestPathname === PIX_PROVIDER_WEBHOOK_PATH;
    const corsDecision = isSyntheticPixWebhook
      ? { allowed: true, message: '' }
      : applyCorsPolicy(request, response, corsAllowedOrigins);

    // Inject trace context into response for downstream propagation
    response.setHeader('tracestate', 'cvg-api=1');
    response.setHeader(
      'traceparent',
      formatTraceParent(span.context.traceId, span.context.spanId, span.context.traceFlags)
    );
    attachHttpRequestTelemetry({
      request,
      response,
      startTime,
      correlationId,
      requestRoles,
      span,
      logger
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
      span.attributes['http.target'] = sanitizeHttpTarget(request.url);
      span.attributes['request.correlation_id'] = correlationId;
      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = url.pathname;
      if (request.method === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }

      // Probe endpoints remain callable without tenant or session headers;
      // collector and operator SLO surfaces enforce their own credentials.
      if (await handleHealthRoutes(request, response, healthRouteOptions)) {
        return;
      }

      if (
        chaos.isActive(DATABASE_FAILURE_ID) &&
        isDatabaseFailurePublicMutationPath(pathname, request.method)
      ) {
        sendDatabasePersistenceUnavailable(response, correlationId);
        return;
      }

      if (
        options.pixProviderWebhookSyntheticEnabled === true &&
        (await handlePixProviderWebhookRoutes(pathname, request, response, correlationId, {
          keyring: options.pixProviderWebhookKeyring ?? new Map(),
          repository: options.pixProviderEventIngressRepository,
          rateLimiter: pixProviderWebhookRateLimiter,
          trustedProxyCidrs: options.trustedProxyCidrs
        }))
      ) {
        return;
      }
      if (
        pagarmePixChargeClient &&
        options.pixProviderEventIngressRepository &&
        (await handlePagarMePixWebhookRoutes(pathname, request, response, correlationId, {
          client: pagarmePixChargeClient,
          repository: options.pixProviderEventIngressRepository,
          rateLimiter: pixProviderWebhookRateLimiter,
          trustedProxyCidrs: options.trustedProxyCidrs
        }))
      ) {
        return;
      }
      if (
        (pathname === '/metrics' || pathname === '/internal/metrics') &&
        request.method === 'GET'
      ) {
        await handleMetricsReadRoute(pathname, request, response, {
          metricsAuthToken,
          refreshClinicalMetrics: () =>
            refreshClinicalOperationalMetrics(clinicalOperationalMetricsProvider, logger),
          updateDatabasePoolMetrics: () => updateDatabasePoolMetrics(getInitializedDatabasePool()),
          getAppState,
          resolveRedisHealthStatus: () =>
            resolveRedisHealthStatus(healthRouteOptions, effectiveRuntimeDistributedStateEnabled),
          listActiveExperimentIds: () =>
            chaos.listActiveExperiments().map((experiment) => experiment.id),
          runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
          redisUrl: options.redisUrl,
          updateAppMetrics,
          getMetricsText,
          getChaosMetricsText: () => chaosMetrics.register.metrics(),
          uptimeSeconds: () => Math.round(process.uptime())
        });
        return;
      }

      // Verify the signed token before tenant resolution. This is only the
      // routing context: the final guard below still reloads the authoritative
      // session, user and role profile before authorizing, so revocations and
      // permission changes cannot be bypassed by a stale token.
      let accountId: string | undefined;
      let userId: string | undefined;
      const authHeader = request.headers['authorization'];
      if (authHeader) {
        const accessToken = extractBearerToken(authHeader);
        if (accessToken) {
          try {
            const tokenContext = auth.getVerifiedAccessTokenContext(accessToken);
            accountId = tokenContext.accountId;
            userId = tokenContext.userId;
          } catch (error) {
            accessTokenSynchronizationErrors.set(
              request,
              error instanceof AppError
                ? error
                : new AppError(
                    'AUTHENTICATION_UNAVAILABLE',
                    'Authentication service unavailable',
                    503
                  )
            );
          }
        }
      }

      const requireEarlyPrincipal = (permissionCode: string) =>
        runWithTenantContext(
          { tenantId: '00000000-0000-0000-0000-000000000001', accountId, userId, correlationId },
          () => requirePrincipal(request, permissionCode)
        );

      // Chaos engineering endpoints are privileged because experiments can alter process-wide behavior.
      const chaosMatch = request.url?.match(/^\/chaos\/experiments\/([^/]+)\/(start|stop)$/);
      if (chaosMatch && request.method === 'POST') {
        await requireEarlyPrincipal('users.manage');
        const [, experimentId, action] = chaosMatch;
        if (isProductionLikeEnvironment(options.environment)) {
          response.setHeader('content-type', 'application/json');
          response.setHeader('cache-control', 'no-store');
          response.statusCode = 503;
          response.end(JSON.stringify({ ok: false, code: 'CHAOS_MUTATIONS_DISABLED' }));
          return;
        }
        try {
          if (action === 'start') {
            const body = await readJsonBody(request);
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
          logger.error('Chaos endpoint error', {
            experimentId,
            action,
            error: err instanceof Error ? err.message : String(err)
          });
          response.setHeader('content-type', 'application/json');
          response.statusCode = 500;
          response.end(JSON.stringify({ ok: false, error: 'Internal error' }));
        }
        return;
      }

      // List all available chaos experiments
      if (
        await handleChaosExperimentListRoute(request, response, {
          requireEarlyPrincipal,
          chaos,
          getAppState,
          resolveRedisHealthStatus: () =>
            resolveRedisHealthStatus(healthRouteOptions, effectiveRuntimeDistributedStateEnabled),
          runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
          redisUrl: options.redisUrl
        })
      ) {
        return;
      }

      if (handleOpenApiRoutes(request, response)) {
        return;
      }

      // Extract accountId from Authorization header if present
      const signedAttachmentClaims: AttachmentDownloadClaims | null =
        pathname.match(/^\/attachments\/[^/]+\/content$/) && url.searchParams.has('token')
          ? verifyAttachmentDownloadToken(options.authSecret, url.searchParams.get('token') ?? '')
          : null;
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
      if (!accountId && signedAttachmentClaims) {
        accountId = signedAttachmentClaims.accountId;
      }

      const isPublicTenantlessRoute =
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/api/auth/') ||
        pathname === '/webhooks/whatsapp/inbound' ||
        pathname === '/api/webhooks/whatsapp/inbound';

      // Health, metrics and OpenAPI already returned above, so anything reaching
      // here is tenant-scoped. Without a verified identity there is no account to
      // scope the request to: answer 401 rather than letting tenant resolution
      // fail as an unhandled 500.
      if (!isPublicTenantlessRoute && !accountId) {
        throw new AuthenticationError();
      }

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

      return await withSpanContext(span, async () =>
        runWithTenantContext(tenantCtx, async () => {
          if (
            tenantCtx.accountId &&
            chaos.isActive(DATABASE_FAILURE_ID) &&
            isDatabaseFailureMutationPath(pathname, request.method)
          ) {
            sendDatabasePersistenceUnavailable(response, correlationId);
            return;
          }

          const featureFlagContext: EvaluationContext = {
            environment: options.environment,
            tenantId: tenantCtx.tenantId,
            accountId: tenantCtx.accountId,
            userId: tenantCtx.userId,
            correlationId
          };

          const dispatchRequest = async (): Promise<void> => {
            // The equipment bridge must be the first body-consuming mutation
            // route: its HMAC covers the exact bytes received on the wire.
            const laboratoryIntegrationHandled = await handleLaboratoryIntegrationRoutes(
              pathname,
              request,
              response,
              correlationId,
              {
                laboratoryResultImports,
                apiKeys,
                audit,
                laboratoryProviderSignatureVerifier,
                nowSeconds: options.laboratoryProviderNowSeconds
              }
            );
            if (laboratoryIntegrationHandled) return;

            // First-run provisioning is checked before the authenticated auth
            // routes: it is the only path that may create an account without one.
            if (
              await handleSetupRoutes(pathname, request, response, correlationId, {
                setupRateLimiter: authRateLimiter,
                logger,
                setupBootstrapToken: options.setupBootstrapToken,
                trustedProxyCidrs: options.trustedProxyCidrs,
                getPool: users.persistenceMode === 'database' ? getPool : undefined
              })
            ) {
              return;
            }

            if (
              await handleAuthRoutes(pathname, request, response, correlationId, {
                auth,
                authRateLimiter,
                logger,
                appName: options.appName,
                featureFlags,
                webauthnService,
                webauthnRpId: options.webauthnRpId ?? 'localhost',
                webauthnChallengeStore,
                webauthnChallenges,
                oidcConfig,
                webauthnChallengeTtlMs: WEBAUTHN_CHALLENGE_TTL_MS,
                oidcStateStore,
                oidcStateTtlMs: OIDC_STATE_TTL_MS,
                featureFlagEvaluator: featureFlags.evaluate,
                featureFlagContext,
                refreshCookieMaxAgeSeconds: options.refreshTokenTtlSeconds,
                secureCookies: isProductionLikeEnvironment(options.environment),
                csrfAllowedOrigins: corsAllowedOrigins,
                trustedProxyCidrs: options.trustedProxyCidrs,
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
                onOrderCreated: async (order, principalUserId, principalAccountId) => {
                  medicalRecords.appendAdvancedCareEvent(
                    principalAccountId as never,
                    order.encounterId as never,
                    principalUserId as never,
                    'diagnostic_requested',
                    `Diagnostic order requested: ${order.examType}`
                  );
                  await medicalRecords.waitForPersistence();
                },
                onOrderStatusChanged: async (
                  order,
                  payload,
                  principalUserId,
                  principalAccountId
                ) => {
                  if (payload.status === 'collected') {
                    medicalRecords.appendAdvancedCareEvent(
                      principalAccountId as never,
                      order.encounterId as never,
                      principalUserId as never,
                      'diagnostic_collected',
                      `Diagnostic order collected by ${payload.collectedByUserId ?? principalUserId}`
                    );
                  } else if (payload.status === 'resulted') {
                    medicalRecords.appendAdvancedCareEvent(
                      principalAccountId as never,
                      order.encounterId as never,
                      principalUserId as never,
                      'diagnostic_resulted',
                      `Diagnostic result registered: ${payload.resultSummary ?? order.examType}`
                    );
                  }
                  await medicalRecords.waitForPersistence();
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
                fiscalBackofficeEnabled: featureFlags.fiscalBackofficeEnabled,
                featureFlagEvaluator: featureFlags.evaluate,
                featureFlagContext
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
                featureFlags,
                featureFlagEvaluator: featureFlags.evaluate,
                featureFlagContext,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            if (
              await handleAgendaConfigRoutes(pathname, request, response, correlationId, {
                audit,
                repository: agendaConfigRepository,
                requirePrincipal,
                refreshScheduling: (accountId) => scheduling.hydrateFromDatabase(accountId as never)
              })
            ) {
              return;
            }

            if (pathname === '/workflow-tasks' || pathname.startsWith('/workflow-tasks/')) {
              await ensureWorkflowTaskSchemaReady();
              if (
                await handleWorkflowTaskRoutes(pathname, request, response, correlationId, {
                  workflowTasks,
                  audit,
                  requirePrincipal
                })
              ) {
                return;
              }
            }

            if (
              await handleMedicalRecordReadRoutes(pathname, url, request, response, correlationId, {
                medicalRecords,
                requirePrincipal,
                requireEncounterForAccount,
                appendAudit
              })
            ) {
              return;
            }

            if (pathname === '/medical-records/entries' && request.method === 'POST') {
              const principal = await requirePrincipal(request, 'medical-records.manage');
              const payload = (await readJsonBody(request)) as CreateClinicalEntryRequest;
              requireEncounterForAccount(payload.encounterId, principal.user.accountId);
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
              const rawIdempotencyKey = request.headers['idempotency-key'];
              const idempotencyKey = Array.isArray(rawIdempotencyKey)
                ? rawIdempotencyKey[0]
                : rawIdempotencyKey;
              if (isProductionLikeEnvironment(options.environment) && !idempotencyKey) {
                throw new ValidationError(
                  'Idempotency-Key header is required for clinical entry creation'
                );
              }

              const writeAudit = async (
                entry: Awaited<ReturnType<typeof medicalRecords.createEntryAtomically>>
              ) =>
                audit.writeAndWait({
                  actorId: principal.user.id,
                  accountId: principal.user.accountId,
                  module: 'medical-records',
                  action: 'create_entry',
                  entityType: 'clinical-entry',
                  entityId: entry.id,
                  payloadSummary: `${entry.entryType} created for encounter ${entry.encounterId}`,
                  riskLevel: 'high',
                  correlationId
                });

              let entry: Awaited<ReturnType<typeof medicalRecords.createEntryAtomically>>;
              if (options.unitOfWork && idempotencyKey && !getDatabaseTransactionScope()) {
                const execution = await options.unitOfWork.execute(
                  {
                    accountId: principal.user.accountId,
                    actorUserId: principal.user.id,
                    correlationId,
                    operation: 'medical-records.create-entry',
                    idempotencyKey
                  },
                  payload as unknown as JsonValue,
                  async () => {
                    const created = await medicalRecords.createEntryAtomically(
                      principal.user.accountId as never,
                      principal.user.id,
                      payload
                    );
                    await writeAudit(created);
                    return created as unknown as JsonValue;
                  },
                  undefined,
                  // PROD-005/A02: replay of a clinical entry requires the
                  // current session permission, not just a live session.
                  async () => {
                    await requirePrincipal(request, 'medical-records.manage');
                  }
                );
                entry = execution.value as unknown as typeof entry;
              } else {
                entry = await medicalRecords.createEntryAtomically(
                  principal.user.accountId as never,
                  principal.user.id,
                  payload
                );
                await writeAudit(entry);
              }
              response.statusCode = 201;
              response.end(JSON.stringify(entry));
              return;
            }

            if (pathname.startsWith('/medical-records/entries/')) {
              const medicalRecordEntryParts = pathname.split('/');
              const entryId = requireNonEmptyString(medicalRecordEntryParts[3], 'entryId');

              const principal = await requirePrincipal(request, 'medical-records.manage');
              const existingEntry = await medicalRecords.getEntryOrThrowAsync(
                principal.user.accountId as never,
                entryId as never
              );
              if (existingEntry.accountId !== principal.user.accountId) {
                throw new NotFoundError('Clinical entry not found', { entryId });
              }

              if (request.method === 'PATCH' && medicalRecordEntryParts.length === 4) {
                const payload = (await readJsonBody(request)) as UpdateClinicalEntryRequest;
                const entry = await medicalRecords.updateEntryAtomically(
                  principal.user.accountId as never,
                  principal.user.id,
                  entryId as never,
                  payload
                );
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
                const entry = await medicalRecords.archiveEntryAtomically(
                  principal.user.accountId as never,
                  principal.user.id,
                  entryId as never,
                  payload
                );
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

            if (
              await handleMedicalRecordTimelineRoute(
                pathname,
                url,
                request,
                response,
                correlationId,
                {
                  medicalRecords,
                  requirePrincipal,
                  requireEncounterForAccount,
                  appendAudit
                }
              )
            ) {
              return;
            }

            if (
              await handleAttachmentReadRoutes(pathname, url, request, response, correlationId, {
                attachments,
                requirePrincipal,
                requireAttachmentTargetForAccount,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleAttachmentDownloadUrlRoutes(pathname, request, response, correlationId, {
                attachments,
                authSecret: options.authSecret,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleAttachmentContentReadRoute(pathname, request, response, correlationId, {
                attachments,
                signedClaims: signedAttachmentClaims,
                requirePrincipal,
                appendAudit,
                waitForAuditPersistence: () => audit.waitForPersistence()
              })
            ) {
              return;
            }

            if (
              await handleAttachmentUploadRoute(pathname, request, response, correlationId, {
                attachments,
                diagnostics,
                medicalRecords,
                requirePrincipal,
                requireAttachmentTargetForAccount,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleInpatientListRoute(pathname, url, request, response, correlationId, {
                inpatient,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleNotificationReadRoutes(pathname, url, request, response, correlationId, {
                notificationPersistence,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleNotificationWriteRoutes(pathname, request, response, correlationId, {
                notifications,
                notificationPersistence,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleClinicalHandoffsReadRoute(
                pathname,
                url,
                request,
                response,
                correlationId,
                {
                  clinicalHandoffs,
                  requirePrincipal,
                  appendAudit
                }
              )
            ) {
              return;
            }

            if (
              await handleClinicalHandoffSendRoute(pathname, request, response, correlationId, {
                clinicalHandoffs,
                encounters,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleClinicalHandoffAcknowledgeRoute(
                pathname,
                request,
                response,
                correlationId,
                {
                  clinicalHandoffs,
                  encounters,
                  requirePrincipal,
                  appendAudit
                }
              )
            ) {
              return;
            }

            if (
              await handleClinicalHandoffWorkflowRoutes(
                pathname,
                request,
                response,
                correlationId,
                {
                  clinicalHandoffs,
                  encounters,
                  requirePrincipal,
                  appendAudit
                }
              )
            ) {
              return;
            }

            if (
              await handleClinicalHandoffDetailReadRoute(
                pathname,
                request,
                response,
                correlationId,
                {
                  clinicalHandoffs,
                  requirePrincipal,
                  appendAudit
                }
              )
            ) {
              return;
            }
            if (
              await handleEncounterListRoute(pathname, url, request, response, correlationId, {
                encounters,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (pathname === '/encounters' && request.method === 'POST') {
              const principal = await requirePrincipal(request, 'encounters.manage');
              const payload = (await readJsonBody(request)) as CreateEncounterRequest;
              const encounter = await encounters.openEncounterAuthoritatively(
                principal.user.accountId,
                principal.user.id,
                payload
              );
              // Resolve the encounter persistence before mutating the queue
              // cache. A concurrent active-patient conflict must not leave a
              // queue entry associated with an encounter that never committed.
              await encounters.waitForPersistence();
              if (encounter.queueEntryId) {
                const previousSchedulingState = scheduling.snapshotQueueState(
                  encounter.queueEntryId
                );
                try {
                  const queueEntry = await scheduling.attachEncounter(
                    encounter.queueEntryId,
                    encounter.id
                  );
                  encounters.appendTimeline(principal.user.accountId, encounter.id, {
                    accountId: encounter.accountId,
                    eventType: 'queue_checked_in',
                    summary: `Patient checked in with priority ${queueEntry.priority}`,
                    actorUserId: principal.user.id
                  });
                  if (queueEntry.calledAt) {
                    encounters.appendTimeline(principal.user.accountId, encounter.id, {
                      accountId: encounter.accountId,
                      eventType: 'queue_called',
                      summary: 'Queue entry had already been called',
                      actorUserId: principal.user.id
                    });
                  }
                } catch (error) {
                  // attachEncounter updates its hot queue/appointment cache
                  // before awaiting persistence. Restore the snapshot if any
                  // later queue or timeline operation rejects; the tenant UoW
                  // rolls back the corresponding durable writes.
                  scheduling.restoreQueueState(previousSchedulingState);
                  throw error;
                }
              }
              await encounters.waitForPersistence();
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
              await handleEncounterTimelineRoute(pathname, request, response, correlationId, {
                encounters,
                requirePrincipal,
                requireEncounterForAccount,
                appendAudit
              })
            ) {
              return;
            }

            if (
              pathname.startsWith('/encounters/') &&
              pathname.endsWith('/transition') &&
              request.method === 'POST'
            ) {
              const principal = await requirePrincipal(request, 'encounters.manage');
              const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
              requireEncounterForAccount(encounterId, principal.user.accountId);
              const payload = (await readJsonBody(request)) as TransitionEncounterRequest;
              const encounter = encounters.transitionEncounter(
                principal.user.accountId,
                encounterId as never,
                principal.user.id,
                payload
              );
              await syncQueueWithEncounter(
                principal.user.accountId,
                encounter.id,
                encounter.status
              );
              await encounters.waitForPersistence();
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
              const principal = await requirePrincipal(request, 'encounters.manage');
              const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
              requireEncounterForAccount(encounterId, principal.user.accountId);
              const payload = (await readJsonBody(request)) as CloseEncounterRequest;
              validateRequestBody(
                payload as unknown as Record<string, unknown>,
                { closeReason: { type: 'string', required: true, minLength: 1, maxLength: 500 } },
                correlationId
              );
              const transaction = getTenantTransactionContext();
              const previousEncounterState = encounters.snapshotState(
                principal.user.accountId,
                encounterId as never
              );
              const previousSchedulingState = previousEncounterState.encounter.queueEntryId
                ? scheduling.snapshotQueueState(previousEncounterState.encounter.queueEntryId)
                : undefined;
              let auditEventId: string | undefined;
              try {
                if (transaction) {
                  const locked = await transaction.client.query<{ readonly status: string }>(
                    `SELECT status
                     FROM encounters
                    WHERE account_id = $1 AND id = $2
                    FOR UPDATE`,
                    [principal.user.accountId, encounterId]
                  );
                  if (!locked.rows[0]) {
                    throw new NotFoundError('Encounter not found', { encounterId });
                  }
                  if (locked.rows[0].status === 'closed') {
                    throw new ConflictError('Encounter is already closed', { encounterId });
                  }
                }

                const encounter = encounters.closeEncounter(
                  principal.user.accountId,
                  encounterId as never,
                  principal.user.id,
                  payload
                );
                await syncQueueWithEncounter(
                  principal.user.accountId,
                  encounter.id,
                  encounter.status
                );
                await encounters.waitForPersistence();

                if (transaction) {
                  const auditEvent = audit.write({
                    actorId: principal.user.id,
                    accountId: principal.user.accountId,
                    module: 'encounters',
                    action: 'close',
                    entityType: 'encounter',
                    entityId: encounter.id,
                    payloadSummary: `Encounter closed: ${encounter.closeReason}`,
                    riskLevel: 'high',
                    correlationId
                  });
                  auditEventId = auditEvent.eventId;
                  await audit.waitForPersistence();
                  await transaction.outbox.append({
                    moduleName: 'encounters',
                    eventType: 'encounter.closed',
                    payload: {
                      encounterId: encounter.id,
                      patientId: encounter.patientId,
                      ownerId: encounter.ownerId,
                      closeReason: encounter.closeReason ?? payload.closeReason,
                      closedAt: encounter.closedAt ?? null,
                      status: encounter.status
                    }
                  });
                } else {
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
                }
                response.statusCode = 200;
                response.end(JSON.stringify(encounter));
              } catch (error) {
                encounters.restoreState(principal.user.accountId, previousEncounterState);
                if (previousSchedulingState) {
                  scheduling.restoreQueueState(previousSchedulingState);
                }
                if (auditEventId) {
                  audit.removeFromCache(auditEventId as never);
                }
                // The unit of work rolls back after this command rejects. Refresh
                // the hot encounter/timeline cache only after its client is free.
                setImmediate(() => {
                  runWithoutDatabaseTransactionScope(() => {
                    void Promise.allSettled([
                      encounters.hydrateFromDatabase(principal.user.accountId as never),
                      scheduling.hydrateFromDatabase(principal.user.accountId as never)
                    ]).then((results) => {
                      for (const [cacheName, result] of [
                        ['encounters', results[0]],
                        ['scheduling', results[1]]
                      ] as const) {
                        if (result.status === 'rejected') {
                          logger.error('Cache hydration failed after encounter rollback', {
                            accountId: principal.user.accountId,
                            correlationId,
                            encounterId,
                            cacheName,
                            error:
                              result.reason instanceof Error
                                ? result.reason.message
                                : String(result.reason)
                          });
                        }
                      }
                    });
                  });
                });
                throw error;
              }
              return;
            }

            if (
              pathname.startsWith('/encounters/') &&
              pathname.endsWith('/reopen') &&
              request.method === 'POST'
            ) {
              const principal = await requirePrincipal(request, 'encounters.manage');
              const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
              requireEncounterForAccount(encounterId, principal.user.accountId);
              const payload = (await readJsonBody(request)) as { readonly reason: string };
              if (encounterCashReceiptRepository) {
                await assertEncounterHasNoCashReceipt(
                  encounterCashReceiptRepository,
                  principal.user.accountId,
                  encounterId
                );
              }
              if (encounterPixPaymentAttemptRepository) {
                await assertEncounterHasNoActivePixAttempt(
                  encounterPixPaymentAttemptRepository,
                  principal.user.accountId,
                  encounterId
                );
              }
              const encounter = await encounters.reopenEncounterAuthoritatively(
                principal.user.accountId,
                encounterId as never,
                principal.user.id,
                payload.reason
              );
              await syncQueueWithEncounter(
                principal.user.accountId,
                encounter.id,
                encounter.status
              );
              await encounters.waitForPersistence();
              appendAudit(
                principal.user.id,
                principal.user.accountId,
                'encounters',
                'reopen',
                'encounter',
                encounter.id,
                `Encounter reopened: ${payload.reason}`,
                'high',
                correlationId
              );
              response.statusCode = 200;
              response.end(JSON.stringify(encounter));
              return;
            }

            if (
              encounterPixPaymentAttemptCommand &&
              encounterPixPaymentAttemptRepository &&
              (await handlePixPaymentAttemptRoutes(pathname, request, response, {
                command: encounterPixPaymentAttemptCommand,
                repository: encounterPixPaymentAttemptRepository,
                providerKey: encounterPixProviderKey,
                rateLimiter: pixPaymentAttemptRateLimiter,
                requirePrincipal
              }))
            ) {
              return;
            }

            if (
              encounterCashReceiptCommand &&
              encounterCashReceiptRepository &&
              (await handleEncounterCashReceiptRoutes(pathname, request, response, {
                command: encounterCashReceiptCommand,
                repository: encounterCashReceiptRepository,
                audit,
                correlationId,
                requirePrincipal,
                runCommand: runTenantCommand,
                reversalCommand: encounterCashReceiptReversalCommand,
                refreshAccountCaches: refreshEncounterCashReceiptCaches
              }))
            ) {
              return;
            }

            if (
              await handleFinancialRoutes(pathname, request, response, correlationId, {
                encounterFinancial,
                ledger,
                financialPayables,
                financialStatements,
                billing,
                audit,
                pixTransactions,
                cardTransactions,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleCashRoutes(pathname, request, response, correlationId, {
                cash,
                audit,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            if (
              await handleAdministrativeReportsRoutes(pathname, request, response, correlationId, {
                billing,
                encounterFinancial,
                pixTransactions,
                quotes,
                counterSales,
                cash,
                fiscal,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleAdvancePaymentsRoutes(pathname, request, response, {
                advancePayments: options.repositories?.advancePayments,
                audit,
                correlationId,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            if (
              await handleReportsRoutes(pathname, request, response, correlationId, {
                reports,
                billing,
                cash,
                commissions,
                commissionCalculations: options.repositories?.commissionCalculations,
                encounterFinancial,
                financialPayables,
                counterSales,
                inventory,
                scheduling,
                procurement,
                quotes,
                owners,
                patients,
                services,
                fiscal,
                financeCatalog: options.repositories?.financeCatalog,
                advancePayments: options.repositories?.advancePayments,
                audit,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            if (
              await handleMarketingRoutes(pathname, request, response, correlationId, {
                marketing,
                smsGateway,
                emailGateway,
                whatsAppProvider,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleEncounterReadRoutes(pathname, request, response, correlationId, {
                encounters,
                diagnostics,
                encounterFinancial,
                requirePrincipal,
                requireEncounterForAccount: fetchEncounterForAccount,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleEncounterDeleteRoutes(pathname, request, response, correlationId, {
                encounters,
                encounterCashReceiptRepository,
                requirePrincipal,
                requireEncounterForAccount,
                assertEncounterHasNoCashReceipt,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleTriageReadRoutes(pathname, url, request, response, correlationId, {
                triage,
                requirePrincipal,
                requireEncounterForAccount,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleTriageCreateRoute(pathname, request, response, correlationId, {
                triage,
                encounters,
                requirePrincipal,
                requireEncounterForAccount,
                syncQueueWithEncounter,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleTriageUpdateRoute(pathname, request, response, correlationId, {
                triage,
                encounters,
                requirePrincipal,
                syncQueueWithEncounter,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleCounterSalesRoutes(pathname, request, response, correlationId, {
                counterSales,
                audit,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            if (
              await handleCommercialRoutes(pathname, request, response, correlationId, {
                commercial,
                packages,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleCommissionRoutes(pathname, request, response, correlationId, {
                commissions,
                audit,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            if (
              await handleVetusImportRoutes(pathname, request, response, correlationId, {
                owners,
                patients,
                audit,
                importLogStore: vetusImportLogStore,
                importBatchStore: vetusImportLogStore,
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

            if (
              await handleProductServiceCatalogRoutes(
                pathname,
                url,
                request,
                response,
                correlationId,
                { products, services, requirePrincipal, appendAudit }
              )
            ) {
              return;
            }

            if (
              await handleAnimalCatalogRoutes(pathname, url, request, response, correlationId, {
                breeds,
                animalSpecies,
                coatColors,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleCustomerGroupRoutes(pathname, url, request, response, correlationId, {
                customerGroups,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handlePreventiveEventRoutes(pathname, url, request, response, correlationId, {
                preventiveEvents,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            if (
              await handleResponsibilityTermRoutes(
                pathname,
                url,
                request,
                response,
                correlationId,
                {
                  responsibilityTerms,
                  requirePrincipal,
                  appendAudit
                }
              )
            ) {
              return;
            }

            // --- Access Control + Audit (delegated) ---
            if (
              await handleAccessControlRoutes(pathname, request, response, correlationId, {
                accessControl,
                users,
                audit,
                requirePrincipal,
                enforceAbac,
                runCommand: runTenantCommand,
                beginAccessControlMutation: (accountId) =>
                  accessControl.beginAccountMutation(accountId),
                refreshAccessControl: refreshAccessControlCaches
              })
            ) {
              return;
            }

            // --- Inpatient (sectors, beds, inpatient stays) (delegated) ---
            if (
              await handleInpatientRoutes(pathname, request, response, correlationId, {
                inpatient,
                billing,
                medicalRecords,
                sectorBedService,
                audit,
                requirePrincipal,
                runCommand: runTenantCommand,
                onProgressAdded: async ({ stay, progress, principal }) => {
                  medicalRecords.appendAdvancedCareEvent(
                    principal.user.accountId as never,
                    stay.encounterId as never,
                    principal.user.id,
                    'inpatient_progressed',
                    `Evolucao de internacao registrada: ${progress.note}`
                  );
                  await medicalRecords.waitForPersistence();
                },
                onStatusUpdated: async ({ stay, previousStatus, principal }) => {
                  if (stay.status === previousStatus) {
                    return;
                  }
                  const eventType =
                    stay.status === 'discharged'
                      ? 'inpatient_discharged'
                      : stay.status === 'transferred'
                        ? 'inpatient_transferred'
                        : 'inpatient_progressed';
                  const summary =
                    stay.status === 'discharged'
                      ? `Alta da internacao registrada: ${stay.dischargeReason ?? 'sem motivo informado'}`
                      : stay.status === 'transferred'
                        ? `Transferencia de internacao registrada para ${stay.transferToUnit ?? stay.unit}/${stay.transferToWard ?? stay.ward}`
                        : `Status da internacao atualizado para ${stay.status}`;
                  medicalRecords.appendAdvancedCareEvent(
                    principal.user.accountId as never,
                    stay.encounterId as never,
                    principal.user.id,
                    eventType,
                    summary
                  );
                  await medicalRecords.waitForPersistence();
                }
              })
            ) {
              return;
            }

            // --- CEP Lookup (ViaCEP) ---
            if (
              await handleCepLookupRoute(pathname, url, request, response, correlationId, {
                fetcher: (input, init) => fetch(input, init)
              })
            ) {
              return;
            }

            // --- Discharges (delegated) ---
            if (
              await handleDischargesRoutes(pathname, request, response, correlationId, {
                discharges,
                encounters,
                inpatient,
                audit,
                workflowTasks,
                ensureWorkflowTaskSchemaReady,
                requirePrincipal,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            // --- Billing (delegated) ---
            if (
              await handleBillingRoutes(pathname, request, response, correlationId, {
                billing,
                audit,
                requirePrincipal,
                enforceAbac
              })
            ) {
              return;
            }

            // --- Prescriptions (delegated) ---
            if (
              await handlePrescriptionRoutes(pathname, request, response, correlationId, {
                prescriptions,
                audit,
                patients,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Prescription Executions (delegated) ---
            if (
              await handlePrescriptionExecutionsRoutes(pathname, request, response, correlationId, {
                prescriptionExecutions,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Inventory (delegated) ---
            if (
              await handleInventoryRoutes(pathname, request, response, correlationId, {
                inventory,
                billing,
                inpatient,
                refreshAccount: async (accountId) => {
                  await Promise.all([
                    encounters.hydrateFromDatabase(accountId as never),
                    inventory.hydrateFromDatabase(accountId as never),
                    inpatient.refreshAccount(accountId as never)
                  ]);
                },
                procurement,
                audit,
                requirePrincipal,
                enforceAbac,
                runCommand: runTenantCommand
              })
            ) {
              return;
            }

            // --- Inventory warehouses (delegated) ---
            if (
              await handleInventoryWarehousesRoutes(pathname, request, response, correlationId, {
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Inventory manufacturers (delegated) ---
            if (
              await handleInventoryManufacturersRoutes(pathname, request, response, correlationId, {
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Inventory product groups (delegated) ---
            if (
              await handleInventoryProductGroupsRoutes(pathname, request, response, correlationId, {
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Company sectors (delegated) ---
            if (
              await handleCompanySectorsRoutes(pathname, request, response, correlationId, {
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Measurement units (delegated) ---
            if (
              await handleMeasurementUnitsRoutes(pathname, request, response, correlationId, {
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Surgery (delegated) ---
            if (
              await handleSurgeryRoutes(pathname, request, response, correlationId, {
                surgery,
                encounters,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Webhooks (delegated to webhooks-routes) ---
            const webhooksHandled = handleWebhooksRoutes(
              pathname,
              request,
              response,
              correlationId,
              {
                webhooks,
                audit,
                requirePrincipal
              }
            );
            if (await webhooksHandled) return;

            // --- API Keys (delegated) ---
            if (
              await handleApiKeysRoutes(pathname, request, response, correlationId, {
                apiKeys,
                accessControl,
                audit,
                enforceAbac,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Expenses Catalog (delegated) ---
            if (
              await handleExpensesCatalogRoutes(pathname, request, response, correlationId, {
                audit,
                requirePrincipal,
                store: options.repositories?.financeCatalog
              })
            ) {
              return;
            }

            // --- Internal Events (delegated) ---
            if (
              await handleInternalEventsRoutes(pathname, request, response, correlationId, {
                eventBus,
                audit,
                requirePrincipal,
                enforceAbac
              })
            ) {
              return;
            }

            // --- PIX settlement DLQ (delegated) ---
            if (
              await handlePixProviderSettlementRoutes(pathname, request, response, correlationId, {
                repository: options.pixProviderSettlementDlqRepository,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Payments (delegated to payments-routes) ---
            const paymentsHandled = handlePaymentsRoutes(
              pathname,
              request,
              response,
              correlationId,
              {
                eventBus,
                paymentGateway,
                apiKeys,
                audit,
                cardTransactions,
                pixTransactions,
                billing,
                requirePixIdempotencyKey: isProductionLikeEnvironment(options.environment)
              }
            );
            if (await paymentsHandled) return;

            const emailHandled = await handleEmailRoutes(
              pathname,
              request,
              response,
              correlationId,
              {
                emailGateway,
                emailDeliveries,
                emailMode: useEmailMock ? 'mock' : 'provider',
                emailFrom: options.emailFrom ?? 'noreply@cvg-his.local',
                resendConfigured: Boolean(options.resendApiKey),
                apiKeys,
                audit
              }
            );
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

            if (
              await handleMlRoutes(pathname, request, response, correlationId, {
                scheduling,
                laboratory,
                ocrFiscal,
                demandForecasting,
                labAnomalyDetection,
                telemetry: mlTelemetry,
                audit,
                featureFlags,
                featureFlagEvaluator: featureFlags.evaluate,
                featureFlagContext,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- WhatsApp (delegated) ---
            if (
              await handleWhatsAppRoutes(pathname, request, response, correlationId, {
                scheduling,
                audit,
                requirePrincipal,
                featureFlagEvaluator: featureFlags.evaluate,
                featureFlagContext,
                notificationsWhatsappInboundActionsEnabled:
                  featureFlags.notificationsWhatsappInboundActionsEnabled,
                inboundWebhookSecret: options.whatsappWebhookSecret,
                reminderTasks: workflowTasks
              })
            ) {
              return;
            }

            response.statusCode = 404;
            response.end(
              JSON.stringify({ code: 'NOT_FOUND', message: 'Route not found', correlationId })
            );
          };

          if (shouldUseTenantCommand(pathname, request.method) && tenantCtx.accountId) {
            const replayPermissions = idempotencyAuthorizationPermissions(pathname, request.method);
            const replayApiKeyPrincipal = replayPermissions?.includes('payments.manage')
              ? await requireApiKey(request, 'payments.manage')
              : undefined;
            const pixAttemptPrincipal = isPixPaymentAttemptCreate(pathname, request.method)
              ? await requirePrincipal(request, 'billing.manage')
              : undefined;
            if (
              pixAttemptPrincipal &&
              (await applyPixPaymentAttemptRateLimit(
                response,
                pixPaymentAttemptRateLimiter,
                pixAttemptPrincipal,
                'POST /encounters/:id/payments/pix-attempts'
              ))
            ) {
              return;
            }
            const pixAttemptRequestKey = pixAttemptPrincipal
              ? requirePixPaymentAttemptIdempotencyKey(request)
              : undefined;
            const requestPayload = await readTenantCommandPayload(request, url);
            const payload: JsonValue = pixAttemptPrincipal
              ? {
                  request: requestPayload,
                  authenticatedActorUserId: pixAttemptPrincipal.user.id
                }
              : requestPayload;
            const realResponse = response;
            const buffered = createBufferedResponse(realResponse);
            response = buffered.response;
            const checkReplayPermissions = createReplayGuard({
              operation: `${request.method ?? 'UNKNOWN'} ${pathname}`,
              pathname,
              replayPermissions,
              requestPayload,
              requirePrincipal: (permission: string) => requirePrincipal(request, permission),
              requireApiKey: (permission: string) => requireApiKey(request, permission),
              resolveReportPermission: async (body: unknown) => {
                const reference = extractReportCommandReference(body, pathname);
                const rawReportId = resolveReportCommandReportId(
                  reference,
                  reports,
                  tenantCtx.accountId as AccountId
                );
                if (typeof rawReportId !== 'string' || rawReportId.length === 0) return undefined;
                return reports.getDefinition(tenantCtx.accountId as AccountId, rawReportId)
                  .requiredPermission;
              },
              onUnmappedReplay: (operation: string) =>
                logger.warn('replay denied without permission contract', {
                  operation,
                  accountId: tenantCtx.accountId,
                  correlationId
                })
            });
            try {
              const execution = await runTenantCommand({
                request,
                ...(pixAttemptRequestKey
                  ? { idempotencyKey: derivePixPaymentAttemptLedgerKey(pixAttemptRequestKey) }
                  : {}),
                accountId: tenantCtx.accountId,
                actorUserId:
                  replayApiKeyPrincipal?.apiKey.id ??
                  pixAttemptPrincipal?.user.id ??
                  tenantCtx.userId ??
                  `api-key:${tenantCtx.accountId}`,
                correlationId,
                operation: `${request.method ?? 'UNKNOWN'} ${pathname}`,
                payload,
                // Re-authorize inside the tenant transaction before lookup and on
                // every replay (PROD-005/A02): revoked permissions deny replay.
                beforeIdempotency: replayPermissions ? checkReplayPermissions : undefined,
                // Unmapped mutations deny replay explicitly (fail-closed),
                // except documented provider-secret exemptions.
                beforeReplay: isReplayGuardExempt(pathname) ? undefined : checkReplayPermissions,
                onRollback: isPrescriptionExecutionMutationPath(pathname, request.method)
                  ? () => refreshPrescriptionExecutionCaches(tenantCtx.accountId as AccountId)
                  : isDischargeMutationPath(pathname, request.method)
                    ? () => refreshDischargeCaches(tenantCtx.accountId as AccountId)
                    : isInpatientMutationPath(pathname, request.method)
                      ? () => refreshInpatientCaches(tenantCtx.accountId as AccountId)
                      : isMedicalRecordsMutationPath(pathname, request.method)
                        ? () => medicalRecords.refreshAccount(tenantCtx.accountId as AccountId)
                        : pathname.startsWith('/access-control/')
                          ? () => refreshAccessControlCaches(tenantCtx.accountId as AccountId)
                          : pathname === '/vetus-imports' ||
                              pathname === '/vetus-import-batches' ||
                              pathname.startsWith('/vetus-import-batches/')
                            ? () => refreshVetusCaches(tenantCtx.accountId as AccountId)
                            : undefined,
                onCommit: isPrescriptionExecutionMutationPath(pathname, request.method)
                  ? () => refreshPrescriptionExecutionCaches(tenantCtx.accountId as AccountId)
                  : pathname.startsWith('/access-control/')
                    ? () => refreshAccessControlCaches(tenantCtx.accountId as AccountId)
                    : pathname === '/vetus-imports' ||
                        pathname === '/vetus-import-batches' ||
                        pathname.startsWith('/vetus-import-batches/')
                      ? () => refreshVetusCaches(tenantCtx.accountId as AccountId)
                      : isDischargeMutationPath(pathname, request.method)
                        ? () => refreshDischargeCaches(tenantCtx.accountId as AccountId)
                        : undefined,
                command: async () => {
                  await dispatchRequest();
                  await audit.waitForPersistence();
                  return buffered.snapshot();
                }
              });
              response = realResponse;
              applyBufferedResponse(realResponse, execution as unknown as BufferedResponseSnapshot);
            } catch (error) {
              response = realResponse;
              throw error;
            }
            return;
          }

          await dispatchRequest();
        })
      );
    } catch (error) {
      span.attributes['error.type'] =
        error instanceof Error ? error.constructor.name : typeof error;
      logger.error('request failed', { correlationId, error });
      const errorResponse = toErrorResponse(error, correlationId);
      response.statusCode = errorResponse.statusCode;
      response.end(JSON.stringify(errorResponse.body));
    }
  }

  async function requirePrincipal(request: IncomingMessage, permissionCode: string) {
    const accessToken = extractBearerToken(readHeader(request, 'authorization'));
    if (!accessToken) {
      throw new AuthenticationError();
    }
    const synchronizationError = accessTokenSynchronizationErrors.get(request);
    if (synchronizationError) {
      throw synchronizationError;
    }

    // JWT routes only; this final read remains authoritative for fresh ACL.
    // Database transactions provide handler-wide linearization.
    const correlationId = requestCorrelationIds.get(request) ?? createCorrelationId('auth-guard');
    const loadSessionAndRefreshAccessControl = async () => {
      const session = await auth.getSession(accessToken, correlationId).catch((error) => {
        if (error instanceof AppError) throw error;
        throw new AppError('AUTHENTICATION_UNAVAILABLE', 'Authentication service unavailable', 503);
      });
      await accessControl.ensureFreshForRequest(session.accountId);
      return session;
    };
    // Keep authoritative auth and ACL reads on one tenant-scoped connection in database mode.
    const databasePool =
      accessControl.persistenceMode === 'database' ? getInitializedDatabasePool() : undefined;
    const session = databasePool
      ? await runInTenantTransaction(
          databasePool,
          requireAccountId(),
          loadSessionAndRefreshAccessControl
        )
      : await loadSessionAndRefreshAccessControl();
    await acquireAuthorizationTransactionLock(request, session.accountId);
    const principal = auth.authenticateAccessToken(accessToken);
    requestRoles.set(request, principal.access.roleCodes);
    accessControl.assertAuthorized({
      actor: principal.user,
      access: principal.access,
      permissionCode,
      accountId: principal.user.accountId
    });
    return principal;
  }

  async function requireApiKey(request: IncomingMessage, permissionCode: string) {
    const { apiKey } = await requireApiKeyHelper(request, permissionCode, apiKeys);
    requestRoles.set(request, ['api-key']);
    return { apiKey };
  }

  async function requireAttachmentTargetForAccount(
    linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order',
    linkedEntityId: string,
    accountId: string
  ): Promise<void> {
    const targetAccountId =
      linkedEntityType === 'encounter'
        ? requireEncounterForAccount(linkedEntityId, accountId).accountId
        : linkedEntityType === 'medical_record'
          ? (
              await medicalRecords.getRecordOrThrowAsync(
                accountId as never,
                linkedEntityId as never
              )
            ).accountId
          : diagnostics.getOrThrow(accountId as AccountId, linkedEntityId as never).accountId;
    if (targetAccountId !== accountId) {
      throw new NotFoundError('Attachment target not found', {
        linkedEntityType,
        linkedEntityId
      });
    }
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

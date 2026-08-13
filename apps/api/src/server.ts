import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { getPool } from '@cvg-his-v2/shared-database';
import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import { createAuthRateLimiter } from './http/auth-rate-limiter.js';
import {
  deferResponseEndUntilCommitted,
  executeWithAuditFlush
} from './http/transactional-response.js';
import { toErrorResponse } from '@cvg-his-v2/shared-errors';
import { createLogger } from '@cvg-his-v2/shared-logging';
import {
  resolveTenantFromRequest,
  runWithTenantContext,
  withTenantQuery
} from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';

import { handleAuthRoutes } from './routes/auth-routes.js';
import { handleOpenApiRoutes } from './routes/openapi-routes.js';
import { handleFiscalRoutes } from './routes/fiscal-routes.js';
import { handleHealthRoutes } from './routes/health-routes.js';
import { handleLaboratoryRoutes } from './routes/laboratory-routes.js';
import { handleLgpdRoutes } from './routes/lgpd-routes.js';
import { handlePaymentsRoutes } from './routes/payments-routes.js';
import { handleEmailRoutes } from './routes/email-routes.js';
import { handleSmsRoutes } from './routes/sms-routes.js';
import { handleFinancialRoutes } from './routes/financial-routes.js';
import { handleCashRoutes } from './routes/cash-routes.js';
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
import { handleMarketingRoutes } from './routes/marketing-routes.js';
import { handleSurgeryRoutes } from './routes/surgery-routes.js';
import { handleWhatsAppRoutes } from './routes/whatsapp-routes.js';
import { handleAccessControlRoutes } from './routes/access-control-routes.js';
import { handleInpatientRoutes } from './routes/inpatient-routes.js';
import { handleApiKeysRoutes } from './routes/api-keys-routes.js';
import { handleInternalEventsRoutes } from './routes/internal-events-routes.js';
import { handleCounterSalesRoutes } from './routes/counter-sales-routes.js';
import { handleOwnersRoutes } from './routes/owners-routes.js';
import { handlePatientsRoutes } from './routes/patients-routes.js';
import { handleVetusImportRoutes, type VetusImportSummary } from './routes/vetus-import-routes.js';
import { handleUsersStaffQuotesRoutes } from './routes/users-staff-quotes-routes.js';
import { createAbacEnforcer } from './routes/abac-enforcer.js';
import { handleCepRoutes } from './routes/cep-routes.js';
import { handleCatalogDispatchRoutes } from './routes/catalog-dispatch-routes.js';
import { handleClinicalDispatchRoutes } from './routes/clinical-dispatch-routes.js';
import { handleEncountersRoutes } from './routes/encounters-routes.js';
import { createEncounterQueueSync } from './routes/encounter-queue-sync.js';
import { type NotificationPersistence } from './routes/notifications-routes.js';
import { handleOperationalRoutes } from './routes/operational-routes.js';
import { handleTriageRoutes } from './routes/triage-routes.js';
import { createAppendAudit, createRequirePrincipal } from './routes/route-handler-types.js';
import { readHeader } from './helpers/auth-helpers.js';
import { initializeRequestObservability } from './routes/request-observability.js';
import {
  ChaosEngine,
  databaseFailureExperiment,
  redisFailureExperiment,
  networkLatencyExperiment,
  workerFailureExperiment,
  apiLatencyExperiment
} from '@cvg-his-v2/chaos';
import { createApiRuntime } from './runtime.js';
import { InMemoryEmailDeliveryRepository } from './email-delivery-repository.js';
import { InMemorySmsDeliveryRepository } from './sms-delivery-repository.js';
import { InMemoryGoogleCalendarSyncRepository } from './google-calendar-sync-repository.js';
import { InMemoryLaboratoryResultImportRepository } from './laboratory-result-import-repository.js';
import { createIntegrationGateways } from './integration-gateways.js';
import { registerChaosExperimentOnce } from './chaos-registration.js';
import { DEFAULT_CORS_ALLOWED_ORIGINS } from './http/cors.js';
import { createApiSecurityServices } from './api-security-services.js';
import { tracingMiddleware, withSpanContext } from './tracing.js';
import { FiscalService } from '@cvg-his-v2/module-fiscal';
import type { ApiServerOptions } from './server-options.js';
import {
  DemandForecastingService,
  LabAnomalyDetectionService,
  OcrFiscalService
} from '@cvg-his-v2/module-ml';
import { MlTelemetryService } from './ml-telemetry.js';
import {
  createAnimalSpeciesStore,
  createBreedStore,
  createCoatColorStore,
  createCustomerGroupStore,
  createPreventiveEventStore,
  createResponsibilityTermStore
} from './catalog-stores.js';

export type { ApiServerOptions } from './server-options.js';

export type ApiServer = ReturnType<typeof createServer> & {
  readonly ready: Promise<void>;
};
export function createApiServer(options: ApiServerOptions): ApiServer {
  const logger = createLogger(options.appName);
  const corsAllowedOrigins = options.corsAllowedOrigins ?? DEFAULT_CORS_ALLOWED_ORIGINS;
  const effectiveRuntimeDistributedStateEnabled =
    options.runtimeDistributedStateEnabled ??
    options.featureFlags?.runtimeDistributedStateEnabled ??
    false;
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
    financialPayables,
    financialStatements,
    commercial,
    commissions,
    packages,
    reports,
    inventory,
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
    initialize,
    initializeTenant
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
    preserveSeedUsersWithRepository: options.environment === 'test',
    preserveSeedMasterDataWithRepository:
      options.preserveSeedMasterDataWithRepository ?? options.environment !== 'test'
  });
  const integrationGateways = createIntegrationGateways(options);
  const {
    paymentGateway,
    emailGateway,
    smsGateway,
    googleCalendarGateway,
    emailProvider,
    smsProvider,
    googleCalendarProvider,
    googleCalendarConfigured
  } = integrationGateways;
  const useEmailMock = emailProvider === 'local-email';
  const useSmsMock = smsProvider === 'local-sms';
  const useGoogleCalendarMock = googleCalendarProvider === 'local-google-calendar';
  const allowInMemoryCatalogFallback = options.allowInMemoryCatalogFallback ?? true;
  const catalogStoreOptions = { allowInMemoryFallback: allowInMemoryCatalogFallback };
  logger.info('integration gateways initialized', {
    paymentProvider: integrationGateways.paymentProvider,
    emailProvider,
    smsProvider,
    googleCalendarProvider
  });
  const emailDeliveries = new InMemoryEmailDeliveryRepository();
  const smsDeliveries = new InMemorySmsDeliveryRepository();
  const googleCalendarSyncs = new InMemoryGoogleCalendarSyncRepository();
  const laboratoryResultImports = new InMemoryLaboratoryResultImportRepository();
  const ocrFiscal = new OcrFiscalService();
  const demandForecasting = new DemandForecastingService();
  const labAnomalyDetection = new LabAnomalyDetectionService();
  const fiscal = new FiscalService();
  const mlTelemetry = new MlTelemetryService();
  const responsibilityTerms = createResponsibilityTermStore(catalogStoreOptions);
  const breeds = createBreedStore(catalogStoreOptions);
  const animalSpecies = createAnimalSpeciesStore(catalogStoreOptions);
  const coatColors = createCoatColorStore(catalogStoreOptions);
  const customerGroups = createCustomerGroupStore(catalogStoreOptions);
  const preventiveEvents = createPreventiveEventStore(catalogStoreOptions);
  const vetusImportLogStore = new Map<string, VetusImportSummary>();

  // Rate limiter for auth endpoints (GAP-11: uses createAuthRateLimiter helper)
  // GAP-05: runtimeDistributedStateEnabled gates Redis backend for distributed rate limiting
  const authRateLimiter = createAuthRateLimiter(logger, {
    authRateLimitWindowMs: options.authRateLimitWindowMs,
    authRateLimitMaxRequests: options.authRateLimitMaxRequests,
    redisUrl: options.redisUrl,
    runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled
  });

  const {
    abacEngine,
    featureFlagRepository,
    webauthnService,
    webauthnChallenges,
    webauthnChallengeTtlMs,
    oidcStateStore,
    oidcStateTtlMs,
    oidcConfig,
    soc2MfaControl,
    soc2VulnControl,
    soc2AccessControl,
    soc2DrControl,
    soc2IncidentControl
  } = createApiSecurityServices({
    authSecret: options.authSecret,
    runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled
  });

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

  const enforceAbac = createAbacEnforcer({ accessControl, abacEngine });

  const notificationPersistence = notifications as unknown as NotificationPersistence;
  const appendAudit = createAppendAudit(audit);
  const requirePrincipal = createRequirePrincipal(auth, accessControl);
  const syncQueueWithEncounter = createEncounterQueueSync({ encounters, scheduling });

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
    const { span, correlationId, corsDecision } = initializeRequestObservability(
      request,
      response,
      { environment: options.environment, corsAllowedOrigins }
    );

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

      if (
        await handleOperationalRoutes(request, response, {
          chaos,
          runtimeDistributedStateEnabled: effectiveRuntimeDistributedStateEnabled,
          redisUrl: options.redisUrl,
          logError: (message, context) => logger.error(message, context)
        })
      ) {
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
        pathname.startsWith('/auth/') ||
        pathname.startsWith('/api/auth/') ||
        pathname === '/webhooks/whatsapp/inbound' ||
        pathname === '/api/webhooks/whatsapp/inbound';

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
          const dispatchRequest = async (): Promise<void> => {
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
                webauthnChallengeTtlMs,
                oidcStateStore,
                oidcStateTtlMs,
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

            if (
              await handleClinicalDispatchRoutes(pathname, request, response, correlationId, {
                medicalRecords,
                attachments,
                diagnostics,
                inpatient,
                notifications,
                notificationPersistence,
                clinicalHandoffs,
                encounters,
                audit,
                requirePrincipal,
                enforceAbac
              })
            ) {
              return;
            }

            if (
              await handleFinancialRoutes(pathname, request, response, correlationId, {
                encounterFinancial,
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
                requirePrincipal
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
              await handleReportsRoutes(pathname, request, response, correlationId, {
                reports,
                billing,
                cash,
                commissions,
                counterSales,
                quotes,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleMarketingRoutes(pathname, request, response, correlationId, {
                marketing,
                smsGateway,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleEncountersRoutes(pathname, request, response, correlationId, {
                encounters,
                scheduling,
                diagnostics,
                billing,
                encounterFinancial,
                audit,
                requirePrincipal,
                syncQueueWithEncounter
              })
            ) {
              return;
            }

            if (
              await handleTriageRoutes(pathname, request, response, correlationId, {
                triage,
                encounters,
                audit,
                requirePrincipal,
                syncQueueWithEncounter
              })
            ) {
              return;
            }

            if (
              await handleCounterSalesRoutes(pathname, request, response, correlationId, {
                counterSales,
                owners,
                audit,
                requirePrincipal
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
                requirePrincipal
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
                owners,
                counterSales,
                accessControl,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            if (
              await handleCatalogDispatchRoutes(pathname, request, response, correlationId, {
                products,
                services,
                breeds,
                animalSpecies,
                coatColors,
                customerGroups,
                preventiveEvents,
                owners,
                patients,
                responsibilityTerms,
                audit,
                requirePrincipal,
                appendAudit
              })
            ) {
              return;
            }

            // --- Access Control + Audit (delegated) ---
            if (
              await handleAccessControlRoutes(pathname, request, response, correlationId, {
                accessControl,
                users,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Inpatient (sectors, beds, inpatient stays) (delegated) ---
            if (
              await handleInpatientRoutes(pathname, request, response, correlationId, {
                inpatient,
                billing,
                sectorBedService,
                audit,
                requirePrincipal,
                onAdmitted: ({ stay, principal }) => {
                  medicalRecords.appendAdvancedCareEvent(
                    stay.encounterId as never,
                    principal.user.id,
                    'inpatient_admitted',
                    `Internacao iniciada em ${stay.unit}/${stay.ward}/${stay.bed}`
                  );
                },
                onProgressAdded: ({ stay, progress, principal }) => {
                  medicalRecords.appendAdvancedCareEvent(
                    stay.encounterId as never,
                    principal.user.id,
                    'inpatient_progressed',
                    `Evolucao de internacao registrada: ${progress.note}`
                  );
                },
                onStatusUpdated: ({ stay, previousStatus, principal }) => {
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
                    stay.encounterId as never,
                    principal.user.id,
                    eventType,
                    summary
                  );
                }
              })
            ) {
              return;
            }

            if (await handleCepRoutes(pathname, request, response, correlationId)) {
              return;
            }

            // --- Discharges (delegated) ---
            if (
              await handleDischargesRoutes(pathname, request, response, correlationId, {
                discharges,
                encounters,
                audit,
                requirePrincipal
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
                medicalRecords,
                audit,
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Prescription Executions (delegated) ---
            if (
              await handlePrescriptionExecutionsRoutes(pathname, request, response, correlationId, {
                prescriptionExecutions,
                encounters,
                prescriptions,
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
                audit,
                requirePrincipal,
                enforceAbac
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
                requirePrincipal
              })
            ) {
              return;
            }

            // --- Internal Events (delegated) ---
            if (
              handleInternalEventsRoutes(pathname, request, response, correlationId, {
                eventBus,
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
                cardTransactions
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
                googleCalendarConfigured,
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
                notificationsWhatsappInboundActionsEnabled:
                  featureFlags.notificationsWhatsappInboundActionsEnabled
              })
            ) {
              return;
            }

            response.statusCode = 404;
            response.end(
              JSON.stringify({ code: 'NOT_FOUND', message: 'Route not found', correlationId })
            );
          };

          const executeRequest = async (): Promise<void> => {
            await executeWithAuditFlush(audit, correlationId, async () => {
              if (tenantCtx.accountId) {
                await initializeTenant(tenantCtx.accountId as AccountId);
              }
              await dispatchRequest();
            });
          };

          if (options.databaseRequestTransactions && tenantCtx.accountId) {
            await deferResponseEndUntilCommitted(response, () =>
              withTenantQuery(getPool(), executeRequest)
            );
            return;
          }

          await deferResponseEndUntilCommitted(response, executeRequest);
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
}

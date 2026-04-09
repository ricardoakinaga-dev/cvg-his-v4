import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import type {
  AddInpatientProgressRequest,
  ArchiveClinicalEntryRequest,
  AssignBedRequest,
  CheckInQueueRequest,
  CloseEncounterRequest,
  CreateAppointmentRequest,
  CreateAttachmentRequest,
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  CreateClinicalEntryRequest,
  CreateDiagnosticOrderRequest,
  CreateDischargeRequest,
  CreateEncounterRequest,
  CreateInpatientAdmissionRequest,
  CreateInventoryConsumptionRequest,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  CreateNotificationRequest,
  CreateOwnerPatientLinkRequest,
  CreateOwnerRequest,
  CreatePatientRequest,
  CreatePrescriptionExecutionRequest,
  CreateSectorRequest,
  CreateBedRequest,
  CreateSurgeryCaseRequest,
  CreateTriageRequest,
  UpdateTriageRequest,
  ExecutePrescriptionRequest,
  LoginRequest,
  LogoutRequest,
  LogAdministrationEventRequest,
  ProcessNotificationsRequest,
  RefreshSessionRequest,
  RecordDiagnosticResultRequest,
  SuspendPrescriptionRequest,
  TransitionEncounterRequest,
  UpdateBillingStatusRequest,
  UpdateClinicalEntryRequest,
  UpdateDischargeRequest,
  UpdateInpatientStatusRequest,
  UpdateOwnerRequest,
  UpdateSurgeryStatusRequest,
  UpdatePatientRequest,
  UpdateUserRequest,
  CreateWebhookRequest,
  UpdateWebhookRequest
} from '@cvg-his-v2/shared-contracts';
import { AuthenticationError, ValidationError, toErrorResponse } from '@cvg-his-v2/shared-errors';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { runWithTenantContext, type TenantContext } from '@cvg-his-v2/tenant-context';
import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';

import { createHealthResponse, createLivenessResponse, createReadinessResponse } from './health.js';
import { createApiRuntime, type RuntimeRepositories } from './runtime.js';
import {
  getMetricsText,
  httpErrorsTotal,
  httpRequestDurationSeconds,
  httpRequestsTotal,
  normalizeRoute,
  updateAppMetrics
} from './metrics.js';
import type { FileStorage } from '@cvg-his-v2/module-attachments';
import { getAppState } from './app-state.js';

export interface ApiServerOptions {
  readonly appName: string;
  readonly environment: string;
  readonly version: string;
  readonly authSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly repositories?: RuntimeRepositories;
  readonly fileStorage?: FileStorage;
}

export function createApiServer(options: ApiServerOptions) {
  const logger = createLogger(options.appName);
  const {
    accessControl,
    users,
    staff,
    owners,
    patients,
    scheduling,
    encounters,
    triage,
    medicalRecords,
    attachments,
    inpatient,
    sectorBedService,
    surgery,
    diagnostics,
    billing,
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
    initialize
  } = createApiRuntime({
    authSecret: options.authSecret,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
    repositories: options.repositories,
    fileStorage: options.fileStorage
  });

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

  void initialize().catch((err) => {
    logger.error('Failed to initialize services from database', {
      error: err instanceof Error ? err.message : String(err)
    });
  });

  return createServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response);
  });

  async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    const startTime = process.hrtime.bigint();
    const correlationIdHeader = request.headers['x-correlation-id'];
    const correlationId =
      typeof correlationIdHeader === 'string' ? correlationIdHeader : createCorrelationId('api');

    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('x-request-id', correlationId);
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader(
      'access-control-allow-headers',
      'content-type, authorization, x-correlation-id, x-request-id'
    );
    response.setHeader('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');

    // Security headers (Helmet-like)
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('x-frame-options', 'DENY');
    response.setHeader('x-xss-protection', '1; mode=block');
    response.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    response.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
    response.setHeader('cache-control', 'no-store, no-cache, must-revalidate');

    // Track metrics when response finishes
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

      if (statusCode >= 400) {
        const category = statusCode >= 500 ? '5xx' : '4xx';
        httpErrorsTotal.inc({ status_category: category });
      }

      // Log request completion (INFO for success, WARN for 4xx, ERROR for 5xx)
      if (statusCode >= 500) {
        logger.error('request completed', {
          correlationId,
          method,
          url: request.url,
          statusCode,
          durationMs: Math.round(durationSec * 1000)
        });
      } else if (statusCode >= 400) {
        logger.warn('request completed', {
          correlationId,
          method,
          url: request.url,
          statusCode,
          durationMs: Math.round(durationSec * 1000)
        });
      } else {
        logger.debug('request completed', {
          correlationId,
          method,
          url: request.url,
          statusCode,
          durationMs: Math.round(durationSec * 1000)
        });
      }
    });

    try {
      // Inject tenant context for this request
      const tenantId =
        (request.headers['x-tenant-id'] as string) ?? '00000000-0000-0000-0000-000000000001';
      const tenantCtx: TenantContext = {
        tenantId,
        accountId: 'pending',
        branchId: (request.headers['x-branch-id'] as string) ?? undefined,
        userId: undefined,
        correlationId
      };

      return await runWithTenantContext(tenantCtx, async () => {
        if (request.method === 'OPTIONS') {
          response.statusCode = 204;
          response.end();
          return;
        }

        if (request.url === '/health' && request.method === 'GET') {
          const appState = getAppState();
          const payload = createHealthResponse(
            options.appName,
            options.environment,
            options.version,
            request,
            {
              databaseConfigured: appState.databaseConfigured,
              databaseHealthy: appState.databaseHealthy,
              databaseDetail: appState.databaseDetail,
              persistenceMode: appState.persistenceMode,
              repositoriesReady: appState.repositoriesReady,
              repositoryCount: appState.repositoryCount,
              workerReady: appState.workerReady,
              workerDetail: appState.workerDetail,
              productionReady: appState.productionReady,
              initialized: appState.initialized
            }
          );
          response.statusCode = 200;
          response.end(JSON.stringify(payload));
          return;
        }

        if (request.url === '/metrics' && request.method === 'GET') {
          const appState = getAppState();
          updateAppMetrics({
            uptime: Math.round(process.uptime()),
            activeRequests: 0,
            dbHealthy: appState.databaseHealthy,
            persistenceMode: appState.persistenceMode
          });

          const metricsText = await getMetricsText();
          response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
          response.statusCode = 200;
          response.end(metricsText);
          return;
        }

        if (request.url === '/ready' && request.method === 'GET') {
          const appState = getAppState();
          const payload = createReadinessResponse(
            options.appName,
            options.environment,
            options.version,
            request,
            {
              databaseConfigured: appState.databaseConfigured,
              databaseHealthy: appState.databaseHealthy,
              databaseDetail: appState.databaseDetail,
              persistenceMode: appState.persistenceMode,
              repositoriesReady: appState.repositoriesReady,
              repositoryCount: appState.repositoryCount,
              workerReady: appState.workerReady,
              workerDetail: appState.workerDetail,
              productionReady: appState.productionReady,
              initialized: appState.initialized
            }
          );
          response.statusCode = payload.readiness.ready ? 200 : 503;
          response.end(JSON.stringify(payload));
          return;
        }

        if (request.url === '/health/ready' && request.method === 'GET') {
          const appState = getAppState();
          const payload = createReadinessResponse(
            options.appName,
            options.environment,
            options.version,
            request,
            {
              databaseConfigured: appState.databaseConfigured,
              databaseHealthy: appState.databaseHealthy,
              databaseDetail: appState.databaseDetail,
              persistenceMode: appState.persistenceMode,
              repositoriesReady: appState.repositoriesReady,
              repositoryCount: appState.repositoryCount,
              workerReady: appState.workerReady,
              workerDetail: appState.workerDetail,
              productionReady: appState.productionReady,
              initialized: appState.initialized
            }
          );
          response.statusCode = payload.readiness.ready ? 200 : 503;
          response.end(JSON.stringify(payload));
          return;
        }

        if (request.url === '/live' && request.method === 'GET') {
          const appState = getAppState();
          const payload = createLivenessResponse(
            options.appName,
            options.environment,
            options.version,
            request,
            appState.initialized
          );
          response.statusCode = 200;
          response.end(JSON.stringify(payload));
          return;
        }

        if (request.url === '/health/live' && request.method === 'GET') {
          const appState = getAppState();
          const payload = createLivenessResponse(
            options.appName,
            options.environment,
            options.version,
            request,
            appState.initialized
          );
          response.statusCode = 200;
          response.end(JSON.stringify(payload));
          return;
        }

        const url = new URL(request.url ?? '/', 'http://localhost');
        const pathname = url.pathname;

        if (pathname === '/auth/login' && request.method === 'POST') {
          try {
            const payload = (await readJsonBody(request)) as LoginRequest;
            const session = await auth.login(payload, correlationId);
            response.statusCode = 200;
            response.end(JSON.stringify(session));
          } catch (error) {
            logger.error('auth login failed', { correlationId, error });
            const errorResponse = toErrorResponse(error, correlationId);
            response.statusCode = errorResponse.statusCode;
            response.end(JSON.stringify(errorResponse.body));
          }
          return;
        }

        if (pathname === '/auth/refresh' && request.method === 'POST') {
          const payload = (await readJsonBody(request)) as RefreshSessionRequest;
          const session = auth.refresh(payload, correlationId);
          response.statusCode = 200;
          response.end(JSON.stringify(session));
          return;
        }

        if (pathname === '/auth/logout' && request.method === 'POST') {
          const payload = (await readJsonBody(request).catch(
            () => ({}) as LogoutRequest
          )) as LogoutRequest;
          auth.logout(
            {
              refreshToken: payload.refreshToken,
              accessToken: extractBearerToken(readHeader(request, 'authorization'))
            },
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        if (pathname === '/auth/login/mfa' && request.method === 'POST') {
          const payload = (await readJsonBody(request)) as { userId: string; token: string };
          const result = await auth.completeMfaLogin(
            { userId: payload.userId, token: payload.token },
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(result));
          return;
        }

        if (pathname === '/mfa/setup' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'auth.mfa.manage');
          const mfaSvc = auth.mfaService;
          if (!mfaSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'MFA not configured' })
            );
            return;
          }
          const setup = await mfaSvc.initiateSetup(
            principal.user.id,
            principal.user.email,
            options.appName
          );
          response.statusCode = 200;
          response.end(JSON.stringify(setup));
          return;
        }

        if (pathname === '/mfa/setup/confirm' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'auth.mfa.manage');
          const mfaSvc = auth.mfaService;
          if (!mfaSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'MFA not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as { token: string };
          const record = await mfaSvc.confirmSetup(principal.user.id, payload.token);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'auth',
            'mfa_setup_confirmed',
            'mfa',
            principal.user.id,
            'MFA TOTP setup confirmed',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ isActive: record.isActive }));
          return;
        }

        if (pathname === '/mfa/status' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'auth.mfa.read');
          const mfaSvc = auth.mfaService;
          if (!mfaSvc) {
            response.statusCode = 200;
            response.end(JSON.stringify({ isActive: false, isRequired: false }));
            return;
          }
          const isActive = await mfaSvc.isMfaActive(principal.user.id);
          const isRequired = mfaSvc.isMfaRequired(principal.access.roleCodes);
          response.statusCode = 200;
          response.end(JSON.stringify({ isActive, isRequired }));
          return;
        }

        if (pathname === '/mfa/disable' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'auth.mfa.manage');
          const mfaSvc = auth.mfaService;
          if (!mfaSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'MFA not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as { token: string };
          await mfaSvc.disableMfa(principal.user.id, payload.token);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'auth',
            'mfa_disabled',
            'mfa',
            principal.user.id,
            'MFA TOTP disabled',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ success: true }));
          return;
        }

        if (pathname === '/mfa/recovery-codes/regenerate' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'auth.mfa.manage');
          const mfaSvc = auth.mfaService;
          if (!mfaSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'MFA not configured' })
            );
            return;
          }
          const codes = await mfaSvc.regenerateRecoveryCodes(principal.user.id);
          response.statusCode = 200;
          response.end(JSON.stringify({ recoveryCodes: codes }));
          return;
        }

        // ========================================================================
        // LGPD Endpoints
        // ========================================================================

        if (pathname === '/lgpd/consent' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'lgpd.consent.manage');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as {
            subjectId: string;
            subjectType: 'owner' | 'patient' | 'user';
            purpose: string;
            origin?: string;
            expiresAt?: string;
            metadata?: Record<string, unknown>;
          };
          const record = await lgpdSvc.grantConsent({
            accountId: principal.user.accountId,
            subjectId: payload.subjectId,
            subjectType: payload.subjectType,
            purpose: payload.purpose as never,
            origin: payload.origin as never,
            grantedBy: principal.user.id,
            expiresAt: payload.expiresAt,
            metadata: payload.metadata
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'lgpd',
            'consent_granted',
            'consent',
            record.id,
            `Consent granted for ${payload.purpose}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(record));
          return;
        }

        if (pathname === '/lgpd/consent/revoke' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'lgpd.consent.manage');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as {
            subjectId: string;
            subjectType: 'owner' | 'patient' | 'user';
            purpose: string;
          };
          const record = await lgpdSvc.revokeConsent({
            accountId: principal.user.accountId,
            subjectId: payload.subjectId,
            subjectType: payload.subjectType,
            purpose: payload.purpose as never,
            revokedBy: principal.user.id
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'lgpd',
            'consent_revoked',
            'consent',
            record.id,
            `Consent revoked for ${payload.purpose}`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(record));
          return;
        }

        if (pathname === '/lgpd/consent' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'lgpd.consent.read');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 200;
            response.end(JSON.stringify({ consents: [] }));
            return;
          }
          const url = new URL(request.url!, `http://${request.headers.host}`);
          const subjectId = url.searchParams.get('subjectId');
          const subjectType = url.searchParams.get('subjectType') as
            | 'owner'
            | 'patient'
            | 'user'
            | null;
          const activeOnly = url.searchParams.get('activeOnly') === 'true';

          if (!subjectId || !subjectType) {
            response.statusCode = 400;
            response.end(
              JSON.stringify({
                code: 'BAD_REQUEST',
                message: 'subjectId and subjectType are required'
              })
            );
            return;
          }

          const consents = activeOnly
            ? await lgpdSvc.getActiveCons(principal.user.accountId, subjectId, subjectType)
            : await lgpdSvc.getConsents(principal.user.accountId, subjectId, subjectType);
          response.statusCode = 200;
          response.end(JSON.stringify({ consents }));
          return;
        }

        if (pathname === '/lgpd/consent/status' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'lgpd.consent.read');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 200;
            response.end(JSON.stringify({ active: {} }));
            return;
          }
          const url = new URL(request.url!, `http://${request.headers.host}`);
          const subjectId = url.searchParams.get('subjectId');
          const subjectType = url.searchParams.get('subjectType') as
            | 'owner'
            | 'patient'
            | 'user'
            | null;

          if (!subjectId || !subjectType) {
            response.statusCode = 400;
            response.end(
              JSON.stringify({
                code: 'BAD_REQUEST',
                message: 'subjectId and subjectType are required'
              })
            );
            return;
          }

          const purposes: readonly string[] = [
            'marketing',
            'analytics',
            'clinical',
            'financial',
            'operational',
            'notifications'
          ];
          const active: Record<string, boolean> = {};
          for (const purpose of purposes) {
            active[purpose] = await lgpdSvc.isConsentActive(
              principal.user.accountId,
              subjectId,
              subjectType,
              purpose as never
            );
          }
          response.statusCode = 200;
          response.end(JSON.stringify({ subjectId, subjectType, active }));
          return;
        }

        if (pathname === '/lgpd/requests' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'lgpd.requests.manage');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as {
            subjectId: string;
            subjectType: 'owner' | 'patient' | 'user';
            requestType: string;
            notes?: string;
          };
          const dsrRequest = await lgpdSvc.createDsrRequest({
            accountId: principal.user.accountId,
            subjectId: payload.subjectId,
            subjectType: payload.subjectType,
            requestType: payload.requestType as never,
            requestedBy: principal.user.id,
            notes: payload.notes
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'lgpd',
            'dsr_created',
            'data_subject_request',
            dsrRequest.id,
            `DSR created: ${payload.requestType}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(dsrRequest));
          return;
        }

        if (pathname === '/lgpd/requests' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'lgpd.requests.read');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 200;
            response.end(JSON.stringify({ requests: [] }));
            return;
          }
          const url = new URL(request.url!, `http://${request.headers.host}`);
          const subjectId = url.searchParams.get('subjectId');
          const subjectType = url.searchParams.get('subjectType') as
            | 'owner'
            | 'patient'
            | 'user'
            | null;
          const status = url.searchParams.get('status');

          if (subjectId && subjectType) {
            const requests = await lgpdSvc.getDsrRequestsBySubject(
              principal.user.accountId,
              subjectId,
              subjectType
            );
            response.statusCode = 200;
            response.end(JSON.stringify({ requests }));
            return;
          }

          if (status) {
            const requests = await lgpdSvc.getDsrRequestsByStatus(
              principal.user.accountId,
              status as never
            );
            response.statusCode = 200;
            response.end(JSON.stringify({ requests }));
            return;
          }

          response.statusCode = 400;
          response.end(
            JSON.stringify({
              code: 'BAD_REQUEST',
              message: 'Provide subjectId+subjectType or status query param'
            })
          );
          return;
        }

        if (pathname === '/lgpd/requests/complete' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'lgpd.requests.manage');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as {
            requestId: string;
            resultJson?: Record<string, unknown>;
          };
          const dsrRequest = await lgpdSvc.completeDsrRequest(
            payload.requestId,
            principal.user.id,
            payload.resultJson
          );
          response.statusCode = 200;
          response.end(JSON.stringify(dsrRequest));
          return;
        }

        if (pathname === '/lgpd/requests/reject' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'lgpd.requests.manage');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as {
            requestId: string;
            reason: string;
          };
          const dsrRequest = await lgpdSvc.rejectDsrRequest(
            payload.requestId,
            principal.user.id,
            payload.reason
          );
          response.statusCode = 200;
          response.end(JSON.stringify(dsrRequest));
          return;
        }

        if (pathname === '/lgpd/export' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'lgpd.requests.manage');
          const lgpdSvc = lgpd;
          if (!lgpdSvc) {
            response.statusCode = 501;
            response.end(
              JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as {
            subjectId: string;
            subjectType: 'owner' | 'patient' | 'user';
            dataProviders?: Record<string, unknown>;
          };

          const exportData = await lgpdSvc.buildPersonalDataExport(
            principal.user.accountId,
            payload.subjectId,
            payload.subjectType,
            (payload.dataProviders as never) ?? {}
          );

          response.statusCode = 200;
          response.end(JSON.stringify(exportData));
          return;
        }

        if (pathname === '/auth/session' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'auth.session.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'auth',
            'session_read',
            'session',
            principal.session.sessionId,
            'Current session inspected',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              session: principal.session,
              access: principal.access,
              principal
            })
          );
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
          const entryId = requireNonEmptyString(pathname.split('/')[3], 'entryId');
          const principal = requirePrincipal(request, 'medical-records.manage');

          if (request.method === 'PATCH') {
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

          if (request.method === 'DELETE') {
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

        if (pathname === '/appointments' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'scheduling.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'list_appointments',
            'appointment',
            'all',
            'Appointments listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({ items: scopedScheduling.listAppointments(principal.user.accountId) })
          );
          return;
        }

        if (pathname === '/appointments' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'scheduling.manage');
          const payload = (await readJsonBody(request)) as CreateAppointmentRequest;
          const appointment = await scheduling.createAppointment(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'create_appointment',
            'appointment',
            appointment.id,
            `Appointment created for patient ${appointment.patientId}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(appointment));
          return;
        }

        if (pathname.startsWith('/appointments/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'scheduling.read');
          const appointmentId = requireNonEmptyString(pathname.split('/')[2], 'appointmentId');
          const appointment = scheduling.getAppointmentOrThrow(appointmentId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'get_appointment',
            'appointment',
            appointmentId,
            `Appointment ${appointmentId} retrieved`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(appointment));
          return;
        }

        if (
          pathname.startsWith('/appointments/') &&
          pathname.endsWith('/cancel') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'scheduling.manage');
          const appointmentId = requireNonEmptyString(pathname.split('/')[2], 'appointmentId');
          const body = (await readJsonBody(request)) as Record<string, unknown> | undefined;
          const reason = (body?.reason as string) ?? undefined;
          const cancelled = await scheduling.cancelAppointment(appointmentId as never, reason);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'cancel_appointment',
            'appointment',
            cancelled.id,
            `Appointment cancelled for patient ${cancelled.patientId}`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(cancelled));
          return;
        }

        if (pathname === '/queue' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'scheduling.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'list_queue',
            'queue-entry',
            'all',
            'Operational queue listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({ items: scopedScheduling.getQueue(principal.user.accountId) })
          );
          return;
        }

        if (pathname === '/queue/check-in' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'scheduling.manage');
          const payload = (await readJsonBody(request)) as CheckInQueueRequest;
          const entry = await scheduling.checkIn(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'check_in',
            'queue-entry',
            entry.id,
            `Patient ${entry.patientId} checked in`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(entry));
          return;
        }

        if (
          pathname.startsWith('/queue/') &&
          pathname.endsWith('/call') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'scheduling.manage');
          const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
          const entry = await scheduling.callQueueEntry(queueEntryId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'call_queue_entry',
            'queue-entry',
            entry.id,
            `Queue entry ${entry.id} called`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(entry));
          return;
        }

        if (
          pathname.startsWith('/queue/') &&
          pathname.endsWith('/start-care') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'scheduling.manage');
          const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
          const entry = await scheduling.transitionQueueEntry(
            queueEntryId as never,
            'in_care' as never
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'start_care',
            'queue-entry',
            entry.id,
            `Queue entry ${entry.id} transitioned to in_care`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(entry));
          return;
        }

        if (
          pathname.startsWith('/queue/') &&
          pathname.endsWith('/no-show') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'scheduling.manage');
          const queueEntryId = requireNonEmptyString(pathname.split('/')[2], 'queueEntryId');
          const entry = await scheduling.transitionQueueEntry(
            queueEntryId as never,
            'cancelled' as never
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'scheduling',
            'no_show',
            'queue-entry',
            entry.id,
            `Queue entry ${entry.id} marked as no_show (cancelled)`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(entry));
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
          response.end(JSON.stringify({ items: encounters.listTimeline(encounterId as never) }));
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

        if (pathname.startsWith('/encounters/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'encounters.read');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          const encounter = encounters.getOrThrow(encounterId as never);
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

        if (pathname === '/master-search' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'patients.read');
          const query = url.searchParams.get('q') ?? '';
          const results = patients.searchMaster(query);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'patients',
            'search',
            'master-search',
            query || 'all',
            `Master registry search executed for "${query || 'all'}"`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(results));
          return;
        }

        if (pathname === '/owners' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'owners.read');
          const query = url.searchParams.get('q') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'owners',
            'list',
            'owner',
            query ?? 'all',
            'Owner registry listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: owners.list(query) }));
          return;
        }

        if (pathname === '/owners' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'owners.manage');
          const payload = (await readJsonBody(request)) as CreateOwnerRequest;
          const owner = owners.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'owners',
            'create',
            'owner',
            owner.id,
            `Owner ${owner.fullName} created`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(owner));
          return;
        }

        if (pathname.startsWith('/owners/')) {
          const ownerId = requireNonEmptyString(pathname.split('/')[2], 'ownerId');
          const principal = requirePrincipal(
            request,
            request.method === 'PATCH' ? 'owners.manage' : 'owners.read'
          );
          if (request.method === 'GET') {
            const owner = owners.getOrThrow(ownerId as never);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'owners',
              'read',
              'owner',
              owner.id,
              `Owner ${owner.fullName} inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(owner));
            return;
          }
          if (request.method === 'PATCH') {
            const payload = (await readJsonBody(request)) as UpdateOwnerRequest;
            const owner = owners.update(ownerId as never, payload);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'owners',
              'update',
              'owner',
              owner.id,
              `Owner ${owner.fullName} updated`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(owner));
            return;
          }
        }

        if (pathname === '/patients' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'patients.read');
          const query = url.searchParams.get('q') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'patients',
            'list',
            'patient',
            query ?? 'all',
            'Patient registry listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: patients.list(query) }));
          return;
        }

        if (pathname === '/patients' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'patients.manage');
          const payload = (await readJsonBody(request)) as CreatePatientRequest;
          const patient = patients.create(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'patients',
            'create',
            'patient',
            patient.id,
            `Patient ${patient.name} created`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(patient));
          return;
        }

        if (pathname.startsWith('/patients/')) {
          const patientId = requireNonEmptyString(pathname.split('/')[2], 'patientId');
          const principal = requirePrincipal(
            request,
            request.method === 'PATCH' ? 'patients.manage' : 'patients.read'
          );
          if (request.method === 'GET') {
            const patient = patients.getOrThrow(patientId as never);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'patients',
              'read',
              'patient',
              patient.id,
              `Patient ${patient.name} inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(patient));
            return;
          }
          if (request.method === 'PATCH') {
            const payload = (await readJsonBody(request)) as UpdatePatientRequest;
            const patient = patients.update(patientId as never, payload);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'patients',
              'update',
              'patient',
              patient.id,
              `Patient ${patient.name} updated`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(patient));
            return;
          }
        }

        if (pathname === '/owner-patient-links' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'patients.read');
          const ownerId = url.searchParams.get('ownerId') ?? undefined;
          const patientId = url.searchParams.get('patientId') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'patients',
            'list_links',
            'owner-patient-link',
            patientId ?? ownerId ?? 'all',
            'Owner-patient links listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: patients.listLinks({
                ownerId: ownerId as never,
                patientId: patientId as never
              })
            })
          );
          return;
        }

        if (pathname === '/owner-patient-links' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'patients.manage');
          const payload = (await readJsonBody(request)) as CreateOwnerPatientLinkRequest;
          const link = patients.createLink(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'patients',
            'create_link',
            'owner-patient-link',
            link.id,
            `Owner-patient link created for patient ${link.patientId}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(link));
          return;
        }

        if (pathname === '/users' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'users.manage');
          const payload = (await readJsonBody(request)) as Record<string, unknown>;
          try {
            validateRequestBody(
              payload,
              {
                username: { type: 'string', required: true, minLength: 3 },
                email: { type: 'string', required: true },
                password: { type: 'string', required: true, minLength: 8 },
                displayName: { type: 'string', required: false }
              },
              correlationId
            );

            const newUser = await users.create({
              username: payload.username as string,
              email: payload.email as string,
              password: payload.password as string,
              displayName: (payload.displayName as string) || (payload.username as string),
              roleCode: (payload.roleCode as string) || undefined,
              status:
                payload.status === 'inactive' ? 'inactive' : ('active' as 'active' | 'inactive')
            });
            if (payload.roleCode) {
              await accessControl.replaceLegacyRoles(newUser.id, [payload.roleCode as string]);
            }

            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'users',
              'create',
              'user',
              newUser.id,
              `User ${newUser.username} created`,
              'high',
              correlationId
            );

            response.statusCode = 201;
            response.end(JSON.stringify(newUser));
          } catch (err) {
            response.statusCode = 500;
            response.end(
              JSON.stringify({ code: 'ERROR', message: String((err as Error)?.message || err) })
            );
            return;
          }
          return;
        }

        if (pathname === '/users' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'users.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'users',
            'list',
            'user',
            'all',
            'User list inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: users.list() }));
          return;
        }

        if (pathname.startsWith('/users/')) {
          const principal = requirePrincipal(
            request,
            request.method === 'PATCH' ? 'users.manage' : 'users.read'
          );
          const userId = requireNonEmptyString(pathname.split('/')[2], 'userId');
          if (request.method === 'GET') {
            const user = users.getOrThrow(userId as never);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'users',
              'read',
              'user',
              user.id,
              `User ${user.username} inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(user));
            return;
          }
          if (request.method === 'PATCH') {
            const payload = (await readJsonBody(request)) as UpdateUserRequest;
            const user = await users.update(userId as never, payload);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'users',
              'update',
              'user',
              user.id,
              `User ${user.username} updated`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(user));
            return;
          }
        }

        if (pathname === '/staff' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'staff.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'staff',
            'list',
            'staff',
            'all',
            'Staff registry inspected',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: staff.list().filter((member) => member.accountId === principal.user.accountId)
            })
          );
          return;
        }

        if (pathname.startsWith('/staff/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'staff.read');
          const staffId = requireNonEmptyString(pathname.split('/')[2], 'staffId');
          const member = staff.getOrThrow(staffId as never);
          if (member.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Staff member not found for current account');
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'staff',
            'read',
            'staff',
            member.id,
            `Staff member ${member.employeeCode} inspected`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(member));
          return;
        }

        if (pathname === '/quotes' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'quote.read');
          const search = url.searchParams.get('search') ?? undefined;
          const status = url.searchParams.get('status') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'list',
            'quote',
            status ?? search ?? 'all',
            'Quotes listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: quotes.list(principal.user.accountId as never, { search, status })
            })
          );
          return;
        }

        if (pathname === '/quotes' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'quote.write');
          const payload = (await readJsonBody(request).catch(() => ({}))) as {
            ownerId?: string | null;
            validUntil?: string | null;
            notes?: string | null;
          };
          const quote = await quotes.create(
            principal.user.accountId as never,
            principal.user.id,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'create',
            'quote',
            quote.id,
            `Quote ${quote.number} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(quote));
          return;
        }

        if (pathname.startsWith('/quotes/') && request.method === 'GET') {
          const principal = requirePrincipal(request, 'quote.read');
          const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
          const action = pathname.split('/')[3];
          const quote = quotes.getOrThrow(quoteId);
          if (quote.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Quote not found for current account');
          }

          if (action === 'print') {
            const html = quotes.generatePrintHtml(quote, quotes.getItems(quote.id));
            response.statusCode = 200;
            response.end(JSON.stringify({ html }));
            return;
          }

          if (action === 'pdf') {
            const pdfBuffer = quotes.generatePdfBuffer(quote, quotes.getItems(quote.id));
            response.statusCode = 200;
            response.setHeader('content-type', 'application/pdf');
            response.setHeader(
              'content-disposition',
              `inline; filename="orcamento-${quote.number}.pdf"`
            );
            response.end(pdfBuffer);
            return;
          }

          if (!action) {
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'quotes',
              'read',
              'quote',
              quote.id,
              `Quote ${quote.number} inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify({ ...quote, items: quotes.getItems(quote.id) }));
            return;
          }
        }

        if (
          pathname.startsWith('/quotes/') &&
          pathname.endsWith('/items') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'quote.write');
          const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
          const quote = quotes.getOrThrow(quoteId);
          if (quote.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Quote not found for current account');
          }
          const payload = (await readJsonBody(request)) as {
            itemType: 'product' | 'service';
            catalogItemId?: string | null;
            nameSnapshot: string;
            codeSnapshot?: string | null;
            unitPrice: number;
            quantity?: number;
            discountAmount?: number;
            notes?: string | null;
          };
          const result = await quotes.addItem(quoteId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'add_item',
            'quote-item',
            result.item.id,
            `Item added to quote ${quote.number}`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(result.item));
          return;
        }

        if (
          pathname.startsWith('/quotes/') &&
          pathname.endsWith('/approve') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'quote.write');
          const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
          const quote = await quotes.approve(quoteId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'approve',
            'quote',
            quote.id,
            `Quote ${quote.number} approved`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(quote));
          return;
        }

        if (
          pathname.startsWith('/quotes/') &&
          pathname.endsWith('/reject') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'quote.write');
          const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
          const quote = await quotes.reject(quoteId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'reject',
            'quote',
            quote.id,
            `Quote ${quote.number} rejected`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(quote));
          return;
        }

        if (
          pathname.startsWith('/quotes/') &&
          pathname.endsWith('/cancel') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'quote.write');
          const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
          const quote = await quotes.cancel(quoteId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'cancel',
            'quote',
            quote.id,
            `Quote ${quote.number} cancelled`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(quote));
          return;
        }

        if (
          pathname.startsWith('/quotes/') &&
          pathname.endsWith('/convert-to-sale') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'quote.write');
          const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
          const quote = quotes.getOrThrow(quoteId);
          if (quote.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Quote not found for current account');
          }
          const sale = await counterSales.open(
            principal.user.accountId as never,
            principal.user.id,
            {
              ownerId: quote.ownerId,
              notes: `Convertida do orcamento ${quote.number}`
            }
          );
          for (const item of quotes.getItems(quote.id)) {
            await counterSales.addItem(sale.id, {
              itemType: item.itemType,
              catalogItemId: item.catalogItemId,
              nameSnapshot: item.nameSnapshot,
              codeSnapshot: item.codeSnapshot,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              discountAmount: item.discountAmount,
              notes: item.notes
            });
          }
          const converted = await quotes.convertToSale(quote.id, sale.id);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'quotes',
            'convert_to_sale',
            'quote',
            converted.id,
            `Quote ${converted.number} converted to counter sale ${sale.number}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify({ counterSaleId: sale.id, quoteId: converted.id }));
          return;
        }

        if (pathname === '/staff' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'staff.manage');
          const payload = (await readJsonBody(request)) as {
            employeeCode: string;
            fullName: string;
            userId?: string | null;
            department?: string | null;
            jobTitle?: string | null;
          };
          const member = await staff.create(principal.user.accountId as never, {
            employeeCode: requireNonEmptyString(payload.employeeCode, 'employeeCode'),
            fullName: requireNonEmptyString(payload.fullName, 'fullName'),
            userId: payload.userId as never,
            department: payload.department,
            jobTitle: payload.jobTitle
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'staff',
            'create',
            'staff',
            member.id,
            `Staff member created: ${member.employeeCode}`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(member));
          return;
        }

        if (pathname.startsWith('/staff/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'staff.manage');
          const staffId = requireNonEmptyString(pathname.split('/')[2], 'staffId');
          const existingMember = staff.getOrThrow(staffId as never);
          if (existingMember.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Staff member not found for current account');
          }
          const payload = (await readJsonBody(request)) as {
            fullName?: string;
            department?: string | null;
            jobTitle?: string | null;
            isActive?: boolean;
          };
          const member = await staff.update(staffId as never, {
            fullName: payload.fullName,
            department: payload.department,
            jobTitle: payload.jobTitle,
            isActive: payload.isActive
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'staff',
            'update',
            'staff',
            member.id,
            `Staff member updated: ${member.employeeCode}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(member));
          return;
        }

        if (
          pathname.startsWith('/staff/') &&
          pathname.endsWith('/toggle-active') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'staff.manage');
          const staffId = requireNonEmptyString(pathname.split('/')[2], 'staffId');
          const existingMember = staff.getOrThrow(staffId as never);
          if (existingMember.accountId !== principal.user.accountId) {
            throw new AuthenticationError('Staff member not found for current account');
          }
          const payload = (await readJsonBody(request)) as { isActive: boolean };
          const member = await staff.toggleActive(staffId as never, payload.isActive);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'staff',
            payload.isActive ? 'activate' : 'deactivate',
            'staff',
            member.id,
            `Staff member ${payload.isActive ? 'activated' : 'deactivated'}: ${member.employeeCode}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(member));
          return;
        }

        if (pathname === '/access-control' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'access.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'access-control',
            'read',
            'role-permission-catalog',
            'current',
            'Roles and permissions inspected',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              roles: accessControl.listRoles(),
              permissions: accessControl.listPermissions(),
              teams: accessControl.listTeams(principal.user.accountId),
              sectors: accessControl.listSectors(principal.user.accountId),
              users: users.list().filter((user) => user.accountId === principal.user.accountId),
              memberships: {
                userTeams: users
                  .list()
                  .filter((user) => user.accountId === principal.user.accountId)
                  .flatMap((user) =>
                    accessControl.listMemberships(user.id).teams.map((team) => ({
                      userId: user.id,
                      teamId: team.id
                    }))
                  ),
                userSectors: users
                  .list()
                  .filter((user) => user.accountId === principal.user.accountId)
                  .flatMap((user) =>
                    accessControl.listMemberships(user.id).sectors.map((sector) => ({
                      userId: user.id,
                      sectorId: sector.id
                    }))
                  )
              },
              assignments: accessControl.listAssignments(),
              legacyRoles: users
                .list()
                .filter((user) => user.accountId === principal.user.accountId)
                .map((user) => ({
                  userId: user.id,
                  roleCodes: accessControl.getLegacyRoleCodes(user.id)
                }))
            })
          );
          return;
        }

        if (pathname === '/access-control/teams' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'access.read');
          response.statusCode = 200;
          response.end(
            JSON.stringify({ items: accessControl.listTeams(principal.user.accountId) })
          );
          return;
        }

        if (pathname === '/access-control/teams' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'users.manage');
          const payload = (await readJsonBody(request)) as {
            code: string;
            name: string;
            description?: string | null;
          };
          const team = await accessControl.createTeam(principal.user.accountId, payload);
          response.statusCode = 201;
          response.end(JSON.stringify(team));
          return;
        }

        if (pathname.startsWith('/access-control/teams/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'users.manage');
          const teamId = requireNonEmptyString(pathname.split('/')[3], 'teamId');
          const payload = (await readJsonBody(request)) as {
            code?: string;
            name?: string;
            description?: string | null;
            isActive?: boolean;
          };
          const team = await accessControl.updateTeam(teamId as never, payload);
          response.statusCode = 200;
          response.end(JSON.stringify(team));
          return;
        }

        if (pathname === '/access-control/org-sectors' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'access.read');
          response.statusCode = 200;
          response.end(
            JSON.stringify({ items: accessControl.listSectors(principal.user.accountId) })
          );
          return;
        }

        if (pathname === '/access-control/org-sectors' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'users.manage');
          const payload = (await readJsonBody(request)) as {
            code: string;
            name: string;
            description?: string | null;
          };
          const sector = await accessControl.createSector(principal.user.accountId, payload);
          response.statusCode = 201;
          response.end(JSON.stringify(sector));
          return;
        }

        if (pathname.startsWith('/access-control/org-sectors/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'users.manage');
          const sectorId = requireNonEmptyString(pathname.split('/')[3], 'sectorId');
          const payload = (await readJsonBody(request)) as {
            code?: string;
            name?: string;
            description?: string | null;
            isActive?: boolean;
          };
          const sector = await accessControl.updateSector(sectorId as never, payload);
          response.statusCode = 200;
          response.end(JSON.stringify(sector));
          return;
        }

        if (
          pathname.startsWith('/access-control/users/') &&
          pathname.endsWith('/teams') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'users.manage');
          const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
          const payload = (await readJsonBody(request)) as { teamIds?: readonly string[] };
          await accessControl.replaceUserTeams(userId as never, (payload.teamIds ?? []) as never);
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true }));
          return;
        }

        if (
          pathname.startsWith('/access-control/users/') &&
          pathname.endsWith('/sectors') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'users.manage');
          const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
          const payload = (await readJsonBody(request)) as { sectorIds?: readonly string[] };
          await accessControl.replaceUserSectors(
            userId as never,
            (payload.sectorIds ?? []) as never
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true }));
          return;
        }

        if (
          pathname.startsWith('/access-control/users/') &&
          pathname.endsWith('/roles') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'users.manage');
          const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
          const payload = (await readJsonBody(request)) as { roleCodes?: readonly string[] };
          await accessControl.replaceLegacyRoles(userId as never, payload.roleCodes ?? []);
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true }));
          return;
        }

        if (
          pathname.startsWith('/access-control/users/') &&
          pathname.endsWith('/effective') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'access.read');
          const userId = requireNonEmptyString(pathname.split('/')[3], 'userId');
          const targetUser = users.getOrThrow(userId as never);
          if (targetUser.accountId !== principal.user.accountId) {
            throw new AuthenticationError('User not found for current account');
          }
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              user: targetUser,
              memberships: accessControl.listMemberships(targetUser.id),
              effectivePermissions: accessControl.getEffectivePermissions({
                accountId: targetUser.accountId,
                userId: targetUser.id,
                roleCodes: accessControl.getLegacyRoleCodes(targetUser.id)
              })
            })
          );
          return;
        }

        if (pathname === '/access-control/grants' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'users.manage');
          const payload = (await readJsonBody(request)) as {
            subjectType: 'user' | 'team' | 'sector';
            subjectId: string;
            permissionCode: string;
            effect?: 'allow' | 'deny' | 'inherit';
          };
          await accessControl.setPermissionAssignment({
            accountId: principal.user.accountId,
            subjectType: payload.subjectType,
            subjectId: payload.subjectId,
            permissionCode: payload.permissionCode,
            effect: payload.effect
          });
          response.statusCode = 200;
          response.end(JSON.stringify({ ok: true }));
          return;
        }

        if (pathname === '/audit/events' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'audit.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'audit',
            'read',
            'audit-event',
            'all',
            'Audit events inspected',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items: audit.list() }));
          return;
        }

        if (pathname === '/sectors' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'inpatient.read');
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'sectors',
            'list',
            'sector',
            'all',
            'Sectors listed',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await sectorBedService.listSectors(principal.user.accountId as never)
            })
          );
          return;
        }

        if (pathname === '/sectors' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'inpatient.manage');
          const payload = (await readJsonBody(request)) as CreateSectorRequest;
          const sector = await sectorBedService.createSector(
            principal.user.accountId as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'sectors',
            'create',
            'sector',
            sector.id,
            `Sector ${sector.name} created`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(sector));
          return;
        }

        if (pathname === '/beds' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'inpatient.read');
          const sectorId = url.searchParams.get('sectorId') ?? undefined;
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'beds',
            'list',
            'bed',
            sectorId ?? 'all',
            'Beds listed',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(
            JSON.stringify({
              items: await sectorBedService.listBeds(
                principal.user.accountId as never,
                sectorId as never
              )
            })
          );
          return;
        }

        if (pathname === '/beds' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'inpatient.manage');
          const payload = (await readJsonBody(request)) as CreateBedRequest;
          const bed = await sectorBedService.createBed(principal.user.accountId as never, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'beds',
            'create',
            'bed',
            bed.id,
            `Bed ${bed.name} created in sector`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(bed));
          return;
        }

        if (pathname === '/bed-map' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'inpatient.read');
          const bedMap = await sectorBedService.buildBedMap(principal.user.accountId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'bed-map',
            'read',
            'bed-map',
            'current',
            'Bed map consulted',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(bedMap));
          return;
        }

        if (
          pathname.startsWith('/inpatient/') &&
          pathname.endsWith('/assign-bed') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'inpatient.manage');
          const stayId = requireNonEmptyString(pathname.split('/')[2], 'stayId');
          const payload = (await readJsonBody(request)) as AssignBedRequest;
          const stay = await inpatient.assignBed(stayId as never, payload);
          medicalRecords.appendAdvancedCareEvent(
            stay.encounterId,
            principal.user.id,
            'inpatient_transferred',
            `Inpatient stay assigned to bed ${payload.bedId}`
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inpatient',
            'assign_bed',
            'inpatient-stay',
            stay.id,
            `Inpatient stay assigned to sector/bed`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(stay));
          return;
        }

        if (
          pathname.startsWith('/inpatient/') &&
          pathname.endsWith('/transfer-bed') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'inpatient.manage');
          const stayId = requireNonEmptyString(pathname.split('/')[2], 'stayId');
          const payload = (await readJsonBody(request)) as AssignBedRequest;
          const stay = await inpatient.transferBed(stayId as never, payload);
          medicalRecords.appendAdvancedCareEvent(
            stay.encounterId,
            principal.user.id,
            'inpatient_transferred',
            `Inpatient stay transferred to bed ${payload.bedId}`
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inpatient',
            'transfer_bed',
            'inpatient-stay',
            stay.id,
            `Inpatient stay transferred to new sector/bed`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(stay));
          return;
        }

        if (
          pathname.startsWith('/inpatient/') &&
          pathname.endsWith('/update-status') &&
          request.method === 'PATCH'
        ) {
          const principal = requirePrincipal(request, 'inpatient.manage');
          const stayId = pathname.split('/')[2];
          const payload = (await readJsonBody(request)) as {
            status: 'admitted' | 'stable' | 'transferred' | 'discharged';
            dischargeReason?: string;
            transferToUnit?: string;
            transferToWard?: string;
          };
          const stay = inpatient.updateStatus(stayId as never, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inpatient',
            'update_status',
            'inpatient-stay',
            stay.id,
            `Inpatient status updated to ${payload.status}`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(stay));
          return;
        }

        if (
          pathname.startsWith('/inpatient/') &&
          pathname.endsWith('/progress') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'inpatient.read');
          const stayId = pathname.split('/')[2];
          const progress = inpatient.listProgress(stayId as never);
          response.statusCode = 200;
          response.end(JSON.stringify({ items: progress }));
          return;
        }

        if (
          pathname.startsWith('/inpatient/') &&
          pathname.endsWith('/progress') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'inpatient.manage');
          const stayId = pathname.split('/')[2];
          const payload = (await readJsonBody(request)) as { note: string };
          const progress = inpatient.addProgress(principal.user.id as never, {
            stayId,
            note: payload.note
          });
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inpatient',
            'add_progress',
            'inpatient-stay',
            stayId,
            `Progress note added to inpatient stay`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(progress));
          return;
        }

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

        // --- Discharges ---

        if (pathname === '/discharges' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'discharges.read');
          const items = discharges.list(principal.user.accountId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'discharges',
            'list',
            'discharge',
            '*',
            'Discharges listed',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items, total: items.length }));
          return;
        }

        if (pathname === '/discharges' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'discharges.manage');
          const payload = (await readJsonBody(request)) as CreateDischargeRequest;
          validateRequestBody(
            payload as unknown as Record<string, unknown>,
            {
              encounterId: { type: 'string', required: true, minLength: 1 },
              dischargeType: {
                type: 'string',
                required: true,
                enum: ['ambulatory', 'inpatient', 'transfer', 'death']
              }
            },
            correlationId
          );
          const discharge = discharges.create(
            principal.user.accountId as never,
            principal.user.id as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'discharges',
            'create',
            'discharge',
            discharge.id,
            `Discharge created for encounter ${payload.encounterId}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(discharge));
          return;
        }

        if (
          pathname.startsWith('/discharges/') &&
          request.method === 'GET' &&
          !pathname.includes('?')
        ) {
          const principal = requirePrincipal(request, 'discharges.read');
          const dischargeId = requireNonEmptyString(pathname.split('/')[2], 'dischargeId');
          const discharge = discharges.getById(dischargeId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'discharges',
            'read',
            'discharge',
            discharge.id,
            'Discharge detail consulted',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(discharge));
          return;
        }

        if (pathname.startsWith('/discharges/') && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'discharges.manage');
          const dischargeId = requireNonEmptyString(pathname.split('/')[2], 'dischargeId');
          const body = await readJsonBody(request);
          const { expectedVersion, ...payload } = body as UpdateDischargeRequest & {
            expectedVersion?: number;
          };
          const discharge = discharges.update(dischargeId as never, payload, expectedVersion);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'discharges',
            'update',
            'discharge',
            discharge.id,
            'Discharge updated',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(discharge));
          return;
        }

        // --- Billing ---

        if (pathname === '/billing' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'billing.read');
          const encounterId = url.searchParams.get('encounterId') || undefined;
          const items = await billing.list(encounterId);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'billing',
            'list',
            'billing-record',
            encounterId || 'all',
            encounterId ? `Billing record for encounter ${encounterId}` : 'Billing records listed',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (
          pathname.startsWith('/billing/') &&
          pathname.endsWith('/items') &&
          request.method === 'GET'
        ) {
          const principal = requirePrincipal(request, 'billing.read');
          const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
          const items = await billing.listItems(encounterId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'billing',
            'list_items',
            'billing-item',
            encounterId,
            `Billing items listed for encounter ${encounterId}`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname.match(/^\/billing\/[a-f0-9-]+$/) && request.method === 'GET') {
          const principal = requirePrincipal(request, 'billing.read');
          const encounterId = pathname.split('/')[2];
          const record = await billing.getByEncounterOrThrow(encounterId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'billing',
            'get',
            'billing-record',
            record.id,
            `Billing record retrieved for encounter ${encounterId}`,
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(record));
          return;
        }

        if (pathname === '/billing/estimate' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'billing.manage');
          const payload = (await readJsonBody(request)) as CreateBillingEstimateRequest;
          const record = await billing.createEstimate(payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'billing',
            'create_estimate',
            'billing-record',
            record.id,
            `Billing estimate created for encounter ${payload.encounterId}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(record));
          return;
        }

        if (pathname === '/billing/items' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'billing.manage');
          const payload = (await readJsonBody(request)) as CreateBillingItemRequest;
          const item = await billing.addItem(principal.user.id as never, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'billing',
            'add_item',
            'billing-item',
            item.id,
            `Billing item added for encounter ${payload.encounterId}`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(item));
          return;
        }

        if (pathname.match(/^\/billing\/[a-f0-9-]+\/status$/) && request.method === 'PATCH') {
          const principal = requirePrincipal(request, 'billing.manage');
          const encounterId = pathname.split('/')[2];
          const payload = (await readJsonBody(request)) as UpdateBillingStatusRequest;
          const record = await billing.updateStatus(encounterId as never, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'billing',
            'update_status',
            'billing-record',
            record.id,
            `Billing status updated for encounter ${encounterId} to ${payload.status}`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(record));
          return;
        }

        // --- Prescription Executions ---

        if (pathname === '/prescription-executions' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'prescription-executions.read');
          const encounterId = url.searchParams.get('encounterId');
          const patientId = url.searchParams.get('patientId');
          let items;
          if (encounterId) {
            items = prescriptionExecutions.listByEncounter(encounterId as never);
          } else if (patientId) {
            items = prescriptionExecutions.listByPatient(patientId as never);
          } else {
            items = prescriptionExecutions.list(principal.user.accountId as never);
          }
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            'list',
            'prescription-execution',
            '*',
            'Prescription executions listed',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items, total: items.length }));
          return;
        }

        if (pathname === '/prescription-executions' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'prescription-executions.manage');
          const payload = (await readJsonBody(request)) as CreatePrescriptionExecutionRequest;
          validateRequestBody(
            payload as unknown as Record<string, unknown>,
            {
              clinicalEntryId: { type: 'string', required: true },
              patientId: { type: 'string', required: true },
              encounterId: { type: 'string', required: true },
              medicationName: { type: 'string', required: true, minLength: 1, maxLength: 255 },
              dosage: { type: 'string', required: true, minLength: 1, maxLength: 255 },
              scheduledAt: { type: 'string', required: true }
            },
            correlationId
          );
          const execution = prescriptionExecutions.create(
            principal.user.accountId as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            'create',
            'prescription-execution',
            execution.id,
            `Prescription execution created for ${payload.medicationName}`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(execution));
          return;
        }

        if (
          pathname.startsWith('/prescription-executions/') &&
          request.method === 'GET' &&
          !pathname.includes('/execute') &&
          !pathname.includes('/log') &&
          !pathname.includes('/suspend') &&
          !pathname.includes('/resume')
        ) {
          const principal = requirePrincipal(request, 'prescription-executions.read');
          const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
          const execution = prescriptionExecutions.getById(executionId as never);
          const events = prescriptionExecutions.getEvents(executionId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            'read',
            'prescription-execution',
            execution.id,
            'Prescription execution detail consulted',
            'low',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ ...execution, events }));
          return;
        }

        if (
          pathname.startsWith('/prescription-executions/') &&
          pathname.endsWith('/execute') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'prescription-executions.manage');
          const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
          const payload = (await readJsonBody(request)) as ExecutePrescriptionRequest;
          const execution = prescriptionExecutions.execute(
            executionId as never,
            principal.user.id as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            payload.status,
            'prescription-execution',
            execution.id,
            `Prescription execution ${payload.status}`,
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(execution));
          return;
        }

        if (
          pathname.startsWith('/prescription-executions/') &&
          pathname.endsWith('/suspend') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'prescription-executions.manage');
          const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
          const payload = (await readJsonBody(request)) as SuspendPrescriptionRequest;
          const execution = prescriptionExecutions.suspend(
            executionId as never,
            principal.user.id as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            'suspend',
            'prescription-execution',
            execution.id,
            'Prescription execution suspended',
            'high',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(execution));
          return;
        }

        if (
          pathname.startsWith('/prescription-executions/') &&
          pathname.endsWith('/resume') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'prescription-executions.manage');
          const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
          const execution = prescriptionExecutions.resume(
            executionId as never,
            principal.user.id as never
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            'resume',
            'prescription-execution',
            execution.id,
            'Prescription execution resumed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(execution));
          return;
        }

        if (
          pathname.startsWith('/prescription-executions/') &&
          pathname.endsWith('/log') &&
          request.method === 'POST'
        ) {
          const principal = requirePrincipal(request, 'prescription-executions.manage');
          const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
          const payload = (await readJsonBody(request)) as LogAdministrationEventRequest;
          const event = prescriptionExecutions.logEvent(
            executionId as never,
            principal.user.id as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'prescription-executions',
            'log_event',
            'administration-event',
            event.id,
            `Event logged: ${payload.eventType}`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(event));
          return;
        }

        // ── Inventory Items ──

        if (pathname === '/inventory' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'inventory.read');
          const items = inventory.listItems();
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inventory',
            'list',
            'inventory-item',
            'all',
            'Inventory items listed',
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/inventory' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'inventory.manage');
          const payload = (await readJsonBody(request)) as CreateInventoryItemRequest;
          const item = inventory.createItem(principal.user.accountId, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'inventory',
            'create',
            'inventory-item',
            item.id,
            `Inventory item ${item.name} created`,
            'high',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(item));
          return;
        }

        if (pathname.startsWith('/inventory/') && request.method === 'GET') {
          const itemId = requireNonEmptyString(pathname.split('/')[2], 'inventoryItemId');
          const principal = requirePrincipal(request, 'inventory.read');
          try {
            const item = inventory.getItemOrThrow(itemId as never);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'inventory',
              'read',
              'inventory-item',
              item.id,
              `Inventory item ${item.name} inspected`,
              'medium',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(item));
          } catch {
            response.statusCode = 404;
            response.end(
              JSON.stringify({
                code: 'NOT_FOUND',
                message: 'Inventory item not found',
                correlationId
              })
            );
          }
          return;
        }

        if (pathname.startsWith('/inventory/') && request.method === 'PATCH') {
          const itemId = requireNonEmptyString(pathname.split('/')[2], 'inventoryItemId');
          const principal = requirePrincipal(request, 'inventory.manage');
          const payload = (await readJsonBody(request)) as UpdateInventoryItemRequest;
          try {
            const item = inventory.updateItem(itemId as never, payload);
            appendAudit(
              principal.user.id,
              principal.user.accountId,
              'inventory',
              'update',
              'inventory-item',
              item.id,
              `Inventory item ${item.name} updated`,
              'high',
              correlationId
            );
            response.statusCode = 200;
            response.end(JSON.stringify(item));
          } catch (err: unknown) {
            if (err instanceof Error && err.message.includes('not found')) {
              response.statusCode = 404;
              response.end(
                JSON.stringify({
                  code: 'NOT_FOUND',
                  message: 'Inventory item not found',
                  correlationId
                })
              );
            } else {
              throw err;
            }
          }
          return;
        }

        // --- Webhooks ---
        if (pathname === '/webhooks' && request.method === 'GET') {
          const principal = requirePrincipal(request, 'webhooks.read');
          const items = await webhooks.list(principal.user.accountId as never);
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname === '/webhooks' && request.method === 'POST') {
          const principal = requirePrincipal(request, 'webhooks.manage');
          const payload = (await readJsonBody(request)) as CreateWebhookRequest;
          const webhook = await webhooks.register(
            principal.user.id,
            principal.user.accountId as never,
            payload
          );
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'webhooks',
            'register',
            'webhook',
            webhook.id,
            `Webhook registered for URL ${webhook.url}`,
            'medium',
            correlationId
          );
          response.statusCode = 201;
          response.end(JSON.stringify(webhook));
          return;
        }

        if (pathname === '/webhooks/whatsapp/inbound' && request.method === 'POST') {
          const body = (await readJsonBody(request)) as Record<string, unknown>;
          const correlationId = createCorrelationId('wa-in');
          const messageSid =
            typeof body['MessageSid'] === 'string' ? body['MessageSid'] : 'unknown';
          const from = typeof body['From'] === 'string' ? body['From'] : '';
          const to = typeof body['To'] === 'string' ? body['To'] : '';
          const bodyText =
            typeof body['Body'] === 'string' ? body['Body'].trim().toUpperCase() : '';
          const appointmentId =
            typeof body['AppointmentId'] === 'string' ? body['AppointmentId'] : undefined;

          appendAudit(
            'system',
            'system' as never,
            'whatsapp',
            'inbound_received',
            'webhook',
            messageSid,
            `WhatsApp inbound: from=${from}, body="${bodyText}", appointmentId=${appointmentId ?? 'unknown'}`,
            'low',
            correlationId
          );

          let responseMessage = 'OK';
          let transitioned = false;

          if ((bodyText === 'CONFIRMAR' || bodyText === 'CONFIRM') && appointmentId !== undefined) {
            try {
              const appointment = scopedScheduling.getAppointmentOrThrow(appointmentId);
              if (appointment.status === 'scheduled') {
                await scopedScheduling.checkIn(appointment.accountId as string, {
                  appointmentId,
                  patientId: appointment.patientId as string,
                  ownerId: appointment.ownerId as string,
                  reason: 'Confirmed via WhatsApp by tutor'
                });
                appendAudit(
                  'system',
                  appointment.accountId as never,
                  'scheduling',
                  'whatsapp_confirm',
                  'appointment',
                  appointmentId,
                  `Appointment ${appointmentId} confirmed via WhatsApp from ${from}`,
                  'high',
                  correlationId
                );
                transitioned = true;
              }
              responseMessage = 'CONFIRMADO';
            } catch {
              responseMessage = 'CONFIRMADO';
            }
          } else if (
            (bodyText === 'CANCELAR' || bodyText === 'CANCELAR CONSULTA') &&
            appointmentId !== undefined
          ) {
            try {
              const appointment = scopedScheduling.getAppointmentOrThrow(appointmentId);
              await scopedScheduling.cancelAppointment(
                appointmentId,
                'Cancelled via WhatsApp by tutor'
              );
              appendAudit(
                'system',
                appointment.accountId as never,
                'scheduling',
                'whatsapp_cancel',
                'appointment',
                appointmentId,
                `Appointment ${appointmentId} cancelled via WhatsApp from ${from}`,
                'high',
                correlationId
              );
              transitioned = true;
              responseMessage = 'CANCELADO';
            } catch {
              responseMessage = 'CANCELADO';
            }
          } else if (bodyText === 'REMARCAR') {
            responseMessage = 'AGUARDANDO REMARCA';
            if (appointmentId !== undefined) {
              appendAudit(
                'system',
                'system' as never,
                'whatsapp',
                'inbound_reschedule_request',
                'appointment',
                appointmentId,
                `Reschedule requested via WhatsApp from ${from}`,
                'medium',
                correlationId
              );
            }
          }

          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/plain');
          response.end(responseMessage);
          return;
        }

        if (
          pathname.startsWith('/webhooks/') &&
          pathname.endsWith('/deliveries') &&
          request.method === 'GET'
        ) {
          const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
          const principal = requirePrincipal(request, 'webhooks.read');
          const existing = await webhooks.get(webhookId as never);
          if (!existing || existing.accountId !== principal.user.accountId) {
            response.statusCode = 404;
            response.end(
              JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
            );
            return;
          }
          const items = await webhooks.listDeliveries(webhookId as never);
          response.statusCode = 200;
          response.end(JSON.stringify({ items }));
          return;
        }

        if (pathname.startsWith('/webhooks/') && request.method === 'GET') {
          const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
          const principal = requirePrincipal(request, 'webhooks.read');
          const webhook = await webhooks.get(webhookId as never);
          if (!webhook || webhook.accountId !== principal.user.accountId) {
            response.statusCode = 404;
            response.end(
              JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
            );
            return;
          }
          response.statusCode = 200;
          response.end(JSON.stringify(webhook));
          return;
        }

        if (pathname.startsWith('/webhooks/') && request.method === 'PATCH') {
          const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
          const principal = requirePrincipal(request, 'webhooks.manage');
          const existing = await webhooks.get(webhookId as never);
          if (!existing || existing.accountId !== principal.user.accountId) {
            response.statusCode = 404;
            response.end(
              JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
            );
            return;
          }
          const payload = (await readJsonBody(request)) as UpdateWebhookRequest;
          const updated = await webhooks.update(webhookId as never, payload);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'webhooks',
            'update',
            'webhook',
            webhookId,
            `Webhook ${webhookId} updated`,
            'medium',
            correlationId
          );
          response.statusCode = 200;
          response.end(JSON.stringify(updated));
          return;
        }

        if (pathname.startsWith('/webhooks/') && request.method === 'DELETE') {
          const webhookId = requireNonEmptyString(pathname.split('/')[2], 'webhookId');
          const principal = requirePrincipal(request, 'webhooks.manage');
          const existing = await webhooks.get(webhookId as never);
          if (!existing || existing.accountId !== principal.user.accountId) {
            response.statusCode = 404;
            response.end(
              JSON.stringify({ code: 'NOT_FOUND', message: 'Webhook not found', correlationId })
            );
            return;
          }
          await webhooks.delete(webhookId as never);
          appendAudit(
            principal.user.id,
            principal.user.accountId,
            'webhooks',
            'delete',
            'webhook',
            webhookId,
            `Webhook ${webhookId} deleted`,
            'medium',
            correlationId
          );
          response.statusCode = 204;
          response.end();
          return;
        }

        response.statusCode = 404;
        response.end(
          JSON.stringify({ code: 'NOT_FOUND', message: 'Route not found', correlationId })
        );
      });
    } catch (error) {
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

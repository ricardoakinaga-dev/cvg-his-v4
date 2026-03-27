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
  CreateEncounterRequest,
  CreateInpatientAdmissionRequest,
  CreateInventoryConsumptionRequest,
  CreateNotificationRequest,
  CreateOwnerPatientLinkRequest,
  CreateOwnerRequest,
  CreatePatientRequest,
  CreateSectorRequest,
  CreateBedRequest,
  CreateSurgeryCaseRequest,
  CreateTriageRequest,
  LoginRequest,
  LogoutRequest,
  ProcessNotificationsRequest,
  RefreshSessionRequest,
  RecordDiagnosticResultRequest,
  TransitionEncounterRequest,
  UpdateBillingStatusRequest,
  UpdateClinicalEntryRequest,
  UpdateInpatientStatusRequest,
  UpdateOwnerRequest,
  UpdateSurgeryStatusRequest,
  UpdatePatientRequest,
  UpdateUserRequest
} from '@cvg-his-v2/shared-contracts';
import { AuthenticationError, ValidationError, toErrorResponse } from '@cvg-his-v2/shared-errors';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { createHealthResponse, createLivenessResponse, createReadinessResponse } from './health.js';
import { createApiRuntime, type RuntimeRepositories } from './runtime.js';
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
    auth
  } = createApiRuntime({
    authSecret: options.authSecret,
    accessTokenTtlSeconds: options.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: options.refreshTokenTtlSeconds,
    repositories: options.repositories,
    fileStorage: options.fileStorage
  });

  return createServer((request: IncomingMessage, response: ServerResponse) => {
    void handleRequest(request, response);
  });

  async function handleRequest(request: IncomingMessage, response: ServerResponse) {
    const correlationIdHeader = request.headers['x-correlation-id'];
    const correlationId =
      typeof correlationIdHeader === 'string' ? correlationIdHeader : createCorrelationId('api');

    // DEBUG: log incoming request
    logger.info('incoming request', { correlationId, method: request.method, url: request.url });

    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('x-correlation-id', correlationId);
    response.setHeader('access-control-allow-origin', '*');
    response.setHeader(
      'access-control-allow-headers',
      'content-type, authorization, x-correlation-id'
    );
    response.setHeader('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');

    try {
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
        logger.info('healthcheck served', {
          correlationId,
          persistenceMode: appState.persistenceMode,
          productionReady: appState.productionReady
        });
        response.statusCode = 200;
        response.end(JSON.stringify(payload));
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

      const url = new URL(request.url ?? '/', 'http://localhost');
      const pathname = url.pathname;

      if (pathname === '/auth/login' && request.method === 'POST') {
        const payload = (await readJsonBody(request)) as LoginRequest;
        const session = auth.login(payload, correlationId);
        response.statusCode = 200;
        response.end(JSON.stringify(session));
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
        const encounterId = requireNonEmptyString(
          url.searchParams.get('encounterId'),
          'encounterId'
        );
        const record = await medicalRecords.getRecordByEncounterOrThrowAsync(encounterId as never);
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
        response.end(JSON.stringify({ items: inpatient.list(encounterId) }));
        return;
      }

      if (pathname === '/inpatient' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'inpatient.manage');
        const payload = (await readJsonBody(request)) as CreateInpatientAdmissionRequest;
        const stay = inpatient.admit(payload);
        const encounter = encounters.getOrThrow(stay.encounterId);
        if (encounter.status === 'in_care') {
          encounters.transitionEncounter(encounter.id, principal.user.id, {
            nextStatus: 'observation'
          });
          syncQueueWithEncounter(encounter.id, 'observation');
        }
        medicalRecords.appendAdvancedCareEvent(
          stay.encounterId,
          principal.user.id,
          'inpatient_admitted',
          `Inpatient admission at ${stay.unit}/${stay.ward}/${stay.bed}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inpatient',
          'admit',
          'inpatient-stay',
          stay.id,
          `Inpatient stay opened for encounter ${stay.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(stay));
        return;
      }

      if (
        pathname.startsWith('/inpatient/') &&
        pathname.endsWith('/progress') &&
        request.method === 'GET'
      ) {
        const principal = requirePrincipal(request, 'inpatient.read');
        const stayId = requireNonEmptyString(pathname.split('/')[2], 'stayId');
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inpatient',
          'list_progress',
          'inpatient-progress',
          stayId,
          'Inpatient progress listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: inpatient.listProgress(stayId as never) }));
        return;
      }

      if (pathname === '/inpatient/progress' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'inpatient.manage');
        const payload = (await readJsonBody(request)) as AddInpatientProgressRequest;
        const progress = inpatient.addProgress(principal.user.id, payload);
        medicalRecords.appendAdvancedCareEvent(
          progress.encounterId,
          principal.user.id,
          'inpatient_progressed',
          `Inpatient progress registered: ${progress.note}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inpatient',
          'add_progress',
          'inpatient-progress',
          progress.id,
          `Inpatient progress added for stay ${progress.stayId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(progress));
        return;
      }

      if (
        pathname.startsWith('/inpatient/') &&
        pathname.endsWith('/status') &&
        request.method === 'POST'
      ) {
        const principal = requirePrincipal(request, 'inpatient.manage');
        const stayId = requireNonEmptyString(pathname.split('/')[2], 'stayId');
        const payload = (await readJsonBody(request)) as UpdateInpatientStatusRequest;
        const stay = inpatient.updateStatus(stayId as never, payload);
        medicalRecords.appendAdvancedCareEvent(
          stay.encounterId,
          principal.user.id,
          'inpatient_progressed',
          `Inpatient stay status changed to ${stay.status}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inpatient',
          'update_status',
          'inpatient-stay',
          stay.id,
          `Inpatient stay moved to ${stay.status}`,
          'high',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify(stay));
        return;
      }

      if (pathname === '/surgeries' && request.method === 'GET') {
        const principal = requirePrincipal(request, 'surgery.read');
        const encounterId = url.searchParams.get('encounterId') ?? undefined;
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'surgery',
          'list',
          'surgery-case',
          encounterId ?? 'all',
          'Surgery cases listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: surgery.list(encounterId) }));
        return;
      }

      if (pathname === '/surgeries' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'surgery.manage');
        const payload = (await readJsonBody(request)) as CreateSurgeryCaseRequest;
        const surgeryCase = surgery.requestCase(payload);
        medicalRecords.appendAdvancedCareEvent(
          surgeryCase.encounterId,
          principal.user.id,
          'surgery_requested',
          `Surgery requested: ${surgeryCase.procedureName}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'surgery',
          'request',
          'surgery-case',
          surgeryCase.id,
          `Surgery requested for encounter ${surgeryCase.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(surgeryCase));
        return;
      }

      if (
        pathname.startsWith('/surgeries/') &&
        pathname.endsWith('/status') &&
        request.method === 'POST'
      ) {
        const principal = requirePrincipal(request, 'surgery.manage');
        const caseId = requireNonEmptyString(pathname.split('/')[2], 'caseId');
        const payload = (await readJsonBody(request)) as UpdateSurgeryStatusRequest;
        const surgeryCase = surgery.updateStatus(caseId as never, payload);
        medicalRecords.appendAdvancedCareEvent(
          surgeryCase.encounterId,
          principal.user.id,
          'surgery_status_changed',
          `Surgery case moved to ${surgeryCase.status}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'surgery',
          'update_status',
          'surgery-case',
          surgeryCase.id,
          `Surgery case updated to ${surgeryCase.status}`,
          'high',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify(surgeryCase));
        return;
      }

      if (pathname === '/diagnostics/orders' && request.method === 'GET') {
        const principal = requirePrincipal(request, 'diagnostics.read');
        const encounterId = url.searchParams.get('encounterId') ?? undefined;
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'diagnostics',
          'list',
          'diagnostic-order',
          encounterId ?? 'all',
          'Diagnostic orders listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: diagnostics.list(encounterId) }));
        return;
      }

      if (pathname === '/diagnostics/orders' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'diagnostics.manage');
        const payload = (await readJsonBody(request)) as CreateDiagnosticOrderRequest;
        const order = diagnostics.createOrder(payload);
        medicalRecords.appendAdvancedCareEvent(
          order.encounterId,
          principal.user.id,
          'diagnostic_requested',
          `Diagnostic order requested: ${order.examType}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'diagnostics',
          'request',
          'diagnostic-order',
          order.id,
          `Diagnostic order created for encounter ${order.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(order));
        return;
      }

      if (
        pathname.startsWith('/diagnostics/orders/') &&
        pathname.endsWith('/result') &&
        request.method === 'POST'
      ) {
        const principal = requirePrincipal(request, 'diagnostics.manage');
        const orderId = requireNonEmptyString(pathname.split('/')[3], 'orderId');
        const payload = (await readJsonBody(request)) as RecordDiagnosticResultRequest;
        const order = diagnostics.recordResult(orderId as never, payload);
        medicalRecords.appendAdvancedCareEvent(
          order.encounterId,
          principal.user.id,
          'diagnostic_resulted',
          `Diagnostic result registered: ${order.resultSummary}`
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'diagnostics',
          'record_result',
          'diagnostic-order',
          order.id,
          `Diagnostic order resulted for encounter ${order.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify(order));
        return;
      }

      if (pathname === '/billing' && request.method === 'GET') {
        const principal = requirePrincipal(request, 'billing.read');
        const encounterId = url.searchParams.get('encounterId') ?? undefined;
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'billing',
          'list',
          'billing-record',
          encounterId ?? 'all',
          'Billing records listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: billing.list(encounterId) }));
        return;
      }

      if (pathname === '/billing/items' && request.method === 'GET') {
        const principal = requirePrincipal(request, 'billing.read');
        const encounterId = requireNonEmptyString(
          url.searchParams.get('encounterId'),
          'encounterId'
        );
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'billing',
          'list_items',
          'billing-item',
          encounterId,
          'Billing items listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: billing.listItems(encounterId as never) }));
        return;
      }

      if (pathname === '/billing/estimate' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'billing.manage');
        const payload = (await readJsonBody(request)) as CreateBillingEstimateRequest;
        const record = billing.createEstimate(payload);
        notifications.create(principal.user.id, principal.user.accountId, {
          category: 'billing',
          encounterId: record.encounterId,
          patientId: record.patientId,
          recipientRoleCode: 'finance',
          title: 'Orcamento assistencial atualizado',
          message: `Encounter ${record.encounterId} com billing em estado ${record.status}.`,
          severity: 'medium'
        });
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'billing',
          'create_estimate',
          'billing-record',
          record.id,
          `Billing estimate prepared for encounter ${record.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(record));
        return;
      }

      if (pathname === '/billing/items' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'billing.manage');
        const payload = (await readJsonBody(request)) as CreateBillingItemRequest;
        const item = billing.addItem(principal.user.id, payload);
        const record = billing.getByEncounterOrThrow(item.encounterId as never);
        if (record.status === 'draft') {
          billing.updateStatus(item.encounterId as never, { status: 'open' });
        }
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'billing',
          'create_item',
          'billing-item',
          item.id,
          `Billing item created for encounter ${item.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(item));
        return;
      }

      if (
        pathname.startsWith('/billing/') &&
        pathname.endsWith('/status') &&
        request.method === 'POST'
      ) {
        const principal = requirePrincipal(request, 'billing.manage');
        const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
        const payload = (await readJsonBody(request)) as UpdateBillingStatusRequest;
        const record = billing.updateStatus(encounterId as never, payload);
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'billing',
          'update_status',
          'billing-record',
          record.id,
          `Billing record moved to ${record.status}`,
          'high',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify(record));
        return;
      }

      if (pathname === '/inventory/items' && request.method === 'GET') {
        const principal = requirePrincipal(request, 'inventory.read');
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inventory',
          'list_items',
          'inventory-item',
          'all',
          'Inventory items listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: inventory.listItems() }));
        return;
      }

      if (pathname === '/inventory/consumptions' && request.method === 'GET') {
        const principal = requirePrincipal(request, 'inventory.read');
        const encounterId = url.searchParams.get('encounterId') ?? undefined;
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inventory',
          'list_consumptions',
          'inventory-consumption',
          encounterId ?? 'all',
          'Assistive consumptions listed',
          'medium',
          correlationId
        );
        response.statusCode = 200;
        response.end(JSON.stringify({ items: inventory.listConsumptions(encounterId) }));
        return;
      }

      if (pathname === '/inventory/consumptions' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'inventory.manage');
        const payload = (await readJsonBody(request)) as CreateInventoryConsumptionRequest;
        const consumption = inventory.consume(principal.user.id, payload);
        const item = inventory.getItemOrThrow(consumption.inventoryItemId);
        if (item.onHandQuantity <= item.reorderLevel) {
          notifications.create(principal.user.id, principal.user.accountId, {
            category: 'inventory',
            encounterId: consumption.encounterId,
            patientId: consumption.patientId,
            recipientRoleCode: 'inventory',
            title: 'Reposicao recomendada',
            message: `${item.name} atingiu nivel de reposicao apos consumo assistencial.`,
            severity: 'high'
          });
        }
        appendAudit(
          principal.user.id,
          principal.user.accountId,
          'inventory',
          'consume',
          'inventory-consumption',
          consumption.id,
          `Assistive consumption recorded for encounter ${consumption.encounterId}`,
          'high',
          correlationId
        );
        response.statusCode = 201;
        response.end(JSON.stringify(consumption));
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
        response.end(JSON.stringify({ items: notifications.list(status ?? undefined) }));
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
        response.end(JSON.stringify({ items: notifications.listJobs() }));
        return;
      }

      if (pathname === '/notifications' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'notifications.manage');
        const payload = (await readJsonBody(request)) as CreateNotificationRequest;
        const notification = notifications.create(
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
        const processed = notifications.processPending(payload);
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
        response.end(JSON.stringify({ items: scheduling.listAppointments() }));
        return;
      }

      if (pathname === '/appointments' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'scheduling.manage');
        const payload = (await readJsonBody(request)) as CreateAppointmentRequest;
        const appointment = scheduling.createAppointment(principal.user.accountId, payload);
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
        response.end(JSON.stringify({ items: scheduling.getQueue() }));
        return;
      }

      if (pathname === '/queue/check-in' && request.method === 'POST') {
        const principal = requirePrincipal(request, 'scheduling.manage');
        const payload = (await readJsonBody(request)) as CheckInQueueRequest;
        const entry = scheduling.checkIn(principal.user.accountId, payload);
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
        const entry = scheduling.callQueueEntry(queueEntryId as never);
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
          const queueEntry = scheduling.attachEncounter(encounter.queueEntryId, encounter.id);
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
        syncQueueWithEncounter(encounter.id, encounter.status);
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
        syncQueueWithEncounter(encounter.id, encounter.status);
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
          syncQueueWithEncounter(currentEncounter.id, 'in_triage');
        }
        const record = triage.createTriage(principal.user.id, payload);
        encounters.appendTimeline(record.encounterId, {
          accountId: record.accountId,
          eventType: 'triage_recorded',
          summary: `Initial triage recorded with priority ${record.priority}`,
          actorUserId: principal.user.id
        });
        const encounter = encounters.transitionEncounter(record.encounterId, principal.user.id, {
          nextStatus: record.destination
        });
        syncQueueWithEncounter(encounter.id, encounter.status);
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
            items: patients.listLinks({ ownerId: ownerId as never, patientId: patientId as never })
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
          const user = users.update(userId as never, payload);
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
        response.end(JSON.stringify({ items: staff.list() }));
        return;
      }

      if (pathname.startsWith('/staff/') && request.method === 'GET') {
        const principal = requirePrincipal(request, 'staff.read');
        const staffId = requireNonEmptyString(pathname.split('/')[2], 'staffId');
        const member = staff.getOrThrow(staffId as never);
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
            permissions: accessControl.listPermissions()
          })
        );
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

      response.statusCode = 404;
      response.end(
        JSON.stringify({ code: 'NOT_FOUND', message: 'Route not found', correlationId })
      );
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

  function syncQueueWithEncounter(
    encounterId: string,
    status: 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed'
  ) {
    const encounter = encounters.getOrThrow(encounterId as never);
    if (!encounter.queueEntryId) {
      return;
    }

    if (status === 'closed') {
      scheduling.completeQueueEntry(encounter.queueEntryId);
      return;
    }

    if (status === 'reception') {
      return;
    }

    const queueStatus =
      status === 'in_triage' ? 'in_triage' : status === 'in_care' ? 'in_care' : 'observation';
    scheduling.transitionQueueForEncounter(encounter.queueEntryId, queueStatus);
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

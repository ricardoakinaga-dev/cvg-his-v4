/**
 * Discharges route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { DischargesService } from '@cvg-his-v2/module-discharges';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { InpatientService } from '@cvg-his-v2/module-inpatient';
import type { CreateDischargeRequest, UpdateDischargeRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal, InpatientStaySummary } from '@cvg-his-v2/shared-types';
import {
  getDatabaseTransactionScope,
  runWithoutDatabaseTransactionScope,
  type JsonValue
} from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';
import type { TenantCommandInput, TenantCommandRunner } from '../helpers/tenant-command.js';

function isDischargeEncounterUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current && typeof current === 'object'; depth += 1) {
    const candidate = current as {
      readonly code?: unknown;
      readonly constraint?: unknown;
      readonly cause?: unknown;
    };
    if (
      candidate.code === '23505' &&
      (candidate.constraint === undefined ||
        candidate.constraint === 'discharges_account_encounter_unique')
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

export interface DischargesHandlers {
  discharges: DischargesService;
  encounters: EncountersService;
  inpatient: InpatientService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  runCommand?: TenantCommandRunner;
}

/**
 * Handle all discharges-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleDischargesRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: DischargesHandlers
): Promise<boolean> {
  const { discharges, encounters, inpatient, audit, requirePrincipal } = handlers;
  const runCommand =
    handlers.runCommand ?? (async <T>(input: TenantCommandInput<T>) => input.command());

  // GET /discharges — list all discharges for account
  if (pathname === '/discharges' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'discharges.read');
    // Discharge lists are read by any API replica. Rehydrate the account slice
    // from committed rows so a replica started before a discharge does not
    // serve an incomplete high-value clinical record.
    await discharges.refreshAccount(principal.user.accountId as never);
    const items = discharges.list(principal.user.accountId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'list',
      entityType: 'discharge',
      entityId: '*',
      payloadSummary: 'Discharges listed',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items, total: items.length }));
    return true;
  }

  // POST /discharges — create a new discharge
  if (pathname === '/discharges' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'discharges.manage');
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
    let discharge: Awaited<ReturnType<DischargesService['create']>>;
    let createdDischarge: Awaited<ReturnType<DischargesService['create']>> | undefined;
    let previousStay: InpatientStaySummary | undefined;
    let auditEventId: string | undefined;
    try {
      discharge = await runCommand({
        request,
        accountId: principal.user.accountId,
        actorUserId: principal.user.id,
        correlationId,
        operation: 'discharges.create',
        payload: payload as unknown as JsonValue,
        command: async () => {
          const encounter = encounters.getOrThrow(payload.encounterId as never);
          if (encounter.accountId !== principal.user.accountId) {
            throw new NotFoundError('Encounter not found', {
              encounterId: payload.encounterId
            });
          }

          const activeStay =
            payload.dischargeType === 'inpatient'
              ? inpatient
                  .list({
                    accountId: principal.user.accountId,
                    encounterId: payload.encounterId,
                    includeDischarged: true
                  })
                  .find((stay) => stay.status !== 'discharged')
              : undefined;

          previousStay = activeStay;

          if (payload.dischargeType === 'inpatient' && !activeStay) {
            throw new NotFoundError('Inpatient stay not found', {
              encounterId: payload.encounterId
            });
          }

          const created = discharges.create(
            principal.user.accountId as never,
            principal.user.id as never,
            payload
          );
          createdDischarge = created;

          if (activeStay) {
            inpatient.updateStatus(
              activeStay.id,
              {
                status: 'discharged',
                dischargeReason:
                  payload.outcome ?? payload.clinicalSummary ?? 'Alta documental registrada'
              },
              principal.user.accountId as never
            );
          }

          await Promise.all([discharges.waitForPersistence(), inpatient.waitForPersistence()]);
          const auditEvent = audit.write({
            actorId: principal.user.id,
            accountId: principal.user.accountId,
            module: 'discharges',
            action: 'create',
            entityType: 'discharge',
            entityId: created.id,
            payloadSummary: `Discharge created for encounter ${payload.encounterId}`,
            riskLevel: 'high',
            correlationId
          });
          auditEventId = auditEvent.eventId;
          await audit.waitForPersistence();
          return created;
        }
      });
    } catch (error) {
      const restoreCaches = (): void => {
        if (createdDischarge) {
          discharges.removeFromCache(principal.user.accountId as never, createdDischarge.id);
        }
        if (previousStay) {
          inpatient.restoreStayCache(previousStay);
        }
        if (auditEventId) {
          audit.removeFromCache(auditEventId as never);
        }
      };
      restoreCaches();
      // Database rehydration is retained as a best-effort fallback for
      // failures that happen before an entity identity is available. It is
      // intentionally deferred until the outer UoW releases its client.
      if (!createdDischarge && !previousStay && getDatabaseTransactionScope()) {
        setImmediate(() => {
          runWithoutDatabaseTransactionScope(() => {
            void Promise.allSettled([
              discharges.refreshAccount(principal.user.accountId as never),
              inpatient.refreshAccount(principal.user.accountId),
              audit.refreshFromDatabase(principal.user.accountId as never)
            ]);
          });
        });
      }
      if (isDischargeEncounterUniqueViolation(error)) {
        throw new ConflictError('Encounter already has a discharge', {
          encounterId: payload.encounterId
        });
      }
      throw error;
    }
    response.statusCode = 201;
    response.end(JSON.stringify(discharge));
    return true;
  }

  // GET /discharges/:dischargeId — get discharge by ID
  if (pathname.startsWith('/discharges/') && request.method === 'GET' && !pathname.includes('?')) {
    const principal = await requirePrincipal(request, 'discharges.read');
    await discharges.refreshAccount(principal.user.accountId as never);
    const dischargeId = requireNonEmptyString(pathname.split('/')[2], 'dischargeId');
    const discharge = discharges.getById(principal.user.accountId as never, dischargeId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'read',
      entityType: 'discharge',
      entityId: discharge.id,
      payloadSummary: 'Discharge detail consulted',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(discharge));
    return true;
  }

  // PATCH /discharges/:dischargeId — update a discharge
  if (pathname.startsWith('/discharges/') && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'discharges.manage');
    const dischargeId = requireNonEmptyString(pathname.split('/')[2], 'dischargeId');
    const body = await readJsonBody(request);
    const { expectedVersion, ...payload } = body as UpdateDischargeRequest & {
      expectedVersion?: number;
    };
    await discharges.refreshAccount(principal.user.accountId as never);
    const current = discharges.getById(principal.user.accountId as never, dischargeId as never);
    const discharge = discharges.update(
      principal.user.accountId as never,
      dischargeId as never,
      payload,
      expectedVersion
    );
    if (discharge.accountId !== current.accountId) {
      throw new Error('Discharge account context changed unexpectedly');
    }
    await discharges.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'update',
      entityType: 'discharge',
      entityId: discharge.id,
      payloadSummary: 'Discharge updated',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(discharge));
    return true;
  }

  return false;
}

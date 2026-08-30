import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import { getTenantTransactionContext, type JsonValue } from '@cvg-his-v2/shared-database';
import type { AccountId, AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import type { EncounterCashReceiptCommand } from '../commands/encounter-cash-receipt.js';
import type { EncounterCashReceiptReversalCommand } from '../commands/encounter-cash-receipt-reversal.js';
import type { EncounterCashReceiptRepository } from '../encounter-cash-receipt-repository.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { TenantCommandRunner } from '../helpers/tenant-command.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CREATE_PATH = /^\/encounters\/([^/]+)\/cash-receipts$/;
const GET_PATH = /^\/encounters\/([^/]+)\/cash-receipts\/([^/]+)$/;
const REVERSE_PATH = /^\/encounters\/([^/]+)\/cash-receipts\/([^/]+)\/reverse$/;

export interface EncounterCashReceiptRouteHandlers {
  readonly command: EncounterCashReceiptCommand;
  readonly repository: EncounterCashReceiptRepository;
  readonly audit: AuditService;
  readonly correlationId: string;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  readonly reversalCommand?: EncounterCashReceiptReversalCommand;
  readonly refreshAccountCaches?: (accountId: AccountId) => Promise<void>;
  readonly runCommand?: TenantCommandRunner;
}

function auditReceiptRead(
  handlers: EncounterCashReceiptRouteHandlers,
  principal: AuthenticatedPrincipal,
  receiptId: string,
  encounterId: string
): void {
  appendAudit(handlers.audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'financial',
    action: 'cash_receipt_read',
    entityType: 'encounter_cash_receipt',
    entityId: receiptId,
    payloadSummary: `Cash receipt read for encounter ${encounterId}`,
    riskLevel: 'low',
    correlationId: handlers.correlationId
  });
}

export async function assertEncounterHasNoCashReceipt(
  repository: EncounterCashReceiptRepository,
  accountId: string,
  encounterId: string
): Promise<void> {
  const transaction = getTenantTransactionContext();
  let receiptId: string | undefined;
  if (transaction) {
    if (transaction.accountId !== accountId) {
      throw new AppError(
        'CASH_RECEIPT_CONTEXT_MISMATCH',
        'Receipt context does not match the active transaction',
        403
      );
    }
    const initialReceipt = await transaction.client.query<{ readonly id: string }>(
      `SELECT id
         FROM encounter_cash_receipts
        WHERE account_id = $1 AND encounter_id = $2
          AND NOT EXISTS (
            SELECT 1
              FROM encounter_cash_receipt_reversals AS reversal
             WHERE reversal.account_id = encounter_cash_receipts.account_id
               AND reversal.receipt_id = encounter_cash_receipts.id
          )
        FOR UPDATE`,
      [accountId, encounterId]
    );
    receiptId = initialReceipt.rows[0]?.id;
    if (!receiptId) {
      await transaction.client.query(
        `SELECT id
           FROM billing_records
          WHERE account_id = $1 AND encounter_id = $2
          FOR UPDATE`,
        [accountId, encounterId]
      );
      await transaction.client.query(
        `SELECT id
           FROM encounters
          WHERE account_id = $1 AND id = $2
          FOR UPDATE`,
        [accountId, encounterId]
      );
      const result = await transaction.client.query<{ readonly id: string }>(
        `SELECT id
           FROM encounter_cash_receipts
          WHERE account_id = $1 AND encounter_id = $2
            AND NOT EXISTS (
              SELECT 1
                FROM encounter_cash_receipt_reversals AS reversal
               WHERE reversal.account_id = encounter_cash_receipts.account_id
                 AND reversal.receipt_id = encounter_cash_receipts.id
            )
          FOR UPDATE`,
        [accountId, encounterId]
      );
      receiptId = result.rows[0]?.id;
    }
  } else {
    receiptId = (await repository.findByEncounter(accountId, encounterId))?.id;
  }
  if (receiptId) {
    throw new AppError(
      'CASH_RECEIPT_REVERSAL_REQUIRED',
      'A received encounter requires an explicit financial reversal before this operation',
      409,
      { receiptId }
    );
  }
}

function requireUuid(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
  return value;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function requireCreatePayload(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  const payload = value as Readonly<Record<string, unknown>>;
  const allowedFields = new Set(['cashRegisterId', 'expectedAmount', 'notes']);
  const unexpectedField = Object.keys(payload).find((field) => !allowedFields.has(field));
  if (unexpectedField) throw new ValidationError(`Unknown field '${unexpectedField}'`);
  if (payload.notes !== undefined && typeof payload.notes !== 'string') {
    throw new ValidationError('notes must be a string');
  }
  return payload;
}

function requireReversalPayload(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  const payload = value as Readonly<Record<string, unknown>>;
  const allowedFields = new Set(['reason']);
  const unexpectedField = Object.keys(payload).find((field) => !allowedFields.has(field));
  if (unexpectedField) throw new ValidationError(`Unknown field '${unexpectedField}'`);
  if (typeof payload.reason !== 'string') throw new ValidationError('reason must be a string');
  const reason = payload.reason.trim();
  if (!reason) throw new ValidationError('reason is required');
  if (reason.length > 500) {
    throw new ValidationError('reason must contain at most 500 characters');
  }
  return { ...payload, reason };
}

export async function handleEncounterCashReceiptRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  handlers: EncounterCashReceiptRouteHandlers
): Promise<boolean> {
  const createMatch = CREATE_PATH.exec(pathname);
  if (createMatch && request.method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'billing.manage');
    const idempotencyKey = request.headers['idempotency-key'];
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 1 ||
      idempotencyKey.length > 255
    ) {
      throw new ValidationError(
        'Idempotency-Key header is required and must contain at most 255 characters'
      );
    }
    const normalizedIdempotencyKey = idempotencyKey.trim();
    const encounterId = requireUuid(createMatch[1] ?? '', 'encounterId');
    const payload = requireCreatePayload(await readJsonBody(request));
    const commandInput = {
      accountId: principal.user.accountId,
      encounterId,
      actorUserId: principal.user.id,
      cashRegisterId: typeof payload.cashRegisterId === 'string' ? payload.cashRegisterId : '',
      expectedAmount:
        typeof payload.expectedAmount === 'number' ? payload.expectedAmount : Number.NaN,
      notes: typeof payload.notes === 'string' ? payload.notes : undefined
    };
    const commandPayload: JsonValue = {
      encounterId,
      cashRegisterId: commandInput.cashRegisterId,
      expectedAmount: Number.isFinite(commandInput.expectedAmount)
        ? commandInput.expectedAmount
        : null,
      ...(commandInput.notes === undefined ? {} : { notes: commandInput.notes })
    };
    const receipt = handlers.runCommand
      ? await handlers.runCommand({
          request,
          idempotencyKey: normalizedIdempotencyKey,
          accountId: principal.user.accountId,
          actorUserId: principal.user.id,
          correlationId: handlers.correlationId,
          operation: 'encounter.cash-receipt.create',
          payload: commandPayload,
          command: () => handlers.command.execute(commandInput),
          beforeIdempotency: async () => {
            await handlers.requirePrincipal(request, 'billing.manage');
          },
          onRollback: handlers.refreshAccountCaches
            ? () => handlers.refreshAccountCaches!(principal.user.accountId)
            : undefined,
          onCommit: handlers.refreshAccountCaches
            ? () => handlers.refreshAccountCaches!(principal.user.accountId)
            : undefined
        })
      : await handlers.command.execute(commandInput);
    response.setHeader('location', `/encounters/${encounterId}/cash-receipts/${receipt.id}`);
    return json(response, 201, receipt);
  }

  const reverseMatch = REVERSE_PATH.exec(pathname);
  if (reverseMatch && request.method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'billing.manage');
    const idempotencyKey = request.headers['idempotency-key'];
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 1 ||
      idempotencyKey.length > 255
    ) {
      throw new ValidationError(
        'Idempotency-Key header is required and must contain at most 255 characters'
      );
    }
    if (!handlers.reversalCommand) {
      throw new AppError(
        'CASH_RECEIPT_REVERSAL_UNAVAILABLE',
        'Cash receipt reversal is unavailable until its durable ledger is installed',
        503
      );
    }
    const normalizedIdempotencyKey = idempotencyKey.trim();
    const encounterId = requireUuid(reverseMatch[1] ?? '', 'encounterId');
    const receiptId = requireUuid(reverseMatch[2] ?? '', 'receiptId');
    const payload = requireReversalPayload(await readJsonBody(request));
    const commandInput = {
      accountId: principal.user.accountId,
      encounterId,
      receiptId,
      actorUserId: principal.user.id,
      reason: payload.reason as string
    };
    const commandPayload: JsonValue = { encounterId, receiptId, reason: commandInput.reason };
    const reversal = handlers.runCommand
      ? await handlers.runCommand({
          request,
          idempotencyKey: normalizedIdempotencyKey,
          accountId: principal.user.accountId,
          actorUserId: principal.user.id,
          correlationId: handlers.correlationId,
          operation: 'encounter.cash-receipt.reverse',
          payload: commandPayload,
          command: () => handlers.reversalCommand!.execute(commandInput),
          beforeIdempotency: async () => {
            await handlers.requirePrincipal(request, 'billing.manage');
          },
          onRollback: handlers.refreshAccountCaches
            ? () => handlers.refreshAccountCaches!(principal.user.accountId)
            : undefined,
          onCommit: handlers.refreshAccountCaches
            ? () => handlers.refreshAccountCaches!(principal.user.accountId)
            : undefined
        })
      : await handlers.reversalCommand.execute(commandInput);
    response.setHeader('location', `/encounters/${encounterId}/cash-receipts/${receiptId}`);
    return json(response, 201, reversal);
  }

  if (createMatch && request.method === 'GET') {
    const principal = await handlers.requirePrincipal(request, 'billing.read');
    const encounterId = requireUuid(createMatch[1] ?? '', 'encounterId');
    const receipt = await handlers.repository.findByEncounter(
      principal.user.accountId,
      encounterId
    );
    if (!receipt) {
      throw new AppError('CASH_RECEIPT_NOT_FOUND', 'Cash receipt not found', 404);
    }
    auditReceiptRead(handlers, principal, receipt.id, encounterId);
    return json(response, 200, receipt);
  }

  const getMatch = GET_PATH.exec(pathname);
  if (getMatch && request.method === 'GET') {
    const principal = await handlers.requirePrincipal(request, 'billing.read');
    const encounterId = requireUuid(getMatch[1] ?? '', 'encounterId');
    const receiptId = requireUuid(getMatch[2] ?? '', 'receiptId');
    const receipt = await handlers.repository.findById(
      principal.user.accountId,
      encounterId,
      receiptId
    );
    if (!receipt) {
      throw new AppError('CASH_RECEIPT_NOT_FOUND', 'Cash receipt not found', 404);
    }
    auditReceiptRead(handlers, principal, receipt.id, encounterId);
    return json(response, 200, receipt);
  }

  return false;
}

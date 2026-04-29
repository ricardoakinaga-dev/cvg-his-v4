import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  CashMovementSummary,
  CashRegisterSummary,
  CashService
} from '@cvg-his-v2/module-cash';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  CashDrawerDashboardResponse,
  CashMovementDashboardSummary,
  CashMovementType,
  CloseCashRegisterRequest,
  CreateCashMovementRequest,
  OpenCashRegisterRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface CashRoutesHandlers {
  cash: CashService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function movementTypeLabel(type: CashMovementType): string {
  const labels: Record<CashMovementType, string> = {
    opening: 'Abertura',
    closing: 'Fechamento',
    payment: 'Pagamento',
    supply: 'Entrada',
    withdrawal: 'Saida',
    adjustment: 'Ajuste'
  };
  return labels[type];
}

function paymentMethodFor(movement: CashMovementSummary): string {
  const text = `${movement.reference ?? ''} ${movement.notes ?? ''}`.toLowerCase();

  if (text.includes('pix')) return 'PIX';
  if (text.includes('débito') || text.includes('debito')) return 'Cartao de Debito';
  if (text.includes('crédito') || text.includes('credito')) return 'Cartao de Credito';
  if (text.includes('boleto')) return 'Boleto';
  if (text.includes('cheque')) return 'Cheque';
  if (text.includes('link')) return 'Link de Pagamento';
  if (text.includes('dinheiro')) return 'Dinheiro';

  if (movement.movementType === 'payment') return 'Recebimento';
  return 'Dinheiro';
}

function signedAmount(movement: CashMovementSummary): number {
  if (movement.movementType === 'withdrawal') {
    return -movement.amount;
  }
  return movement.amount;
}

function mapMovement(movement: CashMovementSummary): CashMovementDashboardSummary {
  return {
    id: movement.id,
    cashRegisterId: movement.cashRegisterId,
    movementType: movement.movementType,
    movementTypeLabel: movementTypeLabel(movement.movementType),
    amount: movement.amount,
    runningBalance: movement.runningBalance,
    reference: movement.reference,
    notes: movement.notes,
    paymentMethod: paymentMethodFor(movement),
    createdAt: movement.createdAt
  };
}

function mapClosedRegister(register: CashRegisterSummary) {
  return {
    id: register.id,
    openedAt: register.openedAt,
    closedAt: register.closedAt,
    closingAmount: register.closingAmount,
    expectedClosingAmount: register.expectedClosingAmount,
    difference: register.difference
  };
}

async function buildDashboard(
  cash: CashService,
  accountId: AuthenticatedPrincipal['user']['accountId']
): Promise<CashDrawerDashboardResponse> {
  const openRegister = await cash.findOpenRegister(accountId);
  const recentRegisters = cash.listRegisters(accountId, 5);
  const registerForMovements = openRegister ?? recentRegisters[0] ?? null;
  const movements = registerForMovements ? await cash.getMovements(registerForMovements.id) : [];
  const dashboardMovements = movements.map(mapMovement).reverse();
  const totalEntradas = movements
    .filter((movement) => signedAmount(movement) > 0)
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalSaidas = movements
    .filter((movement) => signedAmount(movement) < 0)
    .reduce((sum, movement) => sum + movement.amount, 0);
  const totalEmGaveta = openRegister ? await cash.getCurrentBalance(openRegister.id) : 0;
  const byPaymentMethodMap = new Map<string, { amount: number; count: number }>();

  for (const movement of movements.filter((item) => signedAmount(item) > 0)) {
    const method = paymentMethodFor(movement);
    const current = byPaymentMethodMap.get(method) ?? { amount: 0, count: 0 };
    byPaymentMethodMap.set(method, {
      amount: current.amount + movement.amount,
      count: current.count + 1
    });
  }

  const lastClosedRegister = recentRegisters.find((register) => register.status === 'closed') ?? null;

  return {
    generatedAt: new Date().toISOString(),
    openRegister: openRegister
      ? {
          id: openRegister.id,
          status: openRegister.status,
          openedAt: openRegister.openedAt,
          openingAmount: openRegister.openingAmount,
          runningBalance: totalEmGaveta,
          notes: openRegister.notes
        }
      : null,
    lastClosedRegister: lastClosedRegister ? mapClosedRegister(lastClosedRegister) : null,
    totals: {
      totalEntradas: roundCurrency(totalEntradas),
      totalSaidas: roundCurrency(totalSaidas),
      totalEmGaveta: roundCurrency(totalEmGaveta)
    },
    byPaymentMethod: Array.from(byPaymentMethodMap.entries())
      .map(([method, value]) => ({
        method,
        amount: roundCurrency(value.amount),
        count: value.count
      }))
      .sort((left, right) => right.amount - left.amount),
    movements: dashboardMovements,
    recentRegisters: recentRegisters.map(mapClosedRegister)
  };
}

function ensureMovementType(value: unknown): CreateCashMovementRequest['movementType'] {
  if (value === 'supply' || value === 'withdrawal' || value === 'adjustment') {
    return value;
  }
  throw new ValidationError('movementType must be supply, withdrawal or adjustment');
}

export async function handleCashRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CashRoutesHandlers
): Promise<boolean> {
  const isCashRoute =
    pathname.startsWith('/cash-register')
    || pathname.startsWith('/financeiro/gaveta')
    || pathname.startsWith('/finance/drawer');

  if (!isCashRoute) {
    return false;
  }

  const { cash, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';

  if (
    (pathname === '/cash-register/dashboard'
      || pathname === '/financeiro/gaveta/dashboard'
      || pathname === '/finance/drawer/dashboard')
    && method === 'GET'
  ) {
    const principal = requirePrincipal(request, 'billing.read');
    const dashboard = await buildDashboard(cash, principal.user.accountId);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'cash',
      action: 'read_dashboard',
      entityType: 'cash-register',
      entityId: dashboard.openRegister?.id ?? 'no-open-register',
      payloadSummary: 'Cash drawer dashboard inspected',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, dashboard);
  }

  if (
    (pathname === '/cash-register/open' || pathname === '/financeiro/gaveta/abrir')
    && method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'billing.manage');
    const payload = (await readJsonBody(request)) as OpenCashRegisterRequest;
    const register = await cash.openRegister(principal.user.accountId, principal.user.id, {
      openingAmount: Number(payload.openingAmount),
      notes: payload.notes
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'cash',
      action: 'open_register',
      entityType: 'cash-register',
      entityId: register.id,
      payloadSummary: `Cash drawer opened with ${register.openingAmount}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, register);
  }

  if (
    (pathname === '/cash-register/movements' || pathname === '/financeiro/gaveta/movimentos')
    && method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'billing.manage');
    const payload = (await readJsonBody(request)) as CreateCashMovementRequest;
    const openRegister = await cash.findOpenRegister(principal.user.accountId);
    if (!openRegister) {
      throw new ConflictError('No open cash register');
    }

    const movement = await cash.recordMovement(
      openRegister.id,
      principal.user.accountId,
      {
        movementType: ensureMovementType(payload.movementType),
        amount: Number(payload.amount),
        reference: payload.reference,
        notes: payload.notes
      },
      principal.user.id
    );

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'cash',
      action: 'record_movement',
      entityType: 'cash-movement',
      entityId: movement.id,
      payloadSummary: `${movement.movementType} ${movement.amount} recorded in cash drawer`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, movement);
  }

  if (
    (pathname === '/cash-register/close' || pathname === '/financeiro/gaveta/fechar')
    && method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'billing.manage');
    const payload = (await readJsonBody(request)) as CloseCashRegisterRequest;
    const openRegister = await cash.findOpenRegister(principal.user.accountId);
    if (!openRegister) {
      throw new ConflictError('No open cash register');
    }

    const result = await cash.closeRegister(openRegister.id, principal.user.id, {
      closingAmount: Number(payload.closingAmount),
      notes: payload.notes
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'cash',
      action: 'close_register',
      entityType: 'cash-register',
      entityId: result.register.id,
      payloadSummary: `Cash drawer closed with difference ${result.difference}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, result);
  }

  return false;
}

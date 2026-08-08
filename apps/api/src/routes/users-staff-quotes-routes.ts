/**
 * Users, Staff and Quotes route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 * Block: users (~110 lines) + staff (~200 lines) + quotes (~400 lines) ≈ 510 lines.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AccessControlService } from '@cvg-his-v2/module-access-control';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { CounterSalesService } from '@cvg-his-v2/module-counter-sales';
import type { QuotesService } from '@cvg-his-v2/module-quotes';
import type { StaffService } from '@cvg-his-v2/module-staff';
import type { UsersService } from '@cvg-his-v2/module-users';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { UpdateUserRequest } from '@cvg-his-v2/shared-contracts';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import { validateRequestBody } from '../helpers/common.js';

export interface UsersStaffQuotesRoutesHandlers {
  users: UsersService;
  staff: StaffService;
  quotes: QuotesService;
  counterSales: CounterSalesService;
  accessControl: AccessControlService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

export async function handleUsersStaffQuotesRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: UsersStaffQuotesRoutesHandlers
): Promise<boolean> {
  const { users, staff, quotes, counterSales, accessControl, audit, requirePrincipal } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

  // ==========================================================
  // USERS
  // ==========================================================

  // POST /users — create user
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
        accountId: principal.user.accountId,
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

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'users',
        action: 'create',
        entityType: 'user',
        entityId: newUser.id,
        payloadSummary: `User ${newUser.username} created`,
        riskLevel: 'high',
        correlationId
      });

      response.statusCode = 201;
      response.end(JSON.stringify(newUser));
    } catch (err) {
      response.statusCode = 500;
      response.end(
        JSON.stringify({ code: 'ERROR', message: String((err as Error)?.message || err) })
      );
    }
    return true;
  }

  // GET /users — list users
  if (pathname === '/users' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'users.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'users',
      action: 'list',
      entityType: 'user',
      entityId: 'all',
      payloadSummary: 'User list inspected',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items: users.listForAccount(principal.user.accountId) }));
    return true;
  }

  // GET/PATCH /users/:id
  if (pathname.startsWith('/users/')) {
    const principal = requirePrincipal(
      request,
      request.method === 'PATCH' ? 'users.manage' : 'users.read'
    );
    const userId = requireNonEmptyString(pathname.split('/')[2], 'userId');
    if (request.method === 'GET') {
      const user = users.getForAccountOrThrow(userId as never, principal.user.accountId);
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'users',
        action: 'read',
        entityType: 'user',
        entityId: user.id,
        payloadSummary: `User ${user.username} inspected`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 200;
      response.end(JSON.stringify(user));
      return true;
    }
    if (request.method === 'PATCH') {
      const payload = (await readJsonBody(request)) as UpdateUserRequest;
      const user = await users.updateForAccount(
        userId as never,
        principal.user.accountId,
        payload
      );
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'users',
        action: 'update',
        entityType: 'user',
        entityId: user.id,
        payloadSummary: `User ${user.username} updated`,
        riskLevel: 'high',
        correlationId
      });
      response.statusCode = 200;
      response.end(JSON.stringify(user));
      return true;
    }
  }

  // ==========================================================
  // STAFF
  // ==========================================================

  // GET /staff/time-off — list absences/leave intervals
  if (pathname === '/staff/time-off' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'staff.read');
    const staffId = url.searchParams.get('staffId') ?? undefined;
    const items = staff.listTimeOff(principal.user.accountId as never, staffId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'list_time_off',
      entityType: 'staff-time-off',
      entityId: staffId ?? 'all',
      payloadSummary: 'Staff time off listed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // POST /staff/time-off — create an absence/leave interval
  if (pathname === '/staff/time-off' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const payload = (await readJsonBody(request)) as {
      staffId: string;
      startsAt: string;
      endsAt: string;
      reason: string;
    };
    const timeOff = await staff.createTimeOff(principal.user.accountId as never, principal.user.id, {
      staffId: requireNonEmptyString(payload.staffId, 'staffId') as never,
      startsAt: requireNonEmptyString(payload.startsAt, 'startsAt'),
      endsAt: requireNonEmptyString(payload.endsAt, 'endsAt'),
      reason: requireNonEmptyString(payload.reason, 'reason')
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'create_time_off',
      entityType: 'staff-time-off',
      entityId: timeOff.id,
      payloadSummary: `Staff time off created for ${timeOff.staffId}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(timeOff));
    return true;
  }

  // POST /staff/time-off/:id/cancel — cancel an absence/leave interval
  if (pathname.startsWith('/staff/time-off/') && pathname.endsWith('/cancel') && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const timeOffId = requireNonEmptyString(pathname.split('/')[3], 'timeOffId');
    const timeOff = await staff.cancelTimeOff(principal.user.accountId as never, timeOffId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'cancel_time_off',
      entityType: 'staff-time-off',
      entityId: timeOff.id,
      payloadSummary: `Staff time off cancelled for ${timeOff.staffId}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(timeOff));
    return true;
  }

  // GET /staff — list staff members
  if (pathname === '/staff' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'staff.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'list',
      entityType: 'staff',
      entityId: 'all',
      payloadSummary: 'Staff registry inspected',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: staff.list().filter((member) => member.accountId === principal.user.accountId)
      })
    );
    return true;
  }

  // GET /staff/:id
  if (pathname.startsWith('/staff/') && request.method === 'GET') {
    const principal = requirePrincipal(request, 'staff.read');
    const staffId = requireNonEmptyString(pathname.split('/')[2], 'staffId');
    const member = staff.getOrThrow(staffId as never);
    if (member.accountId !== principal.user.accountId) {
      throw new AuthenticationError('Staff member not found for current account');
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'read',
      entityType: 'staff',
      entityId: member.id,
      payloadSummary: `Staff member ${member.employeeCode} inspected`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(member));
    return true;
  }

  // POST /staff — create staff member
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
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'create',
      entityType: 'staff',
      entityId: member.id,
      payloadSummary: `Staff member created: ${member.employeeCode}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(member));
    return true;
  }

  // PATCH /staff/:id
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
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'update',
      entityType: 'staff',
      entityId: member.id,
      payloadSummary: `Staff member updated: ${member.employeeCode}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(member));
    return true;
  }

  // POST /staff/:id/toggle-active
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
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: payload.isActive ? 'activate' : 'deactivate',
      entityType: 'staff',
      entityId: member.id,
      payloadSummary: `Staff member ${payload.isActive ? 'activated' : 'deactivated'}: ${member.employeeCode}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(member));
    return true;
  }

  // ==========================================================
  // QUOTES
  // ==========================================================

  // GET /quotes — list quotes
  if (pathname === '/quotes' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'quote.read');
    const search = url.searchParams.get('search') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'list',
      entityType: 'quote',
      entityId: status ?? search ?? 'all',
      payloadSummary: 'Quotes listed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: quotes.list(principal.user.accountId as never, { search, status })
      })
    );
    return true;
  }

  // POST /quotes — create quote
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
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'create',
      entityType: 'quote',
      entityId: quote.id,
      payloadSummary: `Quote ${quote.number} created`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(quote));
    return true;
  }

  // GET /quotes/:id or /quotes/:id/print or /quotes/:id/pdf
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
      return true;
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
      return true;
    }

    if (!action) {
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'quotes',
        action: 'read',
        entityType: 'quote',
        entityId: quote.id,
        payloadSummary: `Quote ${quote.number} inspected`,
        riskLevel: 'medium',
        correlationId
      });
      response.statusCode = 200;
      response.end(JSON.stringify({ ...quote, items: quotes.getItems(quote.id) }));
      return true;
    }
  }

  // POST /quotes/:id/items — add item to quote
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
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'add_item',
      entityType: 'quote-item',
      entityId: result.item.id,
      payloadSummary: `Item added to quote ${quote.number}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(result.item));
    return true;
  }

  // POST /quotes/:id/approve
  if (
    pathname.startsWith('/quotes/') &&
    pathname.endsWith('/approve') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'quote.write');
    const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
    const quote = await quotes.approve(quoteId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'approve',
      entityType: 'quote',
      entityId: quote.id,
      payloadSummary: `Quote ${quote.number} approved`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(quote));
    return true;
  }

  // POST /quotes/:id/reject
  if (
    pathname.startsWith('/quotes/') &&
    pathname.endsWith('/reject') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'quote.write');
    const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
    const quote = await quotes.reject(quoteId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'reject',
      entityType: 'quote',
      entityId: quote.id,
      payloadSummary: `Quote ${quote.number} rejected`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(quote));
    return true;
  }

  // POST /quotes/:id/cancel
  if (
    pathname.startsWith('/quotes/') &&
    pathname.endsWith('/cancel') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'quote.write');
    const quoteId = requireNonEmptyString(pathname.split('/')[2], 'quoteId');
    const quote = await quotes.cancel(quoteId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'cancel',
      entityType: 'quote',
      entityId: quote.id,
      payloadSummary: `Quote ${quote.number} cancelled`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(quote));
    return true;
  }

  // POST /quotes/:id/convert-to-sale
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
    const sale = await counterSales.open(principal.user.accountId as never, principal.user.id, {
      ownerId: quote.ownerId,
      notes: `Convertida do orcamento ${quote.number}`
    });
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
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'quotes',
      action: 'convert_to_sale',
      entityType: 'quote',
      entityId: converted.id,
      payloadSummary: `Quote ${converted.number} converted to counter sale ${sale.number}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify({ counterSaleId: sale.id, quoteId: converted.id }));
    return true;
  }

  return false;
}

import type { FastifyPluginAsync } from 'fastify';
import {
  closeEncounterFinancialBodySchema,
  encounterFinancialEncounterParamSchema,
  encounterReceivableParamSchema,
  listEncounterReceivablesQuerySchema,
  settleEncounterReceivableBodySchema
} from '@cvg-his/contracts';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { appendSensitiveReadAudit } from '../iam/auditSensitiveAccess.js';
import { createEncounterFinancialService } from './service.js';

export const encounterFinancialRoutes: FastifyPluginAsync = async (app) => {
  app.get('/encounters/:encounterId/financial-summary', { preHandler: requirePermission('financial_account.read') }, async (request, reply) => {
    const params = encounterFinancialEncounterParamSchema.parse(request.params);
    const service = createEncounterFinancialService({ db: app.db, requestContext: request.requestContext });
    const summary = await service.getSummary(params.encounterId);
    if (!summary) return reply.status(404).send({ message: 'Encounter not found' });
    await appendSensitiveReadAudit({
      requestContext: request.requestContext,
      entityType: 'encounter',
      entityId: params.encounterId,
      action: 'financial.summary.read',
      reason: 'financial_summary_access'
    });
    return reply.send(summary);
  });

  app.post('/encounters/:encounterId/financial-close', { preHandler: requirePermission('financial_account.close') }, async (request, reply) => {
    const params = encounterFinancialEncounterParamSchema.parse(request.params);
    const body = closeEncounterFinancialBodySchema.parse(request.body ?? {});
    const service = createEncounterFinancialService({ db: app.db, requestContext: request.requestContext });
    const result = await service.close(params.encounterId, body);
    if (result.kind === 'encounter_not_found') return reply.status(404).send({ message: 'Encounter not found' });
    return reply.send(result.summary);
  });

  app.get('/financial/receivables', { preHandler: requirePermission('financial_account.read') }, async (request, reply) => {
    const query = listEncounterReceivablesQuerySchema.parse(request.query ?? {});
    const service = createEncounterFinancialService({ db: app.db, requestContext: request.requestContext });
    const result = await service.listReceivables(query);
    await appendSensitiveReadAudit({
      requestContext: request.requestContext,
      entityType: 'financial_receivable_list',
      entityId: query.encounterId ?? 'all',
      action: 'financial.receivables.read',
      reason: 'financial_receivables_access',
      afterJson: {
        count: result.data.length,
        encounterId: query.encounterId ?? null,
        status: query.status ?? null
      }
    });
    return reply.send(result);
  });

  app.post('/financial/receivables/:receivableId/settle', { preHandler: requirePermission('financial_account.close') }, async (request, reply) => {
    const params = encounterReceivableParamSchema.parse(request.params);
    const body = settleEncounterReceivableBodySchema.parse(request.body ?? {});
    const service = createEncounterFinancialService({ db: app.db, requestContext: request.requestContext });
    const result = await service.settleReceivable(params.receivableId, body);
    if (result.kind === 'receivable_not_found') return reply.status(404).send({ message: 'Receivable not found' });
    return reply.send(result.receivable);
  });
};

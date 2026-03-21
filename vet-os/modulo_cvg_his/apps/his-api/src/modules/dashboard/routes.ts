import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createDashboardRepo } from './repo.js';
import { reportCache } from '../../lib/cache.js';

const dateRangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

function getDefaultDateRange() {
  const now = new Date();
  const dateTo = now;
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  return { dateFrom, dateTo };
}

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // GET /dashboard - Full dashboard data
  app.get('/dashboard', {
    preHandler: requirePermission('reports.read'),
    schema: {
      tags: ['Dashboard'],
      summary: 'Executive dashboard',
      description: 'Get all KPIs for the executive dashboard'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const query = dateRangeSchema.parse(request.query);
    const { dateFrom, dateTo } = query.dateFrom && query.dateTo
      ? { dateFrom: query.dateFrom, dateTo: query.dateTo }
      : getDefaultDateRange();

    const cacheKey = `dashboard:${actor.accountId}:${dateFrom.toISOString().slice(0, 10)}:${dateTo.toISOString().slice(0, 10)}`;

    return reportCache.getOrSet(cacheKey, async () => {
      const repo = createDashboardRepo(app.db);

      const [appointments, appointmentsByDay, financial, revenueByDay, stock, cash, patients, exams, inpatient] = await Promise.all([
        repo.getAppointmentsKPIs(actor.accountId, dateFrom, dateTo),
        repo.getAppointmentsByDay(actor.accountId, dateFrom, dateTo),
        repo.getFinancialKPIs(actor.accountId, dateFrom, dateTo),
        repo.getRevenueByDay(actor.accountId, dateFrom, dateTo),
        repo.getStockKPIs(actor.accountId),
        repo.getCashKPIs(actor.accountId),
        repo.getPatientsKPIs(actor.accountId),
        repo.getExamsKPIs(actor.accountId, dateFrom, dateTo),
        repo.getInpatientKPIs(actor.accountId)
      ]);

      return {
        period: { dateFrom, dateTo },
        appointments,
        appointmentsByDay,
        financial,
        revenueByDay,
        stock,
        cash,
        patients,
        exams,
        inpatient,
        generatedAt: new Date().toISOString()
      };
    }, 60_000); // Cache for 1 minute
  });

  // GET /dashboard/appointments - Appointments only
  app.get('/dashboard/appointments', {
    preHandler: requirePermission('reports.read'),
    schema: { tags: ['Dashboard'], summary: 'Appointments KPIs' }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) return { error: 'Actor context required' };

    const query = dateRangeSchema.parse(request.query);
    const { dateFrom, dateTo } = query.dateFrom && query.dateTo
      ? { dateFrom: query.dateFrom, dateTo: query.dateTo }
      : getDefaultDateRange();

    const repo = createDashboardRepo(app.db);
    const [kpis, byDay] = await Promise.all([
      repo.getAppointmentsKPIs(actor.accountId, dateFrom, dateTo),
      repo.getAppointmentsByDay(actor.accountId, dateFrom, dateTo)
    ]);

    return { period: { dateFrom, dateTo }, kpis, byDay };
  });

  // GET /dashboard/financial - Financial only
  app.get('/dashboard/financial', {
    preHandler: requirePermission('financial_reports.read'),
    schema: { tags: ['Dashboard'], summary: 'Financial KPIs' }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) return { error: 'Actor context required' };

    const query = dateRangeSchema.parse(request.query);
    const { dateFrom, dateTo } = query.dateFrom && query.dateTo
      ? { dateFrom: query.dateFrom, dateTo: query.dateTo }
      : getDefaultDateRange();

    const repo = createDashboardRepo(app.db);
    const [kpis, revenueByDay] = await Promise.all([
      repo.getFinancialKPIs(actor.accountId, dateFrom, dateTo),
      repo.getRevenueByDay(actor.accountId, dateFrom, dateTo)
    ]);

    return { period: { dateFrom, dateTo }, kpis, revenueByDay };
  });

  // GET /dashboard/stock - Stock only
  app.get('/dashboard/stock', {
    preHandler: requirePermission('inventory.read'),
    schema: { tags: ['Dashboard'], summary: 'Stock KPIs' }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) return { error: 'Actor context required' };

    const repo = createDashboardRepo(app.db);
    return repo.getStockKPIs(actor.accountId);
  });
};

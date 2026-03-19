import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { reportCache } from '../../lib/cache.js';

// =====================
// Schemas
// =====================

const dateRangeSchema = z.object({
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date()
}).refine(v => v.dateTo >= v.dateFrom, 'dateTo must be >= dateFrom');

// =====================
// Routes
// =====================

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  /**
   * GET /reports/appointments-summary
   * Appointments summary by status and type for a date range
   */
  app.get(
    '/reports/appointments-summary',
    {
      preHandler: requirePermission('appointment.read'),
      schema: {
        tags: ['Reports'],
        summary: 'Appointments summary',
        description: 'Get appointments count by status and type for a date range'
      }
    },
    async (request, reply) => {
      const actor = request.requestContext.actor;
      if (!actor?.accountId) {
        return reply.status(401).send({ message: 'Actor context required.' });
      }

      const query = dateRangeSchema.parse(request.query);

      // Cache key includes account and date range
      const cacheKey = `appt-summary:${actor.accountId}:${query.dateFrom}:${query.dateTo}`;
      
      const data = await reportCache.getOrSet(cacheKey, async () => {
        const result = await app.db.$client.query(
          `SELECT
            status,
            type,
            COUNT(*) as count
          FROM appointments
          WHERE account_id = $1
            AND start_at >= $2
            AND start_at <= $3
          GROUP BY status, type
          ORDER BY status, type`,
          [actor.accountId, query.dateFrom, query.dateTo]
        );

        return result.rows.map(r => ({
          status: r.status,
          type: r.type,
          count: parseInt(r.count, 10)
        }));
      }, 120_000); // Cache for 2 minutes

      return {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        data
      };
    }
  );

  /**
   * GET /reports/exams-pending
   * List of pending exam orders (not completed/cancelled)
   */
  app.get(
    '/reports/exams-pending',
    {
      preHandler: requirePermission('appointment.read'),
      schema: {
        tags: ['Reports'],
        summary: 'Pending exams',
        description: 'List of exam orders not yet completed or cancelled, ordered by priority'
      }
    },
    async (request, reply) => {
      const actor = request.requestContext.actor;
      if (!actor?.accountId) {
        return reply.status(401).send({ message: 'Actor context required.' });
      }

      const result = await app.db.$client.query(
        `SELECT
          eo.id,
          eo.exam_name,
          eo.category,
          eo.priority,
          eo.status,
          eo.requested_at,
          p.name as patient_name,
          u.full_name as requested_by_name
        FROM exam_orders eo
        LEFT JOIN patients p ON p.id = eo.patient_id
        LEFT JOIN users u ON u.id = eo.requested_by_user_id
        WHERE eo.account_id = $1
          AND eo.status NOT IN ('completed', 'cancelled')
        ORDER BY
          CASE eo.priority
            WHEN 'stat' THEN 0
            WHEN 'urgent' THEN 1
            ELSE 2
          END,
          eo.requested_at ASC`,
        [actor.accountId]
      );

      return {
        total: result.rows.length,
        data: result.rows
      };
    }
  );

  /**
   * GET /reports/exams-summary
   * Exams summary by status and category for a date range
   */
  app.get(
    '/reports/exams-summary',
    { preHandler: requirePermission('appointment.read') },
    async (request, reply) => {
      const actor = request.requestContext.actor;
      if (!actor?.accountId) {
        return reply.status(401).send({ message: 'Actor context required.' });
      }

      const query = dateRangeSchema.parse(request.query);

      const result = await app.db.$client.query(
        `SELECT
          status,
          category,
          priority,
          COUNT(*) as count
        FROM exam_orders
        WHERE account_id = $1
          AND requested_at >= $2
          AND requested_at <= $3
        GROUP BY status, category, priority
        ORDER BY status, category, priority`,
        [actor.accountId, query.dateFrom, query.dateTo]
      );

      return {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        data: result.rows.map(r => ({
          status: r.status,
          category: r.category,
          priority: r.priority,
          count: parseInt(r.count, 10)
        }))
      };
    }
  );

  /**
   * GET /reports/financial-summary
   * Financial accounts summary by status
   */
  app.get(
    '/reports/financial-summary',
    { preHandler: requirePermission('financial_account.read') },
    async (request, reply) => {
      const actor = request.requestContext.actor;
      if (!actor?.accountId) {
        return reply.status(401).send({ message: 'Actor context required.' });
      }

      const query = dateRangeSchema.parse(request.query);

      const result = await app.db.$client.query(
        `SELECT
          financial_status as status,
          COUNT(*) as count,
          COALESCE(SUM(total_snapshot), 0) as total_amount
        FROM encounter_financial_accounts
        WHERE account_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY financial_status
        ORDER BY financial_status`,
        [actor.accountId, query.dateFrom, query.dateTo]
      );

      return {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        data: result.rows.map(r => ({
          status: r.status,
          count: parseInt(r.count, 10),
          totalAmount: parseFloat(r.total_amount)
        }))
      };
    }
  );
};

import type { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createAppointmentsRepo } from '../appointments/repo.js';
import { createExamOrdersRepo } from '../exams/repo.js';
import { append } from '@cvg-his/audit';
import { startEncounterFromAppointmentBodySchema, createExamOrderFromEncounterBodySchema } from './types.js';
import type { RequestContext } from '../../plugins/requestContext.js';

function actor(ctx: RequestContext) {
  const a = ctx.actor;
  if (!a?.accountId) throw new Error('Actor context required.');
  return a;
}

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  // POST /appointments/:id/start-encounter - Create encounter from appointment
  app.post(
    '/appointments/:id/start-encounter',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const a = actor(request.requestContext);
      const params = request.params as { id: string };
      const body = startEncounterFromAppointmentBodySchema.parse(request.body ?? {});

      // Get appointment
      const appointmentsRepo = createAppointmentsRepo(app.db);
      const appointment = await appointmentsRepo.findById(a.accountId, params.id);

      if (!appointment) {
        return reply.status(404).send({ message: 'Appointment not found' });
      }

      if (appointment.status === 'cancelled' || appointment.status === 'completed') {
        return reply.status(409).send({ message: 'Cannot start encounter from cancelled or completed appointment' });
      }

      // Create encounter
      const encounterResult = await app.db.$client.query(
        `insert into encounters (account_id, patient_id, owner_id, reason, opened_by_user_id, opened_at)
         values ($1, $2, $3, $4, $5, now())
         returning *`,
        [a.accountId, appointment.patientId, appointment.ownerId, body.reason ?? `Atendimento via agendamento (${appointment.type})`, a.userId]
      );

      if (encounterResult.rows.length === 0) {
        return reply.status(500).send({ message: 'Failed to create encounter' });
      }

      const encounter = encounterResult.rows[0];

      // Update appointment status to in_progress
      await appointmentsRepo.updateById(a.accountId, params.id, { status: 'in_progress' });

      // Link appointment to encounter via notes
      await app.db.$client.query(
        `update appointments set notes = coalesce(notes, '') || $1, updated_at = now() where id = $2 and account_id = $3`,
        [`\n[Encounter: ${encounter.id}]`, params.id, a.accountId]
      );

      // Audit
      await append({
        accountId: a.accountId, actorUserId: a.userId, roles: a.roles,
        entityType: 'encounter', entityId: encounter.id, action: 'encounter.createFromAppointment',
        beforeJson: { appointmentId: params.id }, afterJson: encounter, requestId: request.requestContext.requestId
      });

      return reply.status(201).send({ encounterId: encounter.id, appointmentId: params.id });
    }
  );

  // POST /encounters/:id/exam-orders - Create exam order from encounter
  app.post(
    '/encounters/:id/exam-orders',
    { preHandler: requirePermission('appointment.write') },
    async (request, reply) => {
      const a = actor(request.requestContext);
      const params = request.params as { id: string };
      const body = createExamOrderFromEncounterBodySchema.parse(request.body);

      // Verify encounter exists
      const encounterResult = await app.db.$client.query(
        'select * from encounters where id = $1 and account_id = $2 limit 1',
        [params.id, a.accountId]
      );

      if (encounterResult.rows.length === 0) {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      const encounter = encounterResult.rows[0];
      if (encounter.status !== 'open') {
        return reply.status(409).send({ message: 'Cannot add exam orders to a closed encounter' });
      }

      // Create exam order
      const examOrdersRepo = createExamOrdersRepo(app.db);
      const created = await examOrdersRepo.create({
        accountId: a.accountId,
        patientId: body.patientId,
        encounterId: params.id,
        requestedByUserId: a.userId,
        category: body.category ?? 'laboratory',
        examName: body.examName,
        examCode: body.examCode,
        priority: body.priority,
        notes: body.notes
      });

      await append({
        accountId: a.accountId, actorUserId: a.userId, roles: a.roles,
        entityType: 'examOrder', entityId: created.id, action: 'examOrder.createFromEncounter',
        beforeJson: { encounterId: params.id }, afterJson: created, requestId: request.requestContext.requestId
      });

      return reply.status(201).send(created);
    }
  );

  // GET /encounters/:id/summary - Integrated summary
  app.get(
    '/encounters/:id/summary',
    { preHandler: requirePermission('encounter.read') },
    async (request, reply) => {
      const a = actor(request.requestContext);
      const params = request.params as { id: string };

      // Get encounter with patient/owner info
      const encounterResult = await app.db.$client.query(
        `select e.*, p.name as patient_name, o.full_name as owner_name
         from encounters e
         join patients p on p.id = e.patient_id
         join owners o on o.id = e.owner_id
         where e.id = $1 and e.account_id = $2 limit 1`,
        [params.id, a.accountId]
      );

      if (encounterResult.rows.length === 0) {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      const enc = encounterResult.rows[0];

      // Get billing summary
      const billingResult = await app.db.$client.query(
        `select count(*)::int as item_count,
                coalesce(sum(line_total), 0)::float as subtotal,
                coalesce(sum(line_total - discount_amount), 0)::float as total
         from encounter_billing_items where encounter_id = $1 and account_id = $2`,
        [params.id, a.accountId]
      );

      // Get financial summary
      const financialResult = await app.db.$client.query(
        `select financial_status, paid_amount, balance_due, closed_at is not null as closed
         from encounter_financial_accounts where encounter_id = $1 and account_id = $2 limit 1`,
        [params.id, a.accountId]
      );

      // Get exam orders
      const examOrdersResult = await app.db.$client.query(
        `select id, exam_name, status, category from exam_orders where encounter_id = $1 and account_id = $2 order by requested_at desc`,
        [params.id, a.accountId]
      );

      // Get linked appointment (via notes pattern)
      const appointmentResult = await app.db.$client.query(
        `select id, type, status, start_at from appointments where account_id = $1 and patient_id = $2 and notes ilike $3 limit 1`,
        [a.accountId, enc.patient_id, `%${params.id}%`]
      );

      const billing = billingResult.rows[0];
      const financial = financialResult.rows[0];
      const appt = appointmentResult.rows[0];

      return reply.send({
        encounter: {
          id: enc.id,
          patientId: enc.patient_id,
          patientName: enc.patient_name,
          ownerId: enc.owner_id,
          ownerName: enc.owner_name,
          status: enc.status,
          reason: enc.reason,
          openedAt: enc.opened_at
        },
        appointment: appt ? {
          id: appt.id,
          type: appt.type,
          status: appt.status,
          startAt: appt.start_at
        } : null,
        billing: billing ? {
          itemCount: billing.item_count,
          subtotal: billing.subtotal,
          total: billing.total
        } : null,
        financial: financial ? {
          status: financial.financial_status,
          paidAmount: financial.paid_amount,
          balanceDue: financial.balance_due,
          closed: financial.closed
        } : null,
        examOrders: examOrdersResult.rows.map((r: any) => ({
          id: r.id,
          examName: r.exam_name,
          status: r.status,
          category: r.category
        }))
      });
    }
  );
};

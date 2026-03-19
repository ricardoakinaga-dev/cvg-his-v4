import type { FastifyPluginAsync } from 'fastify';
import { MedicationAdministrationCreateSchemaBase, MedicationAdministrationCreateSchema, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createMedicationAdministrationsService } from './service.js';

const listMedicationAdministrationsQuerySchema = z.object({
  stayId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

/**
 * Schema for patient visual confirmation during medication administration
 * This ensures the clinician has verified the patient identity before administering
 */
const patientConfirmationSchema = z.object({
  patientId: z.string().uuid(),
  confirmedByName: z.string().min(1, 'Patient name confirmation is required'),
  confirmedBySpecies: z.string().min(1, 'Patient species confirmation is required')
});

const medicationAdministrationWithConfirmationSchema = MedicationAdministrationCreateSchemaBase.extend({
  patientConfirmation: patientConfirmationSchema.optional()
}).superRefine((payload, ctx) => {
  const result = MedicationAdministrationCreateSchema.safeParse(payload);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue(issue);
    }
  }
});

type MedicationAdministrationWithConfirmation = z.infer<typeof medicationAdministrationWithConfirmationSchema>;

export const medicationAdministrationsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('medadmin.write')
    },
    async (request, reply) => {
      const payload = (request.body ?? {}) as Record<string, unknown>;

      if (payload.status === 'administered' && !payload.effectiveAt) {
        payload.effectiveAt = new Date().toISOString();
      }

      const body = parseOrThrow422(medicationAdministrationWithConfirmationSchema, payload) as MedicationAdministrationWithConfirmation;
      const service = createMedicationAdministrationsService({
        db: app.db,
        requestContext: request.requestContext
      });

      // Validate patient confirmation for administer/refuse/delay actions
      if (['administered', 'refused', 'delayed'].includes(body.status)) {
        if (!body.patientConfirmation) {
          return reply.status(422).send({ 
            message: 'Patient confirmation is required for administer, refuse, and delay actions',
            code: 'PATIENT_CONFIRMATION_REQUIRED'
          });
        }
      }

      const result = await service.record(body, body.patientConfirmation);

      if (result.kind === 'order_not_found') {
        return reply.status(404).send({ message: 'Medication order not found' });
      }

      if (result.kind === 'order_not_active') {
        return reply.status(409).send({ message: 'Medication order is not active' });
      }

      if (result.kind === 'stay_mismatch') {
        return reply.status(422).send({ message: 'stayId does not match medication order stay' });
      }

      if (result.kind === 'encounter_mismatch') {
        return reply.status(422).send({ message: 'encounterId does not match medication order encounter' });
      }

      if (result.kind === 'already_recorded') {
        return reply.status(409).send({ message: 'Already recorded for this order and slot' });
      }

      if (result.kind === 'invalid_reason') {
        return reply.status(422).send({ message: 'Invalid reason for medication administration status' });
      }

      if (result.kind === 'patient_mismatch') {
        return reply.status(422).send({ 
          message: 'Patient confirmation does not match the patient associated with this order',
          code: 'PATIENT_MISMATCH'
        });
      }

      return reply.send(result.administration);
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('medadmin.read')
    },
    async (request) => {
      const query = listMedicationAdministrationsQuerySchema.parse(request.query);
      const service = createMedicationAdministrationsService({
        db: app.db,
        requestContext: request.requestContext
      });
      return service.list(query);
    }
  );
};

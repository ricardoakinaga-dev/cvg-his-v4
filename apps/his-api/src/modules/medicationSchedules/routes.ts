import type { FastifyPluginAsync } from 'fastify';
import {
  MedicationScheduleCreateSchemaBase,
  MedicationScheduleUpdateSchema,
  type MedicationScheduleCreateDto,
  type MedicationScheduleUpdateDto,
  parseOrThrow422
} from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createMedicationSchedulesService } from './service.js';

const medicationOrderIdParamSchema = z.object({
  id: z.string().uuid()
});

const scheduleCreateBodySchema = MedicationScheduleCreateSchemaBase.omit({
  orderId: true
});

export const medicationSchedulesRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/:id/schedule',
    {
      preHandler: requirePermission('medorder.write')
    },
    async (request, reply) => {
      const params = medicationOrderIdParamSchema.parse(request.params);
      const body = parseOrThrow422(scheduleCreateBodySchema, request.body) as Omit<MedicationScheduleCreateDto, 'orderId'>;
      const service = createMedicationSchedulesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(params.id, body);

      if (result.kind === 'order_not_found') {
        return reply.status(404).send({ message: 'Medication order not found' });
      }

      if (result.kind === 'order_stopped') {
        return reply.status(409).send({ message: 'Medication order is stopped' });
      }

      if (result.kind === 'schedule_already_exists') {
        return reply.status(409).send({ message: 'Medication schedule already exists for this order' });
      }

      if (result.kind === 'invalid_schedule') {
        if (result.reason === 'interval_minutes_required') {
          return reply.status(422).send({ message: 'intervalMinutes is required for interval schedule' });
        }

        return reply.status(422).send({ message: 'times[] is required for fixed_times schedule' });
      }

      return reply.status(201).send(result.schedule);
    }
  );

  app.patch(
    '/:id/schedule',
    {
      preHandler: requirePermission('medorder.write')
    },
    async (request, reply) => {
      const params = medicationOrderIdParamSchema.parse(request.params);
      const body = parseOrThrow422(MedicationScheduleUpdateSchema, request.body) as MedicationScheduleUpdateDto;
      const service = createMedicationSchedulesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, body);

      if (result.kind === 'order_not_found') {
        return reply.status(404).send({ message: 'Medication order not found' });
      }

      if (result.kind === 'order_stopped') {
        return reply.status(409).send({ message: 'Medication order is stopped' });
      }

      if (result.kind === 'schedule_not_found') {
        return reply.status(404).send({ message: 'Medication schedule not found for this order' });
      }

      if (result.kind === 'invalid_schedule') {
        if (result.reason === 'interval_minutes_required') {
          return reply.status(422).send({ message: 'intervalMinutes is required for interval schedule' });
        }

        return reply.status(422).send({ message: 'times[] is required for fixed_times schedule' });
      }

      return reply.send(result.schedule);
    }
  );
};

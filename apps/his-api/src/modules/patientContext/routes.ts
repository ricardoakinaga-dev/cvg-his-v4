import type { FastifyPluginAsync } from 'fastify';
import { requirePermission } from '../../middlewares/requirePermission.js';
import { createPatientContextService, getAccountIdFromRequest } from './service.js';
import { patientContextParamsSchema, stayContextParamsSchema } from './types.js';

/**
 * Patient Context Routes
 * 
 * Provides endpoints for the Patient Context system that delivers
 * unified patient information across MAR, Notes, and Orders modules.
 */
export const patientContextRoutes: FastifyPluginAsync = async (app) => {
  const service = createPatientContextService(app.db);

  /**
   * GET /patient-context/by-patient/:patientId
   * Get full patient context by patient ID
   */
  app.get(
    '/by-patient/:patientId',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request, reply) => {
      const params = patientContextParamsSchema.parse(request.params);
      const accountId = getAccountIdFromRequest(request);
      
      const context = await service.getPatientContext(accountId, params.patientId);
      
      if (!context) {
        return reply.status(404).send({ 
          message: 'Patient not found',
          code: 'PATIENT_NOT_FOUND'
        });
      }

      return reply.send(context);
    }
  );

  /**
   * GET /patient-context/by-stay/:stayId
   * Get full patient context by inpatient stay ID
   */
  app.get(
    '/by-stay/:stayId',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request, reply) => {
      const params = stayContextParamsSchema.parse(request.params);
      const accountId = getAccountIdFromRequest(request);
      
      const context = await service.getPatientContextByStay(accountId, params.stayId);
      
      if (!context) {
        return reply.status(404).send({ 
          message: 'Stay not found',
          code: 'STAY_NOT_FOUND'
        });
      }

      return reply.send(context);
    }
  );

  /**
   * GET /patient-context/:patientId/info
   * Get just the patient info (lighter weight endpoint)
   */
  app.get(
    '/:patientId/info',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request, reply) => {
      const params = patientContextParamsSchema.parse(request.params);
      const accountId = getAccountIdFromRequest(request);
      
      const patient = await service.getPatientInfo(accountId, params.patientId);
      
      if (!patient) {
        return reply.status(404).send({ 
          message: 'Patient not found',
          code: 'PATIENT_NOT_FOUND'
        });
      }

      return reply.send(patient);
    }
  );

  /**
   * GET /patient-context/stay/:stayId
   * Get stay info by stay ID
   */
  app.get(
    '/stay/:stayId',
    {
      preHandler: requirePermission('patient.read')
    },
    async (request, reply) => {
      const params = stayContextParamsSchema.parse(request.params);
      const accountId = getAccountIdFromRequest(request);
      
      const stay = await service.getStayInfo(accountId, params.stayId);
      
      if (!stay) {
        return reply.status(404).send({ 
          message: 'Stay not found',
          code: 'STAY_NOT_FOUND'
        });
      }

      return reply.send(stay);
    }
  );
};

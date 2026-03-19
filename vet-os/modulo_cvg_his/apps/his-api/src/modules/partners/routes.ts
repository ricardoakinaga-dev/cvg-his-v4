import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createPartnersRepo } from './repo.js';
import {
  PartnerCreateSchema,
  PartnerUpdateSchema,
  PartnerPatientCreateSchema,
  PartnersQuerySchema
} from '@cvg-his/contracts';

export const partnersRoutes: FastifyPluginAsync = async (app) => {
  // =====================
  // Partners
  // =====================

  // POST /partners - Criar parceiro
  app.post('/partners', {
    preHandler: requirePermission('partner.write'),
    schema: {
      tags: ['Partners'],
      summary: 'Criar parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const body = PartnerCreateSchema.parse(request.body);
    const repo = createPartnersRepo(app.db as any);
    
    const partner = await repo.create({
      ...body,
      accountId: actor.accountId,
      createdByUserId: actor.userId
    });

    return partner;
  });

  // GET /partners - Listar parceiros
  app.get('/partners', {
    preHandler: requirePermission('partner.read'),
    schema: {
      tags: ['Partners'],
      summary: 'Listar parceiros'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const query = PartnersQuerySchema.parse(request.query);
    const repo = createPartnersRepo(app.db as any);
    
    const { partners, total } = await repo.list(actor.accountId, query);

    return {
      data: partners,
      total,
      page: query.page,
      pageSize: query.pageSize
    };
  });

  // GET /partners/:id - Detalhe do parceiro
  app.get('/partners/:id', {
    preHandler: requirePermission('partner.read'),
    schema: {
      tags: ['Partners'],
      summary: 'Obter parceiro por ID'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id } = request.params as { id: string };
    const repo = createPartnersRepo(app.db as any);
    
    const partner = await repo.getById(actor.accountId, id);
    if (!partner) {
      return reply.status(404).send({ error: 'Partner not found' });
    }

    return partner;
  });

  // PATCH /partners/:id - Atualizar parceiro
  app.patch('/partners/:id', {
    preHandler: requirePermission('partner.write'),
    schema: {
      tags: ['Partners'],
      summary: 'Atualizar parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id } = request.params as { id: string };
    const body = PartnerUpdateSchema.parse(request.body);
    const repo = createPartnersRepo(app.db as any);
    
    const partner = await repo.update(actor.accountId, id, body);
    if (!partner) {
      return reply.status(404).send({ error: 'Partner not found' });
    }

    return partner;
  });

  // DELETE /partners/:id - Deletar parceiro
  app.delete('/partners/:id', {
    preHandler: requirePermission('partner.write'),
    schema: {
      tags: ['Partners'],
      summary: 'Deletar parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id } = request.params as { id: string };
    const repo = createPartnersRepo(app.db as any);
    
    const deleted = await repo.delete(actor.accountId, id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Partner not found' });
    }

    return { success: true };
  });

  // =====================
  // Partner Patients
  // =====================

  // POST /partners/:id/patients - Vincular paciente ao parceiro
  app.post('/partners/:id/patients', {
    preHandler: requirePermission('partner.write'),
    schema: {
      tags: ['Partners'],
      summary: 'Vincular paciente ao parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id } = request.params as { id: string };
    const body = PartnerPatientCreateSchema.parse(request.body);
    const repo = createPartnersRepo(app.db as any);
    
    const partnerPatient = await repo.addPatientToPartner(id, actor.accountId, {
      ...body,
      createdByUserId: actor.userId
    });

    return partnerPatient;
  });

  // GET /partners/:id/patients - Listar pacientes do parceiro
  app.get('/partners/:id/patients', {
    preHandler: requirePermission('partner.read'),
    schema: {
      tags: ['Partners'],
      summary: 'Listar pacientes do parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id } = request.params as { id: string };
    const repo = createPartnersRepo(app.db as any);
    
    const patients = await repo.listPartnerPatients(actor.accountId, id);

    return { data: patients };
  });

  // DELETE /partners/:id/patients/:patientId - Remover paciente do parceiro
  app.delete('/partners/:id/patients/:patientId', {
    preHandler: requirePermission('partner.write'),
    schema: {
      tags: ['Partners'],
      summary: 'Remover paciente do parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id, patientId } = request.params as { id: string; patientId: string };
    const repo = createPartnersRepo(app.db as any);
    
    const deleted = await repo.removePatientFromPartner(actor.accountId, id, patientId);
    if (!deleted) {
      return reply.status(404).send({ error: 'Patient not found in partner' });
    }

    return { success: true };
  });

  // =====================
  // Reports
  // =====================

  // GET /partners/:id/stats - Estatísticas do parceiro
  app.get('/partners/:id/stats', {
    preHandler: requirePermission('partner.read'),
    schema: {
      tags: ['Partners'],
      summary: 'Estatísticas do parceiro'
    }
  }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return reply.status(400).send({ error: 'Actor context required' });
    }

    const { id } = request.params as { id: string };
    const repo = createPartnersRepo(app.db as any);
    
    const stats = await repo.getPartnerStats(actor.accountId, id);

    return stats;
  });
};

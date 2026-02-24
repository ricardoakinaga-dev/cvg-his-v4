import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import {
  createOwnerContactsRepo,
  createOwnerAddressesRepo,
  createOwnerDocumentsRepo,
  createOwnerAlertsRepo,
  createPatientAlertsRepo,
  createPatientVaccinesRepo,
  createPatientAllergiesRepo,
  createTagsRepo,
  createSearchRepo
} from './repo.js';
import {
  createOwnerContactSchema,
  createOwnerAddressSchema,
  createOwnerDocumentSchema,
  createOwnerAlertSchema,
  updateOwnerContactSchema,
  updateOwnerAddressSchema,
  updateOwnerDocumentSchema,
  updateOwnerAlertSchema,
  ownerContactResponseSchema,
  ownerAddressResponseSchema,
  ownerDocumentResponseSchema,
  ownerAlertResponseSchema,
  createPatientAlertSchema,
  createPatientVaccineSchema,
  createPatientAllergySchema,
  updatePatientAlertSchema,
  updatePatientVaccineSchema,
  updatePatientAllergySchema,
  patientAlertResponseSchema,
  patientVaccineResponseSchema,
  patientAllergyResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  createTagSchema,
  tagResponseSchema
} from './types.js';

const ownerIdParamSchema = {
  type: 'object',
  properties: {
    ownerId: { type: 'string', format: 'uuid' }
  },
  required: ['ownerId']
};

const patientIdParamSchema = {
  type: 'object',
  properties: {
    patientId: { type: 'string', format: 'uuid' }
  },
  required: ['patientId']
};

const idParamSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
};

export const generalRoutes: FastifyPluginAsync = async (app) => {
  // ============================================
  // SEARCH
  // ============================================
  app.get('/search', {
    preHandler: requirePermission('geral.search')
  }, async (request) => {
    const query = searchQuerySchema.parse(request.query);
    const actor = request.requestContext.actor!;
    const searchRepo = createSearchRepo(app.db);
    const results = await searchRepo.search(actor.accountId, query.q, query.limit);
    return searchResponseSchema.parse(results);
  });

  // ============================================
  // OWNER CONTACTS
  // ============================================
  app.post('/owners/:ownerId/contacts', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string };
    const body = createOwnerContactSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerContactsRepo(app.db);
    const created = await repo.create(actor.accountId, params.ownerId, body);
    return reply.status(201).send(ownerContactResponseSchema.parse({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }));
  });

  app.get('/owners/:ownerId/contacts', {
    preHandler: requirePermission('geral.clientes.read')
  }, async (request) => {
    const params = request.params as { ownerId: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerContactsRepo(app.db);
    const contacts = await repo.findByOwner(actor.accountId, params.ownerId);
    return contacts.map(c => ownerContactResponseSchema.parse({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString()
    }));
  });

  app.patch('/owners/:ownerId/contacts/:id', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const body = updateOwnerContactSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerContactsRepo(app.db);
    const updated = await repo.update(actor.accountId, params.id, body);
    if (!updated) return reply.status(404).send({ message: 'Contact not found' });
    return ownerContactResponseSchema.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  });

  app.delete('/owners/:ownerId/contacts/:id', {
    preHandler: requirePermission('geral.clientes.delete')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerContactsRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Contact not found' });
    return reply.status(204).send();
  });

  // ============================================
  // OWNER ADDRESSES
  // ============================================
  app.post('/owners/:ownerId/addresses', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string };
    const body = createOwnerAddressSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerAddressesRepo(app.db);
    const created = await repo.create(actor.accountId, params.ownerId, body);
    return reply.status(201).send(ownerAddressResponseSchema.parse({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }));
  });

  app.get('/owners/:ownerId/addresses', {
    preHandler: requirePermission('geral.clientes.read')
  }, async (request) => {
    const params = request.params as { ownerId: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerAddressesRepo(app.db);
    const addresses = await repo.findByOwner(actor.accountId, params.ownerId);
    return addresses.map(a => ownerAddressResponseSchema.parse({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString()
    }));
  });

  app.patch('/owners/:ownerId/addresses/:id', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const body = updateOwnerAddressSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerAddressesRepo(app.db);
    const updated = await repo.update(actor.accountId, params.id, body);
    if (!updated) return reply.status(404).send({ message: 'Address not found' });
    return ownerAddressResponseSchema.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  });

  app.delete('/owners/:ownerId/addresses/:id', {
    preHandler: requirePermission('geral.clientes.delete')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerAddressesRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Address not found' });
    return reply.status(204).send();
  });

  // ============================================
  // OWNER DOCUMENTS
  // ============================================
  app.post('/owners/:ownerId/documents', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string };
    const body = createOwnerDocumentSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerDocumentsRepo(app.db);
    const created = await repo.create(actor.accountId, params.ownerId, {
      ...body,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined
    });
    return reply.status(201).send(ownerDocumentResponseSchema.parse({
      ...created,
      issueDate: created.issueDate?.toISOString() ?? null,
      expiryDate: created.expiryDate?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }));
  });

  app.get('/owners/:ownerId/documents', {
    preHandler: requirePermission('geral.clientes.read')
  }, async (request) => {
    const params = request.params as { ownerId: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerDocumentsRepo(app.db);
    const documents = await repo.findByOwner(actor.accountId, params.ownerId);
    return documents.map(d => ownerDocumentResponseSchema.parse({
      ...d,
      issueDate: d.issueDate?.toISOString() ?? null,
      expiryDate: d.expiryDate?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString()
    }));
  });

  app.patch('/owners/:ownerId/documents/:id', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const body = updateOwnerDocumentSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerDocumentsRepo(app.db);
    const updated = await repo.update(actor.accountId, params.id, {
      ...body,
      issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined
    });
    if (!updated) return reply.status(404).send({ message: 'Document not found' });
    return ownerDocumentResponseSchema.parse({
      ...updated,
      issueDate: updated.issueDate?.toISOString() ?? null,
      expiryDate: updated.expiryDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  });

  app.delete('/owners/:ownerId/documents/:id', {
    preHandler: requirePermission('geral.clientes.delete')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerDocumentsRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Document not found' });
    return reply.status(204).send();
  });

  // ============================================
  // OWNER ALERTS
  // ============================================
  app.post('/owners/:ownerId/alerts', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string };
    const body = createOwnerAlertSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerAlertsRepo(app.db);
    const created = await repo.create(actor.accountId, params.ownerId, {
      ...body,
      createdByUserId: actor.userId
    });
    return reply.status(201).send(ownerAlertResponseSchema.parse({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      resolvedAt: created.resolvedAt?.toISOString() ?? null
    }));
  });

  app.get('/owners/:ownerId/alerts', {
    preHandler: requirePermission('geral.clientes.read')
  }, async (request) => {
    const params = request.params as { ownerId: string };
    const query = request.query as { active?: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerAlertsRepo(app.db);
    const alerts = await repo.findByOwner(actor.accountId, params.ownerId, query.active === 'true');
    return alerts.map(a => ownerAlertResponseSchema.parse({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null
    }));
  });

  app.patch('/owners/:ownerId/alerts/:id', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const body = updateOwnerAlertSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createOwnerAlertsRepo(app.db);
    const updated = await repo.update(actor.accountId, params.id, body);
    if (!updated) return reply.status(404).send({ message: 'Alert not found' });
    return ownerAlertResponseSchema.parse({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      resolvedAt: updated.resolvedAt?.toISOString() ?? null
    });
  });

  app.post('/owners/:ownerId/alerts/:id/resolve', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const actor = request.requestContext.actor!;
    if (!actor.userId) return reply.status(401).send({ message: 'User ID required' });
    const repo = createOwnerAlertsRepo(app.db);
    const resolved = await repo.resolve(actor.accountId, params.id, actor.userId);
    if (!resolved) return reply.status(404).send({ message: 'Alert not found' });
    return ownerAlertResponseSchema.parse({
      ...resolved,
      createdAt: resolved.createdAt.toISOString(),
      updatedAt: resolved.updatedAt.toISOString(),
      resolvedAt: resolved.resolvedAt?.toISOString() ?? null
    });
  });

  app.delete('/owners/:ownerId/alerts/:id', {
    preHandler: requirePermission('geral.clientes.delete')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createOwnerAlertsRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Alert not found' });
    return reply.status(204).send();
  });

  // ============================================
  // PATIENT ALERTS
  // ============================================
  app.post('/patients/:patientId/alerts', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string };
    const body = createPatientAlertSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createPatientAlertsRepo(app.db);
    const created = await repo.create(actor.accountId, params.patientId, {
      ...body,
      createdByUserId: actor.userId
    });
    return reply.status(201).send(patientAlertResponseSchema.parse({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      resolvedAt: created.resolvedAt?.toISOString() ?? null
    }));
  });

  app.get('/patients/:patientId/alerts', {
    preHandler: requirePermission('geral.animais.read')
  }, async (request) => {
    const params = request.params as { patientId: string };
    const query = request.query as { active?: string };
    const actor = request.requestContext.actor!;
    const repo = createPatientAlertsRepo(app.db);
    const alerts = await repo.findByPatient(actor.accountId, params.patientId, query.active === 'true');
    return alerts.map(a => patientAlertResponseSchema.parse({
      ...a,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null
    }));
  });

  app.post('/patients/:patientId/alerts/:id/resolve', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; id: string };
    const actor = request.requestContext.actor!;
    if (!actor.userId) return reply.status(401).send({ message: 'User ID required' });
    const repo = createPatientAlertsRepo(app.db);
    const resolved = await repo.resolve(actor.accountId, params.id, actor.userId);
    if (!resolved) return reply.status(404).send({ message: 'Alert not found' });
    return patientAlertResponseSchema.parse({
      ...resolved,
      createdAt: resolved.createdAt.toISOString(),
      updatedAt: resolved.updatedAt.toISOString(),
      resolvedAt: resolved.resolvedAt?.toISOString() ?? null
    });
  });

  app.delete('/patients/:patientId/alerts/:id', {
    preHandler: requirePermission('geral.animais.delete')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createPatientAlertsRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Alert not found' });
    return reply.status(204).send();
  });

  // ============================================
  // PATIENT VACCINES
  // ============================================
  app.post('/patients/:patientId/vaccines', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string };
    const body = createPatientVaccineSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createPatientVaccinesRepo(app.db);
    const created = await repo.create(actor.accountId, params.patientId, {
      ...body,
      administrationDate: new Date(body.administrationDate),
      nextDoseDate: body.nextDoseDate ? new Date(body.nextDoseDate) : undefined
    });
    return reply.status(201).send(patientVaccineResponseSchema.parse({
      ...created,
      administrationDate: created.administrationDate.toISOString(),
      nextDoseDate: created.nextDoseDate?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }));
  });

  app.get('/patients/:patientId/vaccines', {
    preHandler: requirePermission('geral.animais.read')
  }, async (request) => {
    const params = request.params as { patientId: string };
    const actor = request.requestContext.actor!;
    const repo = createPatientVaccinesRepo(app.db);
    const vaccines = await repo.findByPatient(actor.accountId, params.patientId);
    return vaccines.map(v => patientVaccineResponseSchema.parse({
      ...v,
      administrationDate: v.administrationDate.toISOString(),
      nextDoseDate: v.nextDoseDate?.toISOString() ?? null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString()
    }));
  });

  app.patch('/patients/:patientId/vaccines/:id', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; id: string };
    const body = updatePatientVaccineSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createPatientVaccinesRepo(app.db);
    const updated = await repo.update(actor.accountId, params.id, {
      ...body,
      administrationDate: body.administrationDate ? new Date(body.administrationDate) : undefined,
      nextDoseDate: body.nextDoseDate ? new Date(body.nextDoseDate) : undefined
    });
    if (!updated) return reply.status(404).send({ message: 'Vaccine record not found' });
    return patientVaccineResponseSchema.parse({
      ...updated,
      administrationDate: updated.administrationDate.toISOString(),
      nextDoseDate: updated.nextDoseDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  });

  app.delete('/patients/:patientId/vaccines/:id', {
    preHandler: requirePermission('geral.animais.delete')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createPatientVaccinesRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Vaccine record not found' });
    return reply.status(204).send();
  });

  // ============================================
  // PATIENT ALLERGIES
  // ============================================
  app.post('/patients/:patientId/allergies', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string };
    const body = createPatientAllergySchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createPatientAllergiesRepo(app.db);
    const created = await repo.create(actor.accountId, params.patientId, {
      ...body,
      diagnosedDate: body.diagnosedDate ? new Date(body.diagnosedDate) : undefined,
      isActive: body.isActive ?? true
    });
    return reply.status(201).send(patientAllergyResponseSchema.parse({
      ...created,
      diagnosedDate: created.diagnosedDate?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }));
  });

  app.get('/patients/:patientId/allergies', {
    preHandler: requirePermission('geral.animais.read')
  }, async (request) => {
    const params = request.params as { patientId: string };
    const query = request.query as { active?: string };
    const actor = request.requestContext.actor!;
    const repo = createPatientAllergiesRepo(app.db);
    const allergies = await repo.findByPatient(actor.accountId, params.patientId, query.active === 'true');
    return allergies.map(a => patientAllergyResponseSchema.parse({
      ...a,
      diagnosedDate: a.diagnosedDate?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString()
    }));
  });

  app.patch('/patients/:patientId/allergies/:id', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; id: string };
    const body = updatePatientAllergySchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createPatientAllergiesRepo(app.db);
    const updated = await repo.update(actor.accountId, params.id, {
      ...body,
      diagnosedDate: body.diagnosedDate ? new Date(body.diagnosedDate) : undefined
    });
    if (!updated) return reply.status(404).send({ message: 'Allergy record not found' });
    return patientAllergyResponseSchema.parse({
      ...updated,
      diagnosedDate: updated.diagnosedDate?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString()
    });
  });

  app.delete('/patients/:patientId/allergies/:id', {
    preHandler: requirePermission('geral.animais.delete')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; id: string };
    const actor = request.requestContext.actor!;
    const repo = createPatientAllergiesRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Allergy record not found' });
    return reply.status(204).send();
  });

  // ============================================
  // TAGS
  // ============================================
  app.post('/tags', {
    preHandler: requirePermission('geral.tags.create')
  }, async (request, reply) => {
    const body = createTagSchema.parse(request.body);
    const actor = request.requestContext.actor!;
    const repo = createTagsRepo(app.db);
    const created = await repo.create(actor.accountId, body);
    return reply.status(201).send(tagResponseSchema.parse({
      ...created,
      createdAt: created.createdAt.toISOString()
    }));
  });

  app.get('/tags', {
    preHandler: requirePermission('geral.tags.read')
  }, async (request) => {
    const actor = request.requestContext.actor!;
    const repo = createTagsRepo(app.db);
    const allTags = await repo.findByAccount(actor.accountId);
    return allTags.map(t => tagResponseSchema.parse({
      ...t,
      createdAt: t.createdAt.toISOString()
    }));
  });

  app.delete('/tags/:id', {
    preHandler: requirePermission('geral.tags.delete')
  }, async (request, reply) => {
    const params = request.params as { id: string };
    const actor = request.requestContext.actor!;
    const repo = createTagsRepo(app.db);
    const deleted = await repo.delete(actor.accountId, params.id);
    if (!deleted) return reply.status(404).send({ message: 'Tag not found' });
    return reply.status(204).send();
  });

  app.post('/owners/:ownerId/tags/:tagId', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; tagId: string };
    const repo = createTagsRepo(app.db);
    await repo.addToOwner(params.ownerId, params.tagId);
    return reply.status(204).send();
  });

  app.delete('/owners/:ownerId/tags/:tagId', {
    preHandler: requirePermission('geral.clientes.update')
  }, async (request, reply) => {
    const params = request.params as { ownerId: string; tagId: string };
    const repo = createTagsRepo(app.db);
    await repo.removeFromOwner(params.ownerId, params.tagId);
    return reply.status(204).send();
  });

  app.post('/patients/:patientId/tags/:tagId', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; tagId: string };
    const repo = createTagsRepo(app.db);
    await repo.addToPatient(params.patientId, params.tagId);
    return reply.status(204).send();
  });

  app.delete('/patients/:patientId/tags/:tagId', {
    preHandler: requirePermission('geral.animais.update')
  }, async (request, reply) => {
    const params = request.params as { patientId: string; tagId: string };
    const repo = createTagsRepo(app.db);
    await repo.removeFromPatient(params.patientId, params.tagId);
    return reply.status(204).send();
  });
};

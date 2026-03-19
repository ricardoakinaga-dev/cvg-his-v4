import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requirePermission } from '../../middlewares/requirePermission.js';
import {
  NotificationTemplateCreateSchema,
  NotificationTemplateUpdateSchema,
  NotificationCreateSchema,
  NotificationSettingsSchema
} from './schemas.js';
import * as repo from './repo.js';

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  // =====================
  // Templates
  // =====================

  // POST /notification-templates - Criar template
  app.post('/notification-templates', {
    preHandler: requirePermission('system.health.read'), // Temporário: usar permissão existente
    schema: {
      tags: ['Notifications'],
      summary: 'Create notification template'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const body = NotificationTemplateCreateSchema.parse(request.body);
    const template = await repo.createNotificationTemplate(app.db, actor.accountId, body);
    return template;
  });

  // GET /notification-templates - Listar templates
  app.get('/notification-templates', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'List notification templates'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const query = z.object({
      type: z.string().optional(),
      channel: z.string().optional(),
      active: z.coerce.boolean().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20)
    }).parse(request.query);

    const result = await repo.listNotificationTemplates(app.db, actor.accountId, query);
    return result;
  });

  // GET /notification-templates/:id - Detalhe do template
  app.get('/notification-templates/:id', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification template'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const template = await repo.getNotificationTemplate(app.db, actor.accountId, id);
    
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  });

  // PATCH /notification-templates/:id - Atualizar template
  app.patch('/notification-templates/:id', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'Update notification template'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = NotificationTemplateUpdateSchema.parse(request.body);
    
    const template = await repo.updateNotificationTemplate(app.db, actor.accountId, id, body);
    if (!template) {
      return { error: 'Template not found or no changes' };
    }
    return template;
  });

  // =====================
  // Notifications
  // =====================

  // POST /notifications - Criar/enviar notificação
  app.post('/notifications', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'Create notification'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const body = NotificationCreateSchema.parse(request.body);
    
    // Se tem template, carregar e aplicar
    if (body.templateId) {
      const template = await repo.getNotificationTemplate(app.db, actor.accountId, body.templateId);
      if (template) {
        body.body = template.bodyText;
        body.subject = template.subject || body.subject;
      }
    }

    const notification = await repo.createNotification(
      app.db,
      actor.accountId,
      body,
      actor.userId
    );

    // Se não está agendado, enviar imediatamente
    if (!body.scheduledFor) {
      // TODO: Chamar worker para enviar
      // await sendNotification(app.db, actor.accountId, notification.id);
    }

    return notification;
  });

  // GET /notifications - Listar notificações
  app.get('/notifications', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'List notifications'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const query = z.object({
      status: z.string().optional(),
      channel: z.string().optional(),
      type: z.string().optional(),
      patientId: z.string().uuid().optional(),
      appointmentId: z.string().uuid().optional(),
      dateFrom: z.coerce.date().optional(),
      dateTo: z.coerce.date().optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20)
    }).parse(request.query);

    const result = await repo.listNotifications(app.db, actor.accountId, query);
    return result;
  });

  // GET /notifications/:id - Detalhe da notificação
  app.get('/notifications/:id', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const notification = await repo.getNotification(app.db, actor.accountId, id);
    
    if (!notification) {
      return { error: 'Notification not found' };
    }
    return notification;
  });

  // =====================
  // Settings
  // =====================

  // GET /notification-settings - Obter configurações
  app.get('/notification-settings', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'Get notification settings'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const settings = await repo.getNotificationSettings(app.db, actor.accountId);
    return settings || {
      smsEnabled: false,
      whatsappEnabled: false,
      emailEnabled: false,
      quietHoursEnabled: false,
      maxRetries: 3,
      retryIntervalMinutes: 5
    };
  });

  // PUT /notification-settings - Atualizar configurações
  app.put('/notification-settings', {
    preHandler: requirePermission('system.health.read'),
    schema: {
      tags: ['Notifications'],
      summary: 'Update notification settings'
    }
  }, async (request) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId) {
      return { error: 'Actor context required' };
    }

    const body = NotificationSettingsSchema.parse(request.body);
    const settings = await repo.upsertNotificationSettings(app.db, actor.accountId, body);
    return settings;
  });
};

import { z } from 'zod';

import {
  createPaginatedResponseSchema,
  idParamSchema,
  paginationQuerySchema,
  trim,
  uuidSchema
} from './common.js';

// =====================
// Enums
// =====================

export const notificationChannelSchema = z.enum(['sms', 'whatsapp', 'email', 'push']);
export const notificationStatusSchema = z.enum(['pending', 'queued', 'sent', 'delivered', 'failed', 'cancelled']);
export const notificationTypeSchema = z.enum([
  'appointment_confirmed',
  'appointment_reminder',
  'appointment_cancelled',
  'exam_result',
  'prescription',
  'promo',
  'custom'
]);
export const notificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// =====================
// Notification Templates
// =====================

export const notificationTemplateResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  name: z.string(),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  subject: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  bodyText: z.string(),
  variables: z.array(z.string()).default([]),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const createNotificationTemplateBodySchema = z.object({
  name: z.string().transform(trim).pipe(z.string().min(1).max(200)),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  subject: z.string().transform(trim).pipe(z.string().max(500)).optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().transform(trim).pipe(z.string().min(1)),
  variables: z.array(z.string()).default([]),
  active: z.boolean().default(true)
});

export const updateNotificationTemplateBodySchema = createNotificationTemplateBodySchema.partial().refine(
  (v) => Object.values(v).some((x) => x !== undefined),
  'At least one field required'
);

export const listNotificationTemplatesQuerySchema = paginationQuerySchema.merge(z.object({
  type: notificationTypeSchema.optional(),
  channel: notificationChannelSchema.optional(),
  active: z.coerce.boolean().optional()
}));

export const listNotificationTemplatesResponseSchema = createPaginatedResponseSchema(notificationTemplateResponseSchema);

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;
export type NotificationTemplateResponse = z.infer<typeof notificationTemplateResponseSchema>;
export type CreateNotificationTemplateBody = z.infer<typeof createNotificationTemplateBodySchema>;
export type UpdateNotificationTemplateBody = z.infer<typeof updateNotificationTemplateBodySchema>;
export type ListNotificationTemplatesQuery = z.infer<typeof listNotificationTemplatesQuerySchema>;
export type ListNotificationTemplatesResponse = z.infer<typeof listNotificationTemplatesResponseSchema>;

// =====================
// Notifications
// =====================

export const notificationResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  templateId: uuidSchema.nullable().optional(),
  patientId: uuidSchema.nullable().optional(),
  appointmentId: uuidSchema.nullable().optional(),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  priority: notificationPrioritySchema,
  status: notificationStatusSchema,
  recipient: z.string(),
  recipientName: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  body: z.string(),
  metadata: z.record(z.unknown()).default({}),
  scheduledFor: z.coerce.date().nullable().optional(),
  sentAt: z.coerce.date().nullable().optional(),
  deliveredAt: z.coerce.date().nullable().optional(),
  failedAt: z.coerce.date().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  retryCount: z.number().int(),
  maxRetries: z.number().int(),
  createdByUserId: uuidSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const createNotificationBodySchema = z.object({
  patientId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
  templateId: uuidSchema.optional(),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  priority: notificationPrioritySchema.default('normal'),
  recipient: z.string().transform(trim).pipe(z.string().min(1).max(500)),
  recipientName: z.string().transform(trim).pipe(z.string().max(255)).optional(),
  subject: z.string().transform(trim).pipe(z.string().max(500)).optional(),
  body: z.string().transform(trim).pipe(z.string().min(1)),
  metadata: z.record(z.unknown()).default({}),
  scheduledFor: z.coerce.date().optional()
});

export const listNotificationsQuerySchema = paginationQuerySchema.merge(z.object({
  status: notificationStatusSchema.optional(),
  channel: notificationChannelSchema.optional(),
  type: notificationTypeSchema.optional(),
  patientId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
}));

export const listNotificationsResponseSchema = createPaginatedResponseSchema(notificationResponseSchema);

export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
export type CreateNotificationBody = z.infer<typeof createNotificationBodySchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type ListNotificationsResponse = z.infer<typeof listNotificationsResponseSchema>;

// =====================
// Notification Settings
// =====================

export const notificationSettingsResponseSchema = z.object({
  id: uuidSchema,
  accountId: uuidSchema,
  smsEnabled: z.boolean(),
  smsProvider: z.enum(['twilio', 'zenvia']).nullable().optional(),
  smsApiKey: z.string().nullable().optional(),
  smsFrom: z.string().nullable().optional(),
  whatsappEnabled: z.boolean(),
  whatsappProvider: z.enum(['twilio', '360dialog']).nullable().optional(),
  whatsappApiKey: z.string().nullable().optional(),
  whatsappFrom: z.string().nullable().optional(),
  emailEnabled: z.boolean(),
  emailProvider: z.enum(['sendgrid', 'mailgun']).nullable().optional(),
  emailApiKey: z.string().nullable().optional(),
  emailFrom: z.string().nullable().optional(),
  emailFromName: z.string().nullable().optional(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().nullable().optional(),
  quietHoursEnd: z.string().nullable().optional(),
  maxRetries: z.number().int(),
  retryIntervalMinutes: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const updateNotificationSettingsBodySchema = z.object({
  smsEnabled: z.boolean().default(false),
  smsProvider: z.enum(['twilio', 'zenvia']).optional(),
  smsApiKey: z.string().max(255).optional(),
  smsFrom: z.string().max(50).optional(),
  whatsappEnabled: z.boolean().default(false),
  whatsappProvider: z.enum(['twilio', '360dialog']).optional(),
  whatsappApiKey: z.string().max(255).optional(),
  whatsappFrom: z.string().max(50).optional(),
  emailEnabled: z.boolean().default(false),
  emailProvider: z.enum(['sendgrid', 'mailgun']).optional(),
  emailApiKey: z.string().max(255).optional(),
  emailFrom: z.string().max(255).optional(),
  emailFromName: z.string().max(255).optional(),
  quietHoursEnabled: z.boolean().default(false),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  maxRetries: z.number().int().min(0).max(10).default(3),
  retryIntervalMinutes: z.number().int().min(1).max(60).default(5)
});

export type NotificationSettingsResponse = z.infer<typeof notificationSettingsResponseSchema>;
export type UpdateNotificationSettingsBody = z.infer<typeof updateNotificationSettingsBodySchema>;

// =====================
// Contract
// =====================

export const notificationContract = {
  // Templates
  createTemplate: {
    method: 'POST',
    path: '/notification-templates',
    body: createNotificationTemplateBodySchema,
    response: notificationTemplateResponseSchema
  },
  listTemplates: {
    method: 'GET',
    path: '/notification-templates',
    query: listNotificationTemplatesQuerySchema,
    response: listNotificationTemplatesResponseSchema
  },
  getTemplate: {
    method: 'GET',
    path: '/notification-templates/:id',
    params: idParamSchema,
    response: notificationTemplateResponseSchema
  },
  updateTemplate: {
    method: 'PATCH',
    path: '/notification-templates/:id',
    params: idParamSchema,
    body: updateNotificationTemplateBodySchema,
    response: notificationTemplateResponseSchema
  },

  // Notifications
  create: {
    method: 'POST',
    path: '/notifications',
    body: createNotificationBodySchema,
    response: notificationResponseSchema
  },
  list: {
    method: 'GET',
    path: '/notifications',
    query: listNotificationsQuerySchema,
    response: listNotificationsResponseSchema
  },
  get: {
    method: 'GET',
    path: '/notifications/:id',
    params: idParamSchema,
    response: notificationResponseSchema
  },

  // Settings
  getSettings: {
    method: 'GET',
    path: '/notification-settings',
    response: notificationSettingsResponseSchema
  },
  updateSettings: {
    method: 'PUT',
    path: '/notification-settings',
    body: updateNotificationSettingsBodySchema,
    response: notificationSettingsResponseSchema
  }
} as const;

export type NotificationContract = typeof notificationContract;

import { z } from 'zod';

// =====================
// Enums
// =====================

export const NotificationChannelSchema = z.enum(['sms', 'whatsapp', 'email', 'push']);
export const NotificationStatusSchema = z.enum(['pending', 'queued', 'sent', 'delivered', 'failed', 'cancelled']);
export const NotificationTypeSchema = z.enum([
  'appointment_confirmed',
  'appointment_reminder',
  'appointment_cancelled',
  'exam_result',
  'prescription',
  'promo',
  'custom'
]);
export const NotificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

// =====================
// Notification Template
// =====================

export const NotificationTemplateCreateSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  subject: z.string().max(500).optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().min(1, 'bodyText is required'),
  variables: z.array(z.string()).default([]),
  active: z.boolean().default(true)
});

export const NotificationTemplateUpdateSchema = NotificationTemplateCreateSchema.partial().refine(
  (payload) => Object.values(payload).some((value) => value !== undefined),
  { message: 'At least one field must be provided' }
);

export const NotificationTemplateReadSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  name: z.string(),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  subject: z.string().nullable().optional(),
  bodyHtml: z.string().nullable().optional(),
  bodyText: z.string(),
  variables: z.array(z.string()).default([]),
  active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export type NotificationTemplateCreateDto = z.infer<typeof NotificationTemplateCreateSchema>;
export type NotificationTemplateUpdateDto = z.infer<typeof NotificationTemplateUpdateSchema>;
export type NotificationTemplateReadDto = z.infer<typeof NotificationTemplateReadSchema>;

// =====================
// Notification
// =====================

export const NotificationCreateSchema = z.object({
  patientId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema.default('normal'),
  recipient: z.string().min(1, 'recipient is required').max(500),
  recipientName: z.string().max(255).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().min(1, 'body is required'),
  metadata: z.record(z.unknown()).default({}),
  scheduledFor: z.coerce.date().optional()
});

export const NotificationReadSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  patientId: z.string().uuid().nullable().optional(),
  appointmentId: z.string().uuid().nullable().optional(),
  type: NotificationTypeSchema,
  channel: NotificationChannelSchema,
  priority: NotificationPrioritySchema,
  status: NotificationStatusSchema,
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
  createdByUserId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const NotificationUpdateSchema = z.object({
  status: NotificationStatusSchema.optional(),
  sentAt: z.coerce.date().optional(),
  deliveredAt: z.coerce.date().optional(),
  failedAt: z.coerce.date().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  retryCount: z.number().int().optional()
});

export type NotificationCreateDto = z.infer<typeof NotificationCreateSchema>;
export type NotificationReadDto = z.infer<typeof NotificationReadSchema>;
export type NotificationUpdateDto = z.infer<typeof NotificationUpdateSchema>;

// =====================
// Notification Settings
// =====================

export const NotificationSettingsSchema = z.object({
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

export type NotificationSettingsDto = z.infer<typeof NotificationSettingsSchema>;

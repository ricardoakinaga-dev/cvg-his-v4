import { boolean, index, integer, pgTable, text, timestamp, uuid, pgEnum, json, varchar, uniqueIndex } from 'drizzle-orm/pg-core';

import { accounts } from './accounts.js';
import { patients } from './patients.js';
import { appointments } from './appointments.js';

// =====================
// Enums
// =====================

export const notificationChannelEnum = pgEnum('notification_channel', [
  'sms',          // SMS via Twilio/Zenvia
  'whatsapp',     // WhatsApp via Twilio/360Dialog
  'email',        // Email via SendGrid/Mailgun
  'push'          // Push notification (futuro)
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',      // Aguardando envio
  'queued',       // Na fila
  'sent',         // Enviado
  'delivered',    // Entregue
  'failed',       // Falhou
  'cancelled'     // Cancelado
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'appointment_confirmed',    // Agendamento confirmado
  'appointment_reminder',     // Lembrete de consulta
  'appointment_cancelled',    // Agendamento cancelado
  'exam_result',              // Resultado de exame disponível
  'prescription',             // Receita/vacina pendente
  'promo',                    // Promoção/evento
  'custom'                    // Customizada
]);

export const notificationPriorityEnum = pgEnum('notification_priority', [
  'low',
  'normal',
  'high',
  'urgent'
]);

// =====================
// Notification Templates
// =====================

export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    type: notificationTypeEnum('type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    subject: varchar('subject', { length: 500 }),
    bodyHtml: text('body_html'),
    bodyText: text('body_text').notNull(),
    variables: json('variables').default([]), // Variáveis disponíveis no template
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_notif_templates_account').on(table.accountId),
    typeIdx: index('idx_notif_templates_type').on(table.accountId, table.type),
    uniqueTypeChannel: uniqueIndex('idx_notif_templates_unique').on(table.accountId, table.type, table.channel)
  })
);

// =====================
// Notifications
// =====================

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id')
      .references(() => notificationTemplates.id, { onDelete: 'set null' }),
    patientId: uuid('patient_id')
      .references(() => patients.id, { onDelete: 'set null' }),
    appointmentId: uuid('appointment_id')
      .references(() => appointments.id, { onDelete: 'set null' }),
    type: notificationTypeEnum('type').notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    priority: notificationPriorityEnum('priority').notNull().default('normal'),
    status: notificationStatusEnum('status').notNull().default('pending'),
    recipient: varchar('recipient', { length: 500 }).notNull(), // Telefone ou email
    recipientName: varchar('recipient_name', { length: 255 }),
    subject: varchar('subject', { length: 500 }),
    body: text('body').notNull(),
    metadata: json('metadata').default({}), // Dados extras (provider SID, etc.)
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').notNull().default(0),
    maxRetries: integer('max_retries').notNull().default(3),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountIdx: index('idx_notifications_account').on(table.accountId),
    statusIdx: index('idx_notifications_status').on(table.accountId, table.status),
    scheduledIdx: index('idx_notifications_scheduled').on(table.scheduledFor, table.status),
    patientIdx: index('idx_notifications_patient').on(table.patientId),
    appointmentIdx: index('idx_notifications_appointment').on(table.appointmentId),
    createdAtIdx: index('idx_notifications_created').on(table.accountId, table.createdAt)
  })
);

// =====================
// Notification Settings (por conta)
// =====================

export const notificationSettings = pgTable(
  'notification_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    // Configurações por canal
    smsEnabled: boolean('sms_enabled').notNull().default(false),
    smsProvider: varchar('sms_provider', { length: 50 }), // 'twilio', 'zenvia'
    smsApiKey: varchar('sms_api_key', { length: 255 }),
    smsFrom: varchar('sms_from', { length: 50 }), // Número de origem
    
    whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
    whatsappProvider: varchar('whatsapp_provider', { length: 50 }), // 'twilio', '360dialog'
    whatsappApiKey: varchar('whatsapp_api_key', { length: 255 }),
    whatsappFrom: varchar('whatsapp_from', { length: 50 }), // Número de origem
    
    emailEnabled: boolean('email_enabled').notNull().default(false),
    emailProvider: varchar('email_provider', { length: 50 }), // 'sendgrid', 'mailgun'
    emailApiKey: varchar('email_api_key', { length: 255 }),
    emailFrom: varchar('email_from', { length: 255 }), // Email de origem
    emailFromName: varchar('email_from_name', { length: 255 }), // Nome de origem
    
    // Configurações de horário
    quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
    quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // HH:mm
    quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // HH:mm
    
    // Configurações de retry
    maxRetries: integer('max_retries').notNull().default(3),
    retryIntervalMinutes: integer('retry_interval_minutes').notNull().default(5),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    accountUnique: uniqueIndex('idx_notif_settings_account').on(table.accountId)
  })
);

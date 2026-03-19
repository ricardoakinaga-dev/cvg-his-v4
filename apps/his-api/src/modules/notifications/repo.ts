import type {
  NotificationCreateDto,
  NotificationReadDto,
  NotificationUpdateDto,
  NotificationTemplateCreateDto,
  NotificationTemplateReadDto,
  NotificationSettingsDto
} from './schemas.js';

type DbClient = typeof import('@cvg-his/db').db;

// =====================
// Notification Templates
// =====================

export async function createNotificationTemplate(
  db: DbPool,
  accountId: string,
  dto: NotificationTemplateCreateDto
): Promise<NotificationTemplateReadDto> {
  const result = await db.$client.query(
    `INSERT INTO notification_templates (
      account_id, name, type, channel, subject, body_html, body_text, variables, active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      accountId,
      dto.name,
      dto.type,
      dto.channel,
      dto.subject || null,
      dto.bodyHtml || null,
      dto.bodyText,
      JSON.stringify(dto.variables),
      dto.active
    ]
  );
  return mapTemplate(result.rows[0]);
}

export async function getNotificationTemplate(
  db: DbPool,
  accountId: string,
  templateId: string
): Promise<NotificationTemplateReadDto | null> {
  const result = await db.$client.query(
    `SELECT * FROM notification_templates WHERE id = $1 AND account_id = $2`,
    [templateId, accountId]
  );
  return result.rows[0] ? mapTemplate(result.rows[0]) : null;
}

export async function listNotificationTemplates(
  db: DbPool,
  accountId: string,
  opts: {
    type?: string;
    channel?: string;
    active?: boolean;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{ data: NotificationTemplateReadDto[]; total: number }> {
  const { type, channel, active, page = 1, pageSize = 20 } = opts;
  const offset = (page - 1) * pageSize;
  
  let where = 'WHERE account_id = $1';
  const params: any[] = [accountId];
  let paramIdx = 2;

  if (type) {
    where += ` AND type = $${paramIdx++}`;
    params.push(type);
  }
  if (channel) {
    where += ` AND channel = $${paramIdx++}`;
    params.push(channel);
  }
  if (active !== undefined) {
    where += ` AND active = $${paramIdx++}`;
    params.push(active);
  }

  const countResult = await db.$client.query(
    `SELECT COUNT(*) FROM notification_templates ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db.$client.query(
    `SELECT * FROM notification_templates ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, pageSize, offset]
  );

  return {
    data: result.rows.map(mapTemplate),
    total
  };
}

export async function updateNotificationTemplate(
  db: DbPool,
  accountId: string,
  templateId: string,
  dto: Partial<NotificationTemplateCreateDto>
): Promise<NotificationTemplateReadDto | null> {
  const sets: string[] = [];
  const params: any[] = [templateId, accountId];
  let paramIdx = 3;

  if (dto.name !== undefined) {
    sets.push(`name = $${paramIdx++}`);
    params.push(dto.name);
  }
  if (dto.type !== undefined) {
    sets.push(`type = $${paramIdx++}`);
    params.push(dto.type);
  }
  if (dto.channel !== undefined) {
    sets.push(`channel = $${paramIdx++}`);
    params.push(dto.channel);
  }
  if (dto.subject !== undefined) {
    sets.push(`subject = $${paramIdx++}`);
    params.push(dto.subject);
  }
  if (dto.bodyHtml !== undefined) {
    sets.push(`body_html = $${paramIdx++}`);
    params.push(dto.bodyHtml);
  }
  if (dto.bodyText !== undefined) {
    sets.push(`body_text = $${paramIdx++}`);
    params.push(dto.bodyText);
  }
  if (dto.variables !== undefined) {
    sets.push(`variables = $${paramIdx++}`);
    params.push(JSON.stringify(dto.variables));
  }
  if (dto.active !== undefined) {
    sets.push(`active = $${paramIdx++}`);
    params.push(dto.active);
  }

  if (sets.length === 0) return null;

  sets.push(`updated_at = NOW()`);

  const result = await db.$client.query(
    `UPDATE notification_templates SET ${sets.join(', ')} WHERE id = $1 AND account_id = $2 RETURNING *`,
    params
  );
  return result.rows[0] ? mapTemplate(result.rows[0]) : null;
}

// =====================
// Notifications
// =====================

export async function createNotification(
  db: DbPool,
  accountId: string,
  dto: NotificationCreateDto,
  createdByUserId?: string
): Promise<NotificationReadDto> {
  const result = await db.$client.query(
    `INSERT INTO notifications (
      account_id, template_id, patient_id, appointment_id, type, channel,
      priority, recipient, recipient_name, subject, body, metadata,
      scheduled_for, created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      accountId,
      dto.templateId || null,
      dto.patientId || null,
      dto.appointmentId || null,
      dto.type,
      dto.channel,
      dto.priority,
      dto.recipient,
      dto.recipientName || null,
      dto.subject || null,
      dto.body,
      JSON.stringify(dto.metadata),
      dto.scheduledFor || null,
      createdByUserId || null
    ]
  );
  return mapNotification(result.rows[0]);
}

export async function getNotification(
  db: DbPool,
  accountId: string,
  notificationId: string
): Promise<NotificationReadDto | null> {
  const result = await db.$client.query(
    `SELECT * FROM notifications WHERE id = $1 AND account_id = $2`,
    [notificationId, accountId]
  );
  return result.rows[0] ? mapNotification(result.rows[0]) : null;
}

export async function listNotifications(
  db: DbPool,
  accountId: string,
  opts: {
    status?: string;
    channel?: string;
    type?: string;
    patientId?: string;
    appointmentId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{ data: NotificationReadDto[]; total: number }> {
  const { status, channel, type, patientId, appointmentId, dateFrom, dateTo, page = 1, pageSize = 20 } = opts;
  const offset = (page - 1) * pageSize;
  
  let where = 'WHERE account_id = $1';
  const params: any[] = [accountId];
  let paramIdx = 2;

  if (status) {
    where += ` AND status = $${paramIdx++}`;
    params.push(status);
  }
  if (channel) {
    where += ` AND channel = $${paramIdx++}`;
    params.push(channel);
  }
  if (type) {
    where += ` AND type = $${paramIdx++}`;
    params.push(type);
  }
  if (patientId) {
    where += ` AND patient_id = $${paramIdx++}`;
    params.push(patientId);
  }
  if (appointmentId) {
    where += ` AND appointment_id = $${paramIdx++}`;
    params.push(appointmentId);
  }
  if (dateFrom) {
    where += ` AND created_at >= $${paramIdx++}`;
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ` AND created_at <= $${paramIdx++}`;
    params.push(dateTo);
  }

  const countResult = await db.$client.query(
    `SELECT COUNT(*) FROM notifications ${where}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await db.$client.query(
    `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, pageSize, offset]
  );

  return {
    data: result.rows.map(mapNotification),
    total
  };
}

export async function updateNotification(
  db: DbPool,
  accountId: string,
  notificationId: string,
  dto: NotificationUpdateDto
): Promise<NotificationReadDto | null> {
  const sets: string[] = [];
  const params: any[] = [notificationId, accountId];
  let paramIdx = 3;

  if (dto.status !== undefined) {
    sets.push(`status = $${paramIdx++}`);
    params.push(dto.status);
  }
  if (dto.sentAt !== undefined) {
    sets.push(`sent_at = $${paramIdx++}`);
    params.push(dto.sentAt);
  }
  if (dto.deliveredAt !== undefined) {
    sets.push(`delivered_at = $${paramIdx++}`);
    params.push(dto.deliveredAt);
  }
  if (dto.failedAt !== undefined) {
    sets.push(`failed_at = $${paramIdx++}`);
    params.push(dto.failedAt);
  }
  if (dto.errorMessage !== undefined) {
    sets.push(`error_message = $${paramIdx++}`);
    params.push(dto.errorMessage);
  }
  if (dto.metadata !== undefined) {
    sets.push(`metadata = $${paramIdx++}`);
    params.push(JSON.stringify(dto.metadata));
  }
  if (dto.retryCount !== undefined) {
    sets.push(`retry_count = $${paramIdx++}`);
    params.push(dto.retryCount);
  }

  if (sets.length === 0) return null;

  sets.push(`updated_at = NOW()`);

  const result = await db.$client.query(
    `UPDATE notifications SET ${sets.join(', ')} WHERE id = $1 AND account_id = $2 RETURNING *`,
    params
  );
  return result.rows[0] ? mapNotification(result.rows[0]) : null;
}

// =====================
// Notification Settings
// =====================

export async function getNotificationSettings(
  db: DbPool,
  accountId: string
): Promise<NotificationSettingsDto | null> {
  const result = await db.$client.query(
    `SELECT * FROM notification_settings WHERE account_id = $1`,
    [accountId]
  );
  return result.rows[0] ? mapSettings(result.rows[0]) : null;
}

export async function upsertNotificationSettings(
  db: DbPool,
  accountId: string,
  dto: NotificationSettingsDto
): Promise<NotificationSettingsDto> {
  const result = await db.$client.query(
    `INSERT INTO notification_settings (
      account_id, sms_enabled, sms_provider, sms_api_key, sms_from,
      whatsapp_enabled, whatsapp_provider, whatsapp_api_key, whatsapp_from,
      email_enabled, email_provider, email_api_key, email_from, email_from_name,
      quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
      max_retries, retry_interval_minutes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT (account_id) DO UPDATE SET
      sms_enabled = EXCLUDED.sms_enabled,
      sms_provider = EXCLUDED.sms_provider,
      sms_api_key = EXCLUDED.sms_api_key,
      sms_from = EXCLUDED.sms_from,
      whatsapp_enabled = EXCLUDED.whatsapp_enabled,
      whatsapp_provider = EXCLUDED.whatsapp_provider,
      whatsapp_api_key = EXCLUDED.whatsapp_api_key,
      whatsapp_from = EXCLUDED.whatsapp_from,
      email_enabled = EXCLUDED.email_enabled,
      email_provider = EXCLUDED.email_provider,
      email_api_key = EXCLUDED.email_api_key,
      email_from = EXCLUDED.email_from,
      email_from_name = EXCLUDED.email_from_name,
      quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
      quiet_hours_start = EXCLUDED.quiet_hours_start,
      quiet_hours_end = EXCLUDED.quiet_hours_end,
      max_retries = EXCLUDED.max_retries,
      retry_interval_minutes = EXCLUDED.retry_interval_minutes,
      updated_at = NOW()
    RETURNING *`,
    [
      accountId,
      dto.smsEnabled,
      dto.smsProvider || null,
      dto.smsApiKey || null,
      dto.smsFrom || null,
      dto.whatsappEnabled,
      dto.whatsappProvider || null,
      dto.whatsappApiKey || null,
      dto.whatsappFrom || null,
      dto.emailEnabled,
      dto.emailProvider || null,
      dto.emailApiKey || null,
      dto.emailFrom || null,
      dto.emailFromName || null,
      dto.quietHoursEnabled,
      dto.quietHoursStart || null,
      dto.quietHoursEnd || null,
      dto.maxRetries,
      dto.retryIntervalMinutes
    ]
  );
  return mapSettings(result.rows[0]);
}

// =====================
// Mappers
// =====================

function mapTemplate(row: any): NotificationTemplateReadDto {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    type: row.type,
    channel: row.channel,
    subject: row.subject,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    variables: row.variables || [],
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapNotification(row: any): NotificationReadDto {
  return {
    id: row.id,
    accountId: row.account_id,
    templateId: row.template_id,
    patientId: row.patient_id,
    appointmentId: row.appointment_id,
    type: row.type,
    channel: row.channel,
    priority: row.priority,
    status: row.status,
    recipient: row.recipient,
    recipientName: row.recipient_name,
    subject: row.subject,
    body: row.body,
    metadata: row.metadata || {},
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    failedAt: row.failed_at,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSettings(row: any): NotificationSettingsDto {
  return {
    smsEnabled: row.sms_enabled,
    smsProvider: row.sms_provider,
    smsApiKey: row.sms_api_key,
    smsFrom: row.sms_from,
    whatsappEnabled: row.whatsapp_enabled,
    whatsappProvider: row.whatsapp_provider,
    whatsappApiKey: row.whatsapp_api_key,
    whatsappFrom: row.whatsapp_from,
    emailEnabled: row.email_enabled,
    emailProvider: row.email_provider,
    emailApiKey: row.email_api_key,
    emailFrom: row.email_from,
    emailFromName: row.email_from_name,
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    maxRetries: row.max_retries,
    retryIntervalMinutes: row.retry_interval_minutes
  };
}

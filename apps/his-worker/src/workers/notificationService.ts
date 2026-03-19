import type { Pool } from '@cvg-his/db';

type DbClient = Pool;

interface PendingNotification {
  id: string;
  accountId: string;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string;
  metadata: Record<string, unknown>;
  retryCount: number;
  maxRetries: number;
}

interface NotificationSettings {
  smsEnabled: boolean;
  smsProvider: string | null;
  smsApiKey: string | null;
  smsFrom: string | null;
  whatsappEnabled: boolean;
  whatsappProvider: string | null;
  whatsappApiKey: string | null;
  whatsappFrom: string | null;
  emailEnabled: boolean;
  emailProvider: string | null;
  emailApiKey: string | null;
  emailFrom: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

// =====================
// Process Notifications
// =====================

export async function processNotifications(db: DbClient): Promise<{ processed: number; failed: number }> {
  // Buscar notificações pendentes ou agendadas que já passaram do horário
  const result = await db.$client.query(`
    SELECT * FROM notifications 
    WHERE status IN ('pending', 'queued') 
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      AND retry_count < max_retries
    ORDER BY 
      CASE priority 
        WHEN 'urgent' THEN 0 
        WHEN 'high' THEN 1 
        WHEN 'normal' THEN 2 
        WHEN 'low' THEN 3 
      END,
      created_at ASC
    LIMIT 50
  `);

  const notifications: PendingNotification[] = result.rows.map((row: any) => ({
    id: row.id,
    accountId: row.account_id,
    channel: row.channel,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    metadata: row.metadata || {},
    retryCount: row.retry_count,
    maxRetries: row.max_retries
  }));

  let processed = 0;
  let failed = 0;

  for (const notification of notifications) {
    try {
      // Verificar horário de silêncio
      const settings = await getNotificationSettings(db, notification.accountId);
      if (settings?.quietHoursEnabled && isQuietHour(settings)) {
        // Reagendar para depois do horário de silêncio
        await db.$client.query(
          `UPDATE notifications 
           SET status = 'queued', 
               metadata = metadata || $1
           WHERE id = $2`,
          [JSON.stringify({ rescheduledReason: 'quiet_hours' }), notification.id]
        );
        continue;
      }

      // Marcar como processando
      await db.$client.query(
        `UPDATE notifications SET status = 'queued' WHERE id = $1`,
        [notification.id]
      );

      // Enviar notificação
      const result = await sendNotification(db, notification);

      if (result.success) {
        await db.$client.query(
          `UPDATE notifications 
           SET status = 'sent', 
               sent_at = NOW(),
               metadata = metadata || $1
           WHERE id = $2`,
          [JSON.stringify({ providerResult: result.metadata }), notification.id]
        );
        processed++;
      } else {
        // Verificar se deve tentar novamente
        if (notification.retryCount + 1 < notification.maxRetries) {
          await db.$client.query(
            `UPDATE notifications 
             SET status = 'queued', 
                 retry_count = retry_count + 1,
                 error_message = $1,
                 metadata = metadata || $2
             WHERE id = $3`,
            [
              result.error,
              JSON.stringify({ lastRetry: new Date().toISOString() }),
              notification.id
            ]
          );
        } else {
          await db.$client.query(
            `UPDATE notifications 
             SET status = 'failed', 
                 failed_at = NOW(),
                 error_message = $1,
                 retry_count = retry_count + 1
             WHERE id = $2`,
            [result.error, notification.id]
          );
          failed++;
        }
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      await db.$client.query(
        `UPDATE notifications 
         SET status = 'failed', 
             failed_at = NOW(),
             error_message = $1,
             retry_count = retry_count + 1
         WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', notification.id]
      );
      failed++;
    }
  }

  return { processed, failed };
}

// =====================
// Get Notification Settings
// =====================

async function getNotificationSettings(
  db: DbClient,
  accountId: string
): Promise<NotificationSettings | null> {
  const result = await db.$client.query(
    `SELECT * FROM notification_settings WHERE account_id = $1`,
    [accountId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
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
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end
  };
}

// =====================
// Check Quiet Hours
// =====================

function isQuietHour(settings: NotificationSettings): boolean {
  if (!settings.quietHoursStart || !settings.quietHoursEnd) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  // Se startTime > endTime, significa que o período de silêncio atravessa a meia-noite
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  } else {
    return currentTime >= startTime && currentTime < endTime;
  }
}

// =====================
// Send Notification
// =====================

type SendNotificationResult = {
  success: boolean;
  providerId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

async function sendNotification(
  db: DbClient,
  notification: PendingNotification
): Promise<SendNotificationResult> {
  // Buscar configurações da conta
  const settings = await getNotificationSettings(db, notification.accountId);
  if (!settings) {
    return { success: false, error: 'No notification settings configured' };
  }

  // Verificar qual provedor usar
  let provider: string | null = null;
  let apiKey: string | null = null;
  let from: string | null = null;

  switch (notification.channel) {
    case 'sms':
      if (!settings.smsEnabled || !settings.smsProvider || !settings.smsApiKey) {
        return { success: false, error: 'SMS not configured' };
      }
      provider = settings.smsProvider;
      apiKey = settings.smsApiKey;
      from = settings.smsFrom;
      break;

    case 'whatsapp':
      if (!settings.whatsappEnabled || !settings.whatsappProvider || !settings.whatsappApiKey) {
        return { success: false, error: 'WhatsApp not configured' };
      }
      provider = settings.whatsappProvider;
      apiKey = settings.whatsappApiKey;
      from = settings.whatsappFrom;
      break;

    case 'email':
      if (!settings.emailEnabled || !settings.emailProvider || !settings.emailApiKey) {
        return { success: false, error: 'Email not configured' };
      }
      provider = settings.emailProvider;
      apiKey = settings.emailApiKey;
      from = settings.emailFrom;
      break;
  }

  if (!provider || !apiKey || !from) {
    return { success: false, error: 'Provider not configured' };
  }

  // Enviar via provedor
  try {
    let result: SendNotificationResult;

    switch (notification.channel) {
      case 'sms':
        result = await sendSms(provider, apiKey, from, notification.recipient, notification.body);
        break;
      case 'whatsapp':
        result = await sendWhatsApp(provider, apiKey, from, notification.recipient, notification.body);
        break;
      case 'email':
        result = await sendEmail(provider, apiKey, from, notification.recipient, notification.subject || '', notification.body);
        break;
      default:
        return { success: false, error: 'Unknown channel' };
    }

    return {
      success: result.success,
      providerId: result.providerId,
      error: result.error,
      metadata: { provider, channel: notification.channel }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =====================
// Provider Implementations
// =====================

async function sendSms(
  provider: string,
  apiKey: string,
  from: string,
  to: string,
  body: string
): Promise<SendNotificationResult> {
  // TODO: Implementar chamadas reais
  console.log(`[SMS ${provider}] Sending to ${to}: ${body}`);
  
  // Simular sucesso
  return {
    success: true,
    providerId: `${provider}_sms_${Date.now()}`
  };
}

async function sendWhatsApp(
  provider: string,
  apiKey: string,
  from: string,
  to: string,
  body: string
): Promise<SendNotificationResult> {
  // TODO: Implementar chamadas reais
  console.log(`[WhatsApp ${provider}] Sending to ${to}: ${body}`);
  
  // Simular sucesso
  return {
    success: true,
    providerId: `${provider}_wa_${Date.now()}`
  };
}

async function sendEmail(
  provider: string,
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  body: string
): Promise<SendNotificationResult> {
  // TODO: Implementar chamadas reais
  console.log(`[Email ${provider}] Sending to ${to}: ${subject}`);
  
  // Simular sucesso
  return {
    success: true,
    providerId: `${provider}_email_${Date.now()}`
  };
}

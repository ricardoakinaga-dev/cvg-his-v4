import { getNotificationSettings, updateNotification } from './repo.js';
import {
  createSmsProvider,
  createWhatsAppProvider,
  createEmailProvider,
  type NotificationProvider,
  type NotificationMessage
} from './providers.js';

type DbClient = typeof import('@cvg-his/db').db;

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

// =====================
// Worker Principal
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
        await updateNotification(db, notification.accountId, notification.id, {
          status: 'queued',
          metadata: { ...notification.metadata, rescheduledReason: 'quiet_hours' }
        });
        continue;
      }

      // Obter provedor configurado
      const provider = await getProvider(db, notification.accountId, notification.channel);
      if (!provider) {
        await updateNotification(db, notification.accountId, notification.id, {
          status: 'failed',
          failedAt: new Date(),
          errorMessage: `No provider configured for channel: ${notification.channel}`
        });
        failed++;
        continue;
      }

      // Enviar notificação
      const message: NotificationMessage = {
        to: notification.recipient,
        subject: notification.subject || undefined,
        body: notification.body,
        metadata: notification.metadata
      };

      const result = await provider.send(message);

      if (result.success) {
        await updateNotification(db, notification.accountId, notification.id, {
          status: 'sent',
          sentAt: new Date(),
          metadata: { ...notification.metadata, providerResult: result.metadata }
        });
        processed++;
      } else {
        // Verificar se deve tentar novamente
        if (notification.retryCount + 1 < notification.maxRetries) {
          await updateNotification(db, notification.accountId, notification.id, {
            status: 'queued',
            retryCount: notification.retryCount + 1,
            errorMessage: result.error,
            metadata: { ...notification.metadata, lastRetry: new Date().toISOString() }
          });
        } else {
          await updateNotification(db, notification.accountId, notification.id, {
            status: 'failed',
            failedAt: new Date(),
            errorMessage: result.error,
            retryCount: notification.retryCount + 1
          });
          failed++;
        }
      }
    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      await updateNotification(db, notification.accountId, notification.id, {
        status: 'failed',
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: notification.retryCount + 1
      });
      failed++;
    }
  }

  return { processed, failed };
}

// =====================
// Obter Provedor
// =====================

async function getProvider(
  db: DbClient,
  accountId: string,
  channel: string
): Promise<NotificationProvider | null> {
  const settings = await getNotificationSettings(db, accountId);
  if (!settings) return null;

  switch (channel) {
    case 'sms':
      if (!settings.smsEnabled || !settings.smsProvider || !settings.smsApiKey || !settings.smsFrom) {
        return null;
      }
      return createSmsProvider(settings.smsProvider, {
        apiKey: settings.smsApiKey,
        fromNumber: settings.smsFrom,
        accountSid: settings.smsApiKey, // Twilio usa apiKey como accountSid
        authToken: settings.smsApiKey   // Simplificação
      });

    case 'whatsapp':
      if (!settings.whatsappEnabled || !settings.whatsappProvider || !settings.whatsappApiKey || !settings.whatsappFrom) {
        return null;
      }
      return createWhatsAppProvider(settings.whatsappProvider, {
        apiKey: settings.whatsappApiKey,
        fromNumber: settings.whatsappFrom,
        accountSid: settings.whatsappApiKey,
        authToken: settings.whatsappApiKey
      });

    case 'email':
      if (!settings.emailEnabled || !settings.emailProvider || !settings.emailApiKey || !settings.emailFrom) {
        return null;
      }
      return createEmailProvider(settings.emailProvider, {
        apiKey: settings.emailApiKey,
        fromEmail: settings.emailFrom,
        fromName: settings.emailFromName || 'CVG HIS',
        domain: settings.emailProvider === 'mailgun' ? 'mailgun.org' : undefined
      });

    default:
      return null;
  }
}

// =====================
// Verificar Horário de Silêncio
// =====================

function isQuietHour(settings: { quietHoursStart?: string | null; quietHoursEnd?: string | null }): boolean {
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
// Worker Loop
// =====================

export async function startNotificationWorker(db: DbClient, intervalMs: number = 60000): Promise<void> {
  console.log(`[Notification Worker] Starting with interval: ${intervalMs}ms`);

  const process = async () => {
    try {
      const result = await processNotifications(db);
      if (result.processed > 0 || result.failed > 0) {
        console.log(`[Notification Worker] Processed: ${result.processed}, Failed: ${result.failed}`);
      }
    } catch (error) {
      console.error('[Notification Worker] Error:', error);
    }
  };

  // Processar imediatamente
  await process();

  // Depois processar em intervalos
  setInterval(process, intervalMs);
}

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';

import { workerDb } from '../lib/db.js';
import {
  NOTIFICATION_QUEUE_NAME,
  NOTIFICATION_SEND_JOB_NAME,
  NOTIFICATION_PROCESS_QUEUE_JOB_NAME,
  type NotificationSendJobData,
  type NotificationSendJobResult,
  type NotificationSendJobName,
  type NotificationProcessQueueJobData,
  type NotificationProcessQueueJobResult,
  type NotificationProcessQueueJobName
} from '../queues/notification.queue.js';
import { processNotifications } from './notificationService.js';

// =====================
// Worker Factory
// =====================

export function createNotificationWorker(
  connection: Redis,
  prefix: string
): Worker<NotificationSendJobData | NotificationProcessQueueJobData, NotificationSendJobResult | NotificationProcessQueueJobResult, NotificationSendJobName | NotificationProcessQueueJobName> {
  return new Worker<
    NotificationSendJobData | NotificationProcessQueueJobData,
    NotificationSendJobResult | NotificationProcessQueueJobResult,
    NotificationSendJobName | NotificationProcessQueueJobName
  >(
    `${prefix}:${NOTIFICATION_QUEUE_NAME}`,
    async (job) => {
      if (job.name === NOTIFICATION_SEND_JOB_NAME) {
        return handleSendJob(job as Job<NotificationSendJobData, NotificationSendJobResult, NotificationSendJobName>);
      }
      
      if (job.name === NOTIFICATION_PROCESS_QUEUE_JOB_NAME) {
        return handleProcessQueueJob(job as Job<NotificationProcessQueueJobData, NotificationProcessQueueJobResult, NotificationProcessQueueJobName>);
      }

      throw new Error(`Unknown job name: ${job.name}`);
    },
    {
      connection,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 60000 // 100 jobs por minuto
      }
    }
  );
}

// =====================
// Job Handlers
// =====================

async function handleSendJob(
  job: Job<NotificationSendJobData, NotificationSendJobResult, NotificationSendJobName>
): Promise<NotificationSendJobResult> {
  const { notificationId, accountId, channel, recipient, body, subject, metadata } = job.data;
  const db = workerDb.$client;

  console.log(`[Notification Worker] Processing send job: ${notificationId}`);

  try {
    // Implementar envio real aqui
    // Por enquanto, apenas simular
    const result = await sendNotification(db, {
      notificationId,
      accountId,
      channel,
      recipient,
      body,
      subject,
      metadata
    });

    return {
      success: result.success,
      providerId: result.providerId,
      error: result.error,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Atualizar status da notificação
    await db.query(
      `UPDATE notifications 
       SET status = 'failed', 
           failed_at = NOW(), 
           error_message = $1,
           retry_count = retry_count + 1
       WHERE id = $2 AND account_id = $3`,
      [errorMessage, notificationId, accountId]
    );

    return {
      success: false,
      error: errorMessage,
      processedAt: new Date().toISOString()
    };
  }
}

async function handleProcessQueueJob(
  job: Job<NotificationProcessQueueJobData, NotificationProcessQueueJobResult, NotificationProcessQueueJobName>
): Promise<NotificationProcessQueueJobResult> {
  const db = workerDb.$client;

  console.log('[Notification Worker] Processing queue job');

  try {
    const result = await processNotifications(db);

    return {
      processed: result.processed,
      failed: result.failed,
      skipped: 0,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Notification Worker] Error processing queue:', error);
    return {
      processed: 0,
      failed: 0,
      skipped: 0,
      processedAt: new Date().toISOString()
    };
  }
}

// =====================
// Send Notification Service
// =====================

type SendNotificationInput = {
  notificationId: string;
  accountId: string;
  channel: 'sms' | 'whatsapp' | 'email';
  recipient: string;
  body: string;
  subject?: string;
  metadata?: Record<string, unknown>;
};

type SendNotificationResult = {
  success: boolean;
  providerId?: string;
  error?: string;
};

async function sendNotification(
  db: typeof workerDb.$client,
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  // Buscar configurações da conta
  const settingsResult = await db.query(
    `SELECT * FROM notification_settings WHERE account_id = $1`,
    [input.accountId]
  );

  if (settingsResult.rows.length === 0) {
    return {
      success: false,
      error: 'No notification settings configured'
    };
  }

  const settings = settingsResult.rows[0];

  // Verificar qual provedor usar
  let provider: string | null = null;
  let apiKey: string | null = null;
  let from: string | null = null;

  switch (input.channel) {
    case 'sms':
      if (!settings.sms_enabled || !settings.sms_provider || !settings.sms_api_key) {
        return { success: false, error: 'SMS not configured' };
      }
      provider = settings.sms_provider;
      apiKey = settings.sms_api_key;
      from = settings.sms_from;
      break;

    case 'whatsapp':
      if (!settings.whatsapp_enabled || !settings.whatsapp_provider || !settings.whatsapp_api_key) {
        return { success: false, error: 'WhatsApp not configured' };
      }
      provider = settings.whatsapp_provider;
      apiKey = settings.whatsapp_api_key;
      from = settings.whatsapp_from;
      break;

    case 'email':
      if (!settings.email_enabled || !settings.email_provider || !settings.email_api_key) {
        return { success: false, error: 'Email not configured' };
      }
      provider = settings.email_provider;
      apiKey = settings.email_api_key;
      from = settings.email_from;
      break;
  }

  if (!provider || !apiKey || !from) {
    return { success: false, error: 'Provider not configured' };
  }

  // Enviar via provedor
  try {
    let result: SendNotificationResult;

    switch (input.channel) {
      case 'sms':
        result = await sendSms(provider, apiKey, from, input.recipient, input.body);
        break;
      case 'whatsapp':
        result = await sendWhatsApp(provider, apiKey, from, input.recipient, input.body);
        break;
      case 'email':
        result = await sendEmail(provider, apiKey, from, input.recipient, input.subject || '', input.body);
        break;
      default:
        return { success: false, error: 'Unknown channel' };
    }

    // Atualizar status da notificação
    if (result.success) {
      await db.query(
        `UPDATE notifications 
         SET status = 'sent', 
             sent_at = NOW(),
             metadata = metadata || $1
         WHERE id = $2 AND account_id = $3`,
        [JSON.stringify({ provider, providerId: result.providerId }), input.notificationId, input.accountId]
      );
    }

    return result;
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

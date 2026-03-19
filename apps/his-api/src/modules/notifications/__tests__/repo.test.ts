import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createNotificationTemplate,
  getNotificationTemplate,
  listNotificationTemplates,
  updateNotificationTemplate,
  createNotification,
  getNotification,
  listNotifications,
  updateNotification,
  getNotificationSettings,
  upsertNotificationSettings
} from '../repo.js';

// Mock do Pool do PostgreSQL
const mockDb = {
  query: vi.fn()
};

describe('Notification Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotificationTemplate', () => {
    it('cria template corretamente', async () => {
      const mockRow = {
        id: 'template-1',
        account_id: 'account-1',
        name: 'Test Template',
        type: 'appointment_confirmed',
        channel: 'sms',
        subject: null,
        body_html: null,
        body_text: 'Test body',
        variables: ['patient_name'],
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] });

      const dto = {
        name: 'Test Template',
        type: 'appointment_confirmed' as const,
        channel: 'sms' as const,
        bodyText: 'Test body',
        variables: ['patient_name'],
        active: true
      };

      const result = await createNotificationTemplate(mockDb as any, 'account-1', dto);

      expect(result.id).toBe('template-1');
      expect(result.name).toBe('Test Template');
      expect(result.type).toBe('appointment_confirmed');
      expect(result.channel).toBe('sms');
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNotificationTemplate', () => {
    it('retorna template quando existe', async () => {
      const mockRow = {
        id: 'template-1',
        account_id: 'account-1',
        name: 'Test Template',
        type: 'appointment_confirmed',
        channel: 'sms',
        subject: null,
        body_html: null,
        body_text: 'Test body',
        variables: ['patient_name'],
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await getNotificationTemplate(mockDb as any, 'account-1', 'template-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('template-1');
    });

    it('retorna null quando não existe', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await getNotificationTemplate(mockDb as any, 'account-1', 'template-1');

      expect(result).toBeNull();
    });
  });

  describe('listNotificationTemplates', () => {
    it('lista templates com paginação', async () => {
      // Mock: count query
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
      
      // Mock: data query
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'template-1',
            account_id: 'account-1',
            name: 'Template 1',
            type: 'appointment_confirmed',
            channel: 'sms',
            subject: null,
            body_html: null,
            body_text: 'Body 1',
            variables: [],
            active: true,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      });

      const result = await listNotificationTemplates(mockDb as any, 'account-1', {
        page: 1,
        pageSize: 10
      });

      expect(result.total).toBe(10);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('createNotification', () => {
    it('cria notificação corretamente', async () => {
      const mockRow = {
        id: 'notif-1',
        account_id: 'account-1',
        template_id: null,
        patient_id: null,
        appointment_id: null,
        type: 'appointment_confirmed',
        channel: 'sms',
        priority: 'normal',
        status: 'pending',
        recipient: '+5511999999999',
        recipient_name: null,
        subject: null,
        body: 'Test body',
        metadata: {},
        scheduled_for: null,
        sent_at: null,
        delivered_at: null,
        failed_at: null,
        error_message: null,
        retry_count: 0,
        max_retries: 3,
        created_by_user_id: null,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] });

      const dto = {
        type: 'appointment_confirmed' as const,
        channel: 'sms' as const,
        recipient: '+5511999999999',
        body: 'Test body',
        priority: 'normal' as const,
        metadata: {}
      };

      const result = await createNotification(mockDb as any, 'account-1', dto);

      expect(result.id).toBe('notif-1');
      expect(result.status).toBe('pending');
      expect(result.recipient).toBe('+5511999999999');
    });
  });

  describe('getNotificationSettings', () => {
    it('retorna configurações quando existem', async () => {
      const mockRow = {
        id: 'settings-1',
        account_id: 'account-1',
        sms_enabled: true,
        sms_provider: 'twilio',
        sms_api_key: 'test_key',
        sms_from: '+5511999999999',
        whatsapp_enabled: false,
        whatsapp_provider: null,
        whatsapp_api_key: null,
        whatsapp_from: null,
        email_enabled: true,
        email_provider: 'sendgrid',
        email_api_key: 'test_key',
        email_from: 'noreply@example.com',
        email_from_name: 'Test',
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        max_retries: 3,
        retry_interval_minutes: 5
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await getNotificationSettings(mockDb as any, 'account-1');

      expect(result).toBeDefined();
      expect(result?.smsEnabled).toBe(true);
      expect(result?.smsProvider).toBe('twilio');
    });

    it('retorna null quando não existem', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await getNotificationSettings(mockDb as any, 'account-1');

      expect(result).toBeNull();
    });
  });

  describe('upsertNotificationSettings', () => {
    it('cria ou atualiza configurações', async () => {
      const mockRow = {
        id: 'settings-1',
        account_id: 'account-1',
        sms_enabled: true,
        sms_provider: 'twilio',
        sms_api_key: 'new_key',
        sms_from: '+5511999999999',
        whatsapp_enabled: false,
        whatsapp_provider: null,
        whatsapp_api_key: null,
        whatsapp_from: null,
        email_enabled: false,
        email_provider: null,
        email_api_key: null,
        email_from: null,
        email_from_name: null,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        max_retries: 3,
        retry_interval_minutes: 5
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] });

      const dto = {
        smsEnabled: true,
        smsProvider: 'twilio' as const,
        smsApiKey: 'new_key',
        smsFrom: '+5511999999999',
        whatsappEnabled: false,
        emailEnabled: false,
        quietHoursEnabled: false,
        maxRetries: 3,
        retryIntervalMinutes: 5
      };

      const result = await upsertNotificationSettings(mockDb as any, 'account-1', dto);

      expect(result.smsEnabled).toBe(true);
      expect(result.smsApiKey).toBe('new_key');
    });
  });
});

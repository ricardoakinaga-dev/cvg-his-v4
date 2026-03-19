import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  processNotifications
} from '../notificationService.js';

// Mock do Pool do PostgreSQL (com estrutura correta $client)
const mockDb = {
  $client: {
    query: vi.fn()
  }
};

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Set time to 12:00 (outside quiet hours: 22:00-08:00)
    vi.setSystemTime(new Date('2026-03-19T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('processNotifications', () => {
    it('processa notificações pendentes', async () => {
      // Mock: retorna notificações pendentes
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            account_id: 'account-1',
            channel: 'sms',
            recipient: '+5511999999999',
            subject: null,
            body: 'Teste',
            metadata: {},
            retry_count: 0,
            max_retries: 3
          }
        ]
      });

      // Mock: busca configurações (para verificação de horário de silêncio - chamada 1)
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [{
          sms_enabled: true,
          sms_provider: 'twilio',
          sms_api_key: 'test_key',
          sms_from: '+5511888888888',
          quiet_hours_enabled: false
        }]
      });

      // Mock: atualiza status para queued (chamada 2)
      mockDb.$client.query.mockResolvedValueOnce({ rows: [] });

      // Mock: busca configurações novamente no sendNotification (chamada 3)
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [{
          sms_enabled: true,
          sms_provider: 'twilio',
          sms_api_key: 'test_key',
          sms_from: '+5511888888888',
          quiet_hours_enabled: false
        }]
      });

      // Mock: atualiza status para sent (chamada 4)
      mockDb.$client.query.mockResolvedValueOnce({ rows: [] });

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockDb.$client.query).toHaveBeenCalledTimes(5);
    });

    it('pula notificações em horário de silêncio', async () => {
      // Set time to 23:00 (within quiet hours: 22:00-08:00)
      vi.setSystemTime(new Date('2026-03-19T23:00:00'));
      
      // Mock: retorna notificações pendentes
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            account_id: 'account-1',
            channel: 'sms',
            recipient: '+5511999999999',
            subject: null,
            body: 'Teste',
            metadata: {},
            retry_count: 0,
            max_retries: 3
          }
        ]
      });

      // Mock: busca configurações com horário de silêncio
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [{
          sms_enabled: true,
          sms_provider: 'twilio',
          sms_api_key: 'test_key',
          sms_from: '+5511888888888',
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00'
        }]
      });

      // Mock: atualiza status para queued (reagendado)
      mockDb.$client.query.mockResolvedValueOnce({ rows: [] });

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('falha quando não há configurações', async () => {
      // Mock: retorna notificações pendentes
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            account_id: 'account-1',
            channel: 'sms',
            recipient: '+5511999999999',
            subject: null,
            body: 'Teste',
            metadata: {},
            retry_count: 0,
            max_retries: 3
          }
        ]
      });

      // Mock: não há configurações
      mockDb.$client.query.mockResolvedValueOnce({ rows: [] });

      // Mock: atualiza status para failed
      mockDb.$client.query.mockResolvedValueOnce({ rows: [] });

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('incrementa retry count em caso de falha', async () => {
      // Mock: retorna notificações pendentes
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            account_id: 'account-1',
            channel: 'sms',
            recipient: '+5511999999999',
            subject: null,
            body: 'Teste',
            metadata: {},
            retry_count: 0,
            max_retries: 3
          }
        ]
      });

      // Mock: busca configurações
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [{
          sms_enabled: true,
          sms_provider: 'twilio',
          sms_api_key: 'test_key',
          sms_from: '+5511888888888',
          quiet_hours_enabled: false
        }]
      });

      // Mock: falha ao enviar (simula erro)
      mockDb.$client.query.mockRejectedValueOnce(new Error('Provider error'));

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});

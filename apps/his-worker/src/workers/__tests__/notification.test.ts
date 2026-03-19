import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  processNotifications
} from '../notificationService.js';

// Mock do Pool do PostgreSQL
const mockDb = {
  query: vi.fn()
};

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processNotifications', () => {
    it('processa notificações pendentes', async () => {
      // Mock: retorna notificações pendentes
      mockDb.query.mockResolvedValueOnce({
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
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          sms_enabled: true,
          sms_provider: 'twilio',
          sms_api_key: 'test_key',
          sms_from: '+5511888888888',
          quiet_hours_enabled: false
        }]
      });

      // Mock: atualiza status para sent
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('pula notificações em horário de silêncio', async () => {
      // Mock: retorna notificações pendentes
      mockDb.query.mockResolvedValueOnce({
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
      mockDb.query.mockResolvedValueOnce({
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
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('falha quando não há configurações', async () => {
      // Mock: retorna notificações pendentes
      mockDb.query.mockResolvedValueOnce({
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
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      // Mock: atualiza status para failed
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('incrementa retry count em caso de falha', async () => {
      // Mock: retorna notificações pendentes
      mockDb.query.mockResolvedValueOnce({
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
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          sms_enabled: true,
          sms_provider: 'twilio',
          sms_api_key: 'test_key',
          sms_from: '+5511888888888',
          quiet_hours_enabled: false
        }]
      });

      // Mock: falha ao enviar (simula erro)
      mockDb.query.mockRejectedValueOnce(new Error('Provider error'));

      const result = await processNotifications(mockDb as any);

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});

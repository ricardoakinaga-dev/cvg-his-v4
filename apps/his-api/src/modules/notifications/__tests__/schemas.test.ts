import { describe, expect, it } from 'vitest';

import {
  NotificationTemplateCreateSchema,
  NotificationTemplateUpdateSchema,
  NotificationCreateSchema,
  NotificationSettingsSchema,
  NotificationChannelSchema,
  NotificationStatusSchema,
  NotificationTypeSchema,
  NotificationPrioritySchema
} from '../apps/his-api/src/modules/notifications/schemas.js';

describe('Notification Schemas', () => {
  describe('NotificationChannelSchema', () => {
    it('aceita canais válidos', () => {
      expect(NotificationChannelSchema.parse('sms')).toBe('sms');
      expect(NotificationChannelSchema.parse('whatsapp')).toBe('whatsapp');
      expect(NotificationChannelSchema.parse('email')).toBe('email');
      expect(NotificationChannelSchema.parse('push')).toBe('push');
    });

    it('rejeita canal inválido', () => {
      expect(() => NotificationChannelSchema.parse('invalid')).toThrow();
    });
  });

  describe('NotificationStatusSchema', () => {
    it('aceita status válidos', () => {
      expect(NotificationStatusSchema.parse('pending')).toBe('pending');
      expect(NotificationStatusSchema.parse('queued')).toBe('queued');
      expect(NotificationStatusSchema.parse('sent')).toBe('sent');
      expect(NotificationStatusSchema.parse('delivered')).toBe('delivered');
      expect(NotificationStatusSchema.parse('failed')).toBe('failed');
      expect(NotificationStatusSchema.parse('cancelled')).toBe('cancelled');
    });
  });

  describe('NotificationTypeSchema', () => {
    it('aceita tipos válidos', () => {
      expect(NotificationTypeSchema.parse('appointment_confirmed')).toBe('appointment_confirmed');
      expect(NotificationTypeSchema.parse('appointment_reminder')).toBe('appointment_reminder');
      expect(NotificationTypeSchema.parse('exam_result')).toBe('exam_result');
    });
  });

  describe('NotificationPrioritySchema', () => {
    it('aceita prioridades válidas', () => {
      expect(NotificationPrioritySchema.parse('low')).toBe('low');
      expect(NotificationPrioritySchema.parse('normal')).toBe('normal');
      expect(NotificationPrioritySchema.parse('high')).toBe('high');
      expect(NotificationPrioritySchema.parse('urgent')).toBe('urgent');
    });
  });

  describe('NotificationTemplateCreateSchema', () => {
    it('valida template correto', () => {
      const valid = {
        name: 'Confirmação de Agendamento',
        type: 'appointment_confirmed',
        channel: 'sms',
        bodyText: 'Olá {{patient_name}}! Seu agendamento foi confirmado.',
        variables: ['patient_name'],
        active: true
      };

      const parsed = NotificationTemplateCreateSchema.parse(valid);
      expect(parsed.name).toBe('Confirmação de Agendamento');
      expect(parsed.type).toBe('appointment_confirmed');
      expect(parsed.channel).toBe('sms');
    });

    it('rejeita template sem nome', () => {
      const invalid = {
        type: 'appointment_confirmed',
        channel: 'sms',
        bodyText: 'Teste'
      };

      expect(() => NotificationTemplateCreateSchema.parse(invalid)).toThrow();
    });

    it('rejeita template sem bodyText', () => {
      const invalid = {
        name: 'Teste',
        type: 'appointment_confirmed',
        channel: 'sms'
      };

      expect(() => NotificationTemplateCreateSchema.parse(invalid)).toThrow();
    });

    it('aceita template com subject para email', () => {
      const valid = {
        name: 'Email de Confirmação',
        type: 'appointment_confirmed',
        channel: 'email',
        subject: 'Confirmação de Agendamento',
        bodyText: 'Olá {{patient_name}}!',
        bodyHtml: '<h1>Olá {{patient_name}}!</h1>',
        variables: ['patient_name']
      };

      const parsed = NotificationTemplateCreateSchema.parse(valid);
      expect(parsed.subject).toBe('Confirmação de Agendamento');
      expect(parsed.bodyHtml).toBe('<h1>Olá {{patient_name}}!</h1>');
    });
  });

  describe('NotificationTemplateUpdateSchema', () => {
    it('aceita atualização parcial', () => {
      const update = {
        name: 'Novo Nome'
      };

      const parsed = NotificationTemplateUpdateSchema.parse(update);
      expect(parsed.name).toBe('Novo Nome');
    });

    it('rejeita atualização vazia', () => {
      expect(() => NotificationTemplateUpdateSchema.parse({})).toThrow();
    });
  });

  describe('NotificationCreateSchema', () => {
    it('valida notificação correta', () => {
      const valid = {
        type: 'appointment_confirmed',
        channel: 'sms',
        recipient: '+5511999999999',
        body: 'Sua consulta foi confirmada!',
        priority: 'normal'
      };

      const parsed = NotificationCreateSchema.parse(valid);
      expect(parsed.type).toBe('appointment_confirmed');
      expect(parsed.channel).toBe('sms');
      expect(parsed.recipient).toBe('+5511999999999');
    });

    it('rejeita notificação sem recipient', () => {
      const invalid = {
        type: 'appointment_confirmed',
        channel: 'sms',
        body: 'Teste'
      };

      expect(() => NotificationCreateSchema.parse(invalid)).toThrow();
    });

    it('rejeita notificação sem body', () => {
      const invalid = {
        type: 'appointment_confirmed',
        channel: 'sms',
        recipient: '+5511999999999'
      };

      expect(() => NotificationCreateSchema.parse(invalid)).toThrow();
    });

    it('aceita notificação com patientId', () => {
      const valid = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'appointment_confirmed',
        channel: 'sms',
        recipient: '+5511999999999',
        body: 'Sua consulta foi confirmada!'
      };

      const parsed = NotificationCreateSchema.parse(valid);
      expect(parsed.patientId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('aceita notificação agendada', () => {
      const valid = {
        type: 'appointment_reminder',
        channel: 'whatsapp',
        recipient: '+5511999999999',
        body: 'Lembrete de consulta!',
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };

      const parsed = NotificationCreateSchema.parse(valid);
      expect(parsed.scheduledFor).toBeDefined();
    });
  });

  describe('NotificationSettingsSchema', () => {
    it('valida configurações corretas', () => {
      const valid = {
        smsEnabled: true,
        smsProvider: 'twilio',
        smsApiKey: 'test_key',
        smsFrom: '+5511999999999',
        whatsappEnabled: false,
        emailEnabled: true,
        emailProvider: 'sendgrid',
        emailApiKey: 'test_key',
        emailFrom: 'noreply@example.com',
        emailFromName: 'Test Clinic',
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        maxRetries: 3,
        retryIntervalMinutes: 5
      };

      const parsed = NotificationSettingsSchema.parse(valid);
      expect(parsed.smsEnabled).toBe(true);
      expect(parsed.smsProvider).toBe('twilio');
      expect(parsed.quietHoursStart).toBe('22:00');
    });

    it('aceita configurações mínimas', () => {
      const minimal = {};

      const parsed = NotificationSettingsSchema.parse(minimal);
      expect(parsed.smsEnabled).toBe(false);
      expect(parsed.whatsappEnabled).toBe(false);
      expect(parsed.emailEnabled).toBe(false);
      expect(parsed.maxRetries).toBe(3);
    });

    it('rejeita quietHoursStart inválido', () => {
      const invalid = {
        quietHoursEnabled: true,
        quietHoursStart: '25:00',
        quietHoursEnd: '08:00'
      };

      expect(() => NotificationSettingsSchema.parse(invalid)).toThrow();
    });

    it('rejeita maxRetries fora do range', () => {
      const invalid = {
        maxRetries: 15
      };

      expect(() => NotificationSettingsSchema.parse(invalid)).toThrow();
    });

    it('rejeita retryIntervalMinutes fora do range', () => {
      const invalid = {
        retryIntervalMinutes: 100
      };

      expect(() => NotificationSettingsSchema.parse(invalid)).toThrow();
    });
  });
});

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { px, row, theme } from '@/lib/theme';
import type { ApiError } from '@/lib/api';

// =====================
// Types
// =====================

type NotificationSettings = {
  smsEnabled: boolean;
  smsProvider: 'twilio' | 'zenvia' | '';
  smsApiKey: string;
  smsFrom: string;
  
  whatsappEnabled: boolean;
  whatsappProvider: 'twilio' | '360dialog' | '';
  whatsappApiKey: string;
  whatsappFrom: string;
  
  emailEnabled: boolean;
  emailProvider: 'sendgrid' | 'mailgun' | '';
  emailApiKey: string;
  emailFrom: string;
  emailFromName: string;
  
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  maxRetries: number;
  retryIntervalMinutes: number;
};

// =====================
// Main Page
// =====================

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    smsEnabled: false,
    smsProvider: '',
    smsApiKey: '',
    smsFrom: '',
    whatsappEnabled: false,
    whatsappProvider: '',
    whatsappApiKey: '',
    whatsappFrom: '',
    emailEnabled: false,
    emailProvider: '',
    emailApiKey: '',
    emailFrom: '',
    emailFromName: '',
    quietHoursEnabled: false,
    quietHoursStart: '',
    quietHoursEnd: '',
    maxRetries: 3,
    retryIntervalMinutes: 5
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notification-settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/notification-settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <LoadingState message="Carregando configurações..." />;
  }

  return (
    <div style={{ maxWidth: px(800), margin: '0 auto', padding: px(24) }}>
      <PageHeader
        title="⚙️ Configurações de Notificação"
        subtitle="Configure provedores de SMS, WhatsApp e Email"
        actions={
          <Button variant="secondary" onClick={() => router.push('/notifications')}>
            ← Voltar
          </Button>
        }
      />

      {error && (
        <ErrorBanner
          title="Erro"
          message={error.message}
          onRetry={fetchSettings}
        />
      )}

      {success && (
        <div style={{
          padding: px(16),
          background: '#E8F5E9',
          borderRadius: px(8),
          marginBottom: px(16),
          color: '#2E7D32',
          textAlign: 'center'
        }}>
          ✅ Configurações salvas com sucesso!
        </div>
      )}

      {/* SMS */}
      <Card style={{ padding: px(20), marginBottom: px(16) }}>
        <div style={{ ...row(12), justifyContent: 'space-between', alignItems: 'center', marginBottom: px(16) }}>
          <div>
            <h3 style={{ margin: 0, fontSize: px(18) }}>📱 SMS</h3>
            <p style={{ margin: `${px(4)} 0 0`, fontSize: px(13), color: theme.colors.textSecondary }}>
              Envie mensagens de texto para seus clientes
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <input
              type="checkbox"
              checked={settings.smsEnabled}
              onChange={(e) => updateSetting('smsEnabled', e.target.checked)}
            />
            <span style={{ fontSize: px(14) }}>Ativar SMS</span>
          </label>
        </div>

        {settings.smsEnabled && (
          <div style={{ display: 'grid', gap: px(12) }}>
            <Select
              label="Provedor"
              value={settings.smsProvider}
              onChange={(e) => updateSetting('smsProvider', e.target.value as 'twilio' | 'zenvia')}
            >
              <option value="">Selecione...</option>
              <option value="twilio">Twilio</option>
              <option value="zenvia">Zenvia (Brasil)</option>
            </Select>

            <Input
              label="API Key"
              type="password"
              value={settings.smsApiKey}
              onChange={(e) => updateSetting('smsApiKey', e.target.value)}
              placeholder="Sua API key do provedor"
            />

            <Input
              label="Número de Origem"
              value={settings.smsFrom}
              onChange={(e) => updateSetting('smsFrom', e.target.value)}
              placeholder="+5511999999999"
            />
          </div>
        )}
      </Card>

      {/* WhatsApp */}
      <Card style={{ padding: px(20), marginBottom: px(16) }}>
        <div style={{ ...row(12), justifyContent: 'space-between', alignItems: 'center', marginBottom: px(16) }}>
          <div>
            <h3 style={{ margin: 0, fontSize: px(18) }}>💬 WhatsApp</h3>
            <p style={{ margin: `${px(4)} 0 0`, fontSize: px(13), color: theme.colors.textSecondary }}>
              Envie mensagens pelo WhatsApp Business
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <input
              type="checkbox"
              checked={settings.whatsappEnabled}
              onChange={(e) => updateSetting('whatsappEnabled', e.target.checked)}
            />
            <span style={{ fontSize: px(14) }}>Ativar WhatsApp</span>
          </label>
        </div>

        {settings.whatsappEnabled && (
          <div style={{ display: 'grid', gap: px(12) }}>
            <Select
              label="Provedor"
              value={settings.whatsappProvider}
              onChange={(e) => updateSetting('whatsappProvider', e.target.value as 'twilio' | '360dialog')}
            >
              <option value="">Selecione...</option>
              <option value="twilio">Twilio</option>
              <option value="360dialog">360Dialog</option>
            </Select>

            <Input
              label="API Key"
              type="password"
              value={settings.whatsappApiKey}
              onChange={(e) => updateSetting('whatsappApiKey', e.target.value)}
              placeholder="Sua API key do provedor"
            />

            <Input
              label="Número de Origem"
              value={settings.whatsappFrom}
              onChange={(e) => updateSetting('whatsappFrom', e.target.value)}
              placeholder="+5511999999999"
            />
          </div>
        )}
      </Card>

      {/* Email */}
      <Card style={{ padding: px(20), marginBottom: px(16) }}>
        <div style={{ ...row(12), justifyContent: 'space-between', alignItems: 'center', marginBottom: px(16) }}>
          <div>
            <h3 style={{ margin: 0, fontSize: px(18) }}>📧 Email</h3>
            <p style={{ margin: `${px(4)} 0 0`, fontSize: px(13), color: theme.colors.textSecondary }}>
              Envie emails transacionais e marketing
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <input
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(e) => updateSetting('emailEnabled', e.target.checked)}
            />
            <span style={{ fontSize: px(14) }}>Ativar Email</span>
          </label>
        </div>

        {settings.emailEnabled && (
          <div style={{ display: 'grid', gap: px(12) }}>
            <Select
              label="Provedor"
              value={settings.emailProvider}
              onChange={(e) => updateSetting('emailProvider', e.target.value as 'sendgrid' | 'mailgun')}
            >
              <option value="">Selecione...</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
            </Select>

            <Input
              label="API Key"
              type="password"
              value={settings.emailApiKey}
              onChange={(e) => updateSetting('emailApiKey', e.target.value)}
              placeholder="Sua API key do provedor"
            />

            <Input
              label="Email de Origem"
              type="email"
              value={settings.emailFrom}
              onChange={(e) => updateSetting('emailFrom', e.target.value)}
              placeholder="norepute@suaclinica.com"
            />

            <Input
              label="Nome de Origem"
              value={settings.emailFromName}
              onChange={(e) => updateSetting('emailFromName', e.target.value)}
              placeholder="CVG HIS - Sua Clínica"
            />
          </div>
        )}
      </Card>

      {/* Horário de Silêncio */}
      <Card style={{ padding: px(20), marginBottom: px(16) }}>
        <div style={{ ...row(12), justifyContent: 'space-between', alignItems: 'center', marginBottom: px(16) }}>
          <div>
            <h3 style={{ margin: 0, fontSize: px(18) }}>🔇 Horário de Silêncio</h3>
            <p style={{ margin: `${px(4)} 0 0`, fontSize: px(13), color: theme.colors.textSecondary }}>
              Não enviar notificações durante este período
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <input
              type="checkbox"
              checked={settings.quietHoursEnabled}
              onChange={(e) => updateSetting('quietHoursEnabled', e.target.checked)}
            />
            <span style={{ fontSize: px(14) }}>Ativar</span>
          </label>
        </div>

        {settings.quietHoursEnabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(12) }}>
            <Input
              label="Início"
              type="time"
              value={settings.quietHoursStart}
              onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
            />

            <Input
              label="Fim"
              type="time"
              value={settings.quietHoursEnd}
              onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
            />
          </div>
        )}
      </Card>

      {/* Retry */}
      <Card style={{ padding: px(20), marginBottom: px(24) }}>
        <h3 style={{ margin: `0 0 ${px(16)}`, fontSize: px(18) }}>🔄 Retry</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(12) }}>
          <Input
            label="Máximo de Tentativas"
            type="number"
            min={0}
            max={10}
            value={String(settings.maxRetries)}
            onChange={(e) => updateSetting('maxRetries', parseInt(e.target.value))}
          />

          <Input
            label="Intervalo entre Tentativas (minutos)"
            type="number"
            min={1}
            max={60}
            value={String(settings.retryIntervalMinutes)}
            onChange={(e) => updateSetting('retryIntervalMinutes', parseInt(e.target.value))}
          />
        </div>
      </Card>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={handleSave} isLoading={saving}>
          💾 Salvar Configurações
        </Button>
      </div>
    </div>
  );
}

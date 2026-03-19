'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection, Pagination } from '@/components/ui/PageHeader';
import { px, row, theme } from '@/lib/theme';
import type { ApiError } from '@/lib/api';

// =====================
// Types
// =====================

type NotificationChannel = 'sms' | 'whatsapp' | 'email';
type NotificationStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'cancelled';
type NotificationType = 'appointment_confirmed' | 'appointment_reminder' | 'appointment_cancelled' | 'exam_result' | 'prescription' | 'promo' | 'custom';
type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

type Notification = {
  id: string;
  accountId: string;
  templateId: string | null;
  patientId: string | null;
  appointmentId: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  status: NotificationStatus;
  recipient: string;
  recipientName: string | null;
  subject: string | null;
  body: string;
  metadata: Record<string, unknown>;
  scheduledFor: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationListResponse = {
  data: Notification[];
  total: number;
};

// =====================
// Helpers
// =====================

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  sms: '📱 SMS',
  whatsapp: '💬 WhatsApp',
  email: '📧 Email'
};

const STATUS_LABELS: Record<NotificationStatus, string> = {
  pending: 'Pendente',
  queued: 'Na fila',
  sent: 'Enviado',
  delivered: 'Entregue',
  failed: 'Falhou',
  cancelled: 'Cancelado'
};

const STATUS_COLORS: Record<NotificationStatus, { bg: string; fg: string }> = {
  pending: { bg: '#FFF3E0', fg: '#E65100' },
  queued: { bg: '#E3F2FD', fg: '#1565C0' },
  sent: { bg: '#E8F5E9', fg: '#2E7D32' },
  delivered: { bg: '#F3E5F5', fg: '#6A1B9A' },
  failed: { bg: '#FFEBEE', fg: '#C62828' },
  cancelled: { bg: '#ECEFF1', fg: '#546E7A' }
};

const TYPE_LABELS: Record<NotificationType, string> = {
  appointment_confirmed: 'Agendamento Confirmado',
  appointment_reminder: 'Lembrete de Consulta',
  appointment_cancelled: 'Agendamento Cancelado',
  exam_result: 'Resultado de Exame',
  prescription: 'Receita/Vacina',
  promo: 'Promoção/Evento',
  custom: 'Customizada'
};

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('pt-BR');
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// =====================
// Components
// =====================

function StatusBadge({ status }: { status: NotificationStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      style={{
        padding: `${px(2)} ${px(8)}`,
        borderRadius: px(12),
        fontSize: px(11),
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.fg
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function ChannelIcon({ channel }: { channel: NotificationChannel }) {
  return (
    <span style={{ fontSize: px(16) }}>
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

// =====================
// Main Page
// =====================

export default function NotificationsPage() {
  const router = useRouter();
  const [data, setData] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | ''>('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (statusFilter) params.append('status', statusFilter);
      if (channelFilter) params.append('channel', channelFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const result = await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, channelFilter, typeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clearFilters = () => {
    setStatusFilter('');
    setChannelFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div style={{ maxWidth: px(1280), margin: '0 auto', padding: px(24) }}>
      <PageHeader
        title="📨 Notificações"
        subtitle="Histórico de notificações enviadas"
        actions={
          <Button variant="primary" onClick={() => router.push('/notifications/templates')}>
            📝 Templates
          </Button>
        }
      />

      {/* Filters */}
      <Card style={{ padding: px(16), marginBottom: px(16) }}>
        <div style={{ ...row(12), flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | '')}
            style={{ minWidth: px(140) }}
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          <Select
            label="Canal"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as NotificationChannel | '')}
            style={{ minWidth: px(140) }}
          >
            <option value="">Todos</option>
            {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          <Select
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
            style={{ minWidth: px(180) }}
          >
            <option value="">Todos</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>

          <Input
            type="date"
            label="De"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <Input
            type="date"
            label="Até"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <Button variant="secondary" onClick={clearFilters}>
            Limpar
          </Button>

          <Button variant="primary" onClick={fetchData} isLoading={loading}>
            Buscar
          </Button>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <ErrorBanner
          title="Erro ao carregar notificações"
          message={error.message}
          onRetry={fetchData}
        />
      )}

      {/* Loading */}
      {loading && !error && (
        <LoadingState message="Carregando notificações..." />
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {data.length === 0 ? (
            <Card style={{ padding: px(40), textAlign: 'center' }}>
              <div style={{ fontSize: px(48), marginBottom: px(16) }}>📭</div>
              <div style={{ fontSize: px(16), color: theme.colors.textSecondary }}>
                Nenhuma notificação encontrada
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: px(12) }}>
              {data.map((notification) => (
                <Card
                  key={notification.id}
                  style={{
                    padding: px(16),
                    borderLeft: `4px solid ${
                      notification.status === 'failed' ? '#C62828' :
                      notification.status === 'sent' ? '#2E7D32' :
                      notification.status === 'pending' ? '#E65100' :
                      theme.colors.border
                    }`
                  }}
                >
                  <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...row(8), marginBottom: px(4) }}>
                        <ChannelIcon channel={notification.channel} />
                        <span style={{ fontSize: px(14), fontWeight: 600 }}>
                          {TYPE_LABELS[notification.type]}
                        </span>
                        <StatusBadge status={notification.status} />
                      </div>

                      <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(8) }}>
                        <strong>Para:</strong> {notification.recipientName || notification.recipient}
                      </div>

                      <div style={{
                        fontSize: px(13),
                        color: theme.colors.textPrimary,
                        padding: px(8),
                        background: '#f8fafc',
                        borderRadius: px(4),
                        maxHeight: px(60),
                        overflow: 'hidden'
                      }}>
                        {notification.body}
                      </div>

                      {notification.errorMessage && (
                        <div style={{
                          fontSize: px(12),
                          color: '#C62828',
                          marginTop: px(8),
                          padding: px(8),
                          background: '#FFEBEE',
                          borderRadius: px(4)
                        }}>
                          <strong>Erro:</strong> {notification.errorMessage}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', minWidth: px(120) }}>
                      <div style={{ fontSize: px(12), color: theme.colors.textSecondary, marginBottom: px(4) }}>
                        {formatDate(notification.createdAt)}
                      </div>
                      {notification.sentAt && (
                        <div style={{ fontSize: px(11), color: '#2E7D32' }}>
                          ✓ Enviado: {formatTime(notification.sentAt)}
                        </div>
                      )}
                      {notification.scheduledFor && (
                        <div style={{ fontSize: px(11), color: '#E65100' }}>
                          ⏰ Agendado: {formatTime(notification.scheduledFor)}
                        </div>
                      )}
                      {notification.retryCount > 0 && (
                        <div style={{ fontSize: px(11), color: theme.colors.textSecondary }}>
                          🔄 Tentativas: {notification.retryCount}/{notification.maxRetries}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div style={{ marginTop: px(16), display: 'flex', justifyContent: 'center' }}>
              <Pagination
                currentPage={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

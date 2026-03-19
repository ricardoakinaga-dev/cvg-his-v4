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
import { Modal } from '@/components/ui/Modal';
import { px, row, theme } from '@/lib/theme';
import type { ApiError } from '@/lib/api';

// =====================
// Types
// =====================

type NotificationChannel = 'sms' | 'whatsapp' | 'email';
type NotificationType = 'appointment_confirmed' | 'appointment_reminder' | 'appointment_cancelled' | 'exam_result' | 'prescription' | 'promo' | 'custom';

type Template = {
  id: string;
  accountId: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string;
  variables: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type TemplateListResponse = {
  data: Template[];
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

const TYPE_LABELS: Record<NotificationType, string> = {
  appointment_confirmed: 'Agendamento Confirmado',
  appointment_reminder: 'Lembrete de Consulta',
  appointment_cancelled: 'Agendamento Cancelado',
  exam_result: 'Resultado de Exame',
  prescription: 'Receita/Vacina',
  promo: 'Promoção/Evento',
  custom: 'Customizada'
};

// =====================
// Main Page
// =====================

export default function NotificationTemplatesPage() {
  const router = useRouter();
  const [data, setData] = useState<Template[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Filters
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | ''>('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    type: 'appointment_confirmed' as NotificationType,
    channel: 'sms' as NotificationChannel,
    subject: '',
    bodyHtml: '',
    bodyText: '',
    variables: [] as string[],
    active: true
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (channelFilter) params.append('channel', channelFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (activeFilter !== '') params.append('active', activeFilter.toString());

      const response = await fetch(`/api/notification-templates?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const result = await response.json();
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, channelFilter, typeFilter, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      type: 'appointment_confirmed',
      channel: 'sms',
      subject: '',
      bodyHtml: '',
      bodyText: '',
      variables: [],
      active: true
    });
    setShowModal(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      channel: template.channel,
      subject: template.subject || '',
      bodyHtml: template.bodyHtml || '',
      bodyText: template.bodyText,
      variables: template.variables,
      active: template.active
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const url = editingTemplate
        ? `/api/notification-templates/${editingTemplate.id}`
        : '/api/notification-templates';

      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setChannelFilter('');
    setTypeFilter('');
    setActiveFilter('');
    setPage(1);
  };

  return (
    <div style={{ maxWidth: px(1280), margin: '0 auto', padding: px(24) }}>
      <PageHeader
        title="📝 Templates de Notificação"
        subtitle="Gerencie templates para diferentes canais"
        actions={
          <div style={{ ...row(8) }}>
            <Button variant="secondary" onClick={() => router.push('/notifications/settings')}>
              ⚙️ Configurações
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              ➕ Novo Template
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card style={{ padding: px(16), marginBottom: px(16) }}>
        <div style={{ ...row(12), flexWrap: 'wrap', alignItems: 'flex-end' }}>
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

          <Select
            label="Status"
            value={activeFilter === '' ? '' : activeFilter ? 'true' : 'false'}
            onChange={(e) => setActiveFilter(e.target.value === '' ? '' : e.target.value === 'true')}
            style={{ minWidth: px(140) }}
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </Select>

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
          title="Erro ao carregar templates"
          message={error.message}
          onRetry={fetchData}
        />
      )}

      {/* Loading */}
      {loading && !error && (
        <LoadingState message="Carregando templates..." />
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {data.length === 0 ? (
            <Card style={{ padding: px(40), textAlign: 'center' }}>
              <div style={{ fontSize: px(48), marginBottom: px(16) }}>📝</div>
              <div style={{ fontSize: px(16), color: theme.colors.textSecondary, marginBottom: px(16) }}>
                Nenhum template encontrado
              </div>
              <Button variant="primary" onClick={openCreateModal}>
                ➕ Criar Primeiro Template
              </Button>
            </Card>
          ) : (
            <div style={{ display: 'grid', gap: px(12) }}>
              {data.map((template) => (
                <Card
                  key={template.id}
                  style={{
                    padding: px(16),
                    borderLeft: `4px solid ${template.active ? '#2E7D32' : '#546E7A'}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => openEditModal(template)}
                >
                  <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...row(8), marginBottom: px(4) }}>
                        <span style={{ fontSize: px(16) }}>
                          {CHANNEL_LABELS[template.channel]}
                        </span>
                        <span style={{ fontSize: px(14), fontWeight: 600 }}>
                          {template.name}
                        </span>
                        <span style={{
                          padding: `${px(2)} ${px(8)}`,
                          borderRadius: px(12),
                          fontSize: px(11),
                          fontWeight: 600,
                          backgroundColor: '#E3F2FD',
                          color: '#1565C0'
                        }}>
                          {TYPE_LABELS[template.type]}
                        </span>
                        {!template.active && (
                          <span style={{
                            padding: `${px(2)} ${px(8)}`,
                            borderRadius: px(12),
                            fontSize: px(11),
                            fontWeight: 600,
                            backgroundColor: '#ECEFF1',
                            color: '#546E7A'
                          }}>
                            Inativo
                          </span>
                        )}
                      </div>

                      {template.subject && (
                        <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(4) }}>
                          <strong>Assunto:</strong> {template.subject}
                        </div>
                      )}

                      <div style={{
                        fontSize: px(13),
                        color: theme.colors.textPrimary,
                        padding: px(8),
                        background: '#f8fafc',
                        borderRadius: px(4),
                        maxHeight: px(60),
                        overflow: 'hidden'
                      }}>
                        {template.bodyText}
                      </div>

                      {template.variables.length > 0 && (
                        <div style={{ marginTop: px(8), ...row(4), flexWrap: 'wrap' }}>
                          {template.variables.map((variable) => (
                            <span
                              key={variable}
                              style={{
                                padding: `${px(2)} ${px(6)}`,
                                borderRadius: px(4),
                                fontSize: px(11),
                                backgroundColor: '#FFF3E0',
                                color: '#E65100'
                              }}
                            >
                              {`{{${variable}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', minWidth: px(100) }}>
                      <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                        {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                      </div>
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

      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingTemplate ? 'Editar Template' : 'Novo Template'}
        >
          <div style={{ display: 'grid', gap: px(16) }}>
            <Input
              label="Nome do Template"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Lembrete de Consulta"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(12) }}>
              <Select
                label="Tipo"
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as NotificationType }))}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>

              <Select
                label="Canal"
                value={formData.channel}
                onChange={(e) => setFormData((prev) => ({ ...prev, channel: e.target.value as NotificationChannel }))}
              >
                {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>

            {formData.channel === 'email' && (
              <Input
                label="Assunto"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Assunto do email"
              />
            )}

            <div>
              <label style={{ display: 'block', marginBottom: px(4), fontSize: px(14), fontWeight: 500 }}>
                Corpo da Mensagem
              </label>
              <textarea
                value={formData.bodyText}
                onChange={(e) => setFormData((prev) => ({ ...prev, bodyText: e.target.value }))}
                placeholder="Use {{variavel}} para inserir dados dinâmicos"
                rows={6}
                style={{
                  width: '100%',
                  padding: px(12),
                  borderRadius: px(8),
                  border: `1px solid ${theme.colors.border}`,
                  fontSize: px(14),
                  resize: 'vertical'
                }}
              />
              <div style={{ fontSize: px(12), color: theme.colors.textSecondary, marginTop: px(4) }}>
                Variáveis disponíveis: {'{{patient_name}}, {{appointment_date}}, {{appointment_time}}, {{clinic_name}}'}
              </div>
            </div>

            {formData.channel === 'email' && (
              <div>
                <label style={{ display: 'block', marginBottom: px(4), fontSize: px(14), fontWeight: 500 }}>
                  Corpo HTML (opcional)
                </label>
                <textarea
                  value={formData.bodyHtml}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bodyHtml: e.target.value }))}
                  placeholder="<h1>Olá {{patient_name}}</h1>"
                  rows={6}
                  style={{
                    width: '100%',
                    padding: px(12),
                    borderRadius: px(8),
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: px(14),
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <span style={{ fontSize: px(14) }}>Template ativo</span>
            </label>

            <div style={{ ...row(8), justifyContent: 'flex-end', marginTop: px(8) }}>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSave} isLoading={saving}>
                {editingTemplate ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

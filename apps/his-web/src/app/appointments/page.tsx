'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ApiError,
  listAppointments,
  createAppointment,
  updateAppointment,
  cancelAppointment,
  startEncounterFromAppointment,
  type AppointmentRecord,
  type AppointmentStatus,
  type AppointmentType,
  type AppointmentCreateInput
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection, Pagination } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { px, row, theme } from '@/lib/theme';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  in_progress: 'Em atendimento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu'
};

const STATUS_COLORS: Record<AppointmentStatus, { bg: string; fg: string }> = {
  scheduled: { bg: '#E3F2FD', fg: '#1565C0' },
  confirmed: { bg: '#E8F5E9', fg: '#2E7D32' },
  in_progress: { bg: '#FFF3E0', fg: '#E65100' },
  completed: { bg: '#F3E5F5', fg: '#6A1B9A' },
  cancelled: { bg: '#FFEBEE', fg: '#C62828' },
  no_show: { bg: '#ECEFF1', fg: '#546E7A' }
};

const TYPE_LABELS: Record<AppointmentType, string> = {
  consultation: 'Consulta',
  vaccination: 'Vacinação',
  surgery: 'Cirurgia',
  exam: 'Exame',
  return: 'Retorno',
  other: 'Outro'
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AppointmentsPage() {
  const router = useRouter();
  const [data, setData] = useState<AppointmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().slice(0, 10));
  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateFrom = dateFilter ? `${dateFilter}T00:00:00Z` : undefined;
      const dateTo = dateFilter ? `${dateFilter}T23:59:59Z` : undefined;
      const response = await listAppointments({
        page,
        pageSize,
        status: statusFilter ? (statusFilter as AppointmentStatus) : undefined,
        dateFrom,
        dateTo
      });
      setData(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro desconhecido', 500, null));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    setActionLoading(id);
    try {
      await cancelAppointment(id);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao cancelar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEncounter = async (id: string) => {
    setActionLoading(id);
    try {
      const result = await startEncounterFromAppointment(id);
      router.push(`/encounters/${result.encounterId}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao iniciar atendimento');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createAppointment({
        patientId: form.get('patientId') as string,
        ownerId: form.get('ownerId') as string,
        professionalUserId: form.get('professionalUserId') as string,
        startAt: new Date(`${form.get('date')}T${form.get('startTime')}`).toISOString(),
        endAt: new Date(`${form.get('date')}T${form.get('endTime')}`).toISOString(),
        type: (form.get('type') as AppointmentType) || 'consultation',
        notes: form.get('notes') as string || undefined
      });
      setCreateOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar agendamento');
    }
  };

  return (
    <ListPageLayout>
      <PageHeader
        title="Agenda"
        description="Agendamentos e consultas"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}>Novo Agendamento</Button>}
      />

      <Card style={{ padding: px(16), display: 'flex', gap: px(12), alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          aria-label="Filtrar por data"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <div style={{ marginLeft: 'auto', color: theme.colors.textSecondary, fontSize: px(14) }}>
          {total} agendamento{total !== 1 ? 's' : ''}
        </div>
      </Card>

      {error && <ErrorBanner title="Erro ao carregar agenda" message={error.message} requestId={error.requestId} onRetry={fetchData} />}
      {loading && !error && <LoadingState message="Carregando agenda..." />}

      {!loading && !error && data.length === 0 && (
        <EmptyState
          title="Nenhum agendamento encontrado"
          description={dateFilter ? `Sem agendamentos para ${formatDate(dateFilter + 'T12:00:00Z')}` : 'Crie o primeiro agendamento.'}
          action={<Button variant="primary" onClick={() => setCreateOpen(true)}>Criar Agendamento</Button>}
        />
      )}

      {!loading && !error && data.length > 0 && (
        <ContentSection>
          {data.map((apt) => {
            const statusColor = STATUS_COLORS[apt.status];
            return (
              <Card key={apt.id} style={{ padding: px(16) }}>
                <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...row(8), alignItems: 'center' }}>
                      <h3 style={{ fontSize: px(16), fontWeight: 600, margin: 0 }}>{formatTime(apt.startAt)} - {formatTime(apt.endAt)}</h3>
                      <span style={{ fontSize: px(12), borderRadius: px(999), padding: `${px(2)} ${px(8)}`, background: statusColor.bg, color: statusColor.fg }}>
                        {STATUS_LABELS[apt.status]}
                      </span>
                      <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                        {TYPE_LABELS[apt.type]}
                      </span>
                    </div>
                    {apt.notes && <p style={{ margin: `${px(4)} 0 0`, fontSize: px(14), color: theme.colors.textSecondary }}>{apt.notes}</p>}
                  </div>
                  <div style={{ ...row(8) }}>
                    {apt.status === 'scheduled' && (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => handleStartEncounter(apt.id)} disabled={actionLoading === apt.id}>
                          Iniciar Atendimento
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleCancel(apt.id)} disabled={actionLoading === apt.id}>
                          Cancelar
                        </Button>
                      </>
                    )}
                    {apt.status === 'confirmed' && (
                      <Button variant="secondary" size="sm" onClick={() => handleStartEncounter(apt.id)} disabled={actionLoading === apt.id}>
                        Iniciar Atendimento
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </ContentSection>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Novo Agendamento">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="patientId" placeholder="ID do Paciente" required />
          <Input name="ownerId" placeholder="ID do Tutor" required />
          <Input name="professionalUserId" placeholder="ID do Profissional" required />
          <Input name="date" type="date" required />
          <div style={{ ...row(8) }}>
            <Input name="startTime" type="time" required placeholder="Início" />
            <Input name="endTime" type="time" required placeholder="Fim" />
          </div>
          <Select name="type" defaultValue="consultation">
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input name="notes" placeholder="Observações (opcional)" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Criar</Button>
          </div>
        </form>
      </Modal>
    </ListPageLayout>
  );
}

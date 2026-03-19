'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  listAvailability,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  type AvailabilityRecord,
  type AvailabilityCreateInput
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { px, row, theme } from '@/lib/theme';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

const DAY_COLORS: Record<number, string> = {
  0: '#C62828',
  1: '#1565C0',
  2: '#2E7D32',
  3: '#6A1B9A',
  4: '#E65100',
  5: '#F57F17',
  6: '#C62828'
};

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export default function AvailabilityPage() {
  const [data, setData] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [professionalFilter, setProfessionalFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AvailabilityRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listAvailability({
        professionalUserId: professionalFilter || undefined,
        pageSize: 100
      });
      setData(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro desconhecido', 500, null));
    } finally {
      setLoading(false);
    }
  }, [professionalFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by professional
  const groupedByProfessional = data.reduce<Record<string, AvailabilityRecord[]>>((acc, item) => {
    const key = item.professionalUserId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createAvailability({
        professionalUserId: form.get('professionalUserId') as string,
        dayOfWeek: parseInt(form.get('dayOfWeek') as string),
        startTime: form.get('startTime') as string,
        endTime: form.get('endTime') as string,
        slotDurationMinutes: parseInt(form.get('slotDurationMinutes') as string) || 30,
        notes: form.get('notes') as string || undefined
      });
      setCreateOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar disponibilidade');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const form = new FormData(e.currentTarget);
    try {
      await updateAvailability(editingItem.id, {
        startTime: form.get('startTime') as string,
        endTime: form.get('endTime') as string,
        slotDurationMinutes: parseInt(form.get('slotDurationMinutes') as string) || 30,
        notes: form.get('notes') as string || undefined
      });
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao atualizar disponibilidade');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvailability(id);
      setDeleteConfirm(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao excluir disponibilidade');
    }
  };

  return (
    <ListPageLayout>
      <PageHeader
        title="Disponibilidade"
        description="Configurar horários de atendimento dos profissionais"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}>Nova Disponibilidade</Button>}
      />

      {/* Filters */}
      <Card style={{ padding: px(16), display: 'flex', gap: px(12), alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Input
          label="Filtrar por profissional (ID)"
          value={professionalFilter}
          onChange={(e) => setProfessionalFilter(e.target.value)}
          placeholder="UUID do profissional..."
        />
        <Button variant="secondary" onClick={fetchData} isLoading={loading}>
          Buscar
        </Button>
        <div style={{ marginLeft: 'auto', color: theme.colors.textSecondary, fontSize: px(13) }}>
          {data.length} registro{data.length !== 1 ? 's' : ''}
        </div>
      </Card>

      {error && (
        <ErrorBanner
          title="Erro ao carregar disponibilidades"
          message={error.message}
          requestId={error.requestId}
          onRetry={fetchData}
        />
      )}

      {loading && !error && <LoadingState message="Carregando disponibilidades..." />}

      {!loading && !error && data.length === 0 && (
        <EmptyState
          title="Nenhuma disponibilidade cadastrada"
          description="Configure os horários de atendimento dos profissionais."
          action={<Button variant="primary" onClick={() => setCreateOpen(true)}>Criar Disponibilidade</Button>}
        />
      )}

      {!loading && !error && data.length > 0 && (
        <ContentSection>
          {/* Weekly Calendar View */}
          <Card style={{ padding: px(20) }}>
            <h3 style={{ margin: 0, marginBottom: px(16), fontSize: px(16) }}>📅 Grade Semanal</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: px(8) }}>
              {DAYS_OF_WEEK.map((day) => {
                const daySlots = data.filter(a => a.dayOfWeek === day.value);
                return (
                  <div key={day.value} style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: px(theme.radius.md),
                    padding: px(12),
                    minHeight: px(120)
                  }}>
                    <div style={{
                      fontSize: px(13),
                      fontWeight: 600,
                      color: DAY_COLORS[day.value],
                      marginBottom: px(8),
                      textAlign: 'center'
                    }}>
                      {day.label.slice(0, 3)}
                    </div>
                    {daySlots.length === 0 ? (
                      <div style={{ fontSize: px(11), color: theme.colors.textSecondary, textAlign: 'center' }}>
                        —
                      </div>
                    ) : (
                      daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          onClick={() => setEditingItem(slot)}
                          style={{
                            fontSize: px(11),
                            padding: px(4),
                            marginBottom: px(4),
                            background: `${DAY_COLORS[day.value]}15`,
                            borderRadius: px(4),
                            cursor: 'pointer',
                            borderLeft: `3px solid ${DAY_COLORS[day.value]}`
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</div>
                          <div style={{ color: theme.colors.textSecondary }}>{slot.slotDurationMinutes}min</div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* List View */}
          <Card style={{ padding: px(20), marginTop: px(16) }}>
            <h3 style={{ margin: 0, marginBottom: px(16), fontSize: px(16) }}>📋 Lista Detalhada</h3>
            {Object.entries(groupedByProfessional).map(([professionalId, slots]) => (
              <div key={professionalId} style={{ marginBottom: px(20) }}>
                <div style={{
                  fontSize: px(14),
                  fontWeight: 600,
                  color: theme.colors.textPrimary,
                  marginBottom: px(8),
                  padding: px(8),
                  background: theme.colors.surface,
                  borderRadius: px(theme.radius.sm)
                }}>
                  👤 Profissional: {professionalId.slice(0, 8)}...
                </div>
                {slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((slot) => (
                  <div key={slot.id} style={{
                    padding: px(12),
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontWeight: 600,
                        color: DAY_COLORS[slot.dayOfWeek],
                        marginRight: px(12)
                      }}>
                        {DAYS_OF_WEEK[slot.dayOfWeek]?.label}
                      </span>
                      <span style={{ color: theme.colors.textPrimary }}>
                        {formatTime(slot.startTime)} — {formatTime(slot.endTime)}
                      </span>
                      <span style={{ color: theme.colors.textSecondary, marginLeft: px(12), fontSize: px(13) }}>
                        ({slot.slotDurationMinutes}min por slot)
                      </span>
                    </div>
                    <div style={{ ...row(8) }}>
                      <Button variant="secondary" size="sm" onClick={() => setEditingItem(slot)}>
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(slot.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </ContentSection>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nova Disponibilidade">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="professionalUserId" placeholder="ID do Profissional (UUID)" required />
          <Select name="dayOfWeek" required>
            <option value="">Selecione o dia da semana</option>
            {DAYS_OF_WEEK.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </Select>
          <div style={{ ...row(8) }}>
            <Input name="startTime" type="time" required label="Início" />
            <Input name="endTime" type="time" required label="Fim" />
          </div>
          <Input name="slotDurationMinutes" type="number" placeholder="Duração do slot (minutos)" defaultValue="30" min="5" max="120" required />
          <Input name="notes" placeholder="Observações (opcional)" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Disponibilidade">
        {editingItem && (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
            <div style={{ padding: px(12), background: theme.colors.surface, borderRadius: px(theme.radius.sm) }}>
              <span style={{ fontWeight: 600, color: DAY_COLORS[editingItem.dayOfWeek] }}>
                {DAYS_OF_WEEK[editingItem.dayOfWeek]?.label}
              </span>
            </div>
            <div style={{ ...row(8) }}>
              <Input name="startTime" type="time" required label="Início" defaultValue={editingItem.startTime} />
              <Input name="endTime" type="time" required label="Fim" defaultValue={editingItem.endTime} />
            </div>
            <Input name="slotDurationMinutes" type="number" defaultValue={String(editingItem.slotDurationMinutes)} min="5" max="120" required />
            <Input name="notes" placeholder="Observações (opcional)" defaultValue={editingItem.notes || ''} />
            <div style={{ ...row(8), justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button variant="primary" type="submit">Salvar</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão">
        <p style={{ color: theme.colors.textSecondary }}>
          Tem certeza que deseja excluir esta disponibilidade? Esta ação não pode ser desfeita.
        </p>
        <div style={{ ...row(8), justifyContent: 'flex-end', marginTop: px(16) }}>
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="primary" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
        </div>
      </Modal>
    </ListPageLayout>
  );
}

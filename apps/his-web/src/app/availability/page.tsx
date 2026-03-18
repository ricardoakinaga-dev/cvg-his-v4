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

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DAY_COLORS = ['#C62828', '#1565C0', '#2E7D32', '#6A1B9A', '#E65100', '#00838F', '#C62828'];

export default function AvailabilityPage() {
  const [data, setData] = useState<AvailabilityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AvailabilityRecord | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await listAvailability({ pageSize: 100 });
      setData(r.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro', 500, null));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createAvailability({
        professionalUserId: form.get('professionalUserId') as string,
        dayOfWeek: parseInt(form.get('dayOfWeek') as string),
        startTime: form.get('startTime') as string,
        endTime: form.get('endTime') as string,
        slotDurationMinutes: parseInt(form.get('slotDuration') as string) || 30,
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
        slotDurationMinutes: parseInt(form.get('slotDuration') as string) || 30,
        notes: form.get('notes') as string || undefined
      });
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao atualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta disponibilidade?')) return;
    try {
      await deleteAvailability(id);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao remover');
    }
  };

  // Group by day of week
  const grouped = data.reduce((acc, item) => {
    if (!acc[item.dayOfWeek]) acc[item.dayOfWeek] = [];
    acc[item.dayOfWeek].push(item);
    return acc;
  }, {} as Record<number, AvailabilityRecord[]>);

  return (
    <ListPageLayout>
      <PageHeader
        title="Disponibilidade"
        description="Horários de atendimento por profissional"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}>Nova Disponibilidade</Button>}
      />

      {error && <ErrorBanner title="Erro" message={error.message} requestId={error.requestId} onRetry={fetchData} />}
      {loading && <LoadingState message="Carregando disponibilidades..." />}

      {!loading && !error && data.length === 0 && (
        <EmptyState
          title="Nenhuma disponibilidade cadastrada"
          description="Configure os horários de atendimento dos profissionais."
          action={<Button variant="primary" onClick={() => setCreateOpen(true)}>Configurar Disponibilidade</Button>}
        />
      )}

      {!loading && !error && data.length > 0 && (
        <ContentSection>
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const items = grouped[day] || [];
            return (
              <Card key={day} style={{ padding: px(16) }}>
                <h3 style={{ fontSize: px(15), fontWeight: 600, margin: `0 0 ${px(8)}`, color: DAY_COLORS[day] }}>
                  {DAY_NAMES[day]}
                </h3>
                {items.length === 0 ? (
                  <p style={{ fontSize: px(13), color: theme.colors.textSecondary, margin: 0 }}>Sem horários configurados</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ ...row(12), justifyContent: 'space-between', alignItems: 'center', padding: px(8), background: theme.colors.background, borderRadius: px(6) }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{item.startTime.slice(0, 5)} - {item.endTime.slice(0, 5)}</span>
                          <span style={{ marginLeft: px(12), fontSize: px(13), color: theme.colors.textSecondary }}>
                            Slots de {item.slotDurationMinutes}min
                          </span>
                          {item.notes && <span style={{ marginLeft: px(12), fontSize: px(13), color: theme.colors.textSecondary }}>({item.notes})</span>}
                        </div>
                        <div style={{ ...row(8) }}>
                          <Button variant="secondary" size="sm" onClick={() => setEditingItem(item)}>Editar</Button>
                          <Button variant="secondary" size="sm" onClick={() => handleDelete(item.id)}>Remover</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </ContentSection>
      )}

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nova Disponibilidade">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="professionalUserId" placeholder="ID do Profissional" required />
          <Select name="dayOfWeek" required defaultValue="1">
            {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </Select>
          <div style={{ ...row(8) }}>
            <Input name="startTime" type="time" required label="Início" />
            <Input name="endTime" type="time" required label="Fim" />
          </div>
          <Input name="slotDuration" type="number" defaultValue="30" min={5} max={480} label="Duração do slot (minutos)" />
          <Input name="notes" placeholder="Observações (opcional)" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Disponibilidade">
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <p style={{ fontSize: px(14), color: theme.colors.textSecondary }}>
            {editingItem && `${DAY_NAMES[editingItem.dayOfWeek]} — Profissional: ${editingItem.professionalUserId.slice(0, 8)}...`}
          </p>
          <div style={{ ...row(8) }}>
            <Input name="startTime" type="time" required label="Início" defaultValue={editingItem?.startTime.slice(0, 5)} />
            <Input name="endTime" type="time" required label="Fim" defaultValue={editingItem?.endTime.slice(0, 5)} />
          </div>
          <Input name="slotDuration" type="number" min={5} max={480} label="Duração do slot (minutos)" defaultValue={editingItem?.slotDurationMinutes} />
          <Input name="notes" placeholder="Observações (opcional)" defaultValue={editingItem?.notes || ''} />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button variant="primary" type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </ListPageLayout>
  );
}

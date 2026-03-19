'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  listExamOrders,
  createExamOrder,
  type ExamOrderRecord,
  type ExamOrderStatus,
  type ExamCategory
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { px, row, theme } from '@/lib/theme';

const ORDER_STATUS_LABELS: Record<ExamOrderStatus, string> = {
  requested: 'Solicitado',
  collected: 'Coletado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const ORDER_STATUS_COLORS: Record<ExamOrderStatus, { bg: string; fg: string }> = {
  requested: { bg: '#E3F2FD', fg: '#1565C0' },
  collected: { bg: '#FFF3E0', fg: '#E65100' },
  in_progress: { bg: '#FFF8E1', fg: '#F57F17' },
  completed: { bg: '#E8F5E9', fg: '#2E7D32' },
  cancelled: { bg: '#FFEBEE', fg: '#C62828' }
};

const CATEGORY_LABELS: Record<ExamCategory, string> = {
  laboratory: 'Laboratório',
  imaging: 'Imagem',
  other: 'Outro'
};

const PRIORITY_LABELS: Record<string, string> = {
  routine: 'Rotina',
  urgent: 'Urgente',
  stat: 'STAT'
};

interface EncounterExamsTabProps {
  encounterId: string;
  patientId: string;
}

export function EncounterExamsTab({ encounterId, patientId }: EncounterExamsTabProps) {
  const [orders, setOrders] = useState<ExamOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listExamOrders({
        encounterId,
        pageSize: 50
      });
      setOrders(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar exames');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createExamOrder({
        patientId,
        encounterId,
        examName: form.get('examName') as string,
        examCode: form.get('examCode') as string || undefined,
        category: (form.get('category') as ExamCategory) || 'laboratory',
        priority: form.get('priority') as string || 'routine',
        notes: form.get('notes') as string || undefined
      });
      setCreateOpen(false);
      await fetchOrders();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar pedido de exame');
    }
  };

  if (loading) return <LoadingState message="Carregando exames..." />;

  return (
    <div style={{ padding: px(16) }}>
      <div style={{ ...row(12), justifyContent: 'space-between', marginBottom: px(16) }}>
        <h3 style={{ margin: 0, fontSize: px(16) }}>🔬 Exames do Atendimento</h3>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          Solicitar Exame
        </Button>
      </div>

      {error && (
        <Card style={{ padding: px(16), borderColor: theme.colors.warning }}>
          <p style={{ color: theme.colors.warning, margin: 0 }}>{error}</p>
        </Card>
      )}

      {orders.length === 0 && !error && (
        <EmptyState
          title="Nenhum exame solicitado"
          description="Solicite exames para este atendimento."
          action={<Button variant="primary" onClick={() => setCreateOpen(true)}>Solicitar Exame</Button>}
        />
      )}

      {orders.length > 0 && (
        <div style={{ display: 'grid', gap: px(12) }}>
          {orders.map((order) => {
            const statusColor = ORDER_STATUS_COLORS[order.status];
            return (
              <Card key={order.id} style={{ padding: px(16) }}>
                <div style={{ ...row(12), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...row(8), alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: px(15) }}>{order.examName}</span>
                      <span style={{
                        fontSize: px(11),
                        borderRadius: px(999),
                        padding: `${px(2)} ${px(8)}`,
                        background: statusColor.bg,
                        color: statusColor.fg
                      }}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div style={{ ...row(16), marginTop: px(6), color: theme.colors.textSecondary, fontSize: px(13), flexWrap: 'wrap' }}>
                      <span>{CATEGORY_LABELS[order.category]}</span>
                      <span>Prioridade: {PRIORITY_LABELS[order.priority] || order.priority}</span>
                      {order.examCode && <span>Código: {order.examCode}</span>}
                    </div>
                    {order.notes && (
                      <p style={{ margin: `${px(8)} 0 0`, fontSize: px(13), color: theme.colors.textSecondary }}>
                        {order.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                    {new Date(order.requestedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Exam Order Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Solicitar Exame">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="examName" placeholder="Nome do exame" required />
          <Input name="examCode" placeholder="Código do exame (opcional)" />
          <Select name="category" defaultValue="laboratory">
            <option value="laboratory">Laboratório</option>
            <option value="imaging">Imagem</option>
            <option value="other">Outro</option>
          </Select>
          <Select name="priority" defaultValue="routine">
            <option value="routine">Rotina</option>
            <option value="urgent">Urgente</option>
            <option value="stat">STAT</option>
          </Select>
          <Input name="notes" placeholder="Observações (opcional)" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Solicitar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

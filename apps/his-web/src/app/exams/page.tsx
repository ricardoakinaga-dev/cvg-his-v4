'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  listExamOrders,
  listExamResults,
  createExamOrder,
  createExamResult,
  updateExamOrder,
  updateExamResult,
  type ExamOrderRecord,
  type ExamResultRecord,
  type ExamOrderStatus,
  type ExamResultStatus,
  type ExamCategory
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

const RESULT_STATUS_LABELS: Record<ExamResultStatus, string> = {
  draft: 'Rascunho',
  review_required: 'Em revisão',
  approved: 'Aprovado',
  released: 'Liberado',
  cancelled: 'Cancelado'
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

type TabType = 'orders' | 'results';

export default function ExamsPage() {
  const [tab, setTab] = useState<TabType>('orders');
  const [orders, setOrders] = useState<ExamOrderRecord[]>([]);
  const [results, setResults] = useState<ExamResultRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState<string | null>(null); // examOrderId
  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await listExamOrders({
        page, pageSize,
        status: statusFilter ? (statusFilter as ExamOrderStatus) : undefined,
        category: categoryFilter ? (categoryFilter as ExamCategory) : undefined
      });
      setOrders(r.data); setTotal(r.total);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro', 500, null));
    } finally { setLoading(false); }
  }, [page, statusFilter, categoryFilter]);

  const fetchResults = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await listExamResults({
        page, pageSize,
        status: statusFilter ? (statusFilter as ExamResultStatus) : undefined,
        category: categoryFilter ? (categoryFilter as ExamCategory) : undefined
      });
      setResults(r.data); setTotal(r.total);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro', 500, null));
    } finally { setLoading(false); }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    if (tab === 'orders') fetchOrders(); else fetchResults();
  }, [tab, fetchOrders, fetchResults]);

  const totalPages = Math.ceil(total / pageSize);

  const handleCreateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createExamOrder({
        patientId: form.get('patientId') as string,
        examName: form.get('examName') as string,
        examCode: form.get('examCode') as string || undefined,
        category: (form.get('category') as ExamCategory) || 'laboratory',
        priority: form.get('priority') as 'routine' | 'urgent' | 'stat' || 'routine',
        notes: form.get('notes') as string || undefined
      });
      setCreateOrderOpen(false);
      await fetchOrders();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar pedido');
    }
  };

  const handleCreateResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createExamResult({
        examOrderId: resultModalOpen!,
        findings: form.get('findings') as string,
        interpretation: form.get('interpretation') as string || undefined,
        resultValues: form.get('resultValues') as string || undefined,
        notes: form.get('notes') as string || undefined
      });
      setResultModalOpen(null);
      setTab('results');
      await fetchResults();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar laudo');
    }
  };

  const handleReleaseResult = async (id: string) => {
    try {
      await updateExamResult(id, { status: 'released' });
      await fetchResults();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao liberar laudo');
    }
  };

  const handleCompleteOrder = async (id: string) => {
    try {
      await updateExamOrder(id, { status: 'completed' });
      await fetchOrders();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao concluir pedido');
    }
  };

  return (
    <ListPageLayout>
      <PageHeader
        title="Exames"
        description="Pedidos de exame e laudos"
        actions={<Button variant="primary" onClick={() => setCreateOrderOpen(true)}>Novo Pedido</Button>}
      />

      {/* Tabs */}
      <div style={{ ...row(0), borderBottom: `1px solid ${theme.colors.border}` }}>
        {(['orders', 'results'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(1); }}
            style={{
              padding: `${px(12)} ${px(24)}`,
              border: 'none',
              background: 'none',
              borderBottom: tab === t ? `2px solid ${theme.colors.primary}` : '2px solid transparent',
              color: tab === t ? theme.colors.primary : theme.colors.textSecondary,
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              fontSize: px(14)
            }}
          >
            {t === 'orders' ? 'Pedidos' : 'Laudos'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ padding: px(16), display: 'flex', gap: px(12), alignItems: 'center', flexWrap: 'wrap' }}>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">Todos os status</option>
          {Object.entries(tab === 'orders' ? ORDER_STATUS_LABELS : RESULT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>
        <div style={{ marginLeft: 'auto', color: theme.colors.textSecondary, fontSize: px(14) }}>{total} registro{total !== 1 ? 's' : ''}</div>
      </Card>

      {error && <ErrorBanner title="Erro" message={error.message} requestId={error.requestId} onRetry={tab === 'orders' ? fetchOrders : fetchResults} />}
      {loading && <LoadingState message="Carregando..." />}

      {/* Orders List */}
      {!loading && !error && tab === 'orders' && orders.length === 0 && (
        <EmptyState title="Nenhum pedido encontrado" description="Crie o primeiro pedido de exame." action={<Button variant="primary" onClick={() => setCreateOrderOpen(true)}>Novo Pedido</Button>} />
      )}

      {!loading && !error && tab === 'orders' && orders.length > 0 && (
        <ContentSection>
          {orders.map((order) => {
            const sc = ORDER_STATUS_COLORS[order.status];
            return (
              <Card key={order.id} style={{ padding: px(16) }}>
                <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...row(8), alignItems: 'center' }}>
                      <h3 style={{ fontSize: px(16), fontWeight: 600, margin: 0 }}>{order.examName}</h3>
                      <span style={{ fontSize: px(12), borderRadius: px(999), padding: `${px(2)} ${px(8)}`, background: sc.bg, color: sc.fg }}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                      <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{CATEGORY_LABELS[order.category]}</span>
                      <span style={{ fontSize: px(12), color: order.priority === 'urgent' || order.priority === 'stat' ? '#C62828' : theme.colors.textSecondary }}>
                        {PRIORITY_LABELS[order.priority]}
                      </span>
                    </div>
                    <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginTop: px(4) }}>
                      Solicitado: {formatDate(order.requestedAt)}
                      {order.examCode && ` • Código: ${order.examCode}`}
                    </div>
                    {order.notes && <p style={{ margin: `${px(4)} 0 0`, fontSize: px(14), color: theme.colors.textSecondary }}>{order.notes}</p>}
                  </div>
                  <div style={{ ...row(8) }}>
                    {order.status === 'requested' && (
                      <Button variant="secondary" size="sm" onClick={() => handleCompleteOrder(order.id)}>Concluir</Button>
                    )}
                    {(order.status === 'completed' || order.status === 'requested') && (
                      <Button variant="primary" size="sm" onClick={() => setResultModalOpen(order.id)}>Registrar Laudo</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </ContentSection>
      )}

      {/* Results List */}
      {!loading && !error && tab === 'results' && results.length === 0 && (
        <EmptyState title="Nenhum laudo encontrado" description="Laudos aparecem quando você registra resultados de exames." />
      )}

      {!loading && !error && tab === 'results' && results.length > 0 && (
        <ContentSection>
          {results.map((result) => (
            <Card key={result.id} style={{ padding: px(16) }}>
              <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...row(8), alignItems: 'center' }}>
                    <h3 style={{ fontSize: px(16), fontWeight: 600, margin: 0 }}>{result.examName}</h3>
                    <span style={{ fontSize: px(12), borderRadius: px(999), padding: `${px(2)} ${px(8)}`, background: result.status === 'released' ? '#E8F5E9' : '#FFF3E0', color: result.status === 'released' ? '#2E7D32' : '#E65100' }}>
                      {RESULT_STATUS_LABELS[result.status]}
                    </span>
                  </div>
                  {result.findings && <p style={{ margin: `${px(4)} 0 0`, fontSize: px(14) }}><strong>Achados:</strong> {result.findings}</p>}
                  {result.interpretation && <p style={{ margin: `${px(4)} 0 0`, fontSize: px(14), color: theme.colors.textSecondary }}><strong>Interpretação:</strong> {result.interpretation}</p>}
                  <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginTop: px(4) }}>Solicitado: {formatDate(result.requestedAt)}</div>
                </div>
                <div style={{ ...row(8) }}>
                  {(result.status === 'draft' || result.status === 'approved') && (
                    <Button variant="primary" size="sm" onClick={() => handleReleaseResult(result.id)}>Liberar</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </ContentSection>
      )}

      {/* Create Order Modal */}
      <Modal isOpen={createOrderOpen} onClose={() => setCreateOrderOpen(false)} title="Novo Pedido de Exame">
        <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="patientId" placeholder="ID do Paciente" required />
          <Input name="examName" placeholder="Nome do Exame (ex: Hemograma)" required />
          <Input name="examCode" placeholder="Código (opcional)" />
          <Select name="category" defaultValue="laboratory">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select name="priority" defaultValue="routine">
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Input name="notes" placeholder="Observações (opcional)" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreateOrderOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Criar Pedido</Button>
          </div>
        </form>
      </Modal>

      {/* Create Result Modal */}
      <Modal isOpen={!!resultModalOpen} onClose={() => setResultModalOpen(null)} title="Registrar Laudo">
        <form onSubmit={handleCreateResult} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <textarea name="findings" placeholder="Achados do exame" required style={{ padding: px(8), borderRadius: px(4), border: `1px solid ${theme.colors.border}`, minHeight: px(80), fontFamily: 'inherit', fontSize: px(14) }} />
          <textarea name="interpretation" placeholder="Interpretação (opcional)" style={{ padding: px(8), borderRadius: px(4), border: `1px solid ${theme.colors.border}`, minHeight: px(60), fontFamily: 'inherit', fontSize: px(14) }} />
          <textarea name="resultValues" placeholder='Valores em JSON (opcional, ex: {"hemacias":5.2})' style={{ padding: px(8), borderRadius: px(4), border: `1px solid ${theme.colors.border}`, minHeight: px(40), fontFamily: 'monospace', fontSize: px(13) }} />
          <Input name="notes" placeholder="Observações (opcional)" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setResultModalOpen(null)}>Cancelar</Button>
            <Button variant="primary" type="submit">Registrar Laudo</Button>
          </div>
        </form>
      </Modal>
    </ListPageLayout>
  );
}

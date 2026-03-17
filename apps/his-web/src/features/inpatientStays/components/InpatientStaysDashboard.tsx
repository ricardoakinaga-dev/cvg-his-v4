'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  getWards,
  listInpatientStays,
  type InpatientStayRecord,
  type WardRecord
} from '../../../lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Primitives';
import { theme, px } from '@/lib/theme';
import { formatDateTime } from '@/features/encounter/utils/helpers';
import { useSmartAutoRefresh } from '@/hooks/useSmartAutoRefresh';
import type { StayViewMode } from '../types';

// Loading Skeleton Component
function StayRowSkeleton() {
  return (
    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
      <td style={{ padding: px(12) }}>
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 16, width: '60%' }} />
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 12, width: '40%', marginTop: 4 }} />
      </td>
      <td style={{ padding: px(12) }}>
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 14, width: '50%' }} />
      </td>
      <td style={{ padding: px(12) }}>
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 20, width: 60 }} />
      </td>
      <td style={{ padding: px(12) }}>
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 14, width: 100 }} />
      </td>
      <td style={{ padding: px(12) }}>
        <div style={{ background: '#e2e8f0', borderRadius: 4, height: 28, width: 80 }} />
      </td>
    </tr>
  );
}

function KanbanCardSkeleton() {
  return (
    <Card style={{ padding: px(12), opacity: 0.7 }}>
      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 16, width: '70%', marginBottom: 8 }} />
      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 12, width: '50%', marginBottom: 8 }} />
      <div style={{ background: '#e2e8f0', borderRadius: 4, height: 20, width: 60 }} />
    </Card>
  );
}

// Error State Component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card style={{ 
      padding: px(40), 
      textAlign: 'center', 
      borderColor: theme.colors.danger,
      background: '#fef2f2'
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h3 style={{ margin: '0 0 8px 0', color: theme.colors.danger }}>Erro ao carregar internações</h3>
      <p style={{ margin: '0 0 16px 0', color: theme.colors.textSecondary }}>{message}</p>
      <Button onClick={onRetry}>Tentar Novamente</Button>
    </Card>
  );
}

// Empty State Component
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <Card style={{ padding: px(40), textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
      <h3 style={{ margin: '0 0 8px 0' }}>Nenhuma internação encontrada</h3>
      <p style={{ margin: '0 0 16px 0', color: theme.colors.textSecondary }}>
        {hasFilters 
          ? 'Tente ajustar os filtros para ver mais resultados.'
          : 'Não há pacientes internados no momento.'}
      </p>
      <Link href="/inpatient/bedmap">
        <Button>Ver Mapa de Leitos</Button>
      </Link>
    </Card>
  );
}

// Kanban Column Component
function KanbanColumn({ 
  title, 
  stays, 
  wards, 
  color 
}: { 
  title: string; 
  stays: InpatientStayRecord[]; 
  wards: WardRecord[];
  color: string;
}) {
  return (
    <div style={{ 
      minWidth: px(280), 
      flex: 1,
      display: 'flex', 
      flexDirection: 'column',
      gap: px(12)
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: px(8),
        padding: `${px(8)} ${px(12)}`,
        background: color,
        borderRadius: px(theme.radius.md),
        color: '#fff',
        fontWeight: 600
      }}>
        <span>{title}</span>
        <Badge label={String(stays.length)} variant="neutral" />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(8), flex: 1 }}>
        {stays.map(stay => {
          const wardName = wards.find(w => w.id === stay.wardId)?.name ?? 'Ala desconhecida';
          return (
            <Link 
              key={stay.id} 
              href={`/inpatient/stays/${stay.id}`}
              style={{ textDecoration: 'none' }}
            >
              <Card 
                style={{ 
                  padding: px(12),
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: `1px solid ${theme.colors.border}`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  Paciente: {stay.patientId.slice(0, 8)}...
                </div>
                <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: 8 }}>
                  {wardName} • Leito: {stay.bedId.slice(0, 6)}
                </div>
                <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                  Admissão: {formatDateTime(stay.admittedAt)}
                </div>
              </Card>
            </Link>
          );
        })}
        
        {stays.length === 0 && (
          <div style={{ 
            padding: px(16), 
            textAlign: 'center', 
            color: theme.colors.textSecondary,
            fontSize: px(13),
            background: '#f8fafc',
            borderRadius: px(theme.radius.md),
            border: `1px dashed ${theme.colors.border}`
          }}>
            Nenhum paciente
          </div>
        )}
      </div>
    </div>
  );
}

// Main Dashboard Component
export function InpatientStaysDashboard() {
  // Filter State
  const [status, setStatus] = useState<InpatientStayRecord['status'] | ''>('active');
  const [wardId, setWardId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<StayViewMode>('list');

  // Data State
  const [stays, setStays] = useState<InpatientStayRecord[]>([]);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [total, setTotal] = useState(0);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref for interaction area
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch Wards
  useEffect(() => {
    getWards({ pageSize: 100 })
      .then((res) => setWards(res.data))
      .catch((err) => console.error('Failed to load wards', err));
  }, []);

  // Fetch Stays
  const fetchStays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInpatientStays({
        status: status || undefined,
        wardId: wardId || undefined,
        page,
        pageSize: 20
      });
      setStays(res.data);
      setTotal(res.total);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Falha ao carregar internações.');
    } finally {
      setLoading(false);
    }
  }, [status, wardId, page]);

  // Smart Auto-Refresh
  const { isPaused, nextRefreshIn, refresh, pause, resume, registerInteractionArea } = useSmartAutoRefresh({
    intervalMs: 30000, // 30 seconds
    onRefresh: fetchStays,
    enabled: true
  });

  // Register interaction area
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = registerInteractionArea(containerRef.current);
      return cleanup;
    }
  }, [registerInteractionArea]);

  // Initial Load
  useEffect(() => {
    void fetchStays();
  }, [fetchStays]);

  // Handlers
  const handleApplyFilters = () => {
    setPage(1);
    void fetchStays();
  };

  const handleClearFilters = () => {
    setStatus('');
    setWardId('');
    setPage(1);
  };

  // Group stays by status for Kanban view
  const activeStays = stays.filter(s => s.status === 'active');
  const dischargedStays = stays.filter(s => s.status === 'discharged');
  const transferredStays = stays.filter(s => s.status === 'transferred');

  return (
    <div ref={containerRef} style={{ padding: px(24), maxWidth: px(1400), margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: px(24), display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: px(24), fontWeight: 700, margin: '0 0 8px 0', color: theme.colors.textPrimary }}>
            Internações • Stays
          </h1>
          <p style={{ margin: 0, color: theme.colors.textSecondary }}>
            Gerencie pacientes internados, visualize leitos e acesse o prontuário.
          </p>
        </div>
        
        {/* Auto-refresh indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: px(8), fontSize: px(13), color: theme.colors.textSecondary }}>
          {isPaused ? (
            <span style={{ color: theme.colors.warning }}>⏸️ Pausado</span>
          ) : nextRefreshIn !== null ? (
            <span>🔄 Atualiza em {nextRefreshIn}s</span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={refresh}>
            Atualizar
          </Button>
        </div>
      </header>

      {/* Filters */}
      <Card style={{ padding: px(16), marginBottom: px(24) }}>
        <div style={{ display: 'flex', gap: px(12), alignItems: 'end', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
            <label style={{ fontSize: px(12), fontWeight: 600, color: theme.colors.textSecondary }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: px(theme.radius.sm),
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.surface,
                minWidth: px(150)
              }}
            >
              <option value="">Todos</option>
              <option value="active">Ativos (Internados)</option>
              <option value="discharged">Alta (Discharged)</option>
              <option value="transferred">Transferidos</option>
            </select>
          </div>

          {/* Ward Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
            <label style={{ fontSize: px(12), fontWeight: 600, color: theme.colors.textSecondary }}>Ala / Ward</label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: px(theme.radius.sm),
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.surface,
                minWidth: px(200)
              }}
            >
              <option value="">Todas as Alas</option>
              {wards.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: px(8) }}>
            <Button onClick={handleApplyFilters}>Aplicar</Button>
            <Button variant="secondary" onClick={handleClearFilters}>Limpar</Button>
          </div>

          {/* View Mode Toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: px(4) }}>
            <Button 
              size="sm" 
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
              onClick={() => setViewMode('kanban')}
            >
              📊 Kanban
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading && stays.length === 0 ? (
        viewMode === 'list' ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: px(14) }}>
              <thead style={{ background: theme.colors.pageBg }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}` }}>Paciente</th>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}` }}>Localização</th>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}` }}>Status</th>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}` }}>Admissão</th>
                  <th style={{ textAlign: 'right', padding: px(12), borderBottom: `1px solid ${theme.colors.border}` }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => <StayRowSkeleton key={i} />)}
              </tbody>
            </table>
          </Card>
        ) : (
          <div style={{ display: 'flex', gap: px(16), overflowX: 'auto' }}>
            {['Ativos', 'Alta', 'Transferidos'].map(col => (
              <div key={col} style={{ minWidth: px(280), flex: 1 }}>
                <KanbanCardSkeleton />
                <KanbanCardSkeleton />
                <KanbanCardSkeleton />
              </div>
            ))}
          </div>
        )
      ) : error ? (
        <ErrorState message={error} onRetry={fetchStays} />
      ) : stays.length === 0 ? (
        <EmptyState hasFilters={!!status || !!wardId} />
      ) : viewMode === 'list' ? (
        /* List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: px(14) }}>
              <thead style={{ background: theme.colors.pageBg }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary }}>Paciente</th>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary }}>Localização</th>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary }}>Status</th>
                  <th style={{ textAlign: 'left', padding: px(12), borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary }}>Admissão</th>
                  <th style={{ textAlign: 'right', padding: px(12), borderBottom: `1px solid ${theme.colors.border}`, color: theme.colors.textSecondary }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {stays.map(stay => {
                  const wardName = wards.find(w => w.id === stay.wardId)?.name ?? stay.wardId.slice(0, 8);
                  return (
                    <tr key={stay.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: px(12) }}>
                        <div style={{ fontWeight: 600 }}>{stay.patientId.slice(0, 8)}...</div>
                        <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>ID: {stay.patientId}</div>
                      </td>
                      <td style={{ padding: px(12) }}>
                        <div>{wardName}</div>
                        <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>Bed: {stay.bedId.slice(0, 6)}</div>
                      </td>
                      <td style={{ padding: px(12) }}>
                        <Badge
                          label={stay.status}
                          variant={stay.status === 'active' ? 'success' : stay.status === 'discharged' ? 'neutral' : 'warning'}
                        />
                      </td>
                      <td style={{ padding: px(12) }}>
                        {formatDateTime(stay.admittedAt)}
                      </td>
                      <td style={{ padding: px(12), textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: px(8) }}>
                          <Link href={`/inpatient/stays/${stay.id}`} style={{ textDecoration: 'none' }}>
                            <Button size="sm">Abrir Stay</Button>
                          </Link>

                          {stay.encounterId && (
                            <Link href={`/encounters/${stay.encounterId}`} style={{ textDecoration: 'none' }}>
                              <Button size="sm" variant="secondary" title="Ver Prontuário">Case</Button>
                            </Link>
                          )}

                          <Link href={`/patients/${stay.patientId}`} style={{ textDecoration: 'none' }}>
                            <Button size="sm" variant="secondary" title="Ver Paciente">👤</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span style={{ fontSize: px(14), color: theme.colors.textSecondary }}>
              Página {page} de {Math.ceil(total / 20)} • Total: {total}
            </span>
            <Button
              variant="secondary"
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div style={{ display: 'flex', gap: px(16), overflowX: 'auto', paddingBottom: px(16) }}>
          <KanbanColumn 
            title="Ativos" 
            stays={activeStays} 
            wards={wards} 
            color={theme.colors.success}
          />
          <KanbanColumn 
            title="Alta" 
            stays={dischargedStays} 
            wards={wards} 
            color={theme.colors.textSecondary}
          />
          <KanbanColumn 
            title="Transferidos" 
            stays={transferredStays} 
            wards={wards} 
            color={theme.colors.warning}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listAuditEvents,
  type AuditEvent
} from '../../../../lib/api/admin';
import { usePermission } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';

function AuditDetailModal({
  event,
  isOpen,
  onClose
}: {
  event: AuditEvent | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!event) return null;

  const formatJson = (json: Record<string, unknown> | null) => {
    if (!json) return '-';
    return JSON.stringify(json, null, 2);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Evento">
      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            ID
          </label>
          <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{event.id}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
              Ação
            </label>
            <div style={{ fontSize: '14px' }}>
              <span style={{ padding: '2px 8px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '12px' }}>
                {event.action}
              </span>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
              Data/Hora
            </label>
            <div style={{ fontSize: '14px' }}>
              {new Date(event.createdAt).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
              Tipo de Entidade
            </label>
            <div style={{ fontSize: '14px' }}>{event.entityType}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
              ID da Entidade
            </label>
            <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{event.entityId}</div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Papéis do Ator
          </label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {event.actorRoles.map((role, i) => (
              <span
                key={i}
                style={{
                  padding: '2px 8px',
                  background: '#f3f4f6',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {event.reason && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
              Motivo
            </label>
            <div style={{ fontSize: '14px' }}>{event.reason}</div>
          </div>
        )}

        {event.requestId && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
              Request ID
            </label>
            <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>{event.requestId}</div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Antes (Before)
          </label>
          <pre style={{
            fontSize: '12px',
            background: '#f9fafb',
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            maxHeight: '150px'
          }}>
            {formatJson(event.beforeJson)}
          </pre>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
            Depois (After)
          </label>
          <pre style={{
            fontSize: '12px',
            background: '#f9fafb',
            padding: '12px',
            borderRadius: '6px',
            overflow: 'auto',
            maxHeight: '150px'
          }}>
            {formatJson(event.afterJson)}
          </pre>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <Button variant="secondary" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  );
}

function AuditoriaList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions
  const canRead = usePermission('admin.auditoria.read');

  // State
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  
  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState(searchParams.get('entityType') || '');
  const [actionFilter, setActionFilter] = useState(searchParams.get('action') || '');
  const [startDateFilter, setStartDateFilter] = useState(searchParams.get('startDate') || '');
  const [endDateFilter, setEndDateFilter] = useState(searchParams.get('endDate') || '');
  
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listAuditEvents({
        entityType: entityTypeFilter || undefined,
        action: actionFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        page,
        pageSize
      });
      setEvents(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  }, [page, entityTypeFilter, actionFilter, startDateFilter, endDateFilter, canRead]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (entityTypeFilter) params.set('entityType', entityTypeFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (startDateFilter) params.set('startDate', startDateFilter);
    if (endDateFilter) params.set('endDate', endDateFilter);
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [entityTypeFilter, actionFilter, startDateFilter, endDateFilter, page, router]);

  const handleOpenDetail = (event: AuditEvent) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedEvent(null);
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchData();
  };

  const handleClearFilters = () => {
    setEntityTypeFilter('');
    setActionFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setPage(1);
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar auditoria.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Auditoria</h1>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Histórico de ações realizadas no sistema.
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Tipo de Entidade
              </label>
              <input
                type="text"
                value={entityTypeFilter}
                onChange={(e) => setEntityTypeFilter(e.target.value)}
                placeholder="user, role..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Ação
              </label>
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                placeholder="created, updated..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Data Início
              </label>
              <input
                type="datetime-local"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Data Fim
              </label>
              <input
                type="datetime-local"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={handleApplyFilters}>Filtrar</Button>
              <Button variant="secondary" onClick={handleClearFilters}>Limpar</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Carregando...
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Nenhum evento encontrado.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Data/Hora
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Ação
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Entidade
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Papéis
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {formatDate(event.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {event.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ fontWeight: '500' }}>{event.entityType}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                        {event.entityId.substring(0, 8)}...
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {event.actorRoles.slice(0, 2).map((role, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '2px 8px',
                              background: '#f3f4f6',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {role}
                          </span>
                        ))}
                        {event.actorRoles.length > 2 && (
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            +{event.actorRoles.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenDetail(event)}
                      >
                        Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span style={{ padding: '8px 16px', color: '#6b7280' }}>
            Página {page} de {totalPages} ({total} eventos)
          </span>
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <AuditDetailModal
        event={selectedEvent}
        isOpen={detailModalOpen}
        onClose={handleCloseDetail}
      />
    </div>
  );
}

export default function AuditoriaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Carregando...</div>}>
      <AuditoriaList />
    </Suspense>
  );
}

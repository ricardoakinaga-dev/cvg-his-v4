'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listProtocols, type ProtocolRecord, type ProtocolStatus } from '../../lib/api';
import { usePermission } from '../../lib/rbac';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PERMISSIONS } from '../../lib/rbac';

export default function ProtocolsPage() {
  const router = useRouter();
  const canRead = usePermission(PERMISSIONS.PROTOCOL_READ);
  const canWrite = usePermission(PERMISSIONS.PROTOCOL_WRITE);
  const [protocols, setProtocols] = useState<ProtocolRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProtocolStatus | ''>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    const fetchProtocols = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await listProtocols({
          q: searchQuery || undefined,
          status: statusFilter || undefined,
          page,
          pageSize
        });
        setProtocols(response.data);
        setTotal(response.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load protocols');
      } finally {
        setLoading(false);
      }
    };

    fetchProtocols();
  }, [searchQuery, statusFilter, page, canRead]);

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              You do not have permission to view protocols.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  const getStatusBadge = (status: ProtocolStatus) => {
    const styles: Record<ProtocolStatus, { bg: string; color: string }> = {
      draft: { bg: '#fef3c7', color: '#92400e' },
      published: { bg: '#d1fae5', color: '#065f46' },
      archived: { bg: '#f3f4f6', color: '#374151' }
    };
    const style = styles[status];
    return (
      <span style={{
        padding: '2px 8px',
        fontSize: '12px',
        borderRadius: '9999px',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Protocolos</h1>
        {canWrite && (
          <Button onClick={() => router.push('/protocols/new')}>
            Novo Protocolo
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ padding: '16px', display: 'flex', gap: '16px' }}>
          <input
            type="text"
            placeholder="Buscar por título ou slug..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ProtocolStatus | '');
              setPage(1);
            }}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }}
          >
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <Card style={{ marginBottom: '24px' }}>
          <CardBody>
            <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '16px', borderRadius: '6px' }}>
              {error}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Carregando protocolos...
            </div>
          </CardBody>
        </Card>
      )}

      {/* Protocol List */}
      {!loading && protocols.length === 0 && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Nenhum protocolo encontrado.
            </div>
          </CardBody>
        </Card>
      )}

      {!loading && protocols.length > 0 && (
        <>
          <Card>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Título</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Slug</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Espécie</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Atualizado</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: '#6b7280' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {protocols.map((protocol) => (
                  <tr key={protocol.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 500 }}>{protocol.title}</span>
                      {protocol.description && (
                        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {protocol.description}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', fontFamily: 'monospace' }}>
                      {protocol.slug}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {protocol.species || '-'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(protocol.status)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {new Date(protocol.updatedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => router.push(`/protocols/${protocol.id}`)}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#6b7280' }}>
                Página {page} de {totalPages}
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
        </>
      )}
    </div>
  );
}

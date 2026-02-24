'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  listServices,
  deleteService,
  type Service,
  type ServiceGroup,
  type ServiceSector,
  SERVICE_GROUP_LABELS,
  SERVICE_SECTOR_LABELS
} from '../../../../lib/api/services';
import { usePermission, PERMISSIONS } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

function ServicosList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions
  const canRead = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_READ);
  const canCreate = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_DELETE);

  // State
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState<string>(
    searchParams.get('active') === 'true' ? 'true' : searchParams.get('active') === 'false' ? 'false' : ''
  );
  const [groupFilter, setGroupFilter] = useState<string>(searchParams.get('group') || '');
  const [sectorFilter, setSectorFilter] = useState<string>(searchParams.get('sector') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pageSize = 20;

  const fetchServices = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listServices({
        q: searchQuery || undefined,
        active: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
        group: (groupFilter || undefined) as ServiceGroup | undefined,
        sector: (sectorFilter || undefined) as ServiceSector | undefined,
        page,
        pageSize
      });
      setServices(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, groupFilter, sectorFilter, page, canRead]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (activeFilter) params.set('active', activeFilter);
    if (groupFilter) params.set('group', groupFilter);
    if (sectorFilter) params.set('sector', sectorFilter);
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchQuery, activeFilter, groupFilter, sectorFilter, page, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    setDeleting(id);
    try {
      await deleteService(id);
      setServices(services.filter((s) => s.id !== id));
      setTotal(total - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete service');
    } finally {
      setDeleting(null);
    }
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar serviços.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Serviços</h1>
        {canCreate && (
          <Button onClick={() => router.push('/financeiro/servicos/novo')}>Novo Serviço</Button>
        )}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Buscar
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Código ou nome..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Status
              </label>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Grupo
              </label>
              <select
                value={groupFilter}
                onChange={(e) => {
                  setGroupFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos</option>
                {Object.entries(SERVICE_GROUP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: '150px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Setor
              </label>
              <select
                value={sectorFilter}
                onChange={(e) => {
                  setSectorFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">Todos</option>
                {Object.entries(SERVICE_SECTOR_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Error */}
      {error && (
        <Card style={{ marginBottom: '24px' }}>
          <CardBody>
            <div style={{ color: '#dc2626', textAlign: 'center' }}>{error}</div>
          </CardBody>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
          </CardBody>
        </Card>
      )}

      {/* Table */}
      {!loading && services.length > 0 && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    Código
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    Nome
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    Grupo
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '500' }}>
                    Setor
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                    Preço Base
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '500' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <Link
                        href={`/financeiro/servicos/${service.id}`}
                        style={{ color: '#2563eb', textDecoration: 'none' }}
                      >
                        {service.code}
                      </Link>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{service.name}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6'
                        }}
                      >
                        {SERVICE_GROUP_LABELS[service.group]}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {SERVICE_SECTOR_LABELS[service.sector]}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right' }}>
                      {formatCurrency(service.basePrice)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          backgroundColor: service.active ? '#dcfce7' : '#fee2e2',
                          color: service.active ? '#166534' : '#991b1b'
                        }}
                      >
                        {service.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/financeiro/servicos/${service.id}/editar`)}
                          >
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(service.id)}
                            disabled={deleting === service.id}
                          >
                            {deleting === service.id ? 'Excluindo...' : 'Excluir'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Empty state */}
      {!loading && services.length === 0 && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Nenhum serviço encontrado.
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span style={{ padding: '8px 12px' }}>
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ServicosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Carregando...</div>}>
      <ServicosList />
    </Suspense>
  );
}

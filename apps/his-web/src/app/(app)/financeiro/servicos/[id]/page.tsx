'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getService,
  deleteService,
  type Service,
  SERVICE_GROUP_LABELS,
  SERVICE_SECTOR_LABELS
} from '../../../../../lib/api/services';
import { usePermission, PERMISSIONS } from '../../../../../lib/rbac';
import { Card, CardBody } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';

type PageProps = {
  params: Promise<{ id: string }>;
};

function ServiceDetail({ id }: { id: string }) {
  const router = useRouter();

  // Permissions
  const canRead = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_READ);
  const canUpdate = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_DELETE);

  // State
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    const fetchService = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getService(id);
        setService(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id, canRead]);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    setDeleting(true);
    try {
      await deleteService(id);
      router.push('/financeiro/servicos');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete service');
      setDeleting(false);
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

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value));
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(date));
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link href="/financeiro/servicos" style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Voltar para Serviços
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
          {loading ? 'Carregando...' : service?.name || 'Serviço não encontrado'}
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {canUpdate && service && (
            <Button onClick={() => router.push(`/financeiro/servicos/${id}/editar`)}>Editar</Button>
          )}
          {canDelete && service && (
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          )}
        </div>
      </div>

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

      {/* Service details */}
      {!loading && service && (
        <Card>
          <CardBody>
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Basic info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Código
                  </label>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>{service.code}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Nome
                  </label>
                  <div style={{ fontSize: '16px', fontWeight: '500' }}>{service.name}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Grupo
                  </label>
                  <div style={{ fontSize: '16px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: '#f3f4f6'
                      }}
                    >
                      {SERVICE_GROUP_LABELS[service.group]}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Setor
                  </label>
                  <div style={{ fontSize: '16px' }}>{SERVICE_SECTOR_LABELS[service.sector]}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Preço Base
                  </label>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#059669' }}>
                    {formatCurrency(service.basePrice)}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Duração (minutos)
                  </label>
                  <div style={{ fontSize: '16px' }}>
                    {service.durationMinutes ? `${service.durationMinutes} min` : 'Não definida'}
                  </div>
                </div>
              </div>

              {/* Flags */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Status
                  </label>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: service.active ? '#dcfce7' : '#fee2e2',
                      color: service.active ? '#166534' : '#991b1b'
                    }}
                  >
                    {service.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Requer Laudo
                  </label>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: service.requiresReport ? '#fef3c7' : '#f3f4f6',
                      color: service.requiresReport ? '#92400e' : '#6b7280'
                    }}
                  >
                    {service.requiresReport ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Consome Estoque
                  </label>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '14px',
                      backgroundColor: service.consumesStock ? '#dbeafe' : '#f3f4f6',
                      color: service.consumesStock ? '#1e40af' : '#6b7280'
                    }}
                  >
                    {service.consumesStock ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '16px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #e5e7eb'
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Criado em
                  </label>
                  <div style={{ fontSize: '14px' }}>{formatDate(service.createdAt)}</div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                    Atualizado em
                  </label>
                  <div style={{ fontSize: '14px' }}>{formatDate(service.updatedAt)}</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Not found */}
      {!loading && !service && !error && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Serviço não encontrado.</div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ServiceDetail id={resolvedParams.id} />;
}

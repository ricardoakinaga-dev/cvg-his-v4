'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProduct, type Product } from '../../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../../lib/rbac';
import { Card, CardBody } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { buildUrl } from '../../../../../lib/api/client';

type AuditEvent = {
  id: string;
  action: string;
  actorUserId: string;
  createdAt: string;
  beforeJson: Record<string, unknown> | null;
  afterJson: Record<string, unknown> | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProductDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  
  // Permissions
  const canRead = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_READ);
  const canUpdate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_DELETE);
  const canReadAudit = usePermission(PERMISSIONS.AUDIT_READ);
  
  // State
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'data' | 'audit'>('data');
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProduct(id);
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, canRead]);

  useEffect(() => {
    if (activeTab !== 'audit' || !canReadAudit || !product) return;

    const fetchAudit = async () => {
      setAuditLoading(true);
      try {
        const url = buildUrl(`/audit`, {
          entityType: 'product',
          entityId: product.id,
          pageSize: 50
        });
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load audit');
        const data = await response.json();
        setAuditEvents(data.items || []);
      } catch (err) {
        console.error('Failed to load audit:', err);
      } finally {
        setAuditLoading(false);
      }
    };

    fetchAudit();
  }, [activeTab, canReadAudit, product]);

  const handleDelete = async () => {
    if (!product || !confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      const response = await fetch(buildUrl(`/stock/products/${product.id}`), {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      router.push('/estoque/produtos');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar produtos.
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/estoque/produtos" style={{ color: '#6b7280', textDecoration: 'none' }}>
            ← Voltar
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {loading ? 'Carregando...' : product ? product.name : 'Produto não encontrado'}
          </h1>
        </div>
        {product && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {canUpdate && (
              <Button onClick={() => router.push(`/estoque/produtos/${product.id}/editar`)}>
                Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={handleDelete}>
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: '#ef4444' }}>
          <CardBody>
            <div style={{ color: '#ef4444' }}>{error}</div>
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

      {/* Product Details */}
      {!loading && product && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab('data')}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'data' ? '600' : '400',
                color: activeTab === 'data' ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === 'data' ? '2px solid #2563eb' : 'none'
              }}
            >
              Dados
            </button>
            {canReadAudit && (
              <button
                onClick={() => setActiveTab('audit')}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: activeTab === 'audit' ? '600' : '400',
                  color: activeTab === 'audit' ? '#2563eb' : '#6b7280',
                  borderBottom: activeTab === 'audit' ? '2px solid #2563eb' : 'none'
                }}
              >
                Auditoria
              </button>
            )}
          </div>

          {/* Data Tab */}
          {activeTab === 'data' && (
            <Card>
              <CardBody>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>SKU</label>
                    <div style={{ fontSize: '16px', fontFamily: 'monospace' }}>{product.sku}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Nome</label>
                    <div style={{ fontSize: '16px' }}>{product.name}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Categoria</label>
                    <div style={{ fontSize: '16px' }}>{product.category || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Unidade de Medida</label>
                    <div style={{ fontSize: '16px' }}>{product.uom || '-'}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Custo</label>
                    <div style={{ fontSize: '16px' }}>{formatCurrency(product.cost)}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Preço</label>
                    <div style={{ fontSize: '16px' }}>{formatCurrency(product.price)}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Estoque Mínimo</label>
                    <div style={{ fontSize: '16px' }}>{product.minStock}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Status</label>
                    <span style={{
                      padding: '4px 12px',
                      fontSize: '14px',
                      borderRadius: '9999px',
                      backgroundColor: product.active ? '#d1fae5' : '#f3f4f6',
                      color: product.active ? '#065f46' : '#374151'
                    }}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Controlado</label>
                    <span style={{
                      padding: '4px 12px',
                      fontSize: '14px',
                      borderRadius: '9999px',
                      backgroundColor: product.isControlled ? '#fef3c7' : '#f3f4f6',
                      color: product.isControlled ? '#92400e' : '#374151'
                    }}>
                      {product.isControlled ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Rastreia Lote</label>
                    <span style={{ fontSize: '14px' }}>{product.trackLot ? 'Sim' : 'Não'}</span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Rastreia Validade</label>
                    <span style={{ fontSize: '14px' }}>{product.trackExpiry ? 'Sim' : 'Não'}</span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Criado em</label>
                    <div style={{ fontSize: '14px' }}>{formatDate(product.createdAt)}</div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Atualizado em</label>
                    <div style={{ fontSize: '14px' }}>{formatDate(product.updatedAt)}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <Card>
              <CardBody style={{ padding: 0 }}>
                {auditLoading ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>Carregando auditoria...</div>
                ) : auditEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>Nenhum evento de auditoria encontrado.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Ação</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Data/Hora</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Usuário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.map((event) => (
                        <tr key={event.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                            <span style={{
                              padding: '2px 8px',
                              fontSize: '12px',
                              borderRadius: '4px',
                              backgroundColor: event.action.includes('Created') ? '#d1fae5' : event.action.includes('Deleted') ? '#fee2e2' : '#fef3c7',
                              color: event.action.includes('Created') ? '#065f46' : event.action.includes('Deleted') ? '#991b1b' : '#92400e'
                            }}>
                              {event.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{formatDate(event.createdAt)}</td>
                          <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace', color: '#6b7280' }}>{event.actorUserId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

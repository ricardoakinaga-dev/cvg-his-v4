'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  listStockLots,
  deleteStockLot,
  type StockLot
} from '../../../../lib/api/stock';
import { listProducts, type Product } from '../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

function LotesList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions
  const canRead = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_READ);
  const canCreate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_DELETE);

  // State
  const [lots, setLots] = useState<StockLot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productIdFilter, setProductIdFilter] = useState(searchParams.get('productId') || '');
  const [lotNumberFilter, setLotNumberFilter] = useState(searchParams.get('lotNumber') || '');
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pageSize = 20;

  // Fetch products for filter dropdown
  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await listProducts({ pageSize: 1000, active: true });
        setProducts(response.items);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      }
    }
    fetchProducts();
  }, []);

  const fetchLots = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listStockLots({
        productId: productIdFilter || undefined,
        lotNumber: lotNumberFilter || undefined,
        expiryWithinDays: showExpiringSoon ? 30 : undefined,
        page,
        pageSize
      });
      setLots(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock lots');
    } finally {
      setLoading(false);
    }
  }, [productIdFilter, lotNumberFilter, showExpiringSoon, page, canRead]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (productIdFilter) params.set('productId', productIdFilter);
    if (lotNumberFilter) params.set('lotNumber', lotNumberFilter);
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [productIdFilter, lotNumberFilter, page, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lote?')) return;

    setDeleting(id);
    try {
      await deleteStockLot(id);
      setLots(lots.filter((l) => l.id !== id));
      setTotal(total - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete stock lot');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getExpiryStatus = (lot: StockLot) => {
    if (!lot.expiryDate) return { color: 'gray', text: 'Sem validade' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(lot.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { color: 'red', text: `Vencido há ${Math.abs(diffDays)} dias` };
    }
    if (diffDays <= 30) {
      return { color: 'yellow', text: `Vence em ${diffDays} dias` };
    }
    return { color: 'green', text: formatDate(lot.expiryDate) };
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar lotes.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Lotes de Estoque</h1>
        {canCreate && (
          <Button onClick={() => router.push('/estoque/lotes/novo')}>
            Novo Lote
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}
              >
                Produto
              </label>
              <select
                value={productIdFilter}
                onChange={(e) => {
                  setProductIdFilter(e.target.value);
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
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: '200px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}
              >
                Número do Lote
              </label>
              <input
                type="text"
                value={lotNumberFilter}
                onChange={(e) => {
                  setLotNumberFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showExpiringSoon}
                  onChange={(e) => {
                    setShowExpiringSoon(e.target.checked);
                    setPage(1);
                  }}
                />
                <span style={{ fontSize: '14px' }}>Vencendo em 30 dias</span>
              </label>
            </div>
          </div>
        </CardBody>
      </Card>

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

      {/* Lots Table */}
      {!loading && lots.length > 0 && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb'
                  }}
                >
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    Produto
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    Lote
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    Quantidade
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    Custo
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    Validade
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase'
                    }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => {
                  const expiryStatus = getExpiryStatus(lot);
                  return (
                    <tr key={lot.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <div>
                          <Link
                            href={`/estoque/produtos/${lot.productId}`}
                            style={{ color: '#2563eb', textDecoration: 'none' }}
                          >
                            {lot.productSku}
                          </Link>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>
                          {lot.productName}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace' }}>
                        {lot.lotNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                        {Number(lot.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                        {lot.cost
                          ? Number(lot.cost).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            borderRadius: '9999px',
                            backgroundColor:
                              expiryStatus.color === 'red'
                                ? '#fee2e2'
                                : expiryStatus.color === 'yellow'
                                  ? '#fef3c7'
                                  : expiryStatus.color === 'green'
                                    ? '#d1fae5'
                                    : '#f3f4f6',
                            color:
                              expiryStatus.color === 'red'
                                ? '#991b1b'
                                : expiryStatus.color === 'yellow'
                                  ? '#92400e'
                                  : expiryStatus.color === 'green'
                                    ? '#065f46'
                                    : '#374151'
                          }}
                        >
                          {expiryStatus.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {canUpdate && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => router.push(`/estoque/lotes/${lot.id}/editar`)}
                            >
                              Editar
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(lot.id)}
                              disabled={deleting === lot.id}
                            >
                              {deleting === lot.id ? 'Excluindo...' : 'Excluir'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {!loading && lots.length === 0 && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px' }}>
              Nenhum lote encontrado.
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px'
          }}
        >
          <Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page === 1}>
            Anterior
          </Button>
          <span style={{ padding: '8px 16px', color: '#6b7280' }}>
            Página {page} de {totalPages} ({total} itens)
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LotesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '24px' }}>
          <Card>
            <CardBody>
              <div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
            </CardBody>
          </Card>
        </div>
      }
    >
      <LotesList />
    </Suspense>
  );
}

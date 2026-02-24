'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  listStockMovements,
  type StockMovement
} from '../../../../lib/api/stock';
import { listProducts, type Product } from '../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

function MovimentacoesList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions
  const canRead = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_READ);
  const canCreate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_CREATE);

  // State
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productIdFilter, setProductIdFilter] = useState(searchParams.get('productId') || '');
  const [movementTypeFilter, setMovementTypeFilter] = useState(searchParams.get('type') || '');
  const [startDateFilter, setStartDateFilter] = useState(searchParams.get('startDate') || '');
  const [endDateFilter, setEndDateFilter] = useState(searchParams.get('endDate') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
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

  const fetchMovements = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listStockMovements({
        productId: productIdFilter || undefined,
        movementType: movementTypeFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        page,
        pageSize
      });
      setMovements(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  }, [productIdFilter, movementTypeFilter, startDateFilter, endDateFilter, page, canRead]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (productIdFilter) params.set('productId', productIdFilter);
    if (movementTypeFilter) params.set('type', movementTypeFilter);
    if (startDateFilter) params.set('startDate', startDateFilter);
    if (endDateFilter) params.set('endDate', endDateFilter);
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [productIdFilter, movementTypeFilter, startDateFilter, endDateFilter, page, router]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      entrada: 'Entrada',
      saida: 'Saída',
      ajuste: 'Ajuste',
      consumo: 'Consumo',
      devolucao: 'Devolução',
      transferencia: 'Transferência'
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      entrada: { bg: '#d1fae5', text: '#065f46' },
      saida: { bg: '#fee2e2', text: '#991b1b' },
      ajuste: { bg: '#e0e7ff', text: '#3730a3' },
      consumo: { bg: '#fef3c7', text: '#92400e' },
      devolucao: { bg: '#f3e8ff', text: '#6b21a8' },
      transferencia: { bg: '#f3f4f6', text: '#374151' }
    };
    return colors[type] || { bg: '#f3f4f6', text: '#374151' };
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar movimentações.
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Movimentações de Estoque</h1>
        {canCreate && (
          <Button onClick={() => router.push('/estoque/movimentacoes/nova')}>
            Nova Movimentação
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
            <div style={{ width: '150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}
              >
                Tipo
              </label>
              <select
                value={movementTypeFilter}
                onChange={(e) => {
                  setMovementTypeFilter(e.target.value);
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
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="ajuste">Ajuste</option>
                <option value="consumo">Consumo</option>
                <option value="devolucao">Devolução</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
            <div style={{ width: '150px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}
              >
                Data Início
              </label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => {
                  setStartDateFilter(e.target.value);
                  setPage(1);
                }}
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
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}
              >
                Data Fim
              </label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => {
                  setEndDateFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
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

      {/* Movements Table */}
      {!loading && movements.length > 0 && (
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
                    Data/Hora
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
                    Produto
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
                    Tipo
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
                    Saldo
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
                    Responsável
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => {
                  const typeColor = getMovementTypeColor(movement.movementType);
                  return (
                    <tr key={movement.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                        {formatDateTime(movement.createdAt)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <div>
                          <Link
                            href={`/estoque/produtos/${movement.productId}`}
                            style={{ color: '#2563eb', textDecoration: 'none' }}
                          >
                            {movement.productSku}
                          </Link>
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>
                          {movement.productName}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            fontSize: '12px',
                            borderRadius: '9999px',
                            backgroundColor: typeColor.bg,
                            color: typeColor.text
                          }}
                        >
                          {getMovementTypeLabel(movement.movementType)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace' }}>
                        {movement.lotNumber || '-'}
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          textAlign: 'right',
                          fontWeight: '500',
                          color:
                            movement.movementType === 'entrada' || movement.movementType === 'devolucao'
                              ? '#059669'
                              : '#dc2626'
                        }}
                      >
                        {movement.movementType === 'entrada' || movement.movementType === 'devolucao'
                          ? '+'
                          : '-'}
                        {Number(movement.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>
                        {movement.balanceAfter
                          ? Number(movement.balanceAfter).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2
                            })
                          : '-'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        {movement.performedByName || '-'}
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
      {!loading && movements.length === 0 && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px' }}>
              Nenhuma movimentação encontrada.
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

export default function MovimentacoesPage() {
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
      <MovimentacoesList />
    </Suspense>
  );
}

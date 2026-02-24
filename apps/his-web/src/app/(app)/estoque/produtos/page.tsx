'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { listProducts, deleteProduct, type Product } from '../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

function ProdutosList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Permissions
  const canRead = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_READ);
  const canCreate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_CREATE);
  const canUpdate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_UPDATE);
  const canDelete = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_DELETE);
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeFilter, setActiveFilter] = useState<string>(
    searchParams.get('active') === 'true' ? 'true' : searchParams.get('active') === 'false' ? 'false' : ''
  );
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pageSize = 20;

  const fetchProducts = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await listProducts({
        q: searchQuery || undefined,
        active: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
        category: categoryFilter || undefined,
        page,
        pageSize
      });
      setProducts(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, categoryFilter, page, canRead]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (activeFilter) params.set('active', activeFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchQuery, activeFilter, categoryFilter, page, router]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    setDeleting(id);
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      setTotal(total - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete product');
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
              Você não tem permissão para visualizar produtos.
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Produtos</h1>
        {canCreate && (
          <Button onClick={() => router.push('/estoque/produtos/novo')}>
            Novo Produto
          </Button>
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
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="SKU ou nome..."
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
                onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
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
            <div style={{ width: '200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Categoria
              </label>
              <input
                type="text"
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                placeholder="Categoria..."
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

      {/* Products Table */}
      {!loading && products.length > 0 && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>SKU</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Nome</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Categoria</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Custo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Preço</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace' }}>
                      <Link href={`/estoque/produtos/${product.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {product.sku}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{product.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{product.category || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{formatCurrency(product.cost)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right' }}>{formatCurrency(product.price)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        borderRadius: '9999px',
                        backgroundColor: product.active ? '#d1fae5' : '#f3f4f6',
                        color: product.active ? '#065f46' : '#374151'
                      }}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {canUpdate && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.push(`/estoque/produtos/${product.id}/editar`)}
                          >
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting === product.id}
                          >
                            {deleting === product.id ? 'Excluindo...' : 'Excluir'}
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

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '48px' }}>
              Nenhum produto encontrado.
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <Button
            variant="secondary"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
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

export default function ProdutosPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
          </CardBody>
        </Card>
      </div>
    }>
      <ProdutosList />
    </Suspense>
  );
}

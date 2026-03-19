'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ApiError,
  getStockSummary,
  listStockItems,
  listStockLots,
  createStockMovement,
  createStockLot,
  type StockSummary,
  type StockItemRecord,
  type StockLotRecord,
  type StockMovementType
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { px, row, theme } from '@/lib/theme';

function MetricCard({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: string }) {
  return (
    <Card style={{
      padding: px(20),
      border: `1px solid ${accent || theme.colors.border}`,
      borderRadius: px(theme.radius.md),
      background: accent ? `${accent}10` : theme.colors.surface
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
        {icon && <span style={{ fontSize: px(24) }}>{icon}</span>}
        <div>
          <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(4) }}>{label}</div>
          <div style={{ fontSize: px(24), fontWeight: 700, color: accent || theme.colors.textPrimary }}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

export default function StockPage() {
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [items, setItems] = useState<StockItemRecord[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [lotOpen, setLotOpen] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summ, itemsList, lowList] = await Promise.all([
        getStockSummary(),
        listStockItems({ pageSize: 50, active: true }),
        listStockItems({ pageSize: 20, lowStock: true, active: true })
      ]);
      setSummary(summ);
      setItems(itemsList.data);
      setLowStockItems(lowList.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro ao carregar estoque', 500, null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateMovement = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createStockMovement({
        productId: form.get('productId') as string,
        movementType: form.get('movementType') as StockMovementType,
        quantity: parseInt(form.get('quantity') as string),
        unitCost: form.get('unitCost') ? parseFloat(form.get('unitCost') as string) : undefined,
        reference: form.get('reference') as string || undefined,
        notes: form.get('notes') as string || undefined
      });
      setMovementOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar movimentação');
    }
  };

  const handleCreateLot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createStockLot({
        productId: form.get('productId') as string,
        lotNumber: form.get('lotNumber') as string,
        quantity: parseInt(form.get('quantity') as string),
        expiryDate: form.get('expiryDate') as string || undefined,
        supplier: form.get('supplier') as string || undefined,
        unitCost: form.get('unitCost') ? parseFloat(form.get('unitCost') as string) : undefined
      });
      setLotOpen(false);
      await fetchData();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar lote');
    }
  };

  if (loading && !error) return <LoadingState message="Carregando estoque..." />;

  return (
    <ListPageLayout>
      <PageHeader
        title="Controle de Estoque"
        description="Gestão de produtos, lotes e movimentações"
        actions={
          <div style={{ ...row(8) }}>
            <Button variant="secondary" onClick={() => setLotOpen(true)}>📦 Entrada (Lote)</Button>
            <Button variant="primary" onClick={() => setMovementOpen(true)}>🔄 Movimentação</Button>
          </div>
        }
      />

      {error && (
        <ErrorBanner title="Erro ao carregar estoque" message={error.message} requestId={error.requestId} onRetry={fetchData} />
      )}

      {!loading && !error && (
        <ContentSection>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: px(16) }}>
            <MetricCard icon="📦" label="Produtos em estoque" value={String(summary?.totalProducts ?? 0)} accent={theme.colors.primary} />
            <MetricCard icon="📊" label="Unidades totais" value={String(summary?.totalItemsInStock ?? 0)} />
            <MetricCard
              icon="⚠️"
              label="Estoque baixo"
              value={String(summary?.lowStockItems ?? 0)}
              accent={(summary?.lowStockItems ?? 0) > 0 ? '#E65100' : '#2E7D32'}
            />
            <MetricCard
              icon="⏰"
              label="Lotes vencendo (30d)"
              value={String(summary?.expiringLots ?? 0)}
              accent={(summary?.expiringLots ?? 0) > 0 ? '#C62828' : '#2E7D32'}
            />
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: px(12), marginTop: px(8), flexWrap: 'wrap' }}>
            <Link href="/stock/items">
              <Button variant="secondary">📋 Todos os Itens</Button>
            </Link>
            <Link href="/stock/lots">
              <Button variant="secondary">📦 Lotes</Button>
            </Link>
            <Link href="/stock/movements">
              <Button variant="secondary">📊 Movimentações</Button>
            </Link>
            <Button variant={showLowStock ? 'primary' : 'ghost'} onClick={() => setShowLowStock(!showLowStock)}>
              ⚠️ Estoque Baixo ({lowStockItems.length})
            </Button>
          </div>

          {/* Low Stock Alert */}
          {showLowStock && lowStockItems.length > 0 && (
            <Card style={{ padding: px(16), borderColor: '#E65100', marginTop: px(8) }}>
              <h3 style={{ margin: 0, marginBottom: px(12), color: '#E65100' }}>⚠️ Itens com Estoque Baixo</h3>
              {lowStockItems.map((item) => (
                <div key={item.id} style={{
                  padding: px(12),
                  borderBottom: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.productName || 'Produto'}</span>
                    {item.productCode && <span style={{ color: theme.colors.textSecondary, marginLeft: px(8) }}>({item.productCode})</span>}
                  </div>
                  <div style={{ ...row(16), alignItems: 'center' }}>
                    <span style={{ color: '#E65100', fontWeight: 600 }}>{item.quantity} un.</span>
                    <span style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>mín: {item.minQuantity}</span>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Stock Items List */}
          <Card style={{ padding: px(20), marginTop: px(8) }}>
            <div style={{ ...row(12), justifyContent: 'space-between', marginBottom: px(16) }}>
              <h3 style={{ margin: 0, fontSize: px(16) }}>📦 Itens em Estoque</h3>
              <span style={{ fontSize: px(13), color: theme.colors.textSecondary }}>
                {items.length} produto{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            {items.length === 0 ? (
              <EmptyState
                title="Nenhum item em estoque"
                description="Cadastre produtos e registre entradas para começar."
                action={<Button variant="primary" onClick={() => setLotOpen(true)}>Registrar Entrada</Button>}
              />
            ) : (
              <div style={{ display: 'grid', gap: px(8) }}>
                {items.map((item) => {
                  const isLow = item.quantity < item.minQuantity;
                  return (
                    <div key={item.id} style={{
                      padding: px(12),
                      border: `1px solid ${isLow ? '#E65100' : theme.colors.border}`,
                      borderRadius: px(theme.radius.sm),
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: isLow ? '#FFF3E0' : 'transparent'
                    }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{item.productName || 'Produto'}</span>
                        {item.productCode && <span style={{ color: theme.colors.textSecondary, marginLeft: px(8) }}>({item.productCode})</span>}
                        {item.location && <span style={{ color: theme.colors.textSecondary, marginLeft: px(8), fontSize: px(12) }}>📍 {item.location}</span>}
                      </div>
                      <div style={{ ...row(16), alignItems: 'center' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: px(18),
                          color: isLow ? '#E65100' : theme.colors.textPrimary
                        }}>
                          {item.quantity}
                        </span>
                        <span style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>
                          / {item.minQuantity} mín
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </ContentSection>
      )}

      {/* Create Movement Modal */}
      <Modal isOpen={movementOpen} onClose={() => setMovementOpen(false)} title="Nova Movimentação">
        <form onSubmit={handleCreateMovement} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="productId" placeholder="ID do Produto (UUID)" required />
          <Select name="movementType" required>
            <option value="">Tipo de movimentação</option>
            <option value="purchase">Entrada (Compra)</option>
            <option value="sale">Saída (Venda)</option>
            <option value="adjustment_in">Ajuste (+)</option>
            <option value="adjustment_out">Ajuste (-)</option>
            <option value="return">Devolução</option>
            <option value="loss">Perda/Avaria</option>
            <option value="initial">Saldo Inicial</option>
          </Select>
          <Input name="quantity" type="number" placeholder="Quantidade" min="1" required />
          <Input name="unitCost" type="number" step="0.01" placeholder="Custo unitário (opcional)" />
          <Input name="reference" placeholder="Referência (NF, pedido, etc.)" />
          <Input name="notes" placeholder="Observações" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setMovementOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Create Lot Modal */}
      <Modal isOpen={lotOpen} onClose={() => setLotOpen(false)} title="Entrada de Lote">
        <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="productId" placeholder="ID do Produto (UUID)" required />
          <Input name="lotNumber" placeholder="Número do Lote" required />
          <Input name="quantity" type="number" placeholder="Quantidade" min="1" required />
          <Input name="expiryDate" type="date" label="Data de Validade" />
          <Input name="supplier" placeholder="Fornecedor" />
          <Input name="unitCost" type="number" step="0.01" placeholder="Custo unitário" />
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setLotOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Registrar Entrada</Button>
          </div>
        </form>
      </Modal>
    </ListPageLayout>
  );
}

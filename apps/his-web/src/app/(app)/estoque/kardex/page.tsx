'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getKardex, getProductBalance, type KardexEntry, type ProductBalance } from '../../../../lib/api/stock';
import { getProduct, type Product } from '../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

function KardexView() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || '';

  const canRead = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_READ);

  const [product, setProduct] = useState<Product | null>(null);
  const [balance, setBalance] = useState<ProductBalance | null>(null);
  const [entries, setEntries] = useState<KardexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const fetchData = useCallback(async () => {
    if (!canRead || !productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const productData = await getProduct(productId);
      setProduct(productData);
      const balanceData = await getProductBalance(productId);
      setBalance(balanceData);
      const kardexData = await getKardex({ productId, startDate: startDate || undefined, endDate: endDate || undefined, page, pageSize });
      setEntries(kardexData.items);
      setTotal(kardexData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load kardex');
    } finally {
      setLoading(false);
    }
  }, [productId, startDate, endDate, page, canRead]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste', consumo: 'Consumo', devolucao: 'Devolução', transferencia: 'Transferência' };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      entrada: { bg: '#d1fae5', text: '#065f46' }, saida: { bg: '#fee2e2', text: '#991b1b' },
      ajuste: { bg: '#e0e7ff', text: '#3730a3' }, consumo: { bg: '#fef3c7', text: '#92400e' },
      devolucao: { bg: '#f3e8ff', text: '#6b21a8' }, transferencia: { bg: '#f3f4f6', text: '#374151' }
    };
    return colors[type] || { bg: '#f3f4f6', text: '#374151' };
  };

  if (!productId) return (<div style={{ padding: '24px' }}><Card><CardBody><div style={{ textAlign: 'center', color: '#6b7280' }}>Selecione um produto para visualizar o Kardex.</div></CardBody></Card></div>);
  if (!canRead) return (<div style={{ padding: '24px' }}><Card><CardBody><div style={{ textAlign: 'center', color: '#6b7280' }}>Você não tem permissão para visualizar o Kardex.</div></CardBody></Card></div>);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Kardex</h1>
          {product && (<div style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}><Link href={`/estoque/produtos/${product.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{product.sku}</Link>{' - '}{product.name}</div>)}
        </div>
        <Link href="/estoque/produtos"><Button variant="secondary">Voltar aos Produtos</Button></Link>
      </div>
      {error && (<Card style={{ marginBottom: '24px', borderColor: '#ef4444' }}><CardBody><div style={{ color: '#ef4444' }}>{error}</div></CardBody></Card>)}
      {balance && (
        <Card style={{ marginBottom: '24px' }}>
          <CardBody>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Saldo por Lote</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {balance.lots.map((lot) => (
                <div key={lot.lotId} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: lot.isExpired ? '#fee2e2' : lot.isExpiringSoon ? '#fef3c7' : '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '500', fontFamily: 'monospace' }}>{lot.lotNumber}</span>
                    <span style={{ padding: '2px 8px', fontSize: '12px', borderRadius: '9999px', backgroundColor: lot.isExpired ? '#ef4444' : lot.isExpiringSoon ? '#f59e0b' : '#10b981', color: '#fff' }}>{lot.isExpired ? 'Vencido' : lot.isExpiringSoon ? `${lot.daysToExpiry}d` : 'OK'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}><span>Quantidade:</span><span style={{ fontWeight: '500', color: '#111' }}>{Number(lot.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                  {lot.expiryDate && (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}><span>Validade:</span><span>{new Date(lot.expiryDate).toLocaleDateString('pt-BR')}</span></div>)}
                  {lot.cost && (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6b7280' }}><span>Custo:</span><span>{Number(lot.cost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>)}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}><span>Total Geral:</span><span>{Number(balance.totalQuantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} unidades</span></div>
          </CardBody>
        </Card>
      )}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: '150px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Data Início</label><input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} /></div>
            <div style={{ width: '150px' }}><label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Data Fim</label><input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }} /></div>
            <Button variant="secondary" onClick={() => fetchData()}>Atualizar</Button>
          </div>
        </CardBody>
      </Card>
      {loading && (<Card><CardBody><div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div></CardBody></Card>)}
      {!loading && entries.length > 0 && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Data/Hora</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Tipo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Lote</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Entrada</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Saída</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Saldo</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>Observação</th>
              </tr></thead>
              <tbody>
                {entries.map((entry) => {
                  const typeColor = getMovementTypeColor(entry.movementType);
                  const isEntry = entry.movementType === 'entrada' || entry.movementType === 'devolucao';
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '2px 8px', fontSize: '12px', borderRadius: '9999px', backgroundColor: typeColor.bg, color: typeColor.text }}>{getMovementTypeLabel(entry.movementType)}</span></td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontFamily: 'monospace' }}>{entry.lotNumber || '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: isEntry ? '#059669' : 'transparent' }}>{isEntry ? Number(entry.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', color: !isEntry ? '#dc2626' : 'transparent' }}>{!isEntry ? Number(entry.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'right', fontWeight: '500' }}>{entry.balanceAfter ? Number(entry.balanceAfter).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{entry.reason || entry.documentRef || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
      {!loading && entries.length === 0 && (<Card><CardBody><div style={{ textAlign: 'center', color: '#6b7280', padding: '48px' }}>Nenhuma movimentação encontrada para este produto.</div></CardBody></Card>)}
      {totalPages > 1 && (<div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}><Button variant="secondary" onClick={() => setPage(page - 1)} disabled={page === 1}>Anterior</Button><span style={{ padding: '8px 16px', color: '#6b7280' }}>Página {page} de {totalPages} ({total} itens)</span><Button variant="secondary" onClick={() => setPage(page + 1)} disabled={page >= totalPages}>Próxima</Button></div>)}
    </div>
  );
}

export default function KardexPage() {
  return (<Suspense fallback={<div style={{ padding: '24px' }}><Card><CardBody><div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div></CardBody></Card></div>}><KardexView /></Suspense>);
}

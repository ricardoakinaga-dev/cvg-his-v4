'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProduct, type ProductCreateInput } from '../../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../../lib/rbac';
import { Card, CardBody } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';

export default function NovoProdutoPage() {
  const router = useRouter();
  const canCreate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_CREATE);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductCreateInput>({
    sku: '',
    name: '',
    category: '',
    uom: '',
    cost: 0,
    price: 0,
    isControlled: false,
    trackLot: false,
    trackExpiry: false,
    minStock: 0,
    active: true
  });

  if (!canCreate) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para criar produtos.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const product = await createProduct({
        ...form,
        category: form.category || null,
        uom: form.uom || null
      });
      router.push(`/estoque/produtos/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ProductCreateInput, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link href="/estoque/produtos" style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Voltar
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Novo Produto</h1>
      </div>

      {error && (
        <Card style={{ marginBottom: '24px', borderColor: '#ef4444' }}>
          <CardBody>
            <div style={{ color: '#ef4444' }}>{error}</div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  SKU *
                </label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  required
                  maxLength={50}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Nome *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  maxLength={200}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Categoria
                </label>
                <input
                  type="text"
                  value={form.category || ''}
                  onChange={(e) => handleChange('category', e.target.value)}
                  maxLength={100}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Unidade de Medida
                </label>
                <input
                  type="text"
                  value={form.uom || ''}
                  onChange={(e) => handleChange('uom', e.target.value)}
                  maxLength={20}
                  placeholder="UN, CX, ML, etc."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Custo
                </label>
                <input
                  type="number"
                  value={form.cost}
                  onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Preço
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                  Estoque Mínimo
                </label>
                <input
                  type="number"
                  value={form.minStock}
                  onChange={(e) => handleChange('minStock', parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => handleChange('active', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Ativo</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isControlled}
                    onChange={(e) => handleChange('isControlled', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Controlado</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.trackLot}
                    onChange={(e) => handleChange('trackLot', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Rastreia Lote</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.trackExpiry}
                    onChange={(e) => handleChange('trackExpiry', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Rastreia Validade</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/estoque/produtos')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

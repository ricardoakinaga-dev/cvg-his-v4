'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProduct, updateProduct, type Product, type ProductUpdateInput } from '../../../../../../lib/api/products';
import { usePermission, PERMISSIONS } from '../../../../../../lib/rbac';
import { Card, CardBody } from '../../../../../../components/ui/Card';
import { Button } from '../../../../../../components/ui/Button';

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditarProdutoPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const canUpdate = usePermission(PERMISSIONS.ESTOQUE_PRODUTOS_UPDATE);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductUpdateInput>({});

  useEffect(() => {
    if (!canUpdate) {
      setLoading(false);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const data = await getProduct(id);
        setProduct(data);
        setForm({
          sku: data.sku,
          name: data.name,
          category: data.category,
          uom: data.uom,
          cost: Number(data.cost),
          price: Number(data.price),
          isControlled: data.isControlled,
          trackLot: data.trackLot,
          trackExpiry: data.trackExpiry,
          minStock: Number(data.minStock),
          active: data.active
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, canUpdate]);

  if (!canUpdate) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para editar produtos.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setSaving(true);
    setError(null);

    try {
      await updateProduct(product.id, {
        ...form,
        category: form.category || null,
        uom: form.uom || null
      });
      router.push(`/estoque/produtos/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProductUpdateInput, value: string | number | boolean | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Produto não encontrado.</div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link href={`/estoque/produtos/${product.id}`} style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Voltar
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Editar Produto</h1>
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
                  value={form.sku || ''}
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
                  value={form.name || ''}
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
                  value={form.cost ?? 0}
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
                  value={form.price ?? 0}
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
                  value={form.minStock ?? 0}
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
                    checked={form.active ?? true}
                    onChange={(e) => handleChange('active', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Ativo</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.isControlled ?? false}
                    onChange={(e) => handleChange('isControlled', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Controlado</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.trackLot ?? false}
                    onChange={(e) => handleChange('trackLot', e.target.checked)}
                  />
                  <span style={{ fontSize: '14px' }}>Rastreia Lote</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.trackExpiry ?? false}
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
                onClick={() => router.push(`/estoque/produtos/${product.id}`)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

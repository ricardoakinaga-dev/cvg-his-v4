'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getService,
  updateService,
  type Service,
  type ServiceGroup,
  type ServiceSector,
  SERVICE_GROUP_LABELS,
  SERVICE_SECTOR_LABELS
} from '../../../../../../lib/api/services';
import { usePermission, PERMISSIONS } from '../../../../../../lib/rbac';
import { Card, CardBody } from '../../../../../../components/ui/Card';
import { Button } from '../../../../../../components/ui/Button';

type PageProps = {
  params: Promise<{ id: string }>;
};

function ServiceEdit({ id }: { id: string }) {
  const router = useRouter();

  // Permissions
  const canUpdate = usePermission(PERMISSIONS.FINANCEIRO_SERVICOS_UPDATE);

  // State
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState<ServiceGroup>('consulta');
  const [sector, setSector] = useState<ServiceSector>('clinica');
  const [basePrice, setBasePrice] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [requiresReport, setRequiresReport] = useState(false);
  const [consumesStock, setConsumesStock] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!canUpdate) {
      setLoading(false);
      return;
    }

    const fetchService = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getService(id);
        setService(data);
        setCode(data.code);
        setName(data.name);
        setGroup(data.group);
        setSector(data.sector);
        setBasePrice(data.basePrice);
        setDurationMinutes(data.durationMinutes?.toString() || '');
        setRequiresReport(data.requiresReport);
        setConsumesStock(data.consumesStock);
        setActive(data.active);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id, canUpdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateService(id, {
        code,
        name,
        group,
        sector,
        basePrice: parseFloat(basePrice) || 0,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        requiresReport,
        consumesStock,
        active
      });
      router.push(`/financeiro/servicos/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update service');
    } finally {
      setSaving(false);
    }
  };

  if (!canUpdate) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para editar serviços.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px' }}>
        <Link href={`/financeiro/servicos/${id}`} style={{ color: '#6b7280', textDecoration: 'none' }}>
          ← Voltar para Serviço
        </Link>
      </div>

      {/* Header */}
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>
        Editar Serviço
      </h1>

      {/* Loading */}
      {loading && (
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
          </CardBody>
        </Card>
      )}

      {/* Form */}
      {!loading && service && (
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Error */}
                {error && (
                  <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
                    {error}
                  </div>
                )}

                {/* Code */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                    Código *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
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

                {/* Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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

                {/* Group and Sector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Grupo *
                    </label>
                    <select
                      value={group}
                      onChange={(e) => setGroup(e.target.value as ServiceGroup)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      {Object.entries(SERVICE_GROUP_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Setor *
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value as ServiceSector)}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      {Object.entries(SERVICE_SECTOR_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price and Duration */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                      Preço Base (R$)
                    </label>
                    <input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      min="0"
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
                      Duração (minutos)
                    </label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      min="1"
                      placeholder="Opcional"
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

                {/* Flags */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={requiresReport}
                      onChange={(e) => setRequiresReport(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Requer Laudo</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={consumesStock}
                      onChange={(e) => setConsumesStock(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Consome Estoque</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '14px' }}>Ativo</span>
                  </label>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <Button type="button" variant="outline" onClick={() => router.push(`/financeiro/servicos/${id}`)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ServiceEdit id={resolvedParams.id} />;
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInpatientStays,
  listMedicationOrders,
  getWards,
  type InpatientStayRecord,
  type MedicationOrderRecord,
  type WardRecord
} from '../../../../lib/api';
import { getAuthSession } from '../../../../lib/auth';
import { can, resolvePermissions } from '../../../../lib/permissions';
import { MedDueList } from '../../../../components/MedDueList';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: ['inpatient.read', 'medicationOrders.read', 'medicationOrders.write', 'medadmin.read'],
  enfermagem: ['inpatient.read', 'medadmin.read', 'medadmin.write']
};

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function StatusBadge({ status }: { status: MedicationOrderRecord['status'] }) {
  const colors = {
    active: { bg: '#dcfce7', color: '#16a34a' },
    stopped: { bg: '#fee2e2', color: '#dc2626' }
  };

  const style = colors[status];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        textTransform: 'uppercase'
      }}
    >
      {status === 'active' ? 'Ativo' : 'Parado'}
    </span>
  );
}

function MedicationCard({
  order,
  stayId
}: {
  order: MedicationOrderRecord;
  stayId?: string;
}) {
  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        display: 'grid',
        gap: 8
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            {order.medicationName}
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
            {order.doseValue} {order.doseUnit} • {order.route} • {order.frequencyType}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      {order.prescriptionText && (
        <p style={{ margin: 0, fontSize: 13, color: '#475569', background: '#f8fafc', padding: 8, borderRadius: 6 }}>
          📋 {order.prescriptionText}
        </p>
      )}

      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
        <span>Início: {formatDateTime(order.startAt)}</span>
        {order.endAt && <span>Fim: {formatDateTime(order.endAt)}</span>}
      </div>

      {order.status === 'active' && stayId && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <Link
            href={`/inpatient/mar?stayId=${stayId}&orderId=${order.id}`}
            style={{
              border: '1px solid #0369a1',
              borderRadius: 6,
              background: '#0ea5e9',
              color: '#fff',
              padding: '6px 12px',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            Administrar
          </Link>
        </div>
      )}
    </article>
  );
}

export default function MedicacoesPage() {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadInpatient = can(permissions, 'inpatient.read');
  const canReadMeds = can(permissions, 'medicationOrders.read');

  const [stays, setStays] = useState<InpatientStayRecord[]>([]);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [medicationOrders, setMedicationOrders] = useState<MedicationOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [selectedStayId, setSelectedStayId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'mar'>('list');

  const loadWards = useCallback(async () => {
    try {
      const result = await getWards({ pageSize: 100 });
      setWards(result.data);
    } catch (err) {
      console.error('Failed to load wards:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!canReadInpatient) return;

    setLoading(true);
    setError(null);
    try {
      // Load active stays
      const staysResult = await listInpatientStays({
        status: 'active',
        wardId: selectedWardId || undefined,
        page: 1,
        pageSize: 50
      });
      setStays(staysResult.data);

      // Load medication orders for selected stay or all stays
      if (selectedStayId) {
        const medsResult = await listMedicationOrders({
          stayId: selectedStayId,
          status: 'active',
          page: 1,
          pageSize: 100
        });
        setMedicationOrders(medsResult.data);
      } else {
        setMedicationOrders([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [canReadInpatient, selectedWardId, selectedStayId]);

  useEffect(() => {
    void loadWards();
  }, [loadWards]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const getWardName = (wardId: string) => {
    return wards.find(w => w.id === wardId)?.name || 'Setor desconhecido';
  };

  // Group stays by ward
  const staysByWard = useMemo(() => {
    const map = new Map<string, InpatientStayRecord[]>();
    for (const stay of stays) {
      const wardStays = map.get(stay.wardId) || [];
      wardStays.push(stay);
      map.set(stay.wardId, wardStays);
    }
    return map;
  }, [stays]);

  if (!canReadInpatient) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center'
          }}
        >
          <h2 style={{ margin: '0 0 8px', color: '#b91c1c' }}>Acesso Negado</h2>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Seu perfil não possui permissão para visualizar medicações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
            Medicações
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Controle de medicações para pacientes internados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              border: viewMode === 'list' ? '1px solid #0f172a' : '1px solid #cbd5e1',
              borderRadius: 8,
              background: viewMode === 'list' ? '#0f172a' : '#fff',
              color: viewMode === 'list' ? '#fff' : '#0f172a',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            📋 Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mar')}
            style={{
              border: viewMode === 'mar' ? '1px solid #0f172a' : '1px solid #cbd5e1',
              borderRadius: 8,
              background: viewMode === 'mar' ? '#0f172a' : '#fff',
              color: viewMode === 'mar' ? '#fff' : '#0f172a',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            💉 MAR
          </button>
        </div>
      </header>

      {/* Filters */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Setor</span>
          <select
            value={selectedWardId}
            onChange={e => {
              setSelectedWardId(e.target.value);
              setSelectedStayId('');
            }}
            style={{
              minWidth: 180,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff'
            }}
          >
            <option value="">Todos os setores</option>
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Paciente (Stay)</span>
          <select
            value={selectedStayId}
            onChange={e => setSelectedStayId(e.target.value)}
            style={{
              minWidth: 220,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff'
            }}
          >
            <option value="">Selecione um paciente</option>
            {stays.map(stay => (
              <option key={stay.id} value={stay.id}>
                {stay.patientId.slice(0, 8)}... - {getWardName(stay.wardId)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            padding: '8px 16px',
            cursor: 'pointer',
            marginTop: 20
          }}
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>

        <Link
          href="/internacao/painel"
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            color: '#0f172a',
            padding: '8px 16px',
            textDecoration: 'none',
            marginTop: 20
          }}
        >
          Ver Painel
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            color: '#b91c1c'
          }}
        >
          {error}
        </div>
      )}

      {/* MAR View */}
      {viewMode === 'mar' && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 20
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
            Medication Administration Record (MAR)
          </h2>
          {selectedStayId ? (
            <MedDueList stayId={selectedStayId} hideStaySelector />
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748b' }}>
              Selecione um paciente para visualizar o MAR
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
              Carregando...
            </div>
          )}

          {/* Empty State */}
          {!loading && !selectedStayId && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 48,
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Selecione um paciente</h3>
              <p style={{ margin: 0 }}>
                Use os filtros acima para selecionar um paciente e visualizar suas medicações
              </p>
            </div>
          )}

          {/* Medication Orders */}
          {!loading && selectedStayId && medicationOrders.length === 0 && (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 48,
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Nenhuma medicação ativa</h3>
              <p style={{ margin: 0 }}>
                Este paciente não possui prescrições ativas no momento
              </p>
            </div>
          )}

          {!loading && selectedStayId && medicationOrders.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: 16
              }}
            >
              {medicationOrders.map(order => (
                <MedicationCard key={order.id} order={order} stayId={selectedStayId} />
              ))}
            </div>
          )}

          {/* Quick Stats */}
          {!loading && stays.length > 0 && (
            <div
              style={{
                marginTop: 24,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#64748b' }}>
                RESUMO POR SETOR
              </h3>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {Array.from(staysByWard.entries()).map(([wardId, wardStays]) => (
                  <div
                    key={wardId}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{getWardName(wardId)}</span>
                    <span
                      style={{
                        background: '#0ea5e9',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {wardStays.length} paciente{wardStays.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

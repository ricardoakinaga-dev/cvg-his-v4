'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getInpatientDashboard,
  type InpatientDashboardResponse,
  type InpatientDashboardWard,
  type InpatientDashboardBed
} from '../../../../lib/api';
import { getAuthSession } from '../../../../lib/auth';
import { can, resolvePermissions } from '../../../../lib/permissions';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: ['inpatient.read', 'inpatient.write', 'inpatient.discharge', 'medicationOrders.write', 'clinicalNotes.write'],
  enfermagem: ['inpatient.read', 'medicationAdministrations.write', 'vitalSigns.write'],
  recepcao: ['inpatient.read']
};

function formatDurationSince(isoDate: string | null): string {
  if (!isoDate) return '-';
  const admittedAt = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - admittedAt.getTime();

  if (Number.isNaN(admittedAt.getTime()) || diffMs < 0) {
    return '-';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}
    >
      <span style={{ fontSize: 13, color: '#64748b' }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function WardSection({
  ward,
  beds,
  permissions,
  onRefresh
}: {
  ward: InpatientDashboardWard;
  beds: InpatientDashboardBed[];
  permissions: string[];
  onRefresh: () => void;
}) {
  const canWriteInpatient = can(permissions, 'inpatient.write');
  const canWriteMeds = can(permissions, 'medicationOrders.write');
  const canWriteClinical = can(permissions, 'clinicalNotes.write');
  const canWriteVitals = can(permissions, 'vitalSigns.write');

  const occupiedBeds = beds.filter(b => b.status === 'occupied');
  const freeBeds = beds.filter(b => b.status === 'free');

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        overflow: 'hidden'
      }}
    >
      {/* Ward Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{ward.name}</h3>
          {ward.code && <span style={{ fontSize: 13, opacity: 0.7 }}>Código: {ward.code}</span>}
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 14 }}>
          <span style={{ background: '#22c55e20', padding: '4px 12px', borderRadius: 20, color: '#22c55e' }}>
            {freeBeds.length} livres
          </span>
          <span style={{ background: '#ef444420', padding: '4px 12px', borderRadius: 20, color: '#ef4444' }}>
            {occupiedBeds.length} ocupados
          </span>
        </div>
      </header>

      {/* Beds Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
          padding: 16
        }}
      >
        {beds.map(bed => (
          <BedCard
            key={bed.bedId}
            bed={bed}
            canWriteInpatient={canWriteInpatient}
            canWriteMeds={canWriteMeds}
            canWriteClinical={canWriteClinical}
            canWriteVitals={canWriteVitals}
          />
        ))}
      </div>
    </section>
  );
}

function BedCard({
  bed,
  canWriteInpatient,
  canWriteMeds,
  canWriteClinical,
  canWriteVitals
}: {
  bed: InpatientDashboardBed;
  canWriteInpatient: boolean;
  canWriteMeds: boolean;
  canWriteClinical: boolean;
  canWriteVitals: boolean;
}) {
  const occupied = bed.status === 'occupied' && bed.patient;

  return (
    <article
      style={{
        border: occupied ? '2px solid #f87171' : '1px solid #e2e8f0',
        borderRadius: 12,
        background: occupied ? '#fef2f2' : '#f8fafc',
        padding: 14,
        display: 'grid',
        gap: 10,
        transition: 'all 0.2s'
      }}
    >
      {/* Bed Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ fontSize: 15 }}>{bed.bedName}</strong>
          {bed.bedCode && (
            <span style={{ color: '#64748b', marginLeft: 6, fontSize: 12 }}>
              ({bed.bedCode})
            </span>
          )}
        </div>
        <span
          style={{
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            color: occupied ? '#b91c1c' : '#047857',
            background: occupied ? '#fee2e2' : '#dcfce7',
            textTransform: 'uppercase'
          }}
        >
          {occupied ? 'Ocupado' : 'Livre'}
        </span>
      </header>

      {occupied && bed.patient ? (
        <>
          {/* Patient Info */}
          <div style={{ display: 'grid', gap: 4 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
              {bed.patient.patientName || 'Paciente sem nome'}
              {bed.patient.species && (
                <span style={{ fontWeight: 400, color: '#64748b' }}> • {bed.patient.species}</span>
              )}
            </p>
            {bed.patient.ownerName && (
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Tutor: {bed.patient.ownerName}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
              Internado há {formatDurationSince(bed.admittedAt)}
            </p>
            {bed.chiefComplaint && (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: '#991b1b',
                  background: '#fee2e2',
                  padding: '4px 8px',
                  borderRadius: 6
                }}
              >
                ⚠️ {bed.chiefComplaint}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            <Link
              href={`/inpatient/stays/${bed.patient.stayId}`}
              style={{
                border: '1px solid #0f172a',
                borderRadius: 6,
                background: '#0f172a',
                color: '#fff',
                padding: '6px 10px',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              Ver Stay
            </Link>

            {canWriteClinical && (
              <Link
                href={`/inpatient/stays/${bed.patient.stayId}?action=evolve`}
                style={{
                  border: '1px solid #0369a1',
                  borderRadius: 6,
                  background: '#0ea5e9',
                  color: '#fff',
                  padding: '6px 10px',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                Evoluir
              </Link>
            )}

            {canWriteMeds && (
              <Link
                href={`/inpatient/stays/${bed.patient.stayId}?action=prescribe`}
                style={{
                  border: '1px solid #7c3aed',
                  borderRadius: 6,
                  background: '#8b5cf6',
                  color: '#fff',
                  padding: '6px 10px',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                Prescrever
              </Link>
            )}

            <Link
              href={`/inpatient/mar?stayId=${bed.patient.stayId}`}
              style={{
                border: '1px solid #ea580c',
                borderRadius: 6,
                background: '#f97316',
                color: '#fff',
                padding: '6px 10px',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              MAR
            </Link>

            {canWriteVitals && (
              <Link
                href={`/inpatient/stays/${bed.patient.stayId}?action=vitals`}
                style={{
                  border: '1px solid #0891b2',
                  borderRadius: 6,
                  background: '#06b6d4',
                  color: '#fff',
                  padding: '6px 10px',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                Sinais Vitais
              </Link>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          {canWriteInpatient ? (
            <Link
              href={`/inpatient/bedmap?wardId=${bed.wardId}&bedId=${bed.bedId}`}
              style={{
                border: '1px solid #0f172a',
                borderRadius: 6,
                background: '#0f172a',
                color: '#fff',
                padding: '8px 14px',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500
              }}
            >
              Admitir Paciente
            </Link>
          ) : (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Leito disponível</span>
          )}
        </div>
      )}
    </article>
  );
}

export default function PainelInternacaoPage() {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadInpatient = can(permissions, 'inpatient.read');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InpatientDashboardResponse | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('');

  const [mounted, setMounted] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!canReadInpatient) return;

    setLoading(true);
    setError(null);
    try {
      const result = await getInpatientDashboard(selectedWardId || undefined);
      setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar painel');
    } finally {
      setLoading(false);
    }
  }, [canReadInpatient, selectedWardId]);

  useEffect(() => {
    setMounted(true);
    void loadDashboard();
  }, [loadDashboard]);

  // Group beds by ward
  const bedsByWard = useMemo(() => {
    if (!data) return new Map<string, { ward: InpatientDashboardWard; beds: InpatientDashboardBed[] }>();

    const map = new Map<string, { ward: InpatientDashboardWard; beds: InpatientDashboardBed[] }>();

    for (const ward of data.wards) {
      map.set(ward.id, { ward, beds: [] });
    }

    for (const bed of data.beds) {
      const entry = map.get(bed.wardId);
      if (entry) {
        entry.beds.push(bed);
      }
    }

    return map;
  }, [data]);

  if (!mounted) return null; // Prevent hydration mismatch

  if (!canReadInpatient) {
    return (
      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
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
            Seu perfil não possui permissão para visualizar o painel de internação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: '0 auto' }}>
      {/* Header (Always Rendered to prevent hydration mismatch) */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
          Painel de Internação
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Visão geral dos pacientes internados por setor/leito
        </p>
      </header>

      {/* Stats */}
      {data && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 24
          }}
        >
          <StatCard label="Total Leitos" value={data.stats.totalBeds} color="#0f172a" />
          <StatCard label="Ocupados" value={data.stats.occupiedBeds} color="#dc2626" />
          <StatCard label="Livres" value={data.stats.freeBeds} color="#16a34a" />
          <StatCard label="Pacientes Ativos" value={data.stats.activeStays} color="#0ea5e9" />
          <StatCard label="Setores" value={data.stats.totalWards} color="#7c3aed" />
        </div>
      )}

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
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Filtrar por Setor</span>
          <select
            value={selectedWardId}
            onChange={e => setSelectedWardId(e.target.value)}
            style={{
              minWidth: 200,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff'
            }}
          >
            <option value="">Todos os setores</option>
            {data?.wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.name} ({ward.occupiedBeds}/{ward.totalBeds} ocupados)
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void loadDashboard()}
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
          href="/internacao/leitos"
          style={{
            border: '1px solid #0f172a',
            borderRadius: 8,
            background: '#0f172a',
            color: '#fff',
            padding: '8px 16px',
            textDecoration: 'none',
            marginTop: 20
          }}
        >
          Gerenciar Leitos
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

      {/* Loading */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          Carregando painel...
        </div>
      )}

      {/* Ward Sections */}
      {data && !loading && (
        <div style={{ display: 'grid', gap: 24 }}>
          {Array.from(bedsByWard.values()).map(({ ward, beds }) => (
            <WardSection
              key={ward.id}
              ward={ward}
              beds={beds}
              permissions={permissions}
              onRefresh={() => void loadDashboard()}
            />
          ))}

          {bedsByWard.size === 0 && (
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
              Nenhum leito encontrado. Configure setores e leitos primeiro.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

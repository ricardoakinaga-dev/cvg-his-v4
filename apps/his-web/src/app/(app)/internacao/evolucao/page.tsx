'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listInpatientStays,
  getWards,
  type InpatientStayRecord,
  type WardRecord
} from '../../../../lib/api';
import { getAuthSession } from '../../../../lib/auth';
import { can, resolvePermissions } from '../../../../lib/permissions';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: ['inpatient.read', 'clinicalNotes.write'],
  enfermagem: ['inpatient.read', 'clinicalNotes.write']
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

function formatDurationSince(isoDate: string): string {
  const admittedAt = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - admittedAt.getTime();

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

type TimelineEvent = {
  id: string;
  type: 'admission' | 'transfer' | 'clinical_note' | 'medication' | 'vital_signs' | 'discharge';
  timestamp: string;
  title: string;
  description?: string;
  author?: string;
};

function TimelineItem({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const iconMap: Record<TimelineEvent['type'], string> = {
    admission: '🏥',
    transfer: '↗️',
    clinical_note: '📝',
    medication: '💊',
    vital_signs: '❤️',
    discharge: '✅'
  };

  const colorMap: Record<TimelineEvent['type'], string> = {
    admission: '#22c55e',
    transfer: '#f59e0b',
    clinical_note: '#3b82f6',
    medication: '#8b5cf6',
    vital_signs: '#ef4444',
    discharge: '#6b7280'
  };

  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
      {/* Timeline line */}
      {!isLast && (
        <div
          style={{
            position: 'absolute',
            left: 15,
            top: 32,
            bottom: -16,
            width: 2,
            background: '#e2e8f0'
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: colorMap[event.type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          flexShrink: 0,
          zIndex: 1
        }}
      >
        {iconMap[event.type]}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
              {event.title}
            </p>
            {event.description && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                {event.description}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
              {formatDateTime(event.timestamp)}
            </p>
            {event.author && (
              <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                {event.author}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StayCard({
  stay,
  wardName,
  permissions
}: {
  stay: InpatientStayRecord;
  wardName: string;
  permissions: string[];
}) {
  const canWriteClinical = can(permissions, 'clinicalNotes.write');

  // Generate mock timeline events based on stay data
  const timelineEvents: TimelineEvent[] = [
    {
      id: '1',
      type: 'admission',
      timestamp: stay.admittedAt,
      title: 'Admissão',
      description: stay.chiefComplaint || 'Paciente admitido para internação',
      author: 'Dr. Sistema'
    }
  ];

  if (stay.status === 'discharged' && stay.dischargedAt) {
    timelineEvents.push({
      id: '2',
      type: 'discharge',
      timestamp: stay.dischargedAt,
      title: 'Alta',
      description: stay.reason || 'Paciente recebeu alta',
      author: 'Dr. Sistema'
    });
  }

  return (
    <article
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#fff',
          padding: '16px 20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>
              Paciente: {stay.patientId.slice(0, 8)}...
            </h3>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
              {wardName} • Leito: {stay.bedId.slice(0, 6)}...
            </p>
          </div>
          <span
            style={{
              background: stay.status === 'active' ? '#22c55e' : '#6b7280',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase'
            }}
          >
            {stay.status === 'active' ? 'Ativo' : 'Alta'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, opacity: 0.9 }}>
          <span>⏱️ Internado há {formatDurationSince(stay.admittedAt)}</span>
          {stay.chiefComplaint && <span>📋 {stay.chiefComplaint}</span>}
        </div>
      </header>

      {/* Timeline */}
      <div style={{ padding: 16 }}>
        <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
          LINHA DO TEMPO
        </h4>
        <div style={{ display: 'grid', gap: 0 }}>
          {timelineEvents.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={index === timelineEvents.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap'
        }}
      >
        <Link
          href={`/inpatient/stays/${stay.id}`}
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
          Ver Detalhes
        </Link>

        {canWriteClinical && stay.status === 'active' && (
          <Link
            href={`/inpatient/stays/${stay.id}?action=evolve`}
            style={{
              border: '1px solid #0369a1',
              borderRadius: 6,
              background: '#0ea5e9',
              color: '#fff',
              padding: '8px 14px',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500
            }}
          >
            + Evolução
          </Link>
        )}

        <Link
          href={`/patients/${stay.patientId}`}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#fff',
            color: '#0f172a',
            padding: '8px 14px',
            textDecoration: 'none',
            fontSize: 13
          }}
        >
          Ver Paciente
        </Link>
      </div>
    </article>
  );
}

export default function EvolucaoPage() {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadInpatient = can(permissions, 'inpatient.read');

  const [stays, setStays] = useState<InpatientStayRecord[]>([]);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadWards = useCallback(async () => {
    try {
      const result = await getWards({ pageSize: 100 });
      setWards(result.data);
    } catch (err) {
      console.error('Failed to load wards:', err);
    }
  }, []);

  const loadStays = useCallback(async () => {
    if (!canReadInpatient) return;

    setLoading(true);
    setError(null);
    try {
      const result = await listInpatientStays({
        status: 'active',
        wardId: selectedWardId || undefined,
        page: 1,
        pageSize: 50
      });
      setStays(result.data);
    } catch (err) {
      console.error('Failed to load stays:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar evoluções');
    } finally {
      setLoading(false);
    }
  }, [canReadInpatient, selectedWardId]);

  useEffect(() => {
    void loadWards();
  }, [loadWards]);

  useEffect(() => {
    void loadStays();
  }, [loadStays]);

  const getWardName = (wardId: string) => {
    return wards.find(w => w.id === wardId)?.name || 'Setor desconhecido';
  };

  // Filter stays by search query
  const filteredStays = useMemo(() => {
    if (!searchQuery.trim()) return stays;
    const query = searchQuery.toLowerCase();
    return stays.filter(stay =>
      stay.patientId.toLowerCase().includes(query) ||
      stay.chiefComplaint?.toLowerCase().includes(query) ||
      stay.reason?.toLowerCase().includes(query)
    );
  }, [stays, searchQuery]);

  // Group stays by ward
  const staysByWard = useMemo(() => {
    const map = new Map<string, InpatientStayRecord[]>();
    for (const stay of filteredStays) {
      const wardStays = map.get(stay.wardId) || [];
      wardStays.push(stay);
      map.set(stay.wardId, wardStays);
    }
    return map;
  }, [filteredStays]);

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
            Seu perfil não possui permissão para visualizar evoluções.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
          Evolução Clínica
        </h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Acompanhamento e registro de evolução de pacientes internados
        </p>
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
            onChange={e => setSelectedWardId(e.target.value)}
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
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Buscar</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Paciente, queixa..."
            style={{
              minWidth: 200,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1'
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => void loadStays()}
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

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          Carregando pacientes...
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredStays.length === 0 && (
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
          <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Nenhum paciente internado</h3>
          <p style={{ margin: 0 }}>
            {selectedWardId || searchQuery
              ? 'Tente ajustar os filtros para ver mais resultados.'
              : 'Não há pacientes ativos no momento.'}
          </p>
        </div>
      )}

      {/* Stay Cards by Ward */}
      {!loading && filteredStays.length > 0 && (
        <div style={{ display: 'grid', gap: 24 }}>
          {Array.from(staysByWard.entries()).map(([wardId, wardStays]) => (
            <section key={wardId}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  margin: '0 0 12px',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                🏥 {getWardName(wardId)}
                <span
                  style={{
                    background: '#e2e8f0',
                    padding: '2px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 500
                  }}
                >
                  {wardStays.length} paciente{wardStays.length !== 1 ? 's' : ''}
                </span>
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  gap: 16
                }}
              >
                {wardStays.map(stay => (
                  <StayCard
                    key={stay.id}
                    stay={stay}
                    wardName={getWardName(stay.wardId)}
                    permissions={permissions}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

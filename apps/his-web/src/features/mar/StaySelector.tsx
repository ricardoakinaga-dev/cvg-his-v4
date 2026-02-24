'use client';

import { useEffect, useMemo, useState } from 'react';
import { listInpatientStays, type InpatientStayRecord, type BedMapItem } from '../../lib/api';
import { useWardMarOverview } from './useWardMarOverview';

type StaySelectorProps = {
    wardId: string;
    selectedStayId: string | null;
    onSelectStay: (stayId: string) => void;
    autoRefreshEnabled?: boolean;
    beds?: BedMapItem[];
    loadingBeds?: boolean;
};

function formatStayDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function StaySelector({
    wardId,
    selectedStayId,
    onSelectStay,
    autoRefreshEnabled = false,
    beds = [],
    loadingBeds = false
}: StaySelectorProps): JSX.Element {
    const [stays, setStays] = useState<InpatientStayRecord[]>([]);
    const [loadingStays, setLoadingStays] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Memoize stayIds for the hook to prevent unnecessary re-renders/fetches
    const stayIds = useMemo(() => stays.map(s => s.id), [stays]);

    // Hook to fetch overview (fan-out)
    const { overview, loading: loadingOverview, refresh: refreshOverview } = useWardMarOverview(wardId, stayIds);

    useEffect(() => {
        let mounted = true;

        async function fetchStays() {
            if (!wardId) {
                setStays([]);
                return;
            }

            try {
                setLoadingStays(true);
                setError(null);
                // Page size 200 to cover most wards without pagination complexity for now
                const response = await listInpatientStays({
                    wardId,
                    status: 'active',
                    page: 1,
                    pageSize: 200
                });

                if (mounted) {
                    setStays(response.data);
                }
            } catch (err) {
                if (mounted) {
                    setError('Erro ao carregar pacientes.');
                    console.error(err);
                }
            } finally {
                if (mounted) {
                    setLoadingStays(false);
                }
            }
        }

        void fetchStays();

        return () => {
            mounted = false;
        };
    }, [wardId]);

    // Auto-refresh interval (120s) for overview
    useEffect(() => {
        if (!autoRefreshEnabled || !wardId || stayIds.length === 0) return;

        const interval = setInterval(() => {
            void refreshOverview();
        }, 120 * 1000); // 120 seconds

        return () => clearInterval(interval);
    }, [autoRefreshEnabled, wardId, stayIds.length, refreshOverview]);

    if (!wardId) {
        return <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 10 }}>Selecione uma ala acima.</div>;
    }

    if (loadingStays) {
        return <div style={{ padding: 10, color: '#64748b' }}>Carregando pacientes...</div>;
    }

    if (error) {
        return <div style={{ padding: 10, color: '#ef4444' }}>{error}</div>;
    }

    if (stays.length === 0) {
        return <div style={{ padding: 10, color: '#64748b' }}>Nenhum paciente ativo nesta ala.</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3
                    style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        margin: '10px 0 0 0'
                    }}
                >
                    Pacientes ({stays.length})
                </h3>
                {stays.length > 0 && (
                    <button
                        onClick={() => void refreshOverview()}
                        disabled={loadingOverview}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#3b82f6',
                            fontSize: 12,
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        {loadingOverview ? 'Atualizando...' : 'Atualizar Status'}
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stays.map((stay) => {
                    const isSelected = stay.id === selectedStayId;
                    const stayOverview = overview[stay.id];
                    const overdueCount = stayOverview?.overdueCount ?? 0;
                    const upcomingCount = stayOverview?.upcomingCount ?? 0;
                    const hasError = !!stayOverview?.error;
                    const bedItem = beds.find(b => b.stay?.id === stay.id);

                    const titleLabel = bedItem?.stay
                        ? `${bedItem.stay.patientName} (${bedItem.stay.species})`
                        : `Paciente ${stay.patientId.substring(0, 8)}...`;

                    const bedLabel = bedItem?.bed
                        ? `Leito: ${bedItem.bed.name}`
                        : `Leito: ${stay.bedId.substring(0, 8)}...`;

                    return (
                        <button
                            key={stay.id}
                            type="button"
                            onClick={() => onSelectStay(stay.id)}
                            style={{
                                textAlign: 'left',
                                background: isSelected ? '#eff6ff' : '#fff',
                                border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: '10px 12px',
                                cursor: 'pointer',
                                display: 'grid',
                                gap: 4,
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', width: '100%' }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: isSelected ? '#1e40af' : '#0f172a' }}>
                                    {titleLabel}
                                </div>

                                <div style={{ display: 'flex', gap: 4 }}>
                                    {overdueCount > 0 && (
                                        <span style={{
                                            background: '#ef4444',
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: 999
                                        }}>
                                            {overdueCount}
                                        </span>
                                    )}
                                    {upcomingCount > 0 && (
                                        <span style={{
                                            background: '#3b82f6',
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: 999
                                        }}>
                                            {upcomingCount}
                                        </span>
                                    )}
                                    {hasError && (
                                        <span title="Erro ao carregar status" style={{ color: '#ef4444', fontWeight: 'bold' }}>!</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                {bedLabel}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                Admissão: {formatStayDate(stay.admittedAt)}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuthSession } from '../../lib/auth';
import { ROLE_PERMISSIONS, can, resolvePermissions } from '../../lib/permissions';
import { getBedMap, type BedMapResponse, type BedMapItem } from '../../lib/api';

import { MedDueList } from '../../components/MedDueList';
import { StaySelector } from './StaySelector';
import { WardSelector } from './WardSelector';

export function MarConsole(): JSX.Element {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const wardId = searchParams.get('wardId');
    const stayId = searchParams.get('stayId');

    const [manualMode, setManualMode] = useState(false);

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(60); // seconds
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isMedListBusy, setIsMedListBusy] = useState(false);

    // BedMap state
    const [bedMap, setBedMap] = useState<BedMapItem[]>([]);
    const [loadingBedMap, setLoadingBedMap] = useState(false);

    // Ref to hold the refresh function from MedDueList
    const refreshMedListRef = useRef<((stayId?: string) => Promise<void>) | null>(null);

    // Fetch BedMap when wardId changes
    useEffect(() => {
        let mounted = true;
        async function fetchBedMap() {
            if (!wardId) {
                setBedMap([]);
                return;
            }
            try {
                setLoadingBedMap(true);
                const data = await getBedMap(wardId);
                if (mounted) {
                    const allBeds = data.wards.flatMap(w => w.beds);
                    setBedMap(allBeds);
                }
            } catch (err) {
                console.error('Failed to load bed map in MarConsole', err);
            } finally {
                if (mounted) setLoadingBedMap(false);
            }
        }
        void fetchBedMap();
        return () => { mounted = false; };
    }, [wardId]);

    const handleSelectWard = useCallback(
        (newWardId: string) => {
            const params = new URLSearchParams(searchParams);
            params.set('wardId', newWardId);
            params.delete('stayId'); // Clear stay when ward changes
            router.replace(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams]
    );

    const handleSelectStay = useCallback(
        (newStayId: string) => {
            const params = new URLSearchParams(searchParams);
            if (wardId) params.set('wardId', wardId);
            params.set('stayId', newStayId);
            router.replace(`${pathname}?${params.toString()}`);
        },
        [pathname, router, searchParams, wardId]
    );

    // Polling effect
    useEffect(() => {
        if (!autoRefresh || !stayId) return;

        const interval = setInterval(async () => {
            // Pause if busy (modal open etc)
            if (isMedListBusy) return;

            if (refreshMedListRef.current) {
                try {
                    await refreshMedListRef.current();
                    setLastUpdated(new Date());
                } catch (err) {
                    console.error('Auto-refresh failed', err);
                }
            }
        }, refreshInterval * 1000);

        return () => clearInterval(interval);
    }, [autoRefresh, stayId, refreshInterval, isMedListBusy]);


    const session = getAuthSession();
    const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
    const canReadMedAdmin = can(permissions, 'medadmin.read');

    // If manual mode is active, just show the legacy view
    if (manualMode) {
        return (
            <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setManualMode(false)}
                        style={{
                            fontSize: 13,
                            color: '#64748b',
                            background: 'transparent',
                            border: '1px solid #cbd5e1',
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer'
                        }}
                    >
                        ← Voltar para lista
                    </button>
                </div>
                <MedDueList />
            </div>
        );
    }

    if (!canReadMedAdmin) {
        return (
            <div style={{
                padding: 24,
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                textAlign: 'center'
            }}>
                <h2 style={{ color: '#b45309', marginBottom: 8 }}>Acesso Negado</h2>
                <p style={{ color: '#64748b' }}>Você não tem permissão para acessar o MAR (<code>medadmin.read</code>).</p>
            </div>
        );
    }

    const currentBed = useMemo(() => {
        if (!stayId) return null;
        return bedMap.find(b => b.stay?.id === stayId) || null;
    }, [stayId, bedMap]);

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '300px 1fr',
                gap: 24,
                alignItems: 'start',
                minHeight: '400px'
            }}
        >
            {/* Left Column: Navigation/Selectors */}
            <aside
                style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20
                }}
            >
                <WardSelector
                    selectedWardId={wardId}
                    onSelectWard={handleSelectWard}
                />

                {wardId ? (
                    <StaySelector
                        wardId={wardId}
                        selectedStayId={stayId}
                        onSelectStay={handleSelectStay}
                        autoRefreshEnabled={autoRefresh}
                        beds={bedMap}
                        loadingBeds={loadingBedMap}
                    />
                ) : (
                    <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                        Selecione uma ala para ver os pacientes.
                    </div>
                )}

                {process.env.NODE_ENV !== 'production' && (
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 'auto' }}>
                        <button
                            onClick={() => setManualMode(true)}
                            style={{
                                width: '100%',
                                fontSize: 13,
                                color: '#64748b',
                                background: '#fff',
                                border: '1px dashed #cbd5e1',
                                padding: '8px',
                                borderRadius: 6,
                                cursor: 'pointer'
                            }}
                        >
                            Entrar com ID manual...
                        </button>
                    </div>
                )}
            </aside>

            {/* Right Column: Content */}
            <main>
                {stayId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Auto-refresh Controls */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 12,
                            background: '#fff',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#475569', userSelect: 'none' }}>
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                />
                                Auto-refresh
                            </label>

                            {autoRefresh && (
                                <select
                                    value={refreshInterval}
                                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: 4,
                                        border: '1px solid #cbd5e1',
                                        fontSize: 13,
                                        background: '#f8fafc'
                                    }}
                                >
                                    <option value={30}>30s</option>
                                    <option value={60}>60s</option>
                                    <option value={120}>120s</option>
                                </select>
                            )}

                            {lastUpdated && (
                                <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>
                                    Atualizado às {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                        </div>

                        <MedDueList
                            stayId={stayId}
                            hideStaySelector={true}
                            defaultWindowMin={120}
                            patientName={currentBed?.stay?.patientName}
                            bedName={currentBed?.bed.name}
                            onRegisterRefresh={(fn) => {
                                refreshMedListRef.current = fn;
                            }}
                            onBusyChange={setIsMedListBusy}
                        />
                    </div>
                ) : (
                    <div
                        style={{
                            border: '1px dashed #cbd5e1',
                            borderRadius: 12,
                            padding: 40,
                            textAlign: 'center',
                            background: '#f8fafc'
                        }}
                    >
                        <h3 style={{ margin: '0 0 8px', color: '#334155' }}>Nenhum paciente selecionado</h3>
                        <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: 14 }}>
                            Selecione um paciente na lista à esquerda para visualizar o MAR.
                        </p>

                        <Link
                            href="/inpatient/bedmap"
                            style={{
                                display: 'inline-block',
                                background: '#0f172a',
                                color: '#fff',
                                padding: '10px 20px',
                                borderRadius: 8,
                                textDecoration: 'none',
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            Abrir Mapa de Leitos
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}

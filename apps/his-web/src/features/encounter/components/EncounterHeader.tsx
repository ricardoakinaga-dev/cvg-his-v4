import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { EncounterData } from '../types';
import { formatDateTime } from '../utils/helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Primitives';
import { Button } from '@/components/ui/Button';
import { theme, px } from '@/lib/theme';
import { listMedicationOrders } from '@/lib/api';

interface EncounterHeaderProps {
    data: EncounterData;
}

export function EncounterHeader({ data }: EncounterHeaderProps) {
    const { encounter } = data;
    const [copied, setCopied] = useState(false);

    // Active Prescription Badge State
    const [activePrescriptionsCount, setActivePrescriptionsCount] = useState<number | null>(null);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);

    // Navigation for badge click
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        let mounted = true;
        const fetchActiveOrders = async () => {
            try {
                // Non-blocking fetch
                const response = await listMedicationOrders({
                    encounterId: encounter.id,
                    status: 'active',
                    page: 1,
                    pageSize: 1 // We only need the total count
                });
                if (mounted) {
                    setActivePrescriptionsCount(response.total);
                }
            } catch (error) {
                console.error('Failed to fetch active prescriptions count', error);
                // On error, we just don't show the badge, so state remains null or we can set to null
                if (mounted) setActivePrescriptionsCount(null);
            } finally {
                if (mounted) setLoadingPrescriptions(false);
            }
        };

        void fetchActiveOrders();

        return () => { mounted = false; };
    }, [encounter.id]);

    const handleBadgeClick = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'meds');
        router.push(`${pathname}?${params.toString()}`);
    };

    const copyId = () => {
        void navigator.clipboard.writeText(encounter.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyLink = () => {
        void navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getPrescriptionLabel = (count: number) => {
        if (count === 0) return '0 ordens';
        if (count === 1) return '1 ordem';
        return `${count} ordens`;
    };

    return (
        <Card style={{ padding: px(16) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: px(16) }}>

                {/* Left Block: Title, Status, IDs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
                        <h1 style={{ margin: 0, fontSize: px(20), lineHeight: 1.2 }}>Atendimento</h1>
                        <Badge
                            variant={encounter.status === 'open' ? 'success' : 'neutral'}
                            label={encounter.status === 'open' ? 'Aberto' : 'Fechado'}
                        />

                        {/* Active Prescription Badge */}
                        {loadingPrescriptions ? (
                            <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>...</span>
                        ) : activePrescriptionsCount !== null ? (
                            <button
                                onClick={handleBadgeClick}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Ir para Prescrições"
                            >
                                <Badge
                                    variant={activePrescriptionsCount > 0 ? 'warning' : 'neutral'}
                                    label={`💊 ${getPrescriptionLabel(activePrescriptionsCount)}`}
                                />
                            </button>
                        ) : null}

                        <span
                            style={{
                                fontFamily: theme.typography.mono,
                                fontSize: px(12),
                                color: theme.colors.textSecondary,
                                background: theme.colors.pageBg,
                                padding: '2px 6px',
                                borderRadius: px(4)
                            }}
                            title={encounter.id}
                        >
                            #{encounter.id.slice(-6)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: px(16), fontSize: px(13), color: theme.colors.textSecondary, flexWrap: 'wrap' }}>
                        <span>
                            Início: <strong style={{ color: theme.colors.textPrimary }}>{formatDateTime(encounter.openedAt)}</strong>
                        </span>
                        {encounter.closedAt && (
                            <span>
                                Fim: <strong style={{ color: theme.colors.textPrimary }}>{formatDateTime(encounter.closedAt)}</strong>
                            </span>
                        )}
                        <span>
                            Motivo: <strong style={{ color: theme.colors.textPrimary }}>{encounter.reason ?? 'Não informado'}</strong>
                        </span>
                    </div>
                </div>

                {/* Right Block: Actions & Context Links */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: px(12) }}>

                    {/* Primary Links */}
                    <div style={{ display: 'flex', gap: px(8) }}>
                        <Link
                            href={`/patients/${encounter.patientId}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <Button variant="secondary" size="sm" style={{ fontSize: px(13) }}>
                                👤 Paciente: ...{encounter.patientId.slice(-4)}
                            </Button>
                        </Link>
                        <Link
                            href={`/owners/${encounter.ownerId}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <Button variant="secondary" size="sm" style={{ fontSize: px(13) }}>
                                🏠 Tutor: ...{encounter.ownerId.slice(-4)}
                            </Button>
                        </Link>
                    </div>

                    {/* Secondary Actions */}
                    <div style={{ display: 'flex', gap: px(8), alignItems: 'center' }}>
                        <button
                            onClick={copyId}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: theme.colors.info,
                                cursor: 'pointer',
                                fontSize: px(12),
                                textDecoration: 'underline'
                            }}
                        >
                            {copied ? 'Copiado!' : 'Copiar ID'}
                        </button>
                        <span style={{ color: theme.colors.border }}>|</span>
                        <button
                            onClick={copyLink}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: theme.colors.textSecondary,
                                cursor: 'pointer',
                                fontSize: px(12),
                                textDecoration: 'underline'
                            }}
                        >
                            Copiar Link
                        </button>
                        <Button
                            variant="danger"
                            size="sm"
                            disabled
                            title="Funcionalidade não disponível na API (Fase 1)"
                            style={{ marginLeft: px(8), fontSize: px(12), padding: '4px 8px' }}
                        >
                            Encerrar
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

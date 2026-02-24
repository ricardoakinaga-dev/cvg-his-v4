import { useState } from 'react';
import Link from 'next/link';
import { theme, px } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertsPanel } from '@/components/AlertsPanel';
import { AuditTrail } from '@/components/AuditTrail';
import { PatientSummaryResponse } from '@/lib/api';

interface EncounterSidebarProps {
    children?: React.ReactNode;
    patientSummary: PatientSummaryResponse | null;
    loading: boolean;
    error: string | null;
    mobile?: boolean;
}

export function EncounterSidebar({ children, patientSummary, loading, error, mobile = false }: EncounterSidebarProps) {
    const [expanded, setExpanded] = useState(false);

    // Initial Loading State
    if (loading) {
        return (
            <aside style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                <Card style={{ padding: px(16) }}>Carregando dados do paciente...</Card>
                {!mobile && children}
            </aside>
        );
    }

    // Error State
    if (error || !patientSummary) {
        return (
            <aside style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                <Card style={{ padding: px(16), color: theme.colors.danger }}>
                    Erro ao carregar paciente: {error ?? 'Dados não encontrados'}
                </Card>
                {!mobile && children}
            </aside>
        );
    }

    const { patient, auditTrail } = patientSummary;

    // Define the content separately to reuse it or conditionally render it
    const Content = (
        <>
            {/* Patient Card */}
            <Card style={{ padding: px(16) }}>
                <div style={{ marginBottom: px(12) }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: px(18) }}>{patient.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: px(8), fontSize: px(14), color: theme.colors.textSecondary }}>
                        <span>{patient.species}</span>
                        {patient.breed && <span>• {patient.breed}</span>}
                        {patient.sex && <span>• {patient.sex}</span>}
                    </div>
                </div>

                {patient.microchip && (
                    <div style={{
                        background: theme.colors.pageBg,
                        padding: px(8),
                        borderRadius: px(theme.radius.sm),
                        marginBottom: px(12),
                        fontSize: px(12),
                        display: 'flex',
                        gap: px(8)
                    }}>
                        <strong>Microchip:</strong>
                        <span style={{ fontFamily: theme.typography.mono }}>{patient.microchip}</span>
                    </div>
                )}

                <Link href={`/patients/${patient.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                        Ver cadastro completo
                    </Button>
                </Link>
            </Card>

            {/* Alerts Panel */}
            <AlertsPanel
                alerts={patient.alerts}
                highlighted={patient.highlightedAlerts}
            />

            {/* Audit Trail */}
            <AuditTrail
                title="Últimas alterações"
                events={auditTrail.slice(0, 5)}
            />

            {/* Additional Children (e.g. MedOrders) */}
            {children}
        </>
    );

    // Mobile Layout: Collapsible Header
    if (mobile) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
                <button
                    onClick={() => setExpanded(!expanded)}
                    style={{
                        background: theme.colors.surface,
                        border: `1px solid ${theme.colors.border}`,
                        padding: px(12),
                        borderRadius: px(theme.radius.md),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: px(14),
                        fontWeight: 600,
                        width: '100%'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
                        <span style={{ fontSize: px(16) }}>{patient.name}</span>
                        <span style={{ fontWeight: 400, color: theme.colors.textSecondary }}>
                            {patient.species} • {patient.sex}
                        </span>
                    </div>
                    <div style={{ color: theme.colors.primary, fontSize: px(12) }}>
                        {expanded ? '▲ Ocultar' : '▼ Detalhes'}
                    </div>
                </button>

                {expanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: px(16), paddingBottom: px(16) }}>
                        {Content}
                    </div>
                )}
            </div>
        );
    }

    // Desktop Layout: Sidebar
    return (
        <aside style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
            {Content}
        </aside>
    );
}

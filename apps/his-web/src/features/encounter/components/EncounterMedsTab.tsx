import { useState, useMemo } from 'react';
import { MedOrdersPanel } from '@/components/MedOrdersPanel';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card'; // Ensure Card is imported
import { theme } from '@/lib/theme';
import { listMedicationOrders, createDocument, attachDocumentToEncounter } from '@/lib/api';
import { buildPrescriptionSummary } from '@/features/meds/export';
import { PrescriptionSummaryModal } from '@/features/meds/PrescriptionSummaryModal';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { getAuthSession } from '@/lib/auth';
import { resolvePermissions, can, ROLE_PERMISSIONS } from '@/lib/permissions';

type EncounterMedsTabProps = {
    patientId: string;
    encounterId: string;
    ownerId?: string;
};

export function EncounterMedsTab({ patientId, encounterId }: EncounterMedsTabProps): JSX.Element {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Permissions Check
    const session = getAuthSession();
    const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
    const canReadOrders = can(permissions, 'medorder.read');

    // Summary State
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [loadingSummary, setLoadingSummary] = useState(false);

    // Document Registration State
    const [registeringDoc, setRegisteringDoc] = useState(false);

    const handleCopySummary = async () => {
        setLoadingSummary(true);
        try {
            // Option B: Fetch fresh data to ensure we export what is saved
            const response = await listMedicationOrders({
                encounterId,
                status: 'active',
                page: 1,
                pageSize: 100 // Should cover most cases
            });

            const text = buildPrescriptionSummary({
                patientLabel: `Paciente ID: ${patientId}`,
                encounterId,
                orders: response.data,
                generatedAt: new Date()
            });

            setSummaryText(text);
            setSummaryOpen(true);
        } catch (error) {
            console.error('Failed to generate summary:', error);
            alert('Erro ao gerar resumo da prescrição. Tente novamente.');
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleRegisterDocument = async () => {
        if (!summaryText) return;
        setRegisteringDoc(true);

        try {
            // 1. Create Document Record (Logical)
            const doc = await createDocument({
                filename: `prescricao-encounter-${encounterId.slice(-6)}.txt`,
                mimeType: 'text/plain',
                size: new Blob([summaryText]).size // Approximate size
            });

            // 2. Attach to Encounter
            await attachDocumentToEncounter(encounterId, doc.id);

            alert('Documento registrado com sucesso! Navegando para a aba Documentos...');
            setSummaryOpen(false);

            // 3. Navigate to Documents Tab
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', 'documents');
            router.push(`${pathname}?${params.toString()}`);

        } catch (error) {
            console.error('Failed to register document:', error);
            alert('Erro ao registrar documento. Verifique o console.');
        } finally {
            setRegisteringDoc(false);
        }
    };

    const handleNavigateToSoap = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'soap');
        router.push(`${pathname}?${params.toString()}`);
    };

    if (!canReadOrders) {
        return (
            <Card style={{ padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <h3 style={{ margin: 0, color: theme.colors.textPrimary }}>Sem permissão para visualizar prescrição</h3>
                <p style={{ margin: 0, color: theme.colors.textSecondary }}>
                    Você precisa da permissão <code>medorder.read</code> para acessar esta área.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: theme.colors.textSecondary }}>
                    Seu perfil atual: <strong>{session?.role || 'desconhecido'}</strong>
                </p>
            </Card>
        );
    }

    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Button variant="secondary" onClick={handleNavigateToSoap}>
                        ⬅ Voltar (SOAP)
                    </Button>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: theme.colors.textPrimary }}>
                            Prescrição
                        </h2>
                        <p style={{ margin: 0, color: theme.colors.textSecondary, fontSize: 14 }}>
                            Ordens ativas vinculadas ao atendimento
                        </p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    onClick={handleCopySummary}
                    disabled={loadingSummary}
                >
                    {loadingSummary ? 'Gerando...' : '📋 Copiar resumo'}
                </Button>
            </div>

            {/* Clinical Warning */}
            <div style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                padding: '12px 16px',
                color: '#92400e',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8
            }}>
                <span>⚠️</span>
                <span>
                    Estas ordens estão vinculadas ao atendimento (encounter).
                    MAR e checagem ficam na internação (stay).
                </span>
            </div>

            {/* Main Panel */}
            <MedOrdersPanel
                patientId={patientId}
                encounterId={encounterId}
            />

            {/* Export Modal */}
            <PrescriptionSummaryModal
                open={summaryOpen}
                summaryText={summaryText}
                onClose={() => setSummaryOpen(false)}
                onRegister={handleRegisterDocument}
                registering={registeringDoc}
            />
        </section>
    );
}

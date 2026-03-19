'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ApiError,
    createMedicationAdministration,
    getMedicationDueDoses,
    listMedicationAdministrations,
    type MedicationAdministrationCreateInput,
    type MedicationAdministrationRecord,
    type MedicationDueDoseItem,
    type MedicationDueDosesResponse
} from '../../lib/api';
import { getAuthSession } from '../../lib/auth';
import { MedAdminActionModal } from '../../components/MedAdminActionModal';
import { MedAdminHistory } from '../../components/MedAdminHistory';
import { Button } from '@/components/ui/Button';
import { theme, px } from '../../lib/theme';
import {
    resolvePermissions,
    can,
    extractApiErrorMessage,
    formatDateTime,
    itemLabel,
    dueSort
} from './mar-logic';

type StayMarPanelProps = {
    stayId: string;
};

type MedAdminAction = 'administered' | 'refused' | 'delayed';

type ActionState = {
    item: MedicationDueDoseItem;
    action: MedAdminAction;
} | null;

export function StayMarPanel({ stayId }: StayMarPanelProps): JSX.Element {
    const session = getAuthSession();
    const permissions = useMemo(() => resolvePermissions(session), [session]);
    const canReadMedAdmin = can(permissions, 'medadmin.read');
    const canWriteMedAdmin = can(permissions, 'medadmin.write');

    // State
    const [windowMin, setWindowMin] = useState(180);

    // Data State
    const [dueData, setDueData] = useState<MedicationDueDosesResponse | null>(null);
    const [historyItems, setHistoryItems] = useState<MedicationAdministrationRecord[]>([]);

    // Loading/Error State
    const [loadingDue, setLoadingDue] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [dueError, setDueError] = useState<string | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    // Action State
    const [actionState, setActionState] = useState<ActionState>(null);
    const [actionSubmitting, setActionSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadDue = useCallback(async () => {
        if (!stayId) return;
        setLoadingDue(true);
        setDueError(null);
        try {
            const response = await getMedicationDueDoses({ stayId, windowMin });
            setDueData({
                ...response,
                overdue: [...response.overdue].sort(dueSort),
                upcoming: [...response.upcoming].sort(dueSort)
            });
        } catch (error) {
            setDueData(null);
            setDueError(extractApiErrorMessage(error));
        } finally {
            setLoadingDue(false);
        }
    }, [stayId, windowMin]);

    const loadHistory = useCallback(async () => {
        if (!stayId) return;
        setLoadingHistory(true);
        setHistoryError(null);
        try {
            const response = await listMedicationAdministrations({
                stayId,
                page: 1,
                pageSize: 40
            });
            setHistoryItems(response.data);
        } catch (error) {
            setHistoryItems([]);
            setHistoryError(extractApiErrorMessage(error));
        } finally {
            setLoadingHistory(false);
        }
    }, [stayId]);

    const refreshAll = useCallback(() => {
        setFeedbackMessage(null);
        void Promise.all([loadDue(), loadHistory()]);
    }, [loadDue, loadHistory]);

    // Initial Load
    useEffect(() => {
        if (canReadMedAdmin && stayId) {
            refreshAll();
        }
    }, [canReadMedAdmin, stayId, windowMin]); // Reload when windowMin changes

    const handleAction = async (payload: { status: MedAdminAction; reason?: string; delayedUntil?: string }) => {
        if (!actionState || !stayId) return;

        setActionSubmitting(true);
        setActionError(null);
        setFeedbackMessage(null);

        const requestPayload: MedicationAdministrationCreateInput = {
            orderId: actionState.item.orderId,
            stayId,
            encounterId: actionState.item.encounterId ?? undefined,
            scheduledFor: actionState.item.scheduledFor,
            status: payload.status,
            reason: payload.reason,
            delayedUntil: payload.delayedUntil
        };

        if (payload.status === 'administered') {
            requestPayload.effectiveAt = new Date().toISOString();
        }

        try {
            await createMedicationAdministration(requestPayload);
            setActionState(null);
            setFeedbackMessage('Ação registrada com sucesso.');
            refreshAll();
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                setActionError('Dose já processada. Atualizando lista...');
                refreshAll();
                return;
            }
            setActionError(extractApiErrorMessage(error));
        } finally {
            setActionSubmitting(false);
        }
    };

    if (!canReadMedAdmin) {
        return (
            <div style={{ padding: 16, border: `1px solid ${theme.colors.warning}`, borderRadius: 8, color: theme.colors.warning, background: '#fffbeb' }}>
                Sem permissão para ver MAR (medadmin.read).
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: px(24) }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>MAR (Stay)</h3>
                    <select
                        value={windowMin}
                        onChange={e => setWindowMin(Number(e.target.value))}
                        style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${theme.colors.border}`, fontSize: 14 }}
                    >
                        <option value={60}>1 hora</option>
                        <option value={120}>2 horas</option>
                        <option value={180}>3 horas</option>
                        <option value={240}>4 horas</option>
                    </select>
                </div>
                <Button size="sm" variant="secondary" onClick={refreshAll} disabled={loadingDue || loadingHistory}>
                    {loadingDue ? 'Carregando...' : 'Atualizar'}
                </Button>
            </div>

            {feedbackMessage && <div style={{ color: theme.colors.success, fontSize: 14, fontWeight: 500 }}>{feedbackMessage}</div>}
            {dueError && <div style={{ color: theme.colors.danger, fontSize: 14 }}>Erro ao carregar doses: {dueError}</div>}

            {/* Overdue Section */}
            <div style={{ display: 'grid', gap: 8 }}>
                <h4 style={{ margin: 0, color: theme.colors.danger, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
                    VENCIDAS
                    {(dueData?.overdue.length ?? 0) > 0 && <span>{dueData?.overdue.length}</span>}
                </h4>

                {loadingDue && !dueData && <div style={{ color: theme.colors.textSecondary, fontSize: 13 }}>Carregando...</div>}

                {!loadingDue && (dueData?.overdue.length ?? 0) === 0 && (
                    <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                        Nenhuma dose vencida.
                    </div>
                )}

                {dueData?.overdue.map(item => (
                    <MarItem
                        key={`${item.orderId}-${item.scheduledFor}`}
                        item={item}
                        onAction={(act) => setActionState({ item, action: act })}
                        canWrite={canWriteMedAdmin}
                        variant="overdue"
                    />
                ))}
            </div>

            {/* Upcoming Section */}
            <div style={{ display: 'grid', gap: 8 }}>
                <h4 style={{ margin: 0, color: theme.colors.info, fontSize: 14 }}>PRÓXIMAS ({windowMin / 60}h)</h4>

                {!loadingDue && (dueData?.upcoming.length ?? 0) === 0 && (
                    <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                        Nenhuma dose próxima.
                    </div>
                )}

                {dueData?.upcoming.map(item => (
                    <MarItem
                        key={`${item.orderId}-${item.scheduledFor}`}
                        item={item}
                        onAction={(act) => setActionState({ item, action: act })}
                        canWrite={canWriteMedAdmin}
                        variant="upcoming"
                    />
                ))}
            </div>

            {/* History Section */}
            <MedAdminHistory
                loading={loadingHistory}
                errorMessage={historyError}
                items={historyItems}
            />

            <MedAdminActionModal
                open={Boolean(actionState)}
                action={actionState?.action ?? 'administered'}
                itemLabel={actionState ? itemLabel(actionState.item) : ''}
                submitting={actionSubmitting}
                errorMessage={actionError}
                onClose={() => {
                    if (actionSubmitting) return;
                    setActionState(null);
                    setActionError(null);
                }}
                onSubmit={handleAction}
            />
        </div>
    );
}

function MarItem({ item, onAction, canWrite, variant }: {
    item: MedicationDueDoseItem,
    onAction: (a: MedAdminAction) => void,
    canWrite: boolean,
    variant: 'overdue' | 'upcoming'
}) {
    const styleEnv = variant === 'overdue'
        ? { bg: '#fff1f2', border: theme.colors.danger, text: theme.colors.danger }
        : { bg: '#eff6ff', border: theme.colors.info, text: theme.colors.info };

    return (
        <div style={{
            background: styleEnv.bg,
            border: `1px solid ${styleEnv.border}`,
            borderRadius: 8,
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            gap: 12,
            flexWrap: 'wrap'
        }}>
            <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.medication.name}</div>
                <div style={{ fontSize: 13, color: '#334155' }}>
                    {item.medication.doseValue} {item.medication.doseUnit} • {item.medication.route}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                    {formatDateTime(item.scheduledFor, item.timezone)} • {item.patient.name}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                {canWrite ? (
                    <>
                        <Button size="sm" onClick={() => onAction('administered')} style={{ fontSize: 12, height: 28, padding: '0 10px' }}>Administrar</Button>
                        <Button size="sm" variant="secondary" onClick={() => onAction('refused')} style={{ fontSize: 12, height: 28, padding: '0 8px', color: theme.colors.danger, borderColor: theme.colors.danger }}>Recusar</Button>
                        <Button size="sm" variant="secondary" onClick={() => onAction('delayed')} style={{ fontSize: 12, height: 28, padding: '0 8px', color: theme.colors.info, borderColor: theme.colors.info }}>Atrasar</Button>
                    </>
                ) : (
                    <span title="Usuário sem permissão de escrita" style={{ cursor: 'not-allowed', opacity: 0.6, fontSize: 12, color: theme.colors.textSecondary, border: '1px solid #ccc', padding: '4px 8px', borderRadius: 4 }}>
                        Sem permissão
                    </span>
                )}
            </div>
        </div>
    )
}

'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  createMedicationAdministration,
  getMedicationDueDoses,
  listMedicationAdministrations,
  type MedicationAdministrationCreateInput,
  type MedicationDueDoseItem
} from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { can, resolvePermissions } from '../lib/permissions';
import { MedAdminActionModal } from './MedAdminActionModal';
import { MedAdminHistory } from './MedAdminHistory';

type MedAdminAction = 'administered' | 'refused' | 'delayed';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: ['medadmin.read', 'medlog.read'],
  enfermagem: ['medadmin.read', 'medadmin.write', 'medlog.read'],
  recepcao: []
};

function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const payload = error.payload;

    if (payload && typeof payload === 'object') {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }

      const issues = (payload as { issues?: Array<{ message?: unknown }> }).issues;
      if (Array.isArray(issues) && issues.length > 0) {
        const first = issues[0];
        if (first && typeof first.message === 'string') {
          return first.message;
        }
      }
    }

    return `Falha na requisicao (${error.status}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada.';
}

function formatDateTime(value: string, timezone?: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return timezone ? parsed.toLocaleString('pt-BR', { timeZone: timezone }) : parsed.toLocaleString('pt-BR');
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function dueSort(left: MedicationDueDoseItem, right: MedicationDueDoseItem): number {
  return new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime();
}

type MedDueListProps = {
  stayId?: string | null;
  defaultWindowMin?: number;
  hideStaySelector?: boolean;
  patientName?: string;
  bedName?: string;
  onStayIdChange?: (stayId: string | null) => void;
  onRegisterRefresh?: (fn: (targetStayId?: string) => Promise<void>) => void;
  onBusyChange?: (isBusy: boolean) => void;
};

export function MedDueList({
  stayId: propStayId,
  hideStaySelector = false,
  patientName,
  bedName,
  onStayIdChange,
  onRegisterRefresh,
  onBusyChange
}: MedDueListProps = {}): JSX.Element {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadMedAdmin = can(permissions, 'medadmin.read');
  const canWriteMedAdmin = can(permissions, 'medadmin.write');

  // If propStayId is provided, use it. Otherwise use internal state.
  const isControlled = propStayId !== undefined;

  const [internalStayId, setInternalStayId] = useState<string | null>(null);
  const stayId = isControlled ? propStayId : internalStayId;


  const [filterText, setFilterText] = useState('');
  const [filterRoute, setFilterRoute] = useState<string>('');
  const [filterFrequency, setFilterFrequency] = useState<string>('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Quick Action State
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [quickActionSubmitting, setQuickActionSubmitting] = useState(false);

  // Sync internal input only if not controlled (keeps UX consistent for manual mode)
  useEffect(() => {
    if (!isControlled && internalStayId) {
      setStayIdInput(internalStayId);
    }
  }, [internalStayId, isControlled]);

  const loadDue = useCallback(
    async (targetStayId: string) => {
      setLoadingDue(true);
      setDueError(null);

      try {
        const response = await getMedicationDueDoses({
          stayId: targetStayId,
          windowMin
        });

        // Store raw response
        setDueData(response);
      } catch (error) {
        setDueData(null);
        setDueError(extractApiErrorMessage(error));
      } finally {
        setLoadingDue(false);
      }
    },
    [windowMin]
  );

  const loadHistory = useCallback(async (targetStayId: string) => {
    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const response = await listMedicationAdministrations({
        stayId: targetStayId,
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
  }, []);

  const refreshAll = useCallback(
    async (targetStayId?: string) => {
      const idToUse = targetStayId ?? stayId;
      if (!idToUse) return;
      await Promise.all([loadDue(idToUse), loadHistory(idToUse)]);
    },
    [loadDue, loadHistory, stayId]
  );

  // Expose refresh function to parent
  useEffect(() => {
    if (onRegisterRefresh) {
      onRegisterRefresh(refreshAll);
    }
  }, [refreshAll, onRegisterRefresh]);

  // Notify busy state (modal open, submitting, or confirming quick action)
  useEffect(() => {
    if (onBusyChange) {
      onBusyChange(!!actionState || actionSubmitting || !!confirmingItemId || quickActionSubmitting);
    }
  }, [actionState, actionSubmitting, confirmingItemId, quickActionSubmitting, onBusyChange]);

  // Auto-load when stayId changes (controlled or uncontrolled)
  useEffect(() => {
    if (!stayId || !canReadMedAdmin) {
      // Clear data if no stayId
      if (!stayId) {
        setDueData(null);
        setHistoryItems([]);
        setExpandedGroups({});
      }
      return;
    }

    void refreshAll(stayId);
  }, [canReadMedAdmin, refreshAll, stayId]);

  // Processing Data: Filtering and Grouping
  const processedGroups = useMemo(() => {
    if (!dueData) return [];

    // 1. Merge lists (identifying status by source is tricky if we merge, so we add a flag or check overdue)
    // Actually, dueData.overdue and dueData.upcoming items have same shape. 
    // We can merge them and use 'scheduledFor' vs 'now' to determine overdue, OR keep the source lists.
    // The easiest is to map them to an augmented type.

    type AugmentedItem = MedicationDueDoseItem & { isOverdue: boolean };

    const allItems: AugmentedItem[] = [
      ...dueData.overdue.map(i => ({ ...i, isOverdue: true })),
      ...dueData.upcoming.map(i => ({ ...i, isOverdue: false }))
    ];

    // 2. Filter
    const filtered = allItems.filter(item => {
      // Show Overdue Only
      if (showOverdueOnly && !item.isOverdue) return false;

      // Text Filter
      if (filterText) {
        const text = filterText.toLowerCase();
        const matchesMed = item.medication.name.toLowerCase().includes(text);
        const matchesPatient = item.patient.name.toLowerCase().includes(text);
        if (!matchesMed && !matchesPatient) return false;
      }

      // Route Filter
      if (filterRoute && item.medication.route !== filterRoute) return false;

      // Frequency Filter
      if (filterFrequency && item.medication.frequencyType !== filterFrequency) return false;

      return true;
    });

    // 3. Group by Patient
    const groups: Record<string, { patientName: string; items: AugmentedItem[] }> = {};

    for (const item of filtered) {
      const pid = item.patient.id;
      if (!groups[pid]) {
        groups[pid] = { patientName: item.patient.name, items: [] };
      }
      groups[pid].items.push(item);
    }

    // 4. Sort within groups and convert to array
    return Object.entries(groups).map(([patientId, group]) => ({
      patientId,
      patientName: group.patientName,
      items: group.items.sort(dueSort)
    }));
  }, [dueData, filterText, filterRoute, filterFrequency, showOverdueOnly]);

  // Initialize expanded state for new groups
  useEffect(() => {
    if (processedGroups.length > 0) {
      setExpandedGroups(prev => {
        const next = { ...prev };
        let changed = false;
        processedGroups.forEach(g => {
          if (next[g.patientId] === undefined) {
            next[g.patientId] = true; // Default expanded
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [processedGroups]);

  // Extract unique options for filters
  const { routes, frequencies } = useMemo(() => {
    const r = new Set<string>();
    const f = new Set<string>();
    if (dueData) {
      [...dueData.overdue, ...dueData.upcoming].forEach(i => {
        r.add(i.medication.route);
        f.add(i.medication.frequencyType);
      });
    }
    return { routes: Array.from(r).sort(), frequencies: Array.from(f).sort() };
  }, [dueData]);

  const toggleGroup = (patientId: string) => {
    setExpandedGroups(prev => ({ ...prev, [patientId]: !prev[patientId] }));
  };

  const handleApplyStay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedbackMessage(null);
    setDueError(null);
    setHistoryError(null);

    const normalized = stayIdInput.trim();
    if (!isUuid(normalized)) {
      setDueError('Informe um stayId valido (UUID).');
      return;
    }

    if (isControlled) {
      onStayIdChange?.(normalized);
    } else {
      setInternalStayId(normalized);
    }
  };

  const handleQuickAdminister = async (item: MedicationDueDoseItem) => {
    if (!stayId) return;

    setQuickActionSubmitting(true);
    setFeedbackMessage(null);
    setDueError(null); // Clear previous errors

    try {
      const payload: MedicationAdministrationCreateInput = {
        orderId: item.orderId,
        stayId,
        encounterId: item.encounterId ?? undefined,
        scheduledFor: item.scheduledFor,
        status: 'administered',
        effectiveAt: new Date().toISOString() // Now
      };

      await createMedicationAdministration(payload);
      setFeedbackMessage('Administração registrada (Ação Rápida).');
      setConfirmingItemId(null);
      await refreshAll(stayId);

    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setDueError('Dose já checada anteriormente. Lista atualizada.');
        setConfirmingItemId(null);
        await refreshAll(stayId);
      } else {
        setDueError(`Falha na ação rápida: ${extractApiErrorMessage(error)}`);
      }
    } finally {
      setQuickActionSubmitting(false);
    }
  };

  const handleAction = async (payload: { status: MedAdminAction; reason?: string; delayedUntil?: string }) => {
    if (!actionState || !stayId) {
      return;
    }

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
      setFeedbackMessage('Checagem registrada com sucesso.');
      await refreshAll(stayId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setActionError('Dose ja checada anteriormente. Lista atualizada.');
        await refreshAll(stayId);
        return;
      }

      setActionError(extractApiErrorMessage(error));
    } finally {
      setActionSubmitting(false);
    }
  };

  if (!canReadMedAdmin) {
    return (
      <section
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>MAR</h2>
        <p style={{ margin: 0, color: '#b45309' }}>
          Seu perfil nao possui permissao `medadmin.read`.
        </p>
      </section>
    );
  }

  // Render controls section
  const renderControls = () => {
    // Shared filters UI
    const filtersUi = (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        <input
          placeholder="Filtrar nome..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, minWidth: 140 }}
        />
        <select
          value={filterRoute}
          onChange={e => setFilterRoute(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        >
          <option value="">Todas Rotas</option>
          {routes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterFrequency}
          onChange={e => setFilterFrequency(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
        >
          <option value="">Todas Frequências</option>
          {frequencies.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, userSelect: 'none', cursor: 'pointer', marginLeft: 4 }}>
          <input
            type="checkbox"
            checked={showOverdueOnly}
            onChange={e => setShowOverdueOnly(e.target.checked)}
          />
          <span style={{ fontWeight: 600, color: showOverdueOnly ? '#ef4444' : '#475569' }}>
            Apenas Vencidas
          </span>
        </label>
      </div>
    );

    if (hideStaySelector) {
      return (
        <div style={{
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#fff',
          padding: 12,
          borderRadius: 8,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 14, color: '#475569' }}>Janela de visualização:</label>
            <select
              value={windowMin}
              onChange={(e) => setWindowMin(Number(e.target.value))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1'
              }}
            >
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={180}>3 horas</option>
              <option value={240}>4 horas</option>
              <option value={720}>12 horas</option>
            </select>

            <div style={{ flex: 1 }} />

            {stayId && (
              <button
                type="button"
                onClick={() => void refreshAll(stayId)}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#fff',
                  color: '#0f172a',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                ↻ Atualizar
              </button>
            )}
          </div>
          {filtersUi}
        </div>
      );
    }

    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 16,
          display: 'grid',
          gap: 10,
          marginBottom: 14
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>MAR por stay</h2>
        <form onSubmit={handleApplyStay} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={stayIdInput}
            onChange={(event) => setStayIdInput(event.target.value)}
            placeholder="Informe stayId (UUID)"
            style={{
              flex: '1 1 360px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px'
            }}
          />
          <input
            type="number"
            value={windowMin}
            min={30}
            max={720}
            step={30}
            onChange={(event) => setWindowMin(Number(event.target.value))}
            style={{
              width: 120,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px'
            }}
          />
          <button
            type="submit"
            style={{
              border: '1px solid #0f172a',
              borderRadius: 8,
              background: '#0f172a',
              color: '#fff',
              padding: '8px 12px',
              cursor: 'pointer'
            }}
          >
            Carregar
          </button>

          {stayId && (
            <button
              type="button"
              onClick={() => void refreshAll(stayId)}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#fff',
                color: '#0f172a',
                padding: '8px 12px',
                cursor: 'pointer'
              }}
            >
              Atualizar
            </button>
          )}
        </form>
        {filtersUi}

        {feedbackMessage ? <p style={{ margin: 0, color: '#047857' }}>{feedbackMessage}</p> : null}
        {dueError ? <p style={{ margin: 0, color: '#b91c1c' }}>{dueError}</p> : null}
      </div>
    );
  };

  return (
    <section>
      {renderControls()}

      {stayId ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Main List */}
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              overflow: 'hidden'
            }}
          >
            {loadingDue && <div style={{ padding: 16, color: '#64748b' }}>Carregando doses...</div>}
            {!loadingDue && processedGroups.length === 0 && (
              <div style={{ padding: 16, color: '#64748b' }}>
                {dueData ? 'Nenhuma dose encontrada com os filtros atuais.' : 'Sem dados.'}
              </div>
            )}

            {processedGroups.map(group => {
              const isExpanded = expandedGroups[group.patientId] ?? true;
              return (
                <div key={group.patientId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.patientId)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      border: 'none',
                      borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>
                      {group.patientName} <span style={{ fontWeight: 400, color: '#64748b' }}>({group.items.length} doses)</span>
                    </span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{isExpanded ? '▼' : '▶'}</span>
                  </button>

                  {isExpanded && (
                    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                      {group.items.map(item => {
                        const isOverdue = item.isOverdue;
                        const isConfirming = confirmingItemId === item.orderId + item.scheduledFor;

                        // Style variants
                        const borderColor = isOverdue ? '#fecaca' : '#bfdbfe';
                        const bgColor = isOverdue ? '#fff1f2' : '#eff6ff';
                        const textColor = isOverdue ? '#7f1d1d' : '#1e3a8a';

                        return (
                          <div
                            key={`${item.orderId}:${item.scheduledFor}`}
                            style={{
                              border: `1px solid ${borderColor}`,
                              borderRadius: 10,
                              background: bgColor,
                              padding: 12,
                              display: 'grid',
                              gap: 6,
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div>
                                <strong style={{ display: 'block', fontSize: 15 }}>{item.medication.name}</strong>
                                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 13, color: textColor }}>
                                  <span style={{ fontWeight: 600 }}>{item.medication.doseValue} {item.medication.doseUnit}</span>
                                  <span>•</span>
                                  <span>{item.medication.route}</span>
                                  <span>•</span>
                                  <span>{item.medication.frequencyType}</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 13, color: textColor }}>
                                <div style={{ fontWeight: 600 }}>{formatDateTime(item.scheduledFor, item.timezone)}</div>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>{isOverdue ? 'Vencida' : 'Agendada'}</div>
                              </div>
                            </div>

                            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                              {canWriteMedAdmin ? (
                                <>
                                  {isConfirming ? (
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Confirmar?</span>
                                      <button
                                        onClick={() => void handleQuickAdminister(item)}
                                        disabled={quickActionSubmitting}
                                        style={{
                                          background: '#16a34a',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: 6,
                                          padding: '6px 10px',
                                          fontSize: 12,
                                          cursor: quickActionSubmitting ? 'wait' : 'pointer'
                                        }}
                                      >
                                        {quickActionSubmitting ? '...' : 'SIM'}
                                      </button>
                                      <button
                                        onClick={() => setConfirmingItemId(null)}
                                        disabled={quickActionSubmitting}
                                        style={{
                                          background: '#fff',
                                          color: '#64748b',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: 6,
                                          padding: '6px 10px',
                                          fontSize: 12,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        NÃO
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingItemId(item.orderId + item.scheduledFor)}
                                      style={{
                                        background: '#0f172a',
                                        color: '#fff',
                                        border: '1px solid #0f172a',
                                        borderRadius: 8,
                                        padding: '6px 12px',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Administrar Agora
                                    </button>
                                  )}

                                  {/* Advanced Actions */}
                                  {!isConfirming && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => setActionState({ item, action: 'administered' })}
                                        style={{
                                          background: '#fff',
                                          color: '#0f172a',
                                          border: '1px solid #cbd5e1',
                                          borderRadius: 8,
                                          padding: '6px 12px',
                                          fontSize: 13,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        Opções...
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: 13 }}>Sem permissão de escrita.</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <MedAdminHistory loading={loadingHistory} errorMessage={historyError} items={historyItems} />

          <MedAdminActionModal
            open={Boolean(actionState)}
            action={actionState?.action ?? 'administered'}
            patientName={patientName ?? actionState?.item?.patient.name}
            bedName={bedName}
            medicationName={actionState?.item?.medication.name}
            dose={actionState ? `${actionState.item.medication.doseValue} ${actionState.item.medication.doseUnit}` : undefined}
            route={actionState?.item?.medication.route}
            submitting={actionSubmitting}
            errorMessage={actionError}
            onClose={() => {
              if (actionSubmitting) {
                return;
              }

              setActionState(null);
              setActionError(null);
            }}
            onSubmit={handleAction}
          />
        </div>
      ) : (
        // Only show empty state message if we are NOT in hidden selector mode (because in hidden mode, the parent is responsible for empty states)
        !hideStaySelector ? (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: 16
            }}
          >
            <p style={{ margin: 0, color: '#64748b' }}>
              Informe um <code>stayId</code> para carregar as doses do MAR.
            </p>
          </section>
        ) : null
      )}
    </section>
  );
}

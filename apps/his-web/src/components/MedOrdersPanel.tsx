'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  createMedicationOrder,
  getAuditEvents,
  getMedicationLogs,
  listMedicationAdministrations,
  listMedicationOrders,
  stopMedicationOrder,
  updateMedicationOrder,
  type AuditEventRecord,
  type MedicationAdministrationRecord,
  type MedicationOrderCreateInput,
  type MedicationOrderRecord,
  type MedicationOrderUpdateInput
} from '../lib/api';
import { getAuthSession } from '../lib/auth';
import { can, resolvePermissions, ROLE_PERMISSIONS } from '../lib/permissions';
import { MedOrderForm } from './MedOrderForm';
import { MedOrderHistory } from './MedOrderHistory';
import { MedOrderStopModal } from './MedOrderStopModal';

type MedOrdersPanelProps = {
  patientId: string;
  encounterId?: string;
  stayId?: string;
};



function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    let message = 'Falha na requisição.';
    const payload = error.payload;

    if (payload && typeof payload === 'object') {
      const msg = (payload as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim().length > 0) {
        message = msg;
      } else {
        const issues = (payload as { issues?: Array<{ message?: unknown }> }).issues;
        if (Array.isArray(issues) && issues.length > 0) {
          const first = issues[0];
          if (first && typeof first.message === 'string') {
            message = first.message;
          }
        }
      }
    }

    if (error.requestId) {
      return `${message} (ID: ${error.requestId})`;
    }
    return `${message} (${error.status})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada.';
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'n/a';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
}

function formatFrequencyLabel(value: string): string {
  const labels: Record<string, string> = {
    q8h: 'a cada 8 horas',
    q12h: 'a cada 12 horas',
    sid: '1x ao dia',
    bid: '2x ao dia',
    tid: '3x ao dia',
    custom: 'personalizada'
  };

  return labels[value] ?? value;
}

export function MedOrdersPanel({ patientId, encounterId, stayId }: MedOrdersPanelProps): JSX.Element {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadOrders = can(permissions, 'medorder.read');
  const canWriteOrders = can(permissions, 'medorder.write');
  const canStopOrders = can(permissions, 'medorder.stop');
  const canReadAudit = can(permissions, 'audit.read');
  const canReadAdministrationLogs = can(permissions, 'medadmin.read');
  const canReadStayLogs = can(permissions, 'medlog.read');

  const [orders, setOrders] = useState<MedicationOrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [nextDueByOrderId, setNextDueByOrderId] = useState<Record<string, string | null>>({});
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [stopTarget, setStopTarget] = useState<MedicationOrderRecord | null>(null);
  const [stopSubmitting, setStopSubmitting] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [administrationLogs, setAdministrationLogs] = useState<MedicationAdministrationRecord[]>([]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) {
      return null;
    }

    return orders.find((order) => order.id === selectedOrderId) ?? null;
  }, [orders, selectedOrderId]);

  const loadOrders = useCallback(async () => {
    if (!canReadOrders) {
      return;
    }

    if (!encounterId && !stayId) {
      setOrders([]);
      setSelectedOrderId(null);
      setOrdersError('Painel de prescrição exige encounterId ou stayId.');
      return;
    }

    setLoadingOrders(true);
    setOrdersError(null);

    try {
      const [ordersResponse, stayLogs] = await Promise.all([
        listMedicationOrders({
          encounterId,
          stayId,
          status: 'active',
          page: 1,
          pageSize: 100
        }),
        stayId && canReadStayLogs ? getMedicationLogs(stayId) : Promise.resolve(null)
      ]);

      setOrders(ordersResponse.data);
      setSelectedOrderId((current) => {
        if (current && ordersResponse.data.some((order) => order.id === current)) {
          return current;
        }

        return ordersResponse.data[0]?.id ?? null;
      });

      if (stayLogs) {
        const nextDueMap: Record<string, string | null> = {};
        for (const item of stayLogs.orders) {
          nextDueMap[item.id] = item.nextDueAt;
        }
        setNextDueByOrderId(nextDueMap);
      } else {
        setNextDueByOrderId({});
      }
    } catch (error) {
      setOrders([]);
      setSelectedOrderId(null);
      setNextDueByOrderId({});
      setOrdersError(extractApiErrorMessage(error));
    } finally {
      setLoadingOrders(false);
    }
  }, [canReadOrders, canReadStayLogs, encounterId, stayId]);

  const loadHistory = useCallback(async () => {
    if (!selectedOrderId) {
      setAuditEvents([]);
      setAdministrationLogs([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const [auditResponse, administrationsResponse] = await Promise.all([
        canReadAudit
          ? getAuditEvents({
            entityType: 'medication_order',
            entityId: selectedOrderId,
            page: 1,
            pageSize: 12
          })
          : Promise.resolve(null),
        canReadAdministrationLogs
          ? listMedicationAdministrations({
            orderId: selectedOrderId,
            page: 1,
            pageSize: 20
          })
          : Promise.resolve(null)
      ]);

      setAuditEvents(auditResponse?.data ?? []);
      setAdministrationLogs(administrationsResponse?.data ?? []);
    } catch (error) {
      setAuditEvents([]);
      setAdministrationLogs([]);
      setHistoryError(extractApiErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [canReadAdministrationLogs, canReadAudit, selectedOrderId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleCreate = async (payload: MedicationOrderCreateInput) => {
    setFormSubmitting(true);
    setFormError(null);
    setFeedbackMessage(null);

    try {
      await createMedicationOrder(payload);
      setCreating(false);
      setFeedbackMessage('Prescrição criada com sucesso.');
      await loadOrders();
    } catch (error) {
      setFormError(extractApiErrorMessage(error));
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdate = async (payload: MedicationOrderUpdateInput) => {
    if (!selectedOrder) {
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    setFeedbackMessage(null);

    try {
      await updateMedicationOrder(selectedOrder.id, payload);
      setEditingOrderId(null);
      setFeedbackMessage('Prescrição atualizada.');
      await loadOrders();
      await loadHistory();
    } catch (error) {
      setFormError(extractApiErrorMessage(error));
      throw error;
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStop = async (reason: string) => {
    if (!stopTarget) {
      return;
    }

    setStopSubmitting(true);
    setStopError(null);
    setFeedbackMessage(null);

    try {
      await stopMedicationOrder(stopTarget.id, {
        stopReason: reason
      });
      setStopTarget(null);
      setEditingOrderId(null);
      setCreating(false);
      setFeedbackMessage('Prescrição suspensa com sucesso.');
      await loadOrders();
      await loadHistory();
    } catch (error) {
      setStopError(extractApiErrorMessage(error));
    } finally {
      setStopSubmitting(false);
    }
  };

  if (!canReadOrders) {
    return (
      <section
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>Prescrições</h2>
        <p style={{ margin: 0, color: '#b45309' }}>
          Seu perfil não possui permissão `medorder.read`.
        </p>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 16,
          display: 'grid',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Prescrição medicamentosa</h2>
          {canWriteOrders ? (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setEditingOrderId(null);
                setFormError(null);
                setFeedbackMessage(null);
              }}
              style={{
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#fff',
                borderRadius: 8,
                padding: '8px 10px',
                cursor: 'pointer'
              }}
            >
              Nova prescrição
            </button>
          ) : null}
        </div>

        <p style={{ margin: 0, color: '#475569' }}>
          Contexto:{' '}
          {encounterId ? `atendimento ${encounterId}` : stayId ? `internação ${stayId}` : 'não definido'}
        </p>

        {feedbackMessage ? <p style={{ margin: 0, color: '#047857' }}>{feedbackMessage}</p> : null}
        {ordersError ? <p style={{ margin: 0, color: '#b91c1c' }}>{ordersError}</p> : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 1fr) minmax(340px, 2fr)',
            gap: 12
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ativas</h3>
              <span style={{ color: '#64748b', fontSize: 13 }}>
                {loadingOrders ? 'carregando...' : `${orders.length} prescrição(ões)`}
              </span>
            </div>

            {orders.length === 0 ? (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 12,
                  color: '#64748b'
                }}
              >
                Sem prescrições ativas para o contexto atual.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {orders.map((order) => {
                  const selected = order.id === selectedOrderId;
                  const nextDue = nextDueByOrderId[order.id] ?? null;

                  return (
                    <li
                      key={order.id}
                      style={{
                        border: selected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 10,
                        background: selected ? '#f8fafc' : '#ffffff',
                        display: 'grid',
                        gap: 6
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setCreating(false);
                          setFormError(null);
                        }}
                        style={{
                          border: 0,
                          background: 'transparent',
                          textAlign: 'left',
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer',
                          display: 'grid',
                          gap: 3
                        }}
                      >
                        <strong>{order.medicationName}</strong>
                        <span style={{ color: '#475569', fontSize: 13 }}>
                          {order.doseValue} {order.doseUnit} • {order.route} • {formatFrequencyLabel(order.frequencyType)}
                        </span>
                        <span style={{ color: '#475569', fontSize: 13 }}>
                          Próxima dose: {formatDateTime(nextDue)}
                        </span>
                      </button>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {canWriteOrders ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setEditingOrderId(order.id);
                              setCreating(false);
                              setFormError(null);
                            }}
                            style={{
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              borderRadius: 8,
                              padding: '6px 8px',
                              cursor: 'pointer'
                            }}
                          >
                            Editar
                          </button>
                        ) : null}
                        {canStopOrders ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setStopTarget(order);
                              setStopError(null);
                            }}
                            style={{
                              border: '1px solid #dc2626',
                              background: '#fff',
                              color: '#dc2626',
                              borderRadius: 8,
                              padding: '6px 8px',
                              cursor: 'pointer'
                            }}
                          >
                            Suspender
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {creating && canWriteOrders ? (
              <MedOrderForm
                mode="create"
                patientId={patientId}
                encounterId={encounterId}
                stayId={stayId}
                submitting={formSubmitting}
                errorMessage={formError}
                onCancel={() => {
                  setCreating(false);
                  setFormError(null);
                }}
                onSubmit={handleCreate}
              />
            ) : editingOrderId && selectedOrder && canWriteOrders ? (
              <MedOrderForm
                mode="edit"
                order={selectedOrder}
                submitting={formSubmitting}
                errorMessage={formError}
                onCancel={() => {
                  setEditingOrderId(null);
                  setFormError(null);
                }}
                onSubmit={handleUpdate}
              />
            ) : (
              <div
                style={{
                  border: '1px dashed #cbd5e1',
                  borderRadius: 10,
                  padding: 14,
                  color: '#64748b'
                }}
              >
                {canWriteOrders
                  ? 'Selecione uma prescrição para editar ou clique em "Nova prescrição".'
                  : 'Seu perfil não possui permissão para criar/editar prescrição.'}
              </div>
            )}

            <MedOrderHistory
              loading={historyLoading}
              errorMessage={historyError}
              canReadAudit={canReadAudit}
              canReadLogs={canReadAdministrationLogs}
              auditEvents={auditEvents}
              administrationLogs={administrationLogs}
            />
          </div>
        </div>
      </div>

      <MedOrderStopModal
        open={Boolean(stopTarget)}
        orderLabel={
          stopTarget
            ? `${stopTarget.medicationName} • ${stopTarget.doseValue} ${stopTarget.doseUnit}`
            : ''
        }
        submitting={stopSubmitting}
        errorMessage={stopError}
        onClose={() => {
          if (stopSubmitting) {
            return;
          }

          setStopTarget(null);
          setStopError(null);
        }}
        onSubmit={handleStop}
      />
    </section>
  );
}

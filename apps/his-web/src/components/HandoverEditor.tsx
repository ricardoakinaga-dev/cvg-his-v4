'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ApiError,
  createHandoverDraft,
  getAuditEvents,
  getBedMap,
  getHandoverById,
  getHandoverDocument,
  getWards,
  publishHandover,
  type CreateHandoverDraftInput,
  type HandoverDocumentRecord,
  type HandoverShiftPeriod,
  type HandoverWithItemsResponse,
  type WardRecord
} from '../lib/api';
import { getAuthSession, type AuthSession } from '../lib/auth';
import { HandoverHistory, type HandoverHistoryEntry } from './HandoverHistory';
import {
  HandoverItemEditor,
  createEmptyHandoverItem,
  type HandoverItemFormValue
} from './HandoverItemEditor';
import { HandoverPublishPanel } from './HandoverPublishPanel';

type StayOption = {
  id: string;
  patientId: string;
  patientName: string;
  species: string;
  bedLabel: string;
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: [
    'ward.read',
    'bedmap.read',
    'inpatient.read',
    'handover.read',
    'handover.write',
    'handover.publish'
  ],
  enfermagem: ['ward.read', 'bedmap.read', 'inpatient.read', 'handover.read', 'handover.write'],
  recepcao: ['ward.read', 'bedmap.read', 'inpatient.read']
};

function toIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toStringList(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function fromUnknownList(input: unknown): string {
  if (!Array.isArray(input)) {
    return '';
  }

  return input
    .map((item) => (typeof item === 'string' ? item.trim() : JSON.stringify(item)))
    .filter((item) => item.length > 0)
    .join('\n');
}

function asRecord(input: unknown): Record<string, unknown> {
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }

  return {};
}

function extractApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const payload = error.payload;
    if (payload && typeof payload === 'object') {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return `Falha na requisição (${error.status}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada.';
}

function resolvePermissions(session: AuthSession | null): Set<string> {
  const permissions = new Set<string>();
  if (!session) {
    return permissions;
  }

  const roleCandidates = [
    session.role,
    ...(Array.isArray(session.roles) ? session.roles : [])
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const role of roleCandidates) {
    const fromRole = ROLE_PERMISSIONS[role] ?? [];
    for (const permission of fromRole) {
      permissions.add(permission);
    }
  }

  const explicitPermissions = Array.isArray(session.permissions) ? session.permissions : [];
  for (const permission of explicitPermissions) {
    permissions.add(permission);
  }

  return permissions;
}

function can(permissions: Set<string>, permission: string): boolean {
  return permissions.has('*') || permissions.has(permission);
}

function mapHandoverToEditorItems(handover: HandoverWithItemsResponse): HandoverItemFormValue[] {
  return handover.items.map((item) => {
    const alerts = asRecord(item.alertsJson);
    const allergies = Array.isArray(alerts.allergies)
      ? alerts.allergies.filter((value): value is string => typeof value === 'string').join('\n')
      : '';
    const escalation = asRecord(item.escalationJson);

    return {
      localId: `${item.id}_${Math.random().toString(16).slice(2, 8)}`,
      stayId: item.stayId,
      problemsText: fromUnknownList(item.problemsJson),
      planText: fromUnknownList(item.planJson),
      criticalMedsText: fromUnknownList(item.criticalMedsJson),
      pendingText: fromUnknownList(item.pendingJson),
      escalationIfWorse:
        typeof escalation.ifWorse === 'string'
          ? escalation.ifWorse
          : typeof escalation.ifworse === 'string'
            ? escalation.ifworse
            : '',
      notes: item.notes ?? '',
      allergiesText: allergies,
      aggressive: Boolean(alerts.aggressive)
    };
  });
}

function validateDraftInput(input: {
  wardId: string;
  shiftDate: string;
  items: HandoverItemFormValue[];
}): string | null {
  if (!input.wardId) {
    return 'Selecione uma ala.';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.shiftDate.trim())) {
    return 'Informe uma data válida no formato YYYY-MM-DD.';
  }

  if (input.items.length === 0) {
    return 'Inclua pelo menos 1 item no plantão.';
  }

  for (let index = 0; index < input.items.length; index += 1) {
    const item = input.items[index];
    const row = index + 1;
    const plan = toStringList(item.planText);
    const problems = toStringList(item.problemsText);
    const notes = item.notes.trim();
    const escalation = item.escalationIfWorse.trim();

    if (!item.stayId) {
      return `Item ${row}: stay é obrigatório.`;
    }

    if (plan.length === 0) {
      return `Item ${row}: plan deve ter ao menos 1 linha.`;
    }

    if (!escalation) {
      return `Item ${row}: campo "se piorar" é obrigatório.`;
    }

    if (problems.length === 0 && notes.length === 0) {
      return `Item ${row}: informe problems ou notes.`;
    }
  }

  return null;
}

function toDraftPayload(input: {
  wardId: string;
  shiftDate: string;
  shiftPeriod: HandoverShiftPeriod;
  items: HandoverItemFormValue[];
  stayById: Map<string, StayOption>;
}): CreateHandoverDraftInput {
  return {
    wardId: input.wardId,
    shiftDate: input.shiftDate.trim(),
    shiftPeriod: input.shiftPeriod,
    items: input.items.map((item) => {
      const problems = toStringList(item.problemsText);
      const plan = toStringList(item.planText);
      const criticalMeds = toStringList(item.criticalMedsText);
      const pending = toStringList(item.pendingText);
      const allergies = toStringList(item.allergiesText);
      const stayRef = input.stayById.get(item.stayId);
      const alerts: Record<string, unknown> = {};
      if (item.aggressive) {
        alerts.aggressive = true;
      }
      if (allergies.length > 0) {
        alerts.allergies = allergies;
      }

      return {
        stayId: item.stayId,
        patient_snapshot_json: stayRef
          ? {
              patientId: stayRef.patientId,
              patientName: stayRef.patientName,
              species: stayRef.species
            }
          : undefined,
        problems_json: problems,
        plan_json: plan,
        critical_meds_json: criticalMeds,
        alerts_json: alerts,
        pending_json: pending,
        escalation_json: {
          ifWorse: item.escalationIfWorse.trim()
        },
        notes: item.notes.trim() || undefined
      };
    })
  };
}

function toHistoryEntryFromAuditRow(row: Record<string, unknown>, wardId: string): HandoverHistoryEntry | null {
  if (row.action !== 'HandoverPublished' || typeof row.entity_id !== 'string') {
    return null;
  }

  const afterJson = asRecord(row.after_json);
  const handover = asRecord(afterJson.handover);

  if (handover.wardId !== wardId) {
    return null;
  }

  const shiftPeriod = handover.shiftPeriod;
  if (shiftPeriod !== 'day' && shiftPeriod !== 'night' && shiftPeriod !== 'custom') {
    return null;
  }

  const buildStatus = handover.buildStatus;
  if (buildStatus !== 'pending' && buildStatus !== 'building' && buildStatus !== 'ready' && buildStatus !== 'failed') {
    return null;
  }

  return {
    handoverId: row.entity_id,
    shiftDate: typeof handover.shiftDate === 'string' ? handover.shiftDate : '-',
    shiftPeriod,
    buildStatus,
    publishedAt:
      typeof handover.publishedAt === 'string'
        ? handover.publishedAt
        : typeof row.created_at === 'string'
          ? row.created_at
          : new Date().toISOString()
  };
}

export function HandoverEditor(): JSX.Element {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session), [session]);
  const canReadWard = can(permissions, 'ward.read');
  const canReadBedMap = can(permissions, 'bedmap.read');
  const canReadHandover = can(permissions, 'handover.read');
  const canWriteHandover = can(permissions, 'handover.write');
  const canPublishHandover = can(permissions, 'handover.publish');
  const canReadAudit = can(permissions, 'audit.read');

  const [wards, setWards] = useState<WardRecord[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [shiftDate, setShiftDate] = useState(toIsoDate());
  const [shiftPeriod, setShiftPeriod] = useState<HandoverShiftPeriod>('day');
  const [items, setItems] = useState<HandoverItemFormValue[]>([]);
  const [activeStays, setActiveStays] = useState<StayOption[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HandoverHistoryEntry[]>([]);
  const [handover, setHandover] = useState<HandoverWithItemsResponse | null>(null);
  const [document, setDocument] = useState<HandoverDocumentRecord | null>(null);

  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingStays, setLoadingStays] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [polling, setPolling] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const pollingTokenRef = useRef(0);

  const stayById = useMemo(() => {
    return new Map(activeStays.map((stay) => [stay.id, stay]));
  }, [activeStays]);

  const publishDisabledReason = useMemo(() => {
    if (!canWriteHandover) {
      return 'Seu perfil não possui handover.write.';
    }

    if (!canPublishHandover) {
      return 'Seu perfil não possui handover.publish.';
    }

    return validateDraftInput({
      wardId: selectedWardId,
      shiftDate,
      items
    });
  }, [canPublishHandover, canWriteHandover, items, selectedWardId, shiftDate]);

  const loadWards = useCallback(async () => {
    setLoadingWards(true);
    setErrorMessage(null);
    try {
      const response = await getWards({ page: 1, pageSize: 100 });
      setWards(response.data);
      setSelectedWardId((current) => {
        if (current && response.data.some((ward) => ward.id === current)) {
          return current;
        }

        return response.data[0]?.id ?? '';
      });
    } catch (error) {
      setWards([]);
      setSelectedWardId('');
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setLoadingWards(false);
    }
  }, []);

  const loadActiveStays = useCallback(async (wardId: string) => {
    if (!wardId) {
      setActiveStays([]);
      return;
    }

    setLoadingStays(true);
    setErrorMessage(null);
    try {
      const map = await getBedMap(wardId);
      const rows: StayOption[] = map.beds
        .filter((bed) => bed.status === 'occupied' && bed.stay)
        .map((bed) => ({
          id: bed.stay?.id ?? '',
          patientId: bed.stay?.patientId ?? '',
          patientName: bed.stay?.patientName ?? 'Paciente',
          species: bed.stay?.species ?? 'n/a',
          bedLabel: `${bed.bed.name}${bed.bed.code ? ` (${bed.bed.code})` : ''}`
        }))
        .filter((stay) => stay.id.length > 0);

      const unique = Array.from(new Map(rows.map((row) => [row.id, row])).values());
      setActiveStays(unique);
    } catch (error) {
      setActiveStays([]);
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setLoadingStays(false);
    }
  }, []);

  const loadHistory = useCallback(
    async (wardId: string) => {
      if (!wardId) {
        setHistoryEntries([]);
        return;
      }

      if (!canReadAudit) {
        setHistoryEntries([]);
        setHistoryError('Sem permissão `audit.read` para listar histórico completo.');
        return;
      }

      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await getAuditEvents({
          entityType: 'shift_handover',
          page: 1,
          pageSize: 50
        });

        const entries: HandoverHistoryEntry[] = [];
        const seen = new Set<string>();

        for (const row of response.data) {
          if (seen.has(row.entity_id)) {
            continue;
          }

          const entry = toHistoryEntryFromAuditRow(row as unknown as Record<string, unknown>, wardId);
          if (!entry) {
            continue;
          }

          seen.add(entry.handoverId);
          entries.push(entry);

          if (entries.length >= 5) {
            break;
          }
        }

        setHistoryEntries(entries);
      } catch (error) {
        setHistoryEntries([]);
        setHistoryError(extractApiErrorMessage(error));
      } finally {
        setLoadingHistory(false);
      }
    },
    [canReadAudit]
  );

  const refreshHandover = useCallback(async (handoverId: string) => {
    const current = await getHandoverById(handoverId);
    setHandover(current);
    return current;
  }, []);

  const startPollingBuildStatus = useCallback(
    (handoverId: string) => {
      pollingTokenRef.current += 1;
      const token = pollingTokenRef.current;
      setPolling(true);

      const poll = async (remaining: number) => {
        if (pollingTokenRef.current !== token) {
          return;
        }

        try {
          const current = await refreshHandover(handoverId);
          const status = current.handover.buildStatus;
          if (status === 'ready' || status === 'failed' || remaining <= 0) {
            if (pollingTokenRef.current === token) {
              setPolling(false);
            }
            return;
          }
        } catch (error) {
          if (pollingTokenRef.current === token) {
            setPolling(false);
            setErrorMessage(extractApiErrorMessage(error));
          }
          return;
        }

        window.setTimeout(() => {
          void poll(remaining - 1);
        }, 3000);
      };

      void poll(10);
    },
    [refreshHandover]
  );

  useEffect(() => {
    if (!canReadWard || !canReadBedMap) {
      return;
    }

    void loadWards();
  }, [canReadBedMap, canReadWard, loadWards]);

  useEffect(() => {
    if (!selectedWardId) {
      return;
    }

    if (canReadBedMap) {
      void loadActiveStays(selectedWardId);
    }

    if (canReadHandover) {
      void loadHistory(selectedWardId);
    }
  }, [canReadBedMap, canReadHandover, loadActiveStays, loadHistory, selectedWardId]);

  useEffect(() => {
    return () => {
      pollingTokenRef.current += 1;
    };
  }, []);

  const handlePrefillItems = () => {
    if (activeStays.length === 0) {
      setErrorMessage('Não há stays ativos na ala selecionada.');
      return;
    }

    setItems((current) => {
      const map = new Map(current.map((item) => [item.stayId, item]));
      return activeStays.map((stay) => map.get(stay.id) ?? createEmptyHandoverItem(stay.id));
    });
  };

  const handleSaveDraft = async (): Promise<HandoverWithItemsResponse | null> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDocument(null);

    const validationError = validateDraftInput({
      wardId: selectedWardId,
      shiftDate,
      items
    });

    if (validationError) {
      setErrorMessage(validationError);
      return null;
    }

    const payload = toDraftPayload({
      wardId: selectedWardId,
      shiftDate,
      shiftPeriod,
      items,
      stayById
    });

    setSubmittingDraft(true);
    try {
      const created = await createHandoverDraft(payload);
      setHandover(created);
      setSuccessMessage('Draft salvo com sucesso.');
      return created;
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
      return null;
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handlePublish = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDocument(null);

    if (publishDisabledReason) {
      setErrorMessage(publishDisabledReason);
      return;
    }

    setPublishing(true);
    try {
      const draft = await handleSaveDraft();
      if (!draft) {
        return;
      }

      const published = await publishHandover(draft.handover.id);
      const latest = {
        handover: published.handover,
        items: published.items
      };

      setHandover(latest);
      setSuccessMessage(`Publicado com sucesso. Job ${published.jobId} enfileirado.`);
      void loadHistory(selectedWardId);
      startPollingBuildStatus(published.handover.id);
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  };

  const handleRetry = async () => {
    await handlePublish();
  };

  const handleRefreshStatus = async () => {
    if (!handover) {
      return;
    }

    setRefreshing(true);
    setErrorMessage(null);
    try {
      const current = await refreshHandover(handover.handover.id);
      setHandover(current);
      setSuccessMessage('Status atualizado.');
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadDocument = async () => {
    if (!handover) {
      return;
    }

    setErrorMessage(null);
    try {
      const found = await getHandoverDocument(handover.handover.id);
      setDocument(found);
      setSuccessMessage('Documento carregado.');
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    }
  };

  const handleSelectHistory = async (handoverId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDocument(null);
    try {
      const found = await getHandoverById(handoverId);
      setHandover(found);
      setShiftDate(found.handover.shiftDate);
      setShiftPeriod(found.handover.shiftPeriod);
      setItems(mapHandoverToEditorItems(found));
    } catch (error) {
      setErrorMessage(extractApiErrorMessage(error));
    }
  };

  if (!canReadHandover) {
    return (
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#ffffff',
          padding: 20
        }}
      >
        <h2 style={{ marginTop: 0 }}>Plantão por ala</h2>
        <p style={{ margin: 0, color: '#b45309' }}>
          Seu perfil não possui permissão `handover.read`.
        </p>
      </section>
    );
  }

  if (!canReadWard || !canReadBedMap) {
    return (
      <section
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#ffffff',
          padding: 20
        }}
      >
        <h2 style={{ marginTop: 0 }}>Plantão por ala</h2>
        <p style={{ margin: 0, color: '#b45309' }}>
          Seu perfil precisa de `ward.read` e `bedmap.read` para montar o plantão por ala.
        </p>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#ffffff',
          padding: 14,
          display: 'grid',
          gap: 10
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Ala</span>
            <select
              value={selectedWardId}
              onChange={(event) => setSelectedWardId(event.target.value)}
              disabled={loadingWards || wards.length === 0}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
            >
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Data do plantão</span>
            <input
              type="date"
              value={shiftDate}
              onChange={(event) => setShiftDate(event.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Período</span>
            <select
              value={shiftPeriod}
              onChange={(event) => setShiftPeriod(event.target.value as HandoverShiftPeriod)}
              style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' }}
            >
              <option value="day">Dia</option>
              <option value="night">Noite</option>
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrefillItems}
            disabled={loadingStays || activeStays.length === 0}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              color: '#0f172a',
              padding: '8px 10px',
              cursor: 'pointer'
            }}
          >
            Carregar stays ativos
          </button>

          <button
            type="button"
            onClick={() => setItems((current) => [...current, createEmptyHandoverItem(activeStays[0]?.id ?? '')])}
            style={{
              border: '1px solid #0f172a',
              borderRadius: 8,
              background: '#0f172a',
              color: '#fff',
              padding: '8px 10px',
              cursor: 'pointer'
            }}
          >
            Adicionar item
          </button>

          <button
            type="button"
            onClick={() => {
              void handleSaveDraft();
            }}
            disabled={!canWriteHandover || submittingDraft || publishing}
            style={{
              border: '1px solid #2563eb',
              borderRadius: 8,
              background: '#eff6ff',
              color: '#1d4ed8',
              padding: '8px 10px',
              cursor: 'pointer'
            }}
          >
            {submittingDraft ? 'Salvando...' : 'Salvar draft'}
          </button>
        </div>

        <div style={{ color: '#475569', fontSize: 13 }}>
          {loadingStays ? 'Carregando stays ativos...' : `Stays ativos nesta ala: ${activeStays.length}`}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {items.length === 0 ? (
          <div
            style={{
              border: '1px dashed #cbd5e1',
              borderRadius: 12,
              padding: 16,
              background: '#ffffff',
              color: '#475569'
            }}
          >
            Nenhum item adicionado. Use "Carregar stays ativos" para iniciar rápido.
          </div>
        ) : null}

        {items.map((item, index) => (
          <HandoverItemEditor
            key={item.localId}
            index={index}
            item={item}
            stayOptions={activeStays.map((stay) => ({
              id: stay.id,
              label: `${stay.patientName} (${stay.species}) • ${stay.bedLabel} • stay ${stay.id}`
            }))}
            disabled={publishing || submittingDraft}
            onChange={(next) => {
              setItems((current) => current.map((entry) => (entry.localId === next.localId ? next : entry)));
            }}
            onRemove={() => {
              setItems((current) => current.filter((entry) => entry.localId !== item.localId));
            }}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'minmax(320px, 1fr) minmax(280px, 360px)' }}>
        <HandoverPublishPanel
          handover={handover}
          document={document}
          submittingDraft={submittingDraft}
          publishing={publishing}
          refreshing={refreshing}
          polling={polling}
          publishDisabled={Boolean(publishDisabledReason)}
          publishDisabledReason={publishDisabledReason}
          errorMessage={errorMessage}
          successMessage={successMessage}
          onPublish={() => {
            void handlePublish();
          }}
          onRefreshStatus={() => {
            void handleRefreshStatus();
          }}
          onRetry={() => {
            void handleRetry();
          }}
          onLoadDocument={() => {
            void handleLoadDocument();
          }}
        />

        <HandoverHistory
          entries={historyEntries}
          loading={loadingHistory}
          errorMessage={historyError}
          onSelectHandover={(handoverId) => {
            void handleSelectHistory(handoverId);
          }}
        />
      </div>
    </section>
  );
}

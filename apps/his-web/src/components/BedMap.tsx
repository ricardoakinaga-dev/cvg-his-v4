'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ApiError,
  admitInpatient,
  dischargeInpatient,
  getBedMap,
  getWards,
  transferInpatient,
  type BedMapBed,
  type BedMapResponse,
  type WardRecord
} from '../lib/api';
import { getAuthSession, type AuthSession } from '../lib/auth';
import { AdmitModal } from './AdmitModal';
import { BedCard } from './BedCard';
import { DischargeModal } from './DischargeModal';
import { TransferModal } from './TransferModal';

type TransferTarget = {
  stayId: string;
  currentBedId: string;
  currentBedLabel: string;
  stayLabel: string;
};

type DischargeTarget = {
  stayId: string;
  stayLabel: string;
};

import { can, resolvePermissions } from '../lib/permissions';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: ['ward.read', 'bedmap.read', 'inpatient.read', 'inpatient.write', 'inpatient.discharge'],
  enfermagem: ['ward.read', 'bedmap.read', 'inpatient.read'],
  recepcao: ['ward.read', 'bedmap.read', 'inpatient.read', 'inpatient.write']
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

    return `Falha na requisição (${error.status}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Falha inesperada.';
}

export function BedMap(): JSX.Element {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadWards = can(permissions, 'ward.read');
  const canReadBedMap = can(permissions, 'bedmap.read');
  const canWriteInpatient = can(permissions, 'inpatient.write');
  const canDischargeInpatient = can(permissions, 'inpatient.discharge');

  const [wards, setWards] = useState<WardRecord[]>([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [map, setMap] = useState<BedMapResponse | null>(null);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [admitBed, setAdmitBed] = useState<BedMapBed['bed'] | null>(null);
  const [admitSubmitting, setAdmitSubmitting] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);

  const [transferTarget, setTransferTarget] = useState<TransferTarget | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const [dischargeTarget, setDischargeTarget] = useState<DischargeTarget | null>(null);
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false);
  const [dischargeError, setDischargeError] = useState<string | null>(null);

  const loadWards = useCallback(async () => {
    setLoadingWards(true);
    setPageError(null);
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
      setPageError(extractApiErrorMessage(error));
    } finally {
      setLoadingWards(false);
    }
  }, []);

  const loadMap = useCallback(async (wardId: string) => {
    if (!wardId) {
      setMap(null);
      return;
    }

    setLoadingMap(true);
    setPageError(null);
    try {
      const response = await getBedMap(wardId);
      setMap(response);
    } catch (error) {
      setMap(null);
      setPageError(extractApiErrorMessage(error));
    } finally {
      setLoadingMap(false);
    }
  }, []);

  useEffect(() => {
    if (!canReadWards || !canReadBedMap) {
      return;
    }

    void loadWards();
  }, [canReadWards, canReadBedMap, loadWards]);

  useEffect(() => {
    if (!canReadBedMap) {
      return;
    }
    if (!selectedWardId) {
      setMap(null);
      return;
    }

    void loadMap(selectedWardId);
  }, [canReadBedMap, selectedWardId, loadMap]);

  const occupiedBeds = useMemo(() => {
    if (!map) {
      return 0;
    }

    return map.beds.filter((item) => item.status === 'occupied').length;
  }, [map]);

  const freeBeds = useMemo(() => {
    if (!map) {
      return 0;
    }

    return map.beds.filter((item) => item.status === 'free').length;
  }, [map]);

  const handleAdmit = async (payload: Parameters<typeof admitInpatient>[0]) => {
    setAdmitSubmitting(true);
    setAdmitError(null);
    setFeedback(null);

    try {
      await admitInpatient(payload);
      setAdmitBed(null);
      setFeedback('Paciente admitido com sucesso.');
      await loadMap(payload.wardId);
    } catch (error) {
      setAdmitError(extractApiErrorMessage(error));
    } finally {
      setAdmitSubmitting(false);
    }
  };

  const handleTransfer = async (payload: Parameters<typeof transferInpatient>[1]) => {
    if (!transferTarget) {
      return;
    }

    setTransferSubmitting(true);
    setTransferError(null);
    setFeedback(null);

    try {
      await transferInpatient(transferTarget.stayId, payload);
      setTransferTarget(null);
      setFeedback('Transferência concluída.');
      await loadMap(selectedWardId);
    } catch (error) {
      setTransferError(extractApiErrorMessage(error));
    } finally {
      setTransferSubmitting(false);
    }
  };

  const handleDischarge = async (payload: Parameters<typeof dischargeInpatient>[1]) => {
    if (!dischargeTarget) {
      return;
    }

    setDischargeSubmitting(true);
    setDischargeError(null);
    setFeedback(null);

    try {
      await dischargeInpatient(dischargeTarget.stayId, payload);
      setDischargeTarget(null);
      setFeedback('Alta registrada com sucesso.');
      await loadMap(selectedWardId);
    } catch (error) {
      setDischargeError(extractApiErrorMessage(error));
    } finally {
      setDischargeSubmitting(false);
    }
  };

  if (!canReadBedMap) {
    return (
      <section
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20
        }}
      >
        <h2 style={{ margin: '0 0 8px' }}>Internação</h2>
        <p style={{ margin: 0, color: '#b45309' }}>
          Seu perfil não possui permissão `bedmap.read`.
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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 10
          }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 13, color: '#475569' }}>Ala</span>
            <select
              value={selectedWardId}
              onChange={(event) => setSelectedWardId(event.target.value)}
              disabled={loadingWards || wards.length === 0}
              style={{
                minWidth: 220,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px'
              }}
            >
              {wards.map((ward) => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadMap(selectedWardId)}
            disabled={!selectedWardId || loadingMap}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: '#fff',
              cursor: 'pointer',
              marginTop: 20
            }}
          >
            Atualizar mapa
          </button>
        </div>

        {map ? (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: '#334155', fontSize: 14 }}>
            <span>Total leitos: {map.beds.length}</span>
            <span>Livres: {freeBeds}</span>
            <span>Ocupados: {occupiedBeds}</span>
          </div>
        ) : null}

        {feedback ? <p style={{ margin: 0, color: '#047857' }}>{feedback}</p> : null}
        {pageError ? <p style={{ margin: 0, color: '#b91c1c' }}>{pageError}</p> : null}
        {loadingWards ? <p style={{ margin: 0, color: '#475569' }}>Carregando alas...</p> : null}
        {loadingMap ? <p style={{ margin: 0, color: '#475569' }}>Carregando leitos...</p> : null}
      </div>

      {map && !loadingMap ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12
          }}
        >
          {map.beds.map((item) => (
            <BedCard
              key={item.bed.id}
              item={item}
              wardId={selectedWardId}
              canWriteInpatient={canWriteInpatient}
              canDischargeInpatient={canDischargeInpatient}
              onAdmit={(bed) => {
                setAdmitError(null);
                setAdmitBed(bed);
              }}
              onTransfer={(bedItem) => {
                if (!bedItem.stay) {
                  return;
                }

                setTransferError(null);
                setTransferTarget({
                  stayId: bedItem.stay.id,
                  currentBedId: bedItem.bed.id,
                  currentBedLabel: `${bedItem.bed.name} (${bedItem.bed.code ?? 'sem código'})`,
                  stayLabel: `${bedItem.stay.patientName ?? 'Paciente'} • stay ${bedItem.stay.id}`
                });
              }}
              onDischarge={(bedItem) => {
                if (!bedItem.stay) {
                  return;
                }

                setDischargeError(null);
                setDischargeTarget({
                  stayId: bedItem.stay.id,
                  stayLabel: `${bedItem.stay.patientName ?? 'Paciente'} • stay ${bedItem.stay.id}`
                });
              }}
            />
          ))}
        </div>
      ) : null}

      <AdmitModal
        open={Boolean(admitBed)}
        wardId={selectedWardId}
        wardName={map?.ward.name ?? 'Ala'}
        bed={admitBed}
        submitting={admitSubmitting}
        errorMessage={admitError}
        onClose={() => setAdmitBed(null)}
        onSubmit={handleAdmit}
      />

      <TransferModal
        open={Boolean(transferTarget)}
        currentWardId={selectedWardId}
        currentBedId={transferTarget?.currentBedId ?? ''}
        currentBedLabel={transferTarget?.currentBedLabel ?? ''}
        stayLabel={transferTarget?.stayLabel ?? ''}
        wards={wards}
        submitting={transferSubmitting}
        errorMessage={transferError}
        onClose={() => setTransferTarget(null)}
        onSubmit={handleTransfer}
      />

      <DischargeModal
        open={Boolean(dischargeTarget)}
        stayLabel={dischargeTarget?.stayLabel ?? ''}
        submitting={dischargeSubmitting}
        errorMessage={dischargeError}
        onClose={() => setDischargeTarget(null)}
        onSubmit={handleDischarge}
      />
    </section>
  );
}

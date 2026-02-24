'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  getBedMap,
  type BedMapResponse,
  type TransferInpatientInput,
  type WardRecord
} from '../lib/api';

type TransferModalProps = {
  open: boolean;
  currentWardId: string;
  currentBedId: string;
  currentBedLabel: string;
  stayLabel: string;
  wards: WardRecord[];
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (payload: TransferInpatientInput) => Promise<void>;
};

function modalContainerStyle(): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    zIndex: 70
  };
}

function modalCardStyle(): CSSProperties {
  return {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 18,
    display: 'grid',
    gap: 12
  };
}

export function TransferModal({
  open,
  currentWardId,
  currentBedId,
  currentBedLabel,
  stayLabel,
  wards,
  submitting,
  errorMessage,
  onClose,
  onSubmit
}: TransferModalProps): JSX.Element | null {
  const [toWardId, setToWardId] = useState(currentWardId);
  const [toBedId, setToBedId] = useState('');
  const [reason, setReason] = useState('');
  const [bedMap, setBedMap] = useState<BedMapResponse | null>(null);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [bedsError, setBedsError] = useState<string | null>(null);
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setToWardId(currentWardId);
    setToBedId('');
    setReason('');
    setBedMap(null);
    setBedsError(null);
    setLocalValidationError(null);
  }, [open, currentWardId, currentBedId]);

  useEffect(() => {
    if (!open || !toWardId) {
      return;
    }

    let canceled = false;
    setLoadingBeds(true);
    setBedsError(null);

    void (async () => {
      try {
        const map = await getBedMap(toWardId);
        if (canceled) {
          return;
        }
        setBedMap(map);
      } catch (error) {
        if (canceled) {
          return;
        }
        setBedMap(null);
        setBedsError(error instanceof Error ? error.message : 'Falha ao carregar leitos da ala.');
      } finally {
        if (!canceled) {
          setLoadingBeds(false);
        }
      }
    })();

    return () => {
      canceled = true;
    };
  }, [open, toWardId]);

  const freeBeds = useMemo(() => {
    if (!bedMap) {
      return [];
    }

    return bedMap.beds.filter((item) => item.status === 'free');
  }, [bedMap]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalValidationError(null);

    if (!toWardId) {
      setLocalValidationError('Selecione a ala de destino.');
      return;
    }

    if (!toBedId) {
      setLocalValidationError('Selecione o leito de destino.');
      return;
    }

    if (toBedId === currentBedId) {
      setLocalValidationError('Selecione um leito diferente do atual.');
      return;
    }

    await onSubmit({
      toWardId,
      toBedId,
      reason: reason.trim() || undefined
    });
  };

  return (
    <div style={modalContainerStyle()}>
      <form onSubmit={handleSubmit} style={modalCardStyle()}>
        <header style={{ display: 'grid', gap: 4 }}>
          <h3 style={{ margin: 0 }}>Transferir internação</h3>
          <p style={{ margin: 0, color: '#475569' }}>
            {stayLabel} • leito atual: {currentBedLabel}
          </p>
        </header>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Ala de destino</span>
          <select
            value={toWardId}
            onChange={(event) => setToWardId(event.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          >
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Leito de destino</span>
          <select
            value={toBedId}
            onChange={(event) => setToBedId(event.target.value)}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
            disabled={loadingBeds || freeBeds.length === 0}
          >
            <option value="">Selecione um leito</option>
            {freeBeds.map((item) => (
              <option key={item.bed.id} value={item.bed.id}>
                {item.bed.name} ({item.bed.code ?? 'sem código'})
              </option>
            ))}
          </select>
        </label>

        {loadingBeds ? <p style={{ margin: 0, color: '#475569' }}>Carregando leitos...</p> : null}
        {bedsError ? <p style={{ margin: 0, color: '#b91c1c' }}>{bedsError}</p> : null}
        {!loadingBeds && !bedsError && freeBeds.length === 0 ? (
          <p style={{ margin: 0, color: '#b45309' }}>
            Nenhum leito livre nesta ala para transferência.
          </p>
        ) : null}

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Motivo da transferência (opcional)</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: necessidade de monitorização"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        {localValidationError ? (
          <p style={{ margin: 0, color: '#b91c1c' }}>{localValidationError}</p>
        ) : null}
        {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '8px 10px',
              background: '#fff',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '8px 10px',
              background: '#0f172a',
              color: '#fff',
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Transferindo...' : 'Confirmar transferência'}
          </button>
        </footer>
      </form>
    </div>
  );
}

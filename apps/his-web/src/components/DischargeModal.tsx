'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';

import type { DischargeInpatientInput } from '../lib/api';

type DischargeModalProps = {
  open: boolean;
  stayLabel: string;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (payload: DischargeInpatientInput) => Promise<void>;
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
    maxWidth: 480,
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 18,
    display: 'grid',
    gap: 12
  };
}

export function DischargeModal({
  open,
  stayLabel,
  submitting,
  errorMessage,
  onClose,
  onSubmit
}: DischargeModalProps): JSX.Element | null {
  const [reason, setReason] = useState('');
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setReason('');
    setLocalValidationError(null);
  }, [open, stayLabel]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalValidationError(null);

    const normalizedReason = reason.trim();
    if (normalizedReason.length === 0) {
      setLocalValidationError('Informe o motivo obrigatório da alta.');
      return;
    }

    await onSubmit({
      reason: normalizedReason
    });
  };

  return (
    <div style={modalContainerStyle()}>
      <form onSubmit={handleSubmit} style={modalCardStyle()}>
        <header style={{ display: 'grid', gap: 4 }}>
          <h3 style={{ margin: 0 }}>Dar alta</h3>
          <p style={{ margin: 0, color: '#475569' }}>{stayLabel}</p>
        </header>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Motivo da alta</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo clínico/operacional para encerramento da internação"
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
              border: '1px solid #dc2626',
              borderRadius: 8,
              padding: '8px 10px',
              background: '#dc2626',
              color: '#fff',
              cursor: 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Processando...' : 'Confirmar alta'}
          </button>
        </footer>
      </form>
    </div>
  );
}

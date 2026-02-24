'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';

type MedOrderStopModalProps = {
  open: boolean;
  orderLabel: string;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

function modalContainerStyle(): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    zIndex: 80
  };
}

function modalCardStyle(): CSSProperties {
  return {
    width: '100%',
    maxWidth: 500,
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 18,
    display: 'grid',
    gap: 12
  };
}

export function MedOrderStopModal({
  open,
  orderLabel,
  submitting,
  errorMessage,
  onClose,
  onSubmit
}: MedOrderStopModalProps): JSX.Element | null {
  const [reason, setReason] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setReason('');
    setLocalError(null);
  }, [open, orderLabel]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const normalizedReason = reason.trim();
    if (normalizedReason.length === 0) {
      setLocalError('Motivo obrigatório para suspender a prescrição.');
      return;
    }

    await onSubmit(normalizedReason);
  };

  return (
    <div style={modalContainerStyle()}>
      <form onSubmit={handleSubmit} style={modalCardStyle()}>
        <header style={{ display: 'grid', gap: 4 }}>
          <h3 style={{ margin: 0 }}>Suspender prescrição</h3>
          <p style={{ margin: 0, color: '#475569' }}>{orderLabel}</p>
        </header>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Motivo da suspensão</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: melhora clínica, troca de protocolo, reação adversa..."
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        {localError ? <p style={{ margin: 0, color: '#b91c1c' }}>{localError}</p> : null}
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
            {submitting ? 'Suspendendo...' : 'Confirmar suspensão'}
          </button>
        </footer>
      </form>
    </div>
  );
}

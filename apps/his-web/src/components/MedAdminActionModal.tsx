'use client';

import { FormEvent, useEffect, useState, type CSSProperties } from 'react';

type MedAdminAction = 'administered' | 'refused' | 'delayed';

type MedAdminActionModalProps = {
  open: boolean;
  action: MedAdminAction;
  patientName?: string;
  bedName?: string;
  medicationName?: string;
  dose?: string;
  route?: string;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (payload: { status: MedAdminAction; reason?: string; delayedUntil?: string }) => Promise<void>;
};

function modalContainerStyle(): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.35)',
    display: 'grid',
    placeItems: 'center',
    padding: 16,
    zIndex: 90
  };
}

function modalCardStyle(): CSSProperties {
  return {
    width: '100%',
    maxWidth: 520,
    background: '#ffffff',
    borderRadius: 14,
    border: '1px solid #e2e8f0',
    padding: 18,
    display: 'grid',
    gap: 12
  };
}

function actionTitle(action: MedAdminAction): string {
  if (action === 'administered') {
    return 'Registrar administracao';
  }

  if (action === 'refused') {
    return 'Registrar recusa';
  }

  return 'Registrar atraso';
}

export function MedAdminActionModal({
  open,
  action,
  patientName,
  bedName,
  medicationName,
  dose,
  route,
  submitting,
  errorMessage,
  onClose,
  onSubmit
}: MedAdminActionModalProps): JSX.Element | null {
  const [reason, setReason] = useState('');
  const [delayedUntil, setDelayedUntil] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setReason('');
    setDelayedUntil('');
    setLocalError(null);
    setConfirmed(false);
  }, [open, action, patientName, medicationName]);

  if (!open) {
    return null;
  }

  const reasonRequired = action !== 'administered';
  const delayedUntilRequired = action === 'delayed';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    const normalizedReason = reason.trim();
    if (reasonRequired && normalizedReason.length === 0) {
      setLocalError('Motivo obrigatorio para recusa/atraso.');
      return;
    }

    if (delayedUntilRequired && delayedUntil.trim().length === 0) {
      setLocalError('Informe o horário até quando a dose foi adiada.');
      return;
    }

    let delayedUntilIso: string | undefined;
    if (delayedUntilRequired) {
      const parsedDelayedUntil = new Date(delayedUntil);
      if (Number.isNaN(parsedDelayedUntil.getTime())) {
        setLocalError('Data/hora inválida para atraso.');
        return;
      }

      delayedUntilIso = parsedDelayedUntil.toISOString();
    }

    await onSubmit({
      status: action,
      reason: normalizedReason || undefined,
      delayedUntil: delayedUntilIso
    });
  };

  return (
    <div style={modalContainerStyle()}>
      <form onSubmit={handleSubmit} style={modalCardStyle()}>
        <header style={{ display: 'grid', gap: 4 }}>
          <h3 style={{ margin: 0 }}>{actionTitle(action)}</h3>

          {/* Validation Header */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
            display: 'grid',
            gap: 4
          }}>
            <div style={{ fontWeight: 600, color: '#92400e', fontSize: 14 }}>Validação de Identidade ({action === 'administered' ? 'Administração' : 'Registro'})</div>
            <div style={{ fontSize: 13, color: '#78350f' }}>
              <strong>Paciente:</strong> {patientName ?? 'Desconhecido'} <br />
              <strong>Leito:</strong> {bedName ?? 'Desconhecido'} <br />
              <strong>Medicação:</strong> {medicationName ?? 'N/A'} <br />
              <strong>Dose:</strong> {dose ?? 'N/A'} (Via: {route ?? 'N/A'})
            </div>
          </div>
        </header>

        {reasonRequired ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span>Motivo</span>
              <textarea
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Descreva o motivo"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
              />
            </label>

            {delayedUntilRequired ? (
              <label style={{ display: 'grid', gap: 6 }}>
                <span>Adiado até</span>
                <input
                  type="datetime-local"
                  value={delayedUntil}
                  onChange={(event) => setDelayedUntil(event.target.value)}
                  style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
                />
              </label>
            ) : null}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#475569' }}>
            A dose sera registrada como administrada neste horario.
          </p>
        )}

        <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          <span style={{ fontWeight: 500, color: '#334155' }}>
            Confirmo a identidade do paciente e as conferências do medicamento
          </span>
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
            disabled={submitting || !confirmed}
            style={{
              border: '1px solid #0f172a',
              borderRadius: 8,
              padding: '8px 10px',
              background: '#0f172a',
              color: '#fff',
              cursor: (!confirmed || submitting) ? 'not-allowed' : 'pointer',
              opacity: (submitting || !confirmed) ? 0.5 : 1
            }}
          >
            {submitting ? 'Salvando...' : 'Confirmar'}
          </button>
        </footer>
      </form>
    </div>
  );
}

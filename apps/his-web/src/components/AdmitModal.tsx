'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';

import { searchGlobal, type AdmitInpatientInput, type SearchPatientResult } from '../lib/api';

type AdmitModalProps = {
  open: boolean;
  wardId: string;
  wardName: string;
  bed: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  submitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (payload: AdmitInpatientInput) => Promise<void>;
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
    maxWidth: 640,
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

export function AdmitModal({
  open,
  wardId,
  wardName,
  bed,
  submitting,
  errorMessage,
  onClose,
  onSubmit
}: AdmitModalProps): JSX.Element | null {
  const [patientQuery, setPatientQuery] = useState('');
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [patientResults, setPatientResults] = useState<SearchPatientResult[]>([]);
  const [patientId, setPatientId] = useState('');
  const [reason, setReason] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [planSummary, setPlanSummary] = useState('');
  const [encounterId, setEncounterId] = useState('');
  const [localValidationError, setLocalValidationError] = useState<string | null>(null);

  const normalizedSearchQuery = useMemo(() => patientQuery.trim(), [patientQuery]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPatientQuery('');
    setPatientSearchError(null);
    setPatientResults([]);
    setPatientId('');
    setReason('');
    setChiefComplaint('');
    setPlanSummary('');
    setEncounterId('');
    setLocalValidationError(null);
  }, [open, bed?.id]);

  useEffect(() => {
    if (!open || normalizedSearchQuery.length < 2) {
      setPatientResults([]);
      setPatientSearchError(null);
      setSearchingPatients(false);
      return;
    }

    let canceled = false;
    setSearchingPatients(true);

    const timer = setTimeout(async () => {
      try {
        const response = await searchGlobal({ q: normalizedSearchQuery, page: 1, pageSize: 20 });
        if (canceled) {
          return;
        }
        setPatientResults(response.patients);
        setPatientSearchError(null);
      } catch (error) {
        if (canceled) {
          return;
        }
        setPatientResults([]);
        setPatientSearchError(
          error instanceof Error ? error.message : 'Falha ao buscar pacientes.'
        );
      } finally {
        if (!canceled) {
          setSearchingPatients(false);
        }
      }
    }, 260);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [open, normalizedSearchQuery]);

  if (!open || !bed) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalValidationError(null);

    const normalizedPatientId = patientId.trim();
    const normalizedReason = reason.trim();
    const normalizedChiefComplaint = chiefComplaint.trim();

    if (normalizedPatientId.length === 0) {
      setLocalValidationError('Selecione ou informe um patientId.');
      return;
    }

    if (normalizedReason.length === 0 && normalizedChiefComplaint.length === 0) {
      setLocalValidationError('Informe reason ou chiefComplaint.');
      return;
    }

    await onSubmit({
      patientId: normalizedPatientId,
      wardId,
      bedId: bed.id,
      reason: normalizedReason || undefined,
      chiefComplaint: normalizedChiefComplaint || undefined,
      planSummary: planSummary.trim() || undefined,
      encounterId: encounterId.trim() || undefined
    });
  };

  return (
    <div style={modalContainerStyle()}>
      <form onSubmit={handleSubmit} style={modalCardStyle()}>
        <header style={{ display: 'grid', gap: 4 }}>
          <h3 style={{ margin: 0 }}>Admitir paciente</h3>
          <p style={{ margin: 0, color: '#475569' }}>
            {wardName} • {bed.name} ({bed.code ?? 'sem código'})
          </p>
        </header>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Buscar paciente</span>
          <input
            value={patientQuery}
            onChange={(event) => setPatientQuery(event.target.value)}
            placeholder="Nome, microchip..."
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        {searchingPatients ? (
          <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Buscando pacientes...</p>
        ) : null}

        {patientSearchError ? (
          <p style={{ margin: 0, fontSize: 13, color: '#b91c1c' }}>{patientSearchError}</p>
        ) : null}

        {patientResults.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gap: 8,
              maxHeight: 140,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 8
            }}
          >
            {patientResults.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => setPatientId(patient.id)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: patientId === patient.id ? '#e2e8f0' : '#fff',
                  textAlign: 'left',
                  padding: '8px 10px',
                  cursor: 'pointer'
                }}
              >
                <strong>{patient.name}</strong>
                <div style={{ color: '#64748b', fontSize: 12 }}>
                  {patient.species} • {patient.id}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Patient ID</span>
          <input
            value={patientId}
            onChange={(event) => setPatientId(event.target.value)}
            placeholder="UUID do paciente"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Motivo (reason)</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo da internação"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Queixa principal (chiefComplaint)</span>
          <input
            value={chiefComplaint}
            onChange={(event) => setChiefComplaint(event.target.value)}
            placeholder="Opcional"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Plano inicial (planSummary)</span>
          <textarea
            rows={2}
            value={planSummary}
            onChange={(event) => setPlanSummary(event.target.value)}
            placeholder="Opcional"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 10px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span>Encounter ID (opcional)</span>
          <input
            value={encounterId}
            onChange={(event) => setEncounterId(event.target.value)}
            placeholder="UUID de encounter"
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
            {submitting ? 'Admitindo...' : 'Confirmar admissão'}
          </button>
        </footer>
      </form>
    </div>
  );
}

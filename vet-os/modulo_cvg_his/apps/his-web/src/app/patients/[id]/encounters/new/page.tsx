'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { createEncounter } from '../../../../../lib/api';

function resolveParamId(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default function NewEncounterPage(): JSX.Element {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const patientId = resolveParamId(params?.id);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!patientId) {
      setErrorMessage('Patient ID inválido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const encounter = await createEncounter({
        patientId,
        reason: reason.trim().length > 0 ? reason.trim() : undefined
      });
      router.replace(`/encounters/${encounter.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao abrir caso.');
      setIsSubmitting(false);
    }
  };

  if (!patientId) {
    return <p style={{ margin: 0, color: '#b91c1c' }}>Patient ID inválido.</p>;
  }

  return (
    <section style={{ display: 'grid', gap: 16, maxWidth: 760 }}>
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20
        }}
      >
        <h1 style={{ margin: '0 0 8px' }}>Abrir caso clínico</h1>
        <p style={{ margin: 0, color: '#475569' }}>
          Patient ID: {patientId}. O status inicial do encounter será <strong>open</strong>.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: 20,
          display: 'grid',
          gap: 12
        }}
      >
        <label htmlFor="reason" style={{ fontWeight: 600 }}>
          Motivo de abertura (opcional)
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Ex: retorno pós-operatório"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            padding: '10px 12px',
            resize: 'vertical'
          }}
        />

        {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              border: '1px solid #0f172a',
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            {isSubmitting ? 'Abrindo...' : 'Abrir caso'}
          </button>
          <Link
            href={`/patients/${patientId}`}
            style={{
              textDecoration: 'none',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 600
            }}
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  );
}

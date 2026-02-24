'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPatientSummary, type PatientSummaryResponse } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { RecordTimeline } from '@/features/record/components/RecordTimeline';
import { ProtocolSuggestions } from '@/features/record/components/ProtocolSuggestions';
import { px, theme } from '@/lib/theme';

function resolveParamId(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default function ClinicalRecordPage(): JSX.Element {
  const params = useParams<{ id: string | string[] }>();
  const patientId = resolveParamId(params?.id);

  const [summary, setSummary] = useState<PatientSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    if (!patientId) {
      setSummary(null);
      setErrorMessage('ID do paciente inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await getPatientSummary(patientId);
      setSummary(result);
    } catch (error) {
      console.error('Failed to load clinical record context:', error);
      setSummary(null);
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar prontuário.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return (
      <div style={{ padding: px(40), textAlign: 'center' }}>
        <p style={{ color: theme.colors.textSecondary }}>Carregando prontuário...</p>
      </div>
    );
  }

  if (errorMessage || !summary) {
    return (
      <div style={{ padding: px(40), textAlign: 'center' }}>
        <h2 style={{ color: theme.colors.danger }}>Erro de Carregamento</h2>
        <p style={{ color: theme.colors.textSecondary }}>
          Não foi possível carregar o prontuário para este paciente.
        </p>
        {errorMessage ? (
          <p style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>{errorMessage}</p>
        ) : null}
        <Link href="/patients">
          <Button variant="primary" style={{ marginTop: px(16) }}>Voltar para Pacientes</Button>
        </Link>
      </div>
    );
  }

  const patient = summary.patient;

  return (
    <div style={{ padding: px(24), display: 'flex', flexDirection: 'column', gap: px(24), backgroundColor: theme.colors.background, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: px(16) }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: px(12), marginBottom: px(4) }}>
            <h1 style={{ fontSize: px(24), fontWeight: 700, color: theme.colors.textPrimary, margin: 0 }}>
              Prontuário Clínico
            </h1>
            <span
              style={{
                padding: `${px(2)} ${px(8)}`,
                borderRadius: px(16),
                background: `${theme.colors.primary}1A`,
                color: theme.colors.primary,
                fontSize: px(12),
                fontWeight: 500
              }}
            >
              {patient.name}
            </span>
          </div>
          <p style={{ color: theme.colors.textSecondary, fontSize: px(14), margin: 0 }}>
            {patient.species && `${patient.species} • `}
            {patient.breed && `${patient.breed} • `}
            ID: {patient.id}
          </p>
        </div>

        <div style={{ display: 'flex', gap: px(12) }}>
          <Link href={`/patients/${patient.id}`}>
            <Button variant="secondary">Perfil do Paciente</Button>
          </Link>
          <Link href={`/patients/${patient.id}/encounters/new`}>
            <Button variant="primary" style={{ background: '#0f172a', borderColor: '#0f172a' }}>
              Novo Atendimento
            </Button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)', gap: px(24), alignItems: 'start' }}>
        <main style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
          <div style={{ padding: `${px(8)} 0` }}>
            <h2 style={{ margin: 0, fontSize: px(18), fontWeight: 600, color: theme.colors.textPrimary }}>
              Linha do Tempo
            </h2>
            <p style={{ margin: 0, marginTop: px(4), fontSize: px(14), color: theme.colors.textSecondary }}>
              Histórico completo de consultas, exames, e notas clínicas.
            </p>
          </div>

          <RecordTimeline patientId={patient.id} />
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: px(24), position: 'sticky', top: px(24) }}>
          <ProtocolSuggestions />
        </aside>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { AlertsPanel } from '../../../components/AlertsPanel';
import { AuditTrail } from '../../../components/AuditTrail';
import { PatientEditModal } from '../../../components/patients/PatientEditModal';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { px } from '../../../lib/theme';
import {
  getPatientSummary,
  type PatientSummaryResponse
} from '../../../lib/api';

function resolveParamId(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default function PatientDetailsPage(): JSX.Element {
  const params = useParams<{ id: string | string[] }>();
  const patientId = resolveParamId(params?.id);
  const [summary, setSummary] = useState<PatientSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!patientId) {
      setErrorMessage('Patient ID inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getPatientSummary(patientId);
      setSummary(data);
    } catch (error) {
      setSummary(null);
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar patient.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) {
    return <p style={{ margin: 0 }}>Carregando patient...</p>;
  }

  if (errorMessage) {
    return (
      <div style={{ padding: px(24) }}>
        <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p>
        <Link href="/patients">
          <Button variant="secondary" style={{ marginTop: px(16) }}>
            Voltar para Lista
          </Button>
        </Link>
      </div>
    );
  }

  if (!summary) {
    return <p style={{ padding: px(24), margin: 0 }}>Paciente não encontrado.</p>;
  }

  return (
    <div style={{ padding: px(24), display: 'flex', flexDirection: 'column', gap: px(24) }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: px(24), fontWeight: 600, color: '#111827', margin: 0 }}>
            {summary.patient.name}
          </h1>
          <p style={{ color: '#6B7280', fontSize: px(14), margin: 0, marginTop: px(4) }}>
            ID: {summary.patient.id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: px(12) }}>
          <Link href="/patients">
            <Button variant="secondary">Voltar</Button>
          </Link>
          <Link href={`/patients/${summary.patient.id}/record`}>
            <Button variant="secondary" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              Visualizar Prontuário
            </Button>
          </Link>
          <Button variant="primary" onClick={() => setIsEditModalOpen(true)}>
            Editar Paciente
          </Button>
          <Link href={`/patients/${summary.patient.id}/encounters/new`}>
            <Button variant="primary" style={{ background: '#0f172a', borderColor: '#0f172a' }}>
              Novo Atendimento
            </Button>
          </Link>
        </div>
      </div>

      <AlertsPanel
        highlighted={summary.patient.highlightedAlerts}
        alerts={summary.patient.alerts}
      />
      <Card style={{ padding: px(24) }}>
        <h2 style={{ fontSize: px(18), fontWeight: 600, margin: 0, marginBottom: px(16) }}>Dados Demográficos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: px(16) }}>
          <div>
            <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Espécie</span>
            <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
              {summary.patient.species || '-'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Raça</span>
            <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
              {summary.patient.breed || 'Não definida'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Sexo</span>
            <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
              {summary.patient.sex || '-'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: px(13), color: '#6B7280', display: 'block' }}>Microchip</span>
            <span style={{ fontSize: px(15), color: '#111827', fontWeight: 500 }}>
              {summary.patient.microchip || 'Não informado'}
            </span>
          </div>
        </div>
      </Card>

      {/* Audit Trail */}
      <AuditTrail title="Últimas alterações" events={summary.auditTrail} />

      {/* Edit Modal */}
      <PatientEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        patient={summary.patient}
        onSuccess={() => {
          void loadSummary();
        }}
      />
    </div>
  );
}

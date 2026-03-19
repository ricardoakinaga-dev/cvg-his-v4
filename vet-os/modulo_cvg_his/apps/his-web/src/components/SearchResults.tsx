import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';

import type { SearchResponse, SearchOwnerResult, SearchPatientResult } from '../lib/api';

type SearchResultsProps = {
  query: string;
  loading: boolean;
  error: string | null;
  data: SearchResponse | null;
  onSelect: (href: string) => void;
  renderOwner?: (owner: SearchOwnerResult) => ReactNode;
  renderPatient?: (patient: SearchPatientResult) => ReactNode;
};

const itemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
  padding: '10px 12px',
  cursor: 'pointer'
};

function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <p style={{ margin: 0, padding: '10px 2px', color: '#64748b', fontSize: 14 }}>{message}</p>
  );
}

export function SearchResults({
  query,
  loading,
  error,
  data,
  onSelect,
  renderOwner,
  renderPatient
}: SearchResultsProps): JSX.Element {
  if (query.trim().length < 2) {
    return <EmptyState message="Digite pelo menos 2 caracteres para buscar." />;
  }

  if (loading) {
    return <EmptyState message="Buscando..." />;
  }

  if (error) {
    return <EmptyState message={error} />;
  }

  if (!data) {
    return <EmptyState message="Sem resultados." />;
  }

  const hasResults = data.owners.length > 0 || data.patients.length > 0;

  if (!hasResults) {
    return <EmptyState message={`Nenhum resultado para "${query}".`} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>Owners</h4>
        {data.owners.length === 0 ? (
          <EmptyState message="Nenhum owner encontrado." />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.owners.map((owner) =>
              renderOwner ? (
                <div key={owner.id}>{renderOwner(owner)}</div>
              ) : (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => onSelect(`/owners/${owner.id}`)}
                  style={itemStyle}
                >
                  <strong>{owner.fullName}</strong>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    {owner.document ?? 'Sem documento'} | {owner.phoneMain ?? 'Sem telefone'}
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, color: '#475569' }}>Patients</h4>
        {data.patients.length === 0 ? (
          <EmptyState message="Nenhum patient encontrado." />
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {data.patients.map((patient) =>
              renderPatient ? (
                <div key={patient.id}>{renderPatient(patient)}</div>
              ) : (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => onSelect(`/patients/${patient.id}`)}
                  style={itemStyle}
                >
                  <strong>{patient.name}</strong>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    {patient.species} | microchip: {patient.microchip ?? 'n/a'}
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

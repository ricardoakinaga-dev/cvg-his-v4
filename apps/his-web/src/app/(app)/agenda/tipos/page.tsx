'use client';

/**
 * Appointment Types Admin Page - Premium Agenda Module
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Can } from '@/components/auth/Can';
import { useAppointmentTypes } from '@/features/agenda/hooks';
import { AppointmentType } from '@/features/agenda/api';

const sectorLabels: Record<string, string> = {
  geral: 'Geral',
  clinica: 'Clínica',
  internacao: 'Internação',
  imagem: 'Imagem',
  laboratorio: 'Laboratório',
  cirurgia: 'Cirurgia',
};

export default function AppointmentTypesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');

  // Fetch appointment types
  const { data, isLoading, refetch } = useAppointmentTypes({
    query: search || undefined,
    sector: sectorFilter !== 'all' ? sectorFilter : undefined,
    pageSize: 100,
  });

  const types = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de Agendamento"
        description="Configure os tipos de agendamento: consultas, retornes, cirurgias, exames e procedimentos."
        actions={
          <Can permission="agenda.config.update">
            <Link href="/agenda/tipos/novo">
              <Button>Novo Tipo</Button>
            </Link>
          </Can>
        }
      />

      {/* Filters */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <Input
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ minWidth: '180px' }}>
            <Select
              value={sectorFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSectorFilter(e.target.value)}
            >
              <option value="all">Todos os setores</option>
              <option value="geral">Geral</option>
              <option value="clinica">Clínica</option>
              <option value="internacao">Internação</option>
              <option value="imagem">Imagem</option>
              <option value="laboratorio">Laboratório</option>
              <option value="cirurgia">Cirurgia</option>
            </Select>
          </div>
          <Button variant="ghost" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <LoadingState message="Carregando tipos..." />
      ) : types.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Nenhum tipo de agendamento encontrado.
          </p>
          <Can permission="agenda.config.update">
            <Link href="/agenda/tipos/novo">
              <Button>Criar Primeiro Tipo</Button>
            </Link>
          </Can>
        </Card>
      ) : (
        <Card style={{ padding: '0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Código</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Nome</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Setor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Duração</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Recurso</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Equipe</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {types.map((type: AppointmentType) => (
                  <tr 
                    key={type.id}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => router.push(`/agenda/tipos/${type.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                        {type.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {type.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {sectorLabels[type.sector] || type.sector}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {type.defaultDurationMinutes} min
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {type.requiresResource ? '✓' : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {type.requiresTeam ? '✓' : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: type.active ? '#dcfce7' : '#fee2e2',
                          color: type.active ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {type.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agenda/tipos/${type.id}`);
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

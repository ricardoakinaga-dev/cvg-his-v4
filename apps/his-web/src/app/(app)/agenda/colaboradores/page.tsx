'use client';

/**
 * Collaborators Admin Page - Premium Agenda Module
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
import { useCollaborators, useUpdateCollaborator } from '@/features/agenda/hooks';
import { Collaborator } from '@/features/agenda/api';

export default function CollaboratorsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch collaborators
  const { data, isLoading, refetch } = useCollaborators({
    query: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    pageSize: 100,
  });

  const collaborators = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Colaboradores"
        description="Gerencie os colaboradores da agenda: veterinários, especialistas, anestesistas e equipe de apoio."
        actions={
          <Can permission="agenda.colaboradores.update">
            <Link href="/agenda/colaboradores/novo">
              <Button>Novo Colaborador</Button>
            </Link>
          </Can>
        }
      />

      {/* Filters */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ minWidth: '180px' }}>
            <Select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </Select>
          </div>
          <Button variant="ghost" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <LoadingState message="Carregando colaboradores..." />
      ) : collaborators.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Nenhum colaborador encontrado.
          </p>
          <Can permission="agenda.colaboradores.update">
            <Link href="/agenda/colaboradores/novo">
              <Button>Criar Primeiro Colaborador</Button>
            </Link>
          </Can>
        </Card>
      ) : (
        <Card style={{ padding: '0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Nome</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Função</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Especialidade</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Contato</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Registro</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((collab: Collaborator) => (
                  <tr 
                    key={collab.id}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => router.push(`/agenda/colaboradores/${collab.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 500 }}>{collab.name}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {collab.roleTitle || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {collab.specialty || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      <div>{collab.email || '-'}</div>
                      <div style={{ fontSize: '12px' }}>{collab.phone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {collab.licenseType && collab.licenseNumber 
                        ? `${collab.licenseType}: ${collab.licenseNumber}`
                        : '-'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: collab.status === 'active' ? '#dcfce7' : '#fee2e2',
                          color: collab.status === 'active' ? '#15803d' : '#b91c1c',
                        }}
                      >
                        {collab.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/agenda/colaboradores/${collab.id}`);
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

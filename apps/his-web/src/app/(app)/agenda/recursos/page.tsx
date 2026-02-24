'use client';

/**
 * Resources Admin Page - Premium Agenda Module
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
import { useResources } from '@/features/agenda/hooks';
import { Resource } from '@/features/agenda/api';

const resourceTypeLabels: Record<string, string> = {
  room: 'Consultório',
  surgery_room: 'Sala Cirúrgica',
  equipment: 'Equipamento',
};

export default function ResourcesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch resources
  const { data, isLoading, refetch } = useResources({
    query: search || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    pageSize: 100,
  });

  const resources = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recursos"
        description="Gerencie os recursos da agenda: consultórios, salas cirúrgicas e equipamentos."
        actions={
          <Can permission="agenda.recursos.update">
            <Link href="/agenda/recursos/novo">
              <Button>Novo Recurso</Button>
            </Link>
          </Can>
        }
      />

      {/* Filters */}
      <Card style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ minWidth: '180px' }}>
            <Select
              value={typeFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="room">Consultório</option>
              <option value="surgery_room">Sala Cirúrgica</option>
              <option value="equipment">Equipamento</option>
            </Select>
          </div>
          <Button variant="ghost" onClick={() => refetch()}>
            Atualizar
          </Button>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <LoadingState message="Carregando recursos..." />
      ) : resources.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Nenhum recurso encontrado.
          </p>
          <Can permission="agenda.recursos.update">
            <Link href="/agenda/recursos/novo">
              <Button>Criar Primeiro Recurso</Button>
            </Link>
          </Can>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {resources.map((resource: Resource) => (
            <Card 
              key={resource.id}
              style={{ 
                padding: '20px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
              }}
              onClick={() => router.push(`/agenda/recursos/${resource.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{resource.name}</h3>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: resource.active ? '#dcfce7' : '#fee2e2',
                    color: resource.active ? '#15803d' : '#b91c1c',
                  }}
                >
                  {resource.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                {resourceTypeLabels[resource.type] || resource.type}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

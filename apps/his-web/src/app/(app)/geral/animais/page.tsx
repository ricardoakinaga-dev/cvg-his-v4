'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Can } from '../../../../components/auth/Can';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { apiClient } from '../../../../lib/api/client';
import { PERMISSIONS } from '../../../../lib/rbac';

type Patient = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
  weightKg: string | null;
  microchip: string | null;
  ownerId: string;
  ownerName: string;
};

type PatientsResponse = {
  data: Patient[];
  total: number;
  page: number;
  pageSize: number;
};

const SPECIES_OPTIONS = [
  { value: '', label: 'Todas espécies' },
  { value: 'Canino', label: 'Canino' },
  { value: 'Felino', label: 'Felino' },
  { value: 'Equino', label: 'Equino' },
  { value: 'Bovino', label: 'Bovino' },
  { value: 'Ave', label: 'Ave' },
  { value: 'Roedor', label: 'Roedor' },
  { value: 'Outro', label: 'Outro' }
];

function AnimaisContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [speciesFilter, setSpeciesFilter] = useState(searchParams.get('species') || '');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('q', search);
      if (speciesFilter) params.set('species', speciesFilter);

      const response = await apiClient<PatientsResponse>(`/patients?${params.toString()}`);
      setPatients(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar animais');
    } finally {
      setLoading(false);
    }
  }, [page, search, speciesFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (speciesFilter) params.set('species', speciesFilter);
    router.push(`/geral/animais?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / pageSize);

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years < 1) {
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Animais"
        description="Gerenciar pacientes animais"
        actions={
          <Can permission={PERMISSIONS.GERAL_ANIMAIS_CREATE}>
            <Link href="/geral/animais/novo">
              <Button>Novo Animal</Button>
            </Link>
          </Can>
        }
      />

      {/* Search */}
      <Card>
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input
            placeholder="Buscar por nome, microchip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {SPECIES_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit">Buscar</Button>
        </form>
      </Card>

      {/* Content */}
      {loading ? (
        <LoadingState message="Carregando animais..." />
      ) : error ? (
        <EmptyState
          title="Erro ao carregar"
          description={error}
          action={<Button onClick={fetchPatients}>Tentar novamente</Button>}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          title="Nenhum animal encontrado"
          description={search ? "Tente ajustar os filtros de busca" : "Cadastre seu primeiro animal"}
          action={
            <Can permission={PERMISSIONS.GERAL_ANIMAIS_CREATE}>
              <Link href="/geral/animais/novo">
                <Button>Novo Animal</Button>
              </Link>
            </Can>
          }
        />
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Nome</th>
                    <th className="text-left p-4">Espécie / Raça</th>
                    <th className="text-left p-4">Sexo / Idade</th>
                    <th className="text-left p-4">Tutor</th>
                    <th className="text-left p-4">Microchip</th>
                    <th className="text-left p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Link href={`/geral/animais/${patient.id}`} className="text-blue-600 hover:underline font-medium">
                          {patient.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        {patient.species}
                        {patient.breed && ` / ${patient.breed}`}
                      </td>
                      <td className="p-4">
                        {patient.sex === 'M' ? 'Macho' : patient.sex === 'F' ? 'Fêmea' : '-'} / {calculateAge(patient.birthDate)}
                      </td>
                      <td className="p-4">
                        <Link href={`/geral/clientes/${patient.ownerId}`} className="text-blue-600 hover:underline">
                          {patient.ownerName}
                        </Link>
                      </td>
                      <td className="p-4">{patient.microchip || '-'}</td>
                      <td className="p-4">
                        <Link href={`/geral/animais/${patient.id}`} className="text-blue-600 hover:underline">
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <span className="py-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function AnimaisPage() {
  return (
    <Suspense fallback={<LoadingState message="Carregando..." />}>
      <AnimaisContent />
    </Suspense>
  );
}

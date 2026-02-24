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

type Owner = {
  id: string;
  fullName: string;
  document: string | null;
  phoneMain: string | null;
  email: string | null;
  createdAt: string;
};

type OwnersResponse = {
  data: Owner[];
  total: number;
  page: number;
  pageSize: number;
};

function ClientesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search) params.set('q', search);

      const response = await apiClient<OwnersResponse>(`/owners?${params.toString()}`);
      setOwners(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    router.push(`/geral/clientes?${params.toString()}`);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Gerenciar clientes e seus animais"
        actions={
          <Can permission={PERMISSIONS.GERAL_CLIENTES_CREATE}>
            <Link href="/geral/clientes/novo">
              <Button>Novo Cliente</Button>
            </Link>
          </Can>
        }
      />

      {/* Search */}
      <Card>
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input
            placeholder="Buscar por nome, documento, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">Buscar</Button>
        </form>
      </Card>

      {/* Content */}
      {loading ? (
        <LoadingState message="Carregando clientes..." />
      ) : error ? (
        <EmptyState
          title="Erro ao carregar"
          description={error}
          action={
            <Button onClick={fetchOwners}>Tentar novamente</Button>
          }
        />
      ) : owners.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={search ? "Tente ajustar os filtros de busca" : "Cadastre seu primeiro cliente"}
          action={
            <Can permission={PERMISSIONS.GERAL_CLIENTES_CREATE}>
              <Link href="/geral/clientes/novo">
                <Button>Novo Cliente</Button>
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
                    <th className="text-left p-4">Documento</th>
                    <th className="text-left p-4">Telefone</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">{owner.fullName}</td>
                      <td className="p-4">{owner.document || '-'}</td>
                      <td className="p-4">{owner.phoneMain || '-'}</td>
                      <td className="p-4">{owner.email || '-'}</td>
                      <td className="p-4">
                        <Link href={`/geral/clientes/${owner.id}`} className="text-blue-600 hover:underline">
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

export default function ClientesPage() {
  return (
    <Suspense fallback={<LoadingState message="Carregando..." />}>
      <ClientesContent />
    </Suspense>
  );
}

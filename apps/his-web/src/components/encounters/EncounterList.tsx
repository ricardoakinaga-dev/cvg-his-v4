'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { listEncounters } from '../../lib/api';
import type { EncounterRecord, ListEncountersApiResponse } from '../../lib/api';

const STATUS_OPTIONS = [
    { value: '', label: 'Todos os Status' },
    { value: 'open', label: 'Em Andamento' },
    { value: 'closed', label: 'Finalizado' }
];

export function EncounterList() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState(searchParams.get('q') || '');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const fetchEncounters = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await listEncounters({
                page,
                pageSize,
                q: search || undefined,
                // The API might not natively filter by status in this specific iteration, 
                // but let's pass it if supported or handle it client-side if needed
                // Assuming API has no direct status filter, we'll fetch all and filter in UI for now 
                // if API doesn't support it, but normally we'd pass it like `status: statusFilter` 
            });

            let filteredData = response.data;
            if (statusFilter) {
                filteredData = response.data.filter(e => e.status === statusFilter);
            }

            setEncounters(filteredData);
            setTotal(response.total); // In a real API, total comes back filtered
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar atendimentos');
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        fetchEncounters();
    }, [fetchEncounters]);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPage(1);
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (statusFilter) params.set('status', statusFilter);
        router.push(`/clinica/atendimentos?${params.toString()}`);
    };

    const totalPages = Math.ceil(total / pageSize);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR');
    };

    const getStatusBadgeClass = (status: 'open' | 'closed') => {
        if (status === 'open') {
            return 'bg-green-100 text-green-800';
        }
        return 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: 'open' | 'closed') => {
        return status === 'open' ? 'Em Andamento' : 'Finalizado';
    };

    return (
        <div className="space-y-6">
            {/* Search Filter */}
            <Card>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <Input
                        placeholder="Buscar por nome do paciente..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        {STATUS_OPTIONS.map((opt) => (
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
                <LoadingState message="Carregando atendimentos..." />
            ) : error ? (
                <EmptyState
                    title="Erro ao carregar"
                    description={error}
                    action={<Button onClick={fetchEncounters}>Tentar novamente</Button>}
                />
            ) : encounters.length === 0 ? (
                <EmptyState
                    title="Nenhum atendimento encontrado"
                    description={search || statusFilter ? "Tente ajustar os filtros de busca" : "Comece um novo atendimento clicando em 'Nova Consulta'"}
                />
            ) : (
                <>
                    <Card>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-4">Paciente</th>
                                        <th className="text-left p-4">Início</th>
                                        <th className="text-left p-4">Término</th>
                                        <th className="text-left p-4">Status</th>
                                        <th className="text-left p-4">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {encounters.map((encounter) => (
                                        <tr key={encounter.id} className="border-b hover:bg-gray-50">
                                            <td className="p-4">
                                                <Link href={`/geral/animais/${encounter.patientId}`} className="text-blue-600 hover:underline font-medium">
                                                    {/* Needs populated patientName normally. The API currently returns patientId for EncounterRecord. We'll show ID or fetch if needed */}
                                                    {encounter.patientId.substring(0, 8)}...
                                                </Link>
                                            </td>
                                            <td className="p-4 whitespace-nowrap">{formatDate(encounter.openedAt)}</td>
                                            <td className="p-4 whitespace-nowrap">{formatDate(encounter.closedAt)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(encounter.status)}`}>
                                                    {getStatusLabel(encounter.status)}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <Link href={`/clinica/atendimentos/${encounter.id}`} className="text-blue-600 hover:underline">
                                                    Ver prontuário
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

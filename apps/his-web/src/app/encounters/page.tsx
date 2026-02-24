'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { listEncounters, type EncounterRecord, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SearchInput } from '@/components/ui/SearchInput';
import { Badge } from '@/components/ui/Primitives';
import { 
    PageHeader, 
    ListPageLayout, 
    ContentSection, 
    Pagination 
} from '@/components/ui/PageHeader';
import { theme, px, row, col } from '@/lib/theme';

// Force dynamic rendering to avoid useSearchParams issues
export const dynamic = 'force-dynamic';

function EncountersListContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientId = searchParams.get('patientId') || undefined;

    // Data state
    const [data, setData] = useState<EncounterRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    // Search state
    const [query, setQuery] = useState(searchParams.get('q') ?? '');
    const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') ?? '');

    // Pagination state
    const [page, setPage] = useState(Number(searchParams.get('page') ?? 1) || 1);
    const pageSize = 10;

    const minQueryLength = 2;
    const isQueryTooShort = query.length > 0 && query.length < minQueryLength;

    useEffect(() => {
        if (isQueryTooShort) return;
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, isQueryTooShort]);

    // Fetch data
    const fetchData = useCallback(async (pageNum: number, searchQuery: string, patId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await listEncounters({ 
                patientId: patId,
                q: searchQuery || undefined,
                page: pageNum, 
                pageSize 
            });
            setData(res.data);
            setTotal(res.total);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err);
            } else {
                setError(new ApiError('Erro desconhecido', 500, null));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Trigger fetch on page change
    useEffect(() => {
        fetchData(page, debouncedQuery, patientId);

        const params = new URLSearchParams();
        if (patientId) params.set('patientId', patientId);
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (page > 1) params.set('page', String(page));
        const queryString = params.toString();
        router.replace(queryString ? `/encounters?${queryString}` : '/encounters', { scroll: false });
    }, [page, debouncedQuery, patientId, fetchData, router]);

    // Keyboard shortcut for new encounter (Cmd/Ctrl + N)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                router.push('/reception');
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    // Format date for display
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Get status badge variant
    const getStatusVariant = (status: string): 'warning' | 'success' | 'danger' | 'info' | 'neutral' => {
        switch (status) {
            case 'open': return 'warning';
            case 'closed': return 'success';
            default: return 'neutral';
        }
    };

    // Get status label
    const getStatusLabel = (status: string): string => {
        switch (status) {
            case 'open': return 'Aberto';
            case 'closed': return 'Fechado';
            default: return status;
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <ListPageLayout>
            {/* Page Header */}
            <PageHeader
                title="Atendimentos"
                description={patientId ? 'Atendimentos do paciente selecionado' : 'Histórico geral de atendimentos'}
                actions={
                    <Link href="/reception">
                        <Button variant="primary" aria-label="Novo atendimento (Ctrl+N)">
                            Novo Atendimento
                        </Button>
                    </Link>
                }
            />

            <Card style={{ padding: px(16) }}>
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Buscar por motivo ou ID do atendimento..."
                    minQueryLength={minQueryLength}
                    showMinLengthHint
                    aria-label="Buscar atendimentos"
                />
            </Card>

            {isQueryTooShort && !loading && (
                <div style={{
                    padding: px(24),
                    textAlign: 'center',
                    color: theme.colors.textSecondary
                }}>
                    <p>Digite pelo menos {minQueryLength} caracteres para buscar.</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <ErrorBanner
                    title="Erro ao carregar dados"
                    message={error.message}
                    requestId={error.requestId}
                    onRetry={() => fetchData(page, debouncedQuery, patientId)}
                />
            )}

            {/* Loading State */}
            {loading && !error && (
                <LoadingState message="Carregando atendimentos..." />
            )}

            {/* Empty State */}
            {!loading && !error && !isQueryTooShort && data.length === 0 && (
                <EmptyState
                    title="Nenhum atendimento encontrado"
                    description={
                        debouncedQuery
                            ? `Sem resultados para "${debouncedQuery}".`
                            : 'Nenhum atendimento foi registrado ainda.'
                    }
                    action={
                        <Link href="/reception">
                            <Button variant="primary">Iniciar Atendimento</Button>
                        </Link>
                    }
                />
            )}

            {/* Content List */}
            {!loading && !error && !isQueryTooShort && data.length > 0 && (
                <ContentSection>
                    {data.map((encounter) => (
                        <Link
                            key={encounter.id}
                            href={`/encounters/${encounter.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            aria-label={`Abrir atendimento ${encounter.id}`}
                        >
                            <Card 
                                style={{ 
                                    padding: px(16), 
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s'
                                }}
                                tabIndex={0}
                            >
                                <div style={{ 
                                    ...row(16), 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-start' 
                                }}>
                                    {/* Left side - Main info */}
                                    <div style={{ flex: 1, ...col(8) }}>
                                        <div style={{ ...row(12), alignItems: 'center' }}>
                                            <h3 style={{ 
                                                fontSize: px(16), 
                                                fontWeight: 600, 
                                                margin: 0,
                                                color: theme.colors.textPrimary
                                            }}>
                                                Atendimento {encounter.id.slice(0, 8)}...
                                            </h3>
                                            <Badge 
                                                label={getStatusLabel(encounter.status)} 
                                                variant={getStatusVariant(encounter.status)} 
                                            />
                                        </div>
                                        
                                        <div style={{ 
                                            ...row(16), 
                                            color: theme.colors.textSecondary, 
                                            fontSize: px(14) 
                                        }}>
                                            <span>Aberto em: {formatDate(encounter.openedAt)}</span>
                                            {encounter.closedAt && (
                                                <span>• Fechado em: {formatDate(encounter.closedAt)}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Right side */}
                                    <div style={{ 
                                        ...row(8), 
                                        alignItems: 'center',
                                        flexShrink: 0
                                    }}>
                                        <span style={{ 
                                            color: theme.colors.textSecondary, 
                                            fontSize: px(13), 
                                            fontWeight: 600 
                                        }}>
                                            Abrir →
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}

                    {/* Pagination */}
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </ContentSection>
            )}
        </ListPageLayout>
    );
}

export default function EncountersListPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
            <EncountersListContent />
        </Suspense>
    );
}

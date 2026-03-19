'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listOwners, type Owner, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SearchInput } from '@/components/ui/SearchInput';
import { 
    PageHeader, 
    ListPageLayout, 
    ContentSection, 
    Pagination 
} from '@/components/ui/PageHeader';
import { ClientCreateModal } from '@/components/clients/ClientCreateModal';
import { theme, px, row } from '@/lib/theme';

/**
 * Clients List Page (/clients)
 * 
 * Standardized list page with:
 * - Loading state
 * - Empty state
 * - Error banner
 * - Debounced search with min query protection
 * - Pagination
 * - Accessibility features
 */
export default function ClientsListPage() {
    const router = useRouter();

    // Data state
    const [data, setData] = useState<Owner[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Search and pagination state
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Minimum query length for search
    const minQueryLength = 2;
    const isQueryTooShort = query.length > 0 && query.length < minQueryLength;

    // Debounce effect
    useEffect(() => {
        if (isQueryTooShort) return;

        const handler = setTimeout(() => {
            setDebouncedQuery(query);
            setPage(1); // Reset page on new search
        }, 300);

        return () => clearTimeout(handler);
    }, [query, isQueryTooShort]);

    // Fetch data effect
    const fetchData = useCallback(async (searchQuery: string, pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await listOwners({ 
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

    // Trigger fetch on debounced query or page change
    useEffect(() => {
        fetchData(debouncedQuery, page);
        
        // Update URL
        const params = new URLSearchParams();
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (page > 1) params.set('page', page.toString());
        const queryString = params.toString();
        router.replace(queryString ? `/clients?${queryString}` : '/clients', { scroll: false });
    }, [debouncedQuery, page, fetchData, router]);

    const totalPages = Math.ceil(total / pageSize);

    // Keyboard shortcut for new client (Cmd/Ctrl + N)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
                e.preventDefault();
                setIsCreateModalOpen(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <ListPageLayout>
            {/* Page Header */}
            <PageHeader
                title="Clientes"
                description="Gerencie os tutores e responsáveis pelos pacientes"
                actions={
                    <Button 
                        variant="primary" 
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Criar novo cliente (Ctrl+N)"
                    >
                        Novo Cliente
                    </Button>
                }
            />

            {/* Search Section */}
            <Card style={{ padding: px(16) }}>
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Buscar por nome, documento ou telefone..."
                    minQueryLength={minQueryLength}
                    showMinLengthHint
                    aria-label="Buscar clientes"
                />
            </Card>

            {/* Error State */}
            {error && (
                <ErrorBanner
                    title="Erro ao carregar dados"
                    message={error.message}
                    requestId={error.requestId}
                    onRetry={() => fetchData(debouncedQuery, page)}
                />
            )}

            {/* Query Too Short Warning */}
            {isQueryTooShort && !loading && (
                <div style={{
                    padding: px(24),
                    textAlign: 'center',
                    color: theme.colors.textSecondary
                }}>
                    <p>Digite pelo menos {minQueryLength} caracteres para buscar.</p>
                </div>
            )}

            {/* Loading State */}
            {loading && !error && (
                <LoadingState message="Carregando clientes..." />
            )}

            {/* Empty State */}
            {!loading && !error && !isQueryTooShort && data.length === 0 && (
                <EmptyState
                    title="Nenhum cliente encontrado"
                    description={debouncedQuery 
                        ? `Sem resultados para "${debouncedQuery}"` 
                        : "Comece cadastrando o primeiro cliente."
                    }
                    action={
                        <Button 
                            variant="primary" 
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Criar Cliente
                        </Button>
                    }
                />
            )}

            {/* Content List */}
            {!loading && !error && !isQueryTooShort && data.length > 0 && (
                <ContentSection>
                    {data.map((owner) => (
                        <Link
                            key={owner.id}
                            href={`/clients/${owner.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            aria-label={`Abrir cliente ${owner.fullName}`}
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
                                    alignItems: 'center' 
                                }}>
                                    <div>
                                        <h3 style={{ 
                                            fontSize: px(16), 
                                            fontWeight: 600, 
                                            margin: 0,
                                            color: theme.colors.textPrimary
                                        }}>
                                            {owner.fullName}
                                        </h3>
                                        <div style={{ 
                                            ...row(16), 
                                            marginTop: px(4), 
                                            color: theme.colors.textSecondary, 
                                            fontSize: px(14) 
                                        }}>
                                            {owner.document && <span>{owner.document}</span>}
                                            {owner.phoneMain && <span>{owner.phoneMain}</span>}
                                            {owner.email && <span>{owner.email}</span>}
                                        </div>
                                    </div>
                                    <span style={{ 
                                        color: theme.colors.textSecondary, 
                                        fontSize: px(13), 
                                        fontWeight: 600 
                                    }}>
                                        Abrir →
                                    </span>
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

            {/* Create Modal */}
            <ClientCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(newId) => router.push(`/clients/${newId}`)}
            />
        </ListPageLayout>
    );
}

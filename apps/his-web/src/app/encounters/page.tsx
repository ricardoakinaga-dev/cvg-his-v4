'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { listEncounters, type EncounterRecord, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Badge } from '@/components/ui/Primitives';
import { 
    PageHeader, 
    ListPageLayout, 
    ContentSection, 
    Pagination 
} from '@/components/ui/PageHeader';
import { theme, px, row, col } from '@/lib/theme';

/**
 * Encounters List Page (/encounters)
 * 
 * Standardized list page with:
 * - Loading state
 * - Empty state
 * - Error banner
 * - Pagination
 * - Accessibility features
 * 
 * Note: Encounters are filtered by patientId via URL param.
 * For general encounter listing, use the Reception page.
 */
export default function EncountersListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientId = searchParams.get('patientId');

    // Data state
    const [data, setData] = useState<EncounterRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Fetch data
    const fetchData = useCallback(async (pageNum: number, patId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await listEncounters({ 
                patientId: patId,
                page: pageNum, 
                pageSize 
            });
            setData(res.data);
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
        fetchData(page, patientId || undefined);
    }, [page, patientId, fetchData]);

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

    // If no patientId, show guidance to use Reception
    if (!patientId) {
        return (
            <ListPageLayout>
                <PageHeader
                    title="Atendimentos"
                    description="Histórico de atendimentos realizados"
                />

                <Card>
                    <EmptyState
                        title="Listagem de Atendimentos"
                        description="A listagem direta de atendimentos será habilitada em breve. Por enquanto, utilize o fluxo de Recepção ou acesse via Paciente."
                        action={
                            <Link href="/reception">
                                <Button variant="primary">Abrir Recepção</Button>
                            </Link>
                        }
                    />
                </Card>
            </ListPageLayout>
        );
    }

    return (
        <ListPageLayout>
            {/* Page Header */}
            <PageHeader
                title="Atendimentos"
                description="Atendimentos do paciente"
                actions={
                    <Link href="/reception">
                        <Button variant="primary" aria-label="Abrir recepção para novo atendimento (Ctrl+N)">
                            Novo Atendimento
                        </Button>
                    </Link>
                }
            />

            {/* Error State */}
            {error && (
                <ErrorBanner
                    title="Erro ao carregar dados"
                    message={error.message}
                    requestId={error.requestId}
                    onRetry={() => fetchData(page, patientId)}
                />
            )}

            {/* Loading State */}
            {loading && !error && (
                <LoadingState message="Carregando atendimentos..." />
            )}

            {/* Empty State */}
            {!loading && !error && data.length === 0 && (
                <EmptyState
                    title="Nenhum atendimento encontrado"
                    description="Este paciente ainda não possui atendimentos registrados."
                    action={
                        <Link href="/reception">
                            <Button variant="primary">Iniciar Atendimento</Button>
                        </Link>
                    }
                />
            )}

            {/* Content List */}
            {!loading && !error && data.length > 0 && (
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
                        totalPages={Math.ceil(data.length / pageSize)}
                        onPageChange={setPage}
                    />
                </ContentSection>
            )}
        </ListPageLayout>
    );
}

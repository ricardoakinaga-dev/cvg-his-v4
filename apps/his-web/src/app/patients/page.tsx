'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listPatients, type Patient, ApiError } from '@/lib/api';
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
import { PatientCreateModal } from '@/components/patients/PatientCreateModal';
import { theme, px, row, col } from '@/lib/theme';

/**
 * Patients List Page (/patients)
 * 
 * Standardized list page with:
 * - Loading state
 * - Empty state
 * - Error banner
 * - Debounced search with min query protection
 * - Pagination
 * - Accessibility features
 */
export default function PatientsListPage() {
    const router = useRouter();

    // Data state
    const [data, setData] = useState<Patient[]>([]);
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
            setPage(1);
        }, 300);

        return () => clearTimeout(handler);
    }, [query, isQueryTooShort]);

    // Fetch data
    const fetchData = useCallback(async (searchQuery: string, pageNum: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await listPatients({ 
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
        router.replace(queryString ? `/patients?${queryString}` : '/patients', { scroll: false });
    }, [debouncedQuery, page, fetchData, router]);

    const totalPages = Math.ceil(total / pageSize);

    // Keyboard shortcut for new patient (Cmd/Ctrl + N)
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
                title="Pacientes"
                description="Listagem geral de pacientes"
                actions={
                    <Button 
                        variant="primary" 
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Criar novo paciente (Ctrl+N)"
                    >
                        Novo Paciente
                    </Button>
                }
            />

            {/* Search Section */}
            <Card style={{ padding: px(16) }}>
                <SearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Buscar por nome, microchip ou espécie..."
                    minQueryLength={minQueryLength}
                    showMinLengthHint
                    aria-label="Buscar pacientes"
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
                <LoadingState message="Carregando pacientes..." />
            )}

            {/* Empty State */}
            {!loading && !error && !isQueryTooShort && data.length === 0 && (
                <EmptyState
                    title="Nenhum paciente encontrado"
                    description={debouncedQuery 
                        ? `Sem resultados para "${debouncedQuery}"` 
                        : "Cadastre o primeiro paciente."
                    }
                    action={
                        <Button 
                            variant="primary" 
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            Criar Paciente
                        </Button>
                    }
                />
            )}

            {/* Content List */}
            {!loading && !error && !isQueryTooShort && data.length > 0 && (
                <ContentSection>
                    {data.map((patient) => (
                        <Link
                            key={patient.id}
                            href={`/patients/${patient.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            aria-label={`Abrir paciente ${patient.name}`}
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
                                    <div style={{ ...row(16), alignItems: 'center' }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: px(40), 
                                            height: px(40), 
                                            borderRadius: '50%',
                                            background: theme.colors.primaryLight, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            fontWeight: 600, 
                                            color: theme.colors.primary,
                                            flexShrink: 0
                                        }}>
                                            {patient.name.charAt(0).toUpperCase()}
                                        </div>
                                        
                                        {/* Info */}
                                        <div style={col(4)}>
                                            <h3 style={{ 
                                                fontSize: px(16), 
                                                fontWeight: 600, 
                                                margin: 0,
                                                color: theme.colors.textPrimary
                                            }}>
                                                {patient.name}
                                            </h3>
                                            <div style={{ 
                                                ...row(12), 
                                                color: theme.colors.textSecondary, 
                                                fontSize: px(14) 
                                            }}>
                                                <span>{patient.species}</span>
                                                {patient.breed && <span>• {patient.breed}</span>}
                                                {patient.sex && <span>• {patient.sex}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Right side */}
                                    <div style={{ ...row(16), alignItems: 'center' }}>
                                        {patient.microchip && (
                                            <Badge 
                                                label={`Chip: ${patient.microchip}`} 
                                                variant="warning" 
                                            />
                                        )}
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

            {/* Create Modal */}
            <PatientCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(newId) => router.push(`/patients/${newId}`)}
            />
        </ListPageLayout>
    );
}

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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

// Force dynamic rendering to avoid useSearchParams issues
export const dynamic = 'force-dynamic';

function OwnersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<Owner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(searchParams.get('create') === 'true');

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1) || 1);
  const pageSize = 10;

  const minQueryLength = 2;
  const isQueryTooShort = query.length > 0 && query.length < minQueryLength;

  useEffect(() => {
    if (isQueryTooShort) return;

    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [query, isQueryTooShort]);

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

  useEffect(() => {
    fetchData(debouncedQuery, page);

    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (page > 1) params.set('page', String(page));
    const queryString = params.toString();
    router.replace(queryString ? `/owners?${queryString}` : '/owners', { scroll: false });
  }, [debouncedQuery, page, fetchData, router]);

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ListPageLayout>
      <PageHeader
        title="Tutores"
        description="Cadastro e busca de tutores dos pacientes"
        actions={
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            aria-label="Criar novo tutor (Ctrl+N)"
          >
            Novo Tutor
          </Button>
        }
      />

      <Card style={{ padding: px(16) }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nome, documento ou telefone..."
          minQueryLength={minQueryLength}
          showMinLengthHint
          aria-label="Buscar tutores"
        />
      </Card>

      {error && (
        <ErrorBanner
          title="Erro ao carregar dados"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => fetchData(debouncedQuery, page)}
        />
      )}

      {isQueryTooShort && !loading && (
        <div style={{ padding: px(24), textAlign: 'center', color: theme.colors.textSecondary }}>
          <p>Digite pelo menos {minQueryLength} caracteres para buscar.</p>
        </div>
      )}

      {loading && !error && <LoadingState message="Carregando tutores..." />}

      {!loading && !error && !isQueryTooShort && data.length === 0 && (
        <EmptyState
          title="Nenhum tutor encontrado"
          description={debouncedQuery ? `Sem resultados para "${debouncedQuery}"` : 'Cadastre o primeiro tutor.'}
          action={
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              Criar Tutor
            </Button>
          }
        />
      )}

      {!loading && !error && !isQueryTooShort && data.length > 0 && (
        <ContentSection>
          {data.map((owner) => (
            <Link
              key={owner.id}
              href={`/owners/${owner.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
              aria-label={`Abrir tutor ${owner.fullName}`}
            >
              <Card
                style={{
                  padding: px(16),
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s'
                }}
                tabIndex={0}
              >
                <div
                  style={{
                    ...row(16),
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: px(16),
                        fontWeight: 600,
                        margin: 0,
                        color: theme.colors.textPrimary
                      }}
                    >
                      {owner.fullName}
                    </h3>
                    <div
                      style={{
                        ...row(16),
                        marginTop: px(4),
                        color: theme.colors.textSecondary,
                        fontSize: px(14)
                      }}
                    >
                      {owner.document && <span>{owner.document}</span>}
                      {owner.phoneMain && <span>{owner.phoneMain}</span>}
                      {owner.email && <span>{owner.email}</span>}
                    </div>
                  </div>
                  <span style={{ color: theme.colors.textSecondary, fontSize: px(13), fontWeight: 600 }}>
                    Abrir &gt;
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </ContentSection>
      )}

      <ClientCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newId) => router.push(`/owners/${newId}`)}
      />
    </ListPageLayout>
  );
}

export default function OwnersListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
      <OwnersListContent />
    </Suspense>
  );
}

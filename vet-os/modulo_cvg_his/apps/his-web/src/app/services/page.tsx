'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiError, createService, listServices, type CatalogCreateInput, type CatalogRecord, updateService } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection, Pagination } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { CatalogItemModal } from '@/components/catalog/CatalogItemModal';
import { px, row, theme } from '@/lib/theme';

export default function ServicesPage() {
  const [data, setData] = useState<CatalogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogRecord | null>(null);
  const pageSize = 10;
  const minQueryLength = 2;
  const isQueryTooShort = query.length > 0 && query.length < minQueryLength;

  useEffect(() => {
    if (isQueryTooShort) return;

    const handler = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);

    return () => window.clearTimeout(handler);
  }, [query, isQueryTooShort]);

  const fetchData = useCallback(async (searchQuery: string, pageNum: number, includeInactive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await listServices({
        q: searchQuery || undefined,
        page: pageNum,
        pageSize,
        active: includeInactive ? undefined : true
      });
      setData(response.data);
      setTotal(response.total);
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
    fetchData(debouncedQuery, page, showInactive);
  }, [debouncedQuery, page, showInactive, fetchData]);

  const totalPages = Math.ceil(total / pageSize);
  const titleSuffix = useMemo(() => (showInactive ? 'ativos e inativos' : 'ativos'), [showInactive]);

  const handleCreate = async (payload: CatalogCreateInput) => {
    const created = await createService(payload);
    await fetchData(debouncedQuery, 1, showInactive);
    setPage(1);
    return created;
  };

  const handleUpdate = async (payload: CatalogCreateInput) => {
    if (!editingItem) throw new Error('Item não selecionado para edição');
    const updated = await updateService(editingItem.id, payload);
    await fetchData(debouncedQuery, page, showInactive);
    return updated;
  };

  return (
    <ListPageLayout>
      <PageHeader
        title="Serviços"
        description={`Catálogo operacional de serviços (${titleSuffix})`}
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}>Novo Serviço</Button>}
      />

      <Card style={{ padding: px(16), display: 'flex', flexDirection: 'column', gap: px(12) }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nome, código ou descrição..."
          minQueryLength={minQueryLength}
          showMinLengthHint
          aria-label="Buscar serviços"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: px(8), color: theme.colors.textSecondary }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar itens inativos
        </label>
      </Card>

      {error && (
        <ErrorBanner
          title="Erro ao carregar serviços"
          message={error.message}
          requestId={error.requestId}
          onRetry={() => fetchData(debouncedQuery, page, showInactive)}
        />
      )}

      {isQueryTooShort && !loading && (
        <div style={{ padding: px(24), textAlign: 'center', color: theme.colors.textSecondary }}>
          <p>Digite pelo menos {minQueryLength} caracteres para buscar.</p>
        </div>
      )}

      {loading && !error && <LoadingState message="Carregando serviços..." />}

      {!loading && !error && !isQueryTooShort && data.length === 0 && (
        <EmptyState
          title="Nenhum serviço encontrado"
          description={debouncedQuery ? `Sem resultados para "${debouncedQuery}"` : 'Cadastre o primeiro serviço do catálogo.'}
          action={<Button variant="primary" onClick={() => setCreateOpen(true)}>Criar Serviço</Button>}
        />
      )}

      {!loading && !error && !isQueryTooShort && data.length > 0 && (
        <ContentSection>
          {data.map((item) => (
            <Card key={item.id} style={{ padding: px(16) }}>
              <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...row(8), alignItems: 'center' }}>
                    <h3 style={{ fontSize: px(16), fontWeight: 600, margin: 0, color: theme.colors.textPrimary }}>
                      {item.name}
                    </h3>
                    <span style={{
                      fontSize: px(12),
                      borderRadius: px(999),
                      padding: `${px(4)} ${px(8)}`,
                      background: item.active ? theme.colors.successBg : theme.colors.warningBg,
                      color: item.active ? theme.colors.success : theme.colors.warning
                    }}>
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div style={{ ...row(16), marginTop: px(6), color: theme.colors.textSecondary, fontSize: px(14), flexWrap: 'wrap' }}>
                    {item.code && <span>Código: {item.code}</span>}
                    <span>Preço base: R$ {Number(item.basePrice).toFixed(2)}</span>
                  </div>
                  {item.description && (
                    <p style={{ margin: `${px(8)} 0 0`, color: theme.colors.textSecondary, fontSize: px(14) }}>
                      {item.description}
                    </p>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setEditingItem(item)}>
                  Editar
                </Button>
              </div>
            </Card>
          ))}

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </ContentSection>
      )}

      <CatalogItemModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        kind="service"
        onSubmit={handleCreate}
      />

      <CatalogItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        kind="service"
        item={editingItem}
        onSubmit={handleUpdate}
      />
    </ListPageLayout>
  );
}

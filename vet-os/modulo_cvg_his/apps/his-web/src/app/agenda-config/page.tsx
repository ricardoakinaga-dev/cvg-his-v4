'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  listTypeConfigs,
  createTypeConfig,
  updateTypeConfig,
  type TypeConfigRecord,
  type TypeConfigCreateInput
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection, Pagination } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { px, row, theme } from '@/lib/theme';

export default function AgendaConfigPage() {
  const [data, setData] = useState<TypeConfigRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TypeConfigRecord | null>(null);
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
      const response = await listTypeConfigs({
        q: searchQuery || undefined,
        page: pageNum,
        pageSize,
        active: includeInactive ? undefined : true
      });
      setData(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro desconhecido', 500, null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(debouncedQuery, page, showInactive);
  }, [debouncedQuery, page, showInactive, fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await createTypeConfig({
        code: form.get('code') as string,
        name: form.get('name') as string,
        description: form.get('description') as string || undefined,
        defaultDurationMinutes: parseInt(form.get('defaultDurationMinutes') as string) || 30,
        color: form.get('color') as string || undefined,
        active: true
      });
      setCreateOpen(false);
      await fetchData(debouncedQuery, 1, showInactive);
      setPage(1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao criar tipo');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const form = new FormData(e.currentTarget);
    try {
      await updateTypeConfig(editingItem.id, {
        name: form.get('name') as string,
        description: form.get('description') as string || undefined,
        defaultDurationMinutes: parseInt(form.get('defaultDurationMinutes') as string) || 30,
        color: form.get('color') as string || undefined
      });
      setEditingItem(null);
      await fetchData(debouncedQuery, page, showInactive);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao atualizar tipo');
    }
  };

  return (
    <ListPageLayout>
      <PageHeader
        title="Configuração de Agenda"
        description="Tipos de agendamento e configurações"
        actions={<Button variant="primary" onClick={() => setCreateOpen(true)}>Novo Tipo</Button>}
      />

      <Card style={{ padding: px(16), display: 'flex', flexDirection: 'column', gap: px(12) }}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nome ou código..."
          minQueryLength={minQueryLength}
          showMinLengthHint
          aria-label="Buscar tipos"
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: px(8), color: theme.colors.textSecondary }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Mostrar tipos inativos
        </label>
      </Card>

      {error && (
        <ErrorBanner
          title="Erro ao carregar tipos"
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

      {loading && !error && <LoadingState message="Carregando tipos..." />}

      {!loading && !error && !isQueryTooShort && data.length === 0 && (
        <EmptyState
          title="Nenhum tipo encontrado"
          description={debouncedQuery ? `Sem resultados para "${debouncedQuery}"` : 'Cadastre o primeiro tipo de agendamento.'}
          action={<Button variant="primary" onClick={() => setCreateOpen(true)}>Criar Tipo</Button>}
        />
      )}

      {!loading && !error && !isQueryTooShort && data.length > 0 && (
        <ContentSection>
          {data.map((item) => (
            <Card key={item.id} style={{ padding: px(16) }}>
              <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...row(8), alignItems: 'center' }}>
                    {item.color && (
                      <span style={{
                        width: px(12),
                        height: px(12),
                        borderRadius: '50%',
                        background: item.color,
                        display: 'inline-block'
                      }} />
                    )}
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
                    <span>Duração padrão: {item.defaultDurationMinutes} min</span>
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

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Novo Tipo de Agendamento">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
          <Input name="code" placeholder="Código (opcional)" />
          <Input name="name" placeholder="Nome do tipo" required />
          <Input name="description" placeholder="Descrição (opcional)" />
          <Input name="defaultDurationMinutes" type="number" placeholder="Duração padrão (minutos)" defaultValue="30" min="5" max="480" required />
          <div style={{ ...row(8), alignItems: 'center' }}>
            <label style={{ fontSize: px(14), color: theme.colors.textSecondary }}>Cor:</label>
            <Input name="color" type="color" defaultValue="#4CAF50" style={{ width: px(60), padding: px(4) }} />
          </div>
          <div style={{ ...row(8), justifyContent: 'flex-end' }}>
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Editar Tipo de Agendamento">
        {editingItem && (
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
            <Input name="name" placeholder="Nome do tipo" defaultValue={editingItem.name} required />
            <Input name="description" placeholder="Descrição (opcional)" defaultValue={editingItem.description || ''} />
            <Input name="defaultDurationMinutes" type="number" placeholder="Duração padrão (minutos)" defaultValue={String(editingItem.defaultDurationMinutes)} min="5" max="480" required />
            <div style={{ ...row(8), alignItems: 'center' }}>
              <label style={{ fontSize: px(14), color: theme.colors.textSecondary }}>Cor:</label>
              <Input name="color" type="color" defaultValue={editingItem.color || '#4CAF50'} style={{ width: px(60), padding: px(4) }} />
            </div>
            <div style={{ ...row(8), justifyContent: 'flex-end' }}>
              <Button variant="secondary" type="button" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button variant="primary" type="submit">Salvar</Button>
            </div>
          </form>
        )}
      </Modal>
    </ListPageLayout>
  );
}

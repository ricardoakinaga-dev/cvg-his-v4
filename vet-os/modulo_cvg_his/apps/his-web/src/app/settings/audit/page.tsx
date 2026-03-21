'use client';

import { useCallback, useEffect, useState } from 'react';

import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ContentSection, ListPageLayout, PageHeader, Pagination, SearchFilterSection } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ApiError, getAuditEvents, type AuditEventRecord } from '@/lib/api';
import { px, theme } from '@/lib/theme';

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'user', label: 'Usuarios' },
  { value: 'role', label: 'Papeis' },
  { value: 'session', label: 'Sessoes' },
  { value: 'access_scope', label: 'Escopos' }
] as const;

export default function SettingsAuditPage() {
  const [entityType, setEntityType] = useState('all');
  const [entityId, setEntityId] = useState('');
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAuditEvents({
        entityType: entityType === 'all' ? undefined : entityType,
        entityId: entityId.trim() || undefined,
        page,
        pageSize
      });
      setEvents(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Falha ao carregar auditoria.', 500, null));
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, page, pageSize]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <ListPageLayout>
      <PageHeader
        title="Auditoria de acessos"
        description="Acompanhe alteracoes em usuarios, papeis, sessoes e escopos para saber quem mudou o que no modulo de IAM."
        breadcrumbs={[
          { label: 'Configurações', href: '/settings' },
          { label: 'Auditoria' }
        ]}
      />

      {error ? <ErrorBanner title="Erro ao carregar auditoria" message={error.message} requestId={error.requestId} onRetry={fetchData} /> : null}

      <SearchFilterSection>
        <Select label="Tipo da entidade" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
          {ENTITY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Input label="Entity ID" value={entityId} onChange={(e) => { setEntityId(e.target.value); setPage(1); }} placeholder="Filtrar por ID exato" />
      </SearchFilterSection>

      {loading && events.length === 0 ? <LoadingState message="Carregando eventos de auditoria..." /> : null}

      <ContentSection>
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.action}</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(10) }}>
              <MetaRow label="Quando" value={new Date(event.created_at).toLocaleString('pt-BR')} />
              <MetaRow label="Entidade" value={`${event.entity_type} / ${event.entity_id}`} />
              <MetaRow label="Request ID" value={event.request_id ?? 'Nao informado'} />
              <MetaRow label="Motivo" value={event.reason ?? 'Nao informado'} />
              <MetaRow label="Papéis do ator" value={(event.actor_roles ?? []).join(', ') || 'Nao informado'} />
              <JsonBlock title="Antes" value={event.before_json} />
              <JsonBlock title="Depois" value={event.after_json} />
            </CardBody>
          </Card>
        ))}

        {!loading && events.length === 0 ? (
          <Card>
            <CardBody>
              <p style={{ margin: 0, color: theme.colors.textSecondary }}>Nenhum evento encontrado para os filtros informados.</p>
            </CardBody>
          </Card>
        ) : null}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </ContentSection>
    </ListPageLayout>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: px(2) }}>
      <span style={{ fontSize: px(12), color: theme.colors.textSecondary, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: px(14), color: theme.colors.textPrimary }}>{value}</span>
    </div>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div style={{ display: 'grid', gap: px(6) }}>
      <strong style={{ fontSize: px(13), color: theme.colors.textPrimary }}>{title}</strong>
      <pre
        style={{
          margin: 0,
          padding: px(12),
          borderRadius: px(theme.radius.md),
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          overflowX: 'auto',
          fontSize: px(12)
        }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

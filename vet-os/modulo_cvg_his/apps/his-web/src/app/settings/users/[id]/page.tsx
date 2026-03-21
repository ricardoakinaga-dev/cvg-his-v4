'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Can } from '@/components/auth/Can';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ContentSection, ListPageLayout, PageHeader } from '@/components/ui/PageHeader';
import {
  ApiError,
  createAdminScope,
  listAdminScopes,
  replaceAdminUserScopes,
  type AdminAccessScope,
  type AdminRoleSummary,
  type AdminSessionRecord,
  type AdminUserDetail,
  getAdminUser,
  listAdminRoles,
  listAdminUserSessions,
  replaceAdminUserRoles,
  revokeAdminSession
} from '@/lib/api';
import { PERMISSIONS, usePermission } from '@/lib/rbac';
import { px, row, theme } from '@/lib/theme';

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = String(params?.id ?? '');
  const canManageScopes = usePermission(PERMISSIONS.ACCESS_SCOPE_MANAGE);

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [roles, setRoles] = useState<AdminRoleSummary[]>([]);
  const [availableScopes, setAvailableScopes] = useState<AdminAccessScope[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRecord[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedScopeIds, setSelectedScopeIds] = useState<string[]>([]);
  const [scopeExpiresAt, setScopeExpiresAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRoles, setSavingRoles] = useState(false);
  const [savingScopes, setSavingScopes] = useState(false);
  const [creatingScope, setCreatingScope] = useState(false);
  const [newScope, setNewScope] = useState({ scopeType: '', scopeKey: '', name: '', description: '' });
  const [error, setError] = useState<ApiError | null>(null);

  const activeSessions = useMemo(() => sessions.filter((session) => !session.revoked_at), [sessions]);

  const fetchData = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [userResponse, rolesResponse, sessionsResponse, scopesResponse] = await Promise.all([
        getAdminUser(userId),
        listAdminRoles(),
        listAdminUserSessions(userId),
        listAdminScopes()
      ]);

      setUser(userResponse);
      setRoles(rolesResponse.data);
      setSessions(sessionsResponse.data);
      setAvailableScopes(scopesResponse.data);
      setSelectedRoleIds(userResponse.roles.map((role) => role.id));
      setSelectedScopeIds(userResponse.scopes.map((scope) => scope.id));
      setScopeExpiresAt(userResponse.scopes[0]?.expiresAt ? userResponse.scopes[0].expiresAt.slice(0, 16) : '');
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Falha ao carregar detalhe do usuário.', 500, null));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleSaveRoles() {
    if (!user) {
      return;
    }

    setSavingRoles(true);
    try {
      await replaceAdminUserRoles(user.id, selectedRoleIds);
      await fetchData();
    } finally {
      setSavingRoles(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    await revokeAdminSession(sessionId);
    await fetchData();
  }

  async function handleSaveScopes() {
    if (!user) {
      return;
    }

    setSavingScopes(true);
    try {
      await replaceAdminUserScopes(user.id, selectedScopeIds, scopeExpiresAt ? new Date(scopeExpiresAt).toISOString() : null);
      await fetchData();
    } finally {
      setSavingScopes(false);
    }
  }

  async function handleCreateScope() {
    if (!newScope.scopeType.trim() || !newScope.scopeKey.trim() || !newScope.name.trim()) {
      return;
    }

    setCreatingScope(true);
    try {
      await createAdminScope({
        scopeType: newScope.scopeType.trim(),
        scopeKey: newScope.scopeKey.trim(),
        name: newScope.name.trim(),
        description: newScope.description.trim() || null
      });
      setNewScope({ scopeType: '', scopeKey: '', name: '', description: '' });
      await fetchData();
    } finally {
      setCreatingScope(false);
    }
  }

  if (loading && !user) {
    return <LoadingState message="Carregando detalhe do usuário..." />;
  }

  if (!user) {
    return (
      <ListPageLayout>
        <ErrorBanner title="Usuário não encontrado" message="Não foi possível carregar o registro solicitado." />
      </ListPageLayout>
    );
  }

  return (
    <ListPageLayout>
      <PageHeader
        title={user.full_name}
        description="Visão administrativa de identidade, vínculos de papéis, escopos e sessões."
        breadcrumbs={[
          { label: 'Configurações' },
          { label: 'Usuários', href: '/settings/users' },
          { label: user.full_name }
        ]}
        actions={
          <Link href="/settings/users" style={linkButtonStyle}>
            Voltar
          </Link>
        }
      />

      {error ? <ErrorBanner title="Erro ao carregar detalhe" message={error.message} requestId={error.requestId} onRetry={fetchData} /> : null}

      <ContentSection style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)', gap: px(16) }}>
        <div style={{ display: 'grid', gap: px(16) }}>
          <Card>
            <CardHeader>
              <CardTitle>Identidade</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(10) }}>
              <DetailRow label="E-mail" value={user.email} />
              <DetailRow label="Username" value={user.username ?? 'Não definido'} />
              <DetailRow label="Status" value={user.is_active ? 'Ativo' : 'Inativo'} />
              <DetailRow label="Troca de senha" value={user.must_change_password ? 'Obrigatória' : 'Não pendente'} />
              <DetailRow label="Unit ID" value={user.unit_id ?? 'Sem unidade'} />
              <DetailRow label="Último login" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : 'Sem login'} />
              <DetailRow label="Tentativas falhas" value={String(user.failed_login_attempts)} />
              <DetailRow label="Bloqueado até" value={user.locked_until ? new Date(user.locked_until).toLocaleString('pt-BR') : 'Sem bloqueio'} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escopos atribuídos</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(10) }}>
              {user.scopes.length === 0 ? (
                <p style={mutedTextStyle}>Nenhum escopo específico atribuído nesta fase.</p>
              ) : (
                user.scopes.map((scope) => (
                  <div key={scope.id} style={scopeCardStyle}>
                    <strong>{scope.name}</strong>
                    <span style={mutedTextStyle}>{scope.scopeType} • {scope.scopeKey}</span>
                    <span style={mutedTextStyle}>
                      Expira em: {scope.expiresAt ? new Date(scope.expiresAt).toLocaleString('pt-BR') : 'sem expiração'}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessões</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(12) }}>
              <p style={mutedTextStyle}>
                Sessões ativas: <strong>{activeSessions.length}</strong> de {sessions.length} registradas.
              </p>
              {sessions.length === 0 ? (
                <p style={mutedTextStyle}>Nenhuma sessão registrada para este usuário.</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} style={sessionCardStyle}>
                    <div style={{ display: 'grid', gap: px(4) }}>
                      <strong>{session.auth_method}</strong>
                      <span style={mutedTextStyle}>Emitida em {new Date(session.issued_at).toLocaleString('pt-BR')}</span>
                      <span style={mutedTextStyle}>Último uso: {session.last_seen_at ? new Date(session.last_seen_at).toLocaleString('pt-BR') : 'sem atividade'}</span>
                      <span style={mutedTextStyle}>IP: {session.ip_address ?? 'não informado'}</span>
                      <span style={mutedTextStyle}>
                        Estado: {session.revoked_at ? `revogada em ${new Date(session.revoked_at).toLocaleString('pt-BR')}` : 'ativa'}
                      </span>
                    </div>
                    {!session.revoked_at ? (
                      <Can permission={PERMISSIONS.SESSIONS_REVOKE}>
                        <Button variant="danger" onClick={() => void handleRevokeSession(session.id)}>
                          Revogar
                        </Button>
                      </Can>
                    ) : null}
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: px(16) }}>
          <Card>
            <CardHeader>
              <CardTitle>Papéis atribuídos</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(12) }}>
              <p style={mutedTextStyle}>Mudanças de papéis são auditadas e protegidas contra autoelevação indevida no backend.</p>
              <div style={rolesListStyle}>
                {roles.map((role) => {
                  const checked = selectedRoleIds.includes(role.id);
                  return (
                    <label key={role.id} style={checkboxRowStyle}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedRoleIds((current) => (
                            e.target.checked
                              ? [...current, role.id]
                              : current.filter((value) => value !== role.id)
                          ));
                        }}
                      />
                      <span>{role.name}</span>
                    </label>
                  );
                })}
              </div>
              <Can permission={PERMISSIONS.USERS_UPDATE}>
                <Button onClick={() => void handleSaveRoles()} isLoading={savingRoles}>
                  Salvar papéis
                </Button>
              </Can>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escopos de acesso</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(12) }}>
              <p style={mutedTextStyle}>
                Use escopos para limitar visibilidade por unidade, setor ou contexto operacional. A atribuicao e auditada no backend.
              </p>

              {availableScopes.length === 0 ? (
                <p style={mutedTextStyle}>Nenhum escopo cadastrado ainda.</p>
              ) : (
                <div style={rolesListStyle}>
                  {availableScopes.map((scope) => {
                    const checked = selectedScopeIds.includes(scope.id);
                    return (
                      <label key={scope.id} style={checkboxRowStyle}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            setSelectedScopeIds((current) => (
                              e.target.checked
                                ? [...current, scope.id]
                                : current.filter((value) => value !== scope.id)
                            ));
                          }}
                        />
                        <span>{scope.name}</span>
                        <span style={mutedTextStyle}>{scope.scopeType} / {scope.scopeKey}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              <Input
                label="Expira em"
                type="datetime-local"
                value={scopeExpiresAt}
                onChange={(e) => setScopeExpiresAt(e.target.value)}
                helperText="Opcional. Se informado, todos os escopos selecionados serao atribuidos com a mesma expiracao."
              />

              <Can permission={PERMISSIONS.ACCESS_SCOPE_MANAGE}>
                <Button onClick={() => void handleSaveScopes()} isLoading={savingScopes}>
                  Salvar escopos
                </Button>
              </Can>

              {canManageScopes ? (
                <div style={{ display: 'grid', gap: px(10), padding: px(16), border: `1px solid ${theme.colors.border}`, borderRadius: px(theme.radius.md) }}>
                  <strong style={{ fontSize: px(14), color: theme.colors.textPrimary }}>Cadastrar novo escopo</strong>
                  <Input label="Tipo" value={newScope.scopeType} onChange={(e) => setNewScope((current) => ({ ...current, scopeType: e.target.value }))} placeholder="unit, ward, setor..." />
                  <Input label="Chave" value={newScope.scopeKey} onChange={(e) => setNewScope((current) => ({ ...current, scopeKey: e.target.value }))} placeholder="uti-01, laboratorio, recepcao..." />
                  <Input label="Nome" value={newScope.name} onChange={(e) => setNewScope((current) => ({ ...current, name: e.target.value }))} placeholder="UTI 01" />
                  <Input label="Descricao" value={newScope.description} onChange={(e) => setNewScope((current) => ({ ...current, description: e.target.value }))} placeholder="Descricao opcional do escopo" />
                  <Button onClick={() => void handleCreateScope()} isLoading={creatingScope}>
                    Criar escopo
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </ContentSection>
    </ListPageLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'grid', gap: px(2) }}>
      <span style={{ fontSize: px(12), color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: px(14), color: theme.colors.textPrimary }}>{value}</span>
    </div>
  );
}

const mutedTextStyle = {
  margin: 0,
  fontSize: px(13),
  color: theme.colors.textSecondary
};

const checkboxRowStyle = {
  display: 'flex',
  gap: px(8),
  alignItems: 'center',
  fontSize: px(14),
  color: theme.colors.textPrimary
};

const rolesListStyle = {
  display: 'grid',
  gap: px(8),
  padding: px(16),
  border: `1px solid ${theme.colors.border}`,
  borderRadius: px(theme.radius.md)
};

const sessionCardStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: px(12),
  alignItems: 'flex-start',
  padding: px(16),
  border: `1px solid ${theme.colors.border}`,
  borderRadius: px(theme.radius.md),
  background: theme.colors.surface
};

const scopeCardStyle = {
  display: 'grid',
  gap: px(4),
  padding: px(14),
  border: `1px solid ${theme.colors.border}`,
  borderRadius: px(theme.radius.md),
  background: theme.colors.surface
};

const linkButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: px(40),
  padding: `0 ${px(14)}`,
  borderRadius: px(theme.radius.sm),
  border: `1px solid ${theme.colors.border}`,
  color: theme.colors.textPrimary,
  textDecoration: 'none',
  fontSize: px(14),
  fontWeight: 600,
  background: theme.colors.surface
};

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Can } from '@/components/auth/Can';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { ContentSection, ListPageLayout, PageHeader, Pagination, SearchFilterSection } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import {
  ApiError,
  type AdminCreateUserInput,
  type AdminRoleSummary,
  type AdminUpdateUserInput,
  type AdminUserSummary,
  createAdminUser,
  listAdminRoles,
  listAdminUsers,
  replaceAdminUserRoles,
  resetAdminUserPassword,
  updateAdminUser
} from '@/lib/api';
import { PERMISSIONS, usePermission } from '@/lib/rbac';
import { px, row, theme } from '@/lib/theme';

type UserModalState = {
  mode: 'create' | 'edit';
  user: AdminUserSummary | null;
};

type UserFormState = {
  email: string;
  username: string;
  fullName: string;
  unitId: string;
  password: string;
  mustChangePassword: boolean;
  isActive: boolean;
  roleIds: string[];
};

function buildInitialForm(roles: AdminRoleSummary[], user?: AdminUserSummary | null): UserFormState {
  return {
    email: user?.email ?? '',
    username: user?.username ?? '',
    fullName: user?.full_name ?? '',
    unitId: user?.unit_id ?? '',
    password: '',
    mustChangePassword: user?.must_change_password ?? true,
    isActive: user?.is_active ?? true,
    roleIds: user?.roles.map((role) => role.id) ?? roles.slice(0, 1).map((role) => role.id)
  };
}

function UserFormModal({
  state,
  roles,
  onClose,
  onSubmit
}: {
  state: UserModalState;
  roles: AdminRoleSummary[];
  onClose: () => void;
  onSubmit: (payload: UserFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<UserFormState>(() => buildInitialForm(roles, state.user));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(buildInitialForm(roles, state.user));
    setError(null);
  }, [roles, state]);

  const title = state.mode === 'create' ? 'Novo usuário' : 'Editar usuário';

  async function handleSubmit() {
    if (!form.email || !form.fullName || form.roleIds.length === 0) {
      setError('Preencha e-mail, nome e ao menos um papel.');
      return;
    }

    if (state.mode === 'create' && form.password.length < 8) {
      setError('A senha inicial precisa ter ao menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar usuário.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <Card style={{ width: 'min(760px, 96vw)', maxHeight: '92vh', overflow: 'auto' }}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardBody style={{ display: 'grid', gap: px(16) }}>
          {error ? <ErrorBanner title="Falha ao salvar" message={error} /> : null}
          <div style={twoColumnGrid}>
            <Input label="E-mail" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            <Input label="Username" value={form.username} onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))} />
            <Input label="Nome completo" value={form.fullName} onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))} />
            <Input label="Unit ID" value={form.unitId} onChange={(e) => setForm((current) => ({ ...current, unitId: e.target.value }))} helperText="Opcional. Use UUID da unidade quando aplicável." />
          </div>
          {state.mode === 'create' ? (
            <Input
              label="Senha inicial"
              type="password"
              value={form.password}
              onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
              helperText="A conta pode ser criada exigindo troca no primeiro acesso."
            />
          ) : null}
          <div style={checkboxPanelStyle}>
            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={form.mustChangePassword}
                onChange={(e) => setForm((current) => ({ ...current, mustChangePassword: e.target.checked }))}
              />
              Exigir troca de senha
            </label>
            {state.mode === 'edit' ? (
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))}
                />
                Usuário ativo
              </label>
            ) : null}
          </div>
          <div style={checkboxPanelStyle}>
            <strong style={{ fontSize: px(14) }}>Papéis atribuídos</strong>
            <div style={rolesGridStyle}>
              {roles.map((role) => {
                const checked = form.roleIds.includes(role.id);
                return (
                  <label key={role.id} style={checkboxRowStyle}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setForm((current) => ({
                          ...current,
                          roleIds: e.target.checked
                            ? [...current.roleIds, role.id]
                            : current.roleIds.filter((value) => value !== role.id)
                        }));
                      }}
                    />
                    {role.name}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ ...row(12), justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} isLoading={submitting}>
              {state.mode === 'create' ? 'Criar usuário' : 'Salvar alterações'}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ResetPasswordModal({
  user,
  onClose,
  onSubmit
}: {
  user: AdminUserSummary;
  onClose: () => void;
  onSubmit: (password: string, mustChangePassword: boolean) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (password.length < 8) {
      setError('A nova senha precisa ter ao menos 8 caracteres.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(password, mustChangePassword);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao redefinir senha.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={overlayStyle}>
      <Card style={{ width: 'min(560px, 96vw)' }}>
        <CardHeader>
          <CardTitle>Resetar senha</CardTitle>
        </CardHeader>
        <CardBody style={{ display: 'grid', gap: px(16) }}>
          <p style={mutedTextStyle}>
            A conta de <strong>{user.full_name}</strong> receberá nova senha administrativa. Esse fluxo é auditado no backend.
          </p>
          {error ? <ErrorBanner title="Falha ao redefinir" message={error} /> : null}
          <Input label="Nova senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label style={checkboxRowStyle}>
            <input type="checkbox" checked={mustChangePassword} onChange={(e) => setMustChangePassword(e.target.checked)} />
            Exigir troca da senha no próximo login
          </label>
          <div style={{ ...row(12), justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} isLoading={submitting}>Confirmar reset</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function AdminUsersPage() {
  const canCreateUsers = usePermission(PERMISSIONS.USERS_CREATE);
  const canUpdateUsers = usePermission(PERMISSIONS.USERS_UPDATE);

  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [roles, setRoles] = useState<AdminRoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [modalState, setModalState] = useState<UserModalState | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserSummary | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        listAdminUsers({
          page,
          pageSize,
          search: search || undefined,
          active: activeFilter === 'all' ? undefined : activeFilter === 'active'
        }),
        listAdminRoles()
      ]);

      setUsers(usersResponse.data);
      setTotal(usersResponse.total);
      setRoles(rolesResponse.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Falha ao carregar usuários administrativos.', 500, null));
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, pageSize, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleSubmitUser(form: UserFormState) {
    if (modalState?.mode === 'create') {
      const payload: AdminCreateUserInput = {
        email: form.email,
        username: form.username || undefined,
        fullName: form.fullName,
        unitId: form.unitId || undefined,
        password: form.password,
        mustChangePassword: form.mustChangePassword,
        roleIds: form.roleIds
      };
      await createAdminUser(payload);
    } else if (modalState?.user) {
      const payload: AdminUpdateUserInput = {
        email: form.email,
        username: form.username || null,
        fullName: form.fullName,
        unitId: form.unitId || null,
        isActive: form.isActive,
        mustChangePassword: form.mustChangePassword
      };
      await updateAdminUser(modalState.user.id, payload);
      await replaceAdminUserRoles(modalState.user.id, form.roleIds);
    }

    await fetchData();
  }

  async function handleToggleStatus(user: AdminUserSummary) {
    await updateAdminUser(user.id, { isActive: !user.is_active });
    await fetchData();
  }

  async function handleResetPassword(password: string, mustChangePassword: boolean) {
    if (!resetTarget) {
      return;
    }

    await resetAdminUserPassword(resetTarget.id, { password, mustChangePassword });
    await fetchData();
  }

  if (loading && users.length === 0 && roles.length === 0) {
    return <LoadingState message="Carregando administração de usuários..." />;
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Gestão de usuários"
        description="CRUD administrativo de identidade, ativação, papéis e reset seguro de senha."
        actions={
          canCreateUsers ? (
            <Button onClick={() => setModalState({ mode: 'create', user: null })}>Novo usuário</Button>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'Configurações' },
          { label: 'Usuários' }
        ]}
      />

      {error ? <ErrorBanner title="Erro ao carregar usuários" message={error.message} requestId={error.requestId} onRetry={fetchData} /> : null}

      <SearchFilterSection>
        <Input
          label="Buscar"
          placeholder="Nome, e-mail ou username"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          label="Status"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value as 'all' | 'active' | 'inactive');
            setPage(1);
          }}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </Select>
      </SearchFilterSection>

      <ContentSection>
        {users.length === 0 ? (
          <Card>
            <CardBody>
              <p style={mutedTextStyle}>Nenhum usuário encontrado com os filtros atuais.</p>
            </CardBody>
          </Card>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardBody style={{ display: 'grid', gap: px(12) }}>
                <div style={{ ...row(12), justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: px(4) }}>
                    <div style={{ ...row(10), alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: px(16) }}>{user.full_name}</strong>
                      <span style={pillStyle(user.is_active ? '#dcfce7' : '#fee2e2', user.is_active ? '#166534' : '#991b1b')}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                      {user.must_change_password ? (
                        <span style={pillStyle('#fef3c7', '#92400e')}>Troca de senha pendente</span>
                      ) : null}
                    </div>
                    <span style={mutedTextStyle}>{user.email}{user.username ? ` • @${user.username}` : ''}</span>
                    <span style={mutedTextStyle}>
                      Papéis: {user.roles.map((role) => role.name).join(', ') || 'Sem papel'}
                    </span>
                    <span style={mutedTextStyle}>
                      Último login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString('pt-BR') : 'ainda não acessou'}
                    </span>
                  </div>
                  <div style={{ ...row(8), flexWrap: 'wrap' }}>
                    <Link href={`/settings/users/${user.id}`} style={linkButtonStyle}>Detalhes</Link>
                    <Can permission={PERMISSIONS.USERS_UPDATE}>
                      <Button variant="secondary" onClick={() => setModalState({ mode: 'edit', user })}>Editar</Button>
                    </Can>
                    <Can permission={PERMISSIONS.USERS_UPDATE}>
                      <Button variant="secondary" onClick={() => setResetTarget(user)}>Resetar senha</Button>
                    </Can>
                    <Can permission={PERMISSIONS.USERS_UPDATE}>
                      <Button variant={user.is_active ? 'danger' : 'secondary'} onClick={() => void handleToggleStatus(user)}>
                        {user.is_active ? 'Desativar' : 'Reativar'}
                      </Button>
                    </Can>
                  </div>
                </div>
                {user.failed_login_attempts > 0 || user.locked_until ? (
                  <div style={securityNoticeStyle}>
                    Tentativas falhas: {user.failed_login_attempts}. Bloqueio até:{' '}
                    {user.locked_until ? new Date(user.locked_until).toLocaleString('pt-BR') : 'sem bloqueio atual'}.
                  </div>
                ) : null}
              </CardBody>
            </Card>
          ))
        )}
      </ContentSection>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {modalState ? (
        <UserFormModal
          state={modalState}
          roles={roles}
          onClose={() => setModalState(null)}
          onSubmit={handleSubmitUser}
        />
      ) : null}

      {resetTarget && canUpdateUsers ? (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSubmit={handleResetPassword}
        />
      ) : null}
    </ListPageLayout>
  );
}

const overlayStyle = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: px(16),
  zIndex: 1000
};

const twoColumnGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: px(16)
};

const checkboxPanelStyle = {
  display: 'grid',
  gap: px(10),
  padding: px(16),
  border: `1px solid ${theme.colors.border}`,
  borderRadius: px(theme.radius.md),
  background: theme.colors.surface
};

const rolesGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: px(8)
};

const checkboxRowStyle = {
  display: 'flex',
  gap: px(8),
  alignItems: 'center',
  fontSize: px(14),
  color: theme.colors.textPrimary
};

const mutedTextStyle = {
  margin: 0,
  fontSize: px(13),
  color: theme.colors.textSecondary
};

const securityNoticeStyle = {
  fontSize: px(13),
  color: '#7c2d12',
  background: '#fff7ed',
  border: '1px solid #fdba74',
  borderRadius: px(10),
  padding: px(12)
};

function pillStyle(background: string, color: string) {
  return {
    background,
    color,
    borderRadius: 999,
    padding: `${px(4)} ${px(10)}`,
    fontSize: px(12),
    fontWeight: 600
  };
}

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

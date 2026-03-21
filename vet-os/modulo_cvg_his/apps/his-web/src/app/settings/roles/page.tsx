'use client';

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
  type AdminPermission,
  type AdminRoleDetail,
  type AdminRoleSummary,
  createAdminRole,
  getAdminRole,
  listAdminPermissions,
  listAdminRoles,
  replaceRolePermissions,
  updateAdminRole
} from '@/lib/api';
import { PERMISSIONS, usePermission } from '@/lib/rbac';
import { px, row, theme } from '@/lib/theme';

type RoleEditorState = {
  name: string;
  description: string;
};

export default function AdminRolesPage() {
  const canCreateRole = usePermission(PERMISSIONS.ROLES_CREATE);
  const canUpdateRole = usePermission(PERMISSIONS.ROLES_UPDATE);
  const canManagePermissions = usePermission(PERMISSIONS.PERMISSIONS_MANAGE);

  const [roles, setRoles] = useState<AdminRoleSummary[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AdminRoleDetail | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [editor, setEditor] = useState<RoleEditorState>({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, AdminPermission[]>();
    for (const permission of permissions) {
      const [prefix] = permission.key.split('.');
      const key = prefix || 'system';
      const list = groups.get(key) ?? [];
      list.push(permission);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [permissions]);

  const fetchBase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesResponse, permissionsResponse] = await Promise.all([
        listAdminRoles(),
        listAdminPermissions()
      ]);
      setRoles(rolesResponse.data);
      setPermissions(permissionsResponse.data);

      const fallbackRoleId = selectedRoleId || rolesResponse.data[0]?.id || '';
      setSelectedRoleId(fallbackRoleId);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Falha ao carregar papéis.', 500, null));
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId]);

  const fetchRoleDetail = useCallback(async (roleId: string) => {
    if (!roleId) {
      setSelectedRole(null);
      setSelectedPermissionIds([]);
      setEditor({ name: '', description: '' });
      return;
    }

    const role = await getAdminRole(roleId);
    setSelectedRole(role);
    setSelectedPermissionIds(role.permissions.map((permission) => permission.id));
    setEditor({
      name: role.name,
      description: role.description ?? ''
    });
  }, []);

  useEffect(() => {
    void fetchBase();
  }, [fetchBase]);

  useEffect(() => {
    if (!selectedRoleId) {
      return;
    }

    void fetchRoleDetail(selectedRoleId).catch((err: unknown) => {
      setError(err instanceof ApiError ? err : new ApiError('Falha ao carregar detalhe do papel.', 500, null));
    });
  }, [fetchRoleDetail, selectedRoleId]);

  async function handleCreateRole() {
    const created = await createAdminRole({
      name: `perfil-${Date.now()}`,
      description: 'Novo papel administrativo criado na Fase 4.'
    });
    await fetchBase();
    setSelectedRoleId(created.id);
    await fetchRoleDetail(created.id);
  }

  async function handleSaveRole() {
    if (!selectedRole) {
      return;
    }

    setSavingRole(true);
    try {
      await updateAdminRole(selectedRole.id, {
        name: editor.name,
        description: editor.description || null
      });
      await fetchBase();
      await fetchRoleDetail(selectedRole.id);
    } finally {
      setSavingRole(false);
    }
  }

  async function handleSavePermissions() {
    if (!selectedRole) {
      return;
    }

    setSavingPermissions(true);
    try {
      await replaceRolePermissions(selectedRole.id, selectedPermissionIds);
      await fetchRoleDetail(selectedRole.id);
      await fetchBase();
    } finally {
      setSavingPermissions(false);
    }
  }

  if (loading && roles.length === 0 && permissions.length === 0) {
    return <LoadingState message="Carregando papéis e permissões..." />;
  }

  return (
    <ListPageLayout>
      <PageHeader
        title="Papéis e permissões"
        description="Matriz administrativa para CRUD de roles e manutenção auditada do catálogo de permissões."
        breadcrumbs={[
          { label: 'Configurações' },
          { label: 'Papéis e Permissões' }
        ]}
        actions={
          canCreateRole ? (
            <Button onClick={() => void handleCreateRole()}>Novo papel</Button>
          ) : undefined
        }
      />

      {error ? <ErrorBanner title="Erro ao carregar IAM" message={error.message} requestId={error.requestId} onRetry={fetchBase} /> : null}

      <ContentSection style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(0, 1.2fr)', gap: px(16) }}>
        <Card>
          <CardHeader>
            <CardTitle>Papéis disponíveis</CardTitle>
          </CardHeader>
          <CardBody style={{ display: 'grid', gap: px(10) }}>
            {roles.map((role) => {
              const selected = role.id === selectedRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${selected ? theme.colors.primary : theme.colors.border}`,
                    background: selected ? '#eff6ff' : theme.colors.surface,
                    borderRadius: px(theme.radius.md),
                    padding: px(14),
                    cursor: 'pointer',
                    display: 'grid',
                    gap: px(4)
                  }}
                >
                  <strong style={{ fontSize: px(14), color: theme.colors.textPrimary }}>{role.name}</strong>
                  <span style={mutedTextStyle}>{role.description ?? 'Sem descrição'}</span>
                  <span style={mutedTextStyle}>
                    {role.users_count} usuário(s) • {role.permissions_count} permissão(ões)
                  </span>
                </button>
              );
            })}
          </CardBody>
        </Card>

        <div style={{ display: 'grid', gap: px(16) }}>
          <Card>
            <CardHeader>
              <CardTitle>Metadados do papel</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(16) }}>
              {selectedRole ? (
                <>
                  <Input label="Nome" value={editor.name} onChange={(e) => setEditor((current) => ({ ...current, name: e.target.value }))} />
                  <div style={{ display: 'grid', gap: px(6) }}>
                    <label style={labelStyle}>Descrição</label>
                    <textarea
                      value={editor.description}
                      onChange={(e) => setEditor((current) => ({ ...current, description: e.target.value }))}
                      rows={4}
                      style={textAreaStyle}
                    />
                  </div>
                  <Can permission={PERMISSIONS.ROLES_UPDATE}>
                    <Button onClick={() => void handleSaveRole()} isLoading={savingRole || !canUpdateRole}>
                      Salvar papel
                    </Button>
                  </Can>
                </>
              ) : (
                <p style={mutedTextStyle}>Selecione um papel para editar.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de permissões</CardTitle>
            </CardHeader>
            <CardBody style={{ display: 'grid', gap: px(16) }}>
              <p style={mutedTextStyle}>
                O frontend apenas reflete a matriz; a fonte de verdade continua no backend via guards e validação de sessão.
              </p>
              {selectedRole ? (
                <>
                  {groupedPermissions.map(([group, items]) => (
                    <div key={group} style={permissionGroupStyle}>
                      <strong style={{ fontSize: px(14), textTransform: 'capitalize' }}>{group}</strong>
                      <div style={permissionGridStyle}>
                        {items.map((permission) => {
                          const checked = selectedPermissionIds.includes(permission.id);
                          return (
                            <label key={permission.id} style={checkboxRowStyle}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedPermissionIds((current) => (
                                    e.target.checked
                                      ? [...current, permission.id]
                                      : current.filter((value) => value !== permission.id)
                                  ));
                                }}
                              />
                              <span>{permission.key}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <Can permission={PERMISSIONS.PERMISSIONS_MANAGE}>
                    <Button onClick={() => void handleSavePermissions()} isLoading={savingPermissions || !canManagePermissions}>
                      Salvar permissões
                    </Button>
                  </Can>
                </>
              ) : (
                <p style={mutedTextStyle}>Nenhum papel selecionado.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </ContentSection>
    </ListPageLayout>
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

const permissionGroupStyle = {
  display: 'grid',
  gap: px(10),
  padding: px(16),
  border: `1px solid ${theme.colors.border}`,
  borderRadius: px(theme.radius.md),
  background: theme.colors.surface
};

const permissionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: px(8)
};

const labelStyle = {
  fontSize: px(14),
  fontWeight: 500,
  color: theme.colors.textPrimary
};

const textAreaStyle = {
  width: '100%',
  padding: px(12),
  borderRadius: px(theme.radius.sm),
  border: `1px solid ${theme.colors.border}`,
  fontSize: px(14),
  color: theme.colors.textPrimary,
  background: theme.colors.surface,
  resize: 'vertical' as const
};

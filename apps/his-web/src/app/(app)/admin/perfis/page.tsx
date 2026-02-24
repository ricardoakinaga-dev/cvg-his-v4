'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  updateRolePermissions,
  listPermissions,
  type Role,
  type Permission
} from '../../../../lib/api/admin';
import { usePermission } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';

function RoleFormModal({
  role,
  isOpen,
  onClose,
  onSave
}: {
  role: Role | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError(null);
  }, [role, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (role) {
        await updateRole(role.id, { name, description: description || null });
      } else {
        await createRole({ name, description: description || null });
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={role ? 'Editar Perfil' : 'Novo Perfil'}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
            Nome *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
            Descrição
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PermissionsMatrixModal({
  role,
  permissions,
  isOpen,
  onClose,
  onSave
}: {
  role: Role | null;
  permissions: Permission[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (role) {
      setSelectedPermissions(new Set(role.permissions.map((p) => p.id)));
    } else {
      setSelectedPermissions(new Set());
    }
    setError(null);
  }, [role, isOpen]);

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;

    setSaving(true);
    setError(null);

    try {
      await updateRolePermissions(role.id, Array.from(selectedPermissions));
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar permissões');
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by prefix
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const prefix = perm.key.split('.')[0];
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Permissões: ${role?.name || ''}`}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
          Selecione as permissões que este perfil deve ter:
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {Object.entries(groupedPermissions).map(([prefix, perms]) => (
            <div key={prefix} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                {prefix}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                {perms.map((perm) => (
                  <label
                    key={perm.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px',
                      background: selectedPermissions.has(perm.id) ? '#dbeafe' : '#f9fafb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.has(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500' }}>{perm.key}</div>
                      {perm.description && (
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>{perm.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {selectedPermissions.size} permissões selecionadas
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function PerfisList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions
  const canRead = usePermission('admin.roles.read');
  const canCreate = usePermission('admin.roles.create');
  const canUpdate = usePermission('admin.roles.update');
  const canDelete = usePermission('admin.roles.delete');
  const canManagePermissions = usePermission('admin.permissoes.manage');

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pageSize = 50;

  const fetchData = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [rolesResponse, permissionsData] = await Promise.all([
        listRoles({ page, pageSize }),
        listPermissions()
      ]);
      setRoles(rolesResponse.data);
      setTotal(rolesResponse.total);
      setPermissions(permissionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar perfis');
    } finally {
      setLoading(false);
    }
  }, [page, canRead]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [page, router]);

  const handleOpenFormModal = (role: Role | null) => {
    setSelectedRole(role);
    setFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setFormModalOpen(false);
    setSelectedRole(null);
  };

  const handleOpenPermissionsModal = (role: Role) => {
    setSelectedRole(role);
    setPermissionsModalOpen(true);
  };

  const handleClosePermissionsModal = () => {
    setPermissionsModalOpen(false);
    setSelectedRole(null);
  };

  const handleSave = () => {
    fetchData();
  };

  const handleDelete = async (role: Role) => {
    if (!canDelete) return;

    if (!confirm(`Tem certeza que deseja excluir o perfil "${role.name}"?`)) return;

    setDeleting(role.id);
    try {
      await deleteRole(role.id);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir perfil');
    } finally {
      setDeleting(null);
    }
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar perfis.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Perfis de Acesso</h1>
        {canCreate && (
          <Button onClick={() => handleOpenFormModal(null)}>Novo Perfil</Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Carregando...
            </div>
          ) : roles.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Nenhum perfil encontrado.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Nome
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Descrição
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Permissões
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Criado em
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500' }}>
                      {role.name}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {role.description || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        {role.permissions.length} permissões
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {formatDate(role.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {canManagePermissions && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenPermissionsModal(role)}
                          >
                            Permissões
                          </Button>
                        )}
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenFormModal(role)}
                          >
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(role)}
                            disabled={deleting === role.id}
                          >
                            {deleting === role.id ? '...' : 'Excluir'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span style={{ padding: '8px 16px', color: '#6b7280' }}>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Modals */}
      <RoleFormModal
        role={selectedRole}
        isOpen={formModalOpen}
        onClose={handleCloseFormModal}
        onSave={handleSave}
      />
      <PermissionsMatrixModal
        role={selectedRole}
        permissions={permissions}
        isOpen={permissionsModalOpen}
        onClose={handleClosePermissionsModal}
        onSave={handleSave}
      />
    </div>
  );
}

export default function PerfisPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Carregando...</div>}>
      <PerfisList />
    </Suspense>
  );
}

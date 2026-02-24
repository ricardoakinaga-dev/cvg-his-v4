'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listUsers,
  createUser,
  updateUser,
  disableUser,
  enableUser,
  updateUserRoles,
  type User
} from '../../../../lib/api/admin';
import { listRoles, type Role } from '../../../../lib/api/admin';
import { usePermission } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';

function UserFormModal({
  user,
  roles,
  isOpen,
  onClose,
  onSave
}: {
  user: User | null;
  roles: Role[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setFullName(user.fullName);
      setSelectedRoles(user.roles.map((r) => r.id));
    } else {
      setEmail('');
      setFullName('');
      setPassword('');
      setSelectedRoles([]);
    }
    setError(null);
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (user) {
        await updateUser(user.id, {
          fullName,
          roleIds: selectedRoles
        });
      } else {
        if (!password) {
          throw new Error('Senha é obrigatória para novos usuários');
        }
        await createUser({
          email,
          fullName,
          password,
          roleIds: selectedRoles
        });
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? 'Editar Usuário' : 'Novo Usuário'}>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!user}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: user ? '#f3f4f6' : 'white'
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
            Nome Completo *
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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

        {!user && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
              Senha *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!user}
              minLength={8}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
            Perfis
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {roles.map((role) => (
              <label
                key={role.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: selectedRoles.includes(role.id) ? '#dbeafe' : '#f3f4f6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  style={{ margin: 0 }}
                />
                {role.name}
              </label>
            ))}
          </div>
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

function UsuariosList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Permissions
  const canRead = usePermission('admin.usuarios.read');
  const canCreate = usePermission('admin.usuarios.create');
  const canUpdate = usePermission('admin.usuarios.update');
  const canDisable = usePermission('admin.usuarios.disable');

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [includeInactive, setIncludeInactive] = useState(searchParams.get('includeInactive') === 'true');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        listUsers({
          q: searchQuery || undefined,
          page,
          pageSize,
          includeInactive
        }),
        listRoles({ pageSize: 100 })
      ]);
      setUsers(usersResponse.data);
      setTotal(usersResponse.total);
      setRoles(rolesResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, includeInactive, canRead]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (includeInactive) params.set('includeInactive', 'true');
    if (page > 1) params.set('page', String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchQuery, includeInactive, page, router]);

  const handleOpenModal = (user: User | null) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const handleSave = () => {
    fetchData();
  };

  const handleToggleActive = async (user: User) => {
    if (!canDisable) return;

    const action = user.isActive ? 'desativar' : 'ativar';
    if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

    setActionLoading(user.id);
    try {
      if (user.isActive) {
        await disableUser(user.id);
      } else {
        await enableUser(user.id);
      }
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Erro ao ${action} usuário`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar usuários.
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Usuários</h1>
        {canCreate && (
          <Button onClick={() => handleOpenModal(null)}>Novo Usuário</Button>
        )}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardBody>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Buscar
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Email ou nome..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => {
                  setIncludeInactive(e.target.checked);
                  setPage(1);
                }}
              />
              Incluir inativos
            </label>
          </div>
        </CardBody>
      </Card>

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
          ) : users.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Nenhum usuário encontrado.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Nome
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Email
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Perfis
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase' }}>
                    Status
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
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      {user.fullName}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {user.roles.map((role) => (
                          <span
                            key={role.id}
                            style={{
                              padding: '2px 8px',
                              background: '#dbeafe',
                              color: '#1e40af',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          background: user.isActive ? '#dcfce7' : '#fef2f2',
                          color: user.isActive ? '#166534' : '#dc2626',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {canUpdate && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenModal(user)}
                          >
                            Editar
                          </Button>
                        )}
                        {canDisable && (
                          <Button
                            size="sm"
                            variant={user.isActive ? 'danger' : 'secondary'}
                            onClick={() => handleToggleActive(user)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? '...' : user.isActive ? 'Desativar' : 'Ativar'}
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

      {/* Modal */}
      <UserFormModal
        user={selectedUser}
        roles={roles}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Carregando...</div>}>
      <UsuariosList />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  listPermissions,
  listRoles,
  updateRolePermissions,
  type Permission,
  type Role
} from '../../../../lib/api/admin';
import { usePermission } from '../../../../lib/rbac';
import { Card, CardBody } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

function PermissoesMatrix() {
  // Permissions
  const canRead = usePermission('admin.permissoes.read');
  const canManage = usePermission('admin.permissoes.manage');

  // State
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // roleId being saved
  const [matrixChanges, setMatrixChanges] = useState<Record<string, Set<string>>>({}); // roleId -> permissionIds

  const fetchData = async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [permissionsData, rolesResponse] = await Promise.all([
        listPermissions(),
        listRoles({ pageSize: 100 })
      ]);
      setPermissions(permissionsData);
      setRoles(rolesResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [canRead]);

  // Get current permission state for a role (original + changes)
  const getPermissionState = (roleId: string, permissionId: string): boolean => {
    // Check if there are pending changes
    if (matrixChanges[roleId]) {
      return matrixChanges[roleId].has(permissionId);
    }
    // Otherwise use original state
    const role = roles.find((r) => r.id === roleId);
    return role?.permissions.some((p) => p.id === permissionId) ?? false;
  };

  // Toggle a permission in the matrix
  const togglePermission = (roleId: string, permissionId: string) => {
    if (!canManage) return;

    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const originalHas = role.permissions.some((p) => p.id === permissionId);
    const currentChanges = matrixChanges[roleId] ?? new Set(role.permissions.map((p) => p.id));

    if (currentChanges.has(permissionId)) {
      currentChanges.delete(permissionId);
    } else {
      currentChanges.add(permissionId);
    }

    setMatrixChanges((prev) => ({
      ...prev,
      [roleId]: new Set(currentChanges)
    }));
  };

  // Check if a role has pending changes
  const hasChanges = (roleId: string): boolean => {
    return !!matrixChanges[roleId];
  };

  // Save changes for a role
  const saveChanges = async (roleId: string) => {
    if (!matrixChanges[roleId]) return;

    setSaving(roleId);
    try {
      await updateRolePermissions(roleId, Array.from(matrixChanges[roleId]));
      // Clear changes and refresh data
      setMatrixChanges((prev) => {
        const next = { ...prev };
        delete next[roleId];
        return next;
      });
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar permissões');
    } finally {
      setSaving(null);
    }
  };

  // Discard changes for a role
  const discardChanges = (roleId: string) => {
    setMatrixChanges((prev) => {
      const next = { ...prev };
      delete next[roleId];
      return next;
    });
  };

  // Group permissions by prefix
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const prefix = perm.key.split('.')[0];
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const permissionPrefixes = Object.keys(groupedPermissions).sort();

  if (!canRead) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <CardBody>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              Você não tem permissão para visualizar permissões.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Matriz de Permissões</h1>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Visualize e gerencie as permissões de cada perfil de acesso.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Matrix */}
      <Card>
        <CardBody style={{ padding: 0, overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
              Carregando...
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', position: 'sticky', left: 0, background: '#f9fafb', zIndex: 1, minWidth: '200px' }}>
                    Permissão
                  </th>
                  {roles.map((role) => (
                    <th key={role.id} style={{ padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', minWidth: '120px' }}>
                      <div>{role.name}</div>
                      {hasChanges(role.id) && (
                        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <Button
                            size="sm"
                            onClick={() => saveChanges(role.id)}
                            disabled={saving === role.id}
                          >
                            {saving === role.id ? '...' : 'Salvar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => discardChanges(role.id)}
                            disabled={saving === role.id}
                          >
                            Desfazer
                          </Button>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionPrefixes.map((prefix) => (
                  <>
                    <tr key={`header-${prefix}`} style={{ background: '#f3f4f6' }}>
                      <td
                        colSpan={roles.length + 1}
                        style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}
                      >
                        {prefix}
                      </td>
                    </tr>
                    {groupedPermissions[prefix].map((perm) => (
                      <tr key={perm.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '8px 16px', fontSize: '13px', position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                          <div style={{ fontWeight: '500' }}>{perm.key}</div>
                          {perm.description && (
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{perm.description}</div>
                          )}
                        </td>
                        {roles.map((role) => (
                          <td key={`${role.id}-${perm.id}`} style={{ padding: '8px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={getPermissionState(role.id, perm.id)}
                              onChange={() => togglePermission(role.id, perm.id)}
                              disabled={!canManage}
                              style={{ cursor: canManage ? 'pointer' : 'default' }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '24px', color: '#6b7280', fontSize: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked disabled />
          <span>Permissão concedida</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" disabled />
          <span>Permissão não concedida</span>
        </div>
      </div>
    </div>
  );
}

export default function PermissoesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Carregando...</div>}>
      <PermissoesMatrix />
    </Suspense>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  listBeds,
  createBed,
  updateBed,
  getWards,
  type BedRecord,
  type WardRecord,
  type BedCreateInput,
  type BedUpdateInput
} from '../../../../lib/api';
import { getAuthSession } from '../../../../lib/auth';
import { can, resolvePermissions } from '../../../../lib/permissions';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  vet: ['bed.read', 'ward.read'],
  enfermagem: ['bed.read', 'ward.read'],
  recepcao: ['bed.read', 'ward.read']
};

function Modal({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          minWidth: 400,
          maxWidth: 500,
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 24,
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export default function LeitosPage() {
  const session = getAuthSession();
  const permissions = useMemo(() => resolvePermissions(session, ROLE_PERMISSIONS), [session]);
  const canReadBeds = can(permissions, 'bed.read');
  const canWriteBeds = can(permissions, 'bed.write');

  const [beds, setBeds] = useState<BedRecord[]>([]);
  const [wards, setWards] = useState<WardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedWardId, setSelectedWardId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    wardId: string;
    name: string;
    code: string;
    isActive: boolean;
  }>({
    wardId: '',
    name: '',
    code: '',
    isActive: true
  });

  const loadWards = useCallback(async () => {
    try {
      const result = await getWards({ pageSize: 100 });
      setWards(result.data);
      if (result.data.length > 0 && !formData.wardId) {
        setFormData(prev => ({ ...prev, wardId: result.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load wards:', err);
    }
  }, [formData.wardId]);

  const loadBeds = useCallback(async () => {
    if (!canReadBeds) return;

    setLoading(true);
    setError(null);
    try {
      const result = await listBeds({
        page,
        pageSize: 20,
        wardId: selectedWardId || undefined,
        q: searchQuery || undefined
      });
      setBeds(result.data);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to load beds:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar leitos');
    } finally {
      setLoading(false);
    }
  }, [canReadBeds, page, selectedWardId, searchQuery]);

  useEffect(() => {
    void loadWards();
  }, [loadWards]);

  useEffect(() => {
    void loadBeds();
  }, [loadBeds]);

  const handleCreate = async () => {
    if (!formData.wardId || !formData.name.trim()) {
      setFormError('Nome e setor são obrigatórios');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: BedCreateInput = {
        wardId: formData.wardId,
        name: formData.name.trim(),
        code: formData.code.trim() || undefined
      };
      await createBed(payload);
      setCreateModalOpen(false);
      setFormData({ wardId: wards[0]?.id || '', name: '', code: '', isActive: true });
      void loadBeds();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao criar leito');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedBed || !formData.name.trim()) {
      setFormError('Nome é obrigatório');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const payload: BedUpdateInput = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        isActive: formData.isActive
      };
      await updateBed(selectedBed.id, payload);
      setEditModalOpen(false);
      setSelectedBed(null);
      void loadBeds();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao atualizar leito');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (bed: BedRecord) => {
    setSelectedBed(bed);
    setFormData({
      wardId: bed.wardId,
      name: bed.name,
      code: bed.code || '',
      isActive: bed.isActive
    });
    setFormError(null);
    setEditModalOpen(true);
  };

  const getWardName = (wardId: string) => {
    return wards.find(w => w.id === wardId)?.name || 'Setor desconhecido';
  };

  if (!canReadBeds) {
    return (
      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center'
          }}
        >
          <h2 style={{ margin: '0 0 8px', color: '#b91c1c' }}>Acesso Negado</h2>
          <p style={{ margin: 0, color: '#7f1d1d' }}>
            Seu perfil não possui permissão para visualizar leitos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>
            Gestão de Leitos
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>
            Gerencie os leitos hospitalares por setor
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link
            href="/internacao/painel"
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              color: '#0f172a',
              padding: '10px 16px',
              textDecoration: 'none',
              fontSize: 14
            }}
          >
            Ver Painel
          </Link>
          {canWriteBeds && (
            <button
              type="button"
              onClick={() => {
                setFormData({ wardId: wards[0]?.id || '', name: '', code: '', isActive: true });
                setFormError(null);
                setCreateModalOpen(true);
              }}
              style={{
                border: 'none',
                borderRadius: 8,
                background: '#0f172a',
                color: '#fff',
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500
              }}
            >
              + Novo Leito
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Setor</span>
          <select
            value={selectedWardId}
            onChange={e => {
              setSelectedWardId(e.target.value);
              setPage(1);
            }}
            style={{
              minWidth: 200,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff'
            }}
          >
            <option value="">Todos os setores</option>
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                {ward.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Buscar</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Nome ou código..."
            style={{
              minWidth: 200,
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1'
            }}
          />
        </label>

        <button
          type="button"
          onClick={() => void loadBeds()}
          disabled={loading}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            padding: '8px 16px',
            cursor: 'pointer',
            marginTop: 20
          }}
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            color: '#b91c1c'
          }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                Leito
              </th>
              <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                Código
              </th>
              <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                Setor
              </th>
              <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                Status
              </th>
              <th style={{ textAlign: 'right', padding: 12, borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, fontWeight: 600 }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                  Carregando...
                </td>
              </tr>
            ) : beds.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                  Nenhum leito encontrado
                </td>
              </tr>
            ) : (
              beds.map(bed => (
                <tr key={bed.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 12 }}>
                    <span style={{ fontWeight: 600 }}>{bed.name}</span>
                  </td>
                  <td style={{ padding: 12, color: '#64748b' }}>
                    {bed.code || '-'}
                  </td>
                  <td style={{ padding: 12 }}>
                    {getWardName(bed.wardId)}
                  </td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: bed.isActive ? '#dcfce7' : '#fee2e2',
                        color: bed.isActive ? '#16a34a' : '#dc2626'
                      }}
                    >
                      {bed.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    {canWriteBeds && (
                      <button
                        type="button"
                        onClick={() => openEditModal(bed)}
                        style={{
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          background: '#fff',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              padding: '8px 16px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            Anterior
          </button>
          <span style={{ color: '#64748b', fontSize: 14 }}>
            Página {page} de {Math.ceil(total / 20)} • Total: {total}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage(p => p + 1)}
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              padding: '8px 16px',
              cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer',
              opacity: page >= Math.ceil(total / 20) ? 0.5 : 1
            }}
          >
            Próxima
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createModalOpen} title="Novo Leito" onClose={() => setCreateModalOpen(false)}>
        <div style={{ display: 'grid', gap: 16 }}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#b91c1c' }}>
              {formError}
            </div>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Setor *</span>
            <select
              value={formData.wardId}
              onChange={e => setFormData(prev => ({ ...prev, wardId: e.target.value }))}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1'
              }}
            >
              <option value="">Selecione um setor</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Nome *</span>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Leito 01, Box A..."
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1'
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Código</span>
            <input
              type="text"
              value={formData.code}
              onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="Ex: L01, BA01..."
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1'
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#fff',
                padding: '10px 16px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: 8,
                background: '#0f172a',
                color: '#fff',
                padding: '10px 16px',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Criando...' : 'Criar Leito'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModalOpen} title="Editar Leito" onClose={() => setEditModalOpen(false)}>
        <div style={{ display: 'grid', gap: 16 }}>
          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#b91c1c' }}>
              {formError}
            </div>
          )}

          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b' }}>
            Setor: <strong>{getWardName(formData.wardId)}</strong>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Nome *</span>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1'
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Código</span>
            <input
              type="text"
              value={formData.code}
              onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1'
              }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Leito ativo</span>
          </label>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              style={{
                flex: 1,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#fff',
                padding: '10px 16px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={submitting}
              style={{
                flex: 1,
                border: 'none',
                borderRadius: 8,
                background: '#0f172a',
                color: '#fff',
                padding: '10px 16px',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

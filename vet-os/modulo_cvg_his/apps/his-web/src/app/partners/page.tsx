'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { px, row, theme } from '@/lib/theme';

// =====================
// Types
// =====================

type Partner = {
  id: string;
  name: string;
  type: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  discountPercent: number;
  active: boolean;
  notes?: string;
  createdAt: string;
};

type PartnerListResponse = {
  data: Partner[];
  total: number;
  page: number;
  pageSize: number;
};

type PartnerCreateDto = {
  name: string;
  type: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  discountPercent: number;
  active: boolean;
  notes?: string;
};

// =====================
// Components
// =====================

function PartnerCard({ partner, onEdit, onDelete }: { partner: Partner; onEdit: (p: Partner) => void; onDelete: (id: string) => void }) {
  const typeLabels: Record<string, string> = {
    pet_shop: '🐾 Pet Shop',
    clinic: '🏥 Clínica',
    other: '📋 Outro'
  };

  return (
    <Card style={{ padding: px(16), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <div style={{ ...row(8), alignItems: 'center', marginBottom: px(4) }}>
          <span style={{ fontSize: px(14), fontWeight: 600 }}>{partner.name}</span>
          <span style={{ 
            fontSize: px(11), 
            padding: px(2), 
            background: partner.active ? '#E8F5E9' : '#FFF3E0', 
            color: partner.active ? '#2E7D32' : '#E65100',
            borderRadius: px(4)
          }}>
            {partner.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div style={{ fontSize: px(12), color: theme.colors.textSecondary, marginBottom: px(4) }}>
          {typeLabels[partner.type] || partner.type}
          {partner.contactName && ` • ${partner.contactName}`}
        </div>
        <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
          Desconto: <strong style={{ color: theme.colors.primary }}>{partner.discountPercent}%</strong>
        </div>
      </div>
      <div style={{ ...row(8) }}>
        <Button variant="outline" size="sm" onClick={() => onEdit(partner)}>Editar</Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(partner.id)}>Excluir</Button>
      </div>
    </Card>
  );
}

function PartnerModal({ partner, onClose, onSave }: { partner: Partner | null; onClose: () => void; onSave: (data: PartnerCreateDto) => void }) {
  const [formData, setFormData] = useState<PartnerCreateDto>({
    name: '',
    type: 'pet_shop',
    discountPercent: 0,
    active: true
  });

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name,
        type: partner.type,
        contactName: partner.contactName || '',
        contactPhone: partner.contactPhone || '',
        contactEmail: partner.contactEmail || '',
        discountPercent: partner.discountPercent,
        active: partner.active,
        notes: partner.notes || ''
      });
    }
  }, [partner]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <Card style={{ width: px(500), maxHeight: '90vh', overflow: 'auto', padding: px(24) }}>
        <h2 style={{ margin: `0 0 ${px(16)}`, fontSize: px(20), fontWeight: 700 }}>
          {partner ? 'Editar Parceiro' : 'Novo Parceiro'}
        </h2>

        <div style={{ display: 'grid', gap: px(16) }}>
          <Input
            label="Nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Select
            label="Tipo"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'pet_shop', label: '🐾 Pet Shop' },
              { value: 'clinic', label: '🏥 Clínica' },
              { value: 'other', label: '📋 Outro' }
            ]}
          />

          <Input
            label="Contato"
            value={formData.contactName || ''}
            onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
          />

          <Input
            label="Telefone"
            value={formData.contactPhone || ''}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
          />

          <Input
            label="Email"
            type="email"
            value={formData.contactEmail || ''}
            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
          />

          <Input
            label="Desconto (%)"
            type="number"
            min={0}
            max={100}
            value={formData.discountPercent}
            onChange={(e) => setFormData({ ...formData, discountPercent: parseFloat(e.target.value) || 0 })}
          />

          <Select
            label="Status"
            value={formData.active ? 'active' : 'inactive'}
            onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
            options={[
              { value: 'active', label: 'Ativo' },
              { value: 'inactive', label: 'Inativo' }
            ]}
          />

          <Input
            label="Observações"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
          />

          <div style={{ ...row(12), justifyContent: 'flex-end', marginTop: px(8) }}>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={() => onSave(formData)}>
              {partner ? 'Salvar Alterações' : 'Criar Parceiro'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// =====================
// Main Page
// =====================

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (activeFilter) params.append('active', activeFilter);

      const result = await apiFetch<PartnerListResponse>(
        `/partners?${params.toString()}`,
        { method: 'GET' }
      );
      setPartners(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro ao carregar parceiros', 500, null));
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, activeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (data: PartnerCreateDto) => {
    try {
      if (selectedPartner) {
        await apiFetch(`/partners/${selectedPartner.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
      } else {
        await apiFetch('/partners', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
      setShowModal(false);
      setSelectedPartner(null);
      fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro ao salvar parceiro', 500, null));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este parceiro?')) return;
    try {
      await apiFetch(`/partners/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro ao excluir parceiro', 500, null));
    }
  };

  if (loading && !error) return <LoadingState message="Carregando parceiros..." />;

  return (
    <div style={{ maxWidth: px(1280), margin: '0 auto', padding: px(24) }}>
      {/* Header */}
      <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'center', marginBottom: px(24) }}>
        <div>
          <h1 style={{ margin: 0, fontSize: px(28), fontWeight: 700 }}>🤝 Parceiros</h1>
          <p style={{ margin: `${px(4)} 0 0`, color: theme.colors.textSecondary }}>
            Gestão de convênios e parcerias comerciais
          </p>
        </div>
        <Button variant="primary" onClick={() => { setSelectedPartner(null); setShowModal(true); }}>
          + Novo Parceiro
        </Button>
      </div>

      {error && <ErrorBanner title="Erro" message={error.message} onRetry={fetchData} />}

      {/* Filters */}
      <div style={{ ...row(12), marginBottom: px(16) }}>
        <Input
          placeholder="Buscar por nome, contato ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'Todos os tipos' },
            { value: 'pet_shop', label: '🐾 Pet Shop' },
            { value: 'clinic', label: '🏥 Clínica' },
            { value: 'other', label: '📋 Outro' }
          ]}
          style={{ minWidth: px(150) }}
        />
        <Select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          options={[
            { value: '', label: 'Todos os status' },
            { value: 'true', label: 'Ativos' },
            { value: 'false', label: 'Inativos' }
          ]}
          style={{ minWidth: px(150) }}
        />
        <Button variant="outline" onClick={fetchData}>Atualizar</Button>
      </div>

      {/* Partners List */}
      {partners.length === 0 ? (
        <Card style={{ padding: px(40), textAlign: 'center', color: theme.colors.textSecondary }}>
          Nenhum parceiro encontrado. Clique em "Novo Parceiro" para criar um.
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: px(12) }}>
          {partners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              onEdit={(p) => { setSelectedPartner(p); setShowModal(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PartnerModal
          partner={selectedPartner}
          onClose={() => { setShowModal(false); setSelectedPartner(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { type CatalogCreateInput, type CatalogRecord, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { px, theme } from '@/lib/theme';

type CatalogItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  kind: 'service' | 'product';
  item?: CatalogRecord | null;
  onSubmit: (payload: CatalogCreateInput) => Promise<CatalogRecord>;
  onSuccess?: (item: CatalogRecord) => void;
};

type FormState = {
  name: string;
  code: string;
  description: string;
  basePrice: string;
  active: boolean;
};

function buildInitialState(item?: CatalogRecord | null): FormState {
  if (!item) {
    return {
      name: '',
      code: '',
      description: '',
      basePrice: '0',
      active: true
    };
  }

  return {
    name: item.name,
    code: item.code ?? '',
    description: item.description ?? '',
    basePrice: String(item.basePrice ?? 0),
    active: item.active
  };
}

export function CatalogItemModal({
  isOpen,
  onClose,
  kind,
  item,
  onSubmit,
  onSuccess
}: CatalogItemModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormState>(buildInitialState(item));

  const singularLabel = kind === 'service' ? 'Serviço' : 'Produto';
  const title = item ? `Editar ${singularLabel}` : `Novo ${singularLabel}`;
  const submitLabel = item ? 'Salvar Alterações' : `Salvar ${singularLabel}`;

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialState(item));
      setErrors({});
    }
  }, [isOpen, item]);

  const baseline = useMemo(() => buildInitialState(item), [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === 'checkbox' ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): CatalogCreateInput | null => {
    const nextErrors: Record<string, string> = {};
    const normalizedName = formData.name.trim();
    const normalizedCode = formData.code.trim();
    const normalizedDescription = formData.description.trim();
    const parsedPrice = Number(formData.basePrice);

    if (normalizedName.length < 2) {
      nextErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (normalizedCode.length > 64) {
      nextErrors.code = 'Código deve ter no máximo 64 caracteres';
    }

    if (normalizedDescription.length > 2000) {
      nextErrors.description = 'Descrição deve ter no máximo 2000 caracteres';
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      nextErrors.basePrice = 'Preço base deve ser um número maior ou igual a zero';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return null;
    }

    setErrors({});

    return {
      name: normalizedName,
      code: normalizedCode === '' ? null : normalizedCode,
      description: normalizedDescription === '' ? null : normalizedDescription,
      basePrice: parsedPrice,
      active: formData.active
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = validate();
    if (!payload) {
      toast('Verifique os campos do formulário', 'error');
      return;
    }

    if (
      item &&
      baseline.name.trim() === payload.name &&
      (baseline.code.trim() || null) === payload.code &&
      (baseline.description.trim() || null) === payload.description &&
      Number(baseline.basePrice) === payload.basePrice &&
      baseline.active === payload.active
    ) {
      toast('Nenhuma alteração para salvar.', 'info');
      onClose();
      return;
    }

    setLoading(true);

    try {
      const saved = await onSubmit(payload);
      toast(`${singularLabel} salvo com sucesso!`, 'success');
      onClose();
      onSuccess?.(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        toast(`Erro: ${error.message}`, 'error');
      } else {
        toast(`Erro inesperado ao salvar ${kind === 'service' ? 'serviço' : 'produto'}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
        Cancelar
      </Button>
      <Button type="button" onClick={handleSubmit} isLoading={loading}>
        {submitLabel}
      </Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md" footer={footer}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
        <Input
          label={`Nome do ${singularLabel} *`}
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
          autoFocus
        />

        <Input
          label="Código"
          name="code"
          value={formData.code}
          onChange={handleChange}
          error={errors.code}
          helperText="Opcional, mas útil para busca rápida"
        />

        <Input
          label="Preço Base *"
          name="basePrice"
          type="number"
          step="0.01"
          min="0"
          value={formData.basePrice}
          onChange={handleChange}
          error={errors.basePrice}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
          <label style={{ fontSize: px(14), fontWeight: 500, color: theme.colors.textPrimary }}>
            Descrição
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, description: e.target.value }));
              if (errors.description) {
                setErrors((prev) => ({ ...prev, description: '' }));
              }
            }}
            rows={4}
            style={{
              width: '100%',
              padding: px(10),
              borderRadius: px(theme.radius.sm),
              border: `1px solid ${errors.description ? theme.colors.danger : theme.colors.border}`,
              fontSize: px(14),
              outline: 'none',
              resize: 'vertical'
            }}
          />
          {errors.description && (
            <span style={{ fontSize: px(12), color: theme.colors.danger }}>{errors.description}</span>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: px(8), cursor: 'pointer' }}>
          <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />
          <span style={{ fontSize: px(14), color: theme.colors.textPrimary }}>Item ativo</span>
        </label>
      </form>
    </Modal>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { updateOwner, ApiError, type OwnerPatchInput, type OwnerSummaryResponse } from '@/lib/api';
import { ownerFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { px } from '@/lib/theme';

interface ClientEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    owner: OwnerSummaryResponse['owner'] | null;
    onSuccess?: () => void;
}

export function ClientEditModal({ isOpen, onClose, owner, onSuccess }: ClientEditModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        fullName: '',
        document: '',
        email: '',
        phoneMain: '',
        phoneAlt: ''
    });

    const baseline = useMemo(() => {
        if (!owner) return null;
        return ownerFormSchema.safeParse({
            fullName: owner.fullName,
            document: owner.document ?? '',
            email: owner.email ?? '',
            phoneMain: owner.phoneMain ?? '',
            phoneAlt: owner.phoneAlt ?? ''
        }).data;
    }, [owner]);

    useEffect(() => {
        if (isOpen && owner) {
            setFormData({
                fullName: owner.fullName,
                document: owner.document ?? '',
                email: owner.email ?? '',
                phoneMain: owner.phoneMain ?? '',
                phoneAlt: owner.phoneAlt ?? ''
            });
            setErrors({});
        }
    }, [isOpen, owner]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!owner || !baseline) return;

        setLoading(true);
        setErrors({});

        const parsed = ownerFormSchema.safeParse(formData);

        if (!parsed.success) {
            const newErrors: Record<string, string> = {};
            parsed.error.issues.forEach(issue => {
                const field = issue.path[0] as string;
                newErrors[field] = issue.message;
            });
            setErrors(newErrors);
            setLoading(false);
            toast('Verifique os campos com erro', 'error');
            return;
        }

        const normalized = parsed.data;
        const patch: OwnerPatchInput = {};

        if (normalized.fullName !== baseline.fullName) patch.fullName = normalized.fullName;
        if (normalized.document !== baseline.document) patch.document = normalized.document;
        if (normalized.email !== baseline.email) patch.email = normalized.email;
        if (normalized.phoneMain !== baseline.phoneMain) patch.phoneMain = normalized.phoneMain;
        if (normalized.phoneAlt !== baseline.phoneAlt) patch.phoneAlt = normalized.phoneAlt;

        if (Object.keys(patch).length === 0) {
            toast('Nenhuma alteração para salvar.', 'info');
            setLoading(false);
            onClose();
            return;
        }

        try {
            await updateOwner(owner.id, patch);
            toast('Cliente atualizado com sucesso!', 'success');
            onClose();
            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            if (err instanceof ApiError) {
                toast(`Erro: ${err.message}`, 'error');
            } else {
                toast('Erro inesperado ao atualizar cliente', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const footer = (
        <>
            <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
            >
                Cancelar
            </Button>
            <Button
                type="button"
                onClick={handleSubmit}
                isLoading={loading}
            >
                Salvar Alterações
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Editar Cliente"
            size="md"
            footer={footer}
        >
            <form id="client-edit-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                <Input
                    label="Nome Completo *"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    error={errors.fullName}
                    autoFocus
                />

                <Input
                    label="Documento (CPF/RG)"
                    name="document"
                    value={formData.document}
                    onChange={handleChange}
                    error={errors.document}
                />

                <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                />

                <div style={{ display: 'flex', gap: px(16) }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="Telefone Principal"
                            name="phoneMain"
                            value={formData.phoneMain}
                            onChange={handleChange}
                            error={errors.phoneMain}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="Telefone Alternativo"
                            name="phoneAlt"
                            value={formData.phoneAlt}
                            onChange={handleChange}
                            error={errors.phoneAlt}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
}

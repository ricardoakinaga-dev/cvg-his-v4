'use client';

import React, { useState, useEffect } from 'react';
import { createOwner, ApiError } from '@/lib/api';
import { OwnerCreateSchema } from '@/contracts/openapi-lite';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { px } from '@/lib/theme';

interface ClientCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (newClientId: string) => void;
}

export function ClientCreateModal({ isOpen, onClose, onSuccess }: ClientCreateModalProps) {
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

    useEffect(() => {
        if (isOpen) {
            setFormData({ fullName: '', document: '', email: '', phoneMain: '', phoneAlt: '' });
            setErrors({});
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const payload = {
            fullName: formData.fullName,
            document: formData.document.trim() === '' ? null : formData.document,
            email: formData.email.trim() === '' ? null : formData.email,
            phoneMain: formData.phoneMain.trim() === '' ? null : formData.phoneMain,
            phoneAlt: formData.phoneAlt.trim() === '' ? null : formData.phoneAlt
        };

        if (payload.phoneMain === null) {
            setErrors({ phoneMain: 'Telefone é obrigatório' });
            setLoading(false);
            toast('Verifique os campos obrigatórios', 'error');
            return;
        }

        const result = OwnerCreateSchema.safeParse(payload);

        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const field = issue.path[0] as string;
                newErrors[field] = issue.message;
            });
            setErrors(newErrors);
            setLoading(false);
            toast('Verifique os campos obrigatórios', 'error');
            return;
        }

        try {
            const newOwner = await createOwner(result.data);
            toast('Cliente cadastrado com sucesso!', 'success');
            onClose();
            if (onSuccess) {
                onSuccess(newOwner.id);
            }
        } catch (err) {
            console.error(err);
            if (err instanceof ApiError) {
                toast(`Erro: ${err.message}`, 'error');
            } else {
                toast('Erro inesperado ao criar cliente', 'error');
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
                Salvar Cliente
            </Button>
        </>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Cliente"
            size="md"
            footer={footer}
        >
            <form id="client-create-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
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

                <div style={{ display: 'flex', gap: px(16) }}>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={errors.email}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <Input
                            label="Telefone"
                            name="phoneMain"
                            value={formData.phoneMain}
                            onChange={handleChange}
                            error={errors.phoneMain}
                        />
                    </div>
                </div>
            </form>
        </Modal>
    );
}

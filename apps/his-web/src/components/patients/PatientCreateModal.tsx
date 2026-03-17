'use client';

import React, { useState, useEffect } from 'react';
import { createPatient, listOwners, ApiError } from '@/lib/api';
import { PatientCreateSchema } from '@/contracts/openapi-lite';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { DebouncedSelect } from '@/components/ui/DebouncedSelect';
import { px, theme } from '@/lib/theme';

interface PatientCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (newPatientId: string) => void;
}

export function PatientCreateModal({ isOpen, onClose, onSuccess }: PatientCreateModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        ownerId: '',
        name: '',
        species: '',
        breed: '',
        sex: '',
        weightKg: '',
        microchip: '',
        aggressive: false,
        allergies: '',
        anesthesiaRisk: '',
        chronicConditions: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                ownerId: '',
                name: '',
                species: '',
                breed: '',
                sex: '',
                weightKg: '',
                microchip: '',
                aggressive: false,
                allergies: '',
                anesthesiaRisk: '',
                chronicConditions: '',
                notes: ''
            });
            setErrors({});
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSelectOwner = (ownerId: string) => {
        setFormData(prev => ({ ...prev, ownerId }));
        if (errors.ownerId) {
            setErrors(prev => ({ ...prev, ownerId: '' }));
        }
    };

    const fetchOwners = async (query: string) => {
        if (!query || query.length < 2) return [];
        try {
            const res = await listOwners({ q: query, page: 1, pageSize: 5 });
            return res.data.map(owner => ({
                label: owner.fullName,
                value: owner.id,
                subLabel: owner.document || owner.phoneMain || 'Sem documento/telefone'
            }));
        } catch {
            return [];
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        // Map form state to the shape expected by PatientCreateSchema
        const payload = {
            ownerId: formData.ownerId,
            name: formData.name,
            species: formData.species,
            breed: formData.breed || undefined,
            sex: formData.sex || undefined,
            weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
            microchip: formData.microchip || undefined,
            alerts: {
                aggressive: formData.aggressive,
                allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                anesthesia_risk: formData.anesthesiaRisk || null,
                chronic_conditions: formData.chronicConditions ? formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                notes: formData.notes || null
            }
        };

        const result = PatientCreateSchema.safeParse(payload);

        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const field = issue.path.join('.'); // Handle nested paths like alerts.aggressive
                newErrors[field] = issue.message;
            });

            // Map common errors back to form fields if needed
            if (newErrors['ownerId']) newErrors['ownerId'] = 'Selecione um tutor válido';
            if (newErrors['name']) newErrors['name'] = 'Nome é obrigatório';
            if (newErrors['species']) newErrors['species'] = 'Espécie é obrigatória';

            setErrors(newErrors);
            setLoading(false);
            toast('Verifique os campos obrigatórios', 'error');
            return;
        }

        try {
            const newPatient = await createPatient(result.data);
            toast('Paciente cadastrado com sucesso!', 'success');
            onClose();
            if (onSuccess) onSuccess(newPatient.id);
        } catch (err) {
            console.error(err);
            if (err instanceof ApiError) {
                toast(`Erro: ${err.message}`, 'error');
            } else {
                toast('Erro inesperado ao criar paciente', 'error');
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
                Salvar Paciente
            </Button>
        </>
    );

    const riskOptions = [
        { label: 'Não avaliado', value: '' },
        { label: 'Baixo', value: 'low' },
        { label: 'Médio', value: 'medium' },
        { label: 'Alto', value: 'high' }
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo Paciente"
            size="lg" // Larger modal for patient data
            footer={footer}
        >
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(24) }}>

                {/* Column 1: Basic Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                    <h4 style={{ margin: 0, fontSize: px(16), fontWeight: 600, color: theme.colors.textPrimary }}>
                        Dados Básicos
                    </h4>

                    <DebouncedSelect
                        label="Tutor Responsável *"
                        placeholder="Buscar por nome ou CPF..."
                        value={formData.ownerId}
                        onChange={handleSelectOwner}
                        fetchOptions={fetchOwners}
                        error={errors.ownerId}
                    />

                    <Input
                        label="Nome do Paciente *"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                    />

                    <div style={{ display: 'flex', gap: px(12) }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Espécie *"
                                name="species"
                                placeholder="Ex: Canina, Felina..."
                                value={formData.species}
                                onChange={handleChange}
                                error={errors.species}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Raça"
                                name="breed"
                                value={formData.breed}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: px(12) }}>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Sexo"
                                name="sex"
                                placeholder="M / F"
                                value={formData.sex}
                                onChange={handleChange}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="Peso (Kg)"
                                name="weightKg"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.weightKg}
                                onChange={handleChange}
                                error={errors.weightKg}
                            />
                        </div>
                    </div>

                    <Input
                        label="Microchip"
                        name="microchip"
                        value={formData.microchip}
                        onChange={handleChange}
                    />
                </div>

                {/* Column 2: Clinical Alerts / Risks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: px(16), background: '#f8fafc', padding: px(16), borderRadius: px(theme.radius.md), border: `1px solid ${theme.colors.border}` }}>
                    <h4 style={{ margin: 0, fontSize: px(16), fontWeight: 600, color: theme.colors.textPrimary }}>
                        Alertas Clínicos & Riscos
                    </h4>

                    <label style={{ display: 'flex', alignItems: 'center', gap: px(8), cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            name="aggressive"
                            checked={formData.aggressive}
                            onChange={handleChange}
                            style={{ width: 18, height: 18, accentColor: theme.colors.danger }}
                        />
                        <span style={{ fontSize: px(14), fontWeight: 500, color: theme.colors.danger }}>
                            Animal Agressivo / Reativo
                        </span>
                    </label>

                    <Select
                        label="Risco Anestésico"
                        name="anesthesiaRisk"
                        value={formData.anesthesiaRisk}
                        onChange={handleChange}
                    >
                        {riskOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>

                    <Input
                        label="Alergias (separadas por vírgula)"
                        name="allergies"
                        placeholder="Ex: Penicilina, Dipirona..."
                        value={formData.allergies}
                        onChange={handleChange}
                    />

                    <Input
                        label="Condições Crônicas (separadas por vírgula)"
                        name="chronicConditions"
                        placeholder="Ex: Diabetes, Cardiopata..."
                        value={formData.chronicConditions}
                        onChange={handleChange}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
                        <label style={{ fontSize: px(14), fontWeight: 500, color: theme.colors.textPrimary }}>
                            Observações Gerais (Alertas)
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                setFormData(prev => ({ ...prev, notes: e.target.value }));
                            }}
                            rows={3}
                            style={{
                                width: '100%',
                                padding: px(10),
                                borderRadius: px(theme.radius.sm),
                                border: `1px solid ${theme.colors.border}`,
                                fontSize: px(14),
                                outline: 'none',
                                resize: 'vertical'
                            }}
                        />
                    </div>
                </div>

            </form>
        </Modal>
    );
}

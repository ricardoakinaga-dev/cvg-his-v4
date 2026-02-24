'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { updatePatient, ApiError, type PatientPatchInput, type PatientSummaryResponse } from '@/lib/api';
import { patientFormSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { px, theme } from '@/lib/theme';

interface PatientEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientSummaryResponse['patient'] | null;
    onSuccess?: () => void;
}

export function PatientEditModal({ isOpen, onClose, patient, onSuccess }: PatientEditModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: '',
        species: '',
        breed: '',
        sex: '',
        microchip: '',
        aggressive: false,
        allergies: '',
        anesthesiaRisk: '',
        chronicConditions: '',
        notes: ''
    });

    const baseline = useMemo(() => {
        if (!patient) return null;
        return patientFormSchema.safeParse({
            name: patient.name,
            species: patient.species,
            breed: patient.breed || '',
            sex: patient.sex || '',
            microchip: patient.microchip || '',
            aggressive: patient.alerts?.aggressive || false,
            allergies: patient.alerts?.allergies?.join(', ') || '',
            anesthesiaRisk: patient.alerts?.anesthesia_risk || '',
            chronicConditions: patient.alerts?.chronic_conditions?.join(', ') || '',
            notes: patient.alerts?.notes || ''
        }).data;
    }, [patient]);

    useEffect(() => {
        if (isOpen && patient) {
            setFormData({
                name: patient.name,
                species: patient.species,
                breed: patient.breed || '',
                sex: patient.sex || '',
                microchip: patient.microchip || '',
                aggressive: patient.alerts?.aggressive || false,
                allergies: patient.alerts?.allergies?.join(', ') || '',
                anesthesiaRisk: patient.alerts?.anesthesia_risk || '',
                chronicConditions: patient.alerts?.chronic_conditions?.join(', ') || '',
                notes: patient.alerts?.notes || ''
            });
            setErrors({});
        }
    }, [isOpen, patient]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

        setFormData(prev => ({ ...prev, [name]: finalValue }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!patient || !baseline) return;

        setLoading(true);
        setErrors({});

        const parsed = patientFormSchema.safeParse(formData);

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
        const patch: PatientPatchInput = {};

        if (normalized.name !== baseline.name) patch.name = normalized.name;
        if (normalized.species !== baseline.species) patch.species = normalized.species;
        if (normalized.breed !== baseline.breed) patch.breed = normalized.breed;
        if (normalized.sex !== baseline.sex) patch.sex = normalized.sex;
        if (normalized.microchip !== baseline.microchip) patch.microchip = normalized.microchip;

        // Alerts deep compare
        if (
            normalized.alerts.aggressive !== baseline.alerts.aggressive ||
            JSON.stringify(normalized.alerts.allergies) !== JSON.stringify(baseline.alerts.allergies) ||
            normalized.alerts.anesthesia_risk !== baseline.alerts.anesthesia_risk ||
            JSON.stringify(normalized.alerts.chronic_conditions) !== JSON.stringify(baseline.alerts.chronic_conditions) ||
            normalized.alerts.notes !== baseline.alerts.notes
        ) {
            patch.alerts = normalized.alerts;
        }

        if (Object.keys(patch).length === 0) {
            toast('Nenhuma alteração para salvar.', 'info');
            setLoading(false);
            onClose();
            return;
        }

        try {
            await updatePatient(patient.id, patch);
            toast('Paciente atualizado com sucesso!', 'success');
            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            if (err instanceof ApiError) {
                toast(`Erro: ${err.message}`, 'error');
            } else {
                toast('Erro inesperado ao atualizar paciente', 'error');
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
                Salvar Alterações
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
            title="Editar Paciente"
            size="lg"
            footer={footer}
        >
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(24) }}>

                {/* Column 1: Basic Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                    <h4 style={{ margin: 0, fontSize: px(16), fontWeight: 600, color: theme.colors.textPrimary }}>
                        Dados Básicos
                    </h4>

                    <Input
                        label="Nome do Paciente *"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        error={errors.name}
                        autoFocus
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
                    </div>

                    <Input
                        label="Microchip"
                        name="microchip"
                        value={formData.microchip}
                        onChange={handleChange}
                    />
                </div>

                {/* Column 2: Clinical Alerts / Risks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: px(16), background: '#fcfcfc', padding: px(16), borderRadius: px(theme.radius.md), border: `1px solid ${theme.colors.border}` }}>
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

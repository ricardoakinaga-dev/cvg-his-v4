'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import {
    createOwner,
    createPatient,
    createEncounter,
    ApiError,
    type Owner
} from '@/lib/api';
import {
    OwnerCreateSchema,
    PatientCreateSchema,
    EncounterCreateSchema
} from '@/contracts/openapi-lite';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { px, theme } from '@/lib/theme';
import { Badge, Spinner } from '@/components/ui/Primitives';

type Step = 'owner' | 'patient' | 'encounter';

export default function QuickRegistrationPage() {
    const router = useRouter();
    const { toast } = useToast();

    // State
    const [step, setStep] = useState<Step>('owner');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Data
    const [createdOwner, setCreatedOwner] = useState<Owner | null>(null);
    const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);

    // Forms
    const [ownerForm, setOwnerForm] = useState({
        fullName: '',
        document: '',
        email: '',
        phone: ''
    });

    const [patientForm, setPatientForm] = useState({
        name: '',
        species: '',
        microchip: '',
        // Alerts
        alertAggressive: false,
        alertAllergies: '',
        alertAnesthesia: '',
        alertNotes: ''
    });

    const [encounterForm, setEncounterForm] = useState({
        reason: ''
    });

    // Handlers
    const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOwnerForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setPatientForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleEncounterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEncounterForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Submits
    const submitOwner = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        const result = OwnerCreateSchema.safeParse(ownerForm);
        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => newErrors[issue.path[0] as string] = issue.message);
            setErrors(newErrors);
            setLoading(false);
            toast("Verifique os dados do tutor", "error");
            return;
        }

        try {
            const owner = await createOwner(result.data);
            setCreatedOwner(owner);
            toast("Tutor cadastrado!", "success");
            setStep('patient');
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    const submitPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createdOwner) return;

        setLoading(true);
        setErrors({});

        // Prepare Payload
        const alertsData = {
            aggressive: patientForm.alertAggressive,
            allergies: patientForm.alertAllergies ? patientForm.alertAllergies.split(',').map(s => s.trim()) : undefined,
            anesthesia_risk: patientForm.alertAnesthesia === '' ? null : patientForm.alertAnesthesia as 'low' | 'medium' | 'high',
            notes: patientForm.alertNotes || null
        };
        const hasAlerts = Object.values(alertsData).some(v => v !== undefined && v !== null && v !== false && v !== '');

        const payload = {
            ownerId: createdOwner.id,
            name: patientForm.name,
            species: patientForm.species,
            microchip: patientForm.microchip || undefined,
            alerts: hasAlerts ? alertsData : undefined
        };

        const result = PatientCreateSchema.safeParse(payload);
        if (!result.success) {
            const newErrors: Record<string, string> = {};
            result.error.issues.forEach(issue => {
                const field = issue.path[issue.path.length - 1] as string;
                newErrors[field] = issue.message;
            });
            setErrors(newErrors);
            setLoading(false);
            toast("Verifique os dados do paciente", "error");
            return;
        }

        try {
            const patient = await createPatient(result.data);
            setCreatedPatientId(patient.id);
            toast("Paciente cadastrado!", "success");
            setStep('encounter');
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    const submitEncounter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createdPatientId) return;

        setLoading(true);

        const payload = {
            patientId: createdPatientId,
            reason: encounterForm.reason || undefined
        };

        const result = EncounterCreateSchema.safeParse(payload);
        if (!result.success) {
            toast("Erro na validação do atendimento", "error");
            setLoading(false);
            return;
        }

        try {
            const encounter = await createEncounter(result.data);
            toast("Atendimento iniciado com sucesso!", "success");
            router.push(`/encounters/${encounter.id}`);
        } catch (err) {
            handleError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleError = (err: unknown) => {
        console.error(err);
        if (err instanceof ApiError) {
            toast(`Erro: ${err.message}`, "error");
        } else {
            toast("Erro inesperado", "error");
        }
    };

    // Render Steps
    return (
        <div style={{ maxWidth: px(700), margin: '0 auto', padding: px(24) }}>
            <h1 style={{ fontSize: px(24), fontWeight: 600, marginBottom: px(24) }}>Cadastro Rápido</h1>

            {/* Stepper Visual */}
            <div style={{ display: 'flex', marginBottom: px(32), gap: px(12) }}>
                <StepIndicator active={step === 'owner'} done={!!createdOwner} label="1. Tutor" />
                <StepIndicator active={step === 'patient'} done={!!createdPatientId} label="2. Paciente" />
                <StepIndicator active={step === 'encounter'} done={false} label="3. Atendimento" />
            </div>

            {/* STEP 1: OWNER */}
            {step === 'owner' && (
                <Card style={{ padding: px(24) }}>
                    <h2 style={{ fontSize: px(18), fontWeight: 600, marginBottom: px(16) }}>Dados do Tutor</h2>
                    <form onSubmit={submitOwner} style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                        <Input
                            label="Nome Completo *"
                            name="fullName"
                            value={ownerForm.fullName}
                            onChange={handleOwnerChange}
                            error={errors.fullName}
                            autoFocus
                        />
                        <Input
                            label="Documento (CPF/RG)"
                            name="document"
                            value={ownerForm.document}
                            onChange={handleOwnerChange}
                            error={errors.document}
                        />
                        <div style={{ display: 'flex', gap: px(16) }}>
                            <Input
                                style={{ flex: 1 }}
                                label="Email"
                                name="email"
                                value={ownerForm.email}
                                onChange={handleOwnerChange}
                                error={errors.email}
                            />
                            <Input
                                style={{ flex: 1 }}
                                label="Telefone"
                                name="phone"
                                value={ownerForm.phone}
                                onChange={handleOwnerChange}
                                error={errors.phone}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: px(8) }}>
                            <Button type="submit" isLoading={loading}>Salvar e Continuar</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* STEP 2: PATIENT */}
            {step === 'patient' && (
                <Card style={{ padding: px(24) }}>
                    <div style={{ marginBottom: px(24), padding: px(12), background: '#f0fdf4', borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.success}` }}>
                        <strong>Tutor Criado:</strong> {createdOwner?.fullName}
                    </div>

                    <h2 style={{ fontSize: px(18), fontWeight: 600, marginBottom: px(16) }}>Dados do Paciente</h2>
                    <form onSubmit={submitPatient} style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                        <div style={{ display: 'flex', gap: px(16) }}>
                            <div style={{ flex: 2 }}>
                                <Input
                                    label="Nome do Paciente *"
                                    name="name"
                                    value={patientForm.name}
                                    onChange={handlePatientChange}
                                    error={errors.name}
                                    autoFocus
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Input
                                    label="Espécie *"
                                    name="species"
                                    value={patientForm.species}
                                    onChange={handlePatientChange}
                                    error={errors.species}
                                    placeholder="Ex: Canina"
                                />
                            </div>
                        </div>

                        <Input
                            label="Microchip"
                            name="microchip"
                            value={patientForm.microchip}
                            onChange={handlePatientChange}
                        />

                        {/* Mini Alerts */}
                        <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: px(16) }}>
                            <h3 style={{ fontSize: px(14), fontWeight: 600, marginBottom: px(12), color: theme.colors.textSecondary }}>Alertas Rapidos (Opcional)</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
                                    <input
                                        type="checkbox"
                                        id="alertAggressive"
                                        name="alertAggressive"
                                        checked={patientForm.alertAggressive}
                                        onChange={handlePatientChange}
                                    />
                                    <label htmlFor="alertAggressive" style={{ color: theme.colors.danger, fontWeight: 500 }}>Agressivo</label>
                                </div>

                                <div style={{ display: 'flex', gap: px(16) }}>
                                    <Input
                                        style={{ flex: 1 }}
                                        label="Alergias"
                                        name="alertAllergies"
                                        placeholder="Separar por vírgula"
                                        value={patientForm.alertAllergies}
                                        onChange={handlePatientChange}
                                    />
                                    <Select
                                        style={{ flex: 1 }}
                                        label="Risco Anestésico"
                                        name="alertAnesthesia"
                                        value={patientForm.alertAnesthesia}
                                        onChange={handlePatientChange}
                                    >
                                        <option value="">Nenhum</option>
                                        <option value="low">Baixo</option>
                                        <option value="medium">Médio</option>
                                        <option value="high">Alto</option>
                                    </Select>
                                </div>

                                <Input
                                    label="Notas / Observações"
                                    name="alertNotes"
                                    value={patientForm.alertNotes}
                                    onChange={handlePatientChange}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: px(8) }}>
                            <Button type="submit" isLoading={loading}>Salvar Paciente</Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* STEP 3: ENCOUNTER */}
            {step === 'encounter' && (
                <Card style={{ padding: px(24), textAlign: 'center' }}>
                    <div style={{ marginBottom: px(24) }}>
                        <div style={{ width: px(48), height: px(48), background: theme.colors.success, borderRadius: '50%', color: '#fff', fontSize: px(24), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>✓</div>
                        <h2 style={{ fontSize: px(20), fontWeight: 600, marginTop: px(16) }}>Tudo pronto!</h2>
                        <p style={{ color: theme.colors.textSecondary }}>Tutor e Paciente foram cadastrados com sucesso.</p>
                    </div>

                    <form onSubmit={submitEncounter} style={{ maxWidth: px(400), margin: '0 auto', textAlign: 'left' }}>
                        <Input
                            label="Motivo do atendimento (Opcional)"
                            name="reason"
                            value={encounterForm.reason}
                            onChange={handleEncounterChange}
                            placeholder="Ex: Vacinação, Consulta de rotina..."
                            autoFocus
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            style={{ width: '100%', marginTop: px(24) }}
                        >
                            Iniciar Atendimento Agora
                        </Button>
                    </form>
                </Card>
            )}
        </div>
    );
}

function StepIndicator({ active, done, label }: { active: boolean; done: boolean; label: string }) {
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: px(8),
            paddingBottom: px(8),
            borderBottom: `2px solid ${active ? theme.colors.primary : done ? theme.colors.success : theme.colors.border}`,
            color: active ? theme.colors.primary : done ? theme.colors.success : theme.colors.textSecondary,
            fontWeight: active || done ? 600 : 400
        }}>
            <div style={{
                width: px(24), height: px(24), borderRadius: '50%',
                background: active ? theme.colors.primary : done ? theme.colors.success : '#e2e8f0',
                color: '#fff', fontSize: px(12), display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {done ? '✓' : label.split('.')[0]}
            </div>
            <span style={{ fontSize: px(14) }}>{label.split(' ')[1]}</span>
        </div>
    );
}

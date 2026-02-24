'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    getPatient,
    getOwner,
    createEncounter,
    type Patient,
    type Owner,
    ApiError
} from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/Toast';
import { px, theme } from '@/lib/theme';

// Force dynamic rendering to avoid useSearchParams issues
export const dynamic = 'force-dynamic';

function ReceptionStartContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const patientId = searchParams.get('patientId');

    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [patient, setPatient] = useState<Patient | null>(null);
    const [owner, setOwner] = useState<Owner | null>(null);
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!patientId) {
            router.replace('/reception');
            return;
        }

        const fetchData = async () => {
            try {
                // 1. Fetch Patient
                const p = await getPatient(patientId);
                setPatient(p);

                // 2. Fetch Owner (using patient.ownerId ensures consistency)
                const o = await getOwner(p.ownerId);
                setOwner(o);
            } catch (err) {
                console.error(err);
                setError('Erro ao carregar dados do paciente/tutor.');
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();
    }, [patientId, router]);

    const handleStart = async () => {
        if (!patientId) return;

        setSubmitting(true);
        try {
            const encounter = await createEncounter({
                patientId,
                reason: reason.trim() || undefined
            });
            toast('Atendimento iniciado!', 'success');
            router.push(`/encounters/${encounter.id}`);
        } catch (err) {
            console.error(err);
            if (err instanceof ApiError) {
                toast(err.message, 'error');
            } else {
                toast('Erro ao iniciar atendimento.', 'error');
            }
            setSubmitting(false);
        }
    };

    if (loadingData) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: px(48) }}>
                <Spinner size={48} />
            </div>
        );
    }

    if (error || !patient || !owner) {
        return (
            <div style={{ maxWidth: px(600), margin: '0 auto', padding: px(24), textAlign: 'center' }}>
                <div style={{
                    background: '#FEF2F2', color: '#DC2626',
                    padding: px(24), borderRadius: px(theme.radius.md), marginBottom: px(16)
                }}>
                    {error || 'Paciente ou Tutor não encontrados.'}
                </div>
                <Button variant="secondary" onClick={() => router.push('/reception')}>
                    Voltar para Recepção
                </Button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: px(600), margin: '0 auto', padding: `${px(40)} ${px(24)}` }}>
            <h1 style={{ fontSize: px(24), fontWeight: 600, marginBottom: px(24), textAlign: 'center' }}>
                Confirmar Abertura de Atendimento
            </h1>

            <Card style={{ padding: px(24) }}>
                {/* TUTOR INFO */}
                <div style={{ marginBottom: px(24), borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: px(24) }}>
                    <h2 style={{ fontSize: px(14), fontWeight: 600, color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: px(12) }}>
                        Responsável
                    </h2>
                    <div style={{ fontSize: px(18), fontWeight: 600, marginBottom: px(4) }}>
                        {owner.fullName}
                    </div>
                    <div style={{ fontSize: px(14), color: theme.colors.textSecondary }}>
                        {[owner.document, owner.phoneMain, owner.email].filter(Boolean).join(' • ')}
                    </div>
                </div>

                {/* PATIENT INFO */}
                <div style={{ marginBottom: px(24) }}>
                    <h2 style={{ fontSize: px(14), fontWeight: 600, color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: px(12) }}>
                        Paciente
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: px(12), marginBottom: px(8) }}>
                        <div style={{
                            background: theme.colors.primary, color: '#fff',
                            padding: '4px 8px', borderRadius: px(4), fontSize: px(12), fontWeight: 600
                        }}>
                            {patient.species.toUpperCase()}
                        </div>
                        <div style={{ fontSize: px(18), fontWeight: 600 }}>{patient.name}</div>
                    </div>
                    <div style={{ fontSize: px(14), color: theme.colors.textSecondary }}>
                        {[
                            patient.breed,
                            patient.sex === 'M' ? 'Macho' : patient.sex === 'F' ? 'Fêmea' : null,
                            patient.weightKg ? `${patient.weightKg}kg` : null
                        ].filter(Boolean).join(' • ')}
                    </div>
                    {patient.microchip && (
                        <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginTop: px(4) }}>
                            Microchip: {patient.microchip}
                        </div>
                    )}
                </div>

                {/* REASON INPUT */}
                <div style={{ marginBottom: px(32) }}>
                    <label style={{ display: 'block', fontSize: px(14), fontWeight: 500, marginBottom: px(8) }}>
                        Motivo do Atendimento (Opcional)
                    </label>
                    <textarea
                        rows={3}
                        placeholder="Ex: Vacinação anual, Vômito e diarreia..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={{
                            width: '100%',
                            padding: px(12),
                            borderRadius: px(theme.radius.sm),
                            border: `1px solid ${theme.colors.border}`,
                            fontFamily: 'inherit',
                            fontSize: px(14),
                            outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
                        onBlur={(e) => e.target.style.borderColor = theme.colors.border}
                    />
                </div>

                {/* ACTIONS */}
                <div style={{ display: 'flex', gap: px(12) }}>
                    <Button
                        variant="ghost"
                        style={{ flex: 1 }}
                        onClick={() => router.back()}
                        disabled={submitting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        style={{ flex: 1 }}
                        onClick={handleStart}
                        isLoading={submitting}
                    >
                        Iniciar Atendimento
                    </Button>
                </div>
            </Card>
        </div>
    );
}

export default function ReceptionStartPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Carregando...</div>}>
            <ReceptionStartContent />
        </Suspense>
    );
}

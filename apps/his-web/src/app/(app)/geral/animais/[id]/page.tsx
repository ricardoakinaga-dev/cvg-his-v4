'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingState } from '../../../../../components/ui/LoadingState';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import { apiClient } from '../../../../../lib/api/client';
import { Patient } from '../../../../../lib/api';

export default function AnimalDetailPage() {
    const params = useParams();
    const patientId = params.id as string;

    // Roteamento fix: Protege a rota `[id]` do valor `novo`
    if (patientId === 'novo') {
        redirect('/geral/animais/novo');
    }

    // UUID verification to prevent 500 errors gracefully
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId);
    if (!isUuid) {
        notFound();
    }

    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPatient = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const patientRes = await apiClient<Patient>(`/patients/${patientId}`);
            setPatient(patientRes);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do animal');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        fetchPatient();
    }, [fetchPatient]);

    if (loading) {
        return <LoadingState message="Carregando paciente..." />;
    }

    if (error || !patient) {
        return (
            <EmptyState
                title="Animal não encontrado"
                description={error || 'O paciente solicitado não existe ou não pôde ser carregado'}
                action={
                    <Link href="/geral/animais">
                        <Button>Voltar para lista</Button>
                    </Link>
                }
            />
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={patient.name}
                description="Detalhes do paciente"
                breadcrumbs={[
                    { label: 'Animais', href: '/geral/animais' },
                    { label: patient.name }
                ]}
            />

            <Card>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Nome do Animal</label>
                            <p className="mt-1 text-sm text-gray-900">{patient.name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Espécie / Raça</label>
                            <p className="mt-1 text-sm text-gray-900">{patient.species} {patient.breed ? ` / ${patient.breed}` : ''}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Sexo</label>
                            <p className="mt-1 text-sm text-gray-900">{patient.sex === 'M' ? 'Macho' : patient.sex === 'F' ? 'Fêmea' : (patient.sex || '-')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500">Tutor</label>
                            <p className="mt-1 text-sm text-gray-900">
                                <Link href={`/geral/clientes/${patient.ownerId}`} className="text-indigo-600 hover:text-indigo-900 hover:underline">
                                    Ver Tutor
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Aqui entrará o histórico clínico, evoluções, exames, vacinas futuramente */}
            <Card>
                <div className="p-4">
                    <h3 className="text-lg font-medium mb-4">Prontuário</h3>
                    <EmptyState
                        title="Prontuário vazio"
                        description="Recurso em desenvolvimento"
                    />
                </div>
            </Card>
        </div>
    );
}

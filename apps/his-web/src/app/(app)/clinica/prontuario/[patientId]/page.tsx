'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingState } from '../../../../../components/ui/LoadingState';
import { getPatientContext, listEncounters, api } from '../../../../../lib/api';
import type { PatientContextResponse, EncounterRecord, EncounterTimelineResponse } from '../../../../../lib/api';
import { EncounterTimeline } from '../../../../../components/encounters/EncounterTimeline';

// Component for a lazy-loaded timeline inside the accordion
function HistoricalEncounter({ encounter }: { encounter: EncounterRecord }) {
    const [timeline, setTimeline] = useState<EncounterTimelineResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleExpand = async () => {
        if (!expanded && !timeline && !loading) {
            setLoading(true);
            setError(null);
            try {
                const data = await api.get<EncounterTimelineResponse>(`/encounters/${encounter.id}/timeline`);
                setTimeline(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar a linha do tempo desse atendimento');
            } finally {
                setLoading(false);
            }
        }
        setExpanded(!expanded);
    };

    const isClosed = encounter.status === 'closed';

    return (
        <div className="border rounded-md shadow-sm overflow-hidden bg-white">
            <div
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={toggleExpand}
            >
                <div>
                    <div className="font-semibold text-gray-900">
                        {new Date(encounter.openedAt).toLocaleDateString()} - {encounter.reason || 'Consulta Clínica'}
                    </div>
                    <div className="text-sm text-gray-500">
                        Status: <span className="capitalize">{encounter.status}</span>
                    </div>
                </div>
                <div>
                    <Button variant="ghost" size="sm">
                        {expanded ? 'Ocultar Detalhes' : 'Ver Completo'}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="p-4 border-t bg-gray-50">
                    <div className="flex justify-end mb-4">
                        <Link href={`/clinica/atendimentos/${encounter.id}`}>
                            <Button variant="secondary" size="sm">
                                Abrir Atendimento Completo
                            </Button>
                        </Link>
                    </div>

                    {loading && <div className="text-sm text-gray-500">Carregando notas clínicas e eventos...</div>}
                    {error && <div className="text-sm text-red-500">{error}</div>}
                    {timeline && (
                        <div className="bg-white p-4 rounded border">
                            <EncounterTimeline data={timeline} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function PatientDashboardContent({ patientId }: { patientId: string }) {
    const [context, setContext] = useState<PatientContextResponse | null>(null);
    const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [ctxData, encData] = await Promise.all([
                    getPatientContext(patientId),
                    listEncounters({ patientId, pageSize: 50 })
                ]);
                setContext(ctxData);
                setEncounters(encData.data);
            } catch (err: any) {
                if (err.status === 404 || err.message?.includes('404')) {
                    router.push('/clinica/prontuario?error=not-found');
                } else {
                    setError(err.message || 'Erro ao carregar prontuário');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [patientId, router]);

    if (loading) return <LoadingState message="Agregando histórico do paciente..." />;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!context) return null;

    const { patient, stay, encounter } = context;
    const { highlightedAlerts } = patient;

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Prontuário de ${patient.name}`}
                description={`${patient.species} ${patient.breed ? `• ${patient.breed}` : ''} • Tutor(a): ${patient.ownerName || 'Não informado'}`}
                actions={
                    <div className="flex gap-2">
                        {!encounter && (
                            <Button onClick={() => router.push(`/clinica/atendimentos/novo`)}>
                                Iniciar Atendimento
                            </Button>
                        )}
                        {encounter && (
                            <Button onClick={() => router.push(`/clinica/atendimentos/${encounter.id}`)}>
                                Ir para Atendimento Ativo
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Alerts Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-4 rounded-md border ${highlightedAlerts.aggressive ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    <div className="text-xs font-semibold uppercase opacity-70 mb-1">Comportamento</div>
                    <div className="font-medium text-lg">{highlightedAlerts.aggressive ? 'Agressivo' : 'Dócil'}</div>
                </div>

                <div className={`p-4 rounded-md border ${highlightedAlerts.allergiesCount > 0 ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    <div className="text-xs font-semibold uppercase opacity-70 mb-1">Alergias</div>
                    <div className="font-medium text-lg">{highlightedAlerts.allergiesCount > 0 ? `${highlightedAlerts.allergiesCount} registradas` : 'Nenhuma relatada'}</div>
                </div>

                <div className={`p-4 rounded-md border text-gray-800 ${highlightedAlerts.chronicConditionsCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-xs font-semibold uppercase opacity-70 mb-1">Doenças Crônicas</div>
                    <div className="font-medium text-lg">{highlightedAlerts.chronicConditionsCount > 0 ? `${highlightedAlerts.chronicConditionsCount} mapeadas` : 'Nenhuma'}</div>
                </div>

                <div className={`p-4 rounded-md border ${stay ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                    <div className="text-xs font-semibold uppercase opacity-70 mb-1">Status Hospitalar</div>
                    <div className="font-medium text-lg">{stay ? `Internado (${stay.wardName})` : 'Ambulatorial'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Feed */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Histórico Clínico (Encounters)</h2>

                    {encounters.length === 0 ? (
                        <div className="p-8 text-center bg-gray-50 rounded-md border text-gray-500">
                            Este paciente ainda não possui atendimentos ou notas clínicas registradas.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {encounters.map(enc => (
                                <HistoricalEncounter key={enc.id} encounter={enc} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card title="Sinais Vitais e Biometria">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-gray-500">Peso Atual</span>
                                <span className="font-medium">{patient.weightKg ? `${patient.weightKg} kg` : 'Não informado'}</span>
                            </div>
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-gray-500">Idade</span>
                                <span className="font-medium">{patient.ageMonths ? `${Math.floor(patient.ageMonths / 12)}a ${patient.ageMonths % 12}m` : 'Não informada'}</span>
                            </div>
                            <div className="flex justify-between pb-1">
                                <span className="text-gray-500">Microchip</span>
                                <span className="font-medium">{patient.microchip || 'N/A'}</span>
                            </div>
                        </div>
                    </Card>

                    {patient.alerts?.notes && (
                        <Card title="Anotações Gerais (Alerta)">
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {patient.alerts.notes}
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProntuarioDashboardPage({ params }: { params: { patientId: string } }) {
    return (
        <Suspense fallback={<LoadingState message="Carregando dados..." />}>
            <PatientDashboardContent patientId={params.patientId} />
        </Suspense>
    );
}

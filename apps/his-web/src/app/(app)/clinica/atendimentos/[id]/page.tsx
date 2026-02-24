'use client';

import { Suspense, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingState } from '../../../../../components/ui/LoadingState';
import { Can } from '../../../../../components/auth/Can';
import { PERMISSIONS } from '../../../../../lib/rbac';
import { api, type EncounterRecord, type EncounterTimelineResponse } from '../../../../../lib/api';
import { EncounterTimeline } from '../../../../../components/encounters/EncounterTimeline';
import { SoapEditor } from '../../../../../components/encounters/SoapEditor';

function EncounterDetailsContent({ id }: { id: string }) {
    const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
    const [timeline, setTimeline] = useState<EncounterTimelineResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [closing, setClosing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchEncounter = async () => {
        setLoading(true);
        try {
            const [encData, timeData] = await Promise.all([
                api.get<EncounterRecord>(`/encounters/${id}`),
                api.get<EncounterTimelineResponse>(`/encounters/${id}/timeline`)
            ]);
            setEncounter(encData);
            setTimeline(timeData);
        } catch (err: any) {
            if (err.status === 404 || err.message?.includes('404')) {
                return notFound();
            }
            setError(err.message || 'Erro ao carregar os dados do atendimento');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEncounter();
    }, [id]);

    const handleClose = async () => {
        if (!confirm('Deseja realmente finalizar este atendimento? Novas edições clínicas não serão mais permitidas.')) {
            return;
        }

        setClosing(true);
        try {
            await api.post(`/encounters/${id}/close`);
            // Refresh timeline to reflect closure
            await fetchEncounter();
        } catch (err: any) {
            alert(err.message || 'Erro ao fechar atendimento');
        } finally {
            setClosing(false);
        }
    };

    if (loading) return <LoadingState message="Carregando prontuário..." />;
    if (error) return <div className="text-red-500">{error}</div>;
    if (!encounter) return null;

    const isClosed = encounter.status === 'closed';

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Atendimento #${encounter.id.substring(0, 8)}`}
                description={`Iniciado em ${new Date(encounter.openedAt).toLocaleString()}`}
                actions={
                    <div className="flex gap-2">
                        {!isClosed && (
                            <Can permission={PERMISSIONS.ENCOUNTER_CLOSE}>
                                <Button variant="secondary" onClick={handleClose} disabled={closing}>
                                    {closing ? 'Finalizando...' : 'Finalizar Atendimento'}
                                </Button>
                            </Can>
                        )}
                        {isClosed && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                                Atendimento Finalizado
                            </span>
                        )}
                    </div>
                }
            />

            {/* Patient Banner */}
            <Card>
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Paciente</h3>
                        {/* Normally we fetch the Patient object or the API returns it nested. For MVP, showing ID. */}
                        <p className="text-lg font-semibold">{encounter.patientId}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-medium text-gray-500 uppercase">Motivo</h3>
                        <p className="text-md">{encounter.reason || 'Consulta de Rotina'}</p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area: SOAP / Active Notes */}
                <div className="lg:col-span-2 space-y-6">
                    {!isClosed && (
                        <Card>
                            <h2 className="text-lg font-medium mb-4">Evolução Clínica (SOAP)</h2>
                            <SoapEditor
                                encounterId={encounter.id}
                                onSaveSuccess={fetchEncounter}
                            />
                        </Card>
                    )}

                    <Card title="Linha do Tempo">
                        {timeline ? (
                            <EncounterTimeline data={timeline} />
                        ) : (
                            <div className="text-gray-500">Nenhum evento registrado.</div>
                        )}
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card title="Resumo">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <span className="font-medium capitalize">{encounter.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Abertura</span>
                                <span>{new Date(encounter.openedAt).toLocaleTimeString()}</span>
                            </div>
                            {encounter.closedAt && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Encerramento</span>
                                    <span>{new Date(encounter.closedAt).toLocaleTimeString()}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function EncounterDetailsPage({ params }: { params: { id: string } }) {
    // Validate UUID format roughly
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id);
    if (!isValidUuid && params.id !== 'novo') {
        notFound();
    }

    return (
        <Suspense fallback={<LoadingState message="Carregando..." />}>
            <EncounterDetailsContent id={params.id} />
        </Suspense>
    );
}

'use client';

import type { EncounterTimelineResponse, EncounterTimelineEvent } from '../../lib/api';

interface EncounterTimelineProps {
    data: EncounterTimelineResponse;
}

export function EncounterTimeline({ data }: EncounterTimelineProps) {
    const { timeline, encounter } = data;

    if (!timeline || timeline.length === 0) {
        return <div className="text-sm text-gray-500">Nenhum evento registrado ainda.</div>;
    }

    const getEventIcon = (kind: string) => {
        switch (kind) {
            case 'encounter.opened': return '🔵';
            case 'encounter.closed': return '🛑';
            case 'note.created': return '📝';
            case 'note.signed': return '✅';
            case 'note.version.created': return '🔄';
            case 'document.attached': return '📎';
            default: return '📍';
        }
    };

    const getEventTitle = (event: EncounterTimelineEvent) => {
        switch (event.kind) {
            case 'encounter.opened': return 'Atendimento Iniciado';
            case 'encounter.closed': return 'Atendimento Finalizado';
            case 'note.created': return 'Evolução Clínica Registrada';
            case 'note.signed': return 'Evolução Clínica Assinada';
            case 'note.version.created': return 'Evolução Editada';
            case 'document.attached': return 'Documento Anexado';
            default: return event.kind;
        }
    };

    const getEventDescription = (event: EncounterTimelineEvent) => {
        // Attempt to extract useful info from event.data schema
        const dataObj = event.data as Record<string, any>;

        if (event.kind === 'encounter.opened' && dataObj.reason) {
            return `Motivo: ${dataObj.reason}`;
        }

        if (event.kind === 'note.created' && dataObj.reason) {
            return `Contexto: ${dataObj.reason}`;
        }

        if (event.kind === 'document.attached' && dataObj.filename) {
            return `Arquivo: ${dataObj.filename} (${Math.round((dataObj.sizeBytes || 0) / 1024)} KB)`;
        }

        return null;
    };

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {timeline.map((event, eventIdx) => (
                    <li key={`${event.entityId}-${event.happenedAt}`}>
                        <div className="relative pb-8">
                            {eventIdx !== timeline.length - 1 ? (
                                <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                                        {getEventIcon(event.kind)}
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm text-gray-900 font-medium">
                                            {getEventTitle(event)}
                                        </p>
                                        {getEventDescription(event) && (
                                            <p className="mt-1 text-sm text-gray-500">
                                                {getEventDescription(event)}
                                            </p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        <time dateTime={event.happenedAt}>
                                            {new Date(event.happenedAt).toLocaleString()}
                                        </time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

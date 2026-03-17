import { EncounterTimelineEvent, EncounterTimelineNote, SoapPayload } from '@/lib/api';
import { soapFormSchema } from '@/lib/schemas';
import { SoapFormState, EMPTY_SOAP } from '../types';

export function resolveParamId(value: string | string[] | undefined): string | null {
    if (!value) {
        return null;
    }
    return Array.isArray(value) ? value[0] : value;
}

export function formatDateTime(value: string | null): string {
    if (!value) {
        return 'n/a';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString('pt-BR');
}

export function eventTitle(kind: EncounterTimelineEvent['kind']): string {
    switch (kind) {
        case 'encounter.opened':
            return 'Caso aberto';
        case 'encounter.closed':
            return 'Caso fechado';
        case 'note.created':
            return 'Nota clínica criada';
        case 'note.signed':
            return 'Nota assinada';
        case 'note.version.created':
            return 'Nova versão de nota';
        case 'document.attached':
            return 'Documento anexado';
        default:
            return kind;
    }
}

function readDataString(data: Record<string, unknown>, key: string): string | null {
    const value = data[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
}

export function eventDescription(event: EncounterTimelineEvent): string | null {
    switch (event.kind) {
        case 'encounter.opened':
        case 'encounter.closed': {
            const reason = readDataString(event.data, 'reason');
            return reason ? `Motivo: ${reason}` : null;
        }
        case 'note.created': {
            const status = readDataString(event.data, 'status');
            const version = event.data.versionNumber;
            const versionText = typeof version === 'number' ? String(version) : null;
            if (!status && !versionText) {
                return null;
            }
            return `status: ${status ?? 'n/a'} | versão: ${versionText ?? 'n/a'}`;
        }
        case 'note.version.created': {
            const reason = readDataString(event.data, 'reason');
            const version = event.data.versionNumber;
            const versionText = typeof version === 'number' ? String(version) : null;
            if (!reason && !versionText) {
                return null;
            }
            return `versão: ${versionText ?? 'n/a'}${reason ? ` | motivo: ${reason}` : ''}`;
        }
        case 'document.attached': {
            const filename = readDataString(event.data, 'filename');
            return filename ? `Arquivo: ${filename}` : null;
        }
        default:
            return null;
    }
}

export function parseSoapValue(value: unknown): SoapFormState {
    if (!value || typeof value !== 'object') {
        return EMPTY_SOAP;
    }
    const obj = value as Record<string, unknown>;
    return {
        subjective: typeof obj.subjective === 'string' ? obj.subjective : '',
        objective: typeof obj.objective === 'string' ? obj.objective : '',
        assessment: typeof obj.assessment === 'string' ? obj.assessment : '',
        plan: typeof obj.plan === 'string' ? obj.plan : ''
    };
}

export function normalizeSoapForm(value: SoapFormState): SoapPayload | null {
    const parsed = soapFormSchema.safeParse(value);
    if (!parsed.success) {
        return null;
    }
    return parsed.data;
}

export function pickLatestNoteId(notes: EncounterTimelineNote[]): string | null {
    if (notes.length === 0) {
        return null;
    }
    const sorted = [...notes].sort((left, right) => {
        return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
    return sorted[0]?.id ?? null;
}

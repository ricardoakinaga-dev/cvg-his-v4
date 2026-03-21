import { append, type AppendAuditInput } from '@cvg-his/audit';
import type { NoteCreateDto, NoteUpdateDto, SoapDto } from '@cvg-his/domain';
import {
  createClinicalNoteSignedEvent,
  createClinicalNoteVersionCreatedEvent,
  type ClinicalNoteSignedEvent,
  type ClinicalNoteVersionCreatedEvent
} from '@cvg-his/events';

import type { RequestContext } from '../../plugins/requestContext.js';
import { appendSensitiveReadAudit } from '../iam/auditSensitiveAccess.js';
import {
  createClinicalNotesRepo,
  type ClinicalNoteRecord,
  type ClinicalNotesRepo
} from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ClinicalNotesRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

type SoapTemplate = {
  key: 'gastro' | 'cardio' | 'trauma';
  label: string;
  soap: SoapDto;
};

export type CreateClinicalNoteResult =
  | {
      kind: 'encounter_not_found';
    }
  | {
      kind: 'created';
      note: ClinicalNoteRecord;
    };

export type UpdateClinicalNoteResult =
  | {
      kind: 'note_not_found';
    }
  | {
      kind: 'note_not_editable';
      note: ClinicalNoteRecord;
    }
  | {
      kind: 'updated';
      note: ClinicalNoteRecord;
    };

export type VersionClinicalNoteResult =
  | {
      kind: 'note_not_found';
    }
  | {
      kind: 'note_not_editable';
      note: ClinicalNoteRecord;
    }
  | {
      kind: 'version_created';
      note: ClinicalNoteRecord;
      event: ClinicalNoteVersionCreatedEvent;
    };

export type SignClinicalNoteResult =
  | {
      kind: 'note_not_found';
    }
  | {
      kind: 'already_signed';
      note: ClinicalNoteRecord;
    }
  | {
      kind: 'signed';
      note: ClinicalNoteRecord;
      event: ClinicalNoteSignedEvent;
    };

const SOAP_TEMPLATES: SoapTemplate[] = [
  {
    key: 'gastro',
    label: 'Gastrointestinal',
    soap: {
      subjective: 'Tutor relata vomitos e inapetencia nas ultimas 24h.',
      objective: 'Leve desidratacao, dor abdominal discreta, temperatura normal.',
      assessment: 'Suspeita de gastrenterite aguda sem sinais de choque.',
      plan: 'Fluidoterapia, antiemetico, dieta leve e reavaliacao em 24h.'
    }
  },
  {
    key: 'cardio',
    label: 'Cardiologia',
    soap: {
      subjective: 'Tutor relata cansaco facil e tosse noturna.',
      objective: 'Sopro sistolico, taquipneia leve e ausculta pulmonar sem crepitacoes.',
      assessment: 'Suspeita de cardiopatia cronica compensada.',
      plan: 'Solicitar ecocardiograma, iniciar terapia conforme laudo, retorno em 7 dias.'
    }
  },
  {
    key: 'trauma',
    label: 'Trauma',
    soap: {
      subjective: 'Tutor relata queda com dor intensa e mancar agudo.',
      objective: 'Dor a palpacao de membro posterior e edema local sem exposicao ossea.',
      assessment: 'Suspeita de trauma ortopedico com possivel fratura fechada.',
      plan: 'Analgesia imediata, radiografias ortogonais e imobilizacao provisoria.'
    }
  }
];

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide x-account-id header.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context. Provide x-user-id header.');
  }

  return actor as WriteActor;
}

export function createClinicalNotesService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createClinicalNotesRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  async function createVersionMutation(
    actor: WriteActor,
    noteId: string,
    input: NoteUpdateDto & { reason: string },
    action: 'note.update' | 'note.version'
  ): Promise<
    | {
        kind: 'note_not_found';
      }
    | {
        kind: 'note_not_editable';
        note: ClinicalNoteRecord;
      }
    | {
        kind: 'updated';
        note: ClinicalNoteRecord;
      }
  > {
    const before = await repo.findById(actor.accountId, noteId);

    if (!before) {
      return { kind: 'note_not_found' };
    }

    if (before.status !== 'draft') {
      return {
        kind: 'note_not_editable',
        note: before
      };
    }

    const after = await repo.updateDraft({
      accountId: actor.accountId,
      noteId,
      soap: input.soap,
      reason: input.reason,
      userId: actor.userId
    });

    if (!after) {
      return {
        kind: 'note_not_editable',
        note: before
      };
    }

    await appendAudit({
      accountId: actor.accountId,
      actorUserId: actor.userId,
      roles: actor.roles,
      entityType: 'clinical_note',
      entityId: noteId,
      action,
      beforeJson: before,
      afterJson: after,
      reason: input.reason,
      requestId: context.requestContext.requestId
    });

    return {
      kind: 'updated',
      note: after
    };
  }

  return {
    listSoapTemplates(): SoapTemplate[] {
      return SOAP_TEMPLATES.map((template) => ({
        key: template.key,
        label: template.label,
        soap: { ...template.soap }
      }));
    },

    async create(input: NoteCreateDto & { reason?: string }): Promise<CreateClinicalNoteResult> {
      const actor = ensureWriteActor(context.requestContext);
      const encounterExists = await repo.findEncounterInAccount(actor.accountId, input.encounterId);

      if (!encounterExists) {
        return { kind: 'encounter_not_found' };
      }

      const note = await repo.createDraft({
        accountId: actor.accountId,
        encounterId: input.encounterId,
        soap: input.soap,
        reason: input.reason,
        userId: actor.userId
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'clinical_note',
        entityId: note.id,
        action: 'note.create',
        beforeJson: null,
        afterJson: note,
        reason: input.reason,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        note
      };
    },

    async getById(noteId: string): Promise<ClinicalNoteRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      const note = await repo.findById(actor.accountId, noteId);

      if (note) {
        await appendSensitiveReadAudit({
          requestContext: context.requestContext,
          entityType: 'clinical_note',
          entityId: noteId,
          action: 'note.read',
          reason: 'medical_record_note_access',
          afterJson: {
            encounterId: note.encounterId,
            status: note.status
          }
        });
      }

      return note;
    },

    async update(
      noteId: string,
      input: NoteUpdateDto & { reason: string }
    ): Promise<UpdateClinicalNoteResult> {
      const actor = ensureWriteActor(context.requestContext);
      return createVersionMutation(actor, noteId, input, 'note.update');
    },

    async version(
      noteId: string,
      input: NoteUpdateDto & { reason: string }
    ): Promise<VersionClinicalNoteResult> {
      const actor = ensureWriteActor(context.requestContext);
      const mutation = await createVersionMutation(actor, noteId, input, 'note.version');

      if (mutation.kind === 'note_not_found') {
        return mutation;
      }

      if (mutation.kind === 'note_not_editable') {
        return mutation;
      }

      const note = mutation.note;
      const event = createClinicalNoteVersionCreatedEvent({
        noteId: note.id,
        encounterId: note.encounterId,
        accountId: actor.accountId,
        versionNumber: note.versionNumber,
        reason: input.reason,
        createdByUserId: actor.userId,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'version_created',
        note,
        event
      };
    },

    async sign(noteId: string): Promise<SignClinicalNoteResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, noteId);

      if (!before) {
        return { kind: 'note_not_found' };
      }

      if (before.status === 'signed') {
        return {
          kind: 'already_signed',
          note: before
        };
      }

      const after = await repo.signDraftById({
        accountId: actor.accountId,
        noteId,
        signedByUserId: actor.userId
      });

      if (!after) {
        const current = await repo.findById(actor.accountId, noteId);
        if (!current) {
          return { kind: 'note_not_found' };
        }

        return {
          kind: 'already_signed',
          note: current
        };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'clinical_note',
        entityId: noteId,
        action: 'note.sign',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      const signedAt = after.signedAt ?? new Date();
      const event = createClinicalNoteSignedEvent({
        noteId: after.id,
        encounterId: after.encounterId,
        accountId: actor.accountId,
        signedByUserId: actor.userId,
        signedAt: signedAt.toISOString(),
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'signed',
        note: after,
        event
      };
    }
  };
}

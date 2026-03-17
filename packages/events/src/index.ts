export type DomainEvent<TPayload = unknown> = {
  name: string;
  timestamp: string;
  payload: TPayload;
};

export type ClinicalNoteSignedPayload = {
  noteId: string;
  encounterId: string;
  accountId: string;
  signedByUserId: string;
  signedAt: string;
  requestId: string;
};

export type ClinicalNoteVersionCreatedPayload = {
  noteId: string;
  encounterId: string;
  accountId: string;
  versionNumber: number;
  reason: string;
  createdByUserId: string;
  requestId: string;
};

export type ClinicalNoteSignedEvent = DomainEvent<ClinicalNoteSignedPayload> & {
  name: 'ClinicalNoteSigned';
};

export type ClinicalNoteVersionCreatedEvent = DomainEvent<ClinicalNoteVersionCreatedPayload> & {
  name: 'ClinicalNoteVersionCreated';
};

export function createClinicalNoteSignedEvent(
  payload: ClinicalNoteSignedPayload
): ClinicalNoteSignedEvent {
  return {
    name: 'ClinicalNoteSigned',
    timestamp: new Date().toISOString(),
    payload
  };
}

export function createClinicalNoteVersionCreatedEvent(
  payload: ClinicalNoteVersionCreatedPayload
): ClinicalNoteVersionCreatedEvent {
  return {
    name: 'ClinicalNoteVersionCreated',
    timestamp: new Date().toISOString(),
    payload
  };
}

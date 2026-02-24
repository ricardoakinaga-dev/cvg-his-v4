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

export type EncounterClosedPayload = {
  encounterId: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  closedByUserId: string;
  closedAt: string;
  billingItemCount: number;
  billingTotal: string;
  requestId: string;
};

export type BillingItemCreatedPayload = {
  billingItemId: string;
  encounterId: string;
  accountId: string;
  serviceId: string | null;
  description: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  status: string;
  createdByUserId: string;
  requestId: string;
};

export type StockConsumedPayload = {
  productId: string;
  encounterId: string;
  accountId: string;
  qty: string;
  unitId: string;
  reason: string;
  consumedByUserId: string;
  requestId: string;
};

export type ClinicalNoteSignedEvent = DomainEvent<ClinicalNoteSignedPayload> & {
  name: 'ClinicalNoteSigned';
};

export type ClinicalNoteVersionCreatedEvent = DomainEvent<ClinicalNoteVersionCreatedPayload> & {
  name: 'ClinicalNoteVersionCreated';
};

export type EncounterClosedEvent = DomainEvent<EncounterClosedPayload> & {
  name: 'EncounterClosed';
};

export type BillingItemCreatedEvent = DomainEvent<BillingItemCreatedPayload> & {
  name: 'BillingItemCreated';
};

export type StockConsumedEvent = DomainEvent<StockConsumedPayload> & {
  name: 'StockConsumed';
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

export function createEncounterClosedEvent(
  payload: EncounterClosedPayload
): EncounterClosedEvent {
  return {
    name: 'EncounterClosed',
    timestamp: new Date().toISOString(),
    payload
  };
}

export function createBillingItemCreatedEvent(
  payload: BillingItemCreatedPayload
): BillingItemCreatedEvent {
  return {
    name: 'BillingItemCreated',
    timestamp: new Date().toISOString(),
    payload
  };
}

export function createStockConsumedEvent(
  payload: StockConsumedPayload
): StockConsumedEvent {
  return {
    name: 'StockConsumed',
    timestamp: new Date().toISOString(),
    payload
  };
}

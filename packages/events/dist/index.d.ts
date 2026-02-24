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
export declare function createClinicalNoteSignedEvent(payload: ClinicalNoteSignedPayload): ClinicalNoteSignedEvent;
export declare function createClinicalNoteVersionCreatedEvent(payload: ClinicalNoteVersionCreatedPayload): ClinicalNoteVersionCreatedEvent;
export declare function createEncounterClosedEvent(payload: EncounterClosedPayload): EncounterClosedEvent;
export declare function createBillingItemCreatedEvent(payload: BillingItemCreatedPayload): BillingItemCreatedEvent;
export declare function createStockConsumedEvent(payload: StockConsumedPayload): StockConsumedEvent;
//# sourceMappingURL=index.d.ts.map
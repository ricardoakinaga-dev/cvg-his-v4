export function createClinicalNoteSignedEvent(payload) {
    return {
        name: 'ClinicalNoteSigned',
        timestamp: new Date().toISOString(),
        payload
    };
}
export function createClinicalNoteVersionCreatedEvent(payload) {
    return {
        name: 'ClinicalNoteVersionCreated',
        timestamp: new Date().toISOString(),
        payload
    };
}
export function createEncounterClosedEvent(payload) {
    return {
        name: 'EncounterClosed',
        timestamp: new Date().toISOString(),
        payload
    };
}
export function createBillingItemCreatedEvent(payload) {
    return {
        name: 'BillingItemCreated',
        timestamp: new Date().toISOString(),
        payload
    };
}
export function createStockConsumedEvent(payload) {
    return {
        name: 'StockConsumed',
        timestamp: new Date().toISOString(),
        payload
    };
}
//# sourceMappingURL=index.js.map
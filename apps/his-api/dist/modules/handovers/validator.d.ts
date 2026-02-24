import type { HandoverItemRecord, HandoverRecord } from './repo.js';
type PublishValidationInput = {
    handover: HandoverRecord;
    items: HandoverItemRecord[];
};
export declare function validateHandoverPublishOrThrow(input: PublishValidationInput): void;
export {};
//# sourceMappingURL=validator.d.ts.map
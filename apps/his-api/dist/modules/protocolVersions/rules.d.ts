import type { ProtocolContentDto } from '@cvg-his/domain';
import type { ProtocolVersionStatus } from './repo.js';
export declare function isDraftVersion(status: ProtocolVersionStatus): boolean;
export declare function getCriticalProtocolContentChanges(before: ProtocolContentDto | Record<string, unknown>, after: ProtocolContentDto): Array<{
    path: string;
    before: unknown;
    after: unknown;
    kind: 'added' | 'removed' | 'changed';
}>;
export declare function hasCriticalProtocolContentChange(before: ProtocolContentDto | Record<string, unknown>, after: ProtocolContentDto): boolean;
export declare function hasChangeReason(value: string | undefined): boolean;
//# sourceMappingURL=rules.d.ts.map
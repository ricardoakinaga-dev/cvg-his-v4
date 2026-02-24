export type DiffChangeKind = 'added' | 'removed' | 'changed';
export type JsonDiffChange = {
    path: string;
    before: unknown;
    after: unknown;
    kind: DiffChangeKind;
};
export declare function buildJsonDiff(before: unknown, after: unknown): JsonDiffChange[];
//# sourceMappingURL=diff.d.ts.map
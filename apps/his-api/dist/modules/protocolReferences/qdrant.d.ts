export type ProtocolReferenceSuggestHit = {
    sourceId: string;
    score: number | null;
    title: string | null;
    metadata: Record<string, unknown>;
    excerpt: null;
};
type QdrantSuggestInput = {
    q: string;
    limit: number;
};
export type ProtocolReferencesSuggestAdapter = {
    suggest: (input: QdrantSuggestInput) => Promise<ProtocolReferenceSuggestHit[]>;
};
type CreateQdrantAdapterInput = {
    baseUrl: string;
    collectionName: string;
    apiKey?: string;
    timeoutMs?: number;
};
export declare function createProtocolReferencesQdrantAdapter(input: CreateQdrantAdapterInput): ProtocolReferencesSuggestAdapter;
export {};
//# sourceMappingURL=qdrant.d.ts.map
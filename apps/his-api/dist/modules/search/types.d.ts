import { z } from 'zod';
export declare const searchQuerySchema: z.ZodObject<{
    q: z.ZodString;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    q: string;
    page: number;
    pageSize: number;
}, {
    q: string;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchOwnerResult = {
    id: string;
    fullName: string;
    phoneMain: string | null;
    document: string | null;
};
export type SearchPatientResult = {
    id: string;
    name: string;
    species: string;
    ownerId: string;
    microchip: string | null;
};
export type GlobalSearchResult = {
    q: string;
    owners: SearchOwnerResult[];
    patients: SearchPatientResult[];
};
//# sourceMappingURL=types.d.ts.map
import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'q must have at least 2 characters').max(120),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(20).default(10)
});

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

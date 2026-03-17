import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchGlobal, SearchResponse } from '../../lib/api';

export const patientKeys = {
    all: ['patients'] as const,
    lists: () => [...patientKeys.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...patientKeys.lists(), { ...filters }] as const,
    details: () => [...patientKeys.all, 'detail'] as const,
    detail: (id: string) => [...patientKeys.details(), id] as const,
};

type UsePatientsListOptions = {
    q?: string;
    page?: number;
    pageSize?: number;
};

export function usePatientsList({ q = '', page = 1, pageSize = 10 }: UsePatientsListOptions) {
    return useQuery({
        queryKey: patientKeys.list({ q, page, pageSize }),
        queryFn: () => searchGlobal({ q, page, pageSize }),
        placeholderData: keepPreviousData, // Keep showing previous data while fetching next page
    });
}

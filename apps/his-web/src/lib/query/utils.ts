import { UseQueryOptions } from '@tanstack/react-query';

// Polling intervals in milliseconds
export const POLLING_INTERVALS = {
    BED_MAP: 30 * 1000,   // 30s
    ALERTS: 30 * 1000,    // 30s
    MAR: 60 * 1000,       // 60s
} as const;

type PollingType = keyof typeof POLLING_INTERVALS;

export function usePollingQueryOptions<TData = unknown, TError = unknown>(
    type: PollingType
): Partial<UseQueryOptions<TData, TError>> {
    return {
        refetchInterval: POLLING_INTERVALS[type],
        refetchIntervalInBackground: false, // Stop polling when tab is inactive
    };
}

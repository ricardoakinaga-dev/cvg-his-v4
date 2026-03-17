import { useCallback, useEffect, useState } from 'react';
import { getMedicationDueDoses } from '../../lib/api';
import { mapLimit } from './concurrency';

export type StayMarOverview = {
    overdueCount: number;
    upcomingCount: number;
    lastUpdatedAt: string;
    error?: string;
};

export type WardMarOverviewMap = Record<string, StayMarOverview>;

export function useWardMarOverview(
    wardId: string | null,
    stayIds: string[],
    windowMin: number = 120
) {
    const [overview, setOverview] = useState<WardMarOverviewMap>({});
    const [loading, setLoading] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

    const fetchOverview = useCallback(async () => {
        if (!wardId || stayIds.length === 0) {
            return;
        }

        setLoading(true);

        // Limit concurrency to avoid saturating the browser/network
        // 4 to 6 is a good balance for HTTP/1.1 or browser limits
        const LIMIT = 5;

        try {
            await mapLimit(stayIds, LIMIT, async (stayId) => {
                try {
                    const response = await getMedicationDueDoses({
                        stayId,
                        windowMin
                    });

                    setOverview((prev) => ({
                        ...prev,
                        [stayId]: {
                            overdueCount: response.overdue.length,
                            upcomingCount: response.upcoming.length,
                            lastUpdatedAt: new Date().toISOString(),
                            error: undefined
                        }
                    }));
                } catch (error) {
                    // On error, keep old state or mark error, but don't break others
                    setOverview((prev) => ({
                        ...prev,
                        [stayId]: {
                            overdueCount: prev[stayId]?.overdueCount ?? 0,
                            upcomingCount: prev[stayId]?.upcomingCount ?? 0,
                            lastUpdatedAt: new Date().toISOString(),
                            error: 'Falha ao carregar'
                        }
                    }));
                }
            });

            setLastRefreshed(new Date());
        } finally {
            setLoading(false);
        }
    }, [wardId, stayIds, windowMin]);

    // Initial fetch when stayIds change significantly or ward changes
    // We need to be careful not to infinite loop if stayIds is a new array every render.
    // The caller should ideally memoize stayIds or we compare length/content.
    // For simplicity, we expose a manual refresh and let the effect run only when wardId changes
    // or if the list of stays changes (JSON stringify comparison for deep check if array is small).

    // Using a ref or similar to avoid re-fetching on every render if stayIds is unstable reference
    // But here we'll assume stayIds list might update.
    const stayIdsKey = stayIds.sort().join(',');

    useEffect(() => {
        if (wardId) {
            void fetchOverview();
        } else {
            setOverview({});
        }
    }, [wardId, stayIdsKey, windowMin]); // eslint-disable-line react-hooks/exhaustive-deps

    return {
        overview,
        loading,
        lastRefreshed,
        refresh: fetchOverview
    };
}

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error: any) => {
                // Don't retry on 401s (auth errors) or 403s
                if (error?.status === 401 || error?.status === 403) return false;
                // Retry once for other errors
                return failureCount < 1;
            },
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
        },
    },
});

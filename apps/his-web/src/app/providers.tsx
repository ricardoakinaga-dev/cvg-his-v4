'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastProvider } from '../components/ui/Toast';
import { queryClient } from '../lib/query/queryClient';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <QueryClientProvider client={queryClient}>
                {children}
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </ToastProvider>
    );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UseDebouncedSearchOptions {
    /** Debounce delay in milliseconds (default: 300ms) */
    debounceMs?: number;
    /** Minimum query length to trigger search (default: 2) */
    minQueryLength?: number;
    /** Base path for URL updates (default: current pathname) */
    basePath?: string;
    /** Page size for pagination */
    pageSize?: number;
    /** Whether to update URL with search params */
    updateUrl?: boolean;
}

interface UseDebouncedSearchResult {
    /** Current search query */
    query: string;
    /** Set search query */
    setQuery: (q: string) => void;
    /** Debounced query (after delay and min length check) */
    debouncedQuery: string;
    /** Current page number */
    page: number;
    /** Set page number */
    setPage: (p: number) => void;
    /** Whether the query is too short to search */
    isQueryTooShort: boolean;
    /** Reset search to initial state */
    reset: () => void;
    /** Total pages based on total count */
    totalPages: (total: number) => number;
}

/**
 * useDebouncedSearch - Hook for debounced search with query protection
 * 
 * Features:
 * - Debounces search input to reduce API calls
 * - Protects against short queries (min 2 characters by default)
 * - Syncs with URL search params
 * - Handles pagination state
 * 
 * Usage:
 * ```tsx
 * const { query, setQuery, debouncedQuery, page, setPage, isQueryTooShort } = useDebouncedSearch({
 *     debounceMs: 300,
 *     minQueryLength: 2
 * });
 * 
 * useEffect(() => {
 *     if (!isQueryTooShort) {
 *         fetchData(debouncedQuery, page);
 *     }
 * }, [debouncedQuery, page, isQueryTooShort]);
 * ```
 */
export function useDebouncedSearch(options: UseDebouncedSearchOptions = {}): UseDebouncedSearchResult {
    const {
        debounceMs = 300,
        minQueryLength = 2,
        pageSize = 10,
        updateUrl = true
    } = options;

    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Initialize state from URL params
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    
    // Track if component is mounted
    const isMountedRef = useRef(true);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Check if query is too short
    const isQueryTooShort = query.length > 0 && query.length < minQueryLength;

    // Debounce effect
    useEffect(() => {
        isMountedRef.current = true;
        
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Don't debounce if query is too short
        if (isQueryTooShort) {
            return;
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
                setDebouncedQuery(query);
            }
        }, debounceMs);

        return () => {
            isMountedRef.current = false;
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query, debounceMs, isQueryTooShort]);

    // Update URL when query or page changes
    useEffect(() => {
        if (!updateUrl) return;

        const params = new URLSearchParams();
        if (query) params.set('q', query);
        if (page > 1) params.set('page', page.toString());
        
        const queryString = params.toString();
        const basePath = options.basePath || window.location.pathname;
        const newUrl = queryString ? `${basePath}?${queryString}` : basePath;
        
        router.replace(newUrl, { scroll: false });
    }, [query, page, router, updateUrl, options.basePath]);

    // Reset function
    const reset = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
        setPage(1);
    }, []);

    // Calculate total pages
    const totalPages = useCallback((total: number): number => {
        return Math.ceil(total / pageSize);
    }, [pageSize]);

    // Set query and reset page
    const handleSetQuery = useCallback((newQuery: string) => {
        setQuery(newQuery);
        if (page !== 1) {
            setPage(1);
        }
    }, [page]);

    return {
        query,
        setQuery: handleSetQuery,
        debouncedQuery,
        page,
        setPage,
        isQueryTooShort,
        reset,
        totalPages
    };
}

/**
 * useSearchInput - Simplified hook for basic search input with keyboard shortcuts
 */
export function useSearchInput(onSearch: (query: string) => void) {
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus shortcut (Cmd/Ctrl + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
            if (e.key === 'Escape' && document.activeElement === inputRef.current) {
                inputRef.current?.blur();
                setValue('');
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onSearch(value.trim());
        }
    }, [value, onSearch]);

    return {
        value,
        setValue,
        inputRef,
        handleSubmit,
        clear: () => setValue('')
    };
}

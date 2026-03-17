import { useEffect, useState } from 'react';

/**
 * Custom hook to detect if a media query matches.
 * @param query The media query string (e.g. "(min-width: 1024px)")
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
    // Safe SSR check
    const getMatches = (query: string): boolean => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    };

    const [matches, setMatches] = useState<boolean>(getMatches(query));

    useEffect(() => {
        const handleChange = () => {
            setMatches(getMatches(query));
        };

        const matchMedia = window.matchMedia(query);

        // Triggered at the first client-side load and if query changes
        handleChange();

        // Listen matchMedia
        if (matchMedia.addListener) {
            matchMedia.addListener(handleChange);
        } else {
            matchMedia.addEventListener('change', handleChange);
        }

        return () => {
            if (matchMedia.removeListener) {
                matchMedia.removeListener(handleChange);
            } else {
                matchMedia.removeEventListener('change', handleChange);
            }
        };
    }, [query]);

    return matches;
}

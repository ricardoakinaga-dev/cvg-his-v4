'use client';

import { theme, px } from '../lib/theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { searchGlobal, type SearchResponse } from '../lib/api';
import { SearchResults } from './SearchResults';

export function SearchBar(): JSX.Element {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);

  const normalizedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const current = containerRef.current;
      if (!current) {
        return;
      }

      if (event.target instanceof Node && !current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    let canceled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchGlobal({ q: normalizedQuery, page: 1, pageSize: 20 });
        if (canceled) {
          return;
        }
        setResults(data);
        setError(null);
      } catch (error) {
        if (canceled) {
          return;
        }
        setResults(null);
        setError(error instanceof Error ? error.message : 'Falha ao buscar.');
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }, 240);

    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [normalizedQuery]);

  const handleSelect = (href: string) => {
    setQuery('');
    setOpen(false);
    router.push(href);
  };

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minWidth: 240, maxWidth: 620, position: 'relative' }}
    >
      <input
        type="search"
        placeholder="Buscar pacientes, tutores, microchip..."
        aria-label="Busca global"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        style={{
          width: '100%',
          background: theme.colors.primary,
          color: '#cbd5e1', // Mantendo cor de texto clara específica do input dark
          border: '1px solid #334155', // Mantendo borda específica do tema dark do input
          borderRadius: px(theme.radius.md),
          padding: '10px 12px',
          outline: 'none'
        }}
      />

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            maxHeight: 420,
            overflowY: 'auto',
            background: theme.colors.pageBg,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: px(theme.radius.md),
            padding: px(theme.spacing.sm),
            boxShadow: '0 16px 35px -24px rgba(15, 23, 42, 0.8)'
          }}
        >
          <SearchResults
            query={query}
            loading={loading}
            error={error}
            data={results}
            onSelect={handleSelect}
          />
        </div>
      )}
    </div>
  );
}

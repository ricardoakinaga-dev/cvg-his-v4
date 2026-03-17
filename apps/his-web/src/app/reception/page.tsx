'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { searchGlobal, type SearchResponse, type SearchOwnerResult, type SearchPatientResult } from '@/lib/api';
import { SearchResults } from '@/components/SearchResults';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { px, theme } from '@/lib/theme';
import { Spinner } from '@/components/ui/Primitives';

export default function ReceptionPage() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<SearchResponse | null>(null);

    // ---- Search Logic (Debounced) ----
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults(null);
            setError(null);
            setLoading(false);
            return;
        }

        let canceled = false;
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const data = await searchGlobal({ q: trimmed, page: 1, pageSize: 20 });
                if (canceled) return;
                setResults(data);
                setError(null);
            } catch (err) {
                if (canceled) return;
                setResults(null);
                setError(err instanceof Error ? err.message : 'Erro na busca');
            } finally {
                if (!canceled) setLoading(false);
            }
        }, 240);

        return () => {
            canceled = true;
            clearTimeout(timer);
        };
    }, [query]);


    // ---- Keyboard Shortcuts ----
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // "Slash" to focus
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault();
                document.getElementById('reception-search')?.focus();
            }
            // "Escape" to clear
            if (e.key === 'Escape') {
                setQuery('');
                setResults(null);
                document.getElementById('reception-search')?.blur();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ---- Renderers ----
    const renderOwner = useCallback((owner: SearchOwnerResult) => (
        <Card style={{ padding: px(16), border: `1px solid ${theme.colors.border}`, marginBottom: px(8) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{owner.fullName}</div>
                    <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>
                        {owner.document || 'Sem doc'} • {owner.phoneMain || 'Sem tel'}
                    </div>
                </div>
                <Link href={`/owners/${owner.id}`}>
                    <Button size="sm" variant="secondary">Abrir Tutor</Button>
                </Link>
            </div>
        </Card>
    ), []);

    const renderPatient = useCallback((patient: SearchPatientResult) => (
        <Card style={{ padding: px(16), border: `1px solid ${theme.colors.border}`, marginBottom: px(8) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
                    <div style={{
                        width: px(32), height: px(32), borderRadius: '50%',
                        background: theme.colors.surface, border: `1px solid ${theme.colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 600, color: theme.colors.textSecondary, fontSize: px(12)
                    }}>
                        {patient.species.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{patient.name}</div>
                        <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>
                            Microchip: {patient.microchip || 'N/A'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: px(8) }}>
                    <Link href={`/patients/${patient.id}`}>
                        <Button size="sm" variant="secondary">Abrir</Button>
                    </Link>
                    <Link href={`/reception/start?patientId=${patient.id}`}>
                        <Button size="sm" variant="primary">Iniciar Atendimento</Button>
                    </Link>
                </div>
            </div>
        </Card>
    ), []);

    return (
        <div style={{ maxWidth: px(900), margin: '0 auto', padding: px(24) }}>
            {/* Header */}
            <div style={{ marginBottom: px(32), textAlign: 'center' }}>
                <h1 style={{ fontSize: px(28), fontWeight: 700, color: theme.colors.textPrimary, marginBottom: px(8) }}>Recepção</h1>
                <p style={{ color: theme.colors.textSecondary, fontSize: px(16) }}>
                    Buscar tutor/paciente, cadastrar e iniciar atendimento
                </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: px(16), marginBottom: px(32) }}>
                <Link href="/owners/new">
                    <Button variant="secondary" rightIcon={<span style={{ fontSize: 16 }}>+</span>}>Novo Tutor</Button>
                </Link>
                <Link href="/patients/new">
                    <Button variant="secondary" rightIcon={<span style={{ fontSize: 16 }}>+</span>}>Novo Paciente</Button>
                </Link>
                {/* Placeholder for Quick Create */}
                <Button variant="ghost" disabled title="Em breve">Cadastro Rápido</Button>
            </div>

            {/* Main Search Input */}
            <div style={{ position: 'relative', marginBottom: px(24) }}>
                <input
                    id="reception-search"
                    type="search"
                    autoFocus
                    placeholder="Buscar nome, telefone, documento, microchip... (Pressione '/')"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                        width: '100%',
                        height: px(56),
                        fontSize: px(18),
                        padding: `0 ${px(24)}`,
                        borderRadius: px(30), // Pill shape
                        border: `2px solid ${theme.colors.border}`,
                        outline: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = theme.colors.primary;
                        e.target.style.boxShadow = `0 0 0 4px ${theme.colors.primary}20`;
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = theme.colors.border;
                        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)';
                    }}
                />
                {loading && (
                    <div style={{ position: 'absolute', right: px(24), top: '50%', transform: 'translateY(-50%)' }}>
                        <Spinner size={30} />
                    </div>
                )}
            </div>

            {/* Results */}
            {(query.trim().length >= 2 || results) && (
                <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                    <style dangerouslySetInnerHTML={{ __html: '@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }' }} />
                    <SearchResults
                        query={query}
                        loading={loading}
                        error={error}
                        data={results}
                        onSelect={() => { }} // No-op because we handle actions in renderers
                        renderOwner={renderOwner}
                        renderPatient={renderPatient}
                    />
                </div>
            )}
        </div>
    );
}

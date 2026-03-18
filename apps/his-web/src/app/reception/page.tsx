'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { searchGlobal, type SearchResponse, type SearchOwnerResult, type SearchPatientResult, type EncounterReceivableStatus, ApiError } from '@/lib/api';
import { SearchResults } from '@/components/SearchResults';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { px, theme } from '@/lib/theme';
import { Spinner } from '@/components/ui/Primitives';
import { useEncounterReceivables, useSettleEncounterReceivable } from '@/features/encounter/queries';

function money(value: number) {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

export default function ReceptionPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [receivableStatus, setReceivableStatus] = useState<EncounterReceivableStatus | undefined>('open');
  const [receivableSearch, setReceivableSearch] = useState('');
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('0');
  const [settleNotes, setSettleNotes] = useState('');

  const receivablesQuery = useEncounterReceivables({ status: receivableStatus, search: receivableSearch.trim() || undefined, page: 1, pageSize: 20 });
  const settleMutation = useSettleEncounterReceivable();

  const selectedReceivable = useMemo(() => receivablesQuery.data?.data.find((item) => item.id === selectedReceivableId) ?? null, [receivablesQuery.data?.data, selectedReceivableId]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('reception-search')?.focus();
      }
      if (e.key === 'Escape') {
        setQuery('');
        setResults(null);
        document.getElementById('reception-search')?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderOwner = useCallback((owner: SearchOwnerResult) => (
    <Card style={{ padding: px(16), border: `1px solid ${theme.colors.border}`, marginBottom: px(8) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{owner.fullName}</div>
          <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>{owner.document || 'Sem doc'} • {owner.phoneMain || 'Sem tel'}</div>
        </div>
        <Link href={`/owners/${owner.id}`}><Button size="sm" variant="secondary">Abrir Tutor</Button></Link>
      </div>
    </Card>
  ), []);

  const renderPatient = useCallback((patient: SearchPatientResult) => (
    <Card style={{ padding: px(16), border: `1px solid ${theme.colors.border}`, marginBottom: px(8) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
          <div style={{ width: px(32), height: px(32), borderRadius: '50%', background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: theme.colors.textSecondary, fontSize: px(12) }}>{patient.species.substring(0, 2).toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>{patient.name}</div>
            <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>Microchip: {patient.microchip || 'N/A'}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: px(8) }}>
          <Link href={`/patients/${patient.id}`}><Button size="sm" variant="secondary">Abrir</Button></Link>
          <Link href={`/reception/start?patientId=${patient.id}`}><Button size="sm" variant="primary">Iniciar Atendimento</Button></Link>
        </div>
      </div>
    </Card>
  ), []);

  const handleSelectReceivable = (receivableId: string, outstanding: number, notes: string | null) => {
    setSelectedReceivableId(receivableId);
    setSettleAmount(String(outstanding));
    setSettleNotes(notes ?? '');
  };

  const handleSettle = async () => {
    if (!selectedReceivable) return;
    try {
      await settleMutation.mutateAsync({ receivableId: selectedReceivable.id, input: { amountPaid: Number(settleAmount), notes: settleNotes || null } });
      setSelectedReceivableId(null);
    } catch (error) {
      alert(error instanceof ApiError ? error.message : 'Falha ao quitar recebível.');
    }
  };

  return (
    <div style={{ maxWidth: px(1180), margin: '0 auto', padding: px(24), display: 'grid', gap: px(24) }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: px(28), fontWeight: 700, color: theme.colors.textPrimary, marginBottom: px(8) }}>Recepção</h1>
        <p style={{ color: theme.colors.textSecondary, fontSize: px(16) }}>Busca rápida, abertura de atendimento e visão global de contas a receber.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: px(16), flexWrap: 'wrap' }}>
        <Link href="/owners/new"><Button variant="secondary" rightIcon={<span style={{ fontSize: 16 }}>+</span>}>Novo Tutor</Button></Link>
        <Link href="/patients/new"><Button variant="secondary" rightIcon={<span style={{ fontSize: 16 }}>+</span>}>Novo Paciente</Button></Link>
        <Link href="/reception/start"><Button variant="ghost">Triagem / início</Button></Link>
      </div>

      <Card style={{ padding: px(20) }}>
        <div style={{ position: 'relative' }}>
          <input
            id="reception-search"
            type="search"
            autoFocus
            placeholder="Buscar nome, telefone, documento, microchip... (Pressione '/')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', height: px(56), fontSize: px(18), padding: `0 ${px(24)}`, borderRadius: px(30), border: `2px solid ${theme.colors.border}`, outline: 'none' }}
          />
          {loading && <div style={{ position: 'absolute', right: px(24), top: '50%', transform: 'translateY(-50%)' }}><Spinner size={30} /></div>}
        </div>
      </Card>

      {(query.trim().length >= 2 || results) && (
        <SearchResults query={query} loading={loading} error={error} data={results} onSelect={() => {}} renderOwner={renderOwner} renderPatient={renderPatient} />
      )}

      <Card style={{ padding: px(20) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(16), flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: px(16) }}>
          <div>
            <h2 style={{ margin: 0, fontSize: px(20) }}>Contas a receber</h2>
            <p style={{ margin: `${px(6)} 0 0`, color: theme.colors.textSecondary, fontSize: px(14) }}>Fila global para recepção/financeiro registrar pagamentos posteriores.</p>
          </div>
          <div style={{ display: 'flex', gap: px(12), flexWrap: 'wrap' }}>
            <div style={{ minWidth: px(180) }}>
              <Input label="Buscar tutor/paciente" value={receivableSearch} onChange={(e) => setReceivableSearch(e.target.value)} />
            </div>
            <div style={{ minWidth: px(160), display: 'flex', flexDirection: 'column', gap: px(6) }}>
              <label style={{ fontSize: px(14), fontWeight: 500 }}>Status</label>
              <select value={receivableStatus ?? ''} onChange={(e) => setReceivableStatus((e.target.value || undefined) as EncounterReceivableStatus | undefined)} style={{ height: px(40), borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, padding: `0 ${px(12)}` }}>
                <option value="">Todos</option>
                <option value="open">Em aberto</option>
                <option value="settled">Quitados</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: px(12), marginBottom: px(16) }}>
          <MetricCard label="Em aberto" value={String(receivablesQuery.data?.openCount ?? 0)} />
          <MetricCard label="Quitados" value={String(receivablesQuery.data?.settledCount ?? 0)} />
          <MetricCard label="Saldo total" value={money(receivablesQuery.data?.totalOutstanding ?? 0)} accent="primary" />
          <MetricCard label="Recebido acumulado" value={money(receivablesQuery.data?.totalSettled ?? 0)} />
        </div>

        {receivablesQuery.isLoading ? <p>Carregando contas a receber...</p> : receivablesQuery.data?.data.length ? (
          <div style={{ display: 'grid', gap: px(12) }}>
            {receivablesQuery.data.data.map((item) => (
              <Card key={item.id} style={{ padding: px(16), border: `1px solid ${selectedReceivableId === item.id ? theme.colors.primary : theme.colors.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(16), flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: px(6) }}>
                    <strong>{item.patientName}</strong>
                    <span style={{ color: theme.colors.textSecondary, fontSize: px(14) }}>{item.ownerName} · {item.ownerPhoneMain || 'sem telefone'}</span>
                    <span style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>Atendimento {item.encounterStatus === 'closed' ? 'fechado' : 'aberto'} · emissão {new Date(item.issuedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div style={{ display: 'grid', gap: px(6), justifyItems: 'end' }}>
                    <span style={{ fontWeight: 700 }}>{money(item.amountOutstanding)}</span>
                    <span style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>Recebido {money(item.amountPaid)} de {money(item.totalAmount)}</span>
                    <div style={{ display: 'flex', gap: px(8) }}>
                      <Link href={`/encounters/${item.encounterId}?tab=billing`}><Button variant="secondary" size="sm">Abrir conta</Button></Link>
                      <Button size="sm" onClick={() => handleSelectReceivable(item.id, item.amountOutstanding, item.notes)} disabled={item.status === 'settled'}>{item.status === 'settled' ? 'Quitado' : 'Receber'}</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : <p style={{ color: theme.colors.textSecondary }}>Nenhuma conta a receber encontrada com os filtros atuais.</p>}
      </Card>

      {selectedReceivable && (
        <Card style={{ padding: px(20), border: `1px solid ${theme.colors.primary}` }}>
          <h3 style={{ marginTop: 0 }}>Registrar pagamento posterior</h3>
          <p style={{ color: theme.colors.textSecondary, fontSize: px(14) }}>{selectedReceivable.patientName} · {selectedReceivable.ownerName} · saldo {money(selectedReceivable.amountOutstanding)}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: px(12) }}>
            <Input label="Valor recebido" type="number" min="0.01" step="0.01" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
            <Input label="Observação" value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: px(12), marginTop: px(16) }}>
            <Button onClick={() => void handleSettle()} isLoading={settleMutation.isPending}>Confirmar pagamento</Button>
            <Button variant="ghost" onClick={() => setSelectedReceivableId(null)}>Cancelar</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'primary' }) {
  return <div style={{ border: `1px solid ${accent === 'primary' ? theme.colors.primary : theme.colors.border}`, borderRadius: px(theme.radius.md), padding: px(14), background: accent === 'primary' ? '#eff6ff' : theme.colors.surface }}><div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{label}</div><div style={{ marginTop: px(6), fontSize: px(20), fontWeight: 700 }}>{value}</div></div>;
}

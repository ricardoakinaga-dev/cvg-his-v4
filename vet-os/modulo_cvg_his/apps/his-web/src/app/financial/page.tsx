'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ApiError, type EncounterReceivableListItem } from '@/lib/api';
import { useEncounterReceivables, useSettleEncounterReceivable } from '@/features/encounter/queries';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { px, theme } from '@/lib/theme';

function money(value: number) {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export default function FinancialPage() {
  const [status, setStatus] = useState<'open' | 'settled' | ''>('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EncounterReceivableListItem | null>(null);
  const [settleAmount, setSettleAmount] = useState('0');
  const [settleNotes, setSettleNotes] = useState('');

  const receivablesQuery = useEncounterReceivables({ status: status || undefined, search: search.trim() || undefined, page: 1, pageSize: 50 });
  const settleMutation = useSettleEncounterReceivable();

  const payments = useMemo(() => (receivablesQuery.data?.data ?? []).flatMap((item) => item.payments ?? []).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()).slice(0, 20), [receivablesQuery.data?.data]);

  const open = (item: EncounterReceivableListItem) => {
    setSelected(item);
    setSettleAmount(String(item.amountOutstanding));
    setSettleNotes(item.notes ?? '');
  };

  const handleSettle = async () => {
    if (!selected) return;
    try {
      await settleMutation.mutateAsync({ receivableId: selected.id, input: { amountPaid: Number(settleAmount), notes: settleNotes || null } });
      setSelected(null);
    } catch (error) {
      alert(error instanceof ApiError ? error.message : 'Falha ao registrar baixa.');
    }
  };

  return (
    <div style={{ maxWidth: px(1240), margin: '0 auto', padding: px(24), display: 'grid', gap: px(24) }}>
      <div>
        <h1 style={{ margin: 0, fontSize: px(28), color: theme.colors.textPrimary }}>Financeiro</h1>
        <p style={{ margin: `${px(8)} 0 0`, color: theme.colors.textSecondary }}>Tela dedicada para contas a receber, parcelas, baixas parciais e histórico recente.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: px(16), alignItems: 'start' }}>
        <Card style={{ padding: px(20) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(16), flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: px(16) }}>
            <div>
              <h2 style={{ margin: 0, fontSize: px(20) }}>Contas a receber</h2>
              <p style={{ margin: `${px(6)} 0 0`, color: theme.colors.textSecondary, fontSize: px(14) }}>Cada parcela aparece separadamente, com vencimento e histórico de baixas.</p>
            </div>
            <div style={{ display: 'flex', gap: px(12), flexWrap: 'wrap' }}>
              <div style={{ minWidth: px(220) }}>
                <Input label="Buscar tutor/paciente" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div style={{ minWidth: px(160), display: 'flex', flexDirection: 'column', gap: px(6) }}>
                <label style={{ fontSize: px(14), fontWeight: 500 }}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as 'open' | 'settled' | '')} style={{ height: px(40), borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, padding: `0 ${px(12)}` }}>
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

          {receivablesQuery.isLoading ? <p>Carregando contas...</p> : receivablesQuery.data?.data.length ? (
            <div style={{ display: 'grid', gap: px(12) }}>
              {receivablesQuery.data.data.map((item) => (
                <Card key={item.id} style={{ padding: px(16), border: `1px solid ${selected?.id === item.id ? theme.colors.primary : theme.colors.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: px(16), flexWrap: 'wrap' }}>
                    <div style={{ display: 'grid', gap: px(6) }}>
                      <strong>{item.patientName} · {item.installmentLabel}</strong>
                      <span style={{ color: theme.colors.textSecondary, fontSize: px(14) }}>{item.ownerName} · {item.ownerPhoneMain || 'sem telefone'}</span>
                      <span style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>Emissão {formatDate(item.issuedAt)} · vencimento {formatDate(item.dueAt)} · atendimento {item.encounterStatus === 'closed' ? 'fechado' : 'aberto'}</span>
                    </div>
                    <div style={{ display: 'grid', gap: px(6), justifyItems: 'end' }}>
                      <span style={{ fontWeight: 700 }}>{money(item.amountOutstanding)}</span>
                      <span style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>Recebido {money(item.amountPaid)} de {money(item.amountOriginal)}</span>
                      <div style={{ display: 'flex', gap: px(8) }}>
                        <Link href={`/encounters/${item.encounterId}?tab=billing`}><Button variant="secondary" size="sm">Abrir conta</Button></Link>
                        <Button size="sm" onClick={() => open(item)} disabled={item.status === 'settled'}>{item.status === 'settled' ? 'Quitado' : 'Registrar baixa'}</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : <p style={{ color: theme.colors.textSecondary }}>Nenhuma conta encontrada com os filtros atuais.</p>}
        </Card>

        <div style={{ display: 'grid', gap: px(16) }}>
          <Card style={{ padding: px(20) }}>
            <h3 style={{ marginTop: 0 }}>Baixa selecionada</h3>
            {selected ? (
              <>
                <p style={{ color: theme.colors.textSecondary, fontSize: px(14) }}>{selected.patientName} · {selected.installmentLabel} · aberto {money(selected.amountOutstanding)}</p>
                <div style={{ display: 'grid', gap: px(12) }}>
                  <Input label="Valor recebido" type="number" min="0.01" step="0.01" value={settleAmount} onChange={(e) => setSettleAmount(e.target.value)} />
                  <Input label="Observação" value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} />
                  <Button onClick={() => void handleSettle()} isLoading={settleMutation.isPending}>Confirmar baixa</Button>
                </div>
              </>
            ) : <p style={{ color: theme.colors.textSecondary }}>Escolha uma parcela em aberto para registrar a baixa.</p>}
          </Card>

          <Card style={{ padding: px(20) }}>
            <h3 style={{ marginTop: 0 }}>Histórico recente</h3>
            <div style={{ display: 'grid', gap: px(10) }}>
              {payments.length ? payments.map((payment) => (
                <div key={payment.id} style={{ borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: px(10) }}>
                  <div style={{ fontWeight: 600 }}>{money(payment.amountPaid)} · {formatDate(payment.paidAt)}</div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>{payment.notes || 'Sem observação'}</div>
                </div>
              )) : <p style={{ color: theme.colors.textSecondary }}>Sem pagamentos recentes nos itens carregados.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'primary' }) {
  return <div style={{ border: `1px solid ${accent === 'primary' ? theme.colors.primary : theme.colors.border}`, borderRadius: px(theme.radius.md), padding: px(14), background: accent === 'primary' ? '#eff6ff' : theme.colors.surface }}><div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{label}</div><div style={{ marginTop: px(6), fontSize: px(20), fontWeight: 700 }}>{value}</div></div>;
}

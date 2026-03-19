'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { px, row, theme } from '@/lib/theme';

// =====================
// Types
// =====================

type DashboardData = {
  period: { dateFrom: string; dateTo: string };
  appointments: { total: number; completed: number; cancelled: number; noShow: number; scheduled: number; inProgress: number };
  appointmentsByDay: Array<{ date: string; count: number; completed: number }>;
  financial: { totalReceived: number; paymentCount: number; totalOutstanding: number; openReceivables: number; byMethod: Array<{ method: string; total: number; count: number }> };
  revenueByDay: Array<{ date: string; total: number }>;
  stock: { totalProducts: number; totalUnits: number; lowStock: number; expiringLots: number };
  cash: { hasOpenRegister: boolean; openingAmount?: number; currentBalance?: number; openedAt?: string };
  patients: { total: number; newThisMonth: number };
  exams: { total: number; pending: number; completed: number };
  inpatient: { activeStays: number; dischargedThisWeek: number; totalBeds: number; occupiedBeds: number };
  generatedAt: string;
};

// =====================
// Helpers
// =====================

function money(value: number): string {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function percent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function getDefaultDateRange() {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

// =====================
// Components
// =====================

function KPICard({ icon, label, value, sub, accent, onClick }: {
  icon: string; label: string; value: string; sub?: string; accent?: string; onClick?: () => void
}) {
  return (
    <Card
      onClick={onClick}
      style={{
        padding: px(20),
        border: `1px solid ${accent || theme.colors.border}`,
        borderRadius: px(theme.radius.md),
        background: accent ? `${accent}08` : theme.colors.surface,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
        <span style={{ fontSize: px(28) }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: px(12), color: theme.colors.textSecondary, marginBottom: px(2) }}>{label}</div>
          <div style={{ fontSize: px(26), fontWeight: 700, color: accent || theme.colors.textPrimary }}>{value}</div>
          {sub && <div style={{ fontSize: px(11), color: theme.colors.textSecondary, marginTop: px(2) }}>{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

function MiniChart({ data, label, color, valueKey }: {
  data: Array<Record<string, any>>; label: string; color: string; valueKey: string
}) {
  if (!data || data.length === 0) return null;

  const values = data.map(d => d[valueKey] ?? 0);
  const max = Math.max(...values, 1);

  return (
    <Card style={{ padding: px(16) }}>
      <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(8) }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: px(3), height: px(60) }}>
        {values.map((v, i) => (
          <div
            key={i}
            title={`${data[i].date}: ${v}`}
            style={{
              flex: 1,
              height: `${(v / max) * 100}%`,
              background: color,
              borderRadius: `${px(2)} ${px(2)} 0 0`,
              minHeight: px(2),
              transition: 'height 0.3s'
            }}
          />
        ))}
      </div>
    </Card>
  );
}

function MethodPie({ methods }: { methods: Array<{ method: string; total: number }> }) {
  const methodLabels: Record<string, string> = {
    cash: '💵 Dinheiro',
    credit_card: '💳 Crédito',
    debit_card: '💳 Débito',
    pix: '⚡ PIX',
    bank_transfer: '🏦 Transferência',
    check: '📝 Cheque',
    insurance: '🏥 Convênio',
    other: '📋 Outro'
  };

  const total = methods.reduce((s, m) => s + m.total, 0);

  return (
    <Card style={{ padding: px(16) }}>
      <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(12) }}>
        💳 Recebimentos por Método
      </div>
      {methods.length === 0 ? (
        <div style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: px(20) }}>
          Sem pagamentos no período
        </div>
      ) : (
        methods.map((m) => (
          <div key={m.method} style={{ marginBottom: px(8) }}>
            <div style={{ ...row(8), justifyContent: 'space-between', marginBottom: px(4) }}>
              <span style={{ fontSize: px(13) }}>{methodLabels[m.method] || m.method}</span>
              <span style={{ fontSize: px(13), fontWeight: 600 }}>{money(m.total)}</span>
            </div>
            <div style={{ height: px(6), background: theme.colors.border, borderRadius: px(3), overflow: 'hidden' }}>
              <div style={{
                width: `${total > 0 ? (m.total / total) * 100 : 0}%`,
                height: '100%',
                background: m.method === 'pix' ? '#32BCAD' : m.method === 'credit_card' ? '#1565C0' : theme.colors.primary,
                borderRadius: px(3)
              }} />
            </div>
          </div>
        ))
      )}
    </Card>
  );
}

// =====================
// Main Page
// =====================

export default function DashboardPage() {
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<DashboardData>(
        `/dashboard?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { method: 'GET' }
      );
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro ao carregar dashboard', 500, null));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading && !error) return <LoadingState message="Carregando dashboard..." />;

  return (
    <div style={{ maxWidth: px(1280), margin: '0 auto', padding: px(24) }}>
      {/* Header */}
      <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'center', marginBottom: px(24) }}>
        <div>
          <h1 style={{ margin: 0, fontSize: px(28), fontWeight: 700 }}>📊 Dashboard Executivo</h1>
          <p style={{ margin: `${px(4)} 0 0`, color: theme.colors.textSecondary }}>
            Visão geral do negócio — {new Date(dateFrom + 'T12:00').toLocaleDateString('pt-BR')} a {new Date(dateTo + 'T12:00').toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div style={{ ...row(8), alignItems: 'flex-end' }}>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} label="De" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} label="Até" />
          <Button variant="primary" onClick={fetchData} isLoading={loading}>Atualizar</Button>
        </div>
      </div>

      {error && <ErrorBanner title="Erro" message={error.message} onRetry={fetchData} />}

      {data && (
        <>
          {/* Row 1: Main KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: px(16), marginBottom: px(16) }}>
            <KPICard
              icon="📅"
              label="Agendamentos"
              value={String(data.appointments.total)}
              sub={`${data.appointments.completed} concluídos • ${percent(data.appointments.completed, data.appointments.total)}`}
              accent={theme.colors.primary}
            />
            <KPICard
              icon="💰"
              label="Recebido"
              value={money(data.financial.totalReceived)}
              sub={`${data.financial.paymentCount} pagamentos`}
              accent="#2E7D32"
            />
            <KPICard
              icon="⏳"
              label="A Receber"
              value={money(data.financial.totalOutstanding)}
              sub={`${data.financial.openReceivables} contas em aberto`}
              accent={data.financial.totalOutstanding > 0 ? '#E65100' : '#2E7D32'}
            />
            <KPICard
              icon="💵"
              label="Caixa"
              value={data.cash.hasOpenRegister ? money(data.cash.currentBalance!) : 'Fechado'}
              sub={data.cash.hasOpenRegister ? `Aberto desde ${new Date(data.cash.openedAt!).toLocaleTimeString('pt-BR')}` : 'Nenhum caixa aberto'}
              accent={data.cash.hasOpenRegister ? '#1565C0' : '#546E7A'}
            />
          </div>

          {/* Row 2: Secondary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: px(16), marginBottom: px(16) }}>
            <KPICard icon="👥" label="Pacientes" value={String(data.patients.total)} sub={`+${data.patients.newThisMonth} este mês`} />
            <KPICard icon="🔬" label="Exames" value={String(data.exams.total)} sub={`${data.exams.pending} pendentes`} accent={data.exams.pending > 0 ? '#E65100' : undefined} />
            <KPICard icon="🏥" label="Internações Ativas" value={String(data.inpatient.activeStays)} sub={`${data.inpatient.occupiedBeds}/${data.inpatient.totalBeds} leitos`} />
            <KPICard icon="📦" label="Estoque" value={String(data.stock.totalUnits)} sub={`${data.stock.lowStock} com estoque baixo`} accent={data.stock.lowStock > 0 ? '#E65100' : undefined} />
          </div>

          {/* Row 3: Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: px(16), marginBottom: px(16) }}>
            <MiniChart data={data.appointmentsByDay as any} label="📅 Agendamentos por Dia" color={theme.colors.primary} valueKey="count" />
            <MiniChart data={data.revenueByDay as any} label="💰 Receita por Dia" color="#2E7D32" valueKey="total" />
          </div>

          {/* Row 4: Payment Methods & Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: px(16) }}>
            <MethodPie methods={data.financial.byMethod} />

            {/* Alerts */}
            <Card style={{ padding: px(16) }}>
              <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(12) }}>
                ⚠️ Alertas e Pendências
              </div>
              {data.stock.lowStock > 0 && (
                <div style={{ padding: px(10), background: '#FFF3E0', borderRadius: px(4), marginBottom: px(8), borderLeft: '3px solid #E65100' }}>
                  <strong style={{ color: '#E65100' }}>📦 Estoque Baixo</strong>
                  <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>{data.stock.lowStock} produtos abaixo do mínimo</div>
                </div>
              )}
              {data.stock.expiringLots > 0 && (
                <div style={{ padding: px(10), background: '#FFEBEE', borderRadius: px(4), marginBottom: px(8), borderLeft: '3px solid #C62828' }}>
                  <strong style={{ color: '#C62828' }}>⏰ Lotes Vencendo</strong>
                  <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>{data.stock.expiringLots} lotes vencem nos próximos 30 dias</div>
                </div>
              )}
              {data.exams.pending > 0 && (
                <div style={{ padding: px(10), background: '#E3F2FD', borderRadius: px(4), marginBottom: px(8), borderLeft: '3px solid #1565C0' }}>
                  <strong style={{ color: '#1565C0' }}>🔬 Exames Pendentes</strong>
                  <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>{data.exams.pending} exames aguardando resultado</div>
                </div>
              )}
              {data.financial.totalOutstanding > 0 && (
                <div style={{ padding: px(10), background: '#FFF8E1', borderRadius: px(4), marginBottom: px(8), borderLeft: '3px solid #F57F17' }}>
                  <strong style={{ color: '#F57F17' }}>💰 Contas a Receber</strong>
                  <div style={{ fontSize: px(13), color: theme.colors.textSecondary }}>{money(data.financial.totalOutstanding)} em {data.financial.openReceivables} contas</div>
                </div>
              )}
              {data.stock.lowStock === 0 && data.stock.expiringLots === 0 && data.exams.pending === 0 && data.financial.totalOutstanding === 0 && (
                <div style={{ padding: px(20), textAlign: 'center', color: '#2E7D32' }}>
                  ✅ Nenhum alerta! Tudo em ordem.
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

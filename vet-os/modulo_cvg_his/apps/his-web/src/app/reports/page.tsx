'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  getAppointmentsSummary,
  getExamsPending,
  getExamsSummary,
  getFinancialSummary,
  type AppointmentsSummaryItem,
  type ExamPendingItem,
  type ExamsSummaryItem,
  type FinancialSummaryItem
} from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader, ListPageLayout, ContentSection } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { px, row, theme } from '@/lib/theme';

// =====================
// Helpers
// =====================

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

function money(value: number): string {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
  requested: 'Solicitado',
  collected: 'Coletado',
  draft: 'Rascunho',
  review_required: 'Em revisão',
  approved: 'Aprovado',
  released: 'Liberado',
  open: 'Em aberto',
  settled: 'Quitado'
};

const TYPE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  vaccination: 'Vacinação',
  surgery: 'Cirurgia',
  exam: 'Exame',
  return: 'Retorno',
  other: 'Outro'
};

const CATEGORY_LABELS: Record<string, string> = {
  laboratory: 'Laboratório',
  imaging: 'Imagem',
  other: 'Outro'
};

const PRIORITY_LABELS: Record<string, string> = {
  routine: 'Rotina',
  urgent: 'Urgente',
  stat: 'STAT'
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#1565C0',
  confirmed: '#2E7D32',
  in_progress: '#E65100',
  completed: '#6A1B9A',
  cancelled: '#C62828',
  no_show: '#546E7A',
  requested: '#1565C0',
  collected: '#E65100',
  in_progress_exam: '#F57F17',
  completed_exam: '#2E7D32',
  open: '#E65100',
  settled: '#2E7D32'
};

// =====================
// Components
// =====================

function MetricCard({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon?: string }) {
  return (
    <Card style={{
      padding: px(20),
      border: `1px solid ${accent || theme.colors.border}`,
      borderRadius: px(theme.radius.md),
      background: accent ? `${accent}10` : theme.colors.surface
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
        {icon && <span style={{ fontSize: px(24) }}>{icon}</span>}
        <div>
          <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(4) }}>{label}</div>
          <div style={{ fontSize: px(24), fontWeight: 700, color: accent || theme.colors.textPrimary }}>{value}</div>
        </div>
      </div>
    </Card>
  );
}

function ChartBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ marginBottom: px(12) }}>
      <div style={{ ...row(8), justifyContent: 'space-between', marginBottom: px(4) }}>
        <span style={{ fontSize: px(13), color: theme.colors.textSecondary }}>{label}</span>
        <span style={{ fontSize: px(13), fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: px(8), background: theme.colors.border, borderRadius: px(4), overflow: 'hidden' }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: color,
          borderRadius: px(4),
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}

function PendingExamRow({ exam }: { exam: ExamPendingItem }) {
  const priorityColors: Record<string, { bg: string; fg: string }> = {
    routine: { bg: '#E3F2FD', fg: '#1565C0' },
    urgent: { bg: '#FFF3E0', fg: '#E65100' },
    stat: { bg: '#FFEBEE', fg: '#C62828' }
  };
  const prio = priorityColors[exam.priority] || priorityColors.routine;

  return (
    <div style={{
      padding: px(12),
      borderBottom: `1px solid ${theme.colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: px(12)
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: px(14) }}>{exam.exam_name}</div>
        <div style={{ fontSize: px(12), color: theme.colors.textSecondary, marginTop: px(2) }}>
          {exam.patient_name || 'Paciente N/A'} • {CATEGORY_LABELS[exam.category] || exam.category}
        </div>
      </div>
      <span style={{
        fontSize: px(11),
        borderRadius: px(999),
        padding: `${px(2)} ${px(8)}`,
        background: prio.bg,
        color: prio.fg,
        fontWeight: 600
      }}>
        {PRIORITY_LABELS[exam.priority] || exam.priority}
      </span>
    </div>
  );
}

// =====================
// Main Page
// =====================

export default function ReportsPage() {
  const defaultRange = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaultRange.dateFrom);
  const [dateTo, setDateTo] = useState(defaultRange.dateTo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Data
  const [appointmentsSummary, setAppointmentsSummary] = useState<AppointmentsSummaryItem[]>([]);
  const [examsPending, setExamsPending] = useState<ExamPendingItem[]>([]);
  const [examsSummary, setExamsSummary] = useState<ExamsSummaryItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apptSummary, examsPend, examSumm, finSumm] = await Promise.all([
        getAppointmentsSummary(dateFrom, dateTo),
        getExamsPending(),
        getExamsSummary(dateFrom, dateTo),
        getFinancialSummary(dateFrom, dateTo)
      ]);
      setAppointmentsSummary(apptSummary.data);
      setExamsPending(examsPend.data);
      setExamsSummary(examSumm.data);
      setFinancialSummary(finSumm.data);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError('Erro ao carregar relatórios', 500, null));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed metrics
  const totalAppointments = appointmentsSummary.reduce((sum, item) => sum + item.count, 0);
  const completedAppointments = appointmentsSummary.filter(i => i.status === 'completed').reduce((sum, i) => sum + i.count, 0);
  const totalExamsPending = examsPending.length;
  const totalFinancial = financialSummary.reduce((sum, item) => sum + item.totalAmount, 0);
  const openFinancial = financialSummary.find(i => i.status === 'open');

  // Chart data
  const appointmentsByStatus = appointmentsSummary.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + item.count;
    return acc;
  }, {});
  const maxApptCount = Math.max(...Object.values(appointmentsByStatus), 1);

  const examsByCategory = examsSummary.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.count;
    return acc;
  }, {});
  const maxExamCount = Math.max(...Object.values(examsByCategory), 1);

  return (
    <ListPageLayout>
      <PageHeader
        title="Relatórios"
        description="Visão geral do sistema — agendamentos, exames e financeiro"
      />

      {/* Date Range Filter */}
      <Card style={{ padding: px(16), display: 'flex', gap: px(12), alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Input
          type="date"
          label="Data inicial"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <Input
          type="date"
          label="Data final"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <Button variant="primary" onClick={fetchData} isLoading={loading}>
          Atualizar
        </Button>
        <div style={{ marginLeft: 'auto', color: theme.colors.textSecondary, fontSize: px(13) }}>
          Período: {new Date(dateFrom + 'T12:00:00').toLocaleDateString('pt-BR')} — {new Date(dateTo + 'T12:00:00').toLocaleDateString('pt-BR')}
        </div>
      </Card>

      {error && (
        <ErrorBanner
          title="Erro ao carregar relatórios"
          message={error.message}
          requestId={error.requestId}
          onRetry={fetchData}
        />
      )}

      {loading && !error && <LoadingState message="Carregando relatórios..." />}

      {!loading && !error && (
        <ContentSection>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: px(16) }}>
            <MetricCard
              icon="📅"
              label="Agendamentos (período)"
              value={String(totalAppointments)}
              accent={theme.colors.primary}
            />
            <MetricCard
              icon="✅"
              label="Atendimentos concluídos"
              value={String(completedAppointments)}
              accent="#2E7D32"
            />
            <MetricCard
              icon="🔬"
              label="Exames pendentes"
              value={String(totalExamsPending)}
              accent={totalExamsPending > 0 ? '#E65100' : '#2E7D32'}
            />
            <MetricCard
              icon="💰"
              label="Faturamento (período)"
              value={money(totalFinancial)}
              accent="#1565C0"
            />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: px(16), marginTop: px(8) }}>
            {/* Appointments by Status */}
            <Card style={{ padding: px(20) }}>
              <h3 style={{ margin: 0, marginBottom: px(16), fontSize: px(16) }}>📊 Agendamentos por Status</h3>
              {Object.keys(appointmentsByStatus).length === 0 ? (
                <p style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: px(20) }}>Sem dados no período</p>
              ) : (
                Object.entries(appointmentsByStatus).map(([status, count]) => (
                  <ChartBar
                    key={status}
                    label={STATUS_LABELS[status] || status}
                    value={count}
                    maxValue={maxApptCount}
                    color={STATUS_COLORS[status] || theme.colors.primary}
                  />
                ))
              )}
            </Card>

            {/* Exams by Category */}
            <Card style={{ padding: px(20) }}>
              <h3 style={{ margin: 0, marginBottom: px(16), fontSize: px(16) }}>🔬 Exames por Categoria</h3>
              {Object.keys(examsByCategory).length === 0 ? (
                <p style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: px(20) }}>Sem dados no período</p>
              ) : (
                Object.entries(examsByCategory).map(([category, count]) => (
                  <ChartBar
                    key={category}
                    label={CATEGORY_LABELS[category] || category}
                    value={count}
                    maxValue={maxExamCount}
                    color={category === 'laboratory' ? '#1565C0' : category === 'imaging' ? '#6A1B9A' : '#546E7A'}
                  />
                ))
              )}
            </Card>
          </div>

          {/* Financial Summary */}
          <Card style={{ padding: px(20), marginTop: px(8) }}>
            <h3 style={{ margin: 0, marginBottom: px(16), fontSize: px(16) }}>💰 Resumo Financeiro</h3>
            {financialSummary.length === 0 ? (
              <p style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: px(20) }}>Sem dados no período</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: px(16) }}>
                {financialSummary.map((item) => (
                  <div key={item.status} style={{
                    padding: px(16),
                    background: theme.colors.surface,
                    borderRadius: px(theme.radius.md),
                    border: `1px solid ${theme.colors.border}`
                  }}>
                    <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: px(4) }}>
                      {STATUS_LABELS[item.status] || item.status}
                    </div>
                    <div style={{ fontSize: px(20), fontWeight: 700, color: item.status === 'open' ? '#E65100' : '#2E7D32' }}>
                      {money(item.totalAmount)}
                    </div>
                    <div style={{ fontSize: px(12), color: theme.colors.textSecondary, marginTop: px(4) }}>
                      {item.count} conta{item.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Pending Exams List */}
          <Card style={{ padding: px(20), marginTop: px(8) }}>
            <div style={{ ...row(12), justifyContent: 'space-between', marginBottom: px(16) }}>
              <h3 style={{ margin: 0, fontSize: px(16) }}>⏳ Exames Pendentes</h3>
              <span style={{ fontSize: px(13), color: theme.colors.textSecondary }}>
                {totalExamsPending} exame{totalExamsPending !== 1 ? 's' : ''} aguardando
              </span>
            </div>
            {examsPending.length === 0 ? (
              <p style={{ color: theme.colors.textSecondary, textAlign: 'center', padding: px(20) }}>
                ✅ Nenhum exame pendente!
              </p>
            ) : (
              <div style={{ maxHeight: px(400), overflowY: 'auto' }}>
                {examsPending.map((exam) => (
                  <PendingExamRow key={exam.id} exam={exam} />
                ))}
              </div>
            )}
          </Card>
        </ContentSection>
      )}
    </ListPageLayout>
  );
}

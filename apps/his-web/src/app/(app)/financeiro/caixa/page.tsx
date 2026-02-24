'use client';

import { useState, useEffect } from 'react';
import { theme, px } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Can } from '@/components/auth/Can';
import {
  getCashReport,
  type CashReportResponse,
  type PaymentMethod
} from '@/lib/api/invoices';

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'PIX'
};

const methodColors: Record<PaymentMethod, string> = {
  cash: '#22c55e',
  card: '#3b82f6',
  pix: '#a855f7'
};

export default function CashReportPage() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }));
  const [report, setReport] = useState<CashReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCashReport(date);
      setReport(data);
    } catch (err) {
      console.error('Failed to load cash report:', err);
      setError('Falha ao carregar relatório de caixa.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [date]);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  return (
    <div style={{ padding: px(24), maxWidth: px(1200), margin: '0 auto' }}>
      <h1 style={{ fontSize: px(28), fontWeight: 600, marginBottom: px(24) }}>
        Relatório de Caixa
      </h1>

      {/* Date Selector */}
      <Card style={{ padding: px(16), marginBottom: px(24) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: px(16), flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 500 }}>Data:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: px(8),
              border: `1px solid ${theme.colors.border}`,
              borderRadius: px(4),
              fontSize: px(14)
            }}
          />
          <Button variant="secondary" onClick={() => void loadReport()}>
            Atualizar
          </Button>
        </div>
      </Card>

      {isLoading && (
        <Card style={{ padding: px(24), textAlign: 'center' }}>
          <p style={{ color: theme.colors.textSecondary }}>Carregando...</p>
        </Card>
      )}

      {error && (
        <Card style={{ padding: px(24), borderColor: theme.colors.danger }}>
          <p style={{ color: theme.colors.danger }}>{error}</p>
        </Card>
      )}

      {report && !isLoading && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: px(16), marginBottom: px(24) }}>
            <Card style={{ padding: px(20) }}>
              <div style={{ color: theme.colors.textSecondary, fontSize: px(14), marginBottom: px(8) }}>
                Total Recebido
              </div>
              <div style={{ fontSize: px(32), fontWeight: 600, color: theme.colors.success }}>
                {formatCurrency(report.totalReceived)}
              </div>
              <div style={{ color: theme.colors.textSecondary, fontSize: px(12), marginTop: px(4) }}>
                {report.paymentCount} {report.paymentCount === 1 ? 'pagamento' : 'pagamentos'}
              </div>
            </Card>

            {report.byMethod.map((item) => (
              <Card key={item.method} style={{ padding: px(20) }}>
                <div style={{ color: theme.colors.textSecondary, fontSize: px(14), marginBottom: px(8) }}>
                  {methodLabels[item.method]}
                </div>
                <div style={{ fontSize: px(24), fontWeight: 600, color: methodColors[item.method] }}>
                  {formatCurrency(item.total)}
                </div>
                <div style={{ color: theme.colors.textSecondary, fontSize: px(12), marginTop: px(4) }}>
                  {item.count} {item.count === 1 ? 'transação' : 'transações'}
                </div>
              </Card>
            ))}
          </div>

          {/* Payments List */}
          <Card style={{ padding: 0 }}>
            <div style={{ padding: px(16), borderBottom: `1px solid ${theme.colors.border}` }}>
              <h2 style={{ fontSize: px(18), fontWeight: 600, margin: 0 }}>
                Detalhamento de Pagamentos
              </h2>
            </div>

            {report.payments.length === 0 ? (
              <div style={{ padding: px(24), textAlign: 'center', color: theme.colors.textSecondary }}>
                Nenhum pagamento registrado nesta data.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                      Hora
                    </th>
                    <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                      Recibo
                    </th>
                    <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                      Método
                    </th>
                    <th style={{ textAlign: 'right', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                      Valor
                    </th>
                    <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                      Referência
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.payments.map((payment) => (
                    <tr key={payment.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: px(12) }}>
                        {formatTime(payment.receivedAt)}
                      </td>
                      <td style={{ padding: px(12), fontFamily: 'monospace', fontSize: px(13) }}>
                        {payment.paymentNumber}
                      </td>
                      <td style={{ padding: px(12) }}>
                        <span
                          style={{
                            padding: `${px(4)} ${px(8)}`,
                            borderRadius: px(4),
                            fontSize: px(12),
                            background: methodColors[payment.method],
                            color: 'white'
                          }}
                        >
                          {methodLabels[payment.method]}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', padding: px(12), fontWeight: 500 }}>
                        {formatCurrency(payment.amount)}
                      </td>
                      <td style={{ padding: px(12), color: theme.colors.textSecondary, fontSize: px(13) }}>
                        {payment.reference || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

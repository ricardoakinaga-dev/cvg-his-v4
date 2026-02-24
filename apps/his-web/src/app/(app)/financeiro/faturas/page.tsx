'use client';

import { useState, useEffect, useCallback } from 'react';
import { theme, px } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Can } from '@/components/auth/Can';
import {
  listInvoices,
  getInvoice,
  createPayment,
  cancelInvoice,
  type InvoiceWithDetails,
  type InvoiceStatus,
  type PaymentMethod
} from '@/lib/api/invoices';

const statusLabels: Record<InvoiceStatus, string> = {
  open: 'Aberto',
  paid: 'Pago',
  partial: 'Parcial',
  cancelled: 'Cancelado'
};

const statusColors: Record<InvoiceStatus, string> = {
  open: '#f59e0b',
  paid: '#22c55e',
  partial: '#3b82f6',
  cancelled: '#ef4444'
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'PIX'
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listInvoices({
        status: statusFilter || undefined,
        pageSize: 50
      });
      setInvoices(data.items);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Falha ao carregar faturas.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const data = await getInvoice(invoiceId);
      setSelectedInvoice(data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
      alert('Falha ao carregar fatura.');
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });
  };

  return (
    <div style={{ padding: px(24), maxWidth: px(1400), margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: px(24) }}>
        <h1 style={{ fontSize: px(28), fontWeight: 600 }}>
          Faturas
        </h1>
        <div style={{ display: 'flex', gap: px(8) }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
            style={{
              padding: px(8),
              border: `1px solid ${theme.colors.border}`,
              borderRadius: px(4),
              fontSize: px(14)
            }}
          >
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="partial">Parcial</option>
            <option value="paid">Pago</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

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

      {!isLoading && invoices.length === 0 && (
        <Card style={{ padding: px(24), textAlign: 'center' }}>
          <p style={{ color: theme.colors.textSecondary }}>Nenhuma fatura encontrada.</p>
        </Card>
      )}

      {!isLoading && invoices.length > 0 && (
        <Card style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Número
                </th>
                <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Data
                </th>
                <th style={{ textAlign: 'left', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Paciente / Tutor
                </th>
                <th style={{ textAlign: 'right', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Total
                </th>
                <th style={{ textAlign: 'right', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Pago
                </th>
                <th style={{ textAlign: 'right', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Pendente
                </th>
                <th style={{ textAlign: 'center', padding: px(12), color: theme.colors.textSecondary, fontSize: px(12), fontWeight: 500 }}>
                  Status
                </th>
                <th style={{ textAlign: 'center', padding: px(12), width: px(120) }} />
              </tr>
            </thead>
            <tbody>
              {invoices.map((item) => (
                <tr key={item.invoice.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                  <td style={{ padding: px(12), fontFamily: 'monospace', fontSize: px(13) }}>
                    {item.invoice.invoiceNumber}
                  </td>
                  <td style={{ padding: px(12) }}>
                    {formatDate(item.invoice.createdAt)}
                  </td>
                  <td style={{ padding: px(12) }}>
                    {item.encounter ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.encounter.patientName}</div>
                        <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                          {item.encounter.ownerName}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', padding: px(12), fontWeight: 500 }}>
                    {formatCurrency(item.invoice.total)}
                  </td>
                  <td style={{ textAlign: 'right', padding: px(12), color: theme.colors.success }}>
                    {formatCurrency(item.invoice.paidAmount)}
                  </td>
                  <td style={{ textAlign: 'right', padding: px(12), color: parseFloat(item.invoice.dueAmount) > 0 ? theme.colors.danger : theme.colors.textSecondary }}>
                    {formatCurrency(item.invoice.dueAmount)}
                  </td>
                  <td style={{ textAlign: 'center', padding: px(12) }}>
                    <span
                      style={{
                        padding: `${px(4)} ${px(8)}`,
                        borderRadius: px(4),
                        fontSize: px(12),
                        background: statusColors[item.invoice.status],
                        color: 'white'
                      }}
                    >
                      {statusLabels[item.invoice.status]}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: px(12) }}>
                    <Button
                      variant="secondary"
                      onClick={() => void handleViewInvoice(item.invoice.id)}
                      style={{ fontSize: px(12), padding: `${px(4)} ${px(8)}` }}
                    >
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && !showPaymentModal && !showCancelModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title={`Fatura ${selectedInvoice.invoice.invoiceNumber}`}
        >
          <div style={{ padding: px(16), minWidth: px(500) }}>
            {/* Invoice Summary */}
            <div style={{ marginBottom: px(24) }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(16) }}>
                <div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: px(12) }}>Paciente</div>
                  <div style={{ fontWeight: 500 }}>{selectedInvoice.encounter?.patientName ?? '-'}</div>
                </div>
                <div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: px(12) }}>Tutor</div>
                  <div style={{ fontWeight: 500 }}>{selectedInvoice.encounter?.ownerName ?? '-'}</div>
                </div>
                <div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: px(12) }}>Total</div>
                  <div style={{ fontWeight: 600, fontSize: px(18) }}>{formatCurrency(selectedInvoice.invoice.total)}</div>
                </div>
                <div>
                  <div style={{ color: theme.colors.textSecondary, fontSize: px(12) }}>Pendente</div>
                  <div style={{ fontWeight: 600, fontSize: px(18), color: parseFloat(selectedInvoice.invoice.dueAmount) > 0 ? theme.colors.danger : theme.colors.success }}>
                    {formatCurrency(selectedInvoice.invoice.dueAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Items */}
            <div style={{ marginBottom: px(24) }}>
              <h3 style={{ fontSize: px(14), fontWeight: 600, marginBottom: px(8) }}>Itens</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: px(13) }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <th style={{ textAlign: 'left', padding: px(8), color: theme.colors.textSecondary }}>Descrição</th>
                    <th style={{ textAlign: 'right', padding: px(8), color: theme.colors.textSecondary }}>Qtd</th>
                    <th style={{ textAlign: 'right', padding: px(8), color: theme.colors.textSecondary }}>Unit.</th>
                    <th style={{ textAlign: 'right', padding: px(8), color: theme.colors.textSecondary }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.billingItems.map((item) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <td style={{ padding: px(8) }}>{item.description}</td>
                      <td style={{ textAlign: 'right', padding: px(8) }}>{item.qty}</td>
                      <td style={{ textAlign: 'right', padding: px(8) }}>{formatCurrency(item.unitPrice)}</td>
                      <td style={{ textAlign: 'right', padding: px(8), fontWeight: 500 }}>{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payments */}
            <div style={{ marginBottom: px(24) }}>
              <h3 style={{ fontSize: px(14), fontWeight: 600, marginBottom: px(8) }}>Pagamentos</h3>
              {selectedInvoice.payments.length === 0 ? (
                <p style={{ color: theme.colors.textSecondary, fontSize: px(13) }}>Nenhum pagamento registrado.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: px(13) }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                      <th style={{ textAlign: 'left', padding: px(8), color: theme.colors.textSecondary }}>Recibo</th>
                      <th style={{ textAlign: 'left', padding: px(8), color: theme.colors.textSecondary }}>Método</th>
                      <th style={{ textAlign: 'right', padding: px(8), color: theme.colors.textSecondary }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.payments.map((payment) => (
                      <tr key={payment.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                        <td style={{ padding: px(8), fontFamily: 'monospace' }}>{payment.paymentNumber}</td>
                        <td style={{ padding: px(8) }}>
                          <span
                            style={{
                              padding: `${px(2)} ${px(6)}`,
                              borderRadius: px(4),
                              fontSize: px(11),
                              background: payment.method === 'cash' ? '#22c55e' : payment.method === 'card' ? '#3b82f6' : '#a855f7',
                              color: 'white'
                            }}
                          >
                            {methodLabels[payment.method]}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: px(8), fontWeight: 500 }}>{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: px(8), justifyContent: 'flex-end' }}>
              {selectedInvoice.invoice.status !== 'cancelled' && selectedInvoice.invoice.status !== 'paid' && (
                <>
                  <Can permission="financeiro.pagamentos.create">
                    <Button variant="primary" onClick={() => setShowPaymentModal(true)}>
                      Receber Pagamento
                    </Button>
                  </Can>
                  <Can permission="financeiro.faturamento.update">
                    <Button variant="secondary" onClick={() => setShowCancelModal(true)}>
                      Cancelar Fatura
                    </Button>
                  </Can>
                </>
              )}
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {selectedInvoice && showPaymentModal && (
        <PaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedInvoice(null);
            void loadInvoices();
          }}
          onCancel={() => setShowPaymentModal(false)}
        />
      )}

      {/* Cancel Modal */}
      {selectedInvoice && showCancelModal && (
        <CancelModal
          invoiceId={selectedInvoice.invoice.id}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedInvoice(null);
            void loadInvoices();
          }}
          onCancel={() => setShowCancelModal(false)}
        />
      )}
    </div>
  );
}

// Payment Modal Component
function PaymentModal({
  invoice,
  onClose,
  onCancel
}: {
  invoice: InvoiceWithDetails;
  onClose: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(invoice.invoice.dueAmount);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dueAmount = parseFloat(invoice.invoice.dueAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createPayment(invoice.invoice.id, {
        amount: parseFloat(amount),
        method,
        reference: reference || undefined
      });
      onClose();
    } catch (err) {
      console.error('Failed to create payment:', err);
      alert('Falha ao registrar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title="Receber Pagamento">
      <form onSubmit={handleSubmit} style={{ padding: px(16), minWidth: px(400) }}>
        <div style={{ marginBottom: px(16) }}>
          <div style={{ color: theme.colors.textSecondary, fontSize: px(12) }}>Valor Pendente</div>
          <div style={{ fontSize: px(24), fontWeight: 600 }}>{formatCurrency(invoice.invoice.dueAmount)}</div>
        </div>

        <div style={{ marginBottom: px(16) }}>
          <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
            Valor a Receber *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={dueAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: px(16) }}>
          <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
            Método de Pagamento *
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            style={{
              width: '100%',
              padding: px(12),
              border: `1px solid ${theme.colors.border}`,
              borderRadius: px(4),
              fontSize: px(14)
            }}
          >
            <option value="cash">Dinheiro</option>
            <option value="card">Cartão</option>
            <option value="pix">PIX</option>
          </select>
        </div>

        <div style={{ marginBottom: px(16) }}>
          <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
            Referência (opcional)
          </label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="NSU, ID transação, etc."
          />
        </div>

        <div style={{ display: 'flex', gap: px(12), justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Cancel Modal Component
function CancelModal({
  invoiceId,
  onClose,
  onCancel
}: {
  invoiceId: string;
  onClose: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await cancelInvoice(invoiceId, reason);
      onClose();
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
      alert('Falha ao cancelar fatura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title="Cancelar Fatura">
      <form onSubmit={handleSubmit} style={{ padding: px(16), minWidth: px(400) }}>
        <p style={{ marginBottom: px(16), color: theme.colors.textSecondary }}>
          Tem certeza que deseja cancelar esta fatura? Esta ação não pode ser desfeita.
        </p>

        <div style={{ marginBottom: px(16) }}>
          <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
            Motivo do Cancelamento *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
            required
            style={{
              width: '100%',
              padding: px(12),
              border: `1px solid ${theme.colors.border}`,
              borderRadius: px(4),
              fontSize: px(14),
              minHeight: px(80)
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: px(12), justifyContent: 'flex-end' }}>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Voltar
          </Button>
          <Button variant="primary" type="submit" disabled={isSubmitting} style={{ background: theme.colors.danger }}>
            {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

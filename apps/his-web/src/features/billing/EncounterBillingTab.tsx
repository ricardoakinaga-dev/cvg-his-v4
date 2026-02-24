'use client';

import { useState, useCallback } from 'react';
import { theme, px } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DebouncedSelect } from '@/components/ui/DebouncedSelect';
import { Can } from '@/components/auth/Can';
import {
  useBillingItems,
  useCreateBillingItem,
  useUpdateBillingItem,
  useDeleteBillingItem,
  useCloseEncounter,
  type BillingItem,
} from './queries';
import { createInvoiceFromEncounter } from '@/lib/api/invoices';

interface EncounterBillingTabProps {
  encounterId: string;
  encounterStatus: 'open' | 'closed';
  onEncounterClosed?: () => void;
}

export function EncounterBillingTab({
  encounterId,
  encounterStatus,
  onEncounterClosed,
}: EncounterBillingTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingItem | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceDiscount, setInvoiceDiscount] = useState('0');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ id: string; invoiceNumber: string; total: string } | null>(null);

  // Queries and mutations
  const { data, isLoading, error, refetch } = useBillingItems(encounterId);
  const createMutation = useCreateBillingItem(encounterId);
  const deleteMutation = useDeleteBillingItem(encounterId);
  const closeEncounterMutation = useCloseEncounter(encounterId);

  const isClosed = encounterStatus === 'closed';
  const items = data?.items ?? [];
  const total = data?.total ?? '0';

  // Handlers
  const handleAddItem = useCallback(
    async (input: { description: string; qty: number; unitPrice: number; serviceId?: string }) => {
      try {
        await createMutation.mutateAsync(input);
        setShowAddModal(false);
      } catch (error) {
        console.error('Failed to create billing item:', error);
        alert('Falha ao adicionar item.');
      }
    },
    [createMutation]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
      try {
        await deleteMutation.mutateAsync(itemId);
      } catch (error) {
        console.error('Failed to delete billing item:', error);
        alert('Falha ao excluir item.');
      }
    },
    [deleteMutation]
  );

  const handleCloseEncounter = useCallback(async () => {
    try {
      const result = await closeEncounterMutation.mutateAsync(closeReason || undefined);
      setShowCloseModal(false);
      if (onEncounterClosed) {
        onEncounterClosed();
      }
      // Show invoice creation modal after closing
      if (result.billingItemCount > 0) {
        setShowInvoiceModal(true);
      } else {
        alert(`Atendimento fechado sem itens de cobrança.`);
      }
    } catch (error) {
      console.error('Failed to close encounter:', error);
      alert('Falha ao fechar atendimento.');
    }
  }, [closeEncounterMutation, closeReason, onEncounterClosed]);

  const handleCreateInvoice = useCallback(async () => {
    setIsCreatingInvoice(true);
    try {
      const invoice = await createInvoiceFromEncounter(encounterId, {
        discount: parseFloat(invoiceDiscount) || 0,
        notes: invoiceNotes || undefined
      });
      setCreatedInvoice(invoice);
      setShowInvoiceModal(false);
      alert(`Fatura ${invoice.invoiceNumber} criada com sucesso! Total: R$ ${invoice.total}`);
    } catch (error) {
      console.error('Failed to create invoice:', error);
      alert('Falha ao criar fatura. Você pode criar manualmente em Financeiro > Faturas.');
    } finally {
      setIsCreatingInvoice(false);
    }
  }, [encounterId, invoiceDiscount, invoiceNotes]);

  // Format currency
  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(num);
  };

  if (isLoading) {
    return (
      <Card style={{ padding: px(24) }}>
        <p style={{ color: theme.colors.textSecondary }}>Carregando cobrança...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ padding: px(24), borderColor: theme.colors.danger }}>
        <p style={{ color: theme.colors.danger }}>Erro ao carregar cobrança</p>
        <Button variant="secondary" onClick={() => void refetch()} style={{ marginTop: px(12) }}>
          Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div>
      {/* Header with total and actions */}
      <Card style={{ padding: px(16), marginBottom: px(16) }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: px(12),
          }}
        >
          <div>
            <span style={{ color: theme.colors.textSecondary, fontSize: px(14) }}>
              Total da Cobrança:
            </span>
            <span
              style={{
                fontSize: px(24),
                fontWeight: 600,
                marginLeft: px(12),
                color: theme.colors.primary,
              }}
            >
              {formatCurrency(total)}
            </span>
            <span style={{ color: theme.colors.textSecondary, marginLeft: px(8), fontSize: px(12) }}>
              ({items.length} {items.length === 1 ? 'item' : 'itens'})
            </span>
          </div>

          <div style={{ display: 'flex', gap: px(8) }}>
            {!isClosed && (
              <Can permission="financeiro.comandas.update">
                <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                  + Adicionar Item
                </Button>
              </Can>
            )}

            {!isClosed && (
              <Can permission="encounter.close">
                <Button
                  variant="primary"
                  onClick={() => setShowCloseModal(true)}
                  disabled={closeEncounterMutation.isPending}
                >
                  {closeEncounterMutation.isPending ? 'Fechando...' : 'Fechar Atendimento'}
                </Button>
              </Can>
            )}

            {isClosed && (
              <span
                style={{
                  padding: `${px(6)} ${px(12)}`,
                  background: theme.colors.success,
                  color: 'white',
                  borderRadius: px(4),
                  fontSize: px(14),
                }}
              >
                Atendimento Fechado
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Items list */}
      {items.length === 0 ? (
        <Card style={{ padding: px(24), textAlign: 'center' }}>
          <p style={{ color: theme.colors.textSecondary, margin: 0 }}>
            Nenhum item de cobrança adicionado.
          </p>
          {!isClosed && (
            <Can permission="financeiro.comandas.update">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(true)}
                style={{ marginTop: px(16) }}
              >
                Adicionar Primeiro Item
              </Button>
            </Can>
          )}
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: px(12),
                    color: theme.colors.textSecondary,
                    fontSize: px(12),
                    fontWeight: 500,
                  }}
                >
                  Descrição
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: px(12),
                    color: theme.colors.textSecondary,
                    fontSize: px(12),
                    fontWeight: 500,
                    width: px(80),
                  }}
                >
                  Qtd
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: px(12),
                    color: theme.colors.textSecondary,
                    fontSize: px(12),
                    fontWeight: 500,
                    width: px(120),
                  }}
                >
                  Unitário
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: px(12),
                    color: theme.colors.textSecondary,
                    fontSize: px(12),
                    fontWeight: 500,
                    width: px(120),
                  }}
                >
                  Total
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: px(12),
                    color: theme.colors.textSecondary,
                    fontSize: px(12),
                    fontWeight: 500,
                    width: px(100),
                  }}
                >
                  Status
                </th>
                {!isClosed && (
                  <th
                    style={{
                      textAlign: 'center',
                      padding: px(12),
                      width: px(80),
                    }}
                  />
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <td style={{ padding: px(12) }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{item.description}</div>
                      {item.service && (
                        <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                          {item.service.code} - {item.service.name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', padding: px(12) }}>{item.qty}</td>
                  <td style={{ textAlign: 'right', padding: px(12) }}>
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td style={{ textAlign: 'right', padding: px(12), fontWeight: 500 }}>
                    {formatCurrency(item.totalPrice)}
                  </td>
                  <td style={{ textAlign: 'center', padding: px(12) }}>
                    <span
                      style={{
                        padding: `${px(4)} ${px(8)}`,
                        borderRadius: px(4),
                        fontSize: px(12),
                        background:
                          item.status === 'confirmed'
                            ? theme.colors.success
                            : item.status === 'cancelled'
                            ? theme.colors.danger
                            : theme.colors.warning,
                        color: 'white',
                      }}
                    >
                      {item.status === 'confirmed'
                        ? 'Confirmado'
                        : item.status === 'cancelled'
                        ? 'Cancelado'
                        : 'Rascunho'}
                    </span>
                  </td>
                  {!isClosed && (
                    <td style={{ textAlign: 'center', padding: px(12) }}>
                      {item.status === 'draft' && (
                        <Can permission="financeiro.comandas.update">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: theme.colors.danger,
                              cursor: 'pointer',
                              padding: px(4),
                            }}
                            title="Excluir item"
                          >
                            ✕
                          </button>
                        </Can>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddBillingItemModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddItem}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Close Encounter Modal */}
      {showCloseModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCloseModal(false)}
          title="Fechar Atendimento"
        >
          <div style={{ padding: px(16) }}>
            <p style={{ marginBottom: px(16) }}>
              Deseja fechar este atendimento? Todos os itens de cobrança serão confirmados.
            </p>

            <div style={{ marginBottom: px(16) }}>
              <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
                Motivo (opcional)
              </label>
              <textarea
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ex: Alta médica, Transferência..."
                style={{
                  width: '100%',
                  padding: px(12),
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: px(4),
                  fontSize: px(14),
                  minHeight: px(80),
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: px(12), justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowCloseModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleCloseEncounter}
                disabled={closeEncounterMutation.isPending}
              >
                {closeEncounterMutation.isPending ? 'Fechando...' : 'Confirmar Fechamento'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowInvoiceModal(false)}
          title="Criar Fatura"
        >
          <div style={{ padding: px(16), minWidth: px(400) }}>
            <p style={{ marginBottom: px(16), color: theme.colors.textSecondary }}>
              O atendimento foi fechado. Deseja criar uma fatura para os itens de cobrança?
            </p>

            <div style={{ marginBottom: px(16) }}>
              <div style={{ marginBottom: px(8) }}>
                <strong>Total de itens:</strong> {items.length}
              </div>
              <div style={{ marginBottom: px(8) }}>
                <strong>Subtotal:</strong> {formatCurrency(total)}
              </div>
            </div>

            <div style={{ marginBottom: px(16) }}>
              <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
                Desconto (R$)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={invoiceDiscount}
                onChange={(e) => setInvoiceDiscount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div style={{ marginBottom: px(16) }}>
              <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
                Observações
              </label>
              <textarea
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Notas adicionais..."
                style={{
                  width: '100%',
                  padding: px(12),
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: px(4),
                  fontSize: px(14),
                  minHeight: px(60),
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: px(12), justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>
                Pular
              </Button>
              <Can permission="financeiro.faturamento.update">
                <Button
                  variant="primary"
                  onClick={handleCreateInvoice}
                  disabled={isCreatingInvoice}
                >
                  {isCreatingInvoice ? 'Criando...' : 'Criar Fatura'}
                </Button>
              </Can>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Add Billing Item Modal Component
function AddBillingItemModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (input: { description: string; qty: number; unitPrice: number; serviceId?: string }) => void;
  isLoading: boolean;
}) {
  const [description, setDescription] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0');
  const [selectedService, setSelectedService] = useState<{ id: string; name: string; basePrice: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      description,
      qty: parseFloat(qty) || 1,
      unitPrice: parseFloat(unitPrice) || 0,
      serviceId: selectedService?.id,
    });
  };

  // Load service options
  const loadServiceOptions = async (search: string) => {
    try {
      const response = await fetch(
        `/api/proxy/billing/services?q=${encodeURIComponent(search)}&pageSize=20`
      );
      const data = await response.json();
      return data.items.map((item: { id: string; name: string; code: string; basePrice: string }) => ({
        value: item.id,
        label: `${item.code} - ${item.name}`,
        subLabel: item.name,
        data: item,
      }));
    } catch (error) {
      console.error('Failed to load services:', error);
      return [];
    }
  };

  const handleServiceSelect = (value: string, option: { value: string; label: string; subLabel?: string; data?: { basePrice: string; name: string } } | null) => {
    if (option?.data) {
      setSelectedService({
        id: value,
        name: option.data.name,
        basePrice: option.data.basePrice,
      });
      setDescription(option.data.name);
      setUnitPrice(option.data.basePrice);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Adicionar Item de Cobrança">
      <form onSubmit={handleSubmit} style={{ padding: px(16) }}>
        <div style={{ marginBottom: px(16) }}>
          <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
            Serviço (opcional)
          </label>
          <DebouncedSelect
            placeholder="Buscar serviço..."
            fetchOptions={loadServiceOptions}
            onChange={handleServiceSelect}
            value={selectedService?.id ?? ''}
          />
        </div>

        <div style={{ marginBottom: px(16) }}>
          <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
            Descrição *
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição do item"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: px(16), marginBottom: px(16) }}>
          <div>
            <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
              Quantidade *
            </label>
            <Input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: px(8), fontWeight: 500 }}>
              Preço Unitário *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <div
          style={{
            padding: px(12),
            background: theme.colors.surface,
            borderRadius: px(4),
            marginBottom: px(16),
          }}
        >
          <span style={{ color: theme.colors.textSecondary }}>Total: </span>
          <span style={{ fontWeight: 600 }}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format((parseFloat(qty) || 0) * (parseFloat(unitPrice) || 0))}
          </span>
        </div>

        <div style={{ display: 'flex', gap: px(12), justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !description}>
            {isLoading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

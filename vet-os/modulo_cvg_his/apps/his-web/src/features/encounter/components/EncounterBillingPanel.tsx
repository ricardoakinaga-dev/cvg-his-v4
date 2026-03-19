'use client';

import React, { useEffect, useMemo, useState } from 'react';

import {
  type BillingItemType,
  type CatalogRecord,
  type EncounterBillingCreateInput,
  type EncounterBillingItemRecord,
  type EncounterBillingUpdateInput,
  type EncounterFinancialInstallmentInput,
  type EncounterFinancialSummaryResponse,
  type EncounterReceivablePaymentRecord,
  type EncounterReceivableRecord,
  ApiError,
  listProducts,
  listServices
} from '@/lib/api';
import {
  useCloseEncounterFinancial,
  useCreateEncounterBillingItem,
  useDeleteEncounterBillingItem,
  useEncounterBilling,
  useEncounterFinancial,
  useSettleEncounterReceivable,
  useUpdateEncounterBillingItem
} from '@/features/encounter/queries';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorBanner, InlineError } from '@/components/ui/ErrorBanner';
import { useToast } from '@/components/ui/Toast';
import { px, row, theme } from '@/lib/theme';

type EncounterBillingPanelProps = {
  encounterId: string;
};

type BillingFormState = {
  itemType: BillingItemType;
  catalogItemId: string;
  nameSnapshot: string;
  codeSnapshot: string;
  unitPrice: string;
  quantity: string;
  discountAmount: string;
  notes: string;
};

type InstallmentFormState = {
  id: string;
  label: string;
  amount: string;
  dueAt: string;
  notes: string;
};

type BillingFormErrors = Partial<Record<'nameSnapshot' | 'unitPrice' | 'quantity' | 'discountAmount', string>>;
const EMPTY_FORM: BillingFormState = {
  itemType: 'service',
  catalogItemId: '',
  nameSnapshot: '',
  codeSnapshot: '',
  unitPrice: '0',
  quantity: '1',
  discountAmount: '0',
  notes: ''
};

function makeInstallment(index: number, amount = '0'): InstallmentFormState {
  return { id: `inst-${index}-${Math.random().toString(36).slice(2, 8)}`, label: `Parcela ${index}`, amount, dueAt: '', notes: '' };
}

function money(value: number): string {
  return `R$ ${Number(value ?? 0).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

function buildFormFromItem(item: EncounterBillingItemRecord): BillingFormState {
  return {
    itemType: item.itemType,
    catalogItemId: item.catalogItemId ?? '',
    nameSnapshot: item.nameSnapshot,
    codeSnapshot: item.codeSnapshot ?? '',
    unitPrice: String(item.unitPrice ?? 0),
    quantity: String(item.quantity ?? 1),
    discountAmount: String(item.discountAmount ?? 0),
    notes: item.notes ?? ''
  };
}

function validateBillingForm(form: BillingFormState): { payload: EncounterBillingCreateInput | null; errors: BillingFormErrors } {
  const nameSnapshot = form.nameSnapshot.trim();
  const codeSnapshot = form.codeSnapshot.trim();
  const notes = form.notes.trim();
  const unitPrice = Number(form.unitPrice);
  const quantity = Number(form.quantity);
  const discountAmount = Number(form.discountAmount);
  const errors: BillingFormErrors = {};

  if (nameSnapshot.length < 2) errors.nameSnapshot = 'Informe um nome com pelo menos 2 caracteres.';
  if (Number.isNaN(unitPrice) || unitPrice < 0) errors.unitPrice = 'Informe um preço unitário maior ou igual a zero.';
  if (!Number.isInteger(quantity) || quantity <= 0) errors.quantity = 'A quantidade deve ser um inteiro maior que zero.';
  if (Number.isNaN(discountAmount) || discountAmount < 0) {
    errors.discountAmount = 'Informe um desconto maior ou igual a zero.';
  } else if (!Number.isNaN(unitPrice) && Number.isInteger(quantity) && quantity > 0 && discountAmount > unitPrice * quantity) {
    errors.discountAmount = 'O desconto não pode passar do valor bruto do item.';
  }

  if (Object.keys(errors).length > 0) return { payload: null, errors };

  return {
    payload: {
      itemType: form.itemType,
      catalogItemId: form.catalogItemId || null,
      nameSnapshot,
      codeSnapshot: codeSnapshot || null,
      unitPrice,
      quantity,
      discountAmount,
      notes: notes || null
    },
    errors
  };
}

function normalizeInstallments(installments: InstallmentFormState[], expectedTotal: number) {
  const cleaned = installments
    .map((item, index) => ({
      label: item.label.trim() || `Parcela ${index + 1}`,
      amount: Number(item.amount || 0),
      dueAt: item.dueAt ? new Date(`${item.dueAt}T12:00:00`).toISOString() : null,
      notes: item.notes.trim() || null
    }))
    .filter((item) => item.amount > 0);

  const sum = cleaned.reduce((acc, item) => acc + item.amount, 0);
  const diff = Number((expectedTotal - sum).toFixed(2));
  if (cleaned.length > 0 && diff !== 0) cleaned[cleaned.length - 1]!.amount = Number((cleaned[cleaned.length - 1]!.amount + diff).toFixed(2));
  return cleaned.filter((item) => item.amount > 0) as EncounterFinancialInstallmentInput[];
}

function flattenPayments(financial: EncounterFinancialSummaryResponse | undefined): EncounterReceivablePaymentRecord[] {
  const direct = financial?.payments ?? [];
  if (direct.length > 0) return direct;
  return (financial?.receivables ?? []).flatMap((receivable) => receivable.payments ?? []);
}

export function EncounterBillingPanel({ encounterId }: EncounterBillingPanelProps) {
  const { toast } = useToast();
  const billingQuery = useEncounterBilling(encounterId);
  const financialQuery = useEncounterFinancial(encounterId);
  const createMutation = useCreateEncounterBillingItem();
  const updateMutation = useUpdateEncounterBillingItem();
  const deleteMutation = useDeleteEncounterBillingItem();
  const closeFinancialMutation = useCloseEncounterFinancial();
  const settleReceivableMutation = useSettleEncounterReceivable();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EncounterBillingItemRecord | null>(null);
  const [createForm, setCreateForm] = useState<BillingFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<BillingFormState>(EMPTY_FORM);
  const [createErrors, setCreateErrors] = useState<BillingFormErrors>({});
  const [editErrors, setEditErrors] = useState<BillingFormErrors>({});
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<Record<BillingItemType, CatalogRecord[]>>({ service: [], product: [] });
  const [closeNotes, setCloseNotes] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('0');
  const [installments, setInstallments] = useState<InstallmentFormState[]>([makeInstallment(1)]);
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState('0');
  const [settleNotes, setSettleNotes] = useState('');

  const items = useMemo(() => {
    const base = billingQuery.data?.data ?? [];
    return [...base].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [billingQuery.data?.data]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.lineTotal ?? item.unitPrice * item.quantity), 0), [items]);
  const grossTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.unitPrice * item.quantity), 0), [items]);
  const discountTotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.discountAmount ?? 0), 0), [items]);

  const financial = financialQuery.data;
  const receivables = financial?.receivables ?? (financial?.receivable ? [financial.receivable] : []);
  const selectedReceivable = receivables.find((item) => item.id === selectedReceivableId) ?? receivables.find((item) => item.status === 'open') ?? receivables[0] ?? null;
  const paymentHistory = useMemo(() => flattenPayments(financial).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()), [financial]);
  const billingLocked = Boolean(financial?.financialClosed);
  const working = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || closeFinancialMutation.isPending || settleReceivableMutation.isPending;

  useEffect(() => {
    const amount = financial?.paidAmount ?? 0;
    const notes = financial?.notes ?? '';
    setPaidAmountInput(String(amount));
    setCloseNotes(notes);

    const openReceivable = (financial?.receivables ?? []).find((item) => item.status === 'open') ?? financial?.receivable ?? null;
    setSelectedReceivableId(openReceivable?.id ?? null);
    setSettleNotes(openReceivable?.notes ?? notes);
    setSettleAmountInput(String(openReceivable?.amountOutstanding ?? 0));

    const outstanding = Math.max((financial?.balanceDue ?? 0), 0);
    if (outstanding <= 0) {
      setInstallments([makeInstallment(1, '0')]);
    } else if ((financial?.receivables?.length ?? 0) > 0) {
      setInstallments((financial?.receivables ?? []).map((item, index) => ({
        id: item.id,
        label: item.installmentLabel,
        amount: String(item.amountOriginal),
        dueAt: item.dueAt ? item.dueAt.slice(0, 10) : '',
        notes: item.notes ?? ''
      })));
    } else {
      setInstallments([makeInstallment(1, String(outstanding))]);
    }
  }, [financial]);

  useEffect(() => {
    if (!createOpen && !editingItem) return;
    let active = true;
    setCatalogLoading(true);
    Promise.all([
      listServices({ page: 1, pageSize: 100, active: true }),
      listProducts({ page: 1, pageSize: 100, active: true })
    ])
      .then(([services, products]) => {
        if (!active) return;
        setCatalogOptions({ service: services.data, product: products.data });
      })
      .catch((error) => {
        console.error(error);
        if (active) toast('Não foi possível carregar o catálogo.', 'error');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });
    return () => {
      active = false;
    };
  }, [createOpen, editingItem, toast]);

  useEffect(() => {
    if (editingItem) {
      setEditForm(buildFormFromItem(editingItem));
      setEditErrors({});
    }
  }, [editingItem]);

  useEffect(() => {
    if (selectedReceivable) {
      setSettleAmountInput(String(selectedReceivable.amountOutstanding));
      setSettleNotes(selectedReceivable.notes ?? '');
    }
  }, [selectedReceivable?.id]);

  const createValidation = validateBillingForm(createForm);
  const editValidation = validateBillingForm(editForm);
  const outstandingAfterClose = Math.max(subtotal - Number(paidAmountInput || 0), 0);
  const plannedInstallmentTotal = installments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const handleCatalogSelect = (form: BillingFormState, itemId: string): BillingFormState => {
    const selected = catalogOptions[form.itemType].find((option) => option.id === itemId);
    if (!selected) return { ...form, catalogItemId: itemId };
    return {
      ...form,
      catalogItemId: itemId,
      nameSnapshot: selected.name,
      codeSnapshot: selected.code ?? '',
      unitPrice: String(selected.basePrice ?? 0)
    };
  };

  const handleCreateSubmit = async () => {
    const { payload, errors } = createValidation;
    setCreateErrors(errors);
    if (!payload) return toast('Revise os campos obrigatórios do item.', 'error');
    try {
      await createMutation.mutateAsync({ encounterId, input: payload });
      toast('Item adicionado ao billing.', 'success');
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Falha ao adicionar item.', 'error');
    }
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;
    const { payload, errors } = editValidation;
    setEditErrors(errors);
    if (!payload) return toast('Revise os campos obrigatórios do item.', 'error');
    const { itemType: _itemType, ...updatePayload } = payload as EncounterBillingCreateInput;
    try {
      await updateMutation.mutateAsync({ encounterId, billingItemId: editingItem.id, input: updatePayload as EncounterBillingUpdateInput });
      toast('Item atualizado.', 'success');
      setEditingItem(null);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Falha ao atualizar item.', 'error');
    }
  };

  const handleRemove = async (item: EncounterBillingItemRecord) => {
    if (!window.confirm(`Remover "${item.nameSnapshot}" do billing?`)) return;
    try {
      await deleteMutation.mutateAsync({ encounterId, billingItemId: item.id });
      toast('Item removido.', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Falha ao remover item.', 'error');
    }
  };

  const handleFinancialClose = async () => {
    const paidAmount = Number(paidAmountInput || 0);
    if (Number.isNaN(paidAmount) || paidAmount < 0) {
      toast('Informe um valor pago válido.', 'error');
      return;
    }
    const installmentsPayload = outstandingAfterClose > 0 ? normalizeInstallments(installments, outstandingAfterClose) : [];
    try {
      await closeFinancialMutation.mutateAsync({ encounterId, input: { paidAmount, notes: closeNotes || null, installments: installmentsPayload } });
      toast(billingLocked ? 'Fechamento financeiro reprocessado.' : 'Conta fechada com histórico e parcelas atualizados.', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Falha ao fechar conta.', 'error');
    }
  };

  const handleSettleReceivable = async () => {
    if (!selectedReceivable) return;
    const amountPaid = Number(settleAmountInput || 0);
    if (Number.isNaN(amountPaid) || amountPaid <= 0) {
      toast('Informe um valor de quitação válido.', 'error');
      return;
    }
    try {
      await settleReceivableMutation.mutateAsync({ receivableId: selectedReceivable.id, input: { amountPaid, notes: settleNotes || null } });
      toast('Recebível atualizado com sucesso.', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Falha ao registrar quitação.', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
      <FinancialCard
        financial={financial}
        loading={financialQuery.isLoading}
        closeNotes={closeNotes}
        setCloseNotes={setCloseNotes}
        paidAmountInput={paidAmountInput}
        setPaidAmountInput={setPaidAmountInput}
        installments={installments}
        setInstallments={setInstallments}
        selectedReceivable={selectedReceivable}
        receivables={receivables}
        settleAmountInput={settleAmountInput}
        setSettleAmountInput={setSettleAmountInput}
        settleNotes={settleNotes}
        setSettleNotes={setSettleNotes}
        paymentHistory={paymentHistory}
        locked={billingLocked}
        working={working}
        plannedInstallmentTotal={plannedInstallmentTotal}
        expectedInstallmentTotal={outstandingAfterClose}
        onPickReceivable={setSelectedReceivableId}
        onClose={handleFinancialClose}
        onSettle={handleSettleReceivable}
      />

      <Card>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: px(12) }}>
          <div>
            <CardTitle>Billing do atendimento</CardTitle>
            <p style={{ margin: `${px(6)} 0 0`, color: theme.colors.textSecondary, fontSize: px(14) }}>
              Itens clínicos faturáveis vinculados a este atendimento.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={billingLocked}>Adicionar item</Button>
        </CardHeader>
        <CardBody style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: px(12) }}>
            <MetricCard label="Itens" value={String(items.length)} />
            <MetricCard label="Bruto" value={money(grossTotal)} />
            <MetricCard label="Descontos" value={money(discountTotal)} />
            <MetricCard label="Subtotal" value={money(subtotal)} accent="primary" />
          </div>

          {billingQuery.error && (
            <ErrorBanner
              title="Erro ao carregar billing"
              message={billingQuery.error instanceof Error ? billingQuery.error.message : 'Falha ao carregar itens'}
              onRetry={() => void billingQuery.refetch()}
            />
          )}

          {billingQuery.isLoading ? (
            <LoadingState message="Carregando billing..." />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhum item lançado"
              description="Adicione serviços ou produtos do catálogo para começar o billing deste atendimento."
              action={<Button onClick={() => setCreateOpen(true)} disabled={billingLocked}>Adicionar primeiro item</Button>}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
              {items.map((item) => (
                <Card key={item.id} style={{ padding: px(16) }}>
                  <div style={{ ...row(16), justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: px(260) }}>
                      <div style={{ ...row(8), alignItems: 'center', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: px(16), color: theme.colors.textPrimary }}>{item.nameSnapshot}</h3>
                        <TypeBadge type={item.itemType} />
                        {item.codeSnapshot && <MetaPill>Cod. {item.codeSnapshot}</MetaPill>}
                      </div>
                      <div style={{ ...row(16), marginTop: px(8), color: theme.colors.textSecondary, fontSize: px(14), flexWrap: 'wrap' }}>
                        <span>Qtd: {item.quantity}</span>
                        <span>Unitário: {money(item.unitPrice)}</span>
                        <span>Desconto: {money(item.discountAmount ?? 0)}</span>
                        <span>Total: {money(item.lineTotal)}</span>
                      </div>
                      {item.notes && <p style={{ margin: `${px(8)} 0 0`, fontSize: px(14), color: theme.colors.textSecondary }}>{item.notes}</p>}
                    </div>
                    <div style={{ ...row(8), alignItems: 'center' }}>
                      <Button variant="secondary" onClick={() => setEditingItem(item)} disabled={working || billingLocked}>Editar</Button>
                      <Button variant="ghost" onClick={() => void handleRemove(item)} disabled={working || billingLocked}>Remover</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <BillingItemModal
        isOpen={createOpen}
        title="Adicionar item ao billing"
        form={createForm}
        setForm={setCreateForm}
        errors={createErrors}
        previewSubtotal={Number(createForm.unitPrice || 0) * Number(createForm.quantity || 0) - Number(createForm.discountAmount || 0)}
        catalogOptions={catalogOptions}
        catalogLoading={catalogLoading}
        loading={createMutation.isPending}
        submitDisabled={billingLocked || !!createValidation.errors.nameSnapshot || !!createValidation.errors.unitPrice || !!createValidation.errors.quantity || !!createValidation.errors.discountAmount}
        onClose={() => { setCreateOpen(false); setCreateForm(EMPTY_FORM); setCreateErrors({}); }}
        onSubmit={() => void handleCreateSubmit()}
        onCatalogSelect={(itemId) => setCreateForm((prev) => handleCatalogSelect(prev, itemId))}
      />

      <BillingItemModal
        isOpen={!!editingItem}
        title="Editar item do billing"
        form={editForm}
        setForm={setEditForm}
        errors={editErrors}
        previewSubtotal={Number(editForm.unitPrice || 0) * Number(editForm.quantity || 0) - Number(editForm.discountAmount || 0)}
        catalogOptions={catalogOptions}
        catalogLoading={catalogLoading}
        loading={updateMutation.isPending}
        submitDisabled={billingLocked || !!editValidation.errors.nameSnapshot || !!editValidation.errors.unitPrice || !!editValidation.errors.quantity || !!editValidation.errors.discountAmount}
        onClose={() => { setEditingItem(null); setEditErrors({}); }}
        onSubmit={() => void handleEditSubmit()}
        onCatalogSelect={(itemId) => setEditForm((prev) => handleCatalogSelect(prev, itemId))}
      />
    </div>
  );
}

function BillingItemModal({ isOpen, title, form, setForm, errors, previewSubtotal, catalogOptions, catalogLoading, loading, submitDisabled, onClose, onSubmit, onCatalogSelect }: {
  isOpen: boolean;
  title: string;
  form: BillingFormState;
  setForm: React.Dispatch<React.SetStateAction<BillingFormState>>;
  errors: BillingFormErrors;
  previewSubtotal: number;
  catalogOptions: Record<BillingItemType, CatalogRecord[]>;
  catalogLoading: boolean;
  loading: boolean;
  submitDisabled: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onCatalogSelect: (itemId: string) => void;
}) {
  const options = catalogOptions[form.itemType];
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg" footer={<><Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button><Button onClick={onSubmit} isLoading={loading} disabled={submitDisabled}>Salvar</Button></>}>
      <div style={{ display: 'grid', gap: px(16) }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: px(12) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
            <label style={{ fontSize: px(14), fontWeight: 500 }}>Tipo</label>
            <select value={form.itemType} onChange={(e) => setForm((prev) => ({ ...prev, itemType: e.target.value as BillingItemType, catalogItemId: '', nameSnapshot: '', codeSnapshot: '', unitPrice: '0', discountAmount: '0' }))} style={selectStyle}>
              <option value="service">Serviço</option>
              <option value="product">Produto</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
            <label style={{ fontSize: px(14), fontWeight: 500 }}>Catálogo</label>
            <select value={form.catalogItemId} onChange={(e) => onCatalogSelect(e.target.value)} style={selectStyle} disabled={catalogLoading}>
              <option value="">Selecionar item...</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.name} · {money(option.basePrice)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: px(12) }}>
          <Input label="Nome *" value={form.nameSnapshot} error={errors.nameSnapshot} onChange={(e) => setForm((prev) => ({ ...prev, nameSnapshot: e.target.value }))} />
          <Input label="Código" value={form.codeSnapshot} onChange={(e) => setForm((prev) => ({ ...prev, codeSnapshot: e.target.value }))} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: px(12) }}>
          <Input label="Preço unitário *" type="number" min="0" step="0.01" value={form.unitPrice} error={errors.unitPrice} onChange={(e) => setForm((prev) => ({ ...prev, unitPrice: e.target.value }))} />
          <Input label="Quantidade *" type="number" min="1" step="1" value={form.quantity} error={errors.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} />
          <Input label="Desconto" type="number" min="0" step="0.01" value={form.discountAmount} error={errors.discountAmount} onChange={(e) => setForm((prev) => ({ ...prev, discountAmount: e.target.value }))} />
          <Input label="Subtotal" value={money(previewSubtotal)} readOnly />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
          <label style={{ fontSize: px(14), fontWeight: 500 }}>Observações</label>
          <textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={4} style={{ width: '100%', padding: px(10), borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, fontSize: px(14), resize: 'vertical' }} />
        </div>
        {catalogLoading && <InlineError message="Carregando opções do catálogo..." style={{ color: theme.colors.info }} />}
      </div>
    </Modal>
  );
}

function FinancialCard({ financial, loading, closeNotes, setCloseNotes, paidAmountInput, setPaidAmountInput, installments, setInstallments, receivables, selectedReceivable, settleAmountInput, setSettleAmountInput, settleNotes, setSettleNotes, paymentHistory, locked, working, plannedInstallmentTotal, expectedInstallmentTotal, onPickReceivable, onClose, onSettle }: any) {
  if (loading && !financial) return <LoadingState message="Carregando status financeiro..." />;
  const status = financial?.financialStatus ?? 'pending';
  const statusLabel = status === 'paid' ? 'Pago' : status === 'partial' ? 'Parcial' : 'Pendente';

  return (
    <Card style={{ padding: px(16) }}>
      <div style={{ display: 'grid', gap: px(16) }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: px(12) }}>
          <MetricCard label="Situação" value={statusLabel} accent="primary" />
          <MetricCard label="Total" value={money(financial?.total ?? 0)} />
          <MetricCard label="Pago" value={money(financial?.paidAmount ?? 0)} />
          <MetricCard label="Saldo" value={money(financial?.balanceDue ?? 0)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: px(16) }}>
          <div style={{ display: 'grid', gap: px(10) }}>
            <h3 style={{ margin: 0, fontSize: px(16) }}>Fechamento / reprocessamento</h3>
            <Input label="Valor pago no fechamento" type="number" min="0" step="0.01" value={paidAmountInput} onChange={(e) => setPaidAmountInput(e.target.value)} disabled={working} />
            <div style={{ display: 'grid', gap: px(8), border: `1px solid ${theme.colors.border}`, borderRadius: px(theme.radius.md), padding: px(12) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Parcelas / múltiplas baixas</strong>
                <Button variant="secondary" size="sm" onClick={() => setInstallments((prev: InstallmentFormState[]) => [...prev, makeInstallment(prev.length + 1)])} disabled={working}>Adicionar parcela</Button>
              </div>
              {installments.map((item: InstallmentFormState, index: number) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: px(8), alignItems: 'end' }}>
                  <Input label={`Rótulo ${index + 1}`} value={item.label} onChange={(e) => setInstallments((prev: InstallmentFormState[]) => prev.map((current) => current.id === item.id ? { ...current, label: e.target.value } : current))} />
                  <Input label="Valor" type="number" min="0" step="0.01" value={item.amount} onChange={(e) => setInstallments((prev: InstallmentFormState[]) => prev.map((current) => current.id === item.id ? { ...current, amount: e.target.value } : current))} />
                  <Input label="Vencimento" type="date" value={item.dueAt} onChange={(e) => setInstallments((prev: InstallmentFormState[]) => prev.map((current) => current.id === item.id ? { ...current, dueAt: e.target.value } : current))} />
                  <Button variant="ghost" onClick={() => setInstallments((prev: InstallmentFormState[]) => prev.length === 1 ? [makeInstallment(1)] : prev.filter((current) => current.id !== item.id))} disabled={working}>Remover</Button>
                </div>
              ))}
              <div style={{ ...row(12), flexWrap: 'wrap' }}>
                <MetaPill>Planejado: {money(plannedInstallmentTotal)}</MetaPill>
                <MetaPill>Esperado: {money(expectedInstallmentTotal)}</MetaPill>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
              <label style={{ fontSize: px(14), fontWeight: 500 }}>Observações</label>
              <textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={4} style={{ width: '100%', padding: px(10), borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, resize: 'vertical' }} />
            </div>
            <Button onClick={onClose} isLoading={working}>{locked ? 'Reprocessar fechamento' : 'Fechar conta'}</Button>
          </div>

          <div style={{ display: 'grid', gap: px(10) }}>
            <h3 style={{ margin: 0, fontSize: px(16) }}>Recebíveis e histórico</h3>
            {receivables?.length ? (
              <>
                <div style={{ display: 'grid', gap: px(8) }}>
                  {receivables.map((receivable: EncounterReceivableRecord) => (
                    <button key={receivable.id} type="button" onClick={() => onPickReceivable(receivable.id)} style={{ textAlign: 'left', padding: px(12), borderRadius: px(theme.radius.md), border: `1px solid ${selectedReceivable?.id === receivable.id ? theme.colors.primary : theme.colors.border}`, background: '#fff' }}>
                      <div style={{ ...row(8), justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <strong>{receivable.installmentLabel}</strong>
                        <MetaPill>{receivable.status === 'settled' ? 'Quitado' : 'Em aberto'}</MetaPill>
                      </div>
                      <div style={{ ...row(12), marginTop: px(6), flexWrap: 'wrap', color: theme.colors.textSecondary, fontSize: px(13) }}>
                        <span>Venc.: {formatDate(receivable.dueAt)}</span>
                        <span>Original: {money(receivable.amountOriginal)}</span>
                        <span>Recebido: {money(receivable.amountPaid)}</span>
                        <span>Aberto: {money(receivable.amountOutstanding)}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {selectedReceivable && (
                  <div style={{ display: 'grid', gap: px(10), borderTop: `1px solid ${theme.colors.border}`, paddingTop: px(12) }}>
                    <strong>Registrar baixa em {selectedReceivable.installmentLabel}</strong>
                    <Input label="Valor recebido agora" type="number" min="0.01" step="0.01" value={settleAmountInput} onChange={(e) => setSettleAmountInput(e.target.value)} disabled={working || selectedReceivable.status === 'settled'} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
                      <label style={{ fontSize: px(14), fontWeight: 500 }}>Observação da baixa</label>
                      <textarea value={settleNotes} onChange={(e) => setSettleNotes(e.target.value)} rows={3} style={{ width: '100%', padding: px(10), borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, resize: 'vertical' }} />
                    </div>
                    <Button onClick={onSettle} isLoading={working} disabled={selectedReceivable.status === 'settled'}>
                      {selectedReceivable.status === 'settled' ? 'Parcela quitada' : 'Registrar baixa'}
                    </Button>
                  </div>
                )}
                <div style={{ display: 'grid', gap: px(8), borderTop: `1px solid ${theme.colors.border}`, paddingTop: px(12) }}>
                  <strong>Histórico de quitações</strong>
                  {paymentHistory.length ? paymentHistory.map((payment: EncounterReceivablePaymentRecord) => (
                    <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: px(12), flexWrap: 'wrap', fontSize: px(14), color: theme.colors.textSecondary }}>
                      <span>{formatDate(payment.paidAt)} · {money(payment.amountPaid)}</span>
                      <span>{payment.notes || 'Sem observação'}</span>
                    </div>
                  )) : <span style={{ color: theme.colors.textSecondary, fontSize: px(14) }}>Nenhuma quitação registrada ainda.</span>}
                </div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: px(14), color: theme.colors.textSecondary }}>Nenhum recebível gerado ainda. Ao fechar com saldo pendente, o sistema cria uma ou mais parcelas.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function MetricCard({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'primary' }) {
  return <div style={{ border: `1px solid ${accent === 'primary' ? theme.colors.primary : theme.colors.border}`, borderRadius: px(theme.radius.md), padding: px(14), background: accent === 'primary' ? '#eff6ff' : theme.colors.surface }}><div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{label}</div><div style={{ marginTop: px(6), fontSize: px(20), fontWeight: 700 }}>{value}</div></div>;
}
function TypeBadge({ type }: { type: BillingItemType }) { return <MetaPill>{type === 'service' ? 'Serviço' : 'Produto'}</MetaPill>; }
function MetaPill({ children }: { children: React.ReactNode }) { return <span style={{ fontSize: px(12), borderRadius: px(999), padding: `${px(4)} ${px(8)}`, background: '#f1f5f9', color: theme.colors.textSecondary }}>{children}</span>; }
const selectStyle: React.CSSProperties = { width: '100%', height: px(40), padding: `0 ${px(12)}`, borderRadius: px(theme.radius.sm), border: `1px solid ${theme.colors.border}`, fontSize: px(14), background: theme.colors.surface };

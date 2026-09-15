// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getByEncounter: vi.fn()
}));

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mocks.apiRequest(...args)
}));

vi.mock('../medicalRecords', () => ({
  medicalRecordsService: {
    getByEncounter: (...args: unknown[]) => mocks.getByEncounter(...args)
  }
}));

const emptyItems = { items: [] };

describe('SPA service contracts for critical domains', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
    mocks.getByEncounter.mockReset();
    mocks.apiRequest.mockResolvedValue(emptyItems);
  });

  it('keeps billing, commercial, commission, and payable commands on canonical endpoints', async () => {
    const { billingService } = await import('../billing');
    await billingService.list({ encounterId: 'enc/1', patientId: 'pat 1', ownerId: 'owner-1' });
    await billingService.list();
    await billingService.getByEncounter('enc-1');
    await billingService.createEstimate({ encounterId: 'enc-1' } as never);
    await billingService.addItem({ billingRecordId: 'bill-1' } as never);
    await billingService.listItems('enc-1');
    await billingService.updateStatus('enc-1', { status: 'settled' } as never);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/billing?encounterId=enc%2F1&patientId=pat+1&ownerId=owner-1'
    );
    expect(mocks.apiRequest).toHaveBeenCalledWith('/billing');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/billing/enc-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'settled' })
    });

    const { getLoyaltySummary, listLoyaltyRedemptions, redeemLoyaltyPoints, listPriceTables,
      getPriceTableDetail, createPriceTable, updatePriceTable, archivePriceTable,
      addPriceTableItem, createPosSyncJob, listPosSyncJobs, completePosSyncJob } =
      await import('../commercial');
    await getLoyaltySummary();
    await getLoyaltySummary('owner/1');
    await listLoyaltyRedemptions('owner/1');
    await redeemLoyaltyPoints({ ownerId: 'owner-1', pointsUsed: 10, rewardDescription: 'Banho' });
    await listPriceTables({ search: 'Tabela A', active: false });
    await getPriceTableDetail('table/1');
    await createPriceTable({ description: 'Tabela A' });
    await updatePriceTable('table/1', { description: 'Tabela B' });
    await archivePriceTable('table/1');
    await addPriceTableItem('table/1', { itemKind: 'service', itemId: 'service-1', price: 50 });
    await createPosSyncJob('stock');
    await listPosSyncJobs();
    await completePosSyncJob('job/1', 3);

    expect(mocks.apiRequest).toHaveBeenCalledWith('/loyalty/summary');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/loyalty/summary?ownerId=owner%2F1');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/price-tables?search=Tabela+A&active=false');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/price-tables/table%2F1', expect.anything());
    expect(mocks.apiRequest).toHaveBeenCalledWith('/pos-sync/jobs', {
      method: 'POST',
      body: JSON.stringify({ syncKind: 'stock', metadata: { source: 'spa' } })
    });

    const { commissionService } = await import('../commissions');
    await commissionService.listRules();
    await commissionService.listRules(false);
    await commissionService.listRules(true);
    await commissionService.createRule({ description: 'Regra', percentage: 5 });
    await commissionService.listCalculations();
    await commissionService.calculate({ periodStart: '2026-09-01', periodEnd: '2026-09-30', lines: [] });
    await commissionService.review('calculation/1');
    await commissionService.pay('calculation/1', { paymentMethod: 'pix' });
    await commissionService.cancel('calculation/1');

    expect(mocks.apiRequest).toHaveBeenCalledWith('/commission-rules?active=false');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/commission-calculations/calculation%2F1/pay', {
      method: 'POST',
      body: JSON.stringify({ paymentMethod: 'pix' })
    });

    const { financialPayablesService } = await import('../financialPayables');
    await financialPayablesService.list();
    await financialPayablesService.list({ search: 'Fornecedor', status: 'open', page: 2, pageSize: 20 });
    await financialPayablesService.create({
      supplierName: 'Fornecedor', description: 'Insumos', category: 'Operação',
      costCenterCode: 'CC-1', costCenterName: 'Clínica', dueAt: '2026-09-30', totalAmount: 100
    });
    await financialPayablesService.pay('payable/1', { amountPaid: 25, paymentMethod: 'cash' });
    await financialPayablesService.cancel('payable/1', null);
    await financialPayablesService.listReconciliation({ status: 'pending', search: 'Fornecedor', page: 1, pageSize: 10 });
    await financialPayablesService.reconcile('payable/1', { reconciliationReference: 'conc-1' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/financial/payables?search=Fornecedor&status=open&page=2&pageSize=20'
    );
    expect(mocks.apiRequest).toHaveBeenCalledWith('/financial/payables/payable%2F1/cancel', {
      method: 'POST',
      body: JSON.stringify({ notes: null })
    });
  });

  it('serializes financial filters and computes the unified reconciliation view', async () => {
    mocks.apiRequest.mockImplementation((path: string) => {
      if (path.startsWith('/financial/reconciliation/cards')) {
        return {
          data: [{
            transactionId: 'card-1', provider: 'acquirer', status: 'captured', amount: 20.205,
            description: '', billingRecordId: null, ownerName: null, patientName: 'Luna',
            cardHolderName: 'Maria', reconciliationState: 'attention_required',
            billingSettlementStatus: 'pending'
          }], total: 1, capturedCount: 1, awaitingCaptureCount: 0, attentionCount: 1,
          pendingCount: 0, reconciledCount: 0
        };
      }
      if (path.startsWith('/financial/reconciliation/payables')) {
        return {
          data: [{
            id: 'payable-1', paymentMethod: null, description: 'Insumos', supplierName: 'Fornecedor',
            paidAmount: 30.306, status: 'open', reconciliationStatus: 'pending',
            reconciliationReference: null, paymentReference: 'pay-ref'
          }], total: 1, pendingCount: 1, reconciledCount: 0, pendingAmount: 30.306, reconciledAmount: 0
        };
      }
      return {
        data: [{
          transactionId: 'pix-1', provider: 'local', status: 'completed', amount: 10.104,
          description: '', billingRecordId: null, ownerName: null, patientName: null,
          reconciliationState: 'reconciled', cashReconciliationStatus: 'done',
          billingSettlementStatus: 'settled'
        }], total: 1, completedCount: 1, reconciledCount: 1, attentionCount: 0, pendingCount: 0
      };
    });

    const { financialReceivablesService } = await import('../financialReceivables');
    await financialReceivablesService.list({
      search: '  João  ', status: 'open', dueFrom: '2026-09-01', dueTo: '2026-09-30', page: 2, pageSize: 25
    });
    await financialReceivablesService.list();
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/financial/receivables?search=Jo%C3%A3o&status=open&dueFrom=2026-09-01&dueTo=2026-09-30&page=2&pageSize=25'
    );
    expect(mocks.apiRequest).toHaveBeenCalledWith('/financial/receivables');

    const { financialStatementsService } = await import('../financialStatements');
    await financialStatementsService.getIncomeStatement({ dateFrom: '2026-09-01', dateTo: '2026-09-30' });
    await financialStatementsService.getIncomeStatement();
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      '/financial/income-statement?dateFrom=2026-09-01&dateTo=2026-09-30'
    );

    const { financialReconciliationService } = await import('../financialReconciliation');
    const unified = await financialReconciliationService.getUnified({ search: '  João  ', page: 1, pageSize: 25 });

    expect(unified.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'pix-1', description: 'pix-1', counterparty: 'Cliente não vinculado', nextAction: 'Monitorar' }),
      expect.objectContaining({ id: 'card-1', description: 'card-1', counterparty: 'Maria · Luna', nextAction: 'Conferir cartão' }),
      expect.objectContaining({ id: 'payable-1', origin: 'Pagável · não informado', reference: 'pay-ref', nextAction: 'Conciliar pagável' })
    ]));
    expect(unified.totals).toMatchObject({
      totalCount: 3, reconciledCount: 1, pendingCount: 1, attentionCount: 1,
      totalAmount: 60.61, reconciledAmount: 10.1, pendingAmount: 30.31, attentionAmount: 20.2
    });
    expect(mocks.apiRequest).toHaveBeenCalledWith('/financial/reconciliation?search=Jo%C3%A3o&page=1&pageSize=25');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/financial/reconciliation/cards?search=Jo%C3%A3o&page=1&pageSize=25');
  });

  it('covers the clinical service transport contracts and preserves encoded identifiers', async () => {
    const { dischargeService } = await import('../discharges');
    await dischargeService.list();
    await dischargeService.getById('discharge/1');
    await dischargeService.create({ stayId: 'stay-1' } as never);
    await dischargeService.update('discharge/1', { expectedVersion: 2 } as never);

    const { inpatientService } = await import('../inpatient');
    await inpatientService.admit({ encounterId: 'enc-1', patientId: 'pat-1', unit: 'U', ward: 'W', bed: 'B' });
    await inpatientService.list();
    await inpatientService.list('enc/1');
    await inpatientService.list({ patientId: 'pat-1', includeDischarged: true });
    await inpatientService.assignBed('stay-1', {} as never);
    await inpatientService.transferBed('stay-1', {} as never);
    await inpatientService.updateStatus('stay-1', { status: 'discharged' } as never);
    await inpatientService.listProgress('stay-1');
    await inpatientService.addProgress('stay-1', 'Evolução');
    await inpatientService.listOccurrences('stay-1');
    await inpatientService.addOccurrence('stay-1', { type: 'clinical', title: 'Alerta', description: 'Descrição' } as never);
    await inpatientService.listDailyCharges('stay-1');
    await inpatientService.listDailyChargeWorklist({ status: 'pending', unit: 'U', ward: 'W' });
    await inpatientService.createDailyCharge('stay-1', { description: 'Diária', unitAmount: 100 });
    await inpatientService.markDailyChargeBilled('stay-1', 'charge-1', 'billing-1');
    await inpatientService.listSectors();
    await inpatientService.createSector({ code: 'U', name: 'Unidade', kind: 'ward' });
    await inpatientService.listBeds({ sectorId: 'sector-1', code: 'A/1', description: 'Box', active: false });
    await inpatientService.createBed({ sectorId: 'sector-1', code: 'A/1', name: 'Box 1' });
    await inpatientService.getBedById('bed/1');
    await inpatientService.updateBed('bed/1', { active: false });
    await inpatientService.archiveBed('bed/1');
    await inpatientService.getBedMap();

    expect(mocks.apiRequest).toHaveBeenCalledWith('/inpatient?encounterId=enc%2F1');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/inpatient?patientId=pat-1&includeDischarged=true');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/beds?sectorId=sector-1&code=A%2F1&description=Box&active=false');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/beds/bed%2F1');

    const { listTriageRecords, createTriage, updateTriage, getTriageHistory } = await import('../triage');
    mocks.apiRequest.mockResolvedValueOnce({ records: [] }).mockResolvedValueOnce({ items: [] });
    await listTriageRecords('enc/1');
    await listTriageRecords();
    await createTriage({ encounterId: 'enc-1' } as never);
    await updateTriage('triage/1', {} as never);
    await getTriageHistory('triage/1');

    const { encounterService } = await import('../encounter');
    await encounterService.list();
    await encounterService.getById('enc/1');
    await encounterService.create({} as never);
    await encounterService.transition('enc/1', {} as never);
    await encounterService.close('enc/1', {} as never);
    await encounterService.getTimeline('enc/1');
    await encounterService.getSummary('enc/1');
    await encounterService.getFinancialSummary('enc/1');
    await encounterService.closeFinancial('enc/1', { installments: [{ amount: 10 }] });
    await encounterService.createCashReceipt('enc/1', { cashRegisterId: 'cash', expectedAmount: 10 }, 'key-1');
    await encounterService.getCashReceiptForEncounter('enc/1');
    await encounterService.reverseCashReceipt('enc/1', 'receipt/1', 'Correção', 'key-2');

    expect(mocks.apiRequest).toHaveBeenCalledWith('/encounters/enc/1/cash-receipts');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/encounters/enc/1/cash-receipts/receipt/1/reverse', expect.anything());
  });

  it('covers prescription execution, prescription parsing, and webhook lifecycle commands', async () => {
    mocks.getByEncounter.mockResolvedValue({ record: { id: 'record-1' } });

    const { prescriptionsService } = await import('../prescriptions');
    await prescriptionsService.listByEncounter('enc/1');
    await prescriptionsService.listByPatient('patient/1');
    await prescriptionsService.create({ encounterId: 'enc-1', patientId: 'pat-1', title: 'Dipirona', content: '\n' });
    await prescriptionsService.getById('prescription/1');
    await prescriptionsService.renderDocument('prescription/1', {} as never);
    await prescriptionsService.update('prescription/1', { reason: 'Ajuste' });
    await prescriptionsService.archive('prescription/1', { reason: 'Encerramento' });

    const { prescriptionExecutionsService } = await import('../prescription-executions');
    await prescriptionExecutionsService.list();
    await prescriptionExecutionsService.list({ encounterId: 'enc-1', patientId: 'pat-1' });
    await prescriptionExecutionsService.getById('execution/1');
    await prescriptionExecutionsService.create({} as never);
    await prescriptionExecutionsService.execute('execution/1', {} as never);
    await prescriptionExecutionsService.suspend('execution/1', {} as never);
    await prescriptionExecutionsService.resume('execution/1');
    await prescriptionExecutionsService.logEvent('execution/1', {} as never);

    const { webhookService } = await import('../webhook');
    await webhookService.list();
    await webhookService.list({ url: 'https://example.test/hook', event: 'invoice.created', active: false });
    await webhookService.getById('webhook/1');
    await webhookService.create({ url: 'https://example.test/hook', events: [] } as never);
    await webhookService.update('webhook/1', {} as never);
    await webhookService.delete('webhook/1');
    await webhookService.test('webhook/1');
    await webhookService.getDeliveries('webhook/1');

    expect(mocks.apiRequest).toHaveBeenCalledWith('/prescriptions?patientId=patient%2F1');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/prescription-executions?encounterId=enc-1&patientId=pat-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/webhooks?url=https%3A%2F%2Fexample.test%2Fhook&event=invoice.created&active=false');
    expect(mocks.apiRequest).toHaveBeenCalledWith('/webhooks/webhook/1/test', { method: 'POST' });
  });
});

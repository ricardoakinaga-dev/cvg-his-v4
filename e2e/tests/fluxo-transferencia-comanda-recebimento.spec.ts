import { expect, test } from '../fixtures/cvg-his.fixture';

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

test.describe('Fluxo vertical de transferência, comanda e recebimento', () => {
  test('persists handoff receipt, clinical comanda context and close receipt', async ({
    apiContext,
    createOwner,
    createPatient
  }) => {
    const suffix = uniqueSuffix();
    const owner = await createOwner(`Tutor fluxo vertical ${suffix}`);
    const patient = await createPatient(owner.id, `Paciente fluxo vertical ${suffix}`);

    const checkIn = await apiContext.post('/queue/check-in', {
      data: {
        patientId: patient.id,
        ownerId: owner.id,
        reason: `Fluxo vertical ${suffix}`,
        priority: 'high'
      }
    });
    expect(checkIn.status()).toBe(201);
    const queueEntry = await checkIn.json();

    const call = await apiContext.post(`/queue/${queueEntry.id}/call`);
    expect(call.ok()).toBeTruthy();

    const transfer = await apiContext.post(`/queue/${queueEntry.id}/transfer`, {
      data: {
        toSector: 'consultorio',
        reason: 'Recebimento explícito pelo setor clínico'
      }
    });
    expect(transfer.ok()).toBeTruthy();
    expect((await transfer.json()).operationalStatus).toBe('waiting_handoff');

    const transferList = await apiContext.get(`/queue/${queueEntry.id}/transfers`);
    expect(transferList.ok()).toBeTruthy();
    const transferPayload = await transferList.json();
    expect(transferPayload.items).toHaveLength(1);
    expect(transferPayload.items[0].status).toBe('sent');

    const receive = await apiContext.post(
      `/queue/${queueEntry.id}/transfers/${transferPayload.items[0].id}/receive`
    );
    expect(receive.ok()).toBeTruthy();
    expect((await receive.json()).operationalStatus).toBe('waiting');

    const saleOpen = await apiContext.post('/counter-sales', {
      data: {
        ownerId: owner.id,
        patientId: patient.id,
        queueEntryId: queueEntry.id,
        notes: `Comanda do fluxo ${suffix}`
      }
    });
    expect(saleOpen.status()).toBe(201);
    const sale = await saleOpen.json();
    expect(sale.patientId).toBe(patient.id);
    expect(sale.queueEntryId).toBe(queueEntry.id);

    const item = await apiContext.post(`/counter-sales/${sale.id}/items`, {
      data: {
        itemType: 'service',
        nameSnapshot: 'Consulta fluxo vertical',
        unitPrice: 80
      }
    });
    expect(item.status()).toBe(201);

    const payment = await apiContext.post(`/counter-sales/${sale.id}/payments`, {
      data: { method: 'pix', amount: 80 }
    });
    expect(payment.status()).toBe(201);

    const close = await apiContext.post(`/counter-sales/${sale.id}/close`);
    expect(close.status()).toBe(200);
    const closed = await close.json();
    expect(closed.status).toBe('closed');
    expect(closed.receipt).toMatchObject({
      counterSaleId: sale.id,
      amount: 80,
      currency: 'BRL'
    });
  });
});

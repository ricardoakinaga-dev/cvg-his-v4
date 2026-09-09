import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApiRequest = vi.fn();

vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args)
}));

describe('diagnostic mutation services', () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ id: 'resource-1' });
  });

  it('forwards caller-owned idempotency for laboratory order creation and result transitions', async () => {
    const { laboratoryService } = await import('../laboratory');

    await laboratoryService.createOrder(
      {
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examType: 'Hemograma',
        reason: 'Controle'
      },
      { idempotencyKey: 'lab-order-1' }
    );
    await laboratoryService.recordResult(
      'order-1',
      { status: 'resulted', resultSummary: 'Sem alterações' },
      { idempotencyKey: 'lab-result-1' }
    );

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/laboratory/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'lab-order-1' },
      body: JSON.stringify({
        encounterId: 'enc-1',
        patientId: 'pat-1',
        examType: 'Hemograma',
        reason: 'Controle'
      })
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/laboratory/orders/order-1/result', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'lab-result-1' },
      body: JSON.stringify({ status: 'resulted', resultSummary: 'Sem alterações' })
    });
  });

  it('forwards caller-owned idempotency for diagnostic attachment uploads', async () => {
    const { attachmentService } = await import('../attachments');

    await attachmentService.upload(
      {
        linkedEntityType: 'medical_record',
        linkedEntityId: 'mr-1',
        category: 'lab',
        fileName: 'laudo.pdf',
        mimeType: 'application/pdf',
        checksum: 'sha256:laudo'
      },
      { idempotencyKey: 'attachment-1' }
    );

    expect(mockApiRequest).toHaveBeenCalledWith('/attachments', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'attachment-1' },
      body: JSON.stringify({
        linkedEntityType: 'medical_record',
        linkedEntityId: 'mr-1',
        category: 'lab',
        fileName: 'laudo.pdf',
        mimeType: 'application/pdf',
        checksum: 'sha256:laudo'
      })
    });
  });
});

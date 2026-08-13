import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import {
  QuotesService,
  type QuoteItemRecord,
  type QuoteRecord,
  type QuotesRepository
} from './index.js';

function createService() {
  return new QuotesService();
}

const ACCOUNT_ID = 'acc_test_001' as AccountId;
const FOREIGN_ACCOUNT_ID = 'acc_test_002' as AccountId;
const USER_ID = 'user_001' as UserId;

test('QuotesService create creates a quote with correct fields', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID, { notes: 'Test quote' });
  assert.equal(quote.accountId, ACCOUNT_ID);
  assert.equal(quote.createdByUserId, USER_ID);
  assert.equal(quote.status, 'draft');
  assert.equal(quote.subtotal, 0);
  assert.equal(quote.total, 0);
  assert.ok(quote.id);
  assert.ok(quote.number);
  assert.ok(quote.number.startsWith('QT-'));
});

test('QuotesService addItem adds product item', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const result = await service.addItem(quote.id, {
    itemType: 'product',
    nameSnapshot: 'Dipirona',
    codeSnapshot: 'MED-001',
    unitPrice: 12.5,
    quantity: 2
  });
  assert.equal(result.item.itemType, 'product');
  assert.equal(result.item.nameSnapshot, 'Dipirona');
  assert.equal(result.item.unitPrice, 12.5);
  assert.equal(result.item.quantity, 2);
  assert.equal(result.item.lineTotal, 25);
  assert.equal(result.quote.subtotal, 25);
  assert.equal(result.quote.total, 25);
});

test('QuotesService addItem adds service item', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const result = await service.addItem(quote.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta',
    unitPrice: 120
  });
  assert.equal(result.item.itemType, 'service');
  assert.equal(result.item.lineTotal, 120);
  assert.equal(result.quote.total, 120);
});

test('QuotesService updateItem updates quantity and discount', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const { item } = await service.addItem(quote.id, {
    itemType: 'product',
    nameSnapshot: 'Item',
    unitPrice: 10,
    quantity: 1
  });
  const result = await service.updateItem(item.id, { quantity: 3, discountAmount: 5 });
  assert.equal(result.item.quantity, 3);
  assert.equal(result.item.discountAmount, 5);
  assert.equal(result.item.lineTotal, 25);
  assert.equal(result.quote.total, 25);
});

test('QuotesService removeItem removes and recalculates', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  await service.addItem(quote.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 10 });
  const { item } = await service.addItem(quote.id, {
    itemType: 'product',
    nameSnapshot: 'B',
    unitPrice: 20
  });
  const updated = await service.removeItem(item.id);
  assert.equal(updated.total, 10);
  assert.equal(service.getItems(quote.id).length, 1);
});

test('QuotesService approve changes status to approved', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const approved = await service.approve(quote.id);
  assert.equal(approved.status, 'approved');
});

test('QuotesService reject changes status to rejected', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const rejected = await service.reject(quote.id);
  assert.equal(rejected.status, 'rejected');
});

test('QuotesService cancel changes status to cancelled', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const cancelled = await service.cancel(quote.id);
  assert.equal(cancelled.status, 'cancelled');
});

test('QuotesService rejects cross-account reads and mutations before state changes', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);

  assert.throws(() => service.getForAccountOrThrow(quote.id, FOREIGN_ACCOUNT_ID), NotFoundError);
  await assert.rejects(
    () =>
      service.addItem(
        quote.id,
        { itemType: 'product', nameSnapshot: 'Segredo', unitPrice: 10 },
        FOREIGN_ACCOUNT_ID
      ),
    NotFoundError
  );
  await assert.rejects(() => service.approve(quote.id, FOREIGN_ACCOUNT_ID), NotFoundError);
  await assert.rejects(() => service.cancel(quote.id, FOREIGN_ACCOUNT_ID), NotFoundError);

  const unchanged = service.getForAccountOrThrow(quote.id, ACCOUNT_ID);
  assert.equal(unchanged.status, 'draft');
  assert.equal(service.getItems(quote.id, ACCOUNT_ID).length, 0);
});

test('QuotesService addItem rejects on non-draft quote', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  await service.approve(quote.id);
  await assert.rejects(
    () => service.addItem(quote.id, { itemType: 'product', nameSnapshot: 'X', unitPrice: 10 }),
    ConflictError
  );
});

test('QuotesService update rejects on non-draft quote', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  await service.approve(quote.id);
  await assert.rejects(() => service.update(quote.id, { notes: 'Updated' }), ConflictError);
});

test('QuotesService list filters by status', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, USER_ID);
  const q2 = await service.create(ACCOUNT_ID, USER_ID);
  await service.approve(q2.id);
  const drafts = service.list(ACCOUNT_ID, { status: 'draft' });
  const approved = service.list(ACCOUNT_ID, { status: 'approved' });
  assert.equal(drafts.length, 1);
  assert.equal(approved.length, 1);
});

test('QuotesService list filters by search', async () => {
  const service = createService();
  await service.create(ACCOUNT_ID, USER_ID, { notes: 'Cliente Joao' });
  await service.create(ACCOUNT_ID, USER_ID, { notes: 'Cliente Maria' });
  const results = service.list(ACCOUNT_ID, { search: 'joao' });
  assert.equal(results.length, 1);
});

test('QuotesService getItems returns items for quote', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  await service.addItem(quote.id, { itemType: 'product', nameSnapshot: 'A', unitPrice: 10 });
  await service.addItem(quote.id, { itemType: 'service', nameSnapshot: 'B', unitPrice: 20 });
  const items = service.getItems(quote.id);
  assert.equal(items.length, 2);
});

test('QuotesService generatePrintHtml returns valid HTML', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  await service.addItem(quote.id, {
    itemType: 'product',
    nameSnapshot: 'Dipirona',
    unitPrice: 12.5,
    quantity: 2
  });
  const items = service.getItems(quote.id);
  const html = service.generatePrintHtml(quote, items);
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('Dipirona'));
  assert.ok(html.includes('25.00'));
  assert.ok(html.includes('window.print()'));
});

test('QuotesService generatePdfBuffer returns a dedicated PDF payload', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID, { notes: 'Versao PDF' });
  await service.addItem(quote.id, {
    itemType: 'service',
    nameSnapshot: 'Consulta clinica',
    unitPrice: 180,
    quantity: 1
  });

  const pdf = service.generatePdfBuffer(quote, service.getItems(quote.id));

  assert.ok(pdf.subarray(0, 8).toString('utf8').startsWith('%PDF-1.4'));
  assert.ok(pdf.toString('utf8').includes('Consulta clinica'));
  assert.ok(pdf.toString('utf8').includes('Orcamento'));
});

test('QuotesService convertToSale marks quote as converted once approved', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  await service.approve(quote.id);

  const converted = await service.convertToSale(quote.id, 'sale_001');

  assert.equal(converted.convertedToSaleId, 'sale_001');
  assert.ok(converted.convertedAt);
});

test('QuotesService persistenceMode is in-memory without repository', () => {
  const service = createService();
  assert.equal(service.persistenceMode, 'in-memory');
});

test('QuotesService findById returns quote by id', async () => {
  const service = createService();
  const quote = await service.create(ACCOUNT_ID, USER_ID);
  const found = service.findById(quote.id);
  assert.ok(found);
  assert.equal(found.id, quote.id);
});

test('QuotesService getOrThrow throws NotFoundError for unknown id', async () => {
  const service = createService();
  assert.throws(() => service.getOrThrow('nonexistent'), NotFoundError);
});

test('QuotesService hydrates repository state and continues persisted quote numbering without collisions', async () => {
  const now = '2026-08-12T10:00:00.000Z';
  const persistedQuote: QuoteRecord = {
    id: 'quote-persisted',
    accountId: ACCOUNT_ID,
    number: 'QT-000042',
    ownerId: 'owner-42',
    status: 'draft',
    validUntil: '2026-09-01',
    subtotal: 100,
    discountAmount: 5,
    total: 95,
    notes: 'Persistido',
    createdByUserId: USER_ID,
    convertedToSaleId: null,
    convertedAt: null,
    createdAt: now,
    updatedAt: now
  };
  const persistedItem: QuoteItemRecord = {
    id: 'item-persisted',
    quoteId: persistedQuote.id,
    accountId: ACCOUNT_ID,
    itemType: 'product',
    catalogItemId: 'product-1',
    nameSnapshot: 'Produto persistido',
    codeSnapshot: 'PRD-1',
    unitPrice: 100,
    quantity: 1,
    discountAmount: 5,
    lineTotal: 95,
    notes: null,
    createdAt: now,
    updatedAt: now
  };
  const quotes: QuoteRecord[] = [persistedQuote];
  const items: QuoteItemRecord[] = [persistedItem];
  const repository: QuotesRepository = {
    async create(quote) { quotes.push(quote); },
    async update(quote) {
      const index = quotes.findIndex((candidate) => candidate.id === quote.id);
      if (index >= 0) quotes.splice(index, 1, quote);
    },
    async findById(id) { return quotes.find((quote) => quote.id === id) ?? null; },
    async findByAccountId(accountId) { return quotes.filter((quote) => quote.accountId === accountId); },
    async createItem(item) { items.push(item); },
    async updateItem(item) {
      const index = items.findIndex((candidate) => candidate.id === item.id);
      if (index >= 0) items.splice(index, 1, item);
    },
    async deleteItem(id) {
      const index = items.findIndex((item) => item.id === id);
      if (index >= 0) items.splice(index, 1);
    },
    async findItemsByQuoteId(quoteId) { return items.filter((item) => item.quoteId === quoteId); },
    async getIssuedCount() { return quotes.length; },
    async getConvertedCount() { return quotes.filter((quote) => quote.convertedToSaleId).length; }
  };
  const service = new QuotesService({ repository });

  assert.equal(service.persistenceMode, 'database');
  await service.hydrateFromDatabase(ACCOUNT_ID);
  assert.equal(service.getItems(persistedQuote.id).length, 1);
  const created = await service.create(ACCOUNT_ID, USER_ID, {
    ownerId: 'owner-43',
    validUntil: null,
    notes: null
  });
  assert.equal(created.number, 'QT-000043');

  const updated = await service.update(created.id, { notes: '  Atualizado  ', validUntil: null });
  assert.equal(updated.notes, 'Atualizado');
  const added = await service.addItem(created.id, {
    itemType: 'service',
    catalogItemId: null,
    nameSnapshot: '  Consulta  ',
    codeSnapshot: '  SRV-1  ',
    unitPrice: 99.999,
    discountAmount: 9.999,
    notes: '  premium  '
  });
  assert.equal(added.item.unitPrice, 100);
  assert.equal(added.item.discountAmount, 10);
  assert.equal(added.item.notes, 'premium');

  const changed = await service.updateItem(added.item.id, { notes: null });
  assert.equal(changed.item.quantity, 1);
  assert.equal(changed.item.discountAmount, 10);
  assert.equal(changed.item.notes, null);
  await service.removeItem(added.item.id);
  assert.equal(items.some((item) => item.id === added.item.id), false);
});

test('QuotesService enforces all missing-resource and terminal-state transitions', async () => {
  const service = createService();
  await assert.rejects(() => service.update('missing', {}), NotFoundError);
  await assert.rejects(
    () => service.addItem('missing', { itemType: 'product', nameSnapshot: 'X', unitPrice: 1 }),
    NotFoundError
  );
  await assert.rejects(() => service.updateItem('missing', {}), NotFoundError);
  await assert.rejects(() => service.removeItem('missing'), NotFoundError);
  await assert.rejects(() => service.approve('missing'), NotFoundError);
  await assert.rejects(() => service.reject('missing'), NotFoundError);
  await assert.rejects(() => service.cancel('missing'), NotFoundError);
  await assert.rejects(() => service.convertToSale('missing', 'sale'), NotFoundError);

  const draft = await service.create(ACCOUNT_ID, USER_ID);
  await assert.rejects(() => service.convertToSale(draft.id, 'sale'), ConflictError);
  const { item } = await service.addItem(draft.id, {
    itemType: 'product',
    nameSnapshot: 'Produto',
    unitPrice: 10
  });
  await service.approve(draft.id);
  await assert.rejects(() => service.approve(draft.id), ConflictError);
  await assert.rejects(() => service.updateItem(item.id, { quantity: 2 }), ConflictError);
  await assert.rejects(() => service.removeItem(item.id), ConflictError);
  await service.reject(draft.id);
  await assert.rejects(() => service.reject(draft.id), ConflictError);

  const converted = await service.create(ACCOUNT_ID, USER_ID);
  await service.approve(converted.id);
  await service.convertToSale(converted.id, 'sale-1');
  await assert.rejects(() => service.convertToSale(converted.id, 'sale-2'), ConflictError);
  await assert.rejects(() => service.cancel(converted.id), ConflictError);
});

test('QuotesService filters owners and safely renders optional and escaped print fields', async () => {
  const service = createService();
  const first = await service.create(ACCOUNT_ID, USER_ID, {
    ownerId: 'owner-a',
    validUntil: '2026-09-01',
    notes: '<script>& "premium"</script>'
  });
  await service.create(ACCOUNT_ID, USER_ID, { ownerId: 'owner-b' });
  const product = await service.addItem(first.id, {
    itemType: 'product',
    nameSnapshot: 'Produto (A) \\ teste',
    codeSnapshot: null,
    unitPrice: 10
  });
  await service.addItem(first.id, {
    itemType: 'service',
    nameSnapshot: 'Serviço',
    unitPrice: 20
  });

  assert.equal(service.list(ACCOUNT_ID, { ownerId: 'owner-a' }).length, 1);
  assert.equal(service.list(ACCOUNT_ID, { search: first.number }).length, 1);
  assert.equal(service.list(ACCOUNT_ID, { search: 'inexistente' }).length, 0);
  const current = service.getOrThrow(first.id);
  const html = service.generatePrintHtml(current, service.getItems(first.id));
  assert.match(html, /&lt;script&gt;&amp; &quot;premium&quot;&lt;\/script&gt;/);
  assert.ok(html.includes('—'));
  assert.ok(html.includes('Produto'));
  assert.ok(html.includes('Servico'));
  const pdf = service.generatePdfBuffer(current, [product.item]);
  assert.ok(pdf.toString('utf8').includes('Produto \\(A\\) \\\\ teste'));
});

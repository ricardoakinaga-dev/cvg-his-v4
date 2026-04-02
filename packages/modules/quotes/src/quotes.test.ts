import assert from 'node:assert/strict';
import test from 'node:test';

import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { QuotesService } from './index.js';

function createService() {
  return new QuotesService();
}

const ACCOUNT_ID = 'acc_test_001' as AccountId;
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
  const q1 = await service.create(ACCOUNT_ID, USER_ID);
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

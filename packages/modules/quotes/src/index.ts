import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  QuotesRepository,
  QuoteRecord,
  QuoteItemRecord
} from './repositories/database-quotes.repository.js';

export interface QuoteSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly ownerId: string | null;
  readonly status: 'draft' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  readonly validUntil: string | null;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly notes: string | null;
  readonly createdByUserId: UserId;
  readonly convertedToSaleId: string | null;
  readonly convertedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuoteItemSummary {
  readonly id: string;
  readonly quoteId: string;
  readonly accountId: AccountId;
  readonly itemType: 'product' | 'service';
  readonly catalogItemId: string | null;
  readonly nameSnapshot: string;
  readonly codeSnapshot: string | null;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly discountAmount: number;
  readonly lineTotal: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuotesServiceOptions {
  readonly repository?: QuotesRepository;
}

export class QuotesService {
  readonly #repository?: QuotesRepository;
  readonly #useUuidIdentifiers: boolean;
  readonly #quotes = new Map<string, QuoteSummary>();
  readonly #items = new Map<string, QuoteItemSummary>();
  #numberCounter = 0;

  public constructor(options?: QuotesServiceOptions) {
    this.#repository = options?.repository;
    this.#useUuidIdentifiers = Boolean(options?.repository);
  }

  #nextId(prefix: string): string {
    return this.#useUuidIdentifiers ? randomUUID() : createCorrelationId(prefix);
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const quotes = await this.#repository.findByAccountId(accountId);
    for (const quote of quotes) {
      this.#quotes.set(quote.id, quote);
      const items = await this.#repository.findItemsByQuoteId(quote.id);
      for (const item of items) {
        this.#items.set(item.id, item);
      }
    }
  }

  #nextNumber(): string {
    this.#numberCounter++;
    return `QT-${String(this.#numberCounter).padStart(6, '0')}`;
  }

  #recalculate(quoteId: string): QuoteSummary {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });

    const items = Array.from(this.#items.values()).filter((i) => i.quoteId === quoteId);
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discountAmount = items.reduce((sum, i) => sum + i.discountAmount, 0);
    const total = Math.round((subtotal - discountAmount) * 100) / 100;

    const updated: QuoteSummary = {
      ...quote,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total,
      updatedAt: nowIso()
    };
    this.#quotes.set(quoteId, updated);
    return updated;
  }

  async create(
    accountId: AccountId,
    createdByUserId: UserId,
    input?: { ownerId?: string | null; validUntil?: string | null; notes?: string | null }
  ): Promise<QuoteSummary> {
    const now = nowIso();
    const quote: QuoteSummary = {
      id: this.#nextId('qt'),
      accountId,
      number: this.#nextNumber(),
      ownerId: input?.ownerId ?? null,
      status: 'draft',
      validUntil: input?.validUntil ?? null,
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      notes: input?.notes ?? null,
      createdByUserId,
      convertedToSaleId: null,
      convertedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.#quotes.set(quote.id, quote);

    if (this.#repository) {
      const record: QuoteRecord = quote;
      await this.#repository.create(record);
    }

    return quote;
  }

  async update(
    quoteId: string,
    input: { notes?: string | null; validUntil?: string | null }
  ): Promise<QuoteSummary> {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });
    if (quote.status !== 'draft')
      throw new ConflictError('Can only update draft quotes', { status: quote.status });

    const updated: QuoteSummary = {
      ...quote,
      notes: input.notes !== undefined ? (input.notes?.trim() ?? null) : quote.notes,
      validUntil: input.validUntil !== undefined ? (input.validUntil ?? null) : quote.validUntil,
      updatedAt: nowIso()
    };
    this.#quotes.set(quoteId, updated);

    if (this.#repository) {
      const record: QuoteRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  async addItem(
    quoteId: string,
    input: {
      itemType: 'product' | 'service';
      catalogItemId?: string | null;
      nameSnapshot: string;
      codeSnapshot?: string | null;
      unitPrice: number;
      quantity?: number;
      discountAmount?: number;
      notes?: string | null;
    }
  ): Promise<{ quote: QuoteSummary; item: QuoteItemSummary }> {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });
    if (quote.status !== 'draft')
      throw new ConflictError('Can only add items to draft quotes', { status: quote.status });

    const quantity = input.quantity ?? 1;
    const discountAmount = input.discountAmount ?? 0;
    const lineTotal = Math.round((input.unitPrice * quantity - discountAmount) * 100) / 100;
    const now = nowIso();

    const item: QuoteItemSummary = {
      id: this.#nextId('qi'),
      quoteId,
      accountId: quote.accountId,
      itemType: input.itemType,
      catalogItemId: input.catalogItemId ?? null,
      nameSnapshot: input.nameSnapshot.trim(),
      codeSnapshot: input.codeSnapshot?.trim() ?? null,
      unitPrice: Math.round(input.unitPrice * 100) / 100,
      quantity,
      discountAmount: Math.round(discountAmount * 100) / 100,
      lineTotal,
      notes: input.notes?.trim() ?? null,
      createdAt: now,
      updatedAt: now
    };

    this.#items.set(item.id, item);

    if (this.#repository) {
      const record: QuoteItemRecord = item;
      await this.#repository.createItem(record);
    }

    const updatedQuote = this.#recalculate(quoteId);
    return { quote: updatedQuote, item };
  }

  async updateItem(
    itemId: string,
    input: { quantity?: number; discountAmount?: number; notes?: string | null }
  ): Promise<{ quote: QuoteSummary; item: QuoteItemSummary }> {
    const item = this.#items.get(itemId);
    if (!item) throw new NotFoundError('Quote item not found', { itemId });

    const quote = this.#quotes.get(item.quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId: item.quoteId });
    if (quote.status !== 'draft')
      throw new ConflictError('Can only update items in draft quotes', { status: quote.status });

    const updated: QuoteItemSummary = {
      ...item,
      quantity: input.quantity ?? item.quantity,
      discountAmount:
        input.discountAmount !== undefined
          ? Math.round(input.discountAmount * 100) / 100
          : item.discountAmount,
      notes: input.notes !== undefined ? (input.notes?.trim() ?? null) : item.notes,
      updatedAt: nowIso()
    };
    const lineTotal =
      Math.round((updated.unitPrice * updated.quantity - updated.discountAmount) * 100) / 100;
    const finalItem: QuoteItemSummary = { ...updated, lineTotal };

    this.#items.set(itemId, finalItem);

    if (this.#repository) {
      const record: QuoteItemRecord = finalItem;
      await this.#repository.updateItem(record);
    }

    const updatedQuote = this.#recalculate(item.quoteId);
    return { quote: updatedQuote, item: finalItem };
  }

  async removeItem(itemId: string): Promise<QuoteSummary> {
    const item = this.#items.get(itemId);
    if (!item) throw new NotFoundError('Quote item not found', { itemId });

    const quote = this.#quotes.get(item.quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId: item.quoteId });
    if (quote.status !== 'draft')
      throw new ConflictError('Can only remove items from draft quotes', { status: quote.status });

    this.#items.delete(itemId);

    if (this.#repository) {
      await this.#repository.deleteItem(itemId);
    }

    return this.#recalculate(item.quoteId);
  }

  async approve(quoteId: string): Promise<QuoteSummary> {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });
    if (quote.status !== 'draft')
      throw new ConflictError('Can only approve draft quotes', { status: quote.status });

    const updated: QuoteSummary = { ...quote, status: 'approved', updatedAt: nowIso() };
    this.#quotes.set(quoteId, updated);

    if (this.#repository) {
      const record: QuoteRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  async reject(quoteId: string): Promise<QuoteSummary> {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });
    if (quote.status !== 'draft' && quote.status !== 'approved') {
      throw new ConflictError('Can only reject draft or approved quotes', { status: quote.status });
    }

    const updated: QuoteSummary = { ...quote, status: 'rejected', updatedAt: nowIso() };
    this.#quotes.set(quoteId, updated);

    if (this.#repository) {
      const record: QuoteRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  async cancel(quoteId: string): Promise<QuoteSummary> {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });
    if (quote.convertedToSaleId) throw new ConflictError('Cannot cancel a converted quote');

    const updated: QuoteSummary = { ...quote, status: 'cancelled', updatedAt: nowIso() };
    this.#quotes.set(quoteId, updated);

    if (this.#repository) {
      const record: QuoteRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  async convertToSale(quoteId: string, counterSaleId: string): Promise<QuoteSummary> {
    const quote = this.#quotes.get(quoteId);
    if (!quote) throw new NotFoundError('Quote not found', { quoteId });
    if (quote.status !== 'approved') {
      throw new ConflictError('Can only convert approved quotes', { status: quote.status });
    }
    if (quote.convertedToSaleId) {
      throw new ConflictError('Quote has already been converted', {
        counterSaleId: quote.convertedToSaleId
      });
    }

    const updated: QuoteSummary = {
      ...quote,
      convertedToSaleId: counterSaleId,
      convertedAt: nowIso(),
      updatedAt: nowIso()
    };
    this.#quotes.set(quoteId, updated);

    if (this.#repository) {
      const record: QuoteRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  generatePrintHtml(quote: QuoteSummary, items: QuoteItemSummary[]): string {
    const itemsHtml = items
      .map((item) => {
        return `<tr>
        <td>${escapeHtml(item.codeSnapshot ?? '—')}</td>
        <td>${escapeHtml(item.nameSnapshot)}</td>
        <td>${item.itemType === 'product' ? 'Produto' : 'Servico'}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">R$ ${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:right">R$ ${item.discountAmount.toFixed(2)}</td>
        <td style="text-align:right"><strong>R$ ${item.lineTotal.toFixed(2)}</strong></td>
      </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Orcamento ${quote.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
    .header h1 { font-size: 1.5rem; color: #2563eb; margin-bottom: 4px; }
    .header p { font-size: 0.85rem; color: #64748b; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .meta-card { background: #f8fafc; padding: 12px; border-radius: 8px; }
    .meta-card label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px; }
    .meta-card span { font-size: 0.9rem; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 10px 8px; background: #f1f5f9; font-size: 0.75rem; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
    td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
    .totals { text-align: right; margin-bottom: 24px; }
    .totals div { margin-bottom: 4px; font-size: 0.9rem; }
    .totals .total { font-size: 1.2rem; font-weight: 700; color: #2563eb; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .status-draft { background: #fef3c7; color: #92400e; }
    .status-approved { background: #dcfce7; color: #166534; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-cancelled { background: #f1f5f9; color: #475569; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px; text-align:right;">
    <button onclick="window.print()" style="padding:8px 16px; background:#2563eb; color:#fff; border:none; border-radius:6px; cursor:pointer;">Imprimir / Salvar PDF</button>
  </div>
  <div class="header">
    <h1>ORCAMENTO</h1>
    <p>Centro Veterinario Guarapiranga — NexusVet HIS v2.0</p>
  </div>
  <div class="meta">
    <div class="meta-card"><label>Numero</label><span>${escapeHtml(quote.number)}</span></div>
    <div class="meta-card"><label>Status</label><span class="status-badge status-${quote.status}">${quote.status.toUpperCase()}</span></div>
    <div class="meta-card"><label>Data</label><span>${new Date(quote.createdAt).toLocaleDateString('pt-BR')}</span></div>
    <div class="meta-card"><label>Validade</label><span>${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '—'}</span></div>
  </div>
  ${quote.notes ? `<div style="margin-bottom:20px; padding:12px; background:#f8fafc; border-radius:8px; font-size:0.85rem;"><strong>Observacoes:</strong> ${escapeHtml(quote.notes)}</div>` : ''}
  <table>
    <thead><tr><th>Codigo</th><th>Descricao</th><th>Tipo</th><th style="text-align:right">Qtd</th><th style="text-align:right">Preco Unit.</th><th style="text-align:right">Desconto</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="totals">
    <div>Subtotal: <strong>R$ ${quote.subtotal.toFixed(2)}</strong></div>
    <div>Descontos: <strong>R$ ${quote.discountAmount.toFixed(2)}</strong></div>
    <div class="total">TOTAL: R$ ${quote.total.toFixed(2)}</div>
  </div>
  <div class="footer">
    <p>Este orcamento e valido ate ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : 'data nao definida'}.</p>
    <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  </div>
</body>
</html>`;
  }

  generatePdfBuffer(quote: QuoteSummary, items: QuoteItemSummary[]): Buffer {
    const lines = [
      'Centro Veterinario Guarapiranga',
      `Orcamento ${quote.number}`,
      `Status: ${quote.status}`,
      `Data: ${new Date(quote.createdAt).toLocaleDateString('pt-BR')}`,
      quote.validUntil
        ? `Validade: ${new Date(quote.validUntil).toLocaleDateString('pt-BR')}`
        : 'Validade: nao definida',
      '',
      'Itens:'
    ];

    for (const item of items) {
      lines.push(
        `${item.itemType === 'product' ? 'Produto' : 'Servico'} | ${item.nameSnapshot} | qtd ${item.quantity} | R$ ${item.lineTotal.toFixed(2)}`
      );
    }

    lines.push('');
    lines.push(`Subtotal: R$ ${quote.subtotal.toFixed(2)}`);
    lines.push(`Descontos: R$ ${quote.discountAmount.toFixed(2)}`);
    lines.push(`Total: R$ ${quote.total.toFixed(2)}`);
    if (quote.notes) {
      lines.push('');
      lines.push(`Observacoes: ${quote.notes}`);
    }

    return buildSimplePdf(lines);
  }

  findById(id: string): QuoteSummary | undefined {
    return this.#quotes.get(id);
  }

  getOrThrow(id: string): QuoteSummary {
    const quote = this.#quotes.get(id);
    if (!quote) throw new NotFoundError('Quote not found', { id });
    return quote;
  }

  getItems(quoteId: string): QuoteItemSummary[] {
    return Array.from(this.#items.values())
      .filter((i) => i.quoteId === quoteId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  list(
    accountId: AccountId,
    filters?: { status?: string; search?: string; ownerId?: string }
  ): QuoteSummary[] {
    let items = Array.from(this.#quotes.values()).filter((q) => q.accountId === accountId);

    if (filters?.status) {
      items = items.filter((q) => q.status === filters.status);
    }
    if (filters?.ownerId) {
      items = items.filter((q) => q.ownerId === filters.ownerId);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (q) =>
          q.number.toLowerCase().includes(search) ||
          (q.notes?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildSimplePdf(lines: readonly string[]): Buffer {
  const pageHeight = 842;
  const startX = 50;
  const startY = 790;
  const lineHeight = 18;
  const textCommands = lines
    .map(
      (line, index) =>
        `1 0 0 1 ${startX} ${startY - index * lineHeight} Tm (${escapePdfText(line)}) Tj`
    )
    .join('\n');
  const contentStream = `BT\n/F1 12 Tf\n${textCommands}\nET`;

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`,
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}\nendstream\nendobj`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index++) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export {
  DatabaseQuotesRepository,
  type QuotesRepository,
  type QuoteRecord,
  type QuoteItemRecord
} from './repositories/database-quotes.repository.js';

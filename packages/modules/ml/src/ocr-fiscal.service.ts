import { createCorrelationId } from '@cvg-his-v2/shared-utils';

export interface OcrFiscalPreviewInput {
  readonly rawText: string;
  readonly documentName?: string;
}

export interface OcrFiscalLineItem {
  readonly description: string;
  readonly quantity?: number;
  readonly unitAmount?: number;
  readonly totalAmount?: number;
}

export interface OcrFiscalPreview {
  readonly previewId: string;
  readonly detectedType: 'nfse' | 'nfe' | 'receipt' | 'unknown';
  readonly confidence: number;
  readonly documentNumber?: string;
  readonly series?: string;
  readonly issuedAt?: string;
  readonly issuerDocument?: string;
  readonly recipientDocument?: string;
  readonly totalAmount?: number;
  readonly currency: 'BRL';
  readonly lineItems: readonly OcrFiscalLineItem[];
  readonly warnings: readonly string[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function toIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const ddmmyyyy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  }

  const yyyyMMdd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMMdd) {
    const [, yyyy, mm, dd] = yyyyMMdd;
    return `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  }

  return undefined;
}

function parseCurrency(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/[R$\s]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const normalized = value.replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeDocument(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : undefined;
}

function detectType(text: string): OcrFiscalPreview['detectedType'] {
  if (/NFS-?E|SERVI[CÇ]O/i.test(text)) {
    return 'nfse';
  }
  if (/NF-?E|DANFE/i.test(text)) {
    return 'nfe';
  }
  if (/RECIBO|COMPROVANTE/i.test(text)) {
    return 'receipt';
  }
  return 'unknown';
}

function extractLineItems(text: string): readonly OcrFiscalLineItem[] {
  const items: OcrFiscalLineItem[] = [];
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^[-*]?\s*([A-Za-zÀ-ÿ0-9 ()/_-]{4,})\s+(\d+(?:[.,]\d+)?)\s+x?\s*(\d+(?:[.,]\d{2})?)\s+(?:=|total)?\s*(\d+(?:[.,]\d{2})?)$/i
    );
    if (!match) {
      continue;
    }

    items.push({
      description: normalizeWhitespace(match[1]),
      quantity: parseNumber(match[2]),
      unitAmount: parseCurrency(match[3]),
      totalAmount: parseCurrency(match[4])
    });
  }

  return items;
}

export class OcrFiscalService {
  public preview(input: OcrFiscalPreviewInput): OcrFiscalPreview {
    const rawText = normalizeWhitespace(input.rawText);
    const joinedText = rawText.replace(/\s+/g, ' ');
    const detectedType = detectType(rawText);

    const documentNumber =
      joinedText.match(/(?:numero|n[úu]mero|nota)\s*[:#-]?\s*([A-Z0-9./-]{3,})/i)?.[1]
      ?? joinedText.match(/\bNF(?:S|-)?E?\s*[:#-]?\s*([A-Z0-9./-]{3,})/i)?.[1];
    const series =
      joinedText.match(/(?:serie|s[ée]rie)\s*[:#-]?\s*([A-Z0-9.-]{1,12})/i)?.[1];
    const issuedAt = toIsoDate(
      joinedText.match(/(?:emiss[aã]o|data)\s*[:#-]?\s*(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})/i)?.[1]
    );
    const issuerDocument = sanitizeDocument(
      joinedText.match(/(?:cnpj emissor|cnpj prestador|emitente)\s*[:#-]?\s*([\d./-]{11,18})/i)?.[1]
      ?? joinedText.match(/\bCNPJ\b\s*[:#-]?\s*([\d./-]{11,18})/i)?.[1]
    );
    const recipientDocument = sanitizeDocument(
      joinedText.match(/(?:tomador|destinat[aá]rio|cliente)\s*[:#-]?\s*([\d./-]{11,18})/i)?.[1]
      ?? joinedText.match(/\bCPF\/?CNPJ\b\s*[:#-]?\s*([\d./-]{11,18})/i)?.[1]
    );
    const totalAmount = parseCurrency(
      joinedText.match(/(?:valor total|total(?:\s+geral)?)\s*[:#-]?\s*(?:R\$)?\s*([\d.,]+)/i)?.[1]
    );
    const lineItems = extractLineItems(input.rawText);

    const warnings: string[] = [];
    if (!documentNumber) warnings.push('document_number_not_detected');
    if (!issuedAt) warnings.push('issue_date_not_detected');
    if (!issuerDocument) warnings.push('issuer_document_not_detected');
    if (!totalAmount) warnings.push('total_amount_not_detected');
    if (lineItems.length === 0) warnings.push('line_items_not_detected');

    const signals = [documentNumber, issuedAt, issuerDocument, totalAmount].filter(Boolean).length;
    const confidence = Math.max(
      0.4,
      Math.min(0.98, 0.4 + signals * 0.12 + (lineItems.length > 0 ? 0.1 : 0))
    );

    return {
      previewId: createCorrelationId('ocr'),
      detectedType,
      confidence: Number(confidence.toFixed(2)),
      documentNumber,
      series,
      issuedAt,
      issuerDocument,
      recipientDocument,
      totalAmount,
      currency: 'BRL',
      lineItems,
      warnings
    };
  }
}

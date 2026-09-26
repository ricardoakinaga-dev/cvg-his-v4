import { deflateRawSync } from 'node:zlib';

import type {
  ReportColumn,
  ReportContentEncoding,
  ReportExecutionDetail,
  ReportFormat
} from './index.js';

export type ReportRendererExecution = Pick<
  ReportExecutionDetail,
  'reportId' | 'generatedAt' | 'columns' | 'rows'
>;

export interface RenderedReportExport {
  readonly contentType: string;
  readonly contentEncoding: ReportContentEncoding;
  readonly content: string;
}

export function renderReportExport(
  execution: ReportRendererExecution,
  format: ReportFormat
): RenderedReportExport {
  if (format === 'csv') {
    return {
      contentType: 'text/csv; charset=utf-8',
      contentEncoding: 'utf8',
      content: `\uFEFF${toCsv(execution.columns, execution.rows)}`
    };
  }

  if (format === 'json') {
    return {
      contentType: 'application/json; charset=utf-8',
      contentEncoding: 'utf8',
      content: JSON.stringify(execution, null, 2)
    };
  }

  if (format === 'xlsx') {
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentEncoding: 'base64',
      content: createXlsx(execution).toString('base64')
    };
  }

  return {
    contentType: 'application/pdf',
    contentEncoding: 'base64',
    content: createPdf(execution).toString('base64')
  };
}

function toCsv(columns: readonly ReportColumn[], rows: readonly Record<string, unknown>[]): string {
  const header = columns.map((column) => csvCell(column.label)).join(',');
  const body = rows.map((row) => columns.map((column) => csvCell(row[column.key])).join(','));
  return [header, ...body].join('\n');
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const rawText = String(value);
  const text =
    typeof value === 'string' && /^[\t\r\n ]*[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function createXlsx(execution: ReportRendererExecution): Buffer {
  const rows = [
    execution.columns.map((column) => column.label),
    ...execution.rows.map((row) => execution.columns.map((column) => row[column.key]))
  ];
  const worksheetRows = rows
    .map((row, rowIndex) => {
      const cells = row.map((value, columnIndex) => xlsxCell(value, rowIndex + 1, columnIndex + 1));
      return `<row r="${rowIndex + 1}">${cells.join('')}</row>`;
    })
    .join('');
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${worksheetRows}</sheetData></worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const workbookRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Aptos"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf xfId="0"/></cellXfs></styleSheet>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const packageRelationships = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return createZip([
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: packageRelationships },
    { name: 'xl/workbook.xml', content: workbook },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelationships },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
    { name: 'xl/styles.xml', content: styles }
  ]);
}

function xlsxCell(value: unknown, row: number, column: number): string {
  const reference = `${xlsxColumnName(column)}${row}`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value === null || value === undefined ? '' : String(value))}</t></is></c>`;
}

function xlsxColumnName(column: number): string {
  let current = column;
  let result = '';
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result;
}

function createPdf(execution: ReportRendererExecution): Buffer {
  const headingLines = [
    `Relatorio: ${execution.reportId}`,
    `Gerado em: ${execution.generatedAt}`,
    execution.columns.map((column) => column.label).join(' | '),
  ].flatMap((line) => wrapPdfLine(line));
  const bodyLines = execution.rows.flatMap((row) =>
    wrapPdfLine(execution.columns.map((column) => String(row[column.key] ?? '')).join(' | '))
  );
  const bodyLinesPerPage = Math.max(1, 48 - headingLines.length);
  const pageCount = Math.max(1, Math.ceil(bodyLines.length / bodyLinesPerPage));
  const fontObjectNumber = 3 + pageCount * 2;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`
  ];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageObjectNumber = 3 + pageIndex * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    const pageBody = bodyLines.slice(
      pageIndex * bodyLinesPerPage,
      (pageIndex + 1) * bodyLinesPerPage
    );
    const stream = [
      'BT',
      '/F1 10 Tf',
      '40 780 Td',
      ...[...headingLines, ...pageBody].map(
        (line, index) => `${index === 0 ? '' : '0 -14 Td '}${pdfText(line)} Tj`
      ),
      'ET'
    ].join('\n');

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
    );
  }

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const header = '%PDF-1.4\n%\xFF\xFF\xFF\xFF\n';
  const buffers = [Buffer.from(header, 'binary')];
  const offsets: number[] = [0];
  let offset = buffers[0].length;
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(offset);
    const object = Buffer.from(`${index + 1} 0 obj\n${objects[index]}\nendobj\n`, 'utf8');
    buffers.push(object);
    offset += object.length;
  }
  const xrefOffset = offset;
  const xref = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];
  for (let index = 1; index < offsets.length; index += 1) {
    xref.push(`${String(offsets[index]).padStart(10, '0')} 00000 n `);
  }
  xref.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF'
  );
  buffers.push(Buffer.from(`${xref.join('\n')}\n`, 'utf8'));
  return Buffer.concat(buffers);
}

function wrapPdfLine(value: string, maxCharacters = 50): string[] {
  const characters = Array.from(value.replace(/[\r\n]/g, ' '));
  if (characters.length === 0) return [''];

  const lines: string[] = [];
  while (characters.length > maxCharacters) {
    let breakAt = characters.lastIndexOf(' ', maxCharacters);
    if (breakAt <= 0) breakAt = maxCharacters;
    lines.push(characters.splice(0, breakAt).join(''));
    while (characters[0] === ' ') characters.shift();
  }
  lines.push(characters.join(''));
  return lines;
}

function pdfText(value: string): string {
  return `(${value
    .replace(/\\/g, '\\\\')
    .replace(/[()]/g, '\\$&')
    .replace(/[\r\n]/g, ' ')})`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface ZipEntry {
  readonly name: string;
  readonly content: string;
}

function createZip(entries: readonly ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const uncompressed = Buffer.from(entry.content, 'utf8');
    const compressed = deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + compressed.length;
  }
  const local = Buffer.concat(localParts);
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(local.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([local, central, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';

const CSV_SEPARATOR = ';';
const CSV_LINE_ENDING = '\r\n';
const FORMULA_PREFIX = "'";

/**
 * Builds a deterministic CSV snapshot from the rows currently shown in a report.
 * The UTF-8 BOM and semicolon separator keep the file friendly to Brazilian Excel
 * installations without depending on a server-side export job.
 */
export function buildReportCsv(
  columns: readonly DataTableColumn[],
  rows: readonly DataTableRow[]
): string {
  const header = columns.map((column) => escapeCsvCell(column.label)).join(CSV_SEPARATOR);
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvCell(serializeCell(column, row))).join(CSV_SEPARATOR)
  );

  return `\uFEFF${[header, ...body].join(CSV_LINE_ENDING)}${CSV_LINE_ENDING}`;
}

function serializeCell(column: DataTableColumn, row: DataTableRow): string {
  const rawValue = row[column.key];
  const formattedValue = column.format ? column.format(rawValue, row) : rawValue;
  const normalizedValue = normalizeCellValue(formattedValue);

  if (typeof formattedValue === 'string' && isFormulaLike(formattedValue)) {
    return `${FORMULA_PREFIX}${normalizedValue}`;
  }

  return normalizedValue;
}

function normalizeCellValue(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '[valor não serializável]';
  }
}

function isFormulaLike(value: string): boolean {
  return /^[=+\-@]/.test(value.trimStart());
}

function escapeCsvCell(value: string): string {
  if (!/[";\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

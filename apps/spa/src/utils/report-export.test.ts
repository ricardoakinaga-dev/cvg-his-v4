import { describe, expect, it } from 'vitest';

import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import { buildReportCsv } from '@/utils/report-export';

const columns: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'description', label: 'Descrição' },
  { key: 'amount', label: 'Valor' }
];

describe('buildReportCsv', () => {
  it('builds an Excel-friendly UTF-8 CSV with escaped values and stable row order', () => {
    const rows: DataTableRow[] = [
      { id: 'row-1', description: 'Consulta; retorno', amount: 180.5 },
      { id: 'row-2', description: 'Linha "com quebra\nde linha"', amount: null }
    ];

    expect(buildReportCsv(columns, rows)).toBe(
      '\uFEFFID;Descrição;Valor\r\n' +
        'row-1;"Consulta; retorno";180.5\r\n' +
        'row-2;"Linha ""com quebra\nde linha""";\r\n'
    );
  });

  it('prefixes formula-like text without changing numeric values', () => {
    const formulaRows: DataTableRow[] = [
      { id: 'formula', description: '=HYPERLINK("https://evil.test")', amount: -12.5 },
      { id: 'text-number', description: '-1+2', amount: '+55' }
    ];

    expect(buildReportCsv(columns, formulaRows)).toContain(
      'formula;"\'=HYPERLINK(""https://evil.test"")";-12.5'
    );
    expect(buildReportCsv(columns, formulaRows)).toContain("text-number;'-1+2;'+55");
  });

  it('serializes object values and preserves empty cells', () => {
    const rows: DataTableRow[] = [
      { id: 'row-1', description: { source: 'audit', count: 2 }, amount: undefined }
    ];

    expect(buildReportCsv(columns, rows)).toBe(
      '\uFEFFID;Descrição;Valor\r\nrow-1;"{""source"":""audit"",""count"":2}";\r\n'
    );
  });
});

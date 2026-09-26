import assert from 'node:assert/strict';
import { test } from 'vitest';

import { renderReportExport, type ReportRendererExecution } from './report-renderers.js';

const execution: ReportRendererExecution = {
  reportId: 'administrative-executive',
  generatedAt: '2026-05-28T10:00:00.000Z',
  columns: [
    { key: 'metric', label: 'Métrica', type: 'string' },
    { key: 'value', label: 'Valor', type: 'number' },
    { key: 'note', label: 'Observação', type: 'string' }
  ],
  rows: [
    {
      metric: '=HYPERLINK("https://attacker.invalid")',
      value: 10,
      note: 'a,b "quoted"'
    }
  ]
};

test('report renderer preserves format contracts and is deterministic', () => {
  const csv = renderReportExport(execution, 'csv');
  assert.equal(csv.contentType, 'text/csv; charset=utf-8');
  assert.equal(csv.contentEncoding, 'utf8');
  assert.equal(csv.content, renderReportExport(execution, 'csv').content);
  assert.match(csv.content, /^\uFEFFMétrica,Valor,Observação\n/);
  assert.match(csv.content, /'=HYPERLINK\(""https:\/\/attacker\.invalid""\)/);
  assert.match(csv.content, /"a,b ""quoted"""/);

  const json = renderReportExport(execution, 'json');
  assert.equal(json.contentType, 'application/json; charset=utf-8');
  assert.equal(json.contentEncoding, 'utf8');
  assert.deepEqual(JSON.parse(json.content), execution);

  const xlsx = renderReportExport(execution, 'xlsx');
  assert.equal(xlsx.contentEncoding, 'base64');
  assert.equal(Buffer.from(xlsx.content, 'base64').subarray(0, 2).toString('hex'), '504b');

  const pdf = renderReportExport(execution, 'pdf');
  assert.equal(pdf.contentType, 'application/pdf');
  assert.equal(Buffer.from(pdf.content, 'base64').toString('utf8', 0, 8), '%PDF-1.4');
});

test('report renderer escapes PDF text without splitting embedded line breaks', () => {
  const escaped = renderReportExport(
    {
      ...execution,
      rows: [{ metric: 'value (safe) \\ path', value: 1, note: 'line\nbreak' }]
    },
    'pdf'
  );
  const pdf = Buffer.from(escaped.content, 'base64').toString('utf8');
  assert.ok(pdf.includes('value \\(safe\\) \\\\ path'));
  assert.doesNotMatch(pdf, /line\nbreak/);
});

test('PDF export paginates every report row and keeps long cell values', () => {
  const rows = Array.from({ length: 100 }, (_, index) => ({
    metric: `ROW-${String(index).padStart(3, '0')}`,
    value: index,
    note: index === 99 ? `${'W'.repeat(100)}TAIL` : ''
  }));
  const pdf = Buffer.from(
    renderReportExport({ ...execution, rows }, 'pdf').content,
    'base64'
  ).toString('utf8');

  assert.match(pdf, /\/Count 3/);
  for (const row of rows) assert.ok(pdf.includes(row.metric));
  const renderedText = [...pdf.matchAll(/\(([^()]*)\) Tj/g)].map((match) => match[1]).join('');
  assert.ok(renderedText.includes(`${'W'.repeat(100)}TAIL`));
});

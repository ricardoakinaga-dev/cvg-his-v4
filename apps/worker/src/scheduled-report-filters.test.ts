import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseScheduledReportDate,
  parseScheduledReportSearch,
  parseScheduledReportText
} from './scheduled-report-filters.js';

test('scheduled dates retain leap-day validation and reject impossible dates or timestamps', () => {
  assert.equal(parseScheduledReportDate('2024-02-29', 'dateFrom'), '2024-02-29');
  for (const value of ['2026-02-29', '2026-04-31', '0000-01-01', '2026-09-04T00:00:00Z', 2026]) {
    assert.throws(
      () => parseScheduledReportDate(value, 'dateFrom'),
      /dateFrom must be an ISO calendar date/
    );
  }
  for (const value of [undefined, null, '']) {
    assert.equal(parseScheduledReportDate(value, 'dateFrom'), undefined);
  }
});

test('scheduled text retains trimmed lowercase and Unicode code-point limits', () => {
  assert.equal(parseScheduledReportSearch('  CLIENTE  '), 'cliente');
  assert.equal(parseScheduledReportSearch('   '), undefined);
  assert.equal(parseScheduledReportText('🐈'.repeat(200), 'professional'), '🐈'.repeat(200));
  assert.throws(
    () => parseScheduledReportText('🐈'.repeat(201), 'professional'),
    /professional must be a string/
  );
  assert.throws(() => parseScheduledReportSearch({}), /search must be a string/);
});

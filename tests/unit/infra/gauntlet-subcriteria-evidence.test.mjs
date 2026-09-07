import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const criteria = JSON.parse(readFileSync(resolve(root, 'docs/engineering/quality-subcriteria.json'), 'utf8')).criteria;
const indexPath = resolve(root, 'docs/engineering/GAUNTLET_SUBCRITERIA_EVIDENCE.md');

function frozenSubcriteriaIds() {
  return criteria.map(({ id }) => id);
}

function indexRows(index) {
  return index.split('\n## ', 1)[0].split('\n').filter((line) => /^\|\s*QB-[A-Z0-9-]+\s+\|/.test(line));
}

test('indexes every frozen Gauntlet subcriterion exactly once', () => {
  const index = readFileSync(indexPath, 'utf8');
  const ids = frozenSubcriteriaIds();
  const rows = indexRows(index);
  const rowIds = rows.map((line) => line.split('|')[1].trim());

  assert.equal(ids.length, 30);
  assert.equal(rows.length, ids.length);
  assert.deepEqual([...new Set(rowIds)].sort(), [...ids].sort());
});

test('requires rejecting behavior, revision-bound evidence and honest status per row', () => {
  const index = readFileSync(indexPath, 'utf8');

  for (const row of indexRows(index)) {
    const cells = row
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    assert.equal(cells.length, 5, row);
    assert.equal(cells[2], criteria.find(({ id }) => id === cells[0])?.rejectingBehavior, 'rejecting behavior must match the canonical criterion');
    assert.ok(cells[2].split(/\s+/).length >= 6, row);
    assert.match(
      cells[2],
      /falha|rejeit|sem|não|nao|bloque|diverg|encerra|órf|orf|skip|proib|replay/i
    );
    assert.match(cells[3], /VFY-|docs\/|\.agent\/|sem ledger|SHA-256.*[a-f0-9]{64}/i);
    assert.match(cells[4], /PASS_BOUNDED|PARTIAL|BLOCKED|FAIL|NOT_RUN/);
  }
});

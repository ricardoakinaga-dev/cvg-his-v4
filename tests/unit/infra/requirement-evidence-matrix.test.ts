import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const qualityBar = readFileSync(resolve(root, 'docs/engineering/QUALITY_BAR.md'), 'utf8');
const matrix = readFileSync(
  resolve(root, 'docs/engineering/REQUIREMENT_EVIDENCE_MATRIX.md'),
  'utf8'
);

const qualityBarIds = [...qualityBar.matchAll(/^\|\s*(QB-[A-Z0-9-]+)\s+\|/gm)].map(([, id]) => id);
const qualityBarStates = new Map(
  qualityBar
    .split('\n')
    .filter((line) => /^\|\s*QB-[A-Z0-9-]+\s+\|/.test(line))
    .map((line) => {
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      return [cells[0], cells[3]];
    })
);
const matrixRows = matrix.split('\n').filter((line) => /^\|\s*QB-[A-Z0-9-]+\s+\|/.test(line));

describe('requirement evidence matrix contract', () => {
  it('maps every frozen Quality Bar criterion to a single auditable row', () => {
    expect(qualityBarIds.length).toBeGreaterThan(0);
    expect(matrixRows).toHaveLength(qualityBarIds.length);

    for (const id of qualityBarIds) {
      const rowPattern = new RegExp(`^\\|\\s*${id}\\s+\\|`, 'm');
      expect(matrix).toMatch(rowPattern);

      const row = matrixRows.find((line) => rowPattern.test(line));
      expect(row).toBeDefined();
      const cells = row!
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());
      expect(cells).toHaveLength(6);
      expect(cells[3].split(/\s+/).length).toBeGreaterThanOrEqual(6);
      expect(cells[3]).toMatch(
        /falha|rejeit|sem|não|nao|bloque|diverg|encerra|deixa|órf|orf|skip|proib/i
      );
      expect(cells[4]).toMatch(/(?:VFY-|docs\/|\.agent\/|sem ledger)/);

      const frozenState = qualityBarStates.get(id);
      expect(frozenState).toBeDefined();
      const stateToken = frozenState!.startsWith('BOUNDED PASS')
        ? 'BOUNDED PASS'
        : frozenState!.startsWith('BLOCKED')
          ? 'BLOCKED'
          : 'PARTIAL';
      expect(cells[5]).toContain(stateToken);
    }
  });

  it('requires rejecting evidence, revision-bound references and honest status', () => {
    expect(matrix).toContain('Evidência rejeitante / observável');
    expect(matrix).toContain('Artefato + ledger');
    expect(matrix).toContain('Estado honesto / próximo gate');
    expect(matrix).toContain('ausência de evidência');
    expect(matrix).toContain('não libera');
    expect(matrix).not.toContain('score estrutural como evidência de release');
  });
});

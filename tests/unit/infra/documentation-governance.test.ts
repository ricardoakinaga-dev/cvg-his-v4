import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validateDocumentation } from '../../../scripts/validate-documentation.mjs';

const repositoryRoot = resolve(import.meta.dirname, '../../..');

function frontmatter(kind: string, status = 'current', extra = '') {
  return `---
document_status: ${status}
document_kind: ${kind}
effective_date: 2026-09-02
owner: Test Owner
review_cycle: ${status === 'current' ? 'monthly' : 'archived'}
${extra}---

# ${kind}
`;
}

function createFixture() {
  const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-doc-governance-'));
  mkdirSync(resolve(rootDir, 'docs'), { recursive: true });
  const currentDocuments: Record<string, { path: string; effective_date: string }> = {};
  for (const kind of ['baseline', 'plan', 'roadmap', 'backlog']) {
    const path = `docs/${kind}.md`;
    currentDocuments[kind] = { path, effective_date: '2026-09-02' };
    writeFileSync(resolve(rootDir, path), frontmatter(kind));
  }
  writeFileSync(
    resolve(rootDir, 'docs/historical.md'),
    frontmatter(
      'baseline',
      'historical',
      'superseded_by: docs/baseline.md\n'
    )
  );
  writeFileSync(resolve(rootDir, 'docs/README.md'), '[baseline](./baseline.md)\n');
  writeFileSync(resolve(rootDir, 'docs/source.md'), '# Source\n');
  writeFileSync(
    resolve(rootDir, 'docs/document-governance.json'),
    JSON.stringify({
      schema_version: 1,
      current_documents: currentDocuments,
      historical_documents: [
        { path: 'docs/historical.md', superseded_by: 'docs/baseline.md' },
      ],
      linked_indexes: ['docs/README.md', 'docs/source.md'],
    })
  );
  return rootDir;
}

describe('documentation governance', () => {
  it('validates the repository canonical documents', () => {
    expect(validateDocumentation({ rootDir: repositoryRoot })).toEqual([]);
  });

  it('detects broken local links', () => {
    const rootDir = createFixture();
    writeFileSync(
      resolve(rootDir, 'docs/plan.md'),
      `${frontmatter('plan')}\n[missing](./missing.md)\n`
    );
    expect(validateDocumentation({ rootDir })).toContain(
      'docs/plan.md: link local quebrado: ./missing.md'
    );
  });

  it('detects missing required metadata', () => {
    const rootDir = createFixture();
    writeFileSync(
      resolve(rootDir, 'docs/backlog.md'),
      frontmatter('backlog').replace('owner: Test Owner\n', '')
    );
    expect(validateDocumentation({ rootDir })).toContain(
      'docs/backlog.md: metadata obrigatória ausente: owner'
    );
  });

  it('rejects two current baselines', () => {
    const rootDir = createFixture();
    writeFileSync(resolve(rootDir, 'docs/duplicate.md'), frontmatter('baseline'));
    expect(validateDocumentation({ rootDir })).toContain(
      'document_kind baseline: esperado 1 documento current, encontrados 2 (docs/baseline.md, docs/duplicate.md)'
    );
  });
});

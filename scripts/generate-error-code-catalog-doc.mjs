#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ERROR_CATALOG } from '../packages/shared/errors/dist/catalog.js';
import { renderErrorCodeCatalogMarkdown } from './lib/error-code-catalog-doc.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(rootDir, 'docs', 'engineering', 'API_ERROR_CODES.md');
const rendered = renderErrorCodeCatalogMarkdown(ERROR_CATALOG);
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8');
  if (current !== rendered) {
    process.stderr.write('docs/engineering/API_ERROR_CODES.md is out of date; run node scripts/generate-error-code-catalog-doc.mjs\n');
    process.exit(1);
  }
  process.stdout.write('API error code catalog document is up to date.\n');
} else {
  writeFileSync(target, rendered);
  process.stdout.write(`wrote ${path.relative(rootDir, target)} (${Object.keys(ERROR_CATALOG).length} codes)\n`);
}

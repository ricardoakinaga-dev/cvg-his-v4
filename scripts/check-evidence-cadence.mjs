#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDocumentFrontmatter } from './validate-documentation.mjs';

const root = process.cwd();
const manifestPath = resolve(root, 'docs/engineering/evidence-review-cadence.json');

export function checkEvidenceCadence({ rootDir = root, manifest = JSON.parse(readFileSync(manifestPath, 'utf8')), now = new Date() } = {}) {
  const errors = [];
  if (manifest.schema_version !== 1) errors.push('schema_version must be 1');
  if (!Number.isInteger(manifest.review_cycle_days) || manifest.review_cycle_days < 1) errors.push('review_cycle_days must be a positive integer');
  if (!manifest.owner) errors.push('owner is required');
  for (const entry of manifest.documents ?? []) {
    const path = resolve(rootDir, entry.path);
    if (!existsSync(path)) { errors.push(`${entry.path}: document missing`); continue; }
    const metadata = parseDocumentFrontmatter(readFileSync(path, 'utf8'));
    if (!metadata) { errors.push(`${entry.path}: frontmatter missing`); continue; }
    if (!metadata.review_cycle) errors.push(`${entry.path}: review_cycle missing`);
    if (!metadata.owner) errors.push(`${entry.path}: owner missing`);
    if (metadata.effective_date && Number.isNaN(Date.parse(metadata.effective_date))) errors.push(`${entry.path}: invalid effective_date`);
    if (metadata.effective_date && Date.parse(metadata.effective_date) > now.getTime() + 86_400_000) errors.push(`${entry.path}: effective_date is in the future`);
  }
  return errors.sort();
}

if (import.meta.url === pathToFileURL(process.argv[1] ? resolve(process.argv[1]) : '').href) {
  const errors = checkEvidenceCadence();
  if (errors.length) { console.error(`Evidence cadence invalid (${errors.length}):`); for (const error of errors) console.error(`- ${error}`); process.exitCode = 1; }
  else console.log('Evidence review cadence valid: governed documents, owners and cycles present.');
}

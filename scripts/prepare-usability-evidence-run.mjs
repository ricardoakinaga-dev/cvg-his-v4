#!/usr/bin/env node
// Preserve the preceding run before creating a new immutable inventory.
import { mkdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
export async function prepareUsabilityEvidenceRun(root) {
  const destination = resolve(
    root,
    'artifacts/playwright/prior-runs',
    `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`
  );
  const paths = [
    'tmp/usability-test-inventory.json',
    'tmp/playwright-discovery.json',
    'tmp/playwright-discovery.txt',
    'tmp/master-usability-audit.json',
    'playwright-report/usability/results.json'
  ];
  await mkdir(destination, { recursive: true });
  for (const path of paths) {
    try {
      await rename(resolve(root, path), resolve(destination, path.split('/').at(-1)));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return destination;
}
if (process.argv[1] === new URL(import.meta.url).pathname)
  console.log(
    `Prior evidence preserved at ${await prepareUsabilityEvidenceRun(resolve(import.meta.dirname, '..'))}`
  );

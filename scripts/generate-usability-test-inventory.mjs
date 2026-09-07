#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInventory, navigation, sourceState } from './lib/usability-test-inventory.mjs';
const [
  outputPath = 'tmp/usability-test-inventory.json',
  discoveryPath = 'tmp/playwright-discovery.json'
] = process.argv.slice(2);
try {
  if (process.env.E2E_EXPECTED_TESTS)
    throw new Error('E2E_EXPECTED_TESTS is unsupported; discovery defines the frozen inventory');
  for (const path of [outputPath, discoveryPath]) {
    try {
      await access(path);
      throw new Error(`Refusing to overwrite frozen evidence: ${path}`);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await mkdir(dirname(path), { recursive: true });
  }
  const root = resolve(import.meta.dirname, '..');
  const before = await sourceState(root);
  // --list collects tests only: no global setup, browser, web server or database startup.
  execFileSync(
    'pnpm',
    [
      'exec',
      'playwright',
      'test',
      '--config',
      'playwright-spa.config.ts',
      '--list',
      '--reporter=json'
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: resolve(discoveryPath),
        PLAYWRIGHT_JSON_OUTPUT_FILE: resolve(discoveryPath)
      }
    }
  );
  const report = JSON.parse(await readFile(discoveryPath, 'utf8'));
  const source = await sourceState(root);
  if (source.sha !== before.sha || source.digest !== before.digest)
    throw new Error('Source changed during discovery');
  const inventory = createInventory(report, await navigation(root), source);
  await writeFile(outputPath, JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' });
  console.log(
    `Frozen ${inventory.cases.length} tests and ${inventory.pairs.length} route/viewport pairs: ${outputPath}`
  );
} catch (error) {
  console.error(`Cannot freeze usability inventory: ${error.message}`);
  process.exitCode = 1;
}

#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ALLOWLIST = new Set(['apps/web/README.md']);
const IGNORELIST = new Set(['apps/web/tsconfig.tsbuildinfo', 'apps/web/.freeze-manifest.json']);
const manifestPath = resolve(process.cwd(), 'apps/web/.freeze-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(resolve(process.cwd(), filePath))).digest('hex');
}

function runGit(args) {
  try {
    const output = execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8'
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    console.error('[legacy-web-freeze] failed to inspect git state');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

if (process.env.ALLOW_LEGACY_WEB_CHANGES === '1') {
  console.warn(
    '[legacy-web-freeze] bypass enabled via ALLOW_LEGACY_WEB_CHANGES=1; apps/web changes were not blocked'
  );
  process.exit(0);
}

const changedFiles = new Set([
  ...runGit(['diff', '--name-only', 'HEAD', '--', 'apps/web']),
  ...runGit(['ls-files', '--others', '--exclude-standard', '--', 'apps/web'])
]);

const blocked = Array.from(changedFiles).filter((file) => {
  if (ALLOWLIST.has(file) || IGNORELIST.has(file)) {
    return false;
  }

  const expectedHash = manifest[file];
  if (!expectedHash) {
    return true;
  }

  return hashFile(file) !== expectedHash;
});

if (blocked.length > 0) {
  console.error('[legacy-web-freeze] apps/web is frozen and cannot receive new product changes');
  console.error('[legacy-web-freeze] blocked files:');
  for (const file of blocked) {
    console.error(` - ${file}`);
  }
  console.error(
    '[legacy-web-freeze] allowed exception list is limited to operational docs or the frozen legacy baseline. Use apps/spa for active frontend work.'
  );
  console.error(
    '[legacy-web-freeze] if an exceptional legacy hotfix is truly required, rerun with ALLOW_LEGACY_WEB_CHANGES=1 and document the reason.'
  );
  process.exit(1);
}

console.log('[legacy-web-freeze] ok: no blocked changes detected under apps/web');

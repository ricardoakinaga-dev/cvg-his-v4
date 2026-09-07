#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

export function cleanCheckoutEvidence(cwd = process.cwd()) {
  const root = resolve(cwd);
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const head = git(root, ['rev-parse', '--verify', 'HEAD']).trim();
  return { root, head, status, clean: status.length === 0 };
}

export function assertCleanCheckout(cwd = process.cwd()) {
  const evidence = cleanCheckoutEvidence(cwd);
  if (!evidence.clean) {
    throw new Error(
      `checkout is not clean at ${evidence.root} (HEAD ${evidence.head}):\n${evidence.status.join('\n')}`
    );
  }
  return evidence;
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const evidence = assertCleanCheckout();
    console.log(`Clean checkout verified: HEAD=${evidence.head}`);
  } catch (error) {
    console.error(`Clean checkout verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}

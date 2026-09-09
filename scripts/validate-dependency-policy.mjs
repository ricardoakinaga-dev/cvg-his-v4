#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies'
];
const ignoredDirectories = new Set(['node_modules', 'dist', 'coverage', 'artifacts', 'tmp', 'legado']);
const forbiddenSpec = /^(?:\*|latest|file:|link:|git:|git\+|https?:)/i;

function walkPackageJsons(rootDirectory, relativeDirectory) {
  const results = [];
  const walk = (relativePath) => {
    const absolutePath = resolve(rootDirectory, relativePath);
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
      const next = `${relativePath}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.isFile() && entry.name === 'package.json') results.push(next);
    }
  };
  walk(relativeDirectory);
  return results;
}

export function inspectDependencyPolicy({ rootDirectory = root } = {}) {
  const failures = [];
  const rootPackagePath = resolve(rootDirectory, 'package.json');
  const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8'));
  if (rootPackage.packageManager !== 'pnpm@10.0.0') {
    failures.push(`packageManager must be pnpm@10.0.0 (found ${rootPackage.packageManager ?? 'missing'})`);
  }

  const lockfile = resolve(rootDirectory, 'pnpm-lock.yaml');
  if (!existsSync(lockfile)) {
    failures.push('pnpm-lock.yaml is missing');
  }

  const manifests = ['package.json', ...walkPackageJsons(rootDirectory, 'apps'), ...walkPackageJsons(rootDirectory, 'packages')];
  for (const relativePath of manifests) {
    const manifest = JSON.parse(readFileSync(resolve(rootDirectory, relativePath), 'utf8'));
    for (const field of dependencyFields) {
      for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
        if (typeof spec !== 'string') {
          failures.push(`${relativePath}:${field}.${name} must be a string specifier`);
        } else if (forbiddenSpec.test(spec) && !spec.startsWith('workspace:')) {
          failures.push(`${relativePath}:${field}.${name} uses forbidden specifier ${spec}`);
        }
      }
    }
  }

  return { manifests, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = inspectDependencyPolicy();
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.error(`[dependency-policy] FAIL ${failure}`);
    console.error(`[dependency-policy] ${result.failures.length} violation(s)`);
    process.exitCode = 1;
  } else {
    console.log(`[dependency-policy] PASS ${result.manifests.length} active manifests; lockfile and specifier policy are valid`);
  }
}

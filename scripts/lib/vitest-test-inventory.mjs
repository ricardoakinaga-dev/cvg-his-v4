import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import ts from 'typescript';
import { resolveContainedPath } from './root-contained-path.mjs';

export const VITEST_TEST_SHARDS = Object.freeze(['vitest-unit', 'vitest-integration']);

const TEST_FILE_PATTERN = /\.test\.tsx?$/;
const PROCESS_TESTS_PREFIX = 'tests/integration/process/';
const WALK_ROOTS = ['tests', 'packages', 'apps/api', 'apps/worker', 'apps/spa'];
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'coverage',
  'artifacts',
  'tmp',
  'playwright-report',
  'test-results',
  'legacy',
]);

function isNodeTestSource(ast) {
  let native = false;
  const isNativeSpecifier = (node) =>
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
    node.text === 'node:test';
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === 'node:test'
    )
      native = true;
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      isNativeSpecifier(node.moduleReference.expression)
    )
      native = true;
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      isNativeSpecifier(node.arguments[0])
    )
      native = true;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return native;
}

function importSpecifiers(ast) {
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      specifiers.push(node.moduleSpecifier.text);
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    )
      specifiers.push(node.moduleReference.expression.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      ts.isStringLiteral(node.arguments[0])
    )
      specifiers.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return specifiers;
}

function workspaceAliases(root) {
  const resolved = resolveContainedPath(root, 'vitest.alias.ts');
  if (!resolved.ok) return [];
  const source = readFileSync(resolved.realpath, 'utf8');
  const aliases = [];
  for (const match of source.matchAll(/'([^']+)':\s*from\('([^']+)'\)/g)) {
    aliases.push([match[1], match[2]]);
  }
  aliases.sort((a, b) => b[0].length - a[0].length);
  return aliases;
}

function resolveCandidate(root, criticalSources, candidate) {
  if (criticalSources.has(candidate)) return candidate;
  for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (criticalSources.has(candidate + suffix)) return candidate + suffix;
  }
  return null;
}

function resolveSpecifier({ root, criticalSources, aliases, from, specifier }) {
  if (typeof specifier !== 'string' || !specifier) return null;
  if (specifier.startsWith('.')) {
    const base = relative(root, resolve(root, dirname(from), specifier)).split('\\').join('/');
    return resolveCandidate(root, criticalSources, base.replace(/\.jsx?$/, ''));
  }
  for (const [key, target] of aliases) {
    if (specifier === key) return criticalSources.has(target) ? target : null;
    if (specifier.startsWith(`${key}/`)) {
      const base = target.replace(/(?:\/index)?\.tsx?$/, '');
      return resolveCandidate(root, criticalSources, `${base}/${specifier.slice(key.length + 1)}`);
    }
  }
  return null;
}

function walkTestFiles(directory, files) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      walkTestFiles(path, files);
    } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      files.push(path);
    }
  }
}

/**
 * Deterministic discovery of the Vitest test files that statically import at
 * least one frozen `javascript-metrics` critical source. Native/process suites
 * own their own inventories (`nativeTests`/`processTests`) and are excluded
 * here. Frontend suites are included when they import a critical
 * `javascript-metrics` source; `.vue` sources remain specialized evidence and
 * do not create an obligation on their own.
 */
export function discoverCriticalVitestTests(root, manifest) {
  const criticalSources = new Set(
    (Array.isArray(manifest?.files) ? manifest.files : [])
      .filter((file) => file?.applicability === 'javascript-metrics' && typeof file.path === 'string')
      .map((file) => file.path)
  );
  const aliases = workspaceAliases(root);
  const candidates = [];
  for (const walkRoot of WALK_ROOTS) {
    const resolved = resolveContainedPath(root, walkRoot);
    if (resolved.ok) walkTestFiles(resolved.realpath, candidates);
  }
  const discovered = new Set();
  for (const absolute of candidates) {
    const path = relative(root, absolute).split('\\').join('/');
    if (path.startsWith(PROCESS_TESTS_PREFIX)) continue;
    const source = readFileSync(absolute, 'utf8');
    const ast = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true);
    if (ast.parseDiagnostics.length) throw new Error(`vitest test source cannot be parsed: ${path}`);
    if (isNodeTestSource(ast)) continue;
    for (const specifier of importSpecifiers(ast)) {
      if (resolveSpecifier({ root, criticalSources, aliases, from: path, specifier })) {
        discovered.add(path);
        break;
      }
    }
  }
  return [...discovered].sort();
}

export function applyVitestInventoryChanges({ vitestTests, added = [], removed = [] }) {
  const next = [...(Array.isArray(vitestTests) ? vitestTests : [])];
  for (const path of removed) {
    const index = next.indexOf(path);
    if (index === -1) throw new Error(`Cannot remove an unknown vitest test: ${path}`);
    next.splice(index, 1);
  }
  for (const path of [...added].sort()) {
    if (typeof path !== 'string' || !path || path.startsWith(PROCESS_TESTS_PREFIX)) {
      throw new Error(`vitest test does not belong to the frozen inventory: ${path}`);
    }
    if (next.includes(path)) throw new Error(`vitest test already present: ${path}`);
    next.push(path);
  }
  return next;
}

export function validateVitestInventory({ root, manifest }) {
  const errors = [];
  const requiredShards = Array.isArray(manifest?.requiredShards) ? manifest.requiredShards : [];
  const requiredVitestShards = VITEST_TEST_SHARDS.filter((shard) => requiredShards.includes(shard));
  const inventory = manifest?.vitestTests;
  if (inventory === undefined) {
    if (requiredVitestShards.length) {
      errors.push(`vitestTests is required when requiredShards includes: ${requiredVitestShards.join(', ')}`);
    }
    return errors;
  }
  if (!Array.isArray(inventory)) return ['vitestTests must be a list'];
  const seen = new Set();
  for (const path of inventory) {
    if (typeof path !== 'string' || !path) {
      errors.push('vitestTests entries must be non-empty strings');
      continue;
    }
    if (seen.has(path)) {
      errors.push(`${path}: duplicate vitest test`);
      continue;
    }
    seen.add(path);
    if (path.startsWith(PROCESS_TESTS_PREFIX)) {
      errors.push(`${path}: process suites belong to processTests`);
      continue;
    }
    const resolved = resolveContainedPath(root, path);
    if (!resolved.ok) {
      errors.push(`${path}: ${resolved.reason}`);
      continue;
    }
    if (!lstatSync(resolved.realpath).isFile()) {
      errors.push(`${path}: vitest test is not a regular file`);
      continue;
    }
    const source = readFileSync(resolved.realpath, 'utf8');
    const ast = ts.createSourceFile(resolved.realpath, source, ts.ScriptTarget.Latest, true);
    if (isNodeTestSource(ast)) errors.push(`${path}: native suite belongs to nativeTests`);
    if (!(manifest.executionInputs ?? []).includes(path)) {
      errors.push(`${path}: vitest test is missing from executionInputs`);
    }
  }
  let discovered;
  try {
    discovered = discoverCriticalVitestTests(root, manifest);
  } catch (error) {
    errors.push(`vitest discovery failed: ${error.message}`);
    return errors;
  }
  const missing = discovered.filter((path) => !seen.has(path));
  if (missing.length) {
    errors.push(`vitestTests is missing discovered test files that import frozen critical sources: ${missing.join(', ')}`);
  }
  return errors;
}

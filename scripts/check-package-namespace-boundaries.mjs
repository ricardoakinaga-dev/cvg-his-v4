#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const LEGACY_NAMESPACE = '@cvg-his/';
const CANONICAL_NAMESPACE = '@cvg-his-v2/';
const SOURCE_EXTENSIONS = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
  '.vue'
]);
const SCANNED_ROOTS = ['apps', 'packages'];
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies'
];

function parseArgs(argv) {
  const rootIndex = argv.indexOf('--root');
  if (rootIndex === -1) {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..');
  }

  const root = argv[rootIndex + 1];
  if (!root || root.startsWith('--')) {
    throw new Error('--root requires a directory path');
  }

  return resolve(root);
}

function walk(directory) {
  if (!existsSync(directory)) return [];

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') {
      continue;
    }

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else {
      files.push(path);
    }
  }

  return files;
}

function packageManifests(root) {
  return SCANNED_ROOTS.flatMap((relativeRoot) =>
    walk(join(root, relativeRoot)).filter((path) => path.endsWith('package.json'))
  );
}

function canonicalPackageRoots(root) {
  return packageManifests(root).flatMap((manifestPath) => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return manifest.name?.startsWith(CANONICAL_NAMESPACE) ? [dirname(manifestPath)] : [];
  });
}

function sourceFiles(root) {
  return canonicalPackageRoots(root).flatMap((packageRoot) =>
    walk(packageRoot).filter((path) => SOURCE_EXTENSIONS.has(extname(path)))
  );
}

function sourceContents(sourcePath, source) {
  if (extname(sourcePath) !== '.vue') return [source];

  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

function moduleSpecifier(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    return node.head.text;
  }

  return undefined;
}

function scriptKind(sourcePath) {
  switch (extname(sourcePath)) {
    case '.cjs':
    case '.js':
    case '.mjs':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.tsx':
      return ts.ScriptKind.TSX;
    default:
      return ts.ScriptKind.TS;
  }
}

function manifestViolations(root) {
  const violations = [];
  for (const manifestPath of packageManifests(root)) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!manifest.name?.startsWith(CANONICAL_NAMESPACE)) continue;

    for (const field of DEPENDENCY_FIELDS) {
      for (const dependency of Object.keys(manifest[field] ?? {})) {
        if (dependency.startsWith(LEGACY_NAMESPACE)) {
          violations.push(
            `manifest dependency: ${relative(root, manifestPath)} (${manifest.name}) -> ${dependency}`
          );
        }
      }
    }
  }

  return violations;
}

function sourceViolations(root) {
  const violations = [];

  for (const sourcePath of sourceFiles(root)) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const content of sourceContents(sourcePath, source)) {
      const sourceFile = ts.createSourceFile(
        sourcePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        scriptKind(sourcePath)
      );

      function inspect(node) {
        const candidates = [];

        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          candidates.push(node.moduleSpecifier);
        } else if (
          ts.isImportEqualsDeclaration(node) &&
          ts.isExternalModuleReference(node.moduleReference)
        ) {
          candidates.push(node.moduleReference.expression);
        } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
          const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
          const isRequireCall =
            (ts.isIdentifier(node.expression) && node.expression.text === 'require') ||
            (ts.isPropertyAccessExpression(node.expression) &&
              ts.isIdentifier(node.expression.expression) &&
              node.expression.expression.text === 'require' &&
              node.expression.name.text === 'resolve');

          if (isDynamicImport || isRequireCall) {
            candidates.push(node.arguments[0]);
          }
        }

        for (const candidate of candidates) {
          const dependency = candidate && moduleSpecifier(candidate);
          if (dependency?.startsWith(LEGACY_NAMESPACE)) {
            violations.push(`source import: ${relative(root, sourcePath)} -> ${dependency}`);
          }
        }

        ts.forEachChild(node, inspect);
      }

      inspect(sourceFile);
    }
  }

  return violations;
}

function main() {
  const root = parseArgs(process.argv.slice(2));
  const violations = [...manifestViolations(root), ...sourceViolations(root)];

  if (violations.length > 0) {
    console.log(`Package namespace boundary violations (${violations.length}):`);
    for (const violation of violations) console.log(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Package namespace boundary clean: canonical packages under ${SCANNED_ROOTS.join(', ')}`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

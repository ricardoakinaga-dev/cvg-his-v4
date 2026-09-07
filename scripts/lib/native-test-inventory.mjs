import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { collectNativeTestEvidence } from './native-test-evidence-reporter.mjs';
import { resolveContainedPath } from './root-contained-path.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const checked = (root, path) => {
  const result = resolveContainedPath(root, path);
  if (!result.ok || result.realpath !== result.absolute) throw new Error(`native inventory path ${path}: ${result.reason ?? 'symlink is not allowed'}`);
  if (!lstatSync(result.realpath).isFile()) throw new Error(`native inventory path is not a file: ${path}`);
  return result;
};

// Call after a successful current-source build, and again after test execution.
// A snapshot alone does not establish that compiled code came from that build.
export function snapshotNativeInventory(root, app, expectedTests) {
  if (!['worker', 'api'].includes(app)) throw new Error('unsupported native application');
  if (!Array.isArray(expectedTests) || !expectedTests.length || new Set(expectedTests).size !== expectedTests.length) throw new Error('nonempty unique frozen native inventory required');
  const prefix = `apps/${app}/src/`;
  const sourceRoot = resolveContainedPath(root, prefix);
  if (!sourceRoot.ok) throw new Error('native source root is unavailable or external');
  const discovered = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('symlinks are not allowed in native source inventory');
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile() && path.endsWith('.test.ts')) {
        const source = readFileSync(path, 'utf8');
        const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
        if (ast.parseDiagnostics.length) throw new Error(`native test source cannot be parsed: ${path}`);
        let native = false;
        const isNativeSpecifier = (node) => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text === 'node:test';
        const visit = (node) => {
          if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === 'node:test') native = true;
          if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && isNativeSpecifier(node.moduleReference.expression)) native = true;
          if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) && isNativeSpecifier(node.arguments[0])) native = true;
          ts.forEachChild(node, visit);
        };
        visit(ast);
        if (native) discovered.push(relative(resolve(root), path).replaceAll('\\', '/'));
      }
    }
  };
  walk(sourceRoot.absolute);
  const expected = [...expectedTests].sort();
  if (expected.some((path) => typeof path !== 'string' || !path.startsWith(prefix) || !path.endsWith('.test.ts')) || JSON.stringify(expected) !== JSON.stringify(discovered.sort())) throw new Error('frozen native inventory differs from discovered test files');
  return expected.map((sourcePath) => {
    const source = checked(root, sourcePath);
    const generatedPath = sourcePath.replace(prefix, `apps/${app}/dist/`).replace(/\.ts$/, '.js');
    const generated = checked(root, generatedPath);
    const mapPath = `${generatedPath}.map`;
    const map = checked(root, mapPath);
    const mapBytes = readFileSync(map.realpath);
    const sourceMap = JSON.parse(mapBytes);
    if (sourceMap.version !== 3 || sourceMap.sourceRoot || !Array.isArray(sourceMap.sources) || sourceMap.sources.length !== 1 || typeof sourceMap.sources[0] !== 'string') throw new Error('native test requires a single original-source map');
    const mapped = checked(root, resolve(dirname(generated.absolute), sourceMap.sources[0]));
    if (mapped.realpath !== source.realpath) throw new Error('native test map points to a different source');
    return {
      source: sourcePath, generated: generatedPath, executedFile: generated.realpath,
      sourceSha256: hash(readFileSync(source.realpath)), generatedSha256: hash(readFileSync(generated.realpath)), mapSha256: hash(mapBytes),
    };
  });
}

export async function validateNativeObservation(observation, inventory, { exitCode, signal }) {
  const errors = [];
  if (exitCode !== 0 || signal) errors.push('native runner did not exit successfully');
  if (observation?.schemaVersion !== 1 || observation.kind !== 'native-test-observation' || observation.status !== 'passed' || !Array.isArray(observation.errors) || observation.errors.length) errors.push('invalid native observation status');
  if (!Array.isArray(inventory) || !inventory.length || new Set(inventory.map((entry) => entry.executedFile)).size !== inventory.length) errors.push('invalid expected native inventory');
  const files = Array.isArray(observation?.files) ? observation.files : [];
  const events = files.map((file) => ({ type: 'test:summary', data: file }));
  if (observation?.summary) events.push({ type: 'test:summary', data: observation.summary });
  const recomputed = await collectNativeTestEvidence(events);
  errors.push(...recomputed.errors);
  const expected = (inventory ?? []).map((entry) => entry.executedFile).sort();
  const actual = files.map((file) => file.file).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push('native executed files differ from frozen inventory');
  return { status: errors.length ? 'failed' : 'passed', errors };
}

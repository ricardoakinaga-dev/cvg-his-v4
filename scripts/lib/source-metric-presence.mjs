import ts from 'typescript';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { parse } = coverageRequire('acorn');

function validReexportAttributes(node) {
  const attributes = node.attributes?.elements;
  if (!attributes) return true;
  if (!attributes.every((attribute) => ts.isStringLiteral(attribute.value))) return false;
  if (node.isTypeOnly) {
    return (
      attributes.length === 1 &&
      ts.isStringLiteral(attributes[0].name) &&
      attributes[0].name.text === 'resolution-mode' &&
      ['import', 'require'].includes(attributes[0].value.text)
    );
  }
  return !attributes.some((attribute) => attribute.name.text === 'resolution-mode');
}

// Reexports have module-linking effects, measured in the imported modules, but
// no own statement/function/branch counters in the installed Istanbul mapper.
// Preserve their file entries and identity; never fabricate hits or drop them.
// This is not a general empty-file/type-only exemption or dependency approval.
export function isRuntimeReexportOnly(source) {
  if (typeof source !== 'string') return false;
  const ast = ts.createSourceFile(
    'original.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (
    ast.parseDiagnostics.length ||
    !ast.statements.length ||
    !ast.statements.every(
      (node) =>
        ts.isExportDeclaration(node) &&
        !node.modifiers?.length &&
        validReexportAttributes(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text.length > 0 &&
        (!node.exportClause ||
          ts.isNamespaceExport(node.exportClause) ||
          (ts.isNamedExports(node.exportClause) && node.exportClause.elements.length > 0))
    )
  )
    return false;
  // Explicit export aliases share a declaration namespace even when erased.
  // Inspect decoded exported names, not imported names or emitted JS names.
  const exportedNames = new Set();
  for (const node of ast.statements) {
    const clause = node.exportClause;
    if (!clause) continue;
    const specifiers = ts.isNamespaceExport(clause) ? [clause] : clause.elements;
    for (const specifier of specifiers) {
      if (node.isTypeOnly && specifier.isTypeOnly) return false;
      const name = specifier.name.text;
      if (exportedNames.has(name)) return false;
      exportedNames.add(name);
    }
  }
  if (
    !ast.statements.some(
      (node) =>
        !node.isTypeOnly &&
        (!node.exportClause ||
          ts.isNamespaceExport(node.exportClause) ||
          node.exportClause.elements.some((element) => !element.isTypeOnly))
    )
  )
    return false;
  // Validate every declaration as ESM, including names that TS transpilation
  // would erase. Only remove type markers in this validation-only AST; preserve
  // all declarations/specifiers, module names and attributes. Never execute it
  // or use it as a source map, coverage input or proof of module resolution.
  try {
    const declarations = ast.statements.map((node) => {
      const clause = node.exportClause;
      const checkedClause =
        clause && ts.isNamedExports(clause)
          ? ts.factory.updateNamedExports(
              clause,
              clause.elements.map((specifier) =>
                ts.factory.updateExportSpecifier(
                  specifier,
                  false,
                  specifier.propertyName,
                  specifier.name
                )
              )
            )
          : clause;
      return ts.factory.updateExportDeclaration(
        node,
        node.modifiers,
        false,
        checkedClause,
        node.moduleSpecifier,
        // Type-only resolution assertions are erased by TS at execution time.
        // Validate their already-checked payload as modern ESM attributes too.
        node.isTypeOnly && node.attributes
          ? ts.factory.createImportAttributes(node.attributes.elements)
          : node.attributes
      );
    });
    const validationSource = ts
      .createPrinter()
      .printFile(ts.factory.updateSourceFile(ast, declarations));
    const runtime = parse(validationSource, { ecmaVersion: 'latest', sourceType: 'module' });
    return (
      runtime.body.length > 0 &&
      runtime.body.every(
        (node) =>
          (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
          !node.declaration &&
          typeof node.source?.value === 'string' &&
          node.source.value.length > 0
      )
    );
  } catch {
    return false;
  }
}

export function assertSourceMetricPresence(entry, authenticatedSources) {
  if ([entry.s, entry.f, entry.b].some((metric) => Object.keys(metric).length)) return;
  const url = pathToFileURL(entry.path).href;
  if (
    !Object.hasOwn(authenticatedSources ?? {}, url) ||
    !isRuntimeReexportOnly(authenticatedSources[url])
  )
    throw new Error('empty executable coverage cannot certify an original source');
}

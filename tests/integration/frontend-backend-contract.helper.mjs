import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse: parseVue } = require(
  require.resolve('vue/compiler-sfc', { paths: [resolve('apps/spa')] })
);
const UNKNOWN = '§dynamic§';
const SEGMENT = '§segment§';
const unique = (values) => [...new Set(values)];
const combine = (left, right) => unique(left.flatMap((a) => right.map((b) => a + b)));

// Static declarations only: this does not assert that a running server dispatches a route.
export function collectDeclaredRequests(source, file = 'service.ts', resolveImport = () => null) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const host = ts.createCompilerHost({ noResolve: true, noLib: true, allowNonTsExtensions: true });
  host.getSourceFile = (name) => (name === file ? sourceFile : undefined);
  const program = ts.createProgram(
    [file],
    { noResolve: true, noLib: true, allowNonTsExtensions: true },
    host
  );
  const checker = program.getTypeChecker();
  const unresolved = [];
  const requests = [];
  const forwarding = [];
  function declaration(node) {
    const symbol = checker.getSymbolAtLocation(node);
    return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  }
  function requestKind(node, seen = new Set()) {
    if (!node || seen.has(node)) return null;
    const next = new Set(seen).add(node);
    if (ts.isIdentifier(node)) {
      if (['apiRequest', 'fetch'].includes(node.text)) return node.text;
      const decl = declaration(node);
      if (decl && ts.isImportSpecifier(decl)) {
        const exportedName = (decl.propertyName ?? decl.name).text;
        return ['apiRequest', 'fetch'].includes(exportedName)
          ? exportedName
          : resolveImport(decl.parent.parent.parent.moduleSpecifier.text, exportedName, file);
      }
      if (decl && ts.isVariableDeclaration(decl)) return requestKind(decl.initializer, next);
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const decl = declaration(node.expression);
      if (decl && ts.isNamespaceImport(decl))
        return ['apiRequest', 'fetch'].includes(node.name.text)
          ? node.name.text
          : resolveImport(decl.parent.parent.moduleSpecifier.text, node.name.text, file);
    }
    return null;
  }
  // Follow arrays through Vue refs/computed and filter/map callback bindings.
  function dataNodes(node, seen = new Set()) {
    if (!node || seen.has(node)) return [];
    const next = new Set(seen).add(node);
    if (ts.isIdentifier(node)) {
      const decl = declaration(node);
      if (decl && ts.isVariableDeclaration(decl)) return dataNodes(decl.initializer, next);
      if (decl && ts.isParameter(decl)) {
        const fn = decl.parent,
          call = fn.parent;
        if (ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression))
          return dataNodes(call.expression.expression, next);
      }
    }
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'value')
      return dataNodes(node.expression, next);
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap((n) => dataNodes(n, next));
    if (ts.isObjectLiteralExpression(node)) return [node];
    if (ts.isCallExpression(node)) {
      if (
        ts.isIdentifier(node.expression) &&
        ['ref', 'reactive', 'computed'].includes(node.expression.text)
      )
        return dataNodes(node.arguments[0], next);
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ['filter', 'slice'].includes(node.expression.name.text)
      )
        return dataNodes(node.expression.expression, next);
    }
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (!ts.isBlock(node.body)) return dataNodes(node.body, next);
      const result = [];
      const visit = (n) => {
        if (ts.isReturnStatement(n)) result.push(...dataNodes(n.expression, next));
        else if (n === node.body || !ts.isFunctionLike(n)) ts.forEachChild(n, visit);
      };
      visit(node.body);
      return result;
    }
    return [];
  }
  const argumentsByParameter = new Map();
  function values(node, seen = new Set()) {
    if (!node || seen.has(node)) return [UNKNOWN];
    const next = new Set(seen).add(node);
    if (ts.isStringLiteralLike(node)) return [node.text];
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node))
      return values(node.expression, next);
    if (ts.isConditionalExpression(node))
      return unique([...values(node.whenTrue, next), ...values(node.whenFalse, next)]);
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return combine(values(node.left, next), values(node.right, next));
    if (ts.isTemplateExpression(node)) {
      let parts = [node.head.text];
      for (const span of node.templateSpans)
        parts = combine(combine(parts, values(span.expression, next)), [span.literal.text]);
      return parts;
    }
    if (ts.isPropertyAccessExpression(node)) {
      const objects = dataNodes(node.expression);
      if (objects.length)
        return unique(
          objects.flatMap((object) => {
            const property = object.properties.find(
              (p) => p.name?.getText(sourceFile) === node.name.text
            );
            return property && ts.isPropertyAssignment(property)
              ? values(property.initializer, next)
              : [UNKNOWN];
          })
        );
      if (ts.isCallExpression(node.expression)) return [UNKNOWN];
      return [SEGMENT];
    }
    if (ts.isIdentifier(node)) {
      const declaration = checker.getSymbolAtLocation(node)?.valueDeclaration;
      if (declaration && argumentsByParameter.has(declaration))
        return values(argumentsByParameter.get(declaration), next);
      if (declaration && ts.isVariableDeclaration(declaration))
        return values(declaration.initializer, next);
      return [SEGMENT];
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'encodeURIComponent') return [SEGMENT];
      const declaration = checker.getSymbolAtLocation(node.expression)?.valueDeclaration;
      const callable =
        declaration && ts.isVariableDeclaration(declaration)
          ? declaration.initializer
          : declaration;
      if (
        callable &&
        (ts.isFunctionDeclaration(callable) ||
          ts.isArrowFunction(callable) ||
          ts.isFunctionExpression(callable))
      ) {
        const previous = new Map(argumentsByParameter);
        callable.parameters.forEach((parameter, index) =>
          argumentsByParameter.set(parameter, node.arguments[index])
        );
        try {
          const returns = [];
          function findReturns(part) {
            if (ts.isReturnStatement(part)) returns.push(...values(part.expression, next));
            else if (part === callable.body || !ts.isFunctionLike(part))
              ts.forEachChild(part, findReturns);
          }
          if (callable.body && !ts.isBlock(callable.body))
            returns.push(...values(callable.body, next));
          else if (callable.body) findReturns(callable.body);
          if (returns.length)
            return unique(returns.map((value) => (value === SEGMENT ? UNKNOWN : value)));
        } finally {
          argumentsByParameter.clear();
          previous.forEach((value, key) => argumentsByParameter.set(key, value));
        }
      }
    }
    return [UNKNOWN];
  }
  function visit(node) {
    if (ts.isCallExpression(node) && requestKind(node.expression)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const identity = {
        file,
        line,
        expression: node.arguments[0]?.getText(sourceFile) ?? '<missing>'
      };
      if (requestKind(node.expression) === 'fetch') {
        let enclosing = node.parent;
        while (enclosing && !ts.isFunctionLike(enclosing)) enclosing = enclosing.parent;
        const arg = node.arguments[0];
        const argDecl = arg && ts.isIdentifier(arg) ? declaration(arg) : null;
        const parameter = argDecl && ts.isBindingElement(argDecl) ? argDecl.parent.parent : argDecl;
        const forwardsRequest =
          parameter &&
          ts.isParameter(parameter) &&
          parameter.type &&
          (parameter.type.getText(sourceFile) === 'Request' ||
            (ts.isTypeLiteralNode(parameter.type) &&
              parameter.type.members.some(
                (member) =>
                  member.name?.getText(sourceFile) === arg.getText(sourceFile) &&
                  member.type?.getText(sourceFile) === 'Request'
              )));
        const forwardsApi =
          enclosing &&
          ts.isFunctionDeclaration(enclosing) &&
          enclosing.name?.text === 'apiRequest' &&
          argDecl &&
          ts.isVariableDeclaration(argDecl) &&
          argDecl.initializer &&
          ts.isConditionalExpression(argDecl.initializer) &&
          values(argDecl.initializer).some((value) => value.includes('/api')) &&
          enclosing.parameters[0]?.name.getText(sourceFile) === 'path';
        if (forwardsApi || forwardsRequest) {
          forwarding.push({
            ...identity,
            kind: forwardsApi ? 'apiRequest transport' : 'Request object transport',
            expression: node.getText(sourceFile)
          });
          ts.forEachChild(node, visit);
          return;
        }
      }
      let method = 'GET';
      const options = node.arguments[1];
      if (options) {
        if (
          !ts.isObjectLiteralExpression(options) ||
          options.properties.some(ts.isSpreadAssignment)
        )
          unresolved.push({ ...identity, reason: 'request options are not a static object' });
        else {
          const propertyNames = options.properties.map((p) => ({
            property: p,
            names:
              p.name && ts.isComputedPropertyName(p.name)
                ? values(p.name.expression)
                : [p.name?.getText(sourceFile).replaceAll(/["']/g, '')]
          }));
          if (propertyNames.some((p) => p.names.some((name) => [UNKNOWN, SEGMENT].includes(name))))
            unresolved.push({ ...identity, reason: 'computed option key cannot be resolved' });
          const property = propertyNames.find((p) => p.names.includes('method'))?.property;
          if (property) {
            const methods = values(property.initializer);
            if (methods.length !== 1 || [UNKNOWN, SEGMENT].includes(methods[0]))
              unresolved.push({ ...identity, reason: 'HTTP method cannot be resolved' });
            else method = methods[0].toUpperCase();
          }
        }
      }
      for (let path of values(node.arguments[0])) {
        if (requestKind(node.expression) === 'fetch') {
          const apiIndex = path.indexOf('/api/');
          if (apiIndex < 0) {
            unresolved.push({ ...identity, reason: 'fetch API base/path cannot be resolved' });
            continue;
          }
          path = path.slice(apiIndex + 4);
        }
        path = path.split(/[?#]/, 1)[0];
        const segments = path.split('/');
        if (
          !path.startsWith('/') ||
          path.includes(UNKNOWN) ||
          segments.some((segment) => segment.includes(SEGMENT) && segment !== SEGMENT)
        ) {
          unresolved.push({ ...identity, reason: `path structure cannot be resolved: ${path}` });
          continue;
        }
        path = segments.map((segment) => (segment === SEGMENT ? '{param}' : segment)).join('/');
        requests.push({ ...identity, method, path });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return {
    requests: [...new Map(requests.map((r) => [JSON.stringify(r), r])).values()],
    unresolved,
    forwarding
  };
}
export function missingDeclaredRequests(requests, openapi) {
  const canonical = (path) =>
    path
      .split('/')
      .map((segment) => (/^\{[^{}]+\}$/.test(segment) ? '{param}' : segment))
      .join('/');
  const paths = new Map(
    Object.entries(openapi.paths ?? {}).map(([path, methods]) => [canonical(path), methods])
  );
  return requests.filter(({ path, method }) => !paths.get(canonical(path))?.[method.toLowerCase()]);
}

export function collectSpaRequests(root = resolve('apps/spa/src')) {
  const files = (directory) =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : files(path);
      return /\.(?:ts|tsx|vue)$/.test(path) && !/\.(?:test|spec|d)\.tsx?$/.test(path) ? [path] : [];
    });
  const requests = [],
    unresolved = [],
    forwarding = [];
  const moduleFiles = new Set(files(root));
  function importedKind(module, exportedName, importer, seen = new Set()) {
    const base = module.startsWith('@/')
      ? join(root, module.slice(2))
      : module.startsWith('.')
        ? resolve(dirname(importer), module)
        : null;
    if (!base) return null;
    const file = [base, base + '.ts', base + '.tsx', join(base, 'index.ts')].find((candidate) =>
      moduleFiles.has(candidate)
    );
    if (!file) return null;
    const key = file + '#' + exportedName;
    if (seen.has(key)) return null;
    const next = new Set(seen).add(key);
    const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const bindings = new Map();
    for (const statement of ast.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings)
      )
        for (const entry of statement.importClause.namedBindings.elements)
          bindings.set(entry.name.text, {
            module: statement.moduleSpecifier.text,
            name: (entry.propertyName ?? entry.name).text
          });
      if (ts.isVariableStatement(statement))
        for (const entry of statement.declarationList.declarations)
          if (ts.isIdentifier(entry.name))
            bindings.set(entry.name.text, { node: entry.initializer });
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause)
      )
        for (const entry of statement.exportClause.elements)
          if (entry.name.text === exportedName) {
            if (statement.moduleSpecifier)
              return importedKind(
                statement.moduleSpecifier.text,
                (entry.propertyName ?? entry.name).text,
                file,
                next
              );
            exportedName = (entry.propertyName ?? entry.name).text;
          }
    }
    const visited = new Set();
    function bindingKind(name) {
      if (['apiRequest', 'fetch'].includes(name)) return name;
      if (visited.has(name)) return null;
      visited.add(name);
      const binding = bindings.get(name);
      if (binding?.module)
        return ['apiRequest', 'fetch'].includes(binding.name)
          ? binding.name
          : importedKind(binding.module, binding.name, file, next);
      if (binding?.node && ts.isIdentifier(binding.node)) return bindingKind(binding.node.text);
      return null;
    }
    return bindingKind(exportedName);
  }
  for (const file of files(root)) {
    const source = readFileSync(file, 'utf8');
    let scripts = [source];
    if (file.endsWith('.vue')) {
      const result = parseVue(source, { filename: file });
      if (result.errors.length)
        unresolved.push({ file, reason: 'Vue parser errors', errors: result.errors.map(String) });
      scripts = [result.descriptor.script, result.descriptor.scriptSetup]
        .filter(Boolean)
        .map((block) => '\n'.repeat(block.loc.start.line - 1) + block.content);
    }
    for (const script of scripts) {
      const result = collectDeclaredRequests(script, file, importedKind);
      requests.push(...result.requests);
      unresolved.push(...result.unresolved);
      forwarding.push(...result.forwarding);
    }
  }
  return { requests, unresolved, forwarding };
}

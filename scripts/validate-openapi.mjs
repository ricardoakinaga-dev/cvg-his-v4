#!/usr/bin/env node
/**
 * OpenAPI spec validation — pragmatic consistency checks.
 *
 * Checks:
 * 1. Valid YAML parsing
 * 2. OpenAPI version present (3.x)
 * 3. Info block complete (title, version)
 * 4. Paths object present and non-empty
 * 5. All referenced tags are declared
 * 6. No duplicate operationIds
 * 7. All paths have valid HTTP methods
 * 8. Schema references resolve to defined schemas
 * 9. Critical auth runtime routes and OpenAPI operations match bidirectionally
 *    (guarded by a bounded constant-condition reachability check: booleans,
 *    parentheses, `!`, `&&`/`||`; runtime-dependent conditions stay unknown)
 *
 * Usage: node scripts/validate-openapi.mjs [openapi-path] [auth-routes-source-path]
 */

import { readFileSync } from 'fs';
import ts from 'typescript';
import { parse } from 'yaml';

const VALID_HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
const AUTH_ROUTES_SOURCE_PATH = 'apps/api/src/routes/auth-routes.ts';

function isCriticalAuthPath(routePath) {
  return (
    routePath === '/auth/session' ||
    routePath === '/auth/sessions' ||
    routePath === '/auth/logout-all-others' ||
    routePath.startsWith('/auth/sessions/') ||
    routePath.startsWith('/auth/mfa/webauthn/') ||
    routePath.startsWith('/auth/oidc/')
  );
}

function extractCriticalRuntimeAuthOperations(source) {
  const operations = new Set();
  const sourceFile = ts.createSourceFile(
    AUTH_ROUTES_SOURCE_PATH,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const revokeMatchers = new Set();

  function unwrapParentheses(expression) {
    let current = expression;
    while (ts.isParenthesizedExpression(current)) current = current.expression;
    return current;
  }

  // Deliberately bounded constant analysis for `if` conditions. It only
  // classifies boolean literals, parenthesized forms, unary `!` and the
  // short-circuit operators `&&`/`||` over already-proven constants.
  // Identifiers, calls, comparisons and every other expression stay
  // UNKNOWN: a runtime-dependent condition is never treated as a constant.
  function constantBooleanValue(expression) {
    const current = unwrapParentheses(expression);
    if (current.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (current.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.ExclamationToken) {
      const value = constantBooleanValue(current.operand);
      return value === undefined ? undefined : !value;
    }
    if (ts.isBinaryExpression(current)) {
      const operator = current.operatorToken.kind;
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
        const left = constantBooleanValue(current.left);
        const right = constantBooleanValue(current.right);
        if (left === false || right === false) return false;
        return left === true && right === true ? true : undefined;
      }
      if (operator === ts.SyntaxKind.BarBarToken) {
        const left = constantBooleanValue(current.left);
        const right = constantBooleanValue(current.right);
        if (left === true || right === true) return true;
        return left === false && right === false ? false : undefined;
      }
    }
    return undefined;
  }

  function flattenConjunction(expression) {
    const current = unwrapParentheses(expression);
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      return [...flattenConjunction(current.left), ...flattenConjunction(current.right)];
    }
    return [current];
  }

  function equalityValue(expression, leftText) {
    const current = unwrapParentheses(expression);
    if (!ts.isBinaryExpression(current) || current.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) {
      return undefined;
    }
    const left = current.left.getText(sourceFile);
    const right = current.right;
    if (left === leftText && ts.isStringLiteral(right)) return right.text;
    if (current.right.getText(sourceFile) === leftText && ts.isStringLiteral(current.left)) {
      return current.left.text;
    }
    return undefined;
  }

  function visit(node, unreachable = false) {
    if (!unreachable && ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const initializer = node.initializer.getText(sourceFile);
      if (/^pathname\.match\(\/\^\\\/auth\\\/sessions\\\/\(\[\^\/\]\+\)\\\/revoke\$\/\)$/.test(initializer)) {
        revokeMatchers.add(node.name.text);
      }
    }

    if (ts.isIfStatement(node)) {
      const conditionValue = constantBooleanValue(node.expression);
      const operands = flattenConjunction(node.expression);
      if (!unreachable && conditionValue !== false) {
        const routePath = operands.map((operand) => equalityValue(operand, 'pathname')).find(Boolean);
        const method = operands
          .map((operand) => equalityValue(operand, 'request.method'))
          .find((value) => VALID_HTTP_METHODS.includes(value?.toLowerCase()));

        if (routePath && method && isCriticalAuthPath(routePath)) {
          operations.add(`${method} ${routePath}`);
        }

        const matcher = operands.find(
          (operand) => ts.isIdentifier(operand) && revokeMatchers.has(operand.text)
        );
        if (matcher && method === 'POST') {
          operations.add('POST /auth/sessions/{sessionId}/revoke');
        }
      }

      ts.forEachChild(node.expression, (child) => visit(child, unreachable));
      visit(node.thenStatement, unreachable || conditionValue === false);
      if (node.elseStatement) visit(node.elseStatement, unreachable || conditionValue === true);
      return;
    }

    ts.forEachChild(node, (child) => visit(child, unreachable));
  }

  visit(sourceFile);

  return operations;
}

function extractCriticalOpenApiAuthOperations(doc) {
  const operations = new Set();
  for (const [routePath, pathItem] of Object.entries(doc.paths || {})) {
    if (!isCriticalAuthPath(routePath) || !pathItem || typeof pathItem !== 'object') continue;
    for (const method of VALID_HTTP_METHODS) {
      if (pathItem[method]) operations.add(`${method.toUpperCase()} ${routePath}`);
    }
  }
  return operations;
}

const path = process.argv[2] || 'apps/api/src/openapi.yaml';
const authRoutesSourcePath = process.argv[3] || AUTH_ROUTES_SOURCE_PATH;

let errors = [];

try {
  const content = readFileSync(path, 'utf-8');
  const doc = parse(content, { prettyErrors: true });

  // 1. OpenAPI version
  if (!doc.openapi) {
    errors.push('Missing "openapi" field (expected 3.x)');
  } else if (!doc.openapi.startsWith('3.')) {
    errors.push(`Unsupported OpenAPI version: ${doc.openapi}`);
  }

  // 2. Info block
  if (!doc.info || !doc.info.title || !doc.info.version) {
    errors.push('Missing info.title or info.version');
  }

  // 3. Paths
  if (!doc.paths || typeof doc.paths !== 'object') {
    errors.push('Missing "paths" object');
  } else {
    const pathCount = Object.keys(doc.paths).length;
    console.log(`✅ OpenAPI valid: ${doc.info?.title} v${doc.info?.version} (${pathCount} paths)`);

    // 4. Valid HTTP methods per path
    for (const [pathStr, pathObj] of Object.entries(doc.paths)) {
      if (typeof pathObj !== 'object') continue;
      for (const [method, operation] of Object.entries(pathObj)) {
        if (method === 'parameters') continue;
        if (!VALID_HTTP_METHODS.includes(method)) {
          errors.push(`Invalid HTTP method "${method}" in path ${pathStr}`);
        }
        // 5. operationId uniqueness
        if (operation?.operationId) {
          // Check for duplicate operationIds
          const allOps = Object.values(doc.paths).flatMap((p) =>
            Object.entries(p)
              .filter(([m]) => VALID_HTTP_METHODS.includes(m))
              .map(([, o]) => o?.operationId)
          );
          const opId = operation.operationId;
          if (allOps.filter((id) => id === opId).length > 1) {
            errors.push(`Duplicate operationId: "${opId}"`);
          }
        }
        // 6. Tag existence
        if (operation?.tags && Array.isArray(operation.tags)) {
          const declaredTags = new Set((doc.tags || []).map((t) => t.name));
          for (const tag of operation.tags) {
            if (!declaredTags.has(tag)) {
              errors.push(`Undefined tag "${tag}" used in ${method.toUpperCase()} ${pathStr}`);
            }
          }
        }
      }
    }
  }

  // 7. Schema reference validation (basic)
  const definedSchemas = new Set(Object.keys(doc.components?.schemas || {}));

  // Extract all $ref from specs (from the structured doc)
  const extractRefs = (obj, refs = []) => {
    if (!obj || typeof obj !== 'object') return refs;
    if (obj.$ref && typeof obj.$ref === 'string') {
      const match = obj.$ref.match(/#\/components\/schemas\/([A-Za-z0-9_]+)/);
      if (match) refs.push(match[1]);
    }
    if (Array.isArray(obj)) {
      obj.forEach((item) => extractRefs(item, refs));
    } else {
      Object.values(obj).forEach((val) => extractRefs(val, refs));
    }
    return refs;
  };

  const allRefs = extractRefs(doc);
  for (const ref of allRefs) {
    if (!definedSchemas.has(ref)) {
      errors.push(`Referenced schema "${ref}" is not defined in components.schemas`);
    }
  }

  // 8. Critical auth runtime/OpenAPI coverage. Keep this sourced from the handler so a newly
  // added session, WebAuthn, or OIDC route cannot silently remain undocumented.
  const authRoutesSource = readFileSync(authRoutesSourcePath, 'utf-8');
  const runtimeAuthOperations = extractCriticalRuntimeAuthOperations(authRoutesSource);
  const documentedAuthOperations = extractCriticalOpenApiAuthOperations(doc);
  for (const operation of runtimeAuthOperations) {
    if (!documentedAuthOperations.has(operation)) {
      errors.push(`Critical runtime auth operation is missing from OpenAPI: ${operation}`);
    }
  }
  for (const operation of documentedAuthOperations) {
    if (!runtimeAuthOperations.has(operation)) {
      errors.push(`Critical OpenAPI auth operation has no runtime route: ${operation}`);
    }
  }

  // Summary
  const pathCount = Object.keys(doc.paths || {}).length;
  const tagCount = (doc.tags || []).length;
  const schemaCount = definedSchemas.size;

  console.log(`   Paths: ${pathCount} | Tags: ${tagCount} | Schemas: ${schemaCount}`);

  if (errors.length > 0) {
    console.error('\n❌ OpenAPI validation failed:');
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log('✅ All structural checks passed');
  process.exit(0);
} catch (err) {
  console.error('❌ Failed to parse OpenAPI spec:', err.message);
  process.exit(1);
}

#!/usr/bin/env node

import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, join, normalize as normalizePathname, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import parser from '@typescript-eslint/parser';
import { parse as parseYaml } from 'yaml';

import { isCriticalIntegrationTest } from './lib/critical-shard-classification.mjs';

const DEFAULT_POLICY_PATH = 'docs/engineering/test-skip-policy.json';
const DEFAULT_WORKFLOW_PATH = '.github/workflows/ci.yml';
const DEFAULT_MANIFEST_PATH = 'docs/engineering/critical-coverage-scope.json';
const TEST_FILE_PATTERN = /\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/;
const APPROVED_PROVISIONER_PATH = 'scripts/provision-private-coverage-binaries.sh';
const APPROVED_PROVISIONER_DOCKER_INVOCATION = [
  'docker', 'run', '--rm', '--interactive', '--volume', '${deb_dir}:/out',
  'ubuntu:22.04@sha256:829f6df217bcbae2b371026e81711d1a787c61b2967ad09d015063663ebafbf7',
  'bash', '-se', '<', APPROVED_PROVISIONER_PATH
];
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.gauntlet',
  'artifacts',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
  'tmp'
]);
const TEST_API_ROOTS = new Set(['test', 'it', 'describe', 'suite', 'fit', 'fdescribe', 'xit', 'xdescribe']);
const TEST_MODIFIERS = new Set(['skipIf', 'skip', 'todo', 'only']);
const TEST_FRAMEWORK_MODULES = new Set(['vitest', '@jest/globals', 'node:test']);
const DIRECT_TEST_API_MODIFIERS = new Map([
  ['xit', 'skip'],
  ['xdescribe', 'skip'],
  ['fit', 'only'],
  ['fdescribe', 'only']
]);

function normalizeExpression(expression) {
  return expression.replace(/\s+/g, ' ').trim();
}

function expressionName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const object = expressionName(node.object);
    const property = node.computed
      ? computedPropertyName(node.property)
      : node.property?.type === 'Identifier'
        ? node.property.name
        : null;
    return object && property ? `${object}.${property}` : null;
  }
  return null;
}

function isRequireFunction(node, requireAliases) {
  return (node?.type === 'Identifier' && requireAliases.has(node.name)) ||
    (node?.type === 'MemberExpression' && expressionName(node) === 'module.require');
}

function isTestFrameworkRequire(node, requireAliases) {
  return node?.type === 'CallExpression' &&
    isRequireFunction(node.callee, requireAliases) &&
    node.arguments.length === 1 && node.arguments[0]?.type === 'Literal' &&
    TEST_FRAMEWORK_MODULES.has(node.arguments[0].value);
}

function isTestFrameworkImport(node) {
  let expression = node;
  while (expression?.type === 'AwaitExpression') expression = expression.argument;
  if (expression?.type === 'ImportExpression') {
    const moduleName = staticPropertyName(expression.source) ?? computedPropertyName(expression.source);
    return TEST_FRAMEWORK_MODULES.has(moduleName);
  }
  if (expression?.type === 'CallExpression' && expression.callee?.type === 'Import') {
    const moduleName = staticPropertyName(expression.arguments[0]) ?? computedPropertyName(expression.arguments[0]);
    return TEST_FRAMEWORK_MODULES.has(moduleName);
  }
  return false;
}

function staticPropertyName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function computedPropertyName(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value?.cooked ?? null;
  return null;
}

function staticMemberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  return node.computed
    ? computedPropertyName(node.property)
    : node.property?.type === 'Identifier'
      ? node.property.name
      : null;
}

function testApiExpression(node, aliases, requireAliases) {
  if (isTestFrameworkRequire(node, requireAliases)) return '';
  if (node?.type === 'MemberExpression') {
    const object = testApiExpression(node.object, aliases, requireAliases);
    const property = staticMemberName(node);
    if (object !== null && property) return object ? `${object}.${property}` : property;
  }
  const name = expressionName(node);
  if (!name) return null;
  const [root, ...members] = name.split('.');
  const canonicalRoot = aliases.get(root);
  return canonicalRoot === undefined ? null : [canonicalRoot, ...members].filter(Boolean).join('.');
}

function isTestApiNamespace(node, aliases, requireAliases) {
  return testApiExpression(node, aliases, requireAliases) === '';
}

function testApiRoot(node, apiAliases, modifierAliases, requireAliases) {
  if (node?.type === 'CallExpression') {
    return testApiRoot(node.callee, apiAliases, modifierAliases, requireAliases);
  }
  if (node?.type === 'Identifier') {
    const modifier = modifierAliases.get(node.name);
    if (modifier) return modifier.callee.split('.')[0];
  }
  const api = testApiExpression(node, apiAliases, requireAliases);
  const root = api?.split('.')[0];
  return TEST_API_ROOTS.has(root) ? root : null;
}

function parseSkips(source, filePath) {
  const ast = parser.parse(source, {
    ecmaVersion: 'latest',
    ecmaFeatures: { jsx: true },
    filePath,
    loc: true,
    range: true,
    sourceType: 'module'
  });
  const findings = [];
  const apiAliases = new Map([...TEST_API_ROOTS].map((name) => [name, name]));
  const apiAliasBindings = new WeakSet();
  const modifierAliases = new Map();
  const modifierAliasBindings = new WeakSet();
  const requireAliases = new Set(['require']);
  const recordDynamicModifier = (callee, condition, line) => {
    if (findings.some((finding) =>
      finding.kind === 'dynamic-test-modifier' && finding.callee === callee &&
      finding.condition === condition && finding.line === line
    )) return;
    findings.push({ path: filePath, kind: 'dynamic-test-modifier', callee, condition, line });
  };

  const discoverAliases = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ImportDeclaration' && TEST_FRAMEWORK_MODULES.has(node.source?.value)) {
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportNamespaceSpecifier') {
          if (!apiAliases.has(specifier.local.name)) apiAliases.set(specifier.local.name, '');
          apiAliasBindings.add(specifier.local);
        } else if (specifier.type === 'ImportDefaultSpecifier') {
          if (!apiAliases.has(specifier.local.name)) apiAliases.set(specifier.local.name, 'test');
          apiAliasBindings.add(specifier.local);
        } else if (specifier.type === 'ImportSpecifier') {
          const imported = staticPropertyName(specifier.imported);
          if (TEST_API_ROOTS.has(imported) && !apiAliases.has(specifier.local.name)) {
            apiAliases.set(specifier.local.name, imported);
            apiAliasBindings.add(specifier.local);
          }
        }
      }
    }
    if (node.type === 'VariableDeclarator') {
      if (node.id?.type === 'Identifier') {
        if (isRequireFunction(node.init, requireAliases)) {
          requireAliases.add(node.id.name);
        }

        const initializerApi = isTestFrameworkRequire(node.init, requireAliases) || isTestFrameworkImport(node.init)
          ? ''
          : node.init?.type === 'Identifier'
            ? apiAliases.get(node.init.name)
            : undefined;
        if (initializerApi !== undefined && !apiAliases.has(node.id.name)) {
          apiAliases.set(node.id.name, initializerApi);
          apiAliasBindings.add(node.id);
        }

        const initializerModifier = node.init?.type === 'Identifier'
          ? modifierAliases.get(node.init.name)
          : null;
        if (initializerModifier) {
          const existingModifier = modifierAliases.get(node.id.name);
          if (!existingModifier) {
            modifierAliases.set(node.id.name, initializerModifier);
            modifierAliasBindings.add(node.id);
          } else if (existingModifier.kind !== initializerModifier.kind ||
            existingModifier.callee !== initializerModifier.callee
          ) {
            recordDynamicModifier(initializerModifier.callee || '<test-api-modifier>', node.id.name,
              node.id.loc?.start.line ?? 0);
          }
        }

        if (node.init?.type === 'MemberExpression') {
          const initializerApi = testApiExpression(node.init, apiAliases, requireAliases);
          if (initializerApi && TEST_API_ROOTS.has(initializerApi) && !apiAliases.has(node.id.name)) {
            apiAliases.set(node.id.name, initializerApi);
          }
          const api = testApiExpression(node.init.object, apiAliases, requireAliases);
          const modifier = staticMemberName(node.init);
          if (api && TEST_MODIFIERS.has(modifier)) {
            const initializerModifier = { kind: modifier, callee: api };
            const existingModifier = modifierAliases.get(node.id.name);
            if (!existingModifier) {
              modifierAliases.set(node.id.name, initializerModifier);
              modifierAliasBindings.add(node.id);
            } else if (existingModifier.kind !== modifier || existingModifier.callee !== api) {
              recordDynamicModifier(api, node.id.name, node.id.loc?.start.line ?? 0);
            }
          }
        }
      } else if (node.id?.type === 'ObjectPattern') {
        const frameworkImport = isTestFrameworkImport(node.init);
        const api = frameworkImport ? '' : testApiExpression(node.init, apiAliases, requireAliases);
        const namespace = isTestApiNamespace(node.init, apiAliases, requireAliases) ||
          isTestFrameworkRequire(node.init, requireAliases) || frameworkImport;
        if (api || namespace) {
          for (const property of node.id.properties) {
            if (property.type !== 'Property') {
              const line = property.loc?.start.line ?? 0;
              recordDynamicModifier(api || '<test-api-namespace>', '<rest-destructure>', line);
              continue;
            }
            const modifier = property.computed
              ? computedPropertyName(property.key)
              : staticPropertyName(property.key);
            if (property.computed && modifier === null) {
              const condition = property.key?.range
                ? normalizeExpression(source.slice(property.key.range[0], property.key.range[1]))
                : '<unknown>';
              const line = property.loc?.start.line ?? 0;
              recordDynamicModifier(api || '<test-api-namespace>', condition, line);
              continue;
            }
            const binding = property.value?.type === 'AssignmentPattern'
              ? property.value.left
              : property.value;
            const alias = binding?.type === 'Identifier' ? binding.name : null;
            if (namespace && alias && TEST_API_ROOTS.has(modifier)) {
              if (!apiAliases.has(alias)) apiAliases.set(alias, modifier);
              if (apiAliases.get(alias) === modifier) {
                apiAliasBindings.add(binding);
                modifierAliasBindings.add(binding);
                continue;
              }
              const line = binding?.loc?.start.line ?? property.loc?.start.line ?? 0;
              recordDynamicModifier(api || '<test-api-namespace>', alias, line);
              continue;
            }
            if (alias && TEST_MODIFIERS.has(modifier)) {
              const existingModifier = modifierAliases.get(alias);
              if (!existingModifier) {
                modifierAliases.set(alias, { kind: modifier, callee: api });
                modifierAliasBindings.add(binding);
              } else if (existingModifier.kind !== modifier || existingModifier.callee !== api) {
                const line = binding?.loc?.start.line ?? property.loc?.start.line ?? 0;
                recordDynamicModifier(api || '<test-api-namespace>', alias, line);
              }
            } else if (TEST_API_ROOTS.has(modifier) || TEST_MODIFIERS.has(modifier)) {
              const line = property.value?.loc?.start.line ?? property.loc?.start.line ?? 0;
              recordDynamicModifier(api || '<test-api-namespace>', '<unsupported-destructure>', line);
            }
          }
        }
      }
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) discoverAliases(child);
      } else if (value && typeof value === 'object' && value.type) {
        discoverAliases(value);
      }
    }
  };

  let aliasesChanged;
  do {
    const apiAliasCount = apiAliases.size;
    const modifierAliasCount = modifierAliases.size;
    const requireAliasCount = requireAliases.size;
    discoverAliases(ast);
    aliasesChanged = apiAliases.size !== apiAliasCount ||
      modifierAliases.size !== modifierAliasCount || requireAliases.size !== requireAliasCount;
  } while (aliasesChanged);

  const visit = (node, parent = null, grandparent = null) => {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'CallExpression') {
      const isMemberCall = node.callee?.type === 'MemberExpression';
      const objectName = isMemberCall
        ? expressionName(node.callee.object)
        : null;
      const canonicalObject = isMemberCall
        ? testApiExpression(node.callee.object, apiAliases, requireAliases)
        : null;
      const canonicalApi = testApiExpression(node.callee, apiAliases, requireAliases);
      const propertyName = isMemberCall ? staticMemberName(node.callee) : null;
      const identifierModifier = node.callee?.type === 'Identifier'
        ? modifierAliases.get(node.callee.name)
        : null;
      const directApiModifier = DIRECT_TEST_API_MODIFIERS.get(canonicalApi);
      const kind = identifierModifier?.kind ?? directApiModifier ?? (
        canonicalObject !== null && propertyName && TEST_MODIFIERS.has(propertyName)
          ? propertyName
          : isMemberCall && canonicalObject !== null && node.callee.computed && !propertyName &&
            (canonicalObject === '' || TEST_API_ROOTS.has(canonicalObject))
            ? 'dynamic-test-modifier'
            : null
      );
      if (kind) {
        const argument = node.arguments[0];
        findings.push({
          path: filePath,
          kind,
          callee: identifierModifier?.callee ?? canonicalObject ??
            (directApiModifier ? canonicalApi : objectName),
          condition: argument?.range
            ? normalizeExpression(source.slice(argument.range[0], argument.range[1]))
            : '<none>',
          line: node.loc?.start.line ?? 0
        });
      }

      const optionApi = testApiRoot(node.callee, apiAliases, modifierAliases, requireAliases);
      const optionArgument = node.arguments[1];
      if (['test', 'it', 'suite', 'describe'].includes(optionApi) && node.arguments.length >= 3) {
        if (optionArgument?.type === 'ObjectExpression') {
          for (const property of optionArgument.properties) {
            const ambiguous = property.type === 'SpreadElement' || (
              property.type === 'Property' && property.computed && computedPropertyName(property.key) === null
            );
            if (!ambiguous) continue;
            const expression = property.type === 'SpreadElement' ? property.argument : property.key;
            findings.push({
              path: filePath,
              kind: 'dynamic-option-key',
              callee: optionApi,
              condition: expression?.range
                ? normalizeExpression(source.slice(expression.range[0], expression.range[1]))
                : '<unknown>',
              line: property.loc?.start.line ?? node.loc?.start.line ?? 0
            });
          }
        } else if (optionArgument && optionArgument.type !== 'FunctionExpression' && optionArgument.type !== 'ArrowFunctionExpression' && optionArgument.type !== 'Literal') {
          findings.push({
            path: filePath,
            kind: 'dynamic-option-object',
            callee: optionApi,
            condition: optionArgument.range
              ? normalizeExpression(source.slice(optionArgument.range[0], optionArgument.range[1]))
              : '<unknown>',
            line: optionArgument.loc?.start.line ?? node.loc?.start.line ?? 0
          });
        }
      }
    }

    if (node.type === 'CallExpression' && isTestFrameworkRequire(node, requireAliases)) {
      const isFrameworkRequireBinding = parent?.type === 'VariableDeclarator' && parent.init === node &&
        (parent.id?.type === 'Identifier' || parent.id?.type === 'ObjectPattern');
      const isDirectFrameworkApiUse = parent?.type === 'MemberExpression' && parent.object === node;
      if (!isFrameworkRequireBinding && !isDirectFrameworkApiUse) {
        recordDynamicModifier(
          '<test-api-namespace>',
          'escaped dynamic framework require',
          node.loc?.start.line ?? 0
        );
      }
    }

    const isFrameworkImportBinding = parent?.type === 'VariableDeclarator' && parent.init === node &&
      (parent.id?.type === 'Identifier' || parent.id?.type === 'ObjectPattern');
    if (isTestFrameworkImport(node) && parent?.type !== 'AwaitExpression' && !isFrameworkImportBinding) {
      recordDynamicModifier(
        '<test-api-namespace>',
        'escaped dynamic framework import',
        node.loc?.start.line ?? 0
      );
    }

    if (node.type === 'MemberExpression') {
      const canonicalObject = testApiExpression(node.object, apiAliases, requireAliases);
      const propertyName = staticMemberName(node);
      const isDirectCall = parent?.type === 'CallExpression' && parent.callee === node;
      const isDirectAlias = parent?.type === 'VariableDeclarator' && parent.init === node &&
        parent.id?.type === 'Identifier' && modifierAliases.has(parent.id.name);
      if (canonicalObject !== null && (TEST_MODIFIERS.has(propertyName) ||
        (node.computed && !propertyName && (canonicalObject === '' || TEST_API_ROOTS.has(canonicalObject)))) &&
        !isDirectCall && !isDirectAlias
      ) {
        recordDynamicModifier(
          canonicalObject,
          node.range ? normalizeExpression(source.slice(node.range[0], node.range[1])) : '<unknown>',
          node.loc?.start.line ?? 0
        );
      }

      const canonicalApi = testApiExpression(node, apiAliases, requireAliases);
      const namespaceObject = testApiExpression(node.object, apiAliases, requireAliases) === '';
      const isApiRootAlias = canonicalApi === '' || (namespaceObject && TEST_API_ROOTS.has(canonicalApi));
      const isTrackedApiUse =
        (parent?.type === 'MemberExpression' && parent.object === node) ||
        (parent?.type === 'CallExpression' && parent.callee === node) ||
        (parent?.type === 'VariableDeclarator' && parent.init === node &&
          (parent.id?.type === 'Identifier' || parent.id?.type === 'ObjectPattern'));
      if (isApiRootAlias && !isTrackedApiUse) {
        recordDynamicModifier(
          canonicalApi || '<test-api-namespace>',
          `escaped API container ${normalizeExpression(source.slice(node.range[0], node.range[1]))}`,
          node.loc?.start.line ?? 0
        );
      }
    }

    if (node.type === 'Identifier' && apiAliases.get(node.name) === '' && !apiAliasBindings.has(node)) {
      const isBinding = parent?.type === 'VariableDeclarator' && parent.id === node;
      const isImportBinding = parent &&
        ['ImportSpecifier', 'ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(parent.type) &&
        parent.local === node;
      const isStaticPropertyKey = parent?.type === 'Property' && parent.key === node && !parent.computed;
      const isTrackedApiUse =
        (parent?.type === 'MemberExpression' && parent.object === node) ||
        (parent?.type === 'CallExpression' && parent.callee === node) ||
        (parent?.type === 'VariableDeclarator' && parent.init === node &&
          (parent.id?.type === 'Identifier' || parent.id?.type === 'ObjectPattern'));
      if (!isBinding && !isImportBinding && !isStaticPropertyKey && !isTrackedApiUse) {
        const api = apiAliases.get(node.name);
        recordDynamicModifier(
          api || '<test-api-namespace>',
          `escaped API alias ${node.name}`,
          node.loc?.start.line ?? 0
        );
      }
    }

    if (node.type === 'Identifier' && modifierAliases.has(node.name) &&
      !modifierAliasBindings.has(node) &&
      !(parent?.type === 'CallExpression' && parent.callee === node) &&
      !(parent?.type === 'VariableDeclarator' && parent.init === node)
    ) {
      const modifier = modifierAliases.get(node.name);
      recordDynamicModifier(
        modifier?.callee || '<test-api-modifier>',
        `escaped alias ${node.name}`,
        node.loc?.start.line ?? 0
      );
    }

    const optionName = node.computed
      ? computedPropertyName(node.key)
      : staticPropertyName(node.key);
    const isTestOptionsProperty = parent?.type === 'ObjectExpression' &&
      grandparent?.type === 'CallExpression' && grandparent.arguments?.[1] === parent &&
      ['test', 'it', 'suite', 'describe'].includes(
        testApiRoot(grandparent.callee, apiAliases, modifierAliases, requireAliases)
      );
    if (node.type === 'Property' && optionName === 'skip' && isTestOptionsProperty) {
      findings.push({
        path: filePath,
        kind: 'option',
        callee: null,
        condition: node.value?.range
          ? normalizeExpression(source.slice(node.value.range[0], node.value.range[1]))
          : '<none>',
        line: node.loc?.start.line ?? 0
      });
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) visit(child, node, parent);
      } else if (value && typeof value === 'object' && value.type) {
        visit(value, node, parent);
      }
    }
  };
  visit(ast);
  return findings;
}

function walkTestFiles(directory, files, discoveryErrors, root) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      discoveryErrors.push(`${relative(root, absolute).split('\\').join('/')} is a symbolic link`);
      continue;
    }
    if (entry.isDirectory()) {
      walkTestFiles(absolute, files, discoveryErrors, root);
    } else if (entry.isFile() && TEST_FILE_PATTERN.test(entry.name)) {
      files.push(absolute);
    }
  }
}

export function discoverTestFiles(root, discoveryErrors = []) {
  const files = [];
  const absoluteRoot = resolve(root);
  walkTestFiles(absoluteRoot, files, discoveryErrors, absoluteRoot);
  return files.sort();
}

export function collectTestSkips(root) {
  const findings = [];
  const parseErrors = [];
  for (const absolute of discoverTestFiles(root, parseErrors)) {
    const path = relative(resolve(root), absolute).split('\\').join('/');
    try {
      findings.push(...parseSkips(readFileSync(absolute, 'utf8'), path));
    } catch (error) {
      parseErrors.push(`${path}: ${error.message}`);
    }
  }
  return { findings, parseErrors };
}

function entryKey(entry) {
  return JSON.stringify([
    entry.path,
    entry.kind,
    entry.callee ?? null,
    entry.condition,
    entry.shard
  ]);
}

export function validateSkipAllowlist({ root, policy }) {
  const errors = [];
  const { findings, parseErrors } = collectTestSkips(root);
  errors.push(...parseErrors.map((error) => `test file parse failed: ${error}`));
  const entries = Array.isArray(policy?.allowlist) ? policy.allowlist : [];
  const entryKeys = new Set();

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      errors.push('allowlist entries must be objects');
      continue;
    }
    const key = entryKey(entry);
    if (entryKeys.has(key)) errors.push(`duplicate allowlist entry: ${key}`);
    entryKeys.add(key);
    if (!Number.isInteger(entry.count) || entry.count < 1)
      errors.push(`allowlist entry has invalid count: ${entry.path ?? '<unknown>'}`);
    if (typeof entry.path !== 'string' || typeof entry.condition !== 'string' || typeof entry.kind !== 'string')
      errors.push(`allowlist entry is missing path, kind or condition: ${key}`);
  }

  const match = (finding, entry) =>
    finding.path === entry.path &&
    finding.kind === entry.kind &&
    (entry.callee ?? null) === finding.callee &&
    finding.condition === entry.condition;

  for (const finding of findings) {
    if (finding.kind === 'only' || finding.kind === 'dynamic-test-modifier') {
      errors.push(`${finding.path}:${finding.line} forbidden ${finding.kind} test modifier`);
      continue;
    }
    if (finding.kind === 'dynamic-option-key' || finding.kind === 'dynamic-option-object') {
      errors.push(`${finding.path}:${finding.line} forbidden ${finding.kind} in test options`);
      continue;
    }
    const matches = entries.filter((entry) => match(finding, entry));
    if (matches.length !== 1) {
      errors.push(
        `${finding.path}:${finding.line} unapproved or ambiguous ${finding.kind} skip (${finding.condition})`
      );
    }
  }

  for (const entry of entries) {
    const observed = findings.filter((finding) => match(finding, entry)).length;
    if (observed !== entry.count) {
      errors.push(
        `${entry.path} expected ${entry.count} ${entry.kind} skip(s) for ${entry.condition}, observed ${observed}`
      );
    }
  }

  return { errors, findings };
}

function readJson(root, path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function workflowJobBlock(workflow, job) {
  return workflow?.jobs && Object.hasOwn(workflow.jobs, job)
    ? workflow.jobs[job]
    : null;
}

function shellCommentFreeLines(script) {
  const executableLines = [];
  const pendingHereDocs = [];
  let quote = null;
  let continuedLine = false;
  for (const sourceLine of script.split(/\r?\n/)) {
    if (pendingHereDocs.length > 0) {
      const hereDoc = pendingHereDocs[0];
      const candidateTerminator = hereDoc.stripTabs ? sourceLine.replace(/^\t+/, '') : sourceLine;
      if (candidateTerminator === hereDoc.delimiter) pendingHereDocs.shift();
      continuedLine = false;
      continue;
    }
    const startedInQuote = quote !== null;
    const joinedToPreviousLine = continuedLine;
    let startedQuoteClosingIndex = null;
    continuedLine = false;
    let escaped = false;
    let lineWithoutComment = sourceLine;
    let openingQuoteIndex = null;
    for (let index = 0; index < sourceLine.length; index += 1) {
      const character = sourceLine[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && quote !== "'") {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) {
          quote = null;
          if (startedInQuote && startedQuoteClosingIndex === null) startedQuoteClosingIndex = index;
        }
        continue;
      }
      if (character === "'" || character === '"' || character === '`') {
        quote = character;
        openingQuoteIndex ??= index;
        continue;
      }
      if (character === '#' && (index === 0 || /\s/.test(sourceLine[index - 1]))) {
        lineWithoutComment = sourceLine.slice(0, index);
        break;
      }
    }
    if (escaped && quote !== "'") continuedLine = true;
    const hereDocSource = quote !== null && openingQuoteIndex !== null
      ? sourceLine.slice(0, openingQuoteIndex)
      : lineWithoutComment;
    const hereDocLine = hereDocSource.trim();
    const hereDocPattern = /<<(-)?\s*(?:'([^']+)'|"([^"]+)"|([^\s;|&]+))/g;
    for (const match of hereDocLine.matchAll(hereDocPattern)) {
      pendingHereDocs.push({
        delimiter: match[2] ?? match[3] ?? match[4],
        stripTabs: Boolean(match[1])
      });
    }
    if (startedInQuote && startedQuoteClosingIndex === null) continue;
    if (startedInQuote) lineWithoutComment = lineWithoutComment.slice(startedQuoteClosingIndex + 1);
    if (joinedToPreviousLine) {
      if (executableLines.length === 0) continue;
      const previousIndex = executableLines.length - 1;
      const previousLine = executableLines[previousIndex];
      const continuedPrefix = previousLine.endsWith('\\')
        ? previousLine.slice(0, -1)
        : previousLine;
      executableLines[previousIndex] = (continuedPrefix + lineWithoutComment).trim();
      continue;
    }
    if (quote !== null && openingQuoteIndex !== null) {
      lineWithoutComment = sourceLine.slice(0, openingQuoteIndex);
    }
    const line = lineWithoutComment.trim();
    if (!line) continue;
    executableLines.push(line);
  }
  return executableLines;
}

function shellSyntaxText(line) {
  let quote = null;
  let escaped = false;
  let syntax = '';
  for (let lineIndex = 0; lineIndex < line.length; lineIndex += 1) {
    const character = line[lineIndex];
    if (escaped) {
      escaped = false;
      syntax += ' ';
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      syntax += ' ';
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      syntax += ' ';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      syntax += ' ';
      continue;
    }
    syntax += character;
  }
  return syntax;
}

function shellWords(line) {
  const words = [];
  let word = '';
  let quote = null;
  let escaped = false;
  let started = false;
  for (let lineIndex = 0; lineIndex < line.length; lineIndex += 1) {
    const character = line[lineIndex];
    if (escaped) {
      word += character;
      escaped = false;
      started = true;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      started = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else word += character;
      started = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      started = true;
      continue;
    }
    if (character === ';' || character === '|' || character === '&') {
      // `&>` is a redirection operator, not a command boundary. The other
      // shell list operators must remain visible so each command head is
      // checked independently (including commands after a same-line `;`).
      if (character === '&' && line[lineIndex + 1] === '>') {
        word += character;
        started = true;
        continue;
      }
      if (started) words.push(word);
      word = '';
      started = false;
      let operator = character;
      const next = line[lineIndex + 1];
      if ((character === '&' || character === '|') && next === character) {
        operator += next;
        lineIndex += 1;
      } else if (character === '|' && next === '&') {
        operator += next;
        lineIndex += 1;
      }
      words.push(operator);
      continue;
    }
    if (/\s/.test(character)) {
      if (started) words.push(word);
      word = '';
      started = false;
      continue;
    }
    word += character;
    started = true;
  }
  if (escaped) word += '\\';
  if (started) words.push(word);
  return words;
}

function shellCommandHead(words) {
  const controlWords = new Set(['if', 'then', 'else', 'elif', 'while', 'until', 'do', '!', '{', '}', '(', ')']);
  const separators = new Set([';', '&&', '||', '|', '|&', '&']);
  let index = 0;

  while (index < words.length) {
    while (separators.has(words[index])) index += 1;
    while (controlWords.has(words[index])) index += 1;
    while (index < words.length) {
      if (/^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(words[index] ?? '')) {
        index += 1;
        continue;
      }
      const redirection = words[index].match(/^(?:\d+)?(?:<<<|<<-?|>>|>|<|<>|>&|<&|&>>?)(.*)$/);
      if (redirection) {
        index += 1;
        if (!redirection[1]) {
          if (/^[<>]\(/.test(words[index] ?? '')) {
            let substitutionDepth = 0;
            let started = false;
            while (index < words.length) {
              for (const character of words[index]) {
                if (character === '(') {
                  substitutionDepth += 1;
                  started = true;
                } else if (character === ')' && started) {
                  substitutionDepth -= 1;
                }
              }
              index += 1;
              if (started && substitutionDepth <= 0) break;
            }
          } else {
            index += 1;
          }
        }
        continue;
      }
      break;
    }

    let wrapper = words[index];
    if (!wrapper) return null;
    if (wrapper === 'timeout') {
      index += 1;
      while (index < words.length && words[index].startsWith('-')) {
        const option = words[index++];
        if (['-k', '-s', '--kill-after', '--signal'].includes(option)) index += 1;
      }
      index += 1; // timeout's required duration
      continue;
    }
    if (wrapper === 'env') {
      index += 1;
      let opaqueCommandString = false;
      while (index < words.length && words[index].startsWith('-')) {
        const option = words[index++];
        if (['-u', '--unset', '-C', '--chdir'].includes(option)) index += 1;
        if (option === '-S' || option === '--split-string' || option.startsWith('--split-string=')) {
          opaqueCommandString = true;
          if (option === '-S' || option === '--split-string') index += 1;
        }
      }
      if (opaqueCommandString) return '<opaque-env-command>';
      while (/^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(words[index] ?? '')) index += 1;
      continue;
    }
    if (wrapper === 'nice') {
      index += 1;
      while (words[index]?.startsWith('-')) {
        const option = words[index++];
        if (option === '-n' || option === '--adjustment') index += 1;
      }
      continue;
    }
    if (wrapper === 'sudo') {
      index += 1;
      while (words[index]?.startsWith('-')) {
        const option = words[index++];
        if (['-u', '-g', '-h', '-p', '-C', '-T', '-R', '-D', '-r', '-t', '--user', '--group', '--host', '--prompt', '--close-from', '--command-timeout', '--chdir', '--role', '--type'].includes(option)) index += 1;
      }
      continue;
    }
    if (['xargs', 'parallel', 'busybox', 'setsid', 'coproc'].includes(wrapper)) {
      // These utilities can launch a command named in their arguments or
      // input stream. Treat them as opaque executors instead of trusting the
      // shell's top-level command word.
      return '<opaque-command-launcher>';
    }
    if (wrapper === 'exec') {
      index += 1;
      while (words[index]?.startsWith('-')) {
        const option = words[index++];
        if (option === '-a') index += 1;
      }
      continue;
    }
    if (['command', 'builtin', 'time', 'nohup'].includes(wrapper)) {
      index += 1;
      while ((wrapper === 'time' || wrapper === 'command') && words[index]?.startsWith('-')) index += 1;
      continue;
    }
    return wrapper;
  }
  return null;
}

function shellCommandWordGroups(lines) {
  return lines.flatMap((line, lineIndex) => {
    const words = shellWords(line);
    const groups = [];
    let command = [];
    let separatorBefore = null;
    const recordGroup = () => {
      if (command.length > 0) groups.push({ lineIndex, separatorBefore, words: command });
      command = [];
      separatorBefore = null;
    };
    for (const word of words) {
      if ([';', '&&', '||', '|', '|&', '&'].includes(word)) {
        recordGroup();
        separatorBefore = word;
      } else {
        command.push(word);
      }
    }
    recordGroup();
    return groups;
  });
}

function shellCommandHeadEntries(lines) {
  return shellCommandWordGroups(lines).flatMap(({ words, ...metadata }) => {
    const command = shellCommandHead(words);
    return command ? [{ ...metadata, command, words }] : [];
  });
}

function shellChangesWorkingDirectory(lines) {
  const directoryCommands = new Set(['cd', 'pushd', 'popd']);
  if (shellCommandHeadEntries(lines).some(({ command }) => directoryCommands.has(command))) return true;
  return lines.some((line) => shellSubstitutionBodies(line).some((body) =>
    body === null || shellChangesWorkingDirectory(body.split(/\r?\n/))
  ));
}

function shellSubstitutionClosingParen(text, openIndex) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  for (let index = openIndex + 1; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function shellSubstitutionBodies(line) {
  const bodies = [];
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote === "'") {
      if (character === "'") quote = null;
      continue;
    }
    if (character === '"' && quote === '"') {
      quote = null;
      continue;
    }
    if (quote === null && (character === "'" || character === '"')) {
      quote = character;
      continue;
    }

    if (character === '`') {
      let closingIndex = index + 1;
      let escapedBacktick = false;
      for (; closingIndex < line.length; closingIndex += 1) {
        if (escapedBacktick) {
          escapedBacktick = false;
          continue;
        }
        if (line[closingIndex] === '\\') {
          escapedBacktick = true;
          continue;
        }
        if (line[closingIndex] === '`') break;
      }
      if (closingIndex >= line.length) {
        bodies.push(null);
        break;
      }
      bodies.push(line.slice(index + 1, closingIndex));
      index = closingIndex;
      continue;
    }

    const commandSubstitution = character === '$' && line[index + 1] === '(' && line[index + 2] !== '(';
    const processSubstitution = quote === null && (character === '<' || character === '>') && line[index + 1] === '(';
    if (!commandSubstitution && !processSubstitution) continue;
    const openParenIndex = index + (commandSubstitution ? 1 : 1);
    const closingIndex = shellSubstitutionClosingParen(line, openParenIndex);
    if (closingIndex < 0) {
      bodies.push(null);
      break;
    }
    bodies.push(line.slice(openParenIndex + 1, closingIndex));
    index = closingIndex;
  }
  return bodies;
}

function shellHasDynamicCommandHead(lines, isAllowedDynamicHead = () => false) {
  for (const [lineIndex, line] of lines.entries()) {
    const hasDynamicHead = shellCommandHeadEntries([line]).some(({ command, words }) => {
      const hasBracketExpansion = !['[', '[['].includes(command) &&
        (command.includes('[') || command.includes(']'));
      const isDynamic = /[$`~{}]/.test(command) || hasBracketExpansion || /[*?]/.test(command) ||
        /[<>]\(/.test(command) || command === '<opaque-env-command>' ||
        command === '<opaque-command-launcher>';
      return isDynamic && !isAllowedDynamicHead(command, lineIndex, words);
    });
    if (hasDynamicHead) return true;
    const substitutions = shellSubstitutionBodies(line);
    if (substitutions.some((body) => body === null ||
      shellHasDynamicCommandHead(body.split(/\r?\n/)))) return true;
  }
  return false;
}

function shellRunsCodeFromGeneratedInput(
  lines,
  generatedPaths = new Set(),
  workingDirectory = '.',
  allowVerifiedDpkgExtractionLineIndexes = new Set()
) {
  if (shellChangesWorkingDirectory(lines)) return true;
  const approvedProvisionerPath = APPROVED_PROVISIONER_PATH;
  const approvedProvisionerDockerInvocation = APPROVED_PROVISIONER_DOCKER_INVOCATION;
  const interpreters = new Set([
    'bash', 'sh', 'dash', 'zsh', 'ash', 'node', 'bun', 'tsx', 'ts-node', 'vite-node',
    'python', 'python2', 'python3', 'ruby', 'perl', 'php', 'deno', 'pwsh', 'powershell'
  ]);
  const shellInterpreters = new Set(['bash', 'sh', 'dash', 'zsh', 'ash']);
  const opaqueFileMutationCommands = new Set([
    'ar', 'bsdtar', 'bzip2', 'bunzip2', 'cabextract', 'cpio', 'dpkg', 'dtrx', 'gzip', 'gtar', 'gunzip',
    'lha', 'patch', 'pax', 'rar', 'uncompress', 'unar', 'unpack', 'unrar', 'unxz', 'unzstd',
    'unzip', 'xz', 'zstd', '7z', '7za', '7zr', '7zz'
  ]);
  const approvedTarExtractions = [
    ['tar', '-xzf', '/tmp/${helm_archive}', '-C', '/tmp'],
    ['tar', '-xzf', '/tmp/${archive}', '-C', '/tmp']
  ];
  const approvedDpkgExtraction = ['dpkg-deb', '-x', '${deb}', '${runtime_root}'];
  const staticValues = new Map();
  const normalizePath = (value) => normalizePathname(value).replace(/^(?:\.\/)+/, '');
  const normalizedWorkingDirectory = normalizePath(workingDirectory);
  const resolveStaticPath = (value) => {
    let unresolved = false;
    let rootedAtWorkingDirectory = false;
    const resolved = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (_match, braced, bare) => {
        const variable = braced ?? bare;
        if (variable === 'PWD' && !staticValues.has(variable)) {
          rootedAtWorkingDirectory = true;
          return normalizedWorkingDirectory;
        }
        const replacement = staticValues.get(variable);
        if (replacement === undefined) {
          unresolved = true;
          return '';
        }
        return replacement;
      });
    if (unresolved || /[`*?\x5b\]]/.test(resolved)) return null;
    const normalized = normalizePath(resolved);
    if (isAbsolute(normalized) || rootedAtWorkingDirectory) return normalized;
    return normalizePath(join(normalizedWorkingDirectory, normalized));
  };
  const referencesProtectedProvisionerPath = (value) => {
    if (typeof value !== 'string') return false;
    const resolved = resolveStaticPath(value);
    const candidate = resolved ?? normalizePath(value);
    return candidate === approvedProvisionerPath ||
      candidate.endsWith(`/${approvedProvisionerPath}`);
  };
  const pathIsGenerated = (candidate) => [...generatedPaths].some((generatedPath) =>
    generatedPath === '.' || candidate === generatedPath ||
      candidate.startsWith(`${generatedPath.replace(/\/+$/, '')}/`)
  );
  const outputTargets = (words) => {
    const targets = [];
    for (let index = 0; index < words.length; index += 1) {
      const redirection = words[index].match(/^(?:\d+)?(?:&>>|&>|>>|>)(.*)$/);
      if (!redirection) continue;
      const target = redirection[1] || words[index + 1];
      if (!redirection[1]) index += 1;
      if (!target || target.startsWith('>(') || /^&(?:\d+|-)$/.test(target)) continue;
      targets.push(target);
    }
    return targets;
  };
  for (const group of shellCommandWordGroups(lines)) {
    const { lineIndex, words, separatorBefore } = group;
    const command = shellCommandHead(words);
    if (words.some((word) => /^TAR_OPTIONS(?:=|$)/.test(word))) return true;
    if (!command) {
      for (const word of words) {
        const assignment = word.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (assignment && !/[`*?\x5b\]]/.test(assignment[2]) &&
          !/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(assignment[2])) {
          staticValues.set(assignment[1], assignment[2]);
        }
      }
      continue;
    }

    if (opaqueFileMutationCommands.has(command)) return true;
    if (command === 'tar') {
      const isApprovedExtraction = approvedTarExtractions.some((approved) =>
        words.length === approved.length && words.every((word, index) => word === approved[index])
      );
      if (!isApprovedExtraction) return true;
      generatedPaths.add('/tmp');
    }
    if (command === 'dpkg-deb' && (
      !allowVerifiedDpkgExtractionLineIndexes.has(lineIndex) ||
      words.length !== approvedDpkgExtraction.length ||
      words.some((word, index) => word !== approvedDpkgExtraction[index])
    )) return true;
    if (command === 'git' && words.slice(words.indexOf(command) + 1).some((word) =>
      word === 'apply' || word === 'am'
    )) return true;

    const inputRedirect = words.find((word) => /^(?:\d+)?<(?!<)/.test(word));
    const inputTarget = inputRedirect
      ? inputRedirect.replace(/^(?:\d+)?</, '') || words[words.indexOf(inputRedirect) + 1]
      : undefined;
    const resolvedInputTarget = inputTarget === undefined ? null : resolveStaticPath(inputTarget);
    const hasNestedContainerInterpreter = ['docker', 'podman', 'nerdctl'].includes(command) &&
      words.some((word) => interpreters.has(word));
    const isApprovedProvisionerInput = resolvedInputTarget === approvedProvisionerPath &&
      words.length === approvedProvisionerDockerInvocation.length &&
      words.every((word, index) => word === approvedProvisionerDockerInvocation[index]);
    const referencesApprovedProvisioner = referencesProtectedProvisionerPath(inputTarget) ||
      words.some((word) => word.split('=').some((part) =>
        referencesProtectedProvisionerPath(part)
      )) || outputTargets(words).some((target) =>
        referencesProtectedProvisionerPath(target)
      );
    // This checked-in source is only valid as the exact pinned Docker/Bash stdin
    // command below. Reject any other workflow reference so in-place edits and
    // writer forms outside the generated-path tracker cannot replace its bytes.
    if (referencesApprovedProvisioner && !isApprovedProvisionerInput) return true;
    // A container launcher receives shell-level stdin redirections on the host,
    // even when the interpreter that consumes stdin is nested in its arguments.
    // Do not let the checked-in provisioner exception bless a path rewritten
    // earlier in this job, even when the write and container launch are in
    // separate run steps.
    if (resolvedInputTarget !== null && pathIsGenerated(resolvedInputTarget) &&
      (interpreters.has(command) || hasNestedContainerInterpreter)) return true;

    if (interpreters.has(command)) {
      if (separatorBefore === '|' || separatorBefore === '|&') return true;
      // The critical CI job deliberately runs this checked-in provisioner through
      // bash's stdin. Keep that fixed source valid while rejecting other stdin-fed
      // interpreters and shell code assembled into the command itself.
      if (!isApprovedProvisionerInput && words.some((word) =>
        /^-[A-Za-z]*s[A-Za-z]*$/.test(word) || word === '-' || word.startsWith('<')
      )) return true;

      const commandIndex = words.indexOf(command);
      const argumentsText = words.slice(commandIndex + 1);
      if (shellInterpreters.has(command) && argumentsText.some((argument) => {
        const scriptPath = resolveStaticPath(argument);
        return scriptPath !== null && pathIsGenerated(scriptPath);
      })) return true;
    }

    const resolvedCommand = resolveStaticPath(command);
    if (resolvedCommand !== null && pathIsGenerated(resolvedCommand)) return true;

    for (const target of outputTargets(words)) {
      const generatedPath = resolveStaticPath(target);
      if (generatedPath !== null) generatedPaths.add(generatedPath);
    }
    if (command === 'ln') {
      const commandIndex = words.indexOf(command);
      const operands = words.slice(commandIndex + 1).filter((word) =>
        word !== '--' && !word.startsWith('-')
      );
      const source = operands.length === 1 ? operands[0] : operands.at(-2);
      const rawDestination = operands.length === 1 ? null : operands.at(-1);
      const resolvedSource = source === undefined ? null : resolveStaticPath(source);
      const sourcePath = resolvedSource ?? source;
      const sourceName = sourcePath === undefined || sourcePath === null
        ? null
        : basename(sourcePath.replace(/\/+$/, ''));
      const destination = rawDestination === null
        ? sourceName
        : sourceName !== null && (rawDestination === '.' || rawDestination === './' || rawDestination.endsWith('/'))
          ? join(rawDestination, sourceName)
          : rawDestination;
      const generatedPath = destination === undefined || destination === null
        ? null
        : resolveStaticPath(destination);
      if (generatedPath !== null) generatedPaths.add(generatedPath);
    } else if (['cp', 'install', 'mv', 'rsync', 'sponge', 'tee', 'truncate'].includes(command)) {
      const commandIndex = words.indexOf(command);
      const destination = words.slice(commandIndex + 1).filter((word) =>
        word !== '--' && !word.startsWith('-')
      ).at(-1);
      const generatedPath = destination === undefined ? null : resolveStaticPath(destination);
      if (generatedPath !== null) generatedPaths.add(generatedPath);
    }
  }
  return false;
}

function shellUsesInlineCodeEvaluator(line) {
  const syntax = shellSyntaxText(line);
  const hasInterpreter = (name) => new RegExp(`\\b(?:${name})\\b`, 'i').test(syntax);
  const hasShortOption = (letter) => new RegExp(`(?:^|\\s)-[A-Za-z]*${letter}(?=\\s|$)`, 'i').test(syntax);
  const hasLongOption = (name) => new RegExp(`(?:^|\\s)--${name}(?:=|\\s|$)`, 'i').test(syntax);

  return (
    hasInterpreter('python(?:\\d+(?:\\.\\d+)*)?') && hasShortOption('c') ||
    hasInterpreter('node|bun|tsx|ts-node|vite-node') &&
      (hasShortOption('e') || hasShortOption('p') || hasLongOption('eval') || hasLongOption('print')) ||
    hasInterpreter('ruby|perl|lua|luajit|julia|rscript|groovy') && hasShortOption('e') ||
    hasInterpreter('php') && (hasShortOption('r') || hasLongOption('run')) ||
    hasInterpreter('bash|sh|dash|zsh|ash') && hasShortOption('c') ||
    hasInterpreter('pwsh|powershell') && /(?:^|\\s)-command(?:=|\\s|$)/i.test(syntax) ||
    hasInterpreter('deno') && /(?:^|\\s)eval(?:\\s|$)/i.test(syntax)
  );
}

function shellControlDepthBeforeLine(lines, lineIndex) {
  let depth = 0;
  for (const line of lines.slice(0, lineIndex)) {
    const syntax = shellSyntaxText(line).trim();
    const controlWords = syntax.match(/\b(?:if|fi|for|while|until|select|done|case|esac)\b/g) ?? [];
    for (const word of controlWords) {
      if (['if', 'for', 'while', 'until', 'select', 'case'].includes(word)) depth += 1;
      else depth = Math.max(0, depth - 1);
    }
    if (syntax === '{' || /^(?:function\s+)?[A-Za-z_][A-Za-z\d_]*(?:\s*\(\s*\))?\s*\{\s*$/.test(syntax)) {
      depth += 1;
    } else if (/^\}/.test(syntax)) {
      depth = Math.max(0, depth - 1);
    }
  }
  return depth;
}

function shellErrexitEnabledBeforeLine(lines, lineIndex) {
  let enabled = true;
  for (const line of lines.slice(0, lineIndex)) {
    const syntax = shellSyntaxText(line).trim();
    if (!/(?:^|\s)set(?:\s|$)/.test(syntax)) continue;
    const raw = line.trim();
    if (raw.includes('$')) {
      enabled = false;
      continue;
    }
    const setArguments = raw.replace(/^.*?\bset\s+/, '');
    const tokens = setArguments.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index].replace(/^['"]|['"]$/g, '');
      if (token === '+o' && tokens[index + 1]?.replace(/^['"]|['"]$/g, '') === 'errexit') {
        enabled = false;
        index += 1;
      } else if (token === '-o' && tokens[index + 1]?.replace(/^['"]|['"]$/g, '') === 'errexit') {
        enabled = true;
        index += 1;
      } else if (token.startsWith('+') && token.slice(1).includes('e')) {
        enabled = false;
      } else if (token.startsWith('-') && token.slice(1).includes('e')) {
        enabled = true;
      }
    }
  }
  return enabled;
}

function shellFunctionDefinitions(lines) {
  const functions = new Map();
  const redefinedNames = new Set();
  const addDefinition = (definition) => {
    if (functions.has(definition.name)) redefinedNames.add(definition.name);
    functions.set(definition.name, definition);
  };
  let active = null;
  let nestedBraceDepth = 0;
  for (const [index, line] of lines.entries()) {
    const syntax = shellSyntaxText(line).trim();
    if (active) {
      if (syntax === '{') nestedBraceDepth += 1;
      else if (/^\}/.test(syntax)) {
        if (nestedBraceDepth > 0) {
          nestedBraceDepth -= 1;
          active.bodyLines.push(line);
          active.lineIndexes.push(index);
        } else {
          active.lineIndexes.push(index);
          addDefinition(active);
          active = null;
        }
      } else {
        active.bodyLines.push(line);
        active.lineIndexes.push(index);
      }
      continue;
    }
    const inline = syntax.match(/^(?:function\s+)?([A-Za-z_][A-Za-z\d_]*)\s*(?:\(\s*\))?\s*\{\s*(.*?)\s*\}\s*;?$/);
    if (inline) {
      const openingBrace = line.indexOf('{');
      const closingBrace = line.lastIndexOf('}');
      const inlineBody = line.slice(openingBrace + 1, closingBrace).trim();
      addDefinition({
        name: inline[1],
        bodyLines: inlineBody ? [inlineBody] : [],
        lineIndexes: [index],
        startIndex: index
      });
      continue;
    }
    const declaration = syntax.match(/^(?:function\s+)?([A-Za-z_][A-Za-z\d_]*)\s*(?:\(\s*\))?\s*\{\s*$/);
    if (declaration) {
      active = {
        name: declaration[1],
        bodyLines: [],
        lineIndexes: [index],
        startIndex: index
      };
    }
  }
  if (active) addDefinition(active);
  functions.redefinedNames = redefinedNames;
  return functions;
}

function shellFunctionBodyLineIndexes(lines) {
  return new Set([...shellFunctionDefinitions(lines).values()].flatMap((definition) => definition.lineIndexes));
}

function shellLineHasDanglingControlOperator(line) {
  return /(?:&&|\|\||\|&|\||&)\s*$/.test(shellSyntaxText(line).trim());
}

function shellLineTransfersControl(line) {
  const syntax = shellSyntaxText(line).trim();
  const commandPrefix = '(?:^|[;&|]\\s*|\\b(?:then|else|do)\\s+|!\\s+)';
  const controlCommand = new RegExp(`${commandPrefix}(?:exit|return|eval|source|trap)\\b`).test(syntax) ||
    new RegExp(`${commandPrefix}\\.\\s+\\S+`).test(syntax);
  if (controlCommand) return true;
  if (!new RegExp(`${commandPrefix}exec\\b`).test(syntax)) return false;
  // This workflow uses exec only to redirect the current shell's output into
  // tee. Any other exec form can replace the shell and makes later gates
  // unreachable, so it is treated as a control transfer.
  return !/^exec\s+>\s*>\(tee\s+"[^"]+"\)\s+2>&1$/.test(line.trim());
}

function shellFunctionCallsBeforeLine(lines, lineIndex) {
  const definitions = shellFunctionDefinitions(lines);
  const commandPrefix = '(?:^|[;&|{}()]\\s*|\\b(?:if|then|else|elif|while|until|do)\\s+|!\\s+)';
  const canTransfer = new Set([...definitions.values()]
    .filter((definition) => definition.bodyLines.some((line) => {
      const syntax = shellSyntaxText(line).trim();
      return new RegExp(commandPrefix + '(?:exit|eval|exec|source|trap)\\b').test(syntax) ||
        new RegExp(commandPrefix + '\\.\\s+\\S+').test(syntax);
    }))
    .map((definition) => definition.name));
  let changed = true;
  while (changed) {
    changed = false;
    for (const definition of definitions.values()) {
      if (canTransfer.has(definition.name)) continue;
      if (definition.bodyLines.some((line) => [...canTransfer].some((name) => shellLineInvokesFunction(line, name)))) {
        canTransfer.add(definition.name);
        changed = true;
      }
    }
  }
  const functionLines = shellFunctionBodyLineIndexes(lines);
  for (let index = 0; index < lineIndex; index += 1) {
    if (functionLines.has(index)) continue;
    if ([...canTransfer].some((name) => shellLineInvokesFunction(lines[index], name))) return true;
  }
  return false;
}

function shellLineInvokesFunction(line, functionName) {
  const syntax = shellSyntaxText(line).trim();
  const commandPrefix = '(?:^|[;&|{}()]\\s*|\\b(?:if|then|else|elif|while|until|do)\\s+|!\\s+)';
  return new RegExp(commandPrefix + functionName + '\\b').test(syntax);
}

function shellFlowIsUnconditionalBeforeLine(lines, lineIndex) {
  if (lineIndex > 0 && shellLineHasDanglingControlOperator(lines[lineIndex - 1])) return false;
  const functionLines = shellFunctionBodyLineIndexes(lines);
  for (let index = 0; index < lineIndex; index += 1) {
    if (functionLines.has(index)) continue;
    if (shellLineTransfersControl(lines[index])) return false;
  }
  return !shellFunctionCallsBeforeLine(lines, lineIndex);
}

function shellScriptShadowsEcho(lines) {
  return shellScriptShadowsCommand(lines, 'echo');
}

function shellScriptShadowsCommand(lines, commandName) {
  return shellFunctionDefinitions(lines).has(commandName) || lines.some((line) => {
    const syntax = shellSyntaxText(line).trim();
    return /^(?:(?:builtin|command)\s+)?alias(?:\s|$)/.test(syntax);
  });
}

function shellScriptUsesDynamicExport(lines) {
  const dynamicAssignment = /(?:^|\s)(?:"[^"]*\$[^"\s]*=|'[^']*\$[^'\s]*=|\$\{?[A-Za-z_][A-Za-z0-9_]*\}?[^\s;&|=]*=)/;
  return lines.some((line) => {
    const syntax = shellSyntaxText(line);
    if (!/\b(?:export|declare|typeset)\b/.test(syntax)) return false;
    return dynamicAssignment.test(line);
  });
}

function shellScriptUsesExecutableHereDoc(lines) {
  const executable = /\b(?:bash|sh|dash|zsh|ash|node|bun|tsx|ts-node|vite-node|python(?:\d+(?:\.\d+)*)?|ruby|perl|php|deno|pwsh|powershell)\b/;
  return lines.some((line) => /<<-?(?:\s|$)/.test(shellSyntaxText(line)) && executable.test(shellSyntaxText(line)));
}

function shellScriptUsesSource(lines) {
  const commandPrefix = '(?:^|[;&|{}()]\\s*|\\b(?:if|then|else|elif|while|until|do)\\s+|!\\s+)';
  return lines.some((line) => {
    const syntax = shellSyntaxText(line).trim();
    return new RegExp(`${commandPrefix}source\\b`).test(syntax) ||
      new RegExp(`${commandPrefix}\\.\\s+`).test(syntax);
  });
}

function shellScriptUsesCaseCompound(lines) {
  return lines.some((line) => /\b(?:case|esac)\b/.test(shellSyntaxText(line)));
}

function shellScriptChangesCommandResolution(lines) {
  return shellVariableWasMutated(lines, 'PATH') ||
    shellFunctionsMutatingVariable(lines, 'PATH').size > 0 ||
    lines.some((line) => /\b(?:enable|hash)\b/.test(shellSyntaxText(line)));
}

function shellScriptUsesNameref(lines, originalScript = '') {
  const lineUsesNameref = (line) => {
    const syntax = shellSyntaxText(line);
    return /\b(?:declare|typeset|local)\b[^;&|]*?(?:^|\s)[+-][A-Za-z]*n[A-Za-z]*(?:\s|$)/.test(syntax);
  };
  const continuationLines = originalScript
    ? shellCommentFreeLines(originalScript.replace(/\\\r?\n[\t ]*/g, ' '))
    : [];
  return lines.some(lineUsesNameref) || continuationLines.some(lineUsesNameref);
}

function shellFunctionsMutatingVariable(lines, variable) {
  const definitions = shellFunctionDefinitions(lines);
  const mutatingFunctions = new Set([...definitions.values()]
    .filter((definition) => definition.bodyLines.some((line) => {
      const syntax = shellSyntaxText(line).trim();
      return shellVariableWasMutated([line], variable) &&
        !(variable === 'overall_status' && syntax === 'overall_status=1');
    }))
    .map((definition) => definition.name));
  let changed = true;
  while (changed) {
    changed = false;
    for (const definition of definitions.values()) {
      if (mutatingFunctions.has(definition.name)) continue;
      if (definition.bodyLines.some((line) =>
        [...mutatingFunctions].some((name) => shellLineInvokesFunction(line, name))
      )) {
        mutatingFunctions.add(definition.name);
        changed = true;
      }
    }
  }
  return mutatingFunctions;
}

function shellMutationArgumentWords(text) {
  const words = [];
  let word = '';
  let dynamic = false;
  let active = false;
  let quote = null;
  let escaped = false;
  const finishWord = () => {
    if (!active) return;
    words.push({ value: word, dynamic });
    word = '';
    dynamic = false;
    active = false;
  };

  for (const character of text) {
    if (escaped) {
      word += character;
      active = true;
      escaped = false;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = null;
      } else {
        word += character;
        if (quote === '"' && (character === '$' || character === '`')) dynamic = true;
      }
      active = true;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      active = true;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      active = true;
      continue;
    }
    if (/[;&|(){}<>]/.test(character)) {
      finishWord();
      break;
    }
    if (/\s/.test(character)) {
      finishWord();
      continue;
    }
    if (character === '$' || character === '`' || character === '*' || character === '?' ||
      character === '[' || character === ']'
    ) dynamic = true;
    word += character;
    active = true;
  }
  finishWord();
  return words;
}

function shellMutationCommandTargetsVariable(line, variable) {
  const syntax = shellSyntaxText(line);
  const commandPattern = /(?:^|[;&|{}()]\s*|\b(?:if|then|else|elif|while|until|do)\s+|!\s+)(?:(?:builtin|command)\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(unset|read|mapfile|readarray)\b/g;
  for (const match of syntax.matchAll(commandPattern)) {
    const commandOffset = match.index + match[0].lastIndexOf(match[1]);
    const afterCommand = syntax.slice(commandOffset + match[1].length);
    if (/^\s*\(\s*\)/.test(afterCommand)) continue;

    const command = match[1];
    const argumentsText = line.slice(commandOffset + command.length);
    const words = shellMutationArgumentWords(argumentsText);
    const targetWords = [];
    let options = true;

    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      if (options && word.value === '--') {
        options = false;
        continue;
      }
      if (command === 'unset') {
        if (options && /^-[A-Za-z]+$/.test(word.value)) continue;
        targetWords.push(word);
        continue;
      }
      if (options && /^-[A-Za-z]+$/.test(word.value)) {
        const option = word.value;
        if (command === 'read' && option === '-a') {
          const arrayTarget = words[index + 1];
          if (arrayTarget) targetWords.push(arrayTarget);
          index += 1;
        } else if (
          (command === 'read' && ['-d', '-i', '-n', '-N', '-p', '-t', '-u'].includes(option)) ||
          (command !== 'read' && ['-C', '-c', '-d', '-n', '-O', '-s', '-u'].includes(option))
        ) {
          index += 1;
        }
        continue;
      }
      targetWords.push(word);
    }

    if (targetWords.length === 0) {
      if ((command === 'read' && variable === 'REPLY') ||
        (command !== 'read' && variable === 'MAPFILE')
      ) return true;
    }
    if (targetWords.some((word) => word.dynamic || word.value === variable || word.value.startsWith(`${variable}[`))) {
      return true;
    }
  }
  return false;
}

function workflowShardHelperIsReal(lines, helperName, invocationLineIndex) {
  if (shellScriptUsesNameref(lines) || shellScriptChangesCommandResolution(lines) ||
    shellScriptShadowsCommand(lines, 'node') ||
    shellScriptShadowsCommand(lines, 'exit')
  ) return false;
  const functionDefinitions = shellFunctionDefinitions(lines);
  // Repeated definitions make a source-order call resolve differently from
  // the parser's final-definition view. Fail closed instead of guessing.
  if (functionDefinitions.redefinedNames.size > 0) return false;
  const definition = functionDefinitions.get(helperName);
  if (!definition) return false;
  const shardIsVitest = helperName === 'run_vitest_shard';
  const shardArgumentLineIndex = shardIsVitest
    ? definition.bodyLines.findIndex((line) => /^local\s+shard=["']?\$1["']?$/.test(line.trim()))
    : -1;
  if (shardIsVitest && (shardArgumentLineIndex !== 0 ||
    shellControlDepthBeforeLine(definition.bodyLines, shardArgumentLineIndex) !== 0 ||
    !shellFlowIsUnconditionalBeforeLine(definition.bodyLines, shardArgumentLineIndex)
  )) return false;
  const expectedRunner = helperName === 'run_vitest_shard'
    ? /^if\s+node\s+scripts\/run-critical-coverage-shard\.mjs\s+"\$\{shard\}";\s*then$/
    : /^if\s+node\s+scripts\/run-process-critical-coverage\.mjs;\s*then$/;
  const runnerLineIndex = definition.bodyLines.findIndex((line) => expectedRunner.test(line.trim()));
  if (runnerLineIndex < 0 || shellControlDepthBeforeLine(definition.bodyLines, runnerLineIndex) !== 0 ||
    !shellFlowIsUnconditionalBeforeLine(definition.bodyLines, runnerLineIndex) ||
    (shardIsVitest && (runnerLineIndex <= shardArgumentLineIndex ||
      shellVariableWasMutated(definition.bodyLines, 'shard', shardArgumentLineIndex + 1, runnerLineIndex)))
  ) return false;
  const expectedPromotion = shardIsVitest
    ? /^if\s+node\s+scripts\/promote-critical-shard\.mjs\s+--shard\s+"\$\{shard\}";\s*then$/
    : /^if\s+node\s+scripts\/promote-critical-shard\.mjs\s+--shard\s+critical-process;\s*then$/;
  const promotionLineIndex = definition.bodyLines.findIndex((line, index) =>
    index > runnerLineIndex && expectedPromotion.test(line.trim())
  );
  const runnerFailureBranchIndex = definition.bodyLines.findIndex((line, index) =>
    index > runnerLineIndex && line.trim() === 'else' &&
    shellControlDepthBeforeLine(definition.bodyLines, index) === 1
  );
  const promotionFailureBranchIndex = definition.bodyLines.findIndex((line, index) =>
    index > promotionLineIndex && line.trim() === 'else' &&
    shellControlDepthBeforeLine(definition.bodyLines, index) === 2
  );
  const failureStatusIndex = definition.bodyLines.findIndex((line, index) =>
    index > runnerFailureBranchIndex && /^overall_status=1$/.test(line.trim()) &&
    shellControlDepthBeforeLine(definition.bodyLines, index) === 1
  );
  const promotionFailureStatusIndex = definition.bodyLines.findIndex((line, index) =>
    index > promotionFailureBranchIndex && /^overall_status=1$/.test(line.trim()) &&
    shellControlDepthBeforeLine(definition.bodyLines, index) === 2
  );
  if (promotionLineIndex < 0 ||
    shellControlDepthBeforeLine(definition.bodyLines, promotionLineIndex) !== 1 ||
    promotionLineIndex >= runnerFailureBranchIndex || runnerFailureBranchIndex < 0 || failureStatusIndex < 0 ||
    promotionFailureBranchIndex < 0 || promotionFailureBranchIndex >= runnerFailureBranchIndex ||
    promotionFailureStatusIndex < 0
  ) return false;
  const aggregateExitIndex = lines.findIndex((line, index) =>
    index > invocationLineIndex && /^exit\s+["']?\$\{overall_status\}["']?$/.test(line.trim())
  );
  if (aggregateExitIndex >= 0 &&
    shellControlDepthBeforeLine(lines, aggregateExitIndex) === 0 &&
    shellFlowIsUnconditionalBeforeLine(lines, aggregateExitIndex)
  ) {
    const functionLines = shellFunctionBodyLineIndexes(lines);
    const initialStatusExists = lines.some((line, index) =>
      index < invocationLineIndex && !functionLines.has(index) && line.trim() === 'overall_status=0'
    );
    if (!initialStatusExists) return false;
    for (let index = invocationLineIndex + 1; index < aggregateExitIndex; index += 1) {
      if (functionLines.has(index)) continue;
      const syntax = shellSyntaxText(lines[index]).trim();
      if (shellVariableWasMutated([lines[index]], 'overall_status') && syntax !== 'overall_status=1') return false;
    }
    const resettingFunctions = shellFunctionsMutatingVariable(lines, 'overall_status');
    // A shard helper that calls another status mutator can erase its own
    // runner or promotion failure before returning to the aggregate exit.
    if (resettingFunctions.has(helperName)) return false;
    if ([...resettingFunctions].some((name) =>
      lines.slice(invocationLineIndex + 1, aggregateExitIndex).some((line) => shellLineInvokesFunction(line, name))
    )) return false;
    return true;
  }
  return false;
}

function shellVariableWasMutated(lines, variable, startIndex = 0, endIndex = lines.length) {
  const assignment = new RegExp(`\\b${variable}(?:\\[[^\\]]+\\])?\\s*(?:[+*/%&|^-]?=|\\+\\+|--)`);
  const loopBinding = new RegExp(`\\b(?:for|select)\\s+${variable}\\b`);
  const arithmeticMutation = new RegExp(`(?:\\+\\+|--)\\s*${variable}\\b|\\b${variable}\\b\\s*(?:\\+\\+|--)`);
  const printfTargetMutatesVariable = (line) => {
    if (!/\bprintf\s+-v\b/.test(shellSyntaxText(line))) return false;
    const targets = [...line.matchAll(/\bprintf\s+-v\s+(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g)];
    if (targets.length === 0) return true;
    return targets.some((match) => {
      const target = match[1] ?? match[2] ?? match[3] ?? '';
      return target === variable || target.includes('$');
    });
  };
  return lines.slice(startIndex, endIndex).some((line) => {
    const syntax = shellSyntaxText(line).trim();
    return assignment.test(syntax) || loopBinding.test(syntax) ||
      arithmeticMutation.test(syntax) || shellMutationCommandTargetsVariable(line, variable) ||
      printfTargetMutatesVariable(line);
  });
}

function hasShellControlOperator(text) {
  return /[;&|<>]/.test(shellSyntaxText(text));
}

function workflowGateIsUnconditional(job, step) {
  const continueOnError = (value) => value === undefined || value === false || (
    typeof value === 'string' && value.trim().toLowerCase() === 'false'
  );
  return !Object.hasOwn(job ?? {}, 'if') && !Object.hasOwn(step ?? {}, 'if') &&
    continueOnError(job?.['continue-on-error']) && continueOnError(step?.['continue-on-error']);
}

function shellGithubEnvWritesAreSafe(lines) {
  const exactEnvironmentValues = new Map([
    ['NATIVE_POSTGRES_BIN', '${pg_bin}'],
    ['NATIVE_POSTGRES_SHARE', '${pg_share}'],
    ['NATIVE_POSTGRES_LIB', '${runtime_lib}'],
    ['REDIS_SERVER_BIN', '${redis_server}'],
    ['REDIS_CLI_BIN', '${redis_cli}'],
    ['REDIS_SERVER_LIBRARY_PATH', '${runtime_lib}'],
    ['LD_LIBRARY_PATH', '${runtime_lib}']
  ]);
  const isEnvironmentEcho = (line) => {
    const match = line.match(/^\s*echo\s+"([A-Z_][A-Z0-9_]*)=([\s\S]*)"\s*$/);
    if (!match || ['BASH_ENV', 'TAR_OPTIONS'].includes(match[1])) return false;
    if (match[1] === 'PATH') return match[2] === '${PATH}:${pg_bin}:${runtime_root}/usr/bin';
    if (exactEnvironmentValues.has(match[1])) return match[2] === exactEnvironmentValues.get(match[1]);
    return true;
  };

  for (const [lineIndex, line] of lines.entries()) {
    if (!/\bGITHUB_ENV\b/.test(line)) continue;
    const directWrite = line.match(/^(\s*echo\s+["'][A-Z_][A-Z0-9_]*=[\s\S]*["'])\s*>>\s*["']?\$\{?GITHUB_ENV\}?['"]?\s*$/);
    if (directWrite) {
      if (!isEnvironmentEcho(directWrite[1])) return false;
      continue;
    }

    if (!/^\}\s*>>\s*["']?\$\{?GITHUB_ENV\}?['"]?\s*$/.test(line)) return false;
    let nestedGroupDepth = 0;
    let groupStart = -1;
    for (let index = lineIndex - 1; index >= 0; index -= 1) {
      const candidate = lines[index].trim();
      if (candidate === '}') nestedGroupDepth += 1;
      else if (candidate === '{') {
        if (nestedGroupDepth === 0) {
          groupStart = index;
          break;
        }
        nestedGroupDepth -= 1;
      }
    }
    const body = groupStart < 0 ? [] : lines.slice(groupStart + 1, lineIndex);
    if (!body.length || !body.every(isEnvironmentEcho)) return false;
  }
  return true;
}

function workflowHasVerifiedExecutableExport(workflow, job, {
  environmentName,
  sourceVariable,
  definition,
  requiredChecks,
  supportingAssignments
}) {
  const hasOverride = (env) => env && Object.hasOwn(env, environmentName);
  const hasRunnerTempOverride = (env) => env && Object.hasOwn(env, 'RUNNER_TEMP');
  if (hasOverride(workflow?.env) || hasOverride(job?.env) ||
    hasRunnerTempOverride(workflow?.env) || hasRunnerTempOverride(job?.env) ||
    (job?.steps ?? []).some((step) => hasOverride(step?.env) || hasRunnerTempOverride(step?.env))
  ) return null;

  const echoLine = 'echo "' + environmentName + '=${' + sourceVariable + '}"';
  const groupClose = /^\}\s*>>\s*["']?\$\{?GITHUB_ENV\}?['"]?\s*$/;
  for (const [stepIndex, step] of (job?.steps ?? []).entries()) {
    if (!workflowGateIsUnconditional(job, step) || !workflowStepHasIsolatedBashStartup(step) ||
      !workflowStepUsesSafeShell(workflow, job, step) ||
      Object.hasOwn(step?.env ?? {}, 'GITHUB_ENV') || typeof step?.run !== 'string'
    ) continue;
    const lines = shellCommentFreeLines(step.run);
    if (!shellGithubEnvWritesAreSafe(lines)) continue;
    const definitionIndex = lines.findIndex((line) => line.trim() === definition);
    const echoIndex = lines.findIndex((line) => line.trim() === echoLine);
    if (definitionIndex < 0 || echoIndex <= definitionIndex) continue;
    const supportingIndexes = supportingAssignments.map((support) => ({
      ...support,
      index: lines.findIndex((line) => line.trim() === support.assignment),
      checkIndexes: (support.requiredChecks ?? []).map((check) => lines.findIndex((line, index) =>
        index > lines.findIndex((candidate) => candidate.trim() === support.assignment) &&
        line.trim() === check
      ))
    }));
    if (supportingIndexes.some(({ index, beforeDefinition }) => index < 0 ||
      (beforeDefinition && index >= definitionIndex)
    )) continue;
    let groupStart = -1;
    let groupEnd = -1;
    for (let index = echoIndex + 1; index < lines.length; index += 1) {
      if (groupClose.test(lines[index].trim())) {
        groupEnd = index;
        break;
      }
    }
    for (let index = echoIndex - 1; index >= 0; index -= 1) {
      if (lines[index].trim() === '{') {
        groupStart = index;
        break;
      }
      if (groupClose.test(lines[index].trim())) break;
    }
    if (groupStart < definitionIndex || groupEnd < echoIndex ||
      supportingIndexes.some(({ index }) => index >= groupStart) ||
      !lines.slice(groupStart + 1, groupEnd).every((line) => {
        const environmentEcho = line.match(/^\s*echo\s+"([A-Z_][A-Z0-9_]*)=([\s\S]*)"\s*$/);
        return Boolean(environmentEcho);
      }) ||
      shellControlDepthBeforeLine(lines, groupStart) !== 0 ||
      !shellErrexitEnabledBeforeLine(lines, groupStart) ||
      !shellFlowIsUnconditionalBeforeLine(lines, groupStart) ||
      shellVariableWasMutated(lines, 'GITHUB_ENV', 0, groupStart) ||
      shellVariableWasMutated(lines, 'RUNNER_TEMP') ||
      shellFunctionsMutatingVariable(lines, 'RUNNER_TEMP').size > 0 ||
      shellVariableWasMutated(lines, sourceVariable, definitionIndex + 1, groupStart) ||
      shellFunctionsMutatingVariable(lines, sourceVariable).size > 0 ||
      supportingIndexes.some(({ variable, index }) =>
        shellVariableWasMutated(lines, variable, index + 1, groupStart) ||
        shellFunctionsMutatingVariable(lines, variable).size > 0
      )
    ) continue;

    const checkIndexes = requiredChecks.map((check) => lines.findIndex((line, index) =>
      index > definitionIndex && index < groupStart && line.trim() === check
    ));
    if (checkIndexes.some((index) => index < 0 ||
      shellControlDepthBeforeLine(lines, index) !== 0 ||
      !shellErrexitEnabledBeforeLine(lines, index) ||
      !shellFlowIsUnconditionalBeforeLine(lines, index)
    )) continue;
    if (supportingIndexes.some(({ checkIndexes: supportCheckIndexes }) =>
      supportCheckIndexes.some((index) => index < 0 ||
        index >= groupStart ||
        shellControlDepthBeforeLine(lines, index) !== 0 ||
        !shellErrexitEnabledBeforeLine(lines, index) ||
        !shellFlowIsUnconditionalBeforeLine(lines, index)
      )
    )) continue;

    return { step, stepIndex, lines, exportEndIndex: groupEnd };
  }
  return null;
}

function workflowHasVerifiedNativePostgresExport(workflow, job) {
  return workflowHasVerifiedExecutableExport(workflow, job, {
    environmentName: 'NATIVE_POSTGRES_BIN',
    sourceVariable: 'pg_bin',
    definition: 'pg_bin="$(find "${runtime_root}/usr/lib/postgresql" -type f -name initdb -printf \'%h\\n\' -quit)"',
    requiredChecks: [
      'test -n "${pg_bin}"',
      'test -x "${pg_bin}/initdb"',
      'test -x "${pg_bin}/postgres"',
      'test -x "${pg_bin}/pg_isready"'
    ],
    supportingAssignments: [
      {
        variable: 'deb_dir',
        assignment: 'deb_dir="${RUNNER_TEMP}/critical-coverage-debs"',
        beforeDefinition: true
      },
      {
        variable: 'runtime_root',
        assignment: 'runtime_root="${RUNNER_TEMP}/critical-coverage-runtime"',
        beforeDefinition: true
      },
      {
        variable: 'runtime_lib',
        assignment: 'runtime_lib="${runtime_root}/usr/lib/x86_64-linux-gnu"'
      },
      {
        variable: 'pg_share',
        assignment: 'pg_share="$(find "${runtime_root}/usr/share/postgresql" -type f -name postgres.bki -printf \'%h\\n\' -quit)"',
        requiredChecks: ['test -n "${pg_share}"', 'test -d "${pg_share}"']
      },
      {
        variable: 'redis_server',
        assignment: 'redis_server="${runtime_root}/usr/bin/redis-server"',
        requiredChecks: ['test -x "${redis_server}"']
      },
      {
        variable: 'redis_cli',
        assignment: 'redis_cli="${runtime_root}/usr/bin/redis-cli"',
        requiredChecks: ['test -x "${redis_cli}"']
      }
    ]
  });
}

function verifiedNativePostgresDpkgExtractionLineIndexes(nativePostgresExport) {
  const rejected = new Set();
  if (!nativePostgresExport) return rejected;

  const lines = nativePostgresExport.lines;
  const approvedExtractionBlock = [
    'mapfile -t packages < "${deb_dir}/package-manifest"',
    'test "${#packages[@]}" -eq 13',
    'for package in "${packages[@]}"; do',
    'deb="$(find "${deb_dir}" -maxdepth 1 -type f -name "${package}_*.deb" -print -quit)"',
    'test -n "${deb}"',
    'dpkg-deb -x "${deb}" "${runtime_root}"',
    'done'
  ];
  const matchingBlockStarts = lines.flatMap((line, lineIndex) =>
    approvedExtractionBlock.every((expected, offset) =>
      lines[lineIndex + offset]?.trim() === expected
    ) ? [lineIndex] : []
  );
  const debDirAssignments = lines.flatMap((line, lineIndex) =>
    line.trim() === 'deb_dir="${RUNNER_TEMP}/critical-coverage-debs"' ? [lineIndex] : []
  );
  const dockerCommands = shellCommandHeadEntries(lines).filter(({ command }) => command === 'docker');
  const dpkgCommands = shellCommandHeadEntries(lines).filter(({ command }) => command === 'dpkg-deb');

  if (matchingBlockStarts.length !== 1 || debDirAssignments.length !== 1 ||
    dockerCommands.length !== 1 || dpkgCommands.length !== 1
  ) return rejected;

  const blockStart = matchingBlockStarts[0];
  const extractionLineIndex = blockStart + approvedExtractionBlock.indexOf(
    'dpkg-deb -x "${deb}" "${runtime_root}"'
  );
  if (debDirAssignments[0] >= dockerCommands[0].lineIndex ||
    dockerCommands[0].lineIndex >= blockStart ||
    !dockerCommands[0].words.every((word, index) =>
      word === APPROVED_PROVISIONER_DOCKER_INVOCATION[index]
    ) ||
    dockerCommands[0].words.length !== APPROVED_PROVISIONER_DOCKER_INVOCATION.length ||
    dpkgCommands[0].lineIndex !== extractionLineIndex ||
    !dpkgCommands[0].words.every((word, index) =>
      word === ['dpkg-deb', '-x', '${deb}', '${runtime_root}'][index]
    ) || dpkgCommands[0].words.length !== 4
  ) return rejected;

  return new Set([extractionLineIndex]);
}

function workflowHasVerifiedRedisServerExport(workflow, job) {
  return workflowHasVerifiedExecutableExport(workflow, job, {
    environmentName: 'REDIS_SERVER_BIN',
    sourceVariable: 'redis_server',
    definition: 'redis_server="${runtime_root}/usr/bin/redis-server"',
    requiredChecks: ['test -x "${redis_server}"'],
    supportingAssignments: [{
      variable: 'runtime_root',
      assignment: 'runtime_root="${RUNNER_TEMP}/critical-coverage-runtime"',
      beforeDefinition: true
    }]
  });
}

function shellHasUnsafeVariableFileOutput(lines) {
  const shellWord = /"(?:\\.|[^"])*"|'[^']*'|\\.|[^\s;&|]+/g;
  const variableOutputRedirect = /(?<![<>=!])(?:\d+)?(?:&>>?|>>?)\s*((?:"(?:\\.|[^"])*"|'[^']*'|[^\s;&|])+)/g;
  const variableFileWriter = /\b(?:cp|mv|install|ln|sponge|truncate|rsync|patch|zip|tar|unzip|7z|7za|bsdtar|cpio|pax)\b([^;&|]*)/g;
  const variableTeeWriter = /\btee\b([^;&|]*)/g;
  const variableDdOutput = /\bdd\b[^;&|]*?\bof=("(?:\\.|[^"])*"|'[^']*'|[^\s;&|]+)/g;
  const variableOptionFileOutput = /\b(?:curl|wget|sort|shuf|iconv|base64|gpg)\b[^;&|]*?(?:--output(?:-document)?(?:=|\s+)|-[oO]\s*)("(?:\\.|[^"])*"|'[^']*'|[^\s;&|]+)/g;
  const variableGitLogOutput = /\bgit\s+log\b[^;&|]*?(?:--output(?:=|\s+)|-o\s*)("(?:\\.|[^"])*"|'[^']*'|[^\s;&|]+)/g;
  const variableInPlaceEdit = /\b(?:sed|perl)\b[^;&|]*?-i(?:[^\s;&|]*)?([^;&|]*)/g;
  const shellTargetHasUnquotedGlob = (target) => {
    let quote = null;
    let escaped = false;
    for (const character of target) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\' && quote !== '\'') {
        escaped = true;
        continue;
      }
      if (quote === '\'') {
        if (character === '\'') quote = null;
        continue;
      }
      if (character === '"') {
        quote = quote === '"' ? null : '"';
        continue;
      }
      if (character === '\'' && quote === null) {
        quote = '\'';
        continue;
      }
      if (quote === null && ['*', '?', '['].includes(character)) return true;
    }
    return false;
  };
  const shellTargetHasUnsafeVariableExpansion = (target, allowedVariables = []) => {
    if (shellTargetHasUnquotedGlob(target)) return true;
    const expansionText = target.replace(/'[^']*'/g, '');
    const expansions = [...expansionText.matchAll(/\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|\$(?:[@*#?0-9!-])|`|\$\(/g)];
    if (expansions.some((expansion) => expansion[0] === '`' || expansion[0] === '$(') || expansions.length > 1) {
      return true;
    }
    if (expansions.length !== 1) return false;
    const unquoted = expansionText.replace(/["']/g, '');
    if (!/^\$\{[^}]+\}$|^\$(?:[A-Za-z_][A-Za-z0-9_]*|[@*#?0-9!-])$/.test(unquoted)) return false;
    const bareVariable = unquoted.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$|^\$([A-Za-z_][A-Za-z0-9_]*)$/);
    const variable = bareVariable?.[1] ?? bareVariable?.[2];
    return variable === undefined || !allowedVariables.includes(variable);
  };
  const commandArgumentsHaveUnsafeVariableOutput = (line, commandPattern) =>
    [...line.matchAll(commandPattern)].some((match) =>
      [...(match[1] ?? '').matchAll(shellWord)].some((word) =>
        shellTargetHasUnsafeVariableExpansion(word[0])
      )
    );

  // Keep only the three reviewed read-only find commands in CI. Parsing shell
  // quoting/escaping or command substitutions here would leave equivalent
  // spellings of `-exec` outside the static writer checks.
  const approvedReadOnlyFindLines = new Set([
    'deb="$(find "${deb_dir}" -maxdepth 1 -type f -name "${package}_*.deb" -print -quit)"',
    'pg_bin="$(find "${runtime_root}/usr/lib/postgresql" -type f -name initdb -printf \'%h\\n\' -quit)"',
    'pg_share="$(find "${runtime_root}/usr/share/postgresql" -type f -name postgres.bki -printf \'%h\\n\' -quit)"'
  ]);
  const hasOpaqueFindExecution = (line) =>
    /\bfind\b/.test(shellWords(line).join(' ')) && !approvedReadOnlyFindLines.has(line.trim());

  return lines.some((line) => {
    const awkWritesFiles = /\b(?:awk|mawk|gawk|nawk|oawk|original-awk)\b/.test(shellSyntaxText(line)) &&
      (/\b(?:print|printf)\b[^;&|]*?(?:>>|>)\s*(?:[A-Za-z_"(])/.test(line) ||
        /\bsystem\s*\(/.test(line));
    const inPlaceEditsUnsafeOutput = [...line.matchAll(variableInPlaceEdit)].some((match) =>
      [...(match[1] ?? '').matchAll(shellWord)].some((word) =>
        shellTargetHasUnsafeVariableExpansion(word[0])
      )
    );
    return [...line.matchAll(variableOutputRedirect)].some((match) =>
      shellTargetHasUnsafeVariableExpansion(match[1], ['GITHUB_ENV', 'GITHUB_STEP_SUMMARY'])
    ) ||
      commandArgumentsHaveUnsafeVariableOutput(line, variableTeeWriter) ||
      commandArgumentsHaveUnsafeVariableOutput(line, variableFileWriter) ||
      [...line.matchAll(variableDdOutput)].some((match) => shellTargetHasUnsafeVariableExpansion(match[1])) ||
      [...line.matchAll(variableOptionFileOutput)].some((match) => shellTargetHasUnsafeVariableExpansion(match[1])) ||
      commandArgumentsHaveUnsafeVariableOutput(line, variableGitLogOutput) ||
      inPlaceEditsUnsafeOutput || awkWritesFiles || hasOpaqueFindExecution(line);
  });
}

function workflowStepHasIsolatedBashStartup(step) {
  return step?.env?.BASH_ENV === '/dev/null';
}

function workflowStepUsesSafeShell(workflow, job, step) {
  const hasStepShell = Object.hasOwn(step ?? {}, 'shell');
  const hasJobShell = Object.hasOwn(job?.defaults?.run ?? {}, 'shell');
  const hasWorkflowShell = Object.hasOwn(workflow?.defaults?.run ?? {}, 'shell');
  const effectiveShell = hasStepShell
    ? step.shell
    : hasJobShell
      ? job.defaults.run.shell
      : hasWorkflowShell
        ? workflow.defaults.run.shell
        : undefined;
  return effectiveShell === undefined || effectiveShell === 'bash';
}

function workflowHasUnsafeBashStartup(workflow, job) {
  const hasUnsafeBashEnv = (env) => env && Object.hasOwn(env, 'BASH_ENV') && env.BASH_ENV !== '/dev/null';
  const hasPathOverride = (env) => env && Object.hasOwn(env, 'PATH');
  const hasBashFunctionImport = (env) => env &&
    Object.keys(env).some((name) => name.startsWith('BASH_FUNC_'));
  const provenanceSensitiveEnvironment = new Set([
    'NATIVE_POSTGRES_BIN', 'NATIVE_POSTGRES_LIB', 'NATIVE_POSTGRES_SHARE',
    'REDIS_SERVER_BIN', 'REDIS_CLI_BIN', 'REDIS_SERVER_LIBRARY_PATH', 'LD_LIBRARY_PATH',
    'RUNNER_TEMP', 'TAR_OPTIONS'
  ]);
  const hasProvenanceSensitiveOverride = (env) => env &&
    [...provenanceSensitiveEnvironment].some((name) => Object.hasOwn(env, name));
  if (hasUnsafeBashEnv(workflow?.env) || hasUnsafeBashEnv(job?.env) ||
    hasBashFunctionImport(workflow?.env) || hasBashFunctionImport(job?.env) ||
    hasPathOverride(workflow?.env) || hasPathOverride(job?.env) ||
    hasProvenanceSensitiveOverride(workflow?.env) || hasProvenanceSensitiveOverride(job?.env) ||
    (job?.steps ?? []).some((step) => hasUnsafeBashEnv(step?.env) ||
      hasBashFunctionImport(step?.env) || hasPathOverride(step?.env) ||
      hasProvenanceSensitiveOverride(step?.env))) return true;

  const nativePostgresExport = workflowHasVerifiedNativePostgresExport(workflow, job);
  const redisServerExport = workflowHasVerifiedRedisServerExport(workflow, job);
  const generatedPaths = new Set();
  const workingDirectoryForStep = (step) => {
    for (const scope of [step, job?.defaults?.run, workflow?.defaults?.run]) {
      if (!scope || !Object.hasOwn(scope, 'working-directory')) continue;
      const workingDirectory = scope['working-directory'];
      if (typeof workingDirectory !== 'string' || workingDirectory.length === 0 ||
        /[$`*?\x5b\]\r\n]/.test(workingDirectory)) return null;
      return normalizePathname(workingDirectory);
    }
    return '.';
  };

  return (job?.steps ?? []).some((step) => {
    if (typeof step?.run !== 'string') return false;
    const workingDirectory = workingDirectoryForStep(step);
    if (workingDirectory === null) return true;
    const executableLines = shellCommentFreeLines(step.run);
    const nativePostgresHeads = shellCommandHeadEntries(executableLines)
      .filter(({ command }) => command.startsWith('${NATIVE_POSTGRES_BIN}/'));
    const nativePostgresVariableWasMutated = nativePostgresHeads.length > 0 &&
      shellVariableWasMutated(executableLines, 'NATIVE_POSTGRES_BIN');
    const nativeRuntimeHeads = shellCommandHeadEntries(executableLines).filter(({ command }) =>
      command.startsWith('${NATIVE_POSTGRES_BIN}/') ||
      command === '${pg_bin}/postgres' || command === '${redis_server}'
    );
    const shellCommandEntries = shellCommandHeadEntries(executableLines);
    const hasDockerCommand = shellCommandEntries.some(({ command }) => command === 'docker');
    const hasDpkgDebCommand = shellCommandEntries.some(({ command }) => command === 'dpkg-deb');
    const dpkgExtractionLineIndexes = nativePostgresExport?.step === step
      ? verifiedNativePostgresDpkgExtractionLineIndexes(nativePostgresExport)
      : new Set();
    const trustedLoaderAssignmentLines = new Set();
    const hasTrustedLoaderAssignment = (words, lineIndex) => {
      const assignments = words.filter((word) => /^LD_LIBRARY_PATH=/.test(word));
      if (assignments.length === 0) return true;
      if (assignments.length !== 1 || nativePostgresExport?.step !== step ||
        lineIndex <= nativePostgresExport.exportEndIndex ||
        assignments[0] !== 'LD_LIBRARY_PATH=${runtime_lib}') return false;
      trustedLoaderAssignmentLines.add(executableLines[lineIndex].trim());
      return true;
    };
    const isAllowedDynamicHead = (command, lineIndex, words) => {
      if (/^\$\{NATIVE_POSTGRES_BIN\}\/(?:initdb|postgres|pg_isready|pg_ctl)$/.test(command)) {
        return Boolean(nativePostgresExport) &&
          (job?.steps ?? []).indexOf(step) > nativePostgresExport.stepIndex &&
          !nativePostgresVariableWasMutated && hasTrustedLoaderAssignment(words, lineIndex);
      }
      if (command === '${pg_bin}/postgres' && nativePostgresExport?.step === step) {
        return lineIndex > nativePostgresExport.exportEndIndex &&
          !shellVariableWasMutated(nativePostgresExport.lines, 'pg_bin', nativePostgresExport.exportEndIndex + 1, lineIndex) &&
          hasTrustedLoaderAssignment(words, lineIndex);
      }
      const redisExport = nativePostgresExport?.step === step
        ? nativePostgresExport
        : redisServerExport?.step === step
          ? redisServerExport
          : null;
      if (command === '${redis_server}' && redisExport) {
        return lineIndex > redisExport.exportEndIndex &&
          !shellVariableWasMutated(redisExport.lines, 'redis_server', redisExport.exportEndIndex + 1, lineIndex) &&
          hasTrustedLoaderAssignment(words, lineIndex);
      }
      return false;
    };
    if (shellScriptUsesNameref(executableLines, step.run) ||
      shellScriptUsesSource(executableLines) ||
      shellScriptUsesExecutableHereDoc(executableLines) ||
      shellScriptUsesDynamicExport(executableLines) ||
      shellScriptShadowsCommand(executableLines, 'pnpm') ||
      (hasDockerCommand && (
        shellScriptShadowsCommand(executableLines, 'docker') ||
        shellScriptChangesCommandResolution(executableLines)
      )) ||
      (hasDpkgDebCommand && (
        shellScriptShadowsCommand(executableLines, 'dpkg-deb') ||
        shellScriptChangesCommandResolution(executableLines)
      )) ||
      shellRunsCodeFromGeneratedInput(
        executableLines,
        generatedPaths,
        workingDirectory,
        dpkgExtractionLineIndexes
      ) ||
      (nativePostgresExport?.step === step &&
      shellVariableWasMutated(executableLines, 'runtime_lib', nativePostgresExport.exportEndIndex + 1)) ||
      shellHasDynamicCommandHead(executableLines, isAllowedDynamicHead) ||
      (nativeRuntimeHeads.length > 0 && (
        shellFunctionsMutatingVariable(executableLines, 'LD_LIBRARY_PATH').size > 0 ||
        executableLines.some((line) => shellVariableWasMutated([line], 'LD_LIBRARY_PATH') &&
          !trustedLoaderAssignmentLines.has(line.trim()))
      ))
    ) return true;
    return executableLines.some((line) => {
      const syntax = shellSyntaxText(line);
      const listsEnvironment = /\b(?:printenv|env)\b/.test(syntax) ||
        /\b(?:declare|typeset)\s+-[A-Za-z]*p[A-Za-z]*(?:\s|$)/.test(syntax) ||
        /\bexport\s+-p(?:\s|$)/.test(syntax) ||
        /\bset\s*(?:[|>&;]|$)/.test(syntax);
      const awkWritesFiles = /\b(?:awk|mawk|gawk|nawk|oawk|original-awk)\b/.test(syntax) &&
        (/\b(?:print|printf)\b[^;&|]*?(?:>>|>)\s*[A-Za-z_][A-Za-z0-9_]*/.test(line) ||
          /\bsystem\s*\(/.test(line));
      const writesShellHistory = /\bhistory\b|\bfc\s+-[A-Za-z]*[WA](?:\s|$)/.test(syntax);
      return /\b(?:BASH_ENV|GITHUB_PATH)\b/.test(line) ||
        /\/proc\//.test(line) ||
        /\$\{\s*!/.test(line) ||
        /\b(?:eval|printf\s+-v)\b/.test(syntax) ||
        listsEnvironment || awkWritesFiles || writesShellHistory ||
        shellUsesInlineCodeEvaluator(line);
    }) ||
      shellHasUnsafeVariableFileOutput(executableLines) ||
      !shellGithubEnvWritesAreSafe(executableLines);
  });
}

function workflowExportsRedisServer(workflow, job) {
  if (workflowHasUnsafeBashStartup(workflow, job)) return false;
  const exportBlock = /\{\s*\n([\s\S]*?)\n\s*\}\s*>>\s*["']?\$\{GITHUB_ENV\}["']?/g;
  return (job.steps ?? []).some((step) => {
    if (!workflowGateIsUnconditional(job, step) || !workflowStepHasIsolatedBashStartup(step)) return false;
    if (!workflowStepUsesSafeShell(workflow, job, step)) return false;
    if (Object.hasOwn(workflow?.env ?? {}, 'GITHUB_ENV') ||
        Object.hasOwn(job.env ?? {}, 'GITHUB_ENV') || Object.hasOwn(step.env ?? {}, 'GITHUB_ENV')
    ) return false;
    if (typeof step?.run !== 'string') return false;
    const executableScript = shellCommentFreeLines(step.run).join('\n');
    const executableLines = executableScript.split('\n');
    if (shellScriptUsesNameref(executableLines, step.run) ||
      shellScriptChangesCommandResolution(executableLines) ||
      shellScriptShadowsEcho(executableLines)
    ) return false;
    for (const match of executableScript.matchAll(exportBlock)) {
      const lineIndex = executableScript.slice(0, match.index).split('\n').length - 1;
      const lineStart = executableScript.lastIndexOf('\n', match.index) + 1;
      const prefix = executableScript.slice(lineStart, match.index).trim();
      const suffixEnd = executableScript.indexOf('\n', match.index + match[0].length);
      const suffix = executableScript.slice(match.index + match[0].length, suffixEnd < 0 ? undefined : suffixEnd);
      const serverDefinitionIndex = executableLines.findIndex((line, index) =>
        index < lineIndex && line.trim() === 'redis_server="${runtime_root}/usr/bin/redis-server"'
      );
      const serverValidationIndex = executableLines.findIndex((line, index) =>
        index > serverDefinitionIndex && index < lineIndex && line.trim() === 'test -x "${redis_server}"'
      );
      const serverMutatingFunctionExists = shellFunctionsMutatingVariable(executableLines, 'redis_server').size > 0;
      if (prefix || hasShellControlOperator(suffix) ||
        shellScriptShadowsCommand(executableLines, 'test') ||
        shellScriptUsesCaseCompound(executableLines) ||
        shellControlDepthBeforeLine(executableLines, lineIndex) !== 0 ||
        !shellErrexitEnabledBeforeLine(executableLines, lineIndex) ||
        !shellFlowIsUnconditionalBeforeLine(executableLines, lineIndex) ||
        shellVariableWasMutated(executableLines, 'GITHUB_ENV', 0, lineIndex) ||
        serverDefinitionIndex < 0 || serverValidationIndex < 0 ||
        serverMutatingFunctionExists ||
        shellVariableWasMutated(executableLines, 'redis_server', serverValidationIndex + 1, lineIndex)
      ) continue;
      const bodyLines = shellCommentFreeLines(match[1]);
      if (bodyLines.some((line) => hasShellControlOperator(line) ||
        /^(?:if|then|else|elif|fi|for|while|until|select|case|esac)\b/.test(shellSyntaxText(line).trim())
      )) continue;
      const exportLineIndex = bodyLines.findIndex((line) =>
        /^echo\s+["']REDIS_SERVER_BIN=\$\{redis_server\}["']$/.test(line)
      );
      if (exportLineIndex >= 0 && shellFlowIsUnconditionalBeforeLine(bodyLines, exportLineIndex) &&
        !shellVariableWasMutated(bodyLines, 'redis_server', 0, exportLineIndex)
      ) return true;
    }
    return false;
  });
}

function containsWorkflowRun(workflow, job, requiredText) {
  if (workflowHasUnsafeBashStartup(workflow, job)) return false;
  const normalizedText = requiredText.replace(/^run:\s*/, '');
  if (normalizedText === 'REDIS_SERVER_BIN=${redis_server}') return workflowExportsRedisServer(workflow, job);
  if (!workflowGateIsUnconditional(job, {})) return false;
  return (job.steps ?? []).some((step) => {
    if (!workflowGateIsUnconditional(job, step) || !workflowStepHasIsolatedBashStartup(step)) return false;
    if (!workflowStepUsesSafeShell(workflow, job, step)) return false;
    if (typeof step?.run !== 'string') return false;
    const executableLines = shellCommentFreeLines(step.run);
    if (shellScriptUsesNameref(executableLines, step.run) ||
      shellScriptUsesCaseCompound(executableLines) ||
      shellScriptChangesCommandResolution(executableLines)
    ) return false;
    const requiredExecutable = normalizedText.match(/^(?:pnpm exec\s+)?([^\s]+)/)?.[1];
    if (requiredExecutable && !['run_vitest_shard', 'run_process_shard'].includes(requiredExecutable) &&
      shellScriptShadowsCommand(executableLines, requiredExecutable)
    ) return false;
    const helperName = normalizedText.match(/^(run_vitest_shard|run_process_shard)(?:\s|$)/)?.[1];
    return executableLines.some((line, lineIndex) => {
      if (helperName && !workflowShardHelperIsReal(executableLines, helperName, lineIndex)) return false;
      if (shellControlDepthBeforeLine(executableLines, lineIndex) !== 0 ||
        !shellErrexitEnabledBeforeLine(executableLines, lineIndex) ||
        !shellFlowIsUnconditionalBeforeLine(executableLines, lineIndex)
      ) return false;
      return ['', 'pnpm exec '].some((prefix) => {
      const command = `${prefix}${normalizedText}`;
      const matches = line === command || line.startsWith(`${command} `) || line.startsWith(`${command}\t`);
      return matches && !hasShellControlOperator(line.slice(command.length));
      });
    });
  });
}

function expectedYamlValues(value) {
  if (typeof value === 'string' && value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return [value.slice(1, -1)];
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) return [value, Number(value)];
  return [value];
}

function workflowHasEnv(job, name, expected) {
  const matches = (env) => env && Object.hasOwn(env, name) && expectedYamlValues(expected).includes(env[name]);
  if (matches(job.env)) return true;
  return (job.steps ?? []).some((step) => matches(step.env));
}

function safeRepositoryFile(root, filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) return false;
  const canonicalRoot = realpathSync(resolve(root));
  const absolute = resolve(canonicalRoot, filePath);
  const pathFromRoot = relative(canonicalRoot, absolute);
  if (pathFromRoot === '..' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) return false;
  const segments = pathFromRoot.split(sep).filter(Boolean);
  if (!segments.length) return false;
  let current = canonicalRoot;
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat || stat.isSymbolicLink()) return false;
    if (index < segments.length - 1 && !stat.isDirectory()) return false;
    if (index === segments.length - 1) return stat.isFile();
  }
  return false;
}

function validateRequiredShards({ root, policy, workflow, manifest, packageJson }) {
  const errors = [];
  const requiredShards = Array.isArray(policy?.requiredShards) ? policy.requiredShards : [];
  const shardIds = new Set();
  const manifestRequiredList = Array.isArray(manifest?.requiredShards) ? manifest.requiredShards : [];
  const manifestRequired = new Set(manifestRequiredList);
  const allEntries = Array.isArray(policy?.allowlist) ? policy.allowlist : [];

  if (!Array.isArray(manifest?.requiredShards)) {
    errors.push('critical manifest requiredShards must be an array');
  }

  for (const shard of requiredShards) {
    if (!shard || typeof shard !== 'object') {
      errors.push('requiredShards entries must be objects');
      continue;
    }
    if (shardIds.has(shard.id)) errors.push(`duplicate required shard: ${shard.id}`);
    shardIds.add(shard.id);
    const block = workflowJobBlock(workflow, shard.workflowJob);
    if (!block) {
      errors.push(`required shard ${shard.id} references missing CI job ${shard.workflowJob}`);
    } else {
      if (workflowHasUnsafeBashStartup(workflow, block)) {
        errors.push(`${shard.id} CI job sets an unsafe shell startup or command-resolution environment`);
      }
      for (const text of shard.requiredText ?? []) {
        const hasRequiredRedisService = text === 'services:\n      redis:' && Boolean(block.services?.redis);
        if (!hasRequiredRedisService && !containsWorkflowRun(workflow, block, text)) {
          errors.push(`${shard.id} CI job is missing executable step text: ${text}`);
        }
      }
      for (const [name, value] of Object.entries(shard.requiredEnv ?? {})) {
        if (!workflowHasEnv(block, name, value)) {
          errors.push(`${shard.id} CI job is missing environment ${name}: ${value}`);
        }
      }
    }

    const paths = Array.isArray(shard.paths) ? shard.paths : [];
    if (!paths.length) errors.push(`required shard ${shard.id} has no paths`);
    for (const path of paths) {
      if (!safeRepositoryFile(root, path)) {
        errors.push(`${shard.id} path is missing or traverses outside the repository/a symbolic link: ${path}`);
        continue;
      }
      const pathEntries = allEntries.filter((entry) => entry.path === path && entry.shard === shard.id);
      if (!pathEntries.length) errors.push(`${shard.id} path has no matching allowlist entry: ${path}`);

      if (shard.runner === 'vitest-integration') {
        if (!manifestRequired.has('vitest-integration'))
          errors.push('critical manifest does not require vitest-integration');
        if (!manifest.vitestTests?.includes(path)) errors.push(`vitest integration path is not frozen: ${path}`);
        if (!isCriticalIntegrationTest(path)) errors.push(`vitest integration path is not classified: ${path}`);
      } else if (shard.runner === 'critical-process') {
        if (!manifestRequired.has('critical-process'))
          errors.push('critical manifest does not require critical-process');
        if (!manifest.processTests?.includes(path)) errors.push(`process path is not frozen: ${path}`);
      } else if (shard.runner === 'vitest-postgresql-process-aux') {
        if (!path.startsWith('tests/integration/process/'))
          errors.push(`auxiliary PostgreSQL process path is outside the process tree: ${path}`);
      } else if (shard.runner === 'test:redis') {
        if (packageJson.scripts?.['test:redis'] !== 'node scripts/run-redis-rate-limiter-shard.mjs')
          errors.push('package.json test:redis does not use the mandatory Redis shard runner');
      }
    }
  }

  for (const manifestRunner of ['vitest-integration', 'critical-process']) {
    if (manifestRequired.has(manifestRunner) &&
      !requiredShards.some((shard) => shard?.runner === manifestRunner)) {
      errors.push(`critical manifest required shard ${manifestRunner} has no policy runner coverage`);
    }
  }

  if (packageJson.scripts?.['validate:test-skips'] !== 'node scripts/validate-test-skip-policy.mjs')
    errors.push('package.json validate:test-skips does not use the canonical validator');
  return errors;
}

export function validateSkipPolicy({
  root,
  policyPath = DEFAULT_POLICY_PATH,
  workflowPath = DEFAULT_WORKFLOW_PATH,
  manifestPath = DEFAULT_MANIFEST_PATH
}) {
  const policy = readJson(root, policyPath);
  const workflowSource = readFileSync(resolve(root, workflowPath), 'utf8');
  let workflow;
  let workflowParseError;
  try {
    workflow = parseYaml(workflowSource);
  } catch (error) {
    workflowParseError = error;
  }
  const manifest = readJson(root, manifestPath);
  const packageJson = readJson(root, 'package.json');
  const allowlist = validateSkipAllowlist({ root, policy });
  const errors = [
    ...(policy?.schemaVersion === 1 ? [] : ['test skip policy schemaVersion must be 1']),
    ...(policy?.unapprovedSkipAction === 'fail' ? [] : ['unapprovedSkipAction must be fail']),
    ...(workflowParseError ? [`CI workflow YAML failed to parse: ${workflowParseError.message}`] : []),
    ...allowlist.errors,
    ...validateRequiredShards({ root, policy, workflow, manifest, packageJson })
  ];
  return { errors, findings: allowlist.findings, policy };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const root = resolve(import.meta.dirname, '..');
  const result = validateSkipPolicy({ root });
  if (result.errors.length) {
    console.error('TEST_SKIP_POLICY FAIL');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`TEST_SKIP_POLICY PASS: ${result.findings.length} allowlisted skip occurrences`);
  }
}

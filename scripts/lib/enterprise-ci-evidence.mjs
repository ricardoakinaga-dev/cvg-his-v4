import { parse } from 'yaml';
import ts from 'typescript';

// Static scheduling evidence only: never load the config or execute a workflow.
export function inspectEnterpriseCi(ciText, configText, requiredSpecs) {
  const fail = () => ({ specs: requiredSpecs.map(() => false), blocking: false });
  let workflow;
  try { workflow = parse(ciText); } catch { return fail(); }
  const candidates = Object.values(workflow?.jobs ?? {}).flatMap((job) =>
    (job.steps ?? []).filter((step) => step.name === 'Run SPA E2E tests').map((step) => ({ job, step })));
  if (candidates.length !== 1) return fail();
  const { job, step } = candidates[0];
  const blocking = [job, step].every((item) => item['continue-on-error'] === undefined || item['continue-on-error'] === false);
  // Reject grep, projects, positional subsets, pipelines, list-only and shell
  // fallbacks. Only the current unfiltered invocation is recognized.
  const fullRun = typeof step.run === 'string' && step.run.split('\n').some((line) =>
    line.trim() === 'npx playwright test --config playwright-spa.config.ts');
  const source = ts.createSourceFile('playwright-spa.config.ts', configText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exports = source.statements.filter(ts.isExportAssignment);
  if (source.parseDiagnostics.length || exports.length !== 1) return fail();
  const call = exports[0].expression;
  if (!ts.isCallExpression(call) || call.expression.getText(source) !== 'defineConfig' || call.arguments.length !== 1 || !ts.isObjectLiteralExpression(call.arguments[0])) return fail();
  const props = new Map();
  for (const prop of call.arguments[0].properties) {
    if (!ts.isPropertyAssignment(prop) || (!ts.isIdentifier(prop.name) && !ts.isStringLiteral(prop.name))) return fail();
    const key = prop.name.text;
    if (props.has(key)) return fail();
    props.set(key, prop.initializer);
  }
  const dir = props.get('testDir');
  if (!dir || !ts.isStringLiteral(dir) || dir.text !== './e2e/spa' || ['testMatch', 'grep', 'grepInvert'].some((key) => props.has(key))) return fail();
  // Project-level filters can override the root. Reject them wherever declared
  // in this config instead of inferring execution from testDir alone.
  let nestedFilter = false;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.parent !== call.arguments[0] &&
        ['testDir', 'testMatch', 'testIgnore', 'grep', 'grepInvert'].includes(node.name.text)) nestedFilter = true;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (nestedFilter) return fail();
  // Conservatively examine every conditional branch, independent of CI env.
  // Recognize only basename exclusions; unknown expressions fail closed.
  function ignoredBasenames(node) {
    if (!node) return [];
    if (ts.isConditionalExpression(node)) {
      const a = ignoredBasenames(node.whenTrue), b = ignoredBasenames(node.whenFalse);
      return a && b ? [...a, ...b] : null;
    }
    if (!ts.isArrayLiteralExpression(node)) return null;
    const values = [];
    for (const item of node.elements) {
      if (!ts.isStringLiteral(item) || !/^\*\*\/[a-zA-Z0-9_.-]+$/.test(item.text)) return null;
      values.push(item.text.slice(3));
    }
    return values;
  }
  const ignored = ignoredBasenames(props.get('testIgnore'));
  return { blocking, specs: requiredSpecs.map((spec) => Boolean(fullRun && ignored && spec.startsWith('e2e/spa/') && !ignored.includes(spec.split('/').at(-1)))) };
}

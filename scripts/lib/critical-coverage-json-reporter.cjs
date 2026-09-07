'use strict';
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const { splitSourceLines } = require('./source-lines.cjs');
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { ReportBase } = coverageRequire('istanbul-lib-report');

// Istanbul's source-map remapper uses Infinity for an inclusive line end.
// JSON.stringify would turn it into null and lose that meaning. Resolve only
// this known sentinel while the in-memory value still distinguishes it from
// malformed/null input. Do not clamp other coordinates or change counters.
function canonicalizeLineEnds(coverage, source) {
  const lines = splitSourceLines(source);
  const copy = structuredClone(coverage);
  const sourceFile = ts.createSourceFile(coverage.path, source, ts.ScriptTarget.Latest, true);
  const implicitElseEnds = new Map();
  const implicitElseByEnd = new Map();
  const visit = (node) => {
    if (ts.isIfStatement(node) && !node.elseStatement) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      const end = sourceFile.getLineAndCharacterOfPosition(node.end);
      implicitElseEnds.set(`${start.line + 1}:${start.character}`, { line: end.line + 1, column: end.character });
      implicitElseByEnd.set(`${end.line + 1}:${end.character}`, { line: end.line + 1, column: end.character });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const location = (loc) => {
    if (loc?.end?.column === Infinity) {
      const line = loc.end.line;
      if (!Number.isSafeInteger(line) || line < 1 || line > lines.length) {
        throw new Error('Coverage line-end sentinel references nonexistent source line');
      }
      loc.end.column = lines[line - 1].length;
    }
  };
  for (const loc of Object.values(copy.statementMap)) location(loc);
  for (const fn of Object.values(copy.fnMap)) { location(fn.decl); location(fn.loc); }
  for (const branch of Object.values(copy.branchMap)) {
    location(branch.loc);
    for (const loc of branch.locations) location(loc);
    // An if without else still has a false-path counter. Istanbul represents
    // its absent syntax with empty coordinates. Anchor that path at the AST
    // statement end, retaining both counters and verifying the actual source.
    const end = implicitElseEnds.get(`${branch.loc?.start?.line}:${branch.loc?.start?.column}`)
      ?? implicitElseByEnd.get(`${branch.loc?.end?.line}:${branch.loc?.end?.column}`);
    const absent = branch.locations[1];
    const emptyPoint = (point) => point !== null && typeof point === 'object'
      && !Array.isArray(point)
      && Object.keys(point).every((key) => ['line', 'column'].includes(key) && point[key] === undefined);
    if (branch.type === 'if' && branch.locations.length === 2 && end && emptyPoint(absent?.start) && emptyPoint(absent?.end)) {
      branch.locations[1] = { start: { ...end }, end: { ...end } };
    }
  }
  return copy;
}

class CriticalCoverageJsonReporter extends ReportBase {
  onStart(_root, context) {
    this.writer = context.writer.writeFile('coverage-final.json');
    this.entries = {};
  }
  onDetail(node) {
    const coverage = node.getFileCoverage();
    this.entries[coverage.path] = canonicalizeLineEnds(coverage.toJSON(), readFileSync(coverage.path, 'utf8'));
  }
  onEnd() {
    this.writer.write(JSON.stringify(this.entries));
    this.writer.close();
  }
}
module.exports = CriticalCoverageJsonReporter;
module.exports.canonicalizeLineEnds = canonicalizeLineEnds;

// Coverage producers use more than one JavaScript instrumenter: Vitest
// instruments the source directly, while the native/process collectors map
// compiled JavaScript back to the same source.  A secondary report can
// therefore contain a zero-hit copy of an already-frozen source map with
// slightly different columns.  Counting that copy would count the same
// source function/branch twice and make the denominator depend on the order
// in which collectors happened to run.
//
// Raw reports are still validated in full by the caller.  This helper only
// removes zero-hit metric entries from a source that is already present in
// the canonical merge; the canonical source entry remains, including its
// zero counters.  Positive entries are never discarded.

const METRICS = Object.freeze([
  ['s', 'statementMap'],
  ['f', 'fnMap'],
  ['b', 'branchMap']
]);

function hasHit(value) {
  return Array.isArray(value) ? value.some((count) => count > 0) : value > 0;
}

/**
 * Removes only zero-hit entries from a secondary report.
 *
 * The returned report is a deep clone so the authenticated raw report held by
 * the caller is never mutated.  The counters/maps removed here were already
 * schema-validated; their source/path identity remains auditable in the raw
 * artifact and the returned summary exposes bounded aggregate diagnostics.
 */
export function stripSecondaryZeroHitMetrics(entry) {
  const normalized = structuredClone(entry);
  const removed = { statements: 0, functions: 0, branches: 0 };

  for (const [counterKey, mapKey] of METRICS) {
    for (const id of Object.keys(normalized[counterKey] ?? {})) {
      if (hasHit(normalized[counterKey][id])) continue;
      delete normalized[counterKey][id];
      delete normalized[mapKey][id];
      removed[
        counterKey === 's' ? 'statements' : counterKey === 'f' ? 'functions' : 'branches'
      ] += 1;
    }
  }

  return { entry: normalized, removed };
}

export function addCoverageMergeDiagnostics(target, source, removed) {
  target.sources += 1;
  target.statements += removed.statements;
  target.functions += removed.functions;
  target.branches += removed.branches;
  if (removed.statements || removed.functions || removed.branches) {
    target.samples ??= [];
    if (target.samples.length < 20)
      target.samples.push({ source, ...removed });
  }
  return target;
}

export function emptyCoverageMergeDiagnostics() {
  return { sources: 0, statements: 0, functions: 0, branches: 0, samples: [] };
}

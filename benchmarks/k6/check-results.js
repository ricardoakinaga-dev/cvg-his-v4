// The frozen benchmark assertions. Full paths disambiguate checks in groups
// and make a missing assertion visible even when aggregate counts reconcile.
export const EXPECTED_CHECK_PATHS = [
  '::Health::health returns 200',
  '::Health::health latency < 50ms',
  '::Owners - List::owners returns 200',
  '::Owners - List::owners has valid JSON',
  '::Patients - List::patients returns 200',
  '::Patients - Detail::patient detail returns 200',
  '::Staff - List::staff returns 200',
  '::Encounters - List::encounters returns 200',
  '::Scheduling - Appointments::appointments returns 200',
  '::Billing - Create Estimate::billing encounter lookup returns 200',
  '::Billing - Create Estimate::billing estimate returns 200',
  '::Inventory - List Items::inventory returns 200',
  '::Inventory - Create Item::inventory create returns 201',
  '::Medical Records - List Entries::medical records returns 200',
  '::OpenAPI - Spec::openapi returns 200',
  '::OpenAPI - Spec::openapi has paths'
];

export function extractChecks(rootGroup) {
  if (!rootGroup) return [];
  const checks = (rootGroup.checks ?? []).map(({ name, path, passes, fails }) => ({
    name,
    path,
    passes,
    fails
  }));
  for (const group of rootGroup.groups ?? []) checks.push(...extractChecks(group));
  return checks.sort((left, right) => left.path.localeCompare(right.path));
}

export function evaluateChecks(checks, aggregate) {
  const errors = [];
  const seen = new Set();
  const expected = new Set(EXPECTED_CHECK_PATHS);
  const validCount = (value) => Number.isSafeInteger(value) && value >= 0;
  let passes = 0;
  let fails = 0;

  if (!Array.isArray(checks) || checks.length === 0) {
    errors.push('Missing per-check evidence.');
  }
  for (const check of Array.isArray(checks) ? checks : []) {
    if (!check || !expected.has(check.path)) {
      errors.push(`Unknown check path: ${check?.path ?? '(missing)'}.`);
      continue;
    }
    if (seen.has(check.path)) errors.push(`Duplicate check path: ${check.path}.`);
    seen.add(check.path);
    if (check.name !== check.path.split('::').pop()) {
      errors.push(`Check name does not match path: ${check.path}.`);
    }
    if (!validCount(check.passes) || !validCount(check.fails)) {
      errors.push(`Invalid check counts: ${check.path}.`);
      continue;
    }
    if (check.passes + check.fails === 0) errors.push(`Unsampled check: ${check.path}.`);
    passes += check.passes;
    fails += check.fails;
  }
  for (const path of expected) {
    if (!seen.has(path)) errors.push(`Missing check: ${path}.`);
  }

  if (!aggregate || !validCount(aggregate.passes) || !validCount(aggregate.fails)) {
    errors.push('Missing or invalid aggregate check counts.');
  } else {
    const total = aggregate.passes + aggregate.fails;
    if (total === 0) errors.push('No aggregate check samples.');
    if (aggregate.passes !== passes || aggregate.fails !== fails) {
      errors.push('Per-check counts do not match aggregate check counts.');
    }
    if (
      !Number.isFinite(aggregate.rate) ||
      Math.abs(aggregate.rate - aggregate.passes / total) > 1e-12
    ) {
      errors.push('Aggregate check rate does not match raw counts.');
    }
  }
  const evidenceValid = errors.length === 0;
  return {
    passes,
    fails,
    total: passes + fails,
    evidenceValid,
    allPassed: evidenceValid && fails === 0,
    errors
  };
}

export function checkSummaryText(checks, aggregate, markdown = false) {
  const result = evaluateChecks(checks, aggregate);
  const lines = [markdown ? '### Individual checks' : 'Individual checks', ''];
  lines.push(
    `Aggregate: ${aggregate?.passes ?? 'missing'} passed, ${aggregate?.fails ?? 'missing'} failed.`
  );
  lines.push(`Attributed: ${result.passes} passed, ${result.fails} failed, ${result.total} total.`);
  lines.push(`Check gate: ${result.allPassed ? 'PASS' : 'FAIL'}`);
  for (const error of result.errors) lines.push(`Evidence error: ${error}`);
  lines.push('');
  if (markdown) lines.push('| Check path | Passed | Failed |', '| --- | ---: | ---: |');
  for (const check of Array.isArray(checks) ? checks : []) {
    if (markdown) {
      const path = String(check?.path ?? '(missing)')
        .replace(/\|/g, '\\|')
        .replace(/[\r\n]/g, ' ');
      lines.push(`| ${path} | ${check?.passes ?? 'missing'} | ${check?.fails ?? 'missing'} |`);
    } else {
      lines.push(
        `  ${check?.path ?? '(missing)'}: ${check?.passes ?? 'missing'} passed, ${check?.fails ?? 'missing'} failed`
      );
    }
  }
  return lines.join('\n') + '\n';
}

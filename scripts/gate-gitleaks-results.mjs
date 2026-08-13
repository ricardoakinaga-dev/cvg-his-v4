import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function validateFinding(finding, source) {
  if (!finding || typeof finding.Fingerprint !== 'string' || finding.Fingerprint.length === 0) {
    throw new Error(`${source} contains a finding without a fingerprint.`);
  }
}

function validateBaseline(baseline) {
  if (!Array.isArray(baseline)) {
    throw new Error('Gitleaks baseline must be a JSON array.');
  }

  const fingerprints = new Set();
  for (const entry of baseline) {
    if (!entry || typeof entry.fingerprint !== 'string' || entry.fingerprint.length === 0) {
      throw new Error('Gitleaks baseline entry is missing a fingerprint.');
    }
    if (typeof entry.classification !== 'string' || entry.classification.length < 5) {
      throw new Error(`Gitleaks baseline entry ${entry.fingerprint} is missing a classification.`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 20) {
      throw new Error(`Gitleaks baseline entry ${entry.fingerprint} is missing a review reason.`);
    }
    if (fingerprints.has(entry.fingerprint)) {
      throw new Error(`Gitleaks baseline contains duplicate fingerprint ${entry.fingerprint}.`);
    }
    fingerprints.add(entry.fingerprint);
  }
}

function summarizeFinding(finding) {
  return {
    fingerprint: finding.Fingerprint,
    ruleId: finding.RuleID ?? 'unknown-rule',
    file: finding.File ?? 'unknown-file',
    line: finding.StartLine ?? null
  };
}

export function evaluateGitleaksReports(historyFindings, workingTreeFindings, baseline) {
  if (!Array.isArray(historyFindings) || !Array.isArray(workingTreeFindings)) {
    throw new Error('Gitleaks history and working-tree reports must be JSON arrays.');
  }
  historyFindings.forEach((finding) => validateFinding(finding, 'History report'));
  workingTreeFindings.forEach((finding) => validateFinding(finding, 'Working-tree report'));
  validateBaseline(baseline);

  const approved = new Set(baseline.map((entry) => entry.fingerprint));
  const observedHistory = new Set(historyFindings.map((finding) => finding.Fingerprint));
  const newHistorical = historyFindings
    .filter((finding) => !approved.has(finding.Fingerprint))
    .map(summarizeFinding);
  const staleBaseline = baseline
    .filter((entry) => !observedHistory.has(entry.fingerprint))
    .map((entry) => ({
      fingerprint: entry.fingerprint,
      classification: entry.classification,
      reason: entry.reason
    }));
  const workingTree = workingTreeFindings.map(summarizeFinding);
  const reviewedHistoricalFindings = historyFindings.length - newHistorical.length;
  const status =
    newHistorical.length === 0 && workingTree.length === 0 && staleBaseline.length === 0
      ? 'PASS'
      : 'FAIL';

  return {
    status,
    historicalFindings: historyFindings.length,
    reviewedHistoricalFindings,
    newHistoricalFindings: newHistorical.length,
    workingTreeFindings: workingTree.length,
    staleBaselineEntries: staleBaseline.length,
    newHistorical,
    workingTree,
    staleBaseline
  };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    values.set(key.slice(2), argv[index + 1]);
    index += 1;
  }
  return values;
}

function readJsonArray(path, label) {
  const parsed = JSON.parse(readFileSync(resolve(path), 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${label} must contain a JSON array.`);
  return parsed;
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const historyPath = args.get('history');
  const workingTreePath = args.get('working-tree');
  const baselinePath = args.get('baseline');
  const reportPath = args.get('report');

  try {
    if (!historyPath || !workingTreePath || !baselinePath) {
      throw new Error('--history, --working-tree and --baseline are required.');
    }
    const evaluation = evaluateGitleaksReports(
      readJsonArray(historyPath, 'History report'),
      readJsonArray(workingTreePath, 'Working-tree report'),
      readJsonArray(baselinePath, 'Baseline')
    );
    const report = {
      generatedAt: new Date().toISOString(),
      history: historyPath,
      workingTree: workingTreePath,
      baseline: baselinePath,
      ...evaluation
    };
    if (reportPath) {
      const absolute = resolve(reportPath);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
    }
    console.log(
      `Gitleaks gate ${evaluation.status}: ${evaluation.workingTreeFindings} current, ` +
        `${evaluation.newHistoricalFindings} new historical, ` +
        `${evaluation.reviewedHistoricalFindings} reviewed historical findings.`
    );
    return evaluation.status === 'PASS' ? 0 : 1;
  } catch (error) {
    console.error(`Gitleaks gate FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(runCli());
}

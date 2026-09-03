#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const [
  resultsPath = 'playwright-report/usability/results.json',
  auditPath = 'tmp/master-usability-audit.json'
] = process.argv.slice(2);
const expectedTests = Number(process.env.E2E_EXPECTED_TESTS ?? 404);

function fail(message) {
  console.error(`Usability evidence invalid: ${message}`);
  process.exitCode = 1;
}

try {
  const results = JSON.parse(await readFile(resultsPath, 'utf8'));
  const stats = results.stats ?? {};
  const executed =
    Number(stats.expected ?? 0) + Number(stats.unexpected ?? 0) + Number(stats.flaky ?? 0);
  if (!Number.isInteger(expectedTests) || expectedTests <= 0) {
    fail(`invalid E2E_EXPECTED_TESTS value: ${process.env.E2E_EXPECTED_TESTS}`);
  } else if (executed !== expectedTests) {
    fail(`${executed} tests were accounted for; expected exactly ${expectedTests}`);
  }
  if (Number(stats.skipped ?? 0) !== 0) fail(`${stats.skipped} test(s) were skipped`);
  if (Number(stats.unexpected ?? 0) !== 0) fail(`${stats.unexpected} test(s) failed unexpectedly`);

  const audit = JSON.parse(await readFile(auditPath, 'utf8'));
  if (audit.routeCount !== 143)
    fail(`master audit contains ${audit.routeCount} routes instead of 143`);
  if (audit.navigationCount !== 286 || audit.records?.length !== 286) {
    fail(`master audit contains ${audit.records?.length ?? 0}/286 navigation records`);
  }
  const failedRecords = (audit.records ?? []).filter((record) => record.status !== 'passed');
  if (failedRecords.length > 0) fail(`${failedRecords.length} master audit record(s) failed`);
  if (process.env.GITHUB_SHA && audit.metadata?.sha !== process.env.GITHUB_SHA) {
    fail(`audit SHA ${audit.metadata?.sha ?? 'missing'} differs from ${process.env.GITHUB_SHA}`);
  }

  if (!process.exitCode) {
    console.log(
      `Usability evidence valid: ${executed} tests, ${audit.navigationCount} route navigations, SHA ${audit.metadata?.sha}.`
    );
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

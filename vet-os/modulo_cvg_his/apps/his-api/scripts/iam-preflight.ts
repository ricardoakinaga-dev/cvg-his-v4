#!/usr/bin/env -S node --import tsx

import { formatValidationReport, validatePreflightEnv } from '../src/lib/iamOps.js';

const includeWeb = process.env.IAM_SKIP_WEB_CHECKS !== '1';
const result = validatePreflightEnv(process.env, { includeWeb });

console.log(formatValidationReport('IAM preflight', result));

if (!result.ok) {
  process.exitCode = 1;
}

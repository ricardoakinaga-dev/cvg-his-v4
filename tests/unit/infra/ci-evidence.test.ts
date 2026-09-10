import { describe, expect, it } from 'vitest';

import {
  REQUIRED_CI_JOB_NAMES,
  verifyCiRun,
} from '../../../scripts/generate-ci-evidence.mjs';

describe('CI evidence producer', () => {
  it('requires the exact successful main CI run and every blocking job', () => {
    const commitSha = 'a'.repeat(40);
    const run = {
      id: 123,
      name: 'CI',
      event: 'push',
      head_branch: 'main',
      head_sha: commitSha,
      status: 'completed',
      conclusion: 'success',
    };
    const jobs = REQUIRED_CI_JOB_NAMES.map((name) => ({
      name,
      status: 'completed',
      conclusion: 'success',
    }));

    expect(verifyCiRun({ run, jobs, commitSha, runId: '123' }).valid).toBe(true);
    expect(
      verifyCiRun({
        run,
        jobs: jobs.slice(0, -1),
        commitSha,
        runId: '123',
      }).missing
    ).toContain('Visual Regression');
  });
});

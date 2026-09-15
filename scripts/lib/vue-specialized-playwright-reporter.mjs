import { writeFileSync } from 'node:fs';

/**
 * Minimal Playwright reporter used by the specialized evidence producer.
 * Playwright itself owns the status; this reporter only serializes the
 * observed result and never manufactures a passing test.
 */
export default class VueSpecializedPlaywrightReporter {
  #tests = [];

  onTestEnd(test, result) {
    this.#tests.push({
      file: test.location?.file,
      title: test.titlePath?.().join(' › ') || test.title,
      status: result.status,
      errors: result.errors?.length ?? 0
    });
  }

  onEnd(fullResult) {
    const tests = this.#tests;
    const stats = {
      expected: tests.filter((test) => test.status === 'passed').length,
      unexpected: tests.filter((test) =>
        ['failed', 'timedOut', 'interrupted'].includes(test.status)
      ).length,
      skipped: tests.filter((test) => test.status === 'skipped').length,
      flaky: tests.filter((test) => test.status === 'flaky').length
    };
    const outputPath = process.env.CVG_VUE_SPECIALIZED_PLAYWRIGHT_RESULT?.trim();
    if (!outputPath) throw new Error('CVG_VUE_SPECIALIZED_PLAYWRIGHT_RESULT is required');
    writeFileSync(
      outputPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          kind: 'vue-specialized-playwright-result',
          status: fullResult.status,
          stats,
          tests
        },
        null,
        2
      )}\n`
    );
  }
}

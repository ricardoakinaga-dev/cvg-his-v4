// Native runner observation only. The parent must bind this to the frozen
// inventory, exit status, source maps and raw coverage before certifying a shard.
export async function collectNativeTestEvidence(events) {
  const summaries = [];
  const files = [];
  let failedEvents = 0;
  for await (const event of events) {
    if (event.type === 'test:fail') failedEvents++;
    if (event.type !== 'test:summary') continue;
    const { file, success, counts } = event.data;
    const summary = { success, counts };
    if (typeof file === 'string') files.push({ file, ...summary });
    else summaries.push(summary);
  }
  const errors = [];
  if (summaries.length !== 1) errors.push('expected exactly one final summary');
  if (failedEvents) errors.push('test failure events observed');
  const validate = ({ success, counts }) => {
    if (success !== true) errors.push('runner summary is not successful');
    const fields = ['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo', 'suites', 'topLevel'];
    if (!counts || fields.some((key) => !Number.isSafeInteger(counts[key]) || counts[key] < 0)) {
      errors.push('invalid summary counts');
      return;
    }
    if (!counts.tests || counts.passed !== counts.tests) errors.push('no tests or incomplete test results');
    if (!counts.topLevel || counts.topLevel > counts.tests + counts.suites) errors.push('invalid top-level test count');
    if (['failed', 'cancelled', 'skipped', 'todo'].some((key) => counts[key] !== 0)) errors.push('failed or unexecuted tests');
  };
  for (const summary of [...summaries, ...files]) validate(summary);
  if (!files.length) errors.push('missing isolated file summaries');
  if (new Set(files.map(({ file }) => file)).size !== files.length) errors.push('duplicate file summaries');
  if (summaries.length === 1 && files.length) {
    for (const key of ['tests', 'passed', 'failed', 'cancelled', 'skipped', 'todo', 'suites', 'topLevel']) {
      const total = files.reduce((sum, file) => sum + (file.counts?.[key] ?? NaN), 0);
      if (!Number.isSafeInteger(total) || total !== summaries[0].counts?.[key]) errors.push(`file/global count mismatch: ${key}`);
    }
  }
  return { schemaVersion: 1, kind: 'native-test-observation', status: errors.length ? 'failed' : 'passed', errors, summary: summaries[0] ?? null, files };
}

export default async function* nativeTestEvidenceReporter(events) {
  yield JSON.stringify(await collectNativeTestEvidence(events)) + '\n';
}

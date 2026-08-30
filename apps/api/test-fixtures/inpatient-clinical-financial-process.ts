/**
 * Test-only launcher for the real API entrypoint used by the composed
 * clinical-financial process boundary. Keeping a named fixture makes the
 * integration proof explicit: the PID being killed owns the API listener and
 * its database pool, rather than an in-process test runtime.
 */
if (
  process.env.INPATIENT_CLINICAL_FINANCIAL_PROCESS_FIXTURE !== '1' ||
  process.env.NODE_ENV !== 'test'
) {
  throw new Error(
    'inpatient clinical-financial process fixture requires NODE_ENV=test and INPATIENT_CLINICAL_FINANCIAL_PROCESS_FIXTURE=1'
  );
}

await import('../src/index.js');

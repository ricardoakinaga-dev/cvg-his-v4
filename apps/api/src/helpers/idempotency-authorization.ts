function isPixPaymentAttemptCreate(pathname: string, method: string | undefined): boolean {
  return method === 'POST' && /^\/encounters\/[^/]+\/payments\/pix-attempts$/.test(pathname);
}

export function isDischargeMutationPath(pathname: string, method: string | undefined): boolean {
  return (
    (method === 'POST' && pathname === '/discharges') ||
    (method === 'PATCH' && pathname.startsWith('/discharges/'))
  );
}

export function isInpatientMutationPath(pathname: string, method: string | undefined): boolean {
  return Boolean(
    method &&
    !['GET', 'HEAD', 'OPTIONS'].includes(method) &&
    (pathname === '/inpatient' || pathname.startsWith('/inpatient/'))
  );
}

export function isPrescriptionExecutionMutationPath(
  pathname: string,
  method: string | undefined
): boolean {
  return (
    method === 'POST' &&
    (pathname === '/prescription-executions' || pathname.startsWith('/prescription-executions/'))
  );
}

export function isMedicalRecordsMutationPath(pathname: string, method: string | undefined): boolean {
  return (
    (method === 'POST' && pathname === '/medical-records/entries') ||
    (method === 'PATCH' && pathname.startsWith('/medical-records/entries/')) ||
    (method === 'DELETE' && pathname.startsWith('/medical-records/entries/')) ||
    (method === 'POST' && pathname === '/attachments') ||
    (method === 'POST' &&
      (pathname === '/laboratory/orders' ||
        pathname === '/laboratory/exams' ||
        pathname === '/laboratorio/exames' ||
        pathname === '/laboratorio/atendimentos/exames' ||
        pathname === '/diagnostics/orders' ||
        pathname === '/exam-orders' ||
        /^\/encounters\/[^/]+\/exam-orders$/.test(pathname) ||
        /^\/(?:laboratory|diagnostics)\/orders\/[^/]+\/result$/.test(pathname) ||
        /^\/laboratory\/orders\/[^/]+\/(?:recollect|deliver)$/.test(pathname))) ||
    (method === 'PATCH' && pathname.startsWith('/exam-results/'))
  );
}

/**
 * The generic tenant command envelope can replay a completed response before
 * dispatching the route. Critical clinical routes therefore repeat their
 * route-level authorization inside the transaction, before the idempotency
 * lookup. Unmapped routes retain tenant and actor binding until their own
 * permission contract is added here.
 */
export function idempotencyAuthorizationPermissions(
  pathname: string,
  method: string | undefined
): readonly string[] | undefined {
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return undefined;
  if (isPixPaymentAttemptCreate(pathname, method)) return ['billing.manage'];
  if (isPrescriptionExecutionMutationPath(pathname, method)) {
    return ['prescription-executions.manage'];
  }
  if (pathname.startsWith('/payments/')) return ['payments.manage'];
  if (isDischargeMutationPath(pathname, method)) return ['discharges.manage'];
  if (
    isInpatientMutationPath(pathname, method) ||
    pathname === '/sectors' ||
    pathname.startsWith('/beds/') ||
    pathname === '/beds' ||
    pathname === '/boxes-de-internacao' ||
    pathname.startsWith('/boxes-de-internacao/') ||
    pathname === '/box-internacao' ||
    pathname.startsWith('/box-internacao/')
  ) {
    return ['inpatient.manage'];
  }
  if (pathname.startsWith('/access-control/')) return ['users.manage'];
  if (pathname === '/medical-records/entries' || pathname.startsWith('/medical-records/entries/')) {
    return ['medical-records.manage'];
  }
  if (pathname === '/attachments' || pathname.startsWith('/attachments/')) {
    return ['attachments.manage'];
  }
  if (
    pathname.startsWith('/laboratory/') ||
    pathname.startsWith('/laboratorio/') ||
    pathname.startsWith('/diagnostics/') ||
    pathname.startsWith('/exam-orders') ||
    pathname.startsWith('/exam-results')
  ) {
    return ['diagnostics.manage'];
  }
  if (pathname === '/triage' || pathname.startsWith('/triage/')) return ['triage.manage'];
  if (/\/payments(?:\/|$)/.test(pathname) || /\/financial(?:\/|$)/.test(pathname)) {
    return ['billing.manage'];
  }
  if (pathname === '/clinical-handoffs' || pathname.startsWith('/clinical-handoffs/')) {
    return ['encounters.manage'];
  }
  if (/^\/encounters\/[^/]+\/exam-orders$/.test(pathname)) {
    return ['diagnostics.manage'];
  }
  if (pathname === '/encounters' || pathname.startsWith('/encounters/')) {
    return ['encounters.manage'];
  }
  if (pathname === '/patients' || pathname.startsWith('/patients/')) return ['patients.manage'];
  if (pathname === '/owners' || pathname.startsWith('/owners/')) return ['owners.manage'];
  if (pathname === '/prescriptions' || pathname.startsWith('/prescriptions/')) {
    return ['prescriptions.write'];
  }
  if (pathname === '/surgery' || pathname.startsWith('/surgery/')) return ['surgery.manage'];
  if (pathname === '/discharges' || pathname.startsWith('/discharges/')) {
    return ['discharges.manage'];
  }
  if (
    pathname.startsWith('/billing/') ||
    pathname.startsWith('/financial/') ||
    pathname.startsWith('/cash/') ||
    pathname.startsWith('/advance-payments/') ||
    pathname.startsWith('/expenses-catalog/')
  ) {
    return ['billing.manage'];
  }
  if (pathname.startsWith('/scheduling/') || pathname.startsWith('/agenda-config/')) {
    return ['scheduling.manage'];
  }
  if (pathname === '/vetus-imports' || pathname.startsWith('/vetus-import')) {
    return ['patients.manage', 'owners.manage'];
  }
  return undefined;
}

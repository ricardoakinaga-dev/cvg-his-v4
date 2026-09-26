/**
 * Normalize HTTP methods and request paths before writing telemetry.
 * Dynamic path segments can contain patient, account, or attachment IDs.
 */
const KNOWN_HTTP_METHODS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'CONNECT',
  'TRACE'
]);

/** Keep request-method telemetry to the finite HTTP vocabulary. */
export function normalizeHttpMethod(method: string | undefined): string {
  if (typeof method !== 'string') return 'OTHER';
  const normalized = method.trim().toUpperCase();
  return KNOWN_HTTP_METHODS.has(normalized) ? normalized : 'OTHER';
}

export function normalizeRoute(pathname: string): string {
  const routePatterns: [RegExp, string][] = [
    [/^\/auth\/login\/mfa$/, '/auth/login/mfa'],
    [/^\/auth\/login$/, '/auth/login'],
    [/^\/auth\/refresh$/, '/auth/refresh'],
    [/^\/auth\/logout$/, '/auth/logout'],
    [/^\/auth\/mfa\/setup$/, '/auth/mfa/setup'],
    [/^\/auth\/mfa\/confirm$/, '/auth/mfa/confirm'],
    [/^\/auth\/mfa\/status$/, '/auth/mfa/status'],
    [/^\/auth\/mfa\/disable$/, '/auth/mfa/disable'],
    [/^\/auth\/mfa\/recovery-codes$/, '/auth/mfa/recovery-codes'],
    [/^\/auth\/me$/, '/auth/me'],
    [/^\/auth\/sessions$/, '/auth/sessions'],
    [/^\/lgpd\/consent$/, '/lgpd/consent'],
    [/^\/lgpd\/consent\/revoke$/, '/lgpd/consent/revoke'],
    [/^\/lgpd\/consent\/status$/, '/lgpd/consent/status'],
    [/^\/lgpd\/requests$/, '/lgpd/requests'],
    [/^\/lgpd\/requests\/complete$/, '/lgpd/requests/complete'],
    [/^\/lgpd\/requests\/reject$/, '/lgpd/requests/reject'],
    [/^\/lgpd\/export$/, '/lgpd/export'],
    [/^\/health(\/.*)?$/, '/health'],
    [/^\/ready(\/.*)?$/, '/ready'],
    [/^\/live(\/.*)?$/, '/live'],
    [/^\/metrics$/, '/metrics'],
    [/^\/slos$/, '/slos'],
    [/^\/admin\/commercial-dashboard$/, '/admin/commercial-dashboard'],
    [/^\/reports\/executions\/[^/]+\/export$/, '/reports/executions/:id/export'],
    [/^\/attachments\/[^/]+\/download$/, '/attachments/:id/download'],
    [/^\/attachments\/[^/]+\/download-url$/, '/attachments/:id/download-url'],
    // Generic resource patterns: /resource/:id, /resource/:id/sub-resource
    [
      /^\/(owners|patients|encounters|clinical-handoffs|appointments|users|staff|products|services|stock-items|wards|beds|inpatient-stays|exam-orders|medication-orders|clinical-notes|alerts|documents|protocols|shift-handovers|notifications|workflow-tasks|billing|cash-registers|counter-sales|quotes|triage|scheduling|surgery|diagnostics|laboratory|discharges|prescriptions|inventory|attachments|mfa|audit|health)\/[^/]+(\/[^/]+)?$/,
      '/{resource}/:id'
    ]
  ];

  for (const [pattern, replacement] of routePatterns) {
    if (pattern.test(pathname)) return replacement;
  }

  // Keep unknown routes in one bounded bucket instead of echoing path data.
  return pathname === '' || pathname === '/' ? '/' : '/{unknown}';
}

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// ============================================================================
// Prometheus Registry
// ============================================================================

const registry = new Registry();

// Collect default Node.js metrics (event loop, GC, handles, etc.)
collectDefaultMetrics({ register: registry });

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [registry]
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry]
});

export const httpErrorsTotal = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors by status code category',
  labelNames: ['status_category'] as const,
  registers: [registry]
});

// ============================================================================
// Application Metrics
// ============================================================================

export const appUptimeSeconds = new Gauge({
  name: 'app_uptime_seconds',
  help: 'Application uptime in seconds',
  registers: [registry]
});

export const appActiveRequests = new Gauge({
  name: 'app_active_requests',
  help: 'Number of requests currently being processed',
  registers: [registry]
});

export const appDbHealthy = new Gauge({
  name: 'app_database_healthy',
  help: 'Database health status (1 = healthy, 0 = unhealthy)',
  registers: [registry]
});

export const appPersistenceMode = new Gauge({
  name: 'app_persistence_mode',
  help: 'Persistence mode (1 = database, 0 = in-memory)',
  labelNames: ['mode'] as const,
  registers: [registry]
});

// ============================================================================
// Metrics Registry Access
// ============================================================================

export function getMetricsRegistry(): Registry {
  return registry;
}

export async function getMetricsText(): Promise<string> {
  return registry.metrics();
}

// ============================================================================
// Update Functions (called periodically or on state changes)
// ============================================================================

export function updateAppMetrics(options: {
  uptime: number;
  activeRequests: number;
  dbHealthy: boolean;
  persistenceMode: string;
}): void {
  appUptimeSeconds.set(options.uptime);
  appActiveRequests.set(options.activeRequests);
  appDbHealthy.set(options.dbHealthy ? 1 : 0);

  // Reset previous persistence mode labels
  appPersistenceMode.reset();
  if (options.persistenceMode === 'database') {
    appPersistenceMode.set({ mode: 'database' }, 1);
  } else {
    appPersistenceMode.set({ mode: 'in-memory' }, 1);
  }
}

export function incrementActiveRequests(): void {
  appActiveRequests.inc();
}

export function decrementActiveRequests(): void {
  appActiveRequests.dec();
}

export function resetActiveRequestsCount(): void {
  appActiveRequests.set(0);
}

// ============================================================================
// Route Normalization
// Prevents high cardinality from dynamic route segments
// ============================================================================

export function normalizeRoute(pathname: string): string {
  // Map known route patterns to avoid cardinality explosion
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
    // Generic resource patterns: /resource/:id, /resource/:id/sub-resource
    [
      /^\/(owners|patients|encounters|appointments|users|staff|products|services|stock-items|wards|beds|inpatient-stays|exam-orders|medication-orders|clinical-notes|alerts|documents|protocols|shift-handovers|notifications|billing|cash-registers|counter-sales|quotes|triage|scheduling|surgery|diagnostics|discharges|prescriptions|inventory|attachments|mfa|audit|health)\/[^/]+(\/[^/]+)?$/,
      '/{resource}/:id'
    ]
  ];

  for (const [pattern, replacement] of routePatterns) {
    if (pattern.test(pathname)) {
      return replacement;
    }
  }

  // For unmatched routes, return the first segment only to limit cardinality
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    return '/' + segments[0];
  }

  return pathname || '/';
}

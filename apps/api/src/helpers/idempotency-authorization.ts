import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';

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

export function isMedicalRecordsMutationPath(
  pathname: string,
  method: string | undefined
): boolean {
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
 *
 * PROD-005/A02: this map must cover every mutation that flows through the
 * generic envelope. Mutations without an entry receive a replay-denying guard
 * (first executions still run under the route's own guard). Provider-secret
 * routes that carry no session permission contract are carved out explicitly.
 */

/** Provider-secret webhook without a session permission contract (PROD-030 owns its replay policy). */
export const SYNTHETIC_PIX_WEBHOOK_PATH = '/webhooks/pix/synthetic/v1';

/** Replay-denied operations fail with this code so clients can distinguish them from route guards. */
export const REPLAY_AUTHORIZATION_UNMAPPED = 'REPLAY_AUTHORIZATION_UNMAPPED';

export interface ReportCommandReference {
  readonly reportId?: string;
  readonly executionId?: string;
  readonly scheduleId?: string;
  readonly deliveryId?: string;
}

export function resolveReportCommandReportId(
  reference: ReportCommandReference,
  reports: {
    getExecution(accountId: AccountId, executionId: string): { reportId: string };
    listSchedules(accountId: AccountId): readonly { id: string; reportId: string }[];
  },
  accountId: AccountId
): string | undefined {
  if (reference.reportId) return reference.reportId;
  if (reference.executionId) return reports.getExecution(accountId, reference.executionId).reportId;
  return reference.scheduleId
    ? reports.listSchedules(accountId).find((schedule) => schedule.id === reference.scheduleId)
        ?.reportId
    : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Extracts the report identity from the tenant-command envelope used by the
 * HTTP server. Report execution commands carry `reportId` in `body`, while
 * export commands carry the execution id in the route path and only the
 * export format in `body`. Keeping this normalization at the envelope
 * boundary prevents replay authorization from silently skipping the dynamic
 * report permission check.
 */
export function extractReportCommandReference(
  payload: unknown,
  fallbackPath?: string
): ReportCommandReference {
  const envelope = asRecord(payload);
  if (!envelope) return {};

  const commandBody = asRecord(envelope.body) ?? envelope;
  const reportId = nonEmptyString(commandBody.reportId) ?? nonEmptyString(envelope.reportId);
  let executionId = nonEmptyString(commandBody.executionId) ?? nonEmptyString(envelope.executionId);
  let scheduleId = nonEmptyString(commandBody.scheduleId) ?? nonEmptyString(envelope.scheduleId);
  let deliveryId = nonEmptyString(commandBody.deliveryId) ?? nonEmptyString(envelope.deliveryId);

  const commandPath = nonEmptyString(envelope.path) ?? nonEmptyString(fallbackPath);
  const executionPathMatch = commandPath?.match(/^\/reports\/executions\/([^/]+)(?:\/export)?$/);
  if (!executionId && executionPathMatch?.[1]) {
    try {
      executionId = nonEmptyString(decodeURIComponent(executionPathMatch[1]));
    } catch {
      executionId = undefined;
    }
  }

  const schedulePathMatch = commandPath?.match(
    /^\/reports\/schedules\/([^/]+)(?:\/deliveries\/([^/]+)\/retry)?$/
  );
  if (schedulePathMatch?.[1]) {
    try {
      scheduleId ??= nonEmptyString(decodeURIComponent(schedulePathMatch[1]));
      if (schedulePathMatch[2]) {
        deliveryId ??= nonEmptyString(decodeURIComponent(schedulePathMatch[2]));
      }
    } catch {
      scheduleId = undefined;
      deliveryId = undefined;
    }
  }

  return {
    ...(reportId ? { reportId } : {}),
    ...(executionId ? { executionId } : {}),
    ...(scheduleId ? { scheduleId } : {}),
    ...(deliveryId ? { deliveryId } : {})
  };
}

export interface ReplayGuardDeps {
  readonly operation: string;
  readonly pathname: string;
  readonly replayPermissions: readonly string[] | undefined;
  readonly requestPayload: unknown;
  readonly requirePrincipal: (permission: string) => Promise<unknown>;
  readonly requireApiKey: (permission: string) => Promise<unknown>;
  /** Resolves the dynamic per-report permission, or undefined when unresolvable (fail-closed). */
  readonly resolveReportPermission?: (body: unknown) => Promise<string | undefined>;
  readonly onUnmappedReplay?: (operation: string) => void;
}

/**
 * PROD-005/A02: builds the replay re-authorization guard. Mapped mutations
 * re-check their route permission; unmapped mutations deny replay explicitly
 * (first executions still run under the route's own guard); report mutations
 * additionally re-check the definition permission resolved per report.
 */
export function createReplayGuard(deps: ReplayGuardDeps): () => Promise<void> {
  return async () => {
    if (!deps.replayPermissions) {
      deps.onUnmappedReplay?.(deps.operation);
      throw replayDenied('Idempotent replay is not authorized for this operation.');
    }
    for (const permission of deps.replayPermissions) {
      if (API_KEY_REPLAY_PERMISSIONS.has(permission)) {
        await deps.requireApiKey(permission);
      } else {
        await deps.requirePrincipal(permission);
      }
    }
    if (deps.pathname.startsWith('/reports/')) {
      const reportPermission = await deps
        .resolveReportPermission?.(deps.requestPayload)
        .catch(() => undefined);
      if (!reportPermission) {
        throw replayDenied(
          'Idempotent replay of a report requires a resolvable report definition.'
        );
      }
      await deps.requirePrincipal(reportPermission);
    }
  };
}

function replayDenied(message: string): AppError {
  return new AppError(REPLAY_AUTHORIZATION_UNMAPPED, message, 403);
}

/**
 * Paths whose replay deliberately skips session re-authorization. Entry still
 * requires the account API key and replay still requires the identical
 * actor, key and payload hash. Any addition here needs Security sign-off.
 */
export function isReplayGuardExempt(pathname: string): boolean {
  return pathname === SYNTHETIC_PIX_WEBHOOK_PATH;
}

/** Permissions verified through an API key (not a session) on replay. */
export const API_KEY_REPLAY_PERMISSIONS: ReadonlySet<string> = new Set([
  'payments.manage',
  'notifications.manage'
]);
export function idempotencyAuthorizationPermissions(
  pathname: string,
  method: string | undefined
): readonly string[] | undefined {
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return undefined;
  // Read-like POST endpoints: the route guard requires only read access, so
  // replay must require the same (never the family default write permission).
  if (method === 'POST' && /^\/prescriptions\/[^/]+\/document$/.test(pathname)) {
    return ['prescriptions.read'];
  }
  if (method === 'POST' && pathname === '/ml/ocr/fiscal-preview') {
    return ['fiscal.read'];
  }
  if (method === 'POST' && pathname === '/scheduling/recommendations/duration') {
    return ['scheduling.read'];
  }
  // Secret-authenticated provider webhook: no session permission applies.
  // Entry still requires the account API key (401 otherwise); replay needs the
  // identical actor, key and payload hash. Real provider replay policy: PROD-030.
  if (pathname === SYNTHETIC_PIX_WEBHOOK_PATH) return undefined;
  if (method === 'POST' && pathname === '/workflow-tasks') {
    return ['workflow-tasks.manage'];
  }
  if (method === 'POST' && /^\/workflow-tasks\/[^/]+\/replay$/.test(pathname)) {
    return ['workflow-tasks.replay'];
  }
  if (
    method === 'POST' &&
    /^\/workflow-tasks\/[^/]+\/(?:acknowledge|complete|cancel)$/.test(pathname)
  ) {
    return ['workflow-tasks.manage'];
  }
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
  if (
    pathname === '/surgery' ||
    pathname.startsWith('/surgery/') ||
    pathname === '/surgeries' ||
    pathname.startsWith('/surgeries/')
  )
    return ['surgery.manage'];
  if (pathname === '/discharges' || pathname.startsWith('/discharges/')) {
    return ['discharges.manage'];
  }
  if (
    pathname.startsWith('/billing/') ||
    pathname.startsWith('/financial/') ||
    pathname.startsWith('/cash/') ||
    pathname.startsWith('/advance-payments/') ||
    pathname.startsWith('/expenses-catalog') ||
    pathname.startsWith('/cost-centers-catalog') ||
    pathname.startsWith('/finance/catalogs/')
  ) {
    return ['billing.manage'];
  }
  if (pathname.startsWith('/scheduling/') || pathname.startsWith('/agenda-config/')) {
    return ['scheduling.manage'];
  }
  if (pathname === '/vetus-imports' || pathname.startsWith('/vetus-import')) {
    return ['patients.manage', 'owners.manage'];
  }
  if (
    pathname === '/inventory' ||
    pathname.startsWith('/inventory/') ||
    pathname.startsWith('/inventory-manufacturers') ||
    pathname.startsWith('/inventory-product-groups') ||
    pathname.startsWith('/inventory-warehouses') ||
    pathname.startsWith('/measurement-units') ||
    pathname === '/company-sectors' ||
    pathname.startsWith('/company-sectors/') ||
    pathname === '/setores' ||
    pathname.startsWith('/setores/') ||
    pathname === '/setores-da-empresa' ||
    pathname.startsWith('/setores-da-empresa/')
  ) {
    return ['inventory.manage'];
  }
  if (pathname === '/fiscal' || pathname.startsWith('/fiscal/')) {
    return ['fiscal.manage'];
  }
  if (
    pathname === '/counter-sales' ||
    pathname.startsWith('/counter-sales/') ||
    pathname.startsWith('/loyalty/') ||
    pathname === '/loyalty' ||
    pathname.startsWith('/packages/') ||
    pathname === '/packages' ||
    pathname.startsWith('/pacotes/') ||
    pathname === '/pacotes' ||
    pathname.startsWith('/package-items/') ||
    pathname.startsWith('/pacote-itens/')
  ) {
    return ['counter_sale.write'];
  }
  if (
    pathname.startsWith('/price-tables/') ||
    pathname === '/price-tables' ||
    pathname.startsWith('/tabelas-de-preco') ||
    pathname.startsWith('/tabelas-de-preços') ||
    pathname.startsWith('/estoque/tabelas-de-preco') ||
    pathname.startsWith('/estoque/tabelas-de-preços') ||
    pathname.startsWith('/estoque/cadastros/tabelas-de-preco') ||
    pathname.startsWith('/estoque/cadastros/tabelas-de-preços')
  ) {
    return ['inventory.manage'];
  }
  if (
    pathname.startsWith('/staff/') ||
    pathname === '/staff' ||
    pathname.startsWith('/professions')
  ) {
    return ['staff.manage'];
  }
  if (pathname.startsWith('/quotes')) {
    return ['quote.write'];
  }
  if (pathname === '/users' || pathname.startsWith('/users/')) {
    return ['users.manage'];
  }
  if (pathname.startsWith('/marketing/')) {
    return ['marketing.manage'];
  }
  if (
    pathname.startsWith('/integrations/email/') ||
    pathname.startsWith('/integrations/sms/') ||
    pathname.startsWith('/integrations/google-calendar/')
  ) {
    return ['notifications.manage'];
  }
  if (pathname === '/flags' || pathname.startsWith('/flags/')) {
    return ['flags.admin'];
  }
  if (pathname.startsWith('/internal/')) {
    return ['audit.write'];
  }
  if (pathname === '/lgpd' || pathname.startsWith('/lgpd/')) {
    return ['lgpd.requests.manage'];
  }
  if (pathname === '/api-keys' || pathname.startsWith('/api-keys/')) {
    return ['api_keys.manage'];
  }
  if (
    pathname === '/webhooks' ||
    pathname === '/webhook' ||
    pathname.startsWith('/webhooks/') ||
    pathname === '/cadastro/webhooks' ||
    pathname === '/cadastros/webhooks'
  ) {
    return ['webhooks.manage'];
  }
  if (pathname.startsWith('/pos-sync/') || pathname === '/pos-sync') {
    return ['inventory.manage'];
  }
  if (pathname.startsWith('/cash-register/') || pathname.startsWith('/financeiro/gaveta/')) {
    return ['billing.manage'];
  }
  if (pathname.startsWith('/finance/advance-payments')) {
    return ['billing.manage'];
  }
  if (
    pathname === '/services' ||
    pathname.startsWith('/services/') ||
    pathname === '/breeds' ||
    pathname === '/breed' ||
    pathname.startsWith('/breeds/') ||
    pathname === '/species' ||
    pathname === '/specie' ||
    pathname.startsWith('/species/') ||
    pathname.startsWith('/coat-colors/') ||
    pathname.startsWith('/customer-groups/') ||
    pathname.startsWith('/vaccines-dewormers') ||
    pathname === '/vaccines-dewormers' ||
    pathname.startsWith('/responsibility-terms')
  ) {
    return ['service.write'];
  }
  if (pathname === '/products' || pathname.startsWith('/products/')) {
    return ['product.write'];
  }
  if (pathname.startsWith('/ml/anomalies/')) {
    return ['diagnostics.manage'];
  }
  if (pathname.startsWith('/availability') || pathname.startsWith('/appointment-types')) {
    return ['scheduling.manage'];
  }
  if (pathname.startsWith('/reports/')) {
    return ['billing.read'];
  }
  if (pathname === '/owner-patient-links' || pathname.startsWith('/owner-patient-links/')) {
    return ['patients.manage'];
  }
  return undefined;
}

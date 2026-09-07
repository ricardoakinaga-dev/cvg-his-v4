import { expect, type Page, type Route } from '@playwright/test';

// Screenshot-only read model. Authentication/session responses are never replaced.
// List totals represent a paginated collection; items include the two birthdays
// and all three recent open balances used by the dashboard's derived metrics.
export const DASHBOARD_VISUAL_TIME = '2026-09-05T15:00:00.000Z';
export const DASHBOARD_VISUAL_PERMISSIONS = [
  'counter_sale.read',
  'owners.read',
  'patients.read',
  'scheduling.read',
  'product.read',
  'audit.read',
  'inpatient.read',
  'inventory.read',
  'diagnostics.read'
];

const openSales = [125.5, 80, 44.5].map((balanceDue, i) => ({
  id: `visual-sale-${i + 1}`,
  number: `CS-VISUAL-${i + 1}`,
  ownerId: null,
  balanceDue,
  createdAt: `2026-09-0${5 - i}T12:00:00.000Z`
}));

export function dashboardVisualResponse(url: URL): unknown | undefined {
  const path = url.pathname.replace(/^\/api/, '');
  switch (path) {
    case '/owners':
      return {
        total: 12,
        items: [
          { id: 'visual-owner', fullName: 'Maria Visual', profile: { birthDate: '1988-09-05' } }
        ]
      };
    case '/patients':
      return {
        total: 9,
        items: [
          {
            id: 'visual-patient',
            name: 'Luna Visual',
            primaryOwnerId: 'visual-owner',
            birthDateApproximate: '2020-09-05'
          }
        ]
      };
    case '/appointments':
      return { total: 7, items: [] };
    case '/products':
      return { total: 5, items: [] };
    case '/counter-sales':
      if (url.searchParams.get('status') === 'open') return { total: 3, items: openSales };
      if (url.searchParams.get('status') === 'closed') return { total: 4, items: [] };
      throw new Error(`Unexpected dashboard sale query: ${url.search}`);
    case '/slos':
      return {
        generatedAt: DASHBOARD_VISUAL_TIME,
        snapshot: {
          requestCount5m: 120,
          requestCount1h: 980,
          p95LatencyMs: 184,
          p99LatencyMs: 315,
          availabilityPercent: 99.95,
          errorRatePercent: 0.1
        },
        report: { overallStatus: 'healthy', errorBudgetExhausted: false, slos: [] },
        runbook: { metrics: '/metrics', readiness: '/health/ready', liveness: '/health/live' }
      };
    case '/audit/operational-coverage':
      return {
        generatedAt: DASHBOARD_VISUAL_TIME,
        accountId: 'visual-fixture',
        totalEvents: 42,
        eventsByModule: { audit: 42 },
        eventsByRiskLevel: { low: 42 },
        coveredRequirements: 1,
        missingRequirements: 0,
        coveragePercent: 100,
        requirements: [
          {
            id: 'visual-audit',
            module: 'audit',
            action: 'read',
            minimumRiskLevel: 'low',
            description: 'Synthetic visual audit trail',
            covered: true
          }
        ]
      };
    case '/audit/events':
      return { items: [] };
    case '/admin/commercial-dashboard':
      return {
        openSales: 3,
        closedToday: 4,
        grossRevenueToday: 640,
        netRevenueToday: 600,
        avgTicket: 150,
        salesByPaymentMethod: [{ method: 'PIX', total: 600 }],
        topProducts: [],
        topServices: [],
        quotesIssued: 2,
        quotesConverted: 1,
        lowStockAlerts: []
      };
    case '/inpatient':
    case '/inventory':
    case '/laboratory/orders':
      return { items: [], total: 0 };
    case '/inpatient/daily-charges/worklist':
      return { items: [], totalPendingAmount: 0, totalBilledAmount: 0 };
    default:
      return undefined;
  }
}

export async function installDashboardVisualFixture(page: Page, apiBaseUrls: string | string[]) {
  await page.clock.setFixedTime(new Date(DASHBOARD_VISUAL_TIME));
  // Support both direct API requests and the SPA's same-origin /api proxy.
  const origins = new Set(
    (Array.isArray(apiBaseUrls) ? apiBaseUrls : [apiBaseUrls]).map((url) => new URL(url).origin)
  );
  const served: string[] = [];
  const handler = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      !origins.has(url.origin) ||
      !url.pathname.startsWith('/api/') ||
      request.method() !== 'GET'
    ) {
      await route.fallback();
      return;
    }
    const response = dashboardVisualResponse(url);
    if (response === undefined) {
      await route.fallback();
      return;
    }
    served.push(url.pathname + url.search);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  };
  await page.route('**/*', handler);
  return { served, dispose: () => page.unroute('**/*', handler) };
}

export async function assertDashboardVisualState(page: Page) {
  await expect(page.locator('.dashboard-hero__date')).toHaveText('05/09/2026');
  await expect(page.locator('.dashboard-hero__signal')).toHaveText('Operação verificada');
  await expect(page.locator('.home-shortcut__value')).toHaveText(['3', '12', '9', '7', '5', '4']);
  await expect(page.locator('.home-metric strong')).toHaveText([
    '7',
    '3',
    /R\$\s*250,00/,
    '2',
    '4'
  ]);
  await expect(page.locator('.counter-sale-item')).toHaveCount(3);
  await expect(page.locator('.birthday-item')).toHaveCount(2);
  await expect(page.locator('.panel-loading')).toHaveCount(0);
  await expect(page.locator('.home-shortcut__value--error')).toHaveCount(0);
  await expect(page.locator('.premium-lenses__head')).not.toContainText('Atualizando');
}

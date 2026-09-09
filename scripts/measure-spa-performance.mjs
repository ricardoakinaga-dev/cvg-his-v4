import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { extname, dirname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'apps/spa/dist');
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('@playwright/test');

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith('--')) continue;
  const [key, inline] = value.slice(2).split('=', 2);
  args.set(key, inline ?? process.argv[index + 1] ?? '');
  if (inline === undefined) index += 1;
}

const runs = Math.max(1, Number(args.get('runs') || process.env.PERF_RUNS || 3));
const output = resolve(
  root,
  args.get('out') || 'docs/frontend/implementation/performance-lab-2026-09-07.json'
);
const markdownOutput = resolve(
  root,
  args.get('markdown') || 'docs/frontend/implementation/performance-lab-2026-09-07.md'
);
const viewport = { width: 1440, height: 900 };
const routeCases = [
  { path: '/', authenticated: false },
  { path: '/login', authenticated: false },
  { path: '/appointments?agendaDate=2026-09-07&agendaView=week', authenticated: true }
];
const routes = routeCases.map((route) => route.path);
const scriptSha256 = createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex');
const syntheticAccountId = '11111111-1111-4111-8111-111111111111';
const syntheticToken = `${Buffer.from(JSON.stringify({
  sub: '22222222-2222-4222-8222-222222222222',
  email: 'performance-lab@cvg.invalid',
  displayName: 'Performance Lab',
  roles: ['admin'],
  accountId: syntheticAccountId,
  exp: Math.floor(Date.now() / 1000) + 3600
})).toString('base64url')}.synthetic-lab`;

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error(`Build ausente em ${dist}. Execute pnpm --filter @cvg-his-v2/spa run build antes da medição.`);
}

function contentType(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2'
  }[extname(path).toLowerCase()] || 'application/octet-stream';
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function artifactInventory() {
  const files = walk(dist).map((path) => {
    const bytes = readFileSync(path);
    return {
      path: relative(dist, path).replaceAll('\\', '/'),
      bytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      gzipBytes: gzipSync(bytes, { level: 9 }).byteLength
    };
  });
  const index = readFileSync(join(dist, 'index.html'), 'utf8');
  const initialPaths = [...index.matchAll(/(?:src|href)=["']\/?(assets\/[^"']+\.(?:js|css))["']/g)].map(
    ([, path]) => path
  );
  const byPath = new Map(files.map((file) => [file.path, file]));
  const initialHtmlAssets = initialPaths.map((path) => ({
    ...byPath.get(path),
    path
  }));
  const initialHtmlAssetsGzipBytes = initialHtmlAssets.reduce((sum, file) => sum + file.gzipBytes, 0);
  const largestJavaScript = files
    .filter((file) => file.path.endsWith('.js'))
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 15);
  const largestStylesheets = files
    .filter((file) => file.path.endsWith('.css'))
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 10);
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const artifactFingerprintSha256 = createHash('sha256')
    .update(
      [...files]
        .sort((left, right) => left.path.localeCompare(right.path))
        .map((file) => `${file.path}:${file.sha256}`)
        .join('\n')
    )
    .digest('hex');
  return {
    distFiles: files.length,
    distBytes: total,
    artifactFingerprintSha256,
    initialHtmlAssets,
    initialHtmlAssetsBytes: initialHtmlAssets.reduce((sum, file) => sum + file.bytes, 0),
    initialHtmlAssetsGzipBytes,
    largestJavaScript,
    largestStylesheets
  };
}

async function startStaticServer() {
  const compressedCache = new Map();
  const gzipEligible = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.xml']);
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?', 1)[0]);
    const candidate = normalize(join(dist, requestPath === '/' ? 'index.html' : requestPath));
    const insideDist = candidate === dist || candidate.startsWith(`${dist}/`);
    const path = insideDist && existsSync(candidate) && statSync(candidate).isFile()
      ? candidate
      : join(dist, 'index.html');
    const source = readFileSync(path);
    const acceptsGzip = /(?:^|,\s*)gzip(?:\s*;|\s*,|\s*$)/i.test(
      String(request.headers['accept-encoding'] || '')
    );
    const extension = extname(path).toLowerCase();
    const shouldCompress = acceptsGzip && gzipEligible.has(extension);
    let body = source;
    response.setHeader('Content-Type', contentType(path));
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vary', 'Accept-Encoding');
    if (shouldCompress) {
      body = compressedCache.get(path);
      if (!body) {
        body = gzipSync(source, { level: 9 });
        compressedCache.set(path, body);
      }
      response.setHeader('Content-Encoding', 'gzip');
    }
    response.setHeader('Content-Length', body.byteLength);
    response.end(body);
  });
  await new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveServer);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Não foi possível obter a porta do servidor estático.');
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

function syntheticSchedulingOverview(url) {
  const referenceDate = (url.searchParams.get('referenceDate') || '2026-09-07').slice(0, 10);
  return {
    viewMode: url.searchParams.get('viewMode') === 'week' ? 'week' : 'day',
    windowStart: `${referenceDate}T00:00:00.000Z`,
    windowEnd: `${referenceDate}T23:59:59.000Z`,
    stats: {
      total: 2,
      scheduled: 1,
      checkedIn: 1,
      completed: 0,
      cancelled: 0,
      conflicts: 1,
      unassigned: 0
    },
    professionals: [{
      id: '33333333-3333-4333-8333-333333333333',
      fullName: 'Dra. Performance Lab',
      department: 'Clínica',
      jobTitle: 'Médica Veterinária',
      specialty: 'Clínica geral',
      unit: 'Clínica',
      status: 'active'
    }],
    blocks: [{
      id: '44444444-4444-4444-8444-444444444444',
      accountId: syntheticAccountId,
      title: 'Intervalo operacional',
      kind: 'lunch_break',
      startsAt: `${referenceDate}T12:00:00.000Z`,
      endsAt: `${referenceDate}T13:00:00.000Z`,
      practitionerStaffId: '33333333-3333-4333-8333-333333333333',
      unit: 'Clínica'
    }],
    filterOptions: {
      units: ['Clínica'],
      specialties: ['Clínica geral'],
      statuses: ['scheduled', 'checked_in', 'completed', 'cancelled']
    },
    items: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        accountId: syntheticAccountId,
        patientId: '66666666-6666-4666-8666-666666666666',
        ownerId: '77777777-7777-4777-8777-777777777777',
        scheduledAt: `${referenceDate}T09:00:00.000Z`,
        endsAt: `${referenceDate}T09:30:00.000Z`,
        durationMinutes: 30,
        visitType: 'scheduled',
        reason: 'Consulta de rotina',
        practitionerStaffId: '33333333-3333-4333-8333-333333333333',
        practitionerName: 'Dra. Performance Lab',
        unit: 'Clínica',
        specialty: 'Clínica geral',
        status: 'scheduled',
        conflicts: [],
        operational: {
          stage: 'scheduled',
          label: 'Agendado',
          source: 'appointment',
          updatedAt: `${referenceDate}T08:00:00.000Z`
        },
        createdAt: `${referenceDate}T08:00:00.000Z`,
        updatedAt: `${referenceDate}T08:00:00.000Z`
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        accountId: syntheticAccountId,
        patientId: '99999999-9999-4999-8999-999999999999',
        ownerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        scheduledAt: `${referenceDate}T10:00:00.000Z`,
        endsAt: `${referenceDate}T10:30:00.000Z`,
        durationMinutes: 30,
        visitType: 'return',
        reason: 'Retorno',
        practitionerStaffId: '33333333-3333-4333-8333-333333333333',
        practitionerName: 'Dra. Performance Lab',
        unit: 'Clínica',
        specialty: 'Clínica geral',
        status: 'checked_in',
        conflicts: [{
          type: 'staff_overlap',
          severity: 'critical',
          message: 'Conflito operacional sintético.',
          startsAt: `${referenceDate}T10:00:00.000Z`,
          endsAt: `${referenceDate}T10:30:00.000Z`,
          appointmentId: '88888888-8888-4888-8888-888888888888'
        }],
        operational: {
          stage: 'in_triage',
          label: 'Em triagem',
          source: 'queue',
          queueEntryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          queueStatus: 'in_triage',
          encounterId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          updatedAt: `${referenceDate}T10:05:00.000Z`
        },
        createdAt: `${referenceDate}T09:00:00.000Z`,
        updatedAt: `${referenceDate}T09:00:00.000Z`
      }
    ]
  };
}

function syntheticApiPayload(url) {
  if (url.pathname === '/api/auth/refresh') {
    return { status: 200, payload: { accessToken: syntheticToken } };
  }
  if (url.pathname === '/api/auth/session') {
    return {
      status: 200,
      payload: {
        access: {
          permissionCodes: ['scheduling.read', 'scheduling.manage', 'owners.read', 'patients.read']
        }
      }
    };
  }
  if (url.pathname === '/api/scheduling/overview') {
    return { status: 200, payload: syntheticSchedulingOverview(url) };
  }
  if (url.pathname === '/api/services') {
    return {
      status: 200,
      payload: {
        items: [{
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          accountId: syntheticAccountId,
          name: 'Consulta de rotina',
          code: 'PERF-001',
          description: 'Serviço sintético do laboratório',
          basePrice: 100,
          active: true,
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z'
        }]
      }
    };
  }
  if (url.pathname.startsWith('/api/owners/')) {
    return { status: 200, payload: { id: url.pathname.split('/').at(-1), fullName: 'Tutor Performance Lab' } };
  }
  if (url.pathname.startsWith('/api/patients/')) {
    return { status: 200, payload: { id: url.pathname.split('/').at(-1), name: 'Paciente Performance Lab' } };
  }
  return { status: 404, payload: { message: 'Synthetic performance endpoint not configured' } };
}

async function measureRoute(browser, origin, routeCase, run) {
  const { path: route, authenticated } = routeCase;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    serviceWorkers: 'block'
  });
  const apiRequests = [];
  if (authenticated) {
    await context.route('**/api/**', async (routeHandler) => {
      const requestUrl = new URL(routeHandler.request().url());
      const response = syntheticApiPayload(requestUrl);
      apiRequests.push({ method: routeHandler.request().method(), path: requestUrl.pathname });
      await routeHandler.fulfill({
        status: response.status,
        contentType: 'application/json',
        body: JSON.stringify(response.payload)
      });
    });
  }
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__cvgPerf = { lcp: null, longTasks: [] };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries.at(-1);
        if (latest) window.__cvgPerf.lcp = latest.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__cvgPerf.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
  const consoleErrors = [];
  page.on('pageerror', (error) => consoleErrors.push(String(error)));
  try {
    const startedAt = performance.now();
    await page.goto(`${origin}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    if (authenticated) await page.getByRole('heading', { name: 'Agenda', exact: true }).waitFor();
    await page.waitForTimeout(1000);
    const elapsedMs = performance.now() - startedAt;
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paints = Object.fromEntries(
        performance.getEntriesByType('paint').map((entry) => [entry.name, entry.startTime])
      );
      const resources = performance
        .getEntriesByType('resource')
        .filter((entry) => entry.name.includes('/assets/'))
        .map((entry) => ({
          name: new URL(entry.name).pathname,
          duration: entry.duration,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize
        }));
      const assetTotals = resources.reduce(
        (totals, resource) => ({
          requests: totals.requests + 1,
          transferSize: totals.transferSize + resource.transferSize,
          encodedBodySize: totals.encodedBodySize + resource.encodedBodySize,
          decodedBodySize: totals.decodedBodySize + resource.decodedBodySize
        }),
        { requests: 0, transferSize: 0, encodedBodySize: 0, decodedBodySize: 0 }
      );
      return {
        navigation: navigation && {
          redirectCount: navigation.redirectCount,
          responseStart: navigation.responseStart,
          domContentLoaded: navigation.domContentLoadedEventEnd,
          loadEventEnd: navigation.loadEventEnd,
          transferSize: navigation.transferSize,
          encodedBodySize: navigation.encodedBodySize,
          decodedBodySize: navigation.decodedBodySize
        },
        fcp: paints['first-contentful-paint'] ?? null,
        lcp: window.__cvgPerf.lcp,
        longTasks: window.__cvgPerf.longTasks,
        resources,
        assetNetwork: {
          ...assetTotals,
          compressionObserved: assetTotals.encodedBodySize > 0 &&
            assetTotals.encodedBodySize < assetTotals.decodedBodySize
        },
        finalPath: location.pathname + location.search + location.hash,
        title: document.title
      };
    });
    return { route, run, authenticated, apiRequests, elapsedMs, consoleErrors, ...metrics };
  } finally {
    await page.close();
    await context.close();
  }
}

const inventory = artifactInventory();
const { server, origin } = await startStaticServer();
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();
const measurements = [];
try {
  for (let run = 1; run <= runs; run += 1) {
    for (const routeCase of routeCases) {
      measurements.push(await measureRoute(browser, origin, routeCase, run));
    }
  }
} finally {
  await browser.close();
  await new Promise((resolveServer) => server.close(resolveServer));
}

const report = {
  schemaVersion: 1,
  observedAt: new Date().toISOString(),
  harnessPath: 'scripts/measure-spa-performance.mjs',
  harnessSha256: scriptSha256,
  build: {
    directory: 'apps/spa/dist',
    command: 'pnpm --filter @cvg-his-v2/spa run build',
    artifactInventory: inventory
  },
  laboratory: {
    browser: 'Chromium headless via @playwright/test',
    browserVersion,
    host: { platform: process.platform, arch: process.arch, node: process.version, os: os.release() },
    viewport: { ...viewport, deviceScaleFactor: 1 },
    runs,
    cache: "new context per route; serviceWorkers:'block'; no HTTP cache reuse between measurements",
    routes: routeCases,
    authenticatedFixture: {
      enabled: true,
      route: '/appointments?agendaDate=2026-09-07&agendaView=week',
      api: 'Playwright-intercepted synthetic auth/session, scheduling overview, services, owners and patients responses; controlled data only'
    },
    measurements
  },
  interpretation: {
    fieldMetrics: false,
    conclusion: 'Laboratory-only repeatable artifact and navigation timing baseline. It is not RUM, field INP, user study, real API latency, or UAT.',
    limitations: [
      'The static server serves the production dist. The authenticated agenda route uses a Playwright-intercepted synthetic API/session fixture; it does not measure real API, database, authentication-provider, RLS, or network latency.',
      'LCP and long-task observations are Chromium lab signals only. INP requires real interaction distributions and is not inferred here.',
      'No participant task baseline was performed; FEA-002/033 remain open.',
      'Budget comparison must use the same build command, host, viewport, browser family, route set, auth fixture, and run count.'
    ]
  }
};

const routeSummary = routes.map((route) => {
  const rows = measurements.filter((measurement) => measurement.route === route);
  const median = (key) => {
    const values = rows.map((row) => row[key]).filter((value) => typeof value === 'number').sort((a, b) => a - b);
    return values.length ? values[Math.floor(values.length / 2)] : null;
  };
  return {
    route,
    finalPaths: [...new Set(rows.map((row) => row.finalPath))],
    medianElapsedMs: median('elapsedMs'),
    medianFcpMs: median('fcp'),
    medianLcpMs: median('lcp'),
    maxFcpMs: Math.max(0, ...rows.map((row) => typeof row.fcp === 'number' ? row.fcp : 0)),
    maxLcpMs: Math.max(0, ...rows.map((row) => typeof row.lcp === 'number' ? row.lcp : 0)),
    maxLongTaskMs: Math.max(0, ...rows.flatMap((row) => row.longTasks.map((task) => task.duration))),
    assetNetwork: {
      requests: rows.reduce((sum, row) => sum + (row.assetNetwork?.requests || 0), 0),
      transferSize: rows.reduce((sum, row) => sum + (row.assetNetwork?.transferSize || 0), 0),
      encodedBodySize: rows.reduce((sum, row) => sum + (row.assetNetwork?.encodedBodySize || 0), 0),
      decodedBodySize: rows.reduce((sum, row) => sum + (row.assetNetwork?.decodedBodySize || 0), 0),
      compressionObserved: rows.every((row) => row.assetNetwork?.compressionObserved === true)
    },
    errors: rows.flatMap((row) => row.consoleErrors)
  };
});
const routeBudgetTargets = Object.fromEntries(
  routes.map((route) => [route, { maxFcpMs: 1000, maxLcpMs: 1500, maxLongTaskMs: 200 }])
);
const routeBudgetEvaluation = routeSummary.map((row) => {
  const target = routeBudgetTargets[row.route];
  const withinBudget = Boolean(
    target &&
      row.maxFcpMs <= target.maxFcpMs &&
      row.maxLcpMs <= target.maxLcpMs &&
      row.maxLongTaskMs <= target.maxLongTaskMs &&
      row.errors.length === 0
  );
  return { ...row, target, withinBudget };
});
const performanceBudget = {
  policy: 'Proposta laboratorial; requer decisão técnica antes de promoção',
  initialHtmlAssetsGzipBytes: {
    baselineBytes: 92406,
    targetBytes: 92406,
    observedBytes: inventory.initialHtmlAssetsGzipBytes,
    deltaBytes: inventory.initialHtmlAssetsGzipBytes - 92406,
    deltaPercent: Number((((inventory.initialHtmlAssetsGzipBytes - 92406) / 92406) * 100).toFixed(2)),
    withinBudget: inventory.initialHtmlAssetsGzipBytes <= 92406,
    decision: 'HOLD_FOR_OWNER_APPROVAL'
  },
  routes: routeBudgetEvaluation,
  collectionDesign: {
    repeatsPerRoute: runs,
    browser: 'Chromium headless',
    viewport: '1440x900',
    deviceScaleFactor: 1,
    cache: 'new context per route; serviceWorkers blocked',
    authenticatedAgendaMass: '2 synthetic appointments, 1 professional, 1 operational block, owner/patient references',
    fieldFollowUp: 'RUM/INP and participant/UAT collection remain required'
  }
};
report.laboratory.routeSummary = routeSummary;
report.laboratory.transport = {
  server: 'local static server with Content-Encoding: gzip for text assets when advertised by Chromium',
  compressionObservedPerRoute: Object.fromEntries(
    routeSummary.map((row) => [row.route, row.assetNetwork.compressionObserved])
  )
};
performanceBudget.transportCompression = {
  observed: routeSummary.every((row) => row.assetNetwork.compressionObserved),
  note: 'Encoded and decoded asset body sizes were collected from Chromium Resource Timing against the gzip-enabled local server.'
};
report.performanceBudget = performanceBudget;
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
const markdown = [
  '# Baseline de performance laboratorial da SPA — 07/09/2026',
  '',
  `Artefato medido: \`apps/spa/dist\`, após \`${report.build.command}\`. Execuções: ${runs} por rota; Chromium headless; viewport 1440×900; DPR 1.`,
  '',
  '## Artefato',
  '',
  `- ${inventory.distFiles} arquivos; ${inventory.distBytes} B brutos no dist.`,
  `- Fingerprint SHA-256 imutável do inventário: \`${inventory.artifactFingerprintSha256}\`.`,
  `- Assets do HTML inicial: ${inventory.initialHtmlAssetsBytes} B brutos / ${inventory.initialHtmlAssetsGzipBytes} B gzip nível 9.`,
  `- Transporte: gzip observado pelo Resource Timing em todas as rotas: ${routeSummary.every((row) => row.assetNetwork.compressionObserved) ? 'sim' : 'não'}.`,
  '',
  '## Navegação (mediana)',
  '',
  '| Rota solicitada | Destino final | Tempo total | FCP | LCP | Maior long task |',
  '| --- | --- | ---: | ---: | ---: | ---: |',
  ...routeSummary.map((row) => `| ${row.route} | ${row.finalPaths.join(', ')} | ${row.medianElapsedMs ?? '—'} ms | ${row.medianFcpMs ?? '—'} ms | ${row.medianLcpMs ?? '—'} ms | ${row.maxLongTaskMs ? `${row.maxLongTaskMs.toFixed(1)} ms` : '0 ms'} |`),
  '',
  '## Orçamento laboratorial proposto',
  '',
  `- HTML inicial: alvo igual ao baseline de 92.406 B gzip; observado ${inventory.initialHtmlAssetsGzipBytes} B (${performanceBudget.initialHtmlAssetsGzipBytes.deltaPercent >= 0 ? '+' : ''}${performanceBudget.initialHtmlAssetsGzipBytes.deltaPercent}%); decisão permanece HOLD para aprovação técnica do desvio.`,
  '- Por rota: FCP máximo ≤ 1.000 ms, LCP máximo ≤ 1.500 ms, maior long task ≤ 200 ms e zero erros de página nesta coleta; esses limites são de laboratório e não substituem INP/RUM.',
  '',
  '## Limites',
  '',
  'Esta é uma medição laboratorial reproduzível do build local. A rota de Agenda é exercitada com massa controlada e respostas de autenticação/API interceptadas localmente; não é RUM, INP de campo, latência real de API/DB, estudo com participantes, UAT ou aprovação de orçamento.',
  '',
  `JSON completo: [performance-lab-2026-09-07.json](performance-lab-2026-09-07.json). Hash do script deve ser registrado junto ao rerun.`,
  ''
].join('\n');
writeFileSync(markdownOutput, markdown);

console.log(JSON.stringify({ output, markdownOutput, initialHtmlAssetsGzipBytes: inventory.initialHtmlAssetsGzipBytes, routeSummary }, null, 2));

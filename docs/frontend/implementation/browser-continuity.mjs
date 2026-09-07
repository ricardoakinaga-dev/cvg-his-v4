import { fork } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer as createNetServer } from 'node:net';

// Bounded visual evidence for the current appointments route. The harness uses
// the real SPA and synthetic API responses; it does not mutate product code or
// promote snapshots.
const here = dirname(fileURLToPath(import.meta.url));
const root = process.cwd(); // Run from the repository root; archived relative roots are stale.
const app = join(root, 'apps/spa');
const local = createRequire(join(root, 'package.json'));
const spa = createRequire(join(app, 'package.json'));
const { chromium } = local('@playwright/test');
const { createServer } = await import(pathToFileURL(spa.resolve('vite')));
const vue = spa('@vitejs/plugin-vue').default;

const childMode = process.argv[2] === '--serve';
const receptionPopulated = process.env.RECEPTION_POPULATED === '1';
const evidenceRoot = join(here, 'evidence');
if (!childMode) mkdirSync(evidenceRoot, { recursive: true });
const out = childMode ? process.argv[3] : mkdtempSync(join(evidenceRoot, 'continuity-'));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const inputs = [
  'apps/spa/src/pages/owners/OwnerFormPage.vue',
  'apps/spa/src/pages/reception/ReceptionGatewayPage.vue',
  'apps/spa/src/pages/sales/QuotesPage.vue',
  'apps/spa/src/composables/useListData.ts',
  'apps/spa/src/composables/useUnsavedChanges.ts',
  'apps/spa/src/composables/unsavedChangesCoordinator.ts',
  'packages/design-system/src/vue/DsButton.vue',
  'apps/spa/src/pages/appointments/AppointmentsListPage.vue',
  'apps/spa/src/components/AppPageHeader.vue',
  'apps/spa/src/components/EmptyState.vue',
  'apps/spa/src/services/scheduling.ts',
  'apps/spa/src/services/services.ts',
  'apps/spa/src/services/owner.ts',
  'apps/spa/src/services/patient.ts',
  'apps/spa/src/router/routes.ts',
  'apps/spa/src/router/index.ts',
  'apps/spa/src/layouts/AppLayout.vue',
  'apps/spa/src/stores/theme.ts',
  'apps/spa/src/styles/main.css',
  'packages/design-system/src/tokens/variables.css'
];
const pin = () => Object.fromEntries(inputs.map((path) => [path, sha(readFileSync(join(root, path)))]));
const before = pin();

const alias = {
  '@': join(app, 'src'),
  '@cvg-his-v2/design-system/vue': join(root, 'packages/design-system/src/vue'),
  '@cvg-his-v2/design-system/src/vue': join(root, 'packages/design-system/src/vue'),
  '@cvg-his-v2/design-system/src/tokens': join(root, 'packages/design-system/src/tokens'),
  '@cvg-his-v2/shared-auth-sdk': join(root, 'packages/shared/auth-sdk/src/index.ts'),
  '@cvg-his-v2/shared-config': join(root, 'packages/shared/config/src/index.ts'),
  'virtual:pwa-register/vue': join(app, 'src/test-support/pwa-register-disabled.ts')
};

function addDays(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function makeOverview(referenceDate) {
  const nextDate = addDays(referenceDate);
  return {
    viewMode: 'day',
    windowStart: `${referenceDate}T00:00:00.000Z`,
    windowEnd: `${nextDate}T00:00:00.000Z`,
    stats: { total: 2, scheduled: 1, checkedIn: 1, completed: 0, cancelled: 0, conflicts: 1, unassigned: 0 },
    professionals: [{
      id: 'staff-vet', fullName: 'Veterinário Responsável', department: 'Clínica',
      jobTitle: 'Médico Veterinário', specialty: 'Clínico geral', unit: 'Clínica', status: 'active'
    }],
    blocks: [{
      id: 'block-1', accountId: 'synthetic-account', title: 'Intervalo operacional', kind: 'lunch_break',
      startsAt: `${referenceDate}T12:00:00.000Z`, endsAt: `${referenceDate}T13:00:00.000Z`,
      practitionerStaffId: 'staff-vet', unit: 'Clínica'
    }],
    filterOptions: {
      units: ['Clínica'], specialties: ['Clínico geral'],
      statuses: ['scheduled', 'checked_in', 'completed', 'cancelled']
    },
    items: [
      {
        id: 'synthetic-appt-1', accountId: 'synthetic-account', patientId: 'synthetic-patient-1', ownerId: 'synthetic-owner-1',
        scheduledAt: `${referenceDate}T09:00:00.000Z`, endsAt: `${referenceDate}T09:30:00.000Z`, durationMinutes: 30,
        visitType: 'scheduled', reason: 'Consulta de rotina', practitionerStaffId: 'staff-vet',
        practitionerName: 'Veterinário Responsável', unit: 'Clínica', specialty: 'Clínico geral', status: 'scheduled', conflicts: [],
        operational: { stage: 'scheduled', label: 'Agendado', source: 'appointment', updatedAt: `${referenceDate}T08:00:00.000Z` },
        createdAt: `${referenceDate}T08:00:00.000Z`, updatedAt: `${referenceDate}T08:00:00.000Z`
      },
      {
        id: 'synthetic-appt-2', accountId: 'synthetic-account', patientId: 'synthetic-patient-2', ownerId: 'synthetic-owner-2',
        scheduledAt: `${referenceDate}T10:00:00.000Z`, endsAt: `${referenceDate}T10:30:00.000Z`, durationMinutes: 30,
        visitType: 'return', reason: 'Retorno', practitionerStaffId: 'staff-vet',
        practitionerName: 'Veterinário Responsável', unit: 'Clínica', specialty: 'Clínico geral', status: 'checked_in',
        conflicts: [{ type: 'staff_overlap', severity: 'critical', message: 'Conflito operacional', startsAt: `${referenceDate}T10:00:00.000Z`, endsAt: `${referenceDate}T10:30:00.000Z`, appointmentId: 'synthetic-appt-2' }],
        operational: { stage: 'in_triage', label: 'Em triagem', source: 'queue', queueEntryId: 'queue-1', queueStatus: 'in_triage', encounterId: 'enc-2', updatedAt: `${referenceDate}T10:05:00.000Z` },
        createdAt: `${referenceDate}T09:00:00.000Z`, updatedAt: `${referenceDate}T09:00:00.000Z`
      }
    ]
  };
}

if (childMode) {
const reservation = createNetServer();
await new Promise((resolveListen) => reservation.listen(0, '127.0.0.1', resolveListen));
const ownedPort = reservation.address().port;
await new Promise((resolveClose) => reservation.close(resolveClose));
const server = await createServer({
  configFile: false,
  envFile: false,
  root: app,
  cacheDir: join(out, 'vite-cache'),
  plugins: [vue()],
  resolve: { alias },
  define: { 'import.meta.env.VITE_DISABLE_PWA': '"true"', 'import.meta.env.VITE_API_BASE_URL': '""' },
  server: { host: '127.0.0.1', port: ownedPort, strictPort: true, fs: { allow: [root] } },
  logLevel: 'warn'
});
await server.listen();
const port = server.httpServer.address().port;
const origin = `http://127.0.0.1:${port}`;

  process.send({ origin, port });
  process.on('message', async (message) => {
    if (message === 'close') { await server.close(); process.exit(0); }
  });
} else {
const child = fork(fileURLToPath(import.meta.url), ['--serve', out], { cwd: root, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
let serverLog = '';
child.stdout.on('data', (chunk) => { serverLog += chunk; });
child.stderr.on('data', (chunk) => { serverLog += chunk; });
const { origin, port } = await new Promise((resolveReady, reject) => {
  const timeout = setTimeout(() => { child.kill('SIGTERM'); reject(new Error('Owned Vite launch timed out')); }, 30000);
  child.once('message', (message) => { clearTimeout(timeout); resolveReady(message); });
  child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Owned Vite exited ${code}: ${serverLog}`)); });
});
writeFileSync(join(out, 'launch.json'), JSON.stringify({ origin, port, pid: child.pid, scope: 'Current SPA; synthetic API/auth; owned Vite subprocess; no backend claim' }, null, 2));
let browser;
const rows = [];
const failures = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const target of (receptionPopulated ? ['/reception'] : ['/owners/new', '/reception', '/appointments', '/quotes'])) for (const theme of ['light','dark']) for (const width of [1440, 390]) {
    if (target === '/quotes' && (width !== 1440 || theme !== 'light')) continue;
    const height = width === 390 ? 844 : 900;
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: 1, locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo', colorScheme: theme, reducedMotion: 'no-preference'
    });
    await context.addInitScript((theme) => localStorage.setItem('cvg-his-v2:theme', theme), theme);
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    let releaseOldQuote;
    const quote = (number) => ({ id: number, accountId: 'synthetic-account', number, ownerId: null, status: 'draft', validUntil: null, subtotal: 10, discountAmount: 0, total: 10, notes: null, createdByUserId: 'synthetic-operator', convertedToSaleId: null, convertedAt: null, createdAt: '2026-09-06T12:00:00Z', updatedAt: '2026-09-06T12:00:00Z' });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) {
        requests.push({ path: `${url.origin}${url.pathname}`, blocked: true });
        await route.abort();
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
      }
      requests.push({ path: url.pathname, query: url.search, method: route.request().method() });
      const fulfill = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/api/auth/refresh' && target === '/login') { await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'Synthetic unauthenticated'})}); return; }
      if (url.pathname === '/api/auth/refresh') {
        const payload = Buffer.from(JSON.stringify({ sub: 'synthetic-operator', accountId: 'synthetic-account', name: 'Operador de demonstração', roles: ['admin'], exp: 4102444800 })).toString('base64url');
        await fulfill({ accessToken: `${payload}.synthetic-ui-only` });
        return;
      }
      if (url.pathname === '/api/auth/session') {
        await fulfill({ access: { permissionCodes: ['scheduling.read', 'scheduling.manage','owners.read','owners.manage','patients.read','patients.manage','inpatient.read','inpatient.manage','encounters.read','encounters.manage','billing.read','triage.read','diagnostics.read','medical_records.read','inventory.read','counter_sale.read','beds.read'] } });
        return;
      }
      if (url.pathname === '/api/scheduling/overview') {
        await fulfill(makeOverview(url.searchParams.get('referenceDate')?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)));
        return;
      }
      if (receptionPopulated && target === '/reception') {
        if (url.pathname === '/api/queue') {
          const fixtureDate = new Date().toISOString().slice(0, 10);
          await fulfill({ items: [{ id: 'synthetic-queue', accountId: 'synthetic-account', ownerId: 'synthetic-owner-1', patientId: 'synthetic-patient-1', appointmentId: null, encounterId: null, status: 'waiting', priority: 'high', reason: 'Consulta sintética', checkedInAt: `${fixtureDate}T09:00:00Z`, calledAt: null, createdAt: `${fixtureDate}T09:00:00Z`, updatedAt: `${fixtureDate}T09:00:00Z` }] }); return;
        }
        if (url.pathname === '/api/owners') {
          await fulfill({ items: [{ id: 'synthetic-owner-1', fullName: 'Maria Sintética', contacts: [{ type: 'phone', value: '1100000000', primary: true }], status: 'active' }] }); return;
        }
        if (url.pathname === '/api/patients') {
          await fulfill({ items: [{ id: 'synthetic-patient-1', name: 'Luna Sintética', species: 'cat', primaryOwnerId: 'synthetic-owner-1', status: 'active' }] }); return;
        }
      }
      if (url.pathname === '/api/quotes') {
        const search = url.searchParams.get('search');
        if (search === 'old') await new Promise((resolveOld) => { releaseOldQuote = resolveOld; });
        await fulfill({ items: search ? [quote(search === 'old' ? 'OLD-RESULT' : 'CURRENT-RESULT')] : [] });
        return;
      }
      if (url.pathname.startsWith('/api/quotes/')) {
        await fulfill({ ...quote(url.pathname.split('/').at(-1)), items: [] });
        return;
      }
      if (url.pathname === '/api/services') {
        await fulfill({ items: [] });
        return;
      }
      if (url.pathname === '/api/owners/synthetic-owner-1' || url.pathname === '/api/owners/synthetic-owner-2') {
        await fulfill({ id: url.pathname.split('/').at(-1), fullName: 'Maria Visual', contacts: [] });
        return;
      }
      if (url.pathname === '/api/patients/synthetic-patient-1' || url.pathname === '/api/patients/synthetic-patient-2') {
        await fulfill({ id: url.pathname.split('/').at(-1), name: 'Luna Visual', species: 'dog' });
        return;
      }
      await fulfill({ items: [], total: 0, setupRequired: false });
    });

    const interactions = [];
    try {
      await page.goto(`${origin}${target}`, { waitUntil: 'networkidle' });
      await page.locator(target === '/login' ? '#email' : '#main-content').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const measure = await page.evaluate(() => {
        const box = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
        return {
          viewport:{width:innerWidth,height:innerHeight}, route:location.pathname,
          title:document.title, documentWidth:document.documentElement.scrollWidth,
          documentHeight:document.documentElement.scrollHeight,
          headings:[...document.querySelectorAll('h1,h2,h3')].map(el=>({text:el.textContent.trim(),...box(el)})),
          mainCount:document.querySelectorAll('main,[role="main"]').length,
          firstData:[...document.querySelectorAll('tbody tr,.timeline-item,.owner-card,.bed-card')].slice(0,3).map(el=>({text:el.textContent.trim().slice(0,80),...box(el)})),
          fonts:{body:getComputedStyle(document.body).fontFamily,heading:document.querySelector('h1')?getComputedStyle(document.querySelector('h1')).fontFamily:null},
          scrollContainers:[...document.querySelectorAll('*')].filter(el=>el.clientWidth>0 && el.scrollWidth>el.clientWidth+2 && ['auto','scroll'].includes(getComputedStyle(el).overflowX)).map(el=>({class:el.className,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,...box(el)}))
        };
      });
      const stem = `${target.replaceAll('/','_')}-${width}-${theme}`;
      await page.screenshot({ path: join(out,stem+'-viewport.png'), fullPage:false });
      await page.screenshot({ path: join(out,stem+'-full.png'), fullPage:true });
      if (target === '/reception' && receptionPopulated) {
        const queueItem = page.locator('.queue-preview-row').first();
        await queueItem.waitFor();
        const firstQueueBox = await queueItem.boundingBox();
        assert.ok(firstQueueBox && firstQueueBox.y < 844, 'First queue item must start in the first viewport');
        await page.locator('#reception-query').fill('Maria');
        await page.getByRole('button', { name: 'Buscar', exact: true }).click();
        const result = page.locator('.result-row').filter({ hasText: 'Maria Sintética' }).first();
        await result.waitFor();
        const resultBox = await result.boundingBox();
        assert.ok(resultBox && resultBox.y < 844, 'First search result must start in the first viewport');
        const href = await result.getByRole('link', { name: 'Criar agendamento', exact: true }).getAttribute('href');
        assert.equal(new URL(href, origin).searchParams.get('ownerId'), 'synthetic-owner-1');
        await page.screenshot({ path: join(out, `reception-populated-${width}-${theme}.png`), fullPage: true });
        interactions.push({ test: 'reception-populated-search-and-queue', passed: true, firstQueueY: firstQueueBox.y, resultY: resultBox.y, schedulingHref: href });
      }
      if(target==='/owners/new' && width===1440 && theme==='light') {
        await page.locator('#fullName').fill('Pessoa Sintética Continuidade');
        await page.locator('#phone1').fill('1100000000');
        const documentRequests = [];
        page.on('request', (request) => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests.push(request.url()); });
        const agendaLink = page.locator('.sidebar__link').filter({ hasText: 'Agenda' }).first();
        await agendaLink.click();
        await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
        assert.equal(new URL(page.url()).pathname, '/owners/new');
        await page.screenshot({ path: join(out, 'owner-dirty-modal.png') });
        await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
        assert.equal(await page.locator('#fullName').inputValue(), 'Pessoa Sintética Continuidade');
        assert.equal(await page.locator('#phone1').inputValue(), '1100000000');
        interactions.push({ test: 'dirty-sidebar-continue', passed: true, preserved: ['fullName', 'phone1'] });
        await agendaLink.click();
        await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
        await page.waitForURL('**/appointments');
        assert.equal(documentRequests.length, 0);
        interactions.push({ test: 'dirty-sidebar-discard', passed: true, documentRequests: [...documentRequests] });
        await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('#fullName').inputValue(), '');
        documentRequests.length = 0;
        await page.getByRole('link', { name: 'Cancelar', exact: true }).first().click();
        await page.waitForURL('**/owners');
        await page.waitForLoadState('networkidle');
        assert.equal(documentRequests.length, 0);
        interactions.push({ test: 'clean-cancel-client-navigation', passed: true, documentRequests: [...documentRequests] });
      }
      if (target === '/owners/new') {
        await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
        await page.locator('#fullName').fill('Rascunho antes de sair');
        const sessionLabel = await page.locator('.topbar__profile').innerText();
        await page.getByRole('button', { name: 'Sair do sistema', exact: true }).click();
        await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
        await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
        assert.equal(new URL(page.url()).pathname, '/owners/new');
        assert.equal(await page.locator('#fullName').inputValue(), 'Rascunho antes de sair');
        assert.equal(await page.locator('.topbar__profile').innerText(), sessionLabel);
        await page.getByRole('button', { name: 'Sair do sistema', exact: true }).click();
        await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
        await page.waitForURL('**/login');
        await page.locator('#email').waitFor();
        assert.equal(await page.locator('#fullName').count(), 0);
        assert.equal(await page.getByRole('dialog', { name: 'Alterações não salvas' }).count(), 0);
        interactions.push({ test: 'logout-keeps-session-until-consent', passed: true, width, theme });
      }
      if (target === '/quotes') {
        const searchInput = page.getByPlaceholder('Buscar por ID, cliente, data, número ou observação');
        const oldRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get('search') === 'old');
        await searchInput.fill('old');
        await oldRequest;
        assert.equal(await searchInput.inputValue(), 'old');
        await searchInput.fill('current');
        await page.locator('tbody').getByText('CURRENT-RESULT', { exact: true }).waitFor();
        assert.equal(typeof releaseOldQuote, 'function');
        const oldResponse = page.waitForResponse((response) => new URL(response.url()).searchParams.get('search') === 'old');
        releaseOldQuote();
        await oldResponse;
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame))));
        assert.equal(await page.locator('tbody').getByText('OLD-RESULT', { exact: true }).count(), 0);
        assert.equal(await page.locator('tbody').getByText('CURRENT-RESULT', { exact: true }).count(), 1);
        assert.equal(await searchInput.inputValue(), 'current');
        interactions.push({ test: 'quotes-filter-old-after-current', passed: true, current: 'CURRENT-RESULT', discarded: 'OLD-RESULT' });
        await page.screenshot({ path: join(out, 'quotes-latest-response.png'), fullPage: true });
      }
      assert.deepEqual(errors, [], 'Unexpected browser page errors');
      rows.push({target,theme,...measure,stem,errors,requests,interactions});
    } catch (error) {
      failures.push({ target, theme, width, interactions, errors, requests, error: String(error.stack ?? error) });
      await page.screenshot({ path: join(out, `${target.replaceAll("/","_")}-${width}-${theme}-failure.png`), fullPage: true }).catch(() => {});
    }
    await context.close();
  }
} finally {
  await browser?.close();
  child.send('close');
  await new Promise((resolveExit) => {
    const timeout = setTimeout(() => child.kill('SIGTERM'), 10000);
    child.once('exit', () => { clearTimeout(timeout); resolveExit(); });
  });
  writeFileSync(join(out, 'server.log'), serverLog);
}

const after = pin();
const report = {
  scope: 'Read-only current frontend visual audit, synthetic responses and no backend claim',
  generatedAt: new Date().toISOString(),
  before, after, inputsStable: JSON.stringify(before) === JSON.stringify(after), rows, failures,
  harnessPath: 'docs/frontend/implementation/browser-continuity.mjs',
  harnessSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  limitations: [
    'Real SPA routes with synthetic auth, scheduling, quotes, owner, patient and service responses; no backend, RLS, persistence or UAT claim.',
    'Read-only source inspection; no CSS injection, code mutation, baseline update or snapshot promotion; collection responses are synthetic empty data except agenda and the controlled quotes race.',
    'DPR1 at 1440x900 and 390x844, light/dark, motion enabled. Sidebar/cancel/filter interactions on desktop/light; logout on all four viewport/theme combinations; not full route coverage.',
    'Vite development server, synthetic data, Chromium, desktop host and current date; not a production performance baseline or field INP evidence.',
    'No participant study: five priority-task completion rates, elapsed times, errors and shift-work observations remain unmeasured.'
  ]
};
writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ out, failures: failures.length, inputsStable: report.inputsStable, rows: rows.map(({target,theme,viewport,documentWidth,documentHeight,errors,interactions}) => ({target,theme,viewport,documentWidth,documentHeight,errors,interactions})) }, null, 2));
if (failures.length || !report.inputsStable) process.exitCode = 1;
}

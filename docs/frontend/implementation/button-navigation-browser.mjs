import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const app = join(root, 'apps/spa');
const buttonPath = 'packages/design-system/src/vue/DsButton.vue';
const require = createRequire(join(root, 'package.json'));
const spaRequire = createRequire(join(app, 'package.json'));
const { createServer } = await import(pathToFileURL(spaRequire.resolve('vite')));
const vue = spaRequire('@vitejs/plugin-vue').default;
const { chromium } = require('@playwright/test');
const files = [buttonPath, 'packages/design-system/src/tokens/variables.css'];
const hash = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
const pin = () => Object.fromEntries(files.map((path) => [path, hash(path)]));
const before = pin();
const outRoot = join(root, 'docs/frontend/implementation/evidence');
mkdirSync(outRoot, { recursive: true });
const out = mkdtempSync(join(outRoot, 'button-navigation-'));

const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { createApp, defineComponent, h, ref } from 'vue';
      import { createWebHistory, createRouter, RouterView } from 'vue-router';
      import DsButton from '/@fs/${resolve(root, buttonPath)}';
      import '/@fs/${resolve(root, files[1])}';

      const Home = defineComponent({ setup: () => () => h('p', { id: 'home-view' }, 'Tela inicial') });
      const Patients = defineComponent({ setup: () => () => h('p', { id: 'patients-view' }, 'Tela de pacientes') });
      const router = createRouter({
        history: createWebHistory('/clinic/'),
        routes: [
          { path: '/', component: Home },
          { path: '/patients', component: Patients }
        ]
      });
      const commands = ref(0);
      const submits = ref(0);
      const app = createApp({
        setup: () => () => h('main', { id: 'fixture' }, [
          h('h1', 'Contrato de navegação'),
          h(DsButton, { id: 'internal', to: '/patients?sort=name#active', onClick: () => commands.value++ }, () => 'Abrir pacientes'),
          h(DsButton, { id: 'native-internal', href: '/clinic/patients?href=1' }, () => 'Abrir href nativo'),
          h(DsButton, { id: 'modifier', to: '/patients?modifier=1' }, () => 'Preservar modificadores'),
          h(DsButton, { id: 'external', href: 'https://example.org/report' }, () => 'Abrir relatório'),
          h(DsButton, { id: 'popup', to: '/patients?popup=1', target: '_blank', rel: 'noopener' }, () => 'Abrir em nova aba'),
          h(DsButton, { id: 'download', href: '/clinic/report.csv', download: 'report.csv' }, () => 'Baixar relatório'),
          h(DsButton, { id: 'command', onClick: () => commands.value++ }, () => 'Executar comando'),
          h(DsButton, { id: 'disabled', to: '/patients', disabled: true }, () => 'Indisponível'),
          h('form', { id: 'fixture-form', onSubmit: (event) => { event.preventDefault(); submits.value++; } }, [
            h(DsButton, { id: 'default-submit', onClick: () => commands.value++ }, () => 'Ação padrão'),
            h(DsButton, { id: 'explicit-submit', type: 'submit' }, () => 'Enviar formulário')
          ]),
          h('output', { id: 'commands' }, String(commands.value)),
          h('output', { id: 'submits' }, String(submits.value)),
          h(RouterView)
        ])
      });
      app.use(router);
      app.mount('#app');
      await router.isReady();
      window.__fixtureRouter = router;
      window.__navigationEvents = {};
      document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[id]') : null;
        if (!target || !['internal', 'external', 'disabled', 'modifier'].includes(target.id)) return;
        const record = {
          defaultPreventedBeforeObserver: event.defaultPrevented,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          button: event.button
        };
        window.__navigationEvents[target.id] = record;
        if (target.id === 'modifier') {
          (window.__navigationEvents.modifierHistory ||= []).push(record);
          // The fixture observes that DsButton leaves modified clicks native,
          // then cancels the browser's actual navigation so each modifier can
          // be checked without leaving the SPA.
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            event.preventDefault();
          }
        }
      });
      document.addEventListener('auxclick', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[id]') : null;
        if (!target || target.id !== 'modifier') return;
        window.__navigationEvents.modifierAuxclick = {
          defaultPrevented: event.defaultPrevented,
          button: event.button
        };
        event.preventDefault();
      });
    </script>
  </body>
</html>`;

const server = await createServer({
  root: app,
  configFile: false,
  optimizeDeps: { entries: [], include: ['vue', 'vue-router'] },
  plugins: [
    vue(),
    {
      name: 'button-navigation-fixture',
      configureServer(viteServer) {
        viteServer.middlewares.use(async (request, response, next) => {
          const pathname = request.url?.split('?')[0] ?? '';
          if (pathname !== '/clinic' && !pathname.startsWith('/clinic/')) return next();
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(await viteServer.transformIndexHtml(request.url ?? '/clinic/', html));
        });
      }
    }
  ],
  resolve: { dedupe: ['vue', 'vue-router'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } }
});

const rows = [];
const errors = [];
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  const url = `http://127.0.0.1:${port}/clinic/`;
  browser = await chromium.launch({ headless: true });
  for (const width of [390, 1440]) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      await context.route('https://example.org/report', (route) => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body><p id="external-doc">Relatório externo</p></body></html>'
      }));
      const page = await context.newPage();
      const documentRequests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) {
          documentRequests.push(new URL(request.url()).href);
        }
      });
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate((value) => document.documentElement.setAttribute('data-theme', value), theme);
        await page.locator('#home-view').waitFor();
        documentRequests.length = 0;

        const internal = page.locator('#internal');
        assert.equal(await internal.getAttribute('href'), '/clinic/patients?sort=name#active');
        assert.equal(await page.locator('#native-internal').getAttribute('href'), '/clinic/patients?href=1');
        assert.equal(await page.locator('#download').getAttribute('download'), 'report.csv');
        assert.equal(await page.locator('#popup').getAttribute('target'), '_blank');
        assert.equal(await page.locator('#popup').getAttribute('rel'), 'noopener');

        await internal.focus();
        await page.keyboard.press('Enter');
        await page.locator('#patients-view').waitFor();
        assert.equal(await page.evaluate(() => window.__fixtureRouter.currentRoute.value.fullPath), '/patients?sort=name#active');
        assert.equal(await page.evaluate(() => window.__navigationEvents.internal.defaultPreventedBeforeObserver), true);
        assert.equal(await page.locator('#commands').textContent(), '1');
        assert.equal(documentRequests.length, 0);

        await page.goBack({ waitUntil: 'networkidle' });
        await page.locator('#home-view').waitFor();
        await internal.click();
        await page.locator('#patients-view').waitFor();
        assert.equal(await page.evaluate(() => window.__fixtureRouter.currentRoute.value.fullPath), '/patients?sort=name#active');
        assert.equal(await page.evaluate(() => window.__navigationEvents.internal.defaultPreventedBeforeObserver), true);
        assert.equal(await page.locator('#commands').textContent(), '2');
        assert.equal(documentRequests.length, 0);

        await page.goBack({ waitUntil: 'networkidle' });
        await page.locator('#home-view').waitFor();
        await page.goForward({ waitUntil: 'networkidle' });
        await page.locator('#patients-view').waitFor();
        assert.equal(await page.evaluate(() => window.__fixtureRouter.currentRoute.value.fullPath), '/patients?sort=name#active');
        assert.equal(documentRequests.length, 0);
        await page.goBack({ waitUntil: 'networkidle' });
        await page.locator('#home-view').waitFor();

        const popupPromise = context.waitForEvent('page');
        await page.locator('#popup').click();
        const popup = await popupPromise;
        popup.on('pageerror', (error) => errors.push(error.message));
        await popup.waitForLoadState('networkidle');
        await popup.locator('#patients-view').waitFor();
        assert.equal(new URL(popup.url()).pathname, '/clinic/patients');
        assert.equal(new URL(popup.url()).search, '?popup=1');
        await popup.close();

        const modifiedPopupPromise = context.waitForEvent('page');
        await internal.click({ modifiers: ['Control'] });
        const modifiedPopup = await modifiedPopupPromise;
        modifiedPopup.on('pageerror', (error) => errors.push(error.message));
        await modifiedPopup.waitForLoadState('networkidle');
        assert.equal(new URL(modifiedPopup.url()).pathname, '/clinic/patients');
        assert.equal(await page.evaluate(() => window.__navigationEvents.internal.ctrlKey), true);
        assert.equal(await page.evaluate(() => window.__navigationEvents.internal.defaultPreventedBeforeObserver), false);
        assert.equal(await page.evaluate(() => window.__fixtureRouter.currentRoute.value.fullPath), '/');
        assert.equal(documentRequests.length, 0);
        await modifiedPopup.close();

        const modifierInputs = [
          ['Alt', 'altKey'],
          ['Control', 'ctrlKey'],
          ['Meta', 'metaKey'],
          ['Shift', 'shiftKey']
        ];
        for (const [modifier, property] of modifierInputs) {
          await page.locator('#modifier').dispatchEvent('click', {
            [property]: true,
            button: 0,
            bubbles: true,
            cancelable: true
          });
          const event = await page.evaluate(() => window.__navigationEvents.modifier);
          assert.equal(event[property], true, `${modifier} modifier was not preserved`);
          assert.equal(event.defaultPreventedBeforeObserver, false);
        }
        await page.locator('#modifier').dispatchEvent('auxclick', {
          button: 1,
          bubbles: true,
          cancelable: true
        });
        assert.deepEqual(
          await page.evaluate(() => window.__navigationEvents.modifierAuxclick),
          { defaultPrevented: false, button: 1 }
        );
        assert.equal(await page.evaluate(() => window.__fixtureRouter.currentRoute.value.fullPath), '/');

        await page.locator('#disabled').click();
        assert.equal(await page.evaluate(() => window.__navigationEvents.disabled.defaultPreventedBeforeObserver), true);
        assert.equal(await page.evaluate(() => window.__fixtureRouter.currentRoute.value.fullPath), '/');
        assert.equal(await page.locator('#disabled').getAttribute('href'), null);
        assert.equal(documentRequests.length, 0);

        const externalPage = await context.newPage();
        externalPage.on('pageerror', (error) => errors.push(error.message));
        await externalPage.goto(url, { waitUntil: 'networkidle' });
        await externalPage.locator('#home-view').waitFor();
        await externalPage.locator('#external').click();
        await externalPage.locator('#external-doc').waitFor();
        assert.equal(externalPage.url(), 'https://example.org/report');
        await externalPage.close();

        await page.locator('#command').focus();
        await page.keyboard.press('Space');
        assert.equal(await page.locator('#commands').textContent(), '4');
        await page.locator('#default-submit').click();
        assert.equal(await page.locator('#commands').textContent(), '5');
        assert.equal(await page.locator('#submits').textContent(), '0');
        await page.locator('#explicit-submit').click();
        assert.equal(await page.locator('#submits').textContent(), '1');

        await page.screenshot({ path: join(out, `${width}-${theme}.png`), fullPage: true });
        rows.push({
          width,
          theme,
          internalHref: await internal.getAttribute('href'),
          internalRoute: '/patients?sort=name#active',
          history: 'createWebHistory + page.goBack/page.goForward',
          documentRequests: documentRequests.length,
          keyboardActivation: ['Enter', 'Space'],
          internalClickPrevented: true,
          modifiedClickPreserved: true,
          modifiedInputKeys: modifierInputs.map(([modifier]) => modifier),
          modifiedInputEvents: await page.evaluate(() => window.__navigationEvents.modifierHistory),
          auxclickPreserved: true,
          nativeInternalHref: await page.locator('#native-internal').getAttribute('href'),
          modifiedPopupPath: '/clinic/patients',
          popupTargetPath: '/clinic/patients?popup=1',
          externalNativeUrl: 'https://example.org/report',
          disabledDestinationRemoved: true,
          downloadAttribute: 'report.csv',
          defaultButtonSubmits: false,
          explicitSubmit: true
        });
      } finally {
        await page.close();
        await context.close();
      }
    }
  }
  assert.deepEqual(errors, []);
  const after = pin();
  assert.deepEqual(after, before);
  const report = {
    scope: 'Real DsButton navigation fixture in Chromium; no product API claim',
    generatedAt: new Date().toISOString(),
    harnessPath: 'docs/frontend/implementation/button-navigation-browser.mjs',
    harnessSha256: hash('docs/frontend/implementation/button-navigation-browser.mjs'),
    before,
    after,
    inputsStable: JSON.stringify(before) === JSON.stringify(after),
    rows,
    errors,
    limitations: [
      'Fixture uses createWebHistory under /clinic/ and Chromium DOM with real document requests, popup, external navigation, and browser back/forward; it does not claim production API, authentication, database, RLS, or UAT coverage.',
      'The external response is intercepted locally at example.org so the browser navigation is effective without depending on an external service.',
      'This report covers FEA-004 behavior only and does not promote the ticket or the global frontend objective.'
    ]
  };
  writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ out, rows: rows.length, errors: errors.length, inputsStable: report.inputsStable }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}

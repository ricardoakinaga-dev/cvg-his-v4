import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.cwd();
const baseUrl = process.env.CVG_LOGIN_BROWSER_URL ?? 'http://127.0.0.1:4174';
const require = createRequire(join(root, 'apps/spa/package.json'));
const { chromium } = require('@playwright/test');
const sourceFiles = [
  'apps/spa/src/pages/LoginPage.vue',
  'apps/spa/public/art/hospital-guarapiranga-logo.jpeg',
  'apps/spa/public/art/hospital-logo-poster.webp',
  'apps/spa/public/art/hospital-logo-loop.mp4'
];
const sha256 = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
const sourceHashes = Object.fromEntries(sourceFiles.map((path) => [path, sha256(path)]));
const rows = [];
const errors = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const width of [390, 1440]) {
    for (const theme of ['light', 'dark']) {
      for (const reducedMotion of [false, true]) {
        for (const networkMode of ['normal', 'save-data', '2g']) {
        const networkLimited = networkMode !== 'normal';
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          colorScheme: theme,
          reducedMotion: reducedMotion ? 'reduce' : 'no-preference'
        });
        await context.addInitScript((value) => {
          localStorage.setItem('cvg-his-v2:theme', value);
        }, theme);
        await context.addInitScript((mode) => {
          Object.defineProperty(navigator, 'connection', {
            configurable: true,
            value: {
              saveData: mode === 'save-data',
              effectiveType: mode === '2g' ? '2g' : '4g',
              addEventListener() {},
              removeEventListener() {}
            }
          });
        }, networkMode);
        await context.route('**/auth/refresh', (route) => route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'No session in fixture' })
        }));
        await context.route('**/auth/setup/status', (route) => route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ configured: true })
        }));
        const page = await context.newPage();
        const assetRequests = [];
        page.on('pageerror', (error) => errors.push(`${width}/${theme}/${reducedMotion}/${networkMode}: ${error.message}`));
        page.on('console', (message) => {
          if (message.type() !== 'error') return;
          // The fixture intentionally has no session; restoreSession handles
          // this 401 and clears local auth before the public login route mounts.
          if (message.text().includes('401 (Unauthorized)')) return;
          errors.push(`${width}/${theme}/${reducedMotion}/${networkMode}: ${message.text()}`);
        });
        page.on('request', (request) => {
          if (request.url().match(/\/art\/hospital-logo-(poster|loop)\./)) {
            assetRequests.push(request.url());
          }
        });

        await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
        await page.locator('.login-stage__media').waitFor();
        const media = page.locator('.login-stage__media');
        const poster = page.locator('.login-stage__poster');
        const video = page.locator('.login-stage__video');

        assert.equal(await media.getAttribute('data-visual-asset'), 'hospital-logo');
        assert.equal(await poster.getAttribute('src'), '/art/hospital-logo-poster.webp');
        assert.equal(await poster.getAttribute('width'), '720');
        assert.equal(await poster.getAttribute('height'), '720');
        assert.equal(
          assetRequests.some((url) => url.endsWith('/hospital-logo-loop.mp4')),
          !reducedMotion && !networkLimited
        );
        if (reducedMotion || networkLimited) {
            assert.equal(await video.count(), 0);
          assert.equal(await page.getByRole('button', { name: 'Animar logo 3D do hospital' }).count(), 1);
          assert.equal(await page.locator('button[aria-label="Reproduzir animação"]').count(), 0);
        } else {
          assert.equal(await video.count(), 1);
          assert.equal(await video.getAttribute('src'), '/art/hospital-logo-loop.mp4');
          assert.equal(await video.getAttribute('poster'), '/art/hospital-logo-poster.webp');
          assert.equal(await video.getAttribute('preload'), 'metadata');
        }

        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        assert.equal(await page.locator('h1').textContent(), 'Boas-vindas.');
        assert.equal(await page.locator('.login-card').count(), 1);
        assert.equal(await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1), true);
        assert.equal(assetRequests.some((url) => url.endsWith('/hospital-logo-poster.webp')), true);
        rows.push({
          viewport: { width, height: width === 390 ? 844 : 900 },
          width,
          theme,
          reducedMotion,
          networkMode,
          networkLimited,
          videoPresent: !reducedMotion && !networkLimited,
          errors: 0
        });
        await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}

assert.deepEqual(errors, []);
console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  baseUrl,
  rows,
  matrix: {
    widths: [390, 1440],
    themes: ['light', 'dark'],
    reducedMotion: [false, true],
    networkModes: ['normal', 'save-data', '2g'],
    videoPresentWithoutReducedMotionOrNetworkLimit: true,
    videoOmittedWithReducedMotion: true,
    videoOmittedOnConstrainedNetwork: true,
    posterRemainsAvailableInAllModes: true,
    documentOverflow: false,
    consoleErrors: 0
  },
  sourceHashes,
  reducedMotionContract: 'video omitted; poster and login remain available',
  constrainedNetworkContract: 'video omitted for Save-Data or 2G/slow-2G; poster and login remain available',
  scope: 'restored hospital logo on the FEA-016 login identity stage; not visual or product approval'
}, null, 2));

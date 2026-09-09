import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = process.cwd();
const packageJsonPath = join(root, 'packages/design-system/package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const sourceFiles = [
  'packages/design-system/stories/CvgPulseTokens.stories.ts',
  'packages/design-system/src/tokens/index.ts',
  'packages/design-system/src/themes/index.ts',
  'packages/design-system/src/tokens/variables.css',
  'packages/design-system/.storybook/main.ts',
  'packages/design-system/.storybook/preview.ts'
];
const sha256 = (path) => createHash('sha256').update(readFileSync(join(root, path))).digest('hex');
const pin = () => Object.fromEntries(sourceFiles.map((path) => [path, sha256(path)]));
const before = pin();
const evidenceRoot = join(root, 'docs/frontend/implementation/evidence');
mkdirSync(evidenceRoot, { recursive: true });
const outputDirectory = mkdtempSync(join(tmpdir(), 'cvg-his-v4-storybook-tokens-'));
const evidenceDirectory = mkdtempSync(join(evidenceRoot, 'cvg-pulse-tokens-'));
const buildCommand = 'pnpm --filter @cvg-his-v2/design-system exec storybook build';

const buildOutput = execFileSync(
  'pnpm',
  [
    '--filter',
    '@cvg-his-v2/design-system',
    'exec',
    'storybook',
    'build',
    '--output-dir',
    outputDirectory
  ],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
);

const indexPath = join(outputDirectory, 'index.json');
assert.equal(existsSync(indexPath), true, 'Storybook build did not emit index.json');
const storybookIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
const storyEntries = Object.values(storybookIndex.entries ?? {});
const story = storyEntries.find(
  (entry) =>
    entry.type === 'story' &&
    (/tokens\/cvg pulse/i.test(entry.title ?? '') || /cvg-pulse-tokens|CvgPulseTokens/i.test(`${entry.id ?? ''} ${entry.importPath ?? ''}`))
);
assert.ok(story, 'The CVG Pulse token story is not indexed by the real Storybook build');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};
const staticRoot = resolve(outputDirectory);
const staticServer = createServer((request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '') || 'index.html';
    const candidate = resolve(staticRoot, relativePath);
    if (candidate !== staticRoot && !candidate.startsWith(`${staticRoot}/`)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const filePath = candidate.endsWith('/') ? join(candidate, 'index.html') : candidate;
    const body = readFileSync(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream'
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

const require = createRequire(join(root, 'package.json'));
const { chromium } = require('@playwright/test');
const rows = [];
const errors = [];
const screenshots = [];

const parseRgb = (value) => {
  const match = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;
  const channels = match[1].split(',').map((channel) => Number.parseFloat(channel.trim()));
  if (channels.length < 3 || channels.slice(0, 3).some((channel) => !Number.isFinite(channel))) {
    return null;
  }
  const alpha = channels.length === 4 && Number.isFinite(channels[3]) ? channels[3] : 1;
  return { r: channels[0] / 255, g: channels[1] / 255, b: channels[2] / 255, alpha };
};
const composite = (foreground, background) => ({
  r: foreground.r * foreground.alpha + background.r * (1 - foreground.alpha),
  g: foreground.g * foreground.alpha + background.g * (1 - foreground.alpha),
  b: foreground.b * foreground.alpha + background.b * (1 - foreground.alpha),
  alpha: 1
});
const relativeLuminance = ({ r, g, b }) => {
  const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrastRatio = (foreground, background) => {
  const foregroundLum = relativeLuminance(foreground);
  const backgroundLum = relativeLuminance(background);
  return (Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05);
};

await new Promise((resolvePromise, reject) => {
  staticServer.once('error', reject);
  staticServer.listen(0, '127.0.0.1', resolvePromise);
});

const browser = await chromium.launch({ headless: true });
try {
  const port = staticServer.address().port;
  const storyUrl = `http://127.0.0.1:${port}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
  for (const width of [390, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      for (const reducedMotion of [false, true]) {
        const context = await browser.newContext({
          colorScheme: theme,
          reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
          viewport: { width, height: 1100 }
        });
        const page = await context.newPage();
        page.on('pageerror', (error) => errors.push(`${width}/${theme}/${reducedMotion}: ${error.message}`));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(`${width}/${theme}/${reducedMotion}: ${message.text()}`);
        });
        await page.goto(storyUrl, { waitUntil: 'networkidle' });
        const board = page.locator('[data-cvg-pulse-board]');
        await board.first().waitFor();
        await page.evaluate(async (value) => {
          document.documentElement.setAttribute('data-theme', value);
          await document.fonts?.ready;
        }, theme);

        assert.equal(await board.count(), 2, 'Expected explicit light and dark CVG Pulse boards');
        assert.equal(await page.locator(`[data-theme-board="${theme}"]`).count(), 1, `Missing ${theme} token board`);
        assert.equal(await page.locator(`[data-theme-board="${theme}"] [data-token-migration]`).count(), 1);
        assert.equal(await page.locator(`[data-theme-board="${theme}"] [data-tabular-sample]`).count(), 1);
        assert.equal(await page.locator(`[data-theme-board="${theme}"] [data-long-copy]`).count(), 1);
        assert.ok(await page.locator(`[data-theme-board="${theme}"] [data-contrast-pair]`).count() >= 3);
        assert.equal(await page.locator(`[data-theme-board="${theme}"] [data-motion-token]`).count(), 1);
        assert.equal(
          await page.locator(`[data-theme-board="${theme}"] [data-tabular-sample]`).evaluate(
            (element) => getComputedStyle(element).fontVariantNumeric.includes('tabular-nums')
          ),
          true,
          'Tabular sample is not using tabular numerals'
        );
        const longCopy = await page.locator(`[data-theme-board="${theme}"] [data-long-copy]`).textContent();
        assert.match(longCopy ?? '', /Atenção|Atenção clínica|Conciliação|não/);
        const motionDuration = await page
          .locator(`[data-theme-board="${theme}"] [data-motion-token]`)
          .evaluate((element) => getComputedStyle(element).getPropertyValue('--motion-duration-hover').trim());
        assert.equal(
          reducedMotion ? motionDuration === '0ms' : motionDuration !== '0ms',
          true,
          reducedMotion ? 'Reduced motion did not zero the motion token' : 'Motion token is unexpectedly zero'
        );

        const contrastPairs = await page.locator(`[data-theme-board="${theme}"] [data-contrast-pair]`).evaluateAll((elements) =>
          elements.map((element) => {
            const foregroundElement = element.querySelector('[data-contrast-foreground]') ?? element;
            let backgroundElement = element;
            let backgroundColor = '';
            while (backgroundElement && backgroundElement !== document.documentElement) {
              backgroundColor = getComputedStyle(backgroundElement).backgroundColor;
              if (backgroundColor && !/^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(backgroundColor)) break;
              backgroundElement = backgroundElement.parentElement;
            }
            return {
              backgroundColor,
              foregroundColor: getComputedStyle(foregroundElement).color,
              minimum: Number.parseFloat(element.getAttribute('data-contrast-minimum') ?? '4.5'),
              name: element.getAttribute('data-contrast-name') ?? ''
            };
          })
        );
        const measuredPairs = contrastPairs.map((pair) => {
          const foreground = parseRgb(pair.foregroundColor);
          const background = parseRgb(pair.backgroundColor);
          assert.ok(foreground, `Cannot parse foreground for ${pair.name}`);
          assert.ok(background, `Cannot parse background for ${pair.name}`);
          const ratio = contrastRatio(
            foreground.alpha < 1 ? composite(foreground, background) : foreground,
            background
          );
          assert.ok(pair.name, 'Contrast pair must have a stable name');
          assert.ok(ratio >= pair.minimum, `${pair.name} contrast ${ratio.toFixed(2)} < ${pair.minimum}`);
          return { ...pair, ratio: Number(ratio.toFixed(2)) };
        });
        const overflow = await page.evaluate(
          () => ({
            bodyScrollWidth: document.body.scrollWidth,
            documentScrollWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth
          })
        );
        assert.ok(overflow.bodyScrollWidth <= overflow.viewportWidth + 1, 'Token board overflows horizontally');
        assert.ok(overflow.documentScrollWidth <= overflow.viewportWidth + 1, 'Token document overflows horizontally');
        if (!reducedMotion && (width === 390 || width === 1440)) {
          const screenshotPath = join(evidenceDirectory, `${theme}-${width}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          screenshots.push(screenshotPath.replace(`${root}/`, ''));
        }
        rows.push({ viewport: { width, height: 1100 }, width, theme, reducedMotion, contrastPairs: measuredPairs, overflow, motionDuration });
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await new Promise((resolvePromise) => staticServer.close(resolvePromise));
}

assert.deepEqual(errors, []);
const after = pin();
assert.deepEqual(after, before, 'Token evidence inputs changed during capture');
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: 'Real Storybook CVG Pulse token board in Chromium; bounded visual and contrast evidence, not global FEA-009 approval',
  build: {
    command: `${buildCommand} --output-dir ${outputDirectory}`,
    status: 'passed',
    packageVersion: packageJson.version,
    storyId: story.id,
    buildOutputTail: buildOutput.trim().split('\n').slice(-8)
  },
  browser: {
    engine: 'Chromium headless via @playwright/test',
    rows,
    screenshots,
    pageErrors: errors,
    documentOverflow: false
  },
  sourceFingerprints: { before, after },
  inputsStable: true,
  limitations: [
    'The board is a real Storybook render and contrast calculation, not a manual review of every product page.',
    'Aptos availability and licensing still require product/legal confirmation; the CSS fallback stack is what the render exercises.',
    'This evidence does not certify UAT, assistive technology, real devices, backend behavior, or the full FEA-009 acceptance bar.'
  ]
};
writeFileSync(join(evidenceDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ evidenceDirectory, report: join(evidenceDirectory, 'report.json'), storyId: story.id, rows: rows.length }, null, 2));

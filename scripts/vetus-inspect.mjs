import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const BASE_URL = 'https://erp-beta.vetus.com.br/login';
const RUN_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', RUN_STAMP);
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'screenshots');
const HEADLESS = process.env.VETUS_INSPECT_HEADLESS !== '0';

const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();
const sanitizeFileName = (value) =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 80) || 'page';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function persistDebugSnapshot(page, fileBaseName) {
  const html = await page.content().catch(() => '');
  const summary = await collectPageSummary(page).catch(() => null);
  await fs.writeFile(path.join(ROOT_DIR, `${fileBaseName}.html`), html);
  if (summary) {
    await fs.writeFile(path.join(ROOT_DIR, `${fileBaseName}.json`), JSON.stringify(summary, null, 2));
  }
}

async function promptSecrets() {
  const rl = readline.createInterface({ input, output });
  try {
    const tenantId = normalizeText(await rl.question('Vetus ID: '));
    const username = normalizeText(await rl.question('Usuario: '));
    const password = await rl.question('Senha: ');
    return { tenantId, username, password };
  } finally {
    rl.close();
  }
}

async function waitForChallenge(page) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 90_000) {
    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (
      !/just a moment/i.test(title) &&
      !/Enable JavaScript and cookies to continue/i.test(bodyText)
    ) {
      return;
    }
    await page.waitForTimeout(1_500);
  }
}

async function tryFillByLabel(page, candidates, value) {
  for (const candidate of candidates) {
    const locator = page.getByLabel(candidate, { exact: false }).first();
    if (await locator.count()) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function tryFillBySelector(page, selectors, value) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      await locator.fill(value);
      return true;
    }
  }
  return false;
}

async function fillLogin(page, credentials) {
  const idFilled =
    (await tryFillByLabel(page, ['Vetus ID', 'ID', 'Empresa', 'Tenant'], credentials.tenantId)) ||
    (await tryFillBySelector(
      page,
      [
        'input[name*=tenant i]',
        'input[name*=company i]',
        'input[name*=clinic i]',
        'input[data-testid*=vetus-id i]',
        'input[placeholder*=Vetus i]',
        'input[placeholder*=ID i]',
        'input[type=text]'
      ],
      credentials.tenantId
    ));

  const userFilled =
    (await tryFillByLabel(page, ['Usuario', 'Usuário', 'Login', 'E-mail', 'Email'], credentials.username)) ||
    (await tryFillBySelector(
      page,
      [
        'input[data-testid*=username i]',
        'input[name*=user i]',
        'input[name*=login i]',
        'input[name*=email i]',
        'input[autocomplete=username]',
        'input[autocomplete=UserName]',
        'input[placeholder*=usuario i]',
        'input[placeholder*=usuário i]',
        'input[type=email]'
      ],
      credentials.username
    ));

  const passwordFilled =
    (await tryFillByLabel(page, ['Senha', 'Password'], credentials.password)) ||
    (await tryFillBySelector(
      page,
      ['input[data-testid*=password i]', 'input[type=password]', 'input[name*=senha i]', 'input[name*=password i]'],
      credentials.password
    ));

  if (!idFilled || !userFilled || !passwordFilled) {
    throw new Error(`Nao foi possivel localizar todos os campos de login. id=${idFilled} user=${userFilled} password=${passwordFilled}`);
  }
}

async function submitLogin(page) {
  const buttonTexts = ['Entrar', 'Acessar', 'Login', 'Continuar'];
  for (const text of buttonTexts) {
    const button = page.getByRole('button', { name: new RegExp(text, 'i') }).first();
    if (await button.count()) {
      await button.click();
      return;
    }
  }

  const submit = page.locator('button[type=submit], input[type=submit]').first();
  if (await submit.count()) {
    await submit.click();
    return;
  }

  await page.keyboard.press('Enter');
}

function stripUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl;
  }
}

async function collectPageSummary(page) {
  return await page.evaluate(() => {
    const visible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    const textOf = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const unique = (values) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

    const headings = unique(
      Array.from(document.querySelectorAll('h1, h2, h3'))
        .filter(visible)
        .map(textOf)
    );

    const tables = Array.from(document.querySelectorAll('table'))
      .filter(visible)
      .map((table) => ({
        headers: unique(Array.from(table.querySelectorAll('th')).map(textOf)),
        rowCount: table.querySelectorAll('tbody tr').length
      }))
      .filter((table) => table.headers.length || table.rowCount);

    const forms = Array.from(document.querySelectorAll('form'))
      .filter(visible)
      .map((form) => ({
        action: form.getAttribute('action'),
        method: (form.getAttribute('method') || 'get').toUpperCase(),
        fields: unique(
          Array.from(form.querySelectorAll('label, input, select, textarea'))
            .map((node) =>
              node.tagName === 'LABEL'
                ? textOf(node)
                : node.getAttribute('name') || node.getAttribute('placeholder') || node.getAttribute('aria-label') || ''
            )
        )
      }));

    const links = unique(
      Array.from(document.querySelectorAll('a[href]')).map((anchor) => {
        const text = textOf(anchor);
        const href = anchor.getAttribute('href') || '';
        return text || href ? `${text}|||${href}` : '';
      })
    ).map((entry) => {
      const [text, href] = entry.split('|||');
      return { text, href };
    });

    const buttons = unique(
      Array.from(document.querySelectorAll('button, [role=button], [role=menuitem]'))
        .filter(visible)
        .map(textOf)
    );

    const badges = unique(
      Array.from(document.querySelectorAll('[class*=badge], [class*=tag], [class*=chip], .status'))
        .filter(visible)
        .map(textOf)
    );

    const scripts = Array.from(document.scripts).map((script) => ({
      src: script.src || null,
      type: script.type || null,
      id: script.id || null
    }));

    const stylesheets = Array.from(document.querySelectorAll('link[rel=stylesheet]')).map((link) => link.href);
    const storage = {
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage)
    };

    return {
      url: window.location.href,
      title: document.title,
      headings,
      tables,
      forms,
      links,
      buttons,
      badges,
      scripts,
      stylesheets,
      storage,
      bodyTextSample: textOf(document.body).slice(0, 2000)
    };
  });
}

async function expandNavigation(page) {
  const expanded = await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const visible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
    };

    const candidates = Array.from(document.querySelectorAll('nav button, aside button, [aria-expanded], [data-bs-toggle], [class*=menu] button'))
      .filter(visible)
      .filter((el) => !/logout|sair/i.test((el.textContent || '').trim()));

    let clicked = 0;
    for (const el of candidates) {
      try {
        el.click();
        clicked += 1;
        await wait(150);
      } catch {
        // ignore non-clickable nodes
      }
    }
    return clicked;
  });

  await page.waitForTimeout(500);
  return expanded;
}

function buildRouteSet(pageSummary, origin) {
  const routes = new Set();
  for (const link of pageSummary.links) {
    const href = (link.href || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      continue;
    }
    if (/logout|sair/i.test(href) || /logout|sair/i.test(link.text || '')) {
      continue;
    }
    try {
      const url = new URL(href, origin);
      if (url.origin !== origin) {
        continue;
      }
      routes.add(url.pathname + url.search);
    } catch {
      // ignore invalid urls
    }
  }
  return [...routes].sort();
}

async function captureRoute(page, routePath, requestLog, responseLog) {
  const requestStart = requestLog.length;
  const responseStart = responseLog.length;

  await page.goto(new URL(routePath, page.url()).toString(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2_000);

  const summary = await collectPageSummary(page);
  const screenshotName = `${sanitizeFileName(routePath.replace(/[/?=&]/g, '-'))}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName), fullPage: true });

  return {
    routePath,
    summary,
    screenshot: path.join('screenshots', screenshotName),
    requestSample: requestLog.slice(requestStart).slice(0, 50),
    responseSample: responseLog.slice(responseStart).slice(0, 50)
  };
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);
  const credentials = await promptSecrets();

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: 'pt-BR',
    viewport: { width: 1600, height: 1200 }
  });
  const page = await context.newPage();

  const requestLog = [];
  const responseLog = [];

  page.on('request', (request) => {
    requestLog.push({
      url: stripUrl(request.url()),
      method: request.method(),
      resourceType: request.resourceType(),
      navigation: request.isNavigationRequest(),
      timestamp: new Date().toISOString()
    });
  });

  page.on('response', async (response) => {
    const request = response.request();
    responseLog.push({
      url: stripUrl(response.url()),
      method: request.method(),
      status: response.status(),
      resourceType: request.resourceType(),
      timestamp: new Date().toISOString()
    });
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForChallenge(page);
  await page.waitForTimeout(2_000);

  const loginBefore = await collectPageSummary(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-login.png'), fullPage: true });
  await persistDebugSnapshot(page, '00-login');

  await fillLogin(page, credentials);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-login-filled.png'), fullPage: true });
  await submitLogin(page);
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(6_000);
  await waitForChallenge(page);
  await page.waitForTimeout(4_000);

  const postLogin = await collectPageSummary(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-post-login.png'), fullPage: true });
  await persistDebugSnapshot(page, '02-post-login');
  const expandedCount = await expandNavigation(page);
  const shellSummary = await collectPageSummary(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-shell-expanded.png'), fullPage: true });

  const origin = new URL(page.url()).origin;
  const routes = buildRouteSet(shellSummary, origin);
  const routeReports = [];

  for (const route of routes.slice(0, 40)) {
    try {
      routeReports.push(await captureRoute(page, route, requestLog, responseLog));
    } catch (error) {
      routeReports.push({
        routePath: route,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const artifacts = {
    runStamp: RUN_STAMP,
    baseUrl: BASE_URL,
    finalUrl: page.url(),
    expandedCount,
    loginBefore,
    postLogin,
    shellSummary,
    routes,
    routeReports,
    cookies: (await context.cookies()).map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly
    })),
    requests: requestLog,
    responses: responseLog
  };

  await fs.writeFile(path.join(ROOT_DIR, 'artifacts.json'), JSON.stringify(artifacts, null, 2));
  await browser.close();

  output.write(`Artifacts salvos em ${ROOT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

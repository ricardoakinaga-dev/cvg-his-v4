import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const LOGIN_URL = 'https://erp-beta.vetus.com.br/login';
const ROOT_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', `${ROOT_STAMP}-agenda`);
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'screenshots');
const HEADLESS = process.env.VETUS_INSPECT_HEADLESS !== '0';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function promptSecrets() {
  const rl = readline.createInterface({ input, output });
  try {
    const tenantId = (await rl.question('Vetus ID: ')).trim();
    const username = (await rl.question('Usuario: ')).trim();
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
    if (!/just a moment/i.test(title) && !/verificação de segurança|enable javascript and cookies/i.test(bodyText)) {
      return;
    }
    await page.waitForTimeout(1500);
  }
}

async function login(page, credentials) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForChallenge(page);
  await page.waitForTimeout(2000);
  await page.locator('input[data-testid="input-vetus-id"]').fill(credentials.tenantId);
  await page.locator('input[data-testid="input-username"]').fill(credentials.username);
  await page.locator('input[data-testid="input-password"]').fill(credentials.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(6000);
}

async function collectSummary(page) {
  return await page.evaluate(() => {
    const text = (el) => (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
    const uniq = (arr) => [...new Set(arr.map((v) => v.trim()).filter(Boolean))];
    const visibleText = text(document.body);
    return {
      url: window.location.href,
      title: document.title,
      headings: uniq(Array.from(document.querySelectorAll('h1, h2, h3')).map(text)),
      buttons: uniq(Array.from(document.querySelectorAll('button, [role=button], a')).map(text)).slice(0, 250),
      forms: Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        placeholder: el.getAttribute('placeholder'),
        testid: el.getAttribute('data-testid')
      })),
      tableHeaders: uniq(Array.from(document.querySelectorAll('th')).map(text)),
      bodyText: visibleText.slice(0, 15000)
    };
  });
}

async function dump(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
  await fs.writeFile(path.join(ROOT_DIR, `${name}.html`), await page.content());
  await fs.writeFile(path.join(ROOT_DIR, `${name}.json`), JSON.stringify(await collectSummary(page), null, 2));
}

async function clickMaybe(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.count()) {
    try {
      await locator.click({ timeout: 2000 });
      await page.waitForTimeout(1200);
    } catch {
      // ignore hidden duplicates
    }
  }
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

  const requests = [];
  const responses = [];

  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      ts: new Date().toISOString()
    });
  });

  page.on('response', (response) => {
    responses.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      ts: new Date().toISOString()
    });
  });

  await login(page, credentials);
  await page.goto('https://erp-beta.vetus.com.br/agenda', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(3000);
  await dump(page, 'agenda-geral');

  await clickMaybe(page, 'main >> text="Filtrar por..."');
  await clickMaybe(page, 'main >> text="Limpar filtros"');
  await dump(page, 'agenda-filtros');

  for (const label of ['Mês', 'Semana', 'Dia', 'Hoje']) {
    await clickMaybe(page, `main >> text="${label}"`);
    await dump(page, `agenda-${label.toLowerCase()}`);
  }

  const artifact = {
    finalUrl: page.url(),
    dorylusRequests: requests
      .filter((r) => r.url.includes('dorylus.vetus.com.br'))
      .map((r) => ({ method: r.method, url: r.url, resourceType: r.resourceType, ts: r.ts })),
    dorylusResponses: responses
      .filter((r) => r.url.includes('dorylus.vetus.com.br'))
      .map((r) => ({ method: r.method, url: r.url, status: r.status, resourceType: r.resourceType, ts: r.ts }))
  };

  await fs.writeFile(path.join(ROOT_DIR, 'network.json'), JSON.stringify(artifact, null, 2));

  await browser.close();
  output.write(`Artifacts salvos em ${ROOT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

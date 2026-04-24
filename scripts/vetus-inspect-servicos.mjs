import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const LOGIN_URL = 'https://erp-beta.vetus.com.br/login';
const SERVICES_URL = 'https://erp.vetus.com.br/Sistema/Cadastros/Servicos.htm';
const ROOT_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', `${ROOT_STAMP}-servicos`);
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'screenshots');
const HEADLESS = process.env.VETUS_INSPECT_HEADLESS !== '0';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function promptSecrets() {
  if (process.env.VETUS_ID && process.env.VETUS_USER && process.env.VETUS_PASS) {
    return {
      tenantId: process.env.VETUS_ID,
      username: process.env.VETUS_USER,
      password: process.env.VETUS_PASS
    };
  }
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
  await waitForChallenge(page);
  const hasLoginForm = await page.locator('input[data-testid="input-vetus-id"]').count();
  if (!hasLoginForm) {
    return;
  }
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
    const links = Array.from(document.querySelectorAll('a')).map((el) => ({
      text: text(el),
      href: el.getAttribute('href'),
      onclick: el.getAttribute('onclick')
    }));
    return {
      url: window.location.href,
      title: document.title,
      headings: uniq(Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(text)),
      buttons: uniq(Array.from(document.querySelectorAll('button, input[type=button], input[type=submit], [role=button], a')).map(text)).slice(0, 300),
      forms: Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        value: ['password', 'hidden'].includes((el.getAttribute('type') || '').toLowerCase()) ? null : el.getAttribute('value')
      })),
      tableHeaders: uniq(Array.from(document.querySelectorAll('th')).map(text)),
      links: links.slice(0, 400),
      bodyText: text(document.body).slice(0, 20000)
    };
  });
}

async function dump(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
  await fs.writeFile(path.join(ROOT_DIR, `${name}.html`), await page.content());
  await fs.writeFile(path.join(ROOT_DIR, `${name}.json`), JSON.stringify(await collectSummary(page), null, 2));
}

async function dumpState(page, name) {
  const state = {
    url: page.url(),
    title: await page.title().catch(() => ''),
    bodyText: await page.locator('body').innerText().catch(() => '')
  };
  await fs.writeFile(path.join(ROOT_DIR, `${name}.json`), JSON.stringify(state, null, 2));
}

async function openFirstDetail(page) {
  const link = page.locator('a').filter({
    hasText: /alterar|editar|detalhes|visualizar|consultar/i
  }).first();

  if (await link.count()) {
    await link.click({ timeout: 5_000 });
    return true;
  }

  const jsLink = page.locator('a[onclick*="Servico"], a[onclick*="servico"], a[href*="Servico"], a[href*="servico"]').first();
  if (await jsLink.count()) {
    await jsLink.click({ timeout: 5_000 });
    return true;
  }

  return false;
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

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await login(page, credentials);
  await dumpState(page, 'estado-pos-login');

  try {
    await page.goto(SERVICES_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch {
    // dump current page even when the legacy page is slow or keeps pending resources open
  }
  await waitForChallenge(page);
  if (page.url().includes('/login?returnUrl=')) {
    await login(page, credentials);
    await waitForChallenge(page);
  }
  await page.waitForTimeout(5000);
  await dumpState(page, 'estado-servicos');
  await dump(page, 'servicos-lista');

  const beforeDetailReq = requests.length;
  const beforeDetailRes = responses.length;
  const opened = await openFirstDetail(page).catch(() => false);

  if (opened) {
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3500);
    await dumpState(page, 'estado-servicos-detalhe');
    await dump(page, 'servicos-detalhe');
  }

  const artifact = {
    finalUrl: page.url(),
    detailOpened: opened,
    requests,
    responses,
    detailRequests: requests.slice(beforeDetailReq),
    detailResponses: responses.slice(beforeDetailRes)
  };

  await fs.writeFile(path.join(ROOT_DIR, 'network.json'), JSON.stringify(artifact, null, 2));

  await browser.close();
  output.write(`Artifacts salvos em ${ROOT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

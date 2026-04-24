import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const LOGIN_URL = 'https://erp-beta.vetus.com.br/login';
const BETA_SALES_URL = 'https://erp-beta.vetus.com.br/vendas';
const LEGACY_SALES_URL = 'https://erp.vetus.com.br/Sistema/Atendimento/Vendas.htm';
const ROOT_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', `${ROOT_STAMP}-vendas`);
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

async function waitForChallenge(page, maxMs = 90_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxMs) {
    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (!/just a moment|um momento/i.test(title) && !/verificação de segurança|enable javascript and cookies/i.test(bodyText)) {
      return;
    }
    await page.waitForTimeout(1500);
  }
}

async function loginIfPresent(page, credentials) {
  await waitForChallenge(page);
  const hasLoginForm = await page.locator('input[data-testid="input-vetus-id"]').count();
  if (!hasLoginForm) return;
  await page.waitForTimeout(1500);
  await page.locator('input[data-testid="input-vetus-id"]').fill(credentials.tenantId);
  await page.locator('input[data-testid="input-username"]').fill(credentials.username);
  await page.locator('input[data-testid="input-password"]').fill(credentials.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(7000);
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
      bodyText: text(document.body).slice(0, 30000)
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

async function clickFirst(locator) {
  if (await locator.count()) {
    await locator.first().click({ timeout: 5000 });
    return true;
  }
  return false;
}

async function openFirstBetaDetail(page) {
  const candidates = [
    page.getByText(/ver venda/i),
    page.locator('main a').filter({ hasText: /detalhe|detalhes|visualizar|abrir/i }),
    page.locator('[data-testid*="sale"], [data-testid*="card"]').filter({ hasText: /\bR\$/i })
  ];

  for (const candidate of candidates) {
    try {
      if (await clickFirst(candidate)) return true;
    } catch {
      // keep trying other selectors
    }
  }
  return false;
}

async function openFirstLegacyDetail(page) {
  const candidates = [
    page.locator('a').filter({ hasText: /abrir|alterar|editar|detalhes|visualizar|consultar/i }),
    page.locator('a[onclick*="Venda"], a[onclick*="venda"], a[href*="Venda"], a[href*="venda"]'),
    page.locator('img[title*="Abrir"], img[title*="Alterar"], img[title*="Editar"]')
  ];

  for (const candidate of candidates) {
    try {
      if (await clickFirst(candidate)) return true;
    } catch {
      // keep trying other selectors
    }
  }
  return false;
}

async function goToLegacy(page, credentials) {
  try {
    await page.goto(LEGACY_SALES_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  } catch {
    // continue with whatever page is loaded
  }
  await waitForChallenge(page);
  if (page.url().includes('/login?returnUrl=')) {
    await loginIfPresent(page, credentials);
    await waitForChallenge(page);
  }
  await page.waitForTimeout(5000);
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
  await loginIfPresent(page, credentials);
  await dumpState(page, 'estado-pos-login');

  await page.goto(BETA_SALES_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  await waitForChallenge(page);
  await page.waitForTimeout(3000);
  await dump(page, 'vendas-beta-lista');

  const beforeBetaDetailReq = requests.length;
  const beforeBetaDetailRes = responses.length;
  const betaDetailOpened = await openFirstBetaDetail(page).catch(() => false);
  if (betaDetailOpened) {
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await dump(page, 'vendas-beta-detalhe');
  }

  const beforeLegacyReq = requests.length;
  const beforeLegacyRes = responses.length;
  await goToLegacy(page, credentials);
  await dumpState(page, 'estado-vendas-legacy');
  await dump(page, 'vendas-legacy-lista');

  const beforeLegacyDetailReq = requests.length;
  const beforeLegacyDetailRes = responses.length;
  const legacyDetailOpened = await openFirstLegacyDetail(page).catch(() => false);
  if (legacyDetailOpened) {
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3500);
    await dumpState(page, 'estado-vendas-legacy-detalhe');
    await dump(page, 'vendas-legacy-detalhe');
  }

  const artifact = {
    finalUrl: page.url(),
    betaDetailOpened,
    legacyDetailOpened,
    betaRequests: requests.slice(0, beforeLegacyReq),
    betaResponses: responses.slice(0, beforeLegacyRes),
    betaDetailRequests: requests.slice(beforeBetaDetailReq, beforeLegacyReq),
    betaDetailResponses: responses.slice(beforeBetaDetailRes, beforeLegacyRes),
    legacyRequests: requests.slice(beforeLegacyReq),
    legacyResponses: responses.slice(beforeLegacyRes),
    legacyDetailRequests: requests.slice(beforeLegacyDetailReq),
    legacyDetailResponses: responses.slice(beforeLegacyDetailRes)
  };

  await fs.writeFile(path.join(ROOT_DIR, 'network.json'), JSON.stringify(artifact, null, 2));

  await browser.close();
  output.write(`Artifacts salvos em ${ROOT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

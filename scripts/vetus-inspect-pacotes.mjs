import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const LOGIN_URL = 'https://erp-beta.vetus.com.br/login';
const PACKAGES_URL = 'https://erp-beta.vetus.com.br/pacotes';
const ROOT_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', `${ROOT_STAMP}-pacotes`);
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
    return {
      url: window.location.href,
      title: document.title,
      headings: uniq(Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(text)),
      buttons: uniq(Array.from(document.querySelectorAll('button, input[type=button], input[type=submit], [role=button], a')).map(text)).slice(0, 350),
      forms: Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
        tag: el.tagName,
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        value: ['password', 'hidden'].includes((el.getAttribute('type') || '').toLowerCase()) ? null : el.getAttribute('value')
      })),
      tableHeaders: uniq(Array.from(document.querySelectorAll('th')).map(text)),
      bodyText: text(document.body).slice(0, 40000)
    };
  });
}

async function dump(page, name) {
  try {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${name}.png`),
      fullPage: true,
      timeout: 120_000
    });
  } catch {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${name}.png`),
      fullPage: false,
      timeout: 30_000
    });
  }
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

async function openFirstDetail(page) {
  const candidates = [
    page.getByText(/ver detalhes|detalhes|visualizar|abrir/i),
    page.locator('main a').filter({ hasText: /detalhes|visualizar|abrir/i }),
    page.locator('button').filter({ hasText: /detalhes|pagar|serviços|observações/i })
  ];

  for (const candidate of candidates) {
    try {
      if (await clickFirst(candidate)) return true;
    } catch {
      // continue
    }
  }
  return false;
}

async function clickMaybe(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.count()) {
    try {
      await locator.click({ timeout: 2500 });
      await page.waitForTimeout(1500);
      return true;
    } catch {
      // ignore
    }
  }
  return false;
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);
  const credentials = await promptSecrets();
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors']
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

  await page.goto(PACKAGES_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => {});
  await waitForChallenge(page);
  await page.waitForTimeout(4000);
  await dump(page, 'pacotes-lista');

  await clickMaybe(page, 'main >> text="Filtrar"');
  await dump(page, 'pacotes-filtros');

  const beforeDetailReq = requests.length;
  const beforeDetailRes = responses.length;
  const detailOpened = await openFirstDetail(page).catch(() => false);

  let extraActions = [];
  if (detailOpened) {
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await dumpState(page, 'estado-pacotes-detalhe');
    await dump(page, 'pacotes-detalhe');

    for (const label of ['Serviços', 'Observações', 'Pagar', 'Sessões']) {
      const clicked = await clickMaybe(page, `text="${label}"`);
      if (clicked) {
        extraActions.push(label);
        await dump(page, `pacotes-${label.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`);
      }
    }
  }

  const artifact = {
    finalUrl: page.url(),
    detailOpened,
    extraActions,
    allRequests: requests,
    allResponses: responses,
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

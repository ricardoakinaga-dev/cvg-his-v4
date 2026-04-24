import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const LOGIN_URL = 'https://erp-beta.vetus.com.br/login';
const HEMOGRAMAS_URL = 'https://erp.vetus.com.br/Sistema/Laboratorio/Hemogramas.htm';
const ROOT_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', `${ROOT_STAMP}-hemogramas`);
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
      buttons: uniq(Array.from(document.querySelectorAll('button, input[type=button], input[type=submit], [role=button], a')).map(text)).slice(0, 500),
      forms: Array.from(document.querySelectorAll('form')).map((form) => ({
        id: form.id || null,
        action: form.getAttribute('action'),
        fields: Array.from(form.querySelectorAll('input, select, textarea')).map((el) => ({
          tag: el.tagName,
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.getAttribute('id'),
          placeholder: el.getAttribute('placeholder'),
          value: ['password', 'hidden'].includes((el.getAttribute('type') || '').toLowerCase()) ? null : el.getAttribute('value')
        }))
      })),
      tableHeaders: uniq(Array.from(document.querySelectorAll('th')).map(text)),
      bodyText: text(document.body).slice(0, 50000)
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

async function goToUrl(page, url, credentials) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch {
    // continue
  }

  await waitForChallenge(page);
  if (page.url().includes('/login?returnUrl=')) {
    await loginIfPresent(page, credentials);
    await waitForChallenge(page);
  }
  await page.waitForTimeout(5000);
}

async function clickOpenCandidate(page) {
  const candidates = [
    page.getByRole('link', { name: /abrir/i }).first(),
    page.getByRole('button', { name: /abrir/i }).first(),
    page.getByText(/abrir/i).first(),
    page.locator('a[title*="Abrir"], button[title*="Abrir"]').first()
  ];

  for (const target of candidates) {
    try {
      await target.click({ timeout: 3000 });
      await page.waitForTimeout(4000);
      return true;
    } catch {
      // continue
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
  const actions = [];

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

  await goToUrl(page, HEMOGRAMAS_URL, credentials);
  await dumpState(page, 'estado-hemogramas');
  await dump(page, 'hemogramas-lista');

  const opened = await clickOpenCandidate(page);
  if (opened) {
    actions.push({ action: 'abrir-primeiro-registro', finalUrl: page.url() });
    await dump(page, 'hemogramas-detalhe');
  }

  const artifact = {
    finalUrl: page.url(),
    actions,
    allRequests: requests,
    allResponses: responses
  };

  await fs.writeFile(path.join(ROOT_DIR, 'network.json'), JSON.stringify(artifact, null, 2));

  await browser.close();
  output.write(`Artifacts salvos em ${ROOT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

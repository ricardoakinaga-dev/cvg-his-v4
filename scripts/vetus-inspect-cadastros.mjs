import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from '@playwright/test';

const ROOT_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const ROOT_DIR = path.resolve('docs/vetus/inspection', `${ROOT_STAMP}-cadastros`);
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'screenshots');
const HEADLESS = process.env.VETUS_INSPECT_HEADLESS !== '0';
const LOGIN_URL = 'https://erp-beta.vetus.com.br/login';

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
    const buttons = uniq(Array.from(document.querySelectorAll('button, [role=button], a')).map(text));
    const headings = uniq(Array.from(document.querySelectorAll('h1, h2, h3')).map(text));
    const sections = uniq(Array.from(document.querySelectorAll('section, article, .p-card, .accordion, .card, [class*=section]')).map(text).filter(Boolean)).slice(0, 80);
    const forms = Array.from(document.querySelectorAll('input, select, textarea')).map((el) => ({
      tag: el.tagName,
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      placeholder: el.getAttribute('placeholder'),
      testid: el.getAttribute('data-testid')
    }));
    return {
      url: window.location.href,
      title: document.title,
      headings,
      buttons,
      sections,
      forms,
      bodyText: text(document.body).slice(0, 6000)
    };
  });
}

async function dump(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
  await fs.writeFile(path.join(ROOT_DIR, `${name}.html`), await page.content());
  await fs.writeFile(path.join(ROOT_DIR, `${name}.json`), JSON.stringify(await collectSummary(page), null, 2));
}

async function openFirst(page, labelRegex) {
  const link = page.getByText(labelRegex).first();
  await link.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2500);
}

async function clickIfExists(page, selector) {
  const locator = page.locator(selector).first();
  if (await locator.count()) {
    try {
      await locator.click({ timeout: 2000 });
      await page.waitForTimeout(1200);
    } catch {
      // Ignore same-text controls from hidden menu regions or collapsed duplicates.
    }
  }
}

async function inspectAnimais(page) {
  await page.goto('https://erp-beta.vetus.com.br/cadastro/animais', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);
  await dump(page, 'animais-lista');

  await clickIfExists(page, 'main >> text="Informações do cliente"');
  await dump(page, 'animais-lista-expandida');

  await page.getByText(/detalhes/i).first().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await dump(page, 'animais-detalhe');

  const expanders = [
    'main >> text="Ver mais Informações do Animal"',
    'main >> text="Ver Informações de Contato"',
    'main >> text="Últimos Atendimentos"',
    'main >> text="Anamneses"',
    'main >> text="Vacinas e Vermífugos"',
    'main >> text="Agenda"',
    'main >> text="Exames"',
    'main >> text="Internação"',
    'main >> text="Receituário"',
    'main >> text="Gráfico de peso"',
    'main >> text="Imagens"',
    'main >> text="Histórico Clinico"',
    'main >> text="Histórico Clínico"'
  ];

  for (const selector of expanders) {
    await clickIfExists(page, selector);
  }
  await dump(page, 'animais-detalhe-expandido');
}

async function inspectClientes(page) {
  await page.goto('https://erp-beta.vetus.com.br/cadastro/clientes', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(2500);
  await dump(page, 'clientes-lista');

  await clickIfExists(page, 'main >> text="Informações de Contato"');
  await clickIfExists(page, 'main >> text="Animais do Cliente"');
  await dump(page, 'clientes-lista-expandida');

  await page.getByText(/detalhes/i).first().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await dump(page, 'clientes-detalhe');

  const expanders = [
    'main >> text="Identificação do Cliente"',
    'main >> text="Informações de Contato"',
    'main >> text="Documentação do Cliente"',
    'main >> text="Animais Cadastrados"',
    'main >> text="Resgate de Pontos"',
    'main >> text="Pacotes"',
    'main >> text="Live Animal e Live Lab"',
    'main >> text="Orçamentos"',
    'main >> text="Agenda"',
    'main >> text="Situação Financeira"'
  ];

  for (const selector of expanders) {
    await clickIfExists(page, selector);
  }
  await dump(page, 'clientes-detalhe-expandido');
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

  await login(page, credentials);
  await inspectAnimais(page);
  await inspectClientes(page);

  await browser.close();
  output.write(`Artifacts salvos em ${ROOT_DIR}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

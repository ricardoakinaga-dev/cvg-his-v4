import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const RUN_ID = `${Date.now()}`;
const PASSWORD = 'CvgMaster!2026';

const roles = [
  { role: 'admin', department: 'administrativo', name: 'Administrador', route: '/users' },
  { role: 'veterinarian', department: 'clinica_geral', name: 'Veterinario', route: '/encounters' },
  { role: 'nurse', department: 'uti_veterinaria', name: 'Enfermeiro', route: '/triage' },
  { role: 'reception', department: 'recepcao', name: 'Recepcao', route: '/reception' }
] as const;

async function login(page: Page, username = 'admin', password = 'seed_admin') {
  await page.goto(`${SPA_URL}/login`, { waitUntil: 'domcontentloaded' });
  if (!page.url().includes('/login')) return;
  await page.locator('#email').fill(username);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe('Cadastros fictícios e perfis operacionais via interface', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      viewport: { width: 1440, height: 900 }
    });
    page = await context.newPage();
    await login(page);
  });

  for (const profile of roles) {
    test(`cria conta fictícia de ${profile.name} pela UI`, async () => {
      const username = `master_${profile.role}_${RUN_ID}`;
      await page.goto(`${SPA_URL}/users/new`, { waitUntil: 'networkidle' });
      await page.getByLabel('Nome Completo').fill(`Teste Master ${profile.name} ${RUN_ID}`);
      await page.getByLabel('E-mail').fill(`${username}@cvg.test`);
      await page.getByLabel('Usuário (login)').fill(username);
      await page.getByLabel('Setor').selectOption(profile.department);
      await page.getByLabel('Perfil (Role)').selectOption(profile.role);
      await page.getByLabel('Cargo/Função').fill(profile.name);
      await page.locator('#password').fill(PASSWORD);
      await page.locator('#passwordConfirm').fill(PASSWORD);
      await page.getByRole('button', { name: 'Salvar Usuário' }).click();
      await expect(page.getByText('Usuário criado com sucesso!')).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveURL(/\/users\/[^/]+$/, { timeout: 15_000 });
    });
  }

  test('filtra e confere os quatro perfis na planilha de usuários', async () => {
    await page.goto(`${SPA_URL}/users`, { waitUntil: 'networkidle' });
    const search = page.getByPlaceholder('Buscar por nome, usuário ou e-mail');
    await search.fill(RUN_ID);
    const table = page.getByRole('table', { name: 'Lista de usuários do sistema' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(5);
    for (const profile of roles) {
      await expect(table).toContainText(`Teste Master ${profile.name} ${RUN_ID}`);
    }
  });

  for (const profile of roles) {
    test(`autentica como ${profile.name} e abre sua superfície principal`, async ({ browser }) => {
      const username = `master_${profile.role}_${RUN_ID}`;
      const profileContext = await browser.newContext({
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        viewport: { width: 1280, height: 720 }
      });
      const profilePage = await profileContext.newPage();
      try {
        await login(profilePage, username, PASSWORD);
        await profilePage.goto(`${SPA_URL}${profile.route}`, { waitUntil: 'networkidle' });
        await expect(profilePage).not.toHaveURL(/\/login/);
        await expect(profilePage.locator('main').first()).toBeVisible();
        await expect(profilePage.getByRole('heading').first()).toBeVisible();
      } finally {
        await profileContext.close();
      }
    });
  }

  for (const professional of [
    {
      code: `VET-${RUN_ID}`,
      name: `Profissional Veterinario ${RUN_ID}`,
      department: 'Clinica',
      job: 'Medico Veterinario'
    },
    {
      code: `ENF-${RUN_ID}`,
      name: `Profissional Enfermeiro ${RUN_ID}`,
      department: 'Internacao',
      job: 'Enfermeiro Veterinario'
    }
  ]) {
    test(`cadastra ${professional.job} como profissional pela UI`, async () => {
      await page.goto(`${SPA_URL}/staff/new`, { waitUntil: 'networkidle' });
      await page.getByLabel('Código do Funcionário').fill(professional.code);
      await page.getByLabel('Nome Completo').fill(professional.name);
      await page.getByLabel('Departamento').fill(professional.department);
      await page.getByLabel('Cargo').fill(professional.job);
      await page.getByRole('button', { name: 'Cadastrar' }).click();
      await expect(page.getByText('Membro cadastrado com sucesso.')).toBeVisible({
        timeout: 15_000
      });
      await expect(page).toHaveURL(/\/staff$/, { timeout: 15_000 });
    });
  }

  test('localiza os profissionais fictícios na planilha da equipe', async () => {
    await page.goto(`${SPA_URL}/staff`, { waitUntil: 'networkidle' });
    const staffTable = page.getByRole('table');
    await expect(staffTable).toBeVisible();
    await expect(
      staffTable.getByRole('cell', { name: `Profissional Veterinario ${RUN_ID}` })
    ).toBeVisible();
    await expect(
      staffTable.getByRole('cell', { name: `Profissional Enfermeiro ${RUN_ID}` })
    ).toBeVisible();
  });

  test.afterAll(async () => {
    await context?.close();
  });
});

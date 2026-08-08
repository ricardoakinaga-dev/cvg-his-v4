import { expect, test } from '@playwright/test';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';

test('login pelo formulário funciona sem conta quando o usuário é único', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  await page.goto(`${SPA_URL}/login`);
  await page.locator('#email').fill(process.env.E2E_ADMIN_USERNAME || 'admin');
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'seed_admin');
  await page.locator('#account').fill('');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  await expect(page.getByText(/Usuário ou senha inválidos/)).toHaveCount(0);
  await context.close();
});

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const setupStatus = { setupRequired: true, setupAvailable: true };
const setupToken = '0123456789abcdef'.repeat(4);
const SPA_ORIGIN = new URL(process.env.SPA_URL || 'http://127.0.0.1:3112').origin;
const SETUP_PAGE_URL = `${SPA_ORIGIN}/setup`;
const SETUP_STATUS_URL = `${SPA_ORIGIN}/api/auth/setup/status`;
const SETUP_URL = `${SPA_ORIGIN}/api/auth/setup`;
const setupRequestPayload = {
  token: setupToken,
  clinicName: 'Clínica Central',
  adminUsername: 'admin',
  adminFullName: 'Maria Silva',
  adminEmail: 'admin@clinica.test',
  adminPassword: 'Clinica2026!vet'
};

function assertSetupPostRequest(route: Route): void {
  const request = route.request();
  expect(request.method()).toBe('POST');
  expect(request.url()).toBe(SETUP_URL);
  expect(request.headers().cookie).toBeUndefined();
  expect(request.postDataJSON()).toEqual(setupRequestPayload);
}

async function stubSetupBoundary(page: Page): Promise<void> {
  await page.route(SETUP_STATUS_URL, async (route) => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().url()).toBe(SETUP_STATUS_URL);
    expect(route.request().headers().cookie).toBeUndefined();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(setupStatus)
    });
  });
}

async function openSetupWizard(page: Page): Promise<void> {
  await stubSetupBoundary(page);
  await page.goto(SETUP_PAGE_URL);
  await expect(page.getByRole('heading', { name: 'Configuração inicial' })).toBeVisible();
  await expect(page.getByRole('form', { name: 'Configuração inicial' })).toBeVisible();
}

async function fillValidSetup(page: Page): Promise<void> {
  await page.getByLabel('Token de instalação').fill(setupToken);
  await page.getByLabel('Nome da clínica').fill('Clínica Central');
  await page.getByLabel('Usuário do administrador').fill('admin');
  await page.getByLabel('Nome completo').fill('Maria Silva');
  await page.getByLabel('E-mail').fill('admin@clinica.test');
  await page.locator('#setup-password').fill('Clinica2026!vet');
  await page.getByLabel('Confirme a senha').fill('Clinica2026!vet');
}

test('setup wizard has a keyboard-reachable, WCAG 2.2 AA-compatible form', async ({ page }) => {
  await openSetupWizard(page);

  const token = page.getByLabel('Token de instalação');
  const password = page.locator('#setup-password');

  await expect(token).toHaveAttribute('aria-describedby', 'setup-token-hint');
  await expect(password).toHaveAttribute('aria-describedby', 'setup-password-hint');
  await expect(page.locator('#setup-token-hint')).toBeVisible();
  await expect(page.locator('#setup-password-hint')).toBeVisible();

  await token.focus();
  await expect(token).toBeFocused();
  await token.press('Tab');
  await expect(page.getByLabel('Nome da clínica')).toBeFocused();

  const accessibilityScan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(accessibilityScan.violations).toEqual([]);
});

test('setup wizard remains usable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSetupWizard(page);

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth);
  await expect(page.getByRole('button', { name: 'Concluir instalação' })).toBeVisible();
});

test('setup wizard focuses the first invalid field and clears credentials after success', async ({
  page
}) => {
  await openSetupWizard(page);

  await page.getByRole('button', { name: 'Concluir instalação' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Revise os campos' })).toBeVisible();
  await expect(page.getByLabel('Token de instalação')).toBeFocused();
  await expect(page.locator('#setup-token')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#setup-token')).toHaveAttribute(
    'aria-describedby',
    'setup-token-error'
  );

  await fillValidSetup(page);

  await page.route(SETUP_URL, async (route) => {
    assertSetupPostRequest(route);
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ setupCompleted: true, requiresLogin: true })
    });
  });

  await page.getByRole('button', { name: 'Concluir instalação' }).click();
  await expect(page.getByRole('status')).toContainText('Configuração concluída');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('#setup-token, #setup-password, #setup-password-confirm')).toHaveCount(
    0
  );
  await expect(page.getByRole('heading', { name: 'Configuração inicial' })).toBeFocused();
  expect(await page.context().cookies()).toEqual([]);
});

test('setup wizard clears all credentials after a failed completion and permits retry', async ({
  page
}) => {
  await openSetupWizard(page);
  await fillValidSetup(page);

  let attempts = 0;
  await page.route(SETUP_URL, async (route) => {
    assertSetupPostRequest(route);
    attempts += 1;
    await route.fulfill(
      attempts === 1
        ? {
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'database internals must not leak' })
          }
        : {
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ setupCompleted: true, requiresLogin: true })
          }
    );
  });

  await page.getByRole('button', { name: 'Concluir instalação' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Não foi possível concluir' })
  ).toBeVisible();
  await expect(page.getByLabel('Token de instalação')).toHaveValue('');
  await expect(page.locator('#setup-password')).toHaveValue('');
  await expect(page.getByLabel('Confirme a senha')).toHaveValue('');
  await expect(page.getByRole('form', { name: 'Configuração inicial' })).toBeVisible();

  await page.getByLabel('Token de instalação').fill(setupToken);
  await page.locator('#setup-password').fill('Clinica2026!vet');
  await page.getByLabel('Confirme a senha').fill('Clinica2026!vet');
  await page.getByRole('button', { name: 'Concluir instalação' }).click();

  await expect(page.getByRole('status')).toContainText('Configuração concluída');
  expect(attempts).toBe(2);
});

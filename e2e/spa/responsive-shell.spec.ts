import { type Locator, type Page } from '@playwright/test';
import { expect, test } from './fixtures/spa-fixture';

const viewports = [
  { name: 'smartphone-360', width: 360, height: 800 },
  { name: 'smartphone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'tablet-1024', width: 1024, height: 768 }
] as const;

async function expectNoDocumentOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const width = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return width - document.documentElement.clientWidth;
  });

  expect(overflow, `${label} must not overflow the document horizontally`).toBeLessThanOrEqual(1);
}

async function expectTouchTarget(locator: Locator, label: string) {
  let box = await locator.boundingBox();
  if (!box) {
    await locator.evaluate((element) => {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    });
    box = await locator.boundingBox();
  }
  expect(box, `${label} must be rendered`).not.toBeNull();
  expect(box?.width ?? 0, `${label} width`).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0, `${label} height`).toBeGreaterThanOrEqual(44);
}

async function clickAtCenter(page: Page, locator: Locator, label: string) {
  let box = await locator.boundingBox();
  if (!box) {
    await locator.evaluate((element) => {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
    });
    box = await locator.boundingBox();
  }

  expect(box, `${label} must be clickable`).not.toBeNull();
  if (!box) return;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

for (const viewport of viewports) {
  test.describe(`Shell responsivo ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      hasTouch: true,
      isMobile: viewport.width < 600
    });

    test('navega pelo drawer sem ocupar ou estourar o documento', async ({ spaPage, page }) => {
      await spaPage.goto('/');
      await page.addStyleTag({
        content: `
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
          }
        `
      });

      const trigger = page.getByTestId('mobile-navigation-trigger');
      const navigation = page.locator('#primary-navigation');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(navigation).toHaveAttribute('aria-hidden', 'true');
      await expectNoDocumentOverflow(page, `${viewport.name} inicio`);
      await expectTouchTarget(trigger, 'Botao do menu');
      await expectTouchTarget(page.locator('.topbar__search-shell'), 'Busca global');

      await clickAtCenter(page, trigger, 'Botao do menu');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect(navigation).toHaveAttribute('aria-hidden', 'false');
      await expect
        .poll(() => navigation.evaluate((element) => element.getBoundingClientRect().left), {
          timeout: 5000,
          message: 'mobile navigation drawer must finish its opening transition'
      })
        .toBeGreaterThanOrEqual(-1);

      const atendimentoGroup = navigation.locator('summary').filter({ hasText: 'Atendimento' });
      await atendimentoGroup.evaluate((element) => {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      });
      await atendimentoGroup.evaluate((element) => element.click());
      await expect(atendimentoGroup.locator('..')).toHaveAttribute('open', '');
      const receptionLink = navigation.locator('a[href="/reception"]');
      await expect(receptionLink).toBeVisible();
      await expectTouchTarget(receptionLink, 'Link Recepcao');
      await clickAtCenter(page, receptionLink, 'Link Recepcao');

      await expect(page).toHaveURL(/\/reception$/);
      await expect(navigation).toHaveAttribute('aria-hidden', 'true');
      await expect(page.getByRole('heading', { name: 'Recepção', exact: true })).toBeVisible();
      await expectNoDocumentOverflow(page, `${viewport.name} recepcao`);

      await spaPage.goto('/fiscal/ncm');
      await expectNoDocumentOverflow(page, `${viewport.name} fiscal ncm`);
    });
  });
}

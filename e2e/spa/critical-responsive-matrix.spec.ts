import { expect, loginViaToken, test } from './fixtures/spa-fixture';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const viewports = [
  { name: 'compact-320', width: 320, height: 568 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'landscape-1024', width: 1024, height: 768 }
] as const;
const routes = [
  '/owners',
  '/appointments',
  '/medical-records',
  '/billing',
  '/reports/engine',
  '/access-control'
] as const;

for (const viewport of viewports) {
  test.describe(`Matriz responsiva ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of routes) {
      test(`${path} permanece contida e operável`, async ({ page }) => {
        await loginViaToken(page);
        await page.goto(`${SPA_URL}${path}`, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('main')).toBeVisible();
        await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
        await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

        const overflowAudit = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          const amount =
            Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) -
            viewportWidth;
          const samples = [...document.querySelectorAll('body *')]
            .filter((element) => {
              const htmlElement = element as HTMLElement;
              const rect = element.getBoundingClientRect();
              return (
                !element.closest('[aria-hidden="true"], [inert]') &&
                htmlElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
                rect.width > 0 &&
                rect.height > 0 &&
                (rect.left < -2 || rect.right > viewportWidth + 2)
              );
            })
            .slice(0, 8)
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return `${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 2).join('.')} (${Math.round(rect.left)}..${Math.round(rect.right)}px)`;
            });
          return { amount, samples };
        });
        expect(
          overflowAudit.amount,
          `${path} criou overflow em ${viewport.width}px: ${overflowAudit.samples.join(', ') || 'sem elemento comum fora do viewport'}`
        ).toBeLessThanOrEqual(2);

        await page.getByRole('main').press('Tab');
        const focused = await page.evaluate(() => {
          const element = document.activeElement as HTMLElement | null;
          if (!element || element === document.body) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        expect(focused, `${path} não expôs controle focável em ${viewport.width}px`).toBe(true);
      });
    }
  });
}

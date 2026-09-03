import AxeBuilder from '@axe-core/playwright';
import { expect, loginViaToken, test } from './fixtures/spa-fixture';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const criticalSurfaces = [
  { name: 'tutores e pacientes', path: '/owners' },
  { name: 'agenda', path: '/appointments' },
  { name: 'prontuário', path: '/medical-records' },
  { name: 'faturamento', path: '/billing' },
  { name: 'relatórios', path: '/reports/engine' },
  { name: 'perfis', path: '/access-control' }
] as const;

test.describe('Acessibilidade das jornadas críticas', () => {
  for (const surface of criticalSurfaces) {
    test(`${surface.name}: Axe, landmark único e skip link por teclado`, async ({ page }) => {
      await loginViaToken(page);
      await page.goto(`${SPA_URL}${surface.path}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 });
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

      const main = page.getByRole('main');
      await expect(main).toHaveCount(1);
      await page.evaluate(() => {
        document.body.tabIndex = -1;
        document.body.focus();
        document.body.removeAttribute('tabindex');
      });
      await page.keyboard.press('Tab');
      const skipLink = page.getByRole('link', { name: /Pular para o conteudo principal/i });
      await expect(skipLink).toBeFocused();
      await skipLink.press('Enter');
      await expect(main).toBeFocused();

      const accessibilityScan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScan.violations).toEqual([]);
    });
  }
});

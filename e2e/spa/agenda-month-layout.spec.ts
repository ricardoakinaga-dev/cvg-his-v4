import { expect, loginViaToken, test } from './fixtures/spa-fixture';

test('mantém os textos das ações da visão mensal dentro dos cards', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 });
  await loginViaToken(page);
  await page.goto('/appointments');

  await expect(page.getByRole('heading', { name: /Agenda/ }).first()).toBeVisible({
    timeout: 15000
  });
  await page.getByRole('button', { name: 'Mês', exact: true }).click();

  const monthActions = page.locator('.month-cell__empty-surface, .month-create-slot');
  await expect(monthActions.first()).toBeVisible({ timeout: 10000 });

  const actionLayout = await monthActions.evaluateAll((elements) =>
    elements.map((element) => {
      const styles = getComputedStyle(element);
      return {
        overflowWrap: styles.overflowWrap,
        whiteSpace: styles.whiteSpace,
        maxWidth: styles.maxWidth
      };
    })
  );

  expect(actionLayout.every((style) => style.overflowWrap === 'anywhere')).toBe(true);
  expect(actionLayout.every((style) => style.whiteSpace === 'normal')).toBe(true);

  const overflowingActions = await monthActions.evaluateAll((elements) =>
    elements
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .map((element) => ({
        className: element.className,
        text: element.textContent?.trim() ?? '',
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth
      }))
  );

  expect(overflowingActions).toEqual([]);
});

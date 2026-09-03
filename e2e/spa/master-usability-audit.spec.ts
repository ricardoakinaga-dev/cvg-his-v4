import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { navGroups } from '../../apps/spa/src/navigation';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const ARTIFACT_PATH = 'tmp/master-usability-audit.json';

type AuditMode = 'desktop' | 'mobile';

type AuditRecord = {
  mode: AuditMode;
  path: string;
  title: string;
  finalUrl: string;
  status: 'passed' | 'failed';
  durationMs: number;
  buttonCount: number;
  linkCount: number;
  fieldCount: number;
  tableCount: number;
  mainLandmarkCount: number;
  issues: string[];
  httpErrors: string[];
  pageErrors: string[];
  samples: {
    unnamedButtons: string[];
    unnamedLinks: string[];
    unlabeledFields: string[];
    undersizedTargets: string[];
  };
};

const navRoutes = Array.from(
  new Map(
    navGroups.flatMap((group) =>
      group.sections.flatMap((section) =>
        section.items.map((item) => [item.path, { path: item.path, title: item.label }] as const)
      )
    )
  ).values()
);

const auditRecords: AuditRecord[] = [];

async function login(page: Page) {
  await page.goto(`${SPA_URL}/login`, { waitUntil: 'domcontentloaded' });
  if (!page.url().includes('/login')) return;

  await page.locator('#email').fill(process.env.E2E_ADMIN_USERNAME || 'admin');
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'seed_admin');
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function auditRoute(page: Page, mode: AuditMode, route: (typeof navRoutes)[number]) {
  const startedAt = Date.now();
  const issues: string[] = [];
  const httpErrors: string[] = [];
  const pageErrors: string[] = [];

  const onResponse = (response: { status(): number; url(): string }) => {
    if (response.status() >= 400) {
      const url = new URL(response.url());
      if (url.origin === new URL(SPA_URL).origin) {
        httpErrors.push(`${response.status()} ${url.pathname}`);
      }
    }
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  page.on('response', onResponse);
  page.on('pageerror', onPageError);

  try {
    const response = await page.goto(`${SPA_URL}${route.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20_000
    });
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);

    if (response && response.status() >= 400)
      issues.push(`Documento respondeu HTTP ${response.status()}`);
    if (page.url().includes('/login'))
      issues.push('Sessão redirecionada inesperadamente para login');
    if (page.url().includes('/404')) issues.push('Rota redirecionada para página 404');

    const main = page.getByRole('main');
    const mainLandmarkCount = await main.count();
    if (
      mainLandmarkCount === 0 ||
      !(await main
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      issues.push('Conteúdo principal <main> ausente ou invisível');
    }
    if (mainLandmarkCount > 1) {
      issues.push(`${mainLandmarkCount} landmarks <main> concorrentes`);
    }

    const headingCount = await page.getByRole('heading').count();
    if (headingCount === 0) issues.push('Tela sem heading acessível');

    const metrics = await page.evaluate(() => {
      const isVisible = (element: Element) => {
        const htmlElement = element as HTMLElement;
        const rect = htmlElement.getBoundingClientRect();
        return (
          htmlElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right > 0 &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.top < window.innerHeight
        );
      };
      const accessibleName = (element: Element) => {
        const htmlElement = element as HTMLElement;
        const labelledBy = element.getAttribute('aria-labelledby');
        const labelledByText = labelledBy
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() || '')
          .filter(Boolean)
          .join(' ');
        return (
          element.getAttribute('aria-label') ||
          labelledByText ||
          element.getAttribute('title') ||
          htmlElement.innerText?.trim() ||
          element.textContent?.trim() ||
          element.querySelector('img[alt]')?.getAttribute('alt') ||
          (element as HTMLInputElement).value ||
          ''
        ).trim();
      };
      const describeElement = (element: Element) => {
        const id = element.id ? `#${element.id}` : '';
        const classes = [...element.classList]
          .slice(0, 3)
          .map((name) => `.${name}`)
          .join('');
        const text = (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
        return `${element.tagName.toLowerCase()}${id}${classes}${text ? ` [${text}]` : ''}`;
      };

      const buttons = [...document.querySelectorAll('button')].filter(isVisible);
      const links = [...document.querySelectorAll('a[href]')].filter(isVisible);
      const fields = [...document.querySelectorAll('input, select, textarea')].filter(
        (element) => isVisible(element) && (element as HTMLInputElement).type !== 'hidden'
      );
      const tables = [...document.querySelectorAll('table')].filter(isVisible);
      const viewportWidth = document.documentElement.clientWidth;
      const horizontalOverflow =
        Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - viewportWidth;

      const unnamedButtonElements = buttons.filter((element) => !accessibleName(element));
      const unnamedLinkElements = links.filter((element) => !accessibleName(element));
      const unlabeledFieldElements = fields.filter((element) => {
        const field = element as HTMLInputElement;
        return !(
          field.labels?.length ||
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-labelledby') ||
          element.getAttribute('title')
        );
      });
      const blankTableHeaders = tables.reduce(
        (total, table) =>
          total +
          [...table.querySelectorAll('th')].filter(
            (header) => !(header.textContent?.trim() || header.getAttribute('aria-label'))
          ).length,
        0
      );
      const undersizedTargetElements = [...buttons, ...links].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 24 || rect.height < 24;
      });

      return {
        buttonCount: buttons.length,
        linkCount: links.length,
        fieldCount: fields.length,
        tableCount: tables.length,
        horizontalOverflow,
        unnamedButtons: unnamedButtonElements.length,
        unnamedLinks: unnamedLinkElements.length,
        unlabeledFields: unlabeledFieldElements.length,
        blankTableHeaders,
        undersizedTargets: undersizedTargetElements.length,
        samples: {
          unnamedButtons: unnamedButtonElements.slice(0, 5).map(describeElement),
          unnamedLinks: unnamedLinkElements.slice(0, 8).map(describeElement),
          unlabeledFields: unlabeledFieldElements.slice(0, 8).map(describeElement),
          undersizedTargets: undersizedTargetElements.slice(0, 8).map(describeElement)
        }
      };
    });

    if (metrics.horizontalOverflow > 2) {
      issues.push(`Overflow horizontal global de ${Math.round(metrics.horizontalOverflow)}px`);
    }
    if (metrics.unnamedButtons)
      issues.push(`${metrics.unnamedButtons} botão(ões) sem nome acessível`);
    if (metrics.unnamedLinks) issues.push(`${metrics.unnamedLinks} link(s) sem nome acessível`);
    if (metrics.unlabeledFields)
      issues.push(`${metrics.unlabeledFields} campo(s) sem rótulo identificável`);
    if (metrics.blankTableHeaders)
      issues.push(`${metrics.blankTableHeaders} cabeçalho(s) de tabela vazio(s)`);
    if (metrics.undersizedTargets) {
      issues.push(`${metrics.undersizedTargets} alvo(s) interativo(s) menor(es) que 24x24px`);
    }
    if (pageErrors.length) issues.push(`${pageErrors.length} erro(s) JavaScript não tratado(s)`);

    await page.keyboard.press('Tab');
    const focusVisible = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return false;
      const rect = active.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (!focusVisible) issues.push('Primeira navegação por Tab não produziu foco visível');

    const record: AuditRecord = {
      mode,
      path: route.path,
      title: route.title,
      finalUrl: page.url(),
      status: issues.length ? 'failed' : 'passed',
      durationMs: Date.now() - startedAt,
      buttonCount: metrics.buttonCount,
      linkCount: metrics.linkCount,
      fieldCount: metrics.fieldCount,
      tableCount: metrics.tableCount,
      mainLandmarkCount,
      issues,
      httpErrors: [...new Set(httpErrors)],
      pageErrors: [...new Set(pageErrors)],
      samples: metrics.samples
    };
    auditRecords.push(record);

    if (issues.length) {
      test.info().annotations.push({
        type: 'usability-issues',
        description: issues.join('; ')
      });
    }
  } finally {
    page.off('response', onResponse);
    page.off('pageerror', onPageError);
  }
}

for (const mode of ['desktop', 'mobile'] as const) {
  test.describe(`Auditoria master de usabilidade - ${mode}`, () => {
    let context: BrowserContext;
    let auditPage: Page;

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext({
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        viewport: mode === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 }
      });
      auditPage = await context.newPage();
      await login(auditPage);
    });

    for (const route of navRoutes) {
      test(`${route.title} (${route.path})`, async () => {
        await auditRoute(auditPage, mode, route);
      });
    }

    test.afterAll(async () => {
      await mkdir('tmp', { recursive: true });
      await writeFile(
        ARTIFACT_PATH,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            routeCount: navRoutes.length,
            navigationCount: auditRecords.length,
            records: auditRecords
          },
          null,
          2
        )
      );
      await context?.close();
    });
  });
}

import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import {
  expect,
  loginViaToken,
  test,
  type ApiCall,
  type CleanupTracker
} from './fixtures/spa-fixture';

const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';
const criticalSurfaces = [
  { name: 'tutores e pacientes', path: '/owners' },
  { name: 'agenda', path: '/appointments' },
  { name: 'prontuário', path: '/medical-records' },
  { name: 'paciente detalhado', fixture: 'patient-detail' },
  { name: 'prontuário detalhado', fixture: 'medical-record-detail' },
  { name: 'vendas de balcão', path: '/counter-sales' },
  { name: 'faturamento', path: '/billing' },
  { name: 'relatórios', path: '/reports/engine' },
  { name: 'perfis', path: '/access-control' }
] as const;

async function resolveSurfacePath(
  surface: (typeof criticalSurfaces)[number],
  apiCall: ApiCall,
  cleanup: CleanupTracker
): Promise<string> {
  if ('path' in surface) return surface.path;

  const suffix = randomUUID();
  const owner = await apiCall.post('/owners', {
    fullName: `A11y Tutor ${suffix}`,
    documentId: `A11Y-${suffix}`,
    contacts: [{ label: 'Celular', type: 'phone', value: '11999999999', primary: true }],
    financialResponsible: false,
    status: 'active'
  }) as { id: string };
  cleanup.track({ type: 'owner', id: owner.id });

  const patient = await apiCall.post('/patients', {
    name: `A11y Paciente ${suffix}`,
    species: 'canine',
    sex: 'male',
    primaryOwnerId: owner.id,
    status: 'active'
  }) as { id: string };
  cleanup.track({ type: 'patient', id: patient.id });

  if (surface.fixture === 'patient-detail') {
    return `/patients/${patient.id}`;
  }

  const encounter = await apiCall.post('/encounters', {
    patientId: patient.id,
    ownerId: owner.id,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Auditoria E2E de acessibilidade'
  }) as { id: string };
  cleanup.track({ type: 'encounter', id: encounter.id });
  return `/medical-records/${encounter.id}`;
}

test.describe('Acessibilidade das jornadas críticas', () => {
  for (const surface of criticalSurfaces) {
    test(`${surface.name}: Axe, landmark único e skip link por teclado`, async ({
      page,
      apiCall,
      cleanup
    }) => {
      await loginViaToken(page);
      const path = await resolveSurfacePath(surface, apiCall, cleanup);
      await page.goto(`${SPA_URL}${path}`, { waitUntil: 'domcontentloaded' });
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

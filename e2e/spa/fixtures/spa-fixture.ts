import { test as base, expect, type Page } from '@playwright/test';

/**
 * Reusable fixtures for SPA E2E tests.
 *
 * Usage:
 *   import { test, expect } from './fixtures/spa-fixture';
 *   test('my test', async ({ spaPage, apiCall }) => { ... });
 *
 * Features:
 *   - Auto-login through the browser flow so HttpOnly refresh cookies are exercised
 *   - Deterministic waits (no waitForTimeout for SearchSelect)
 *   - Cleanup helpers for test data
 *   - Semantic selectors (getByRole, getByLabel, getByPlaceholder)
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:3101';
const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3102';
type AuthSessionResponse = {
  accessToken: string;
  refreshToken?: string;
  principal?: {
    user?: {
      id?: string;
      accountId?: string;
    };
  };
};

function resolveE2EAdminUsername(): string {
  const explicitUsername = process.env.E2E_ADMIN_USERNAME?.trim();
  if (explicitUsername) {
    return explicitUsername;
  }

  const email = process.env.E2E_ADMIN_EMAIL?.trim();
  if (email?.includes('@')) {
    return email.split('@')[0];
  }

  return 'admin';
}

// ── Types ──────────────────────────────────────────────────────────────

export type OwnerFormData = {
  fullName: string;
  documentId?: string;
  phone?: string;
  email?: string;
};

export type PatientFormData = {
  name: string;
  species: string;
  sex: string;
  ownerName: string;
  breed?: string;
};

export type CreatedResource = {
  type: 'owner' | 'patient' | 'encounter' | 'inpatient' | 'appointment' | 'webhook';
  id: string;
};

// ── SPA Page wrapper ───────────────────────────────────────────────────

export class SpaPage {
  constructor(public readonly page: Page) {}

  async goto(path: string) {
    await this.page.goto(`${SPA_URL}${path}`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForText(text: string, options?: { timeout?: number }) {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: options?.timeout ?? 15000 });
  }

  /**
   * Select a patient using the SearchSelect component.
   * Uses deterministic waits: waits for the dropdown option to appear
   * instead of arbitrary timeouts.
   */
  async selectPatient(patientName: string) {
    // Click the search input — use placeholder for robustness
    const searchInput = this.page.getByPlaceholder(/buscar paciente/i);
    await searchInput.click();
    await searchInput.fill(patientName);

    // Wait for the dropdown option to appear (deterministic)
    const option = this.page.getByRole('option', { name: patientName });
    await option.waitFor({ timeout: 10000 });
    await option.click();

    // Wait for the dropdown to close (input no longer focused on dropdown)
    await this.page.waitForSelector('.search-select__dropdown', {
      state: 'detached',
      timeout: 5000
    });
  }
}

// ── API call helper ────────────────────────────────────────────────────

export class ApiCall {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async post(path: string, data: unknown) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async patch(path: string, data: unknown) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`API PATCH ${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  async get(path: string) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!res.ok) throw new Error(`API GET ${path} failed: ${res.status}`);
    return res.json();
  }

  async delete(path: string) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`API DELETE ${path} failed: ${res.status}`);
    }
    return res.ok;
  }
}

async function requestFreshAuthSession(): Promise<AuthSessionResponse> {
  const username = resolveE2EAdminUsername();
  const password = process.env.E2E_ADMIN_PASSWORD || 'seed_admin';

  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error(`E2E login failed: ${response.status} ${await response.text()}`);
  }

  const session = (await response.json()) as AuthSessionResponse;
  process.env.E2E_AUTH_TOKEN = session.accessToken;
  if (session.refreshToken) {
    process.env.E2E_REFRESH_TOKEN = session.refreshToken;
  }
  if (session.principal?.user?.id) {
    process.env.E2E_USER_ID = session.principal.user.id;
  }
  if (session.principal?.user?.accountId) {
    process.env.E2E_ACCOUNT_ID = session.principal.user.accountId;
  }

  return session;
}

export async function getE2EAccessToken(): Promise<string> {
  const session = await requestFreshAuthSession();
  return session.accessToken;
}

// ── Cleanup helper ─────────────────────────────────────────────────────

export class CleanupTracker {
  private resources: CreatedResource[] = [];
  private apiCall: ApiCall;

  constructor(apiCall: ApiCall) {
    this.apiCall = apiCall;
  }

  track(resource: CreatedResource) {
    this.resources.push(resource);
  }

  async cleanup() {
    if (this.resources.length === 0) return;
    console.log(`   🧹 Cleaning up ${this.resources.length} test resources...`);

    // Delete in reverse order (dependents first)
    const reversed = [...this.resources].reverse();
    for (const r of reversed) {
      try {
        if (r.type === 'appointment') {
          await this.apiCall.post(`/appointments/${r.id}/cancel`, {
            reason: 'E2E cleanup'
          });
          console.log(`   🗑️  Cancelled appointment ${r.id}`);
          continue;
        }

        if (r.type === 'inpatient') {
          await this.apiCall.patch(`/inpatient/${r.id}/update-status`, {
            status: 'discharged',
            dischargeReason: 'E2E cleanup'
          });
          console.log(`   🏁 Discharged inpatient ${r.id}`);
          continue;
        }

        const endpointMap: Record<string, string> = {
          encounter: `/encounters/${r.id}`,
          patient: `/patients/${r.id}`,
          owner: `/owners/${r.id}`,
          webhook: `/webhooks/${r.id}`
        };
        const endpoint = endpointMap[r.type];
        if (endpoint) {
          await this.apiCall.delete(endpoint);
          console.log(`   🗑️  Deleted ${r.type} ${r.id}`);
        }
      } catch (err) {
        // Log but don't fail — cleanup is best-effort
        console.log(`   ⚠️  Failed to delete ${r.type} ${r.id}: ${err}`);
      }
    }
    this.resources = [];
  }
}

// ── Login helpers ──────────────────────────────────────────────────────

async function loginViaUI(page: Page) {
  const username = resolveE2EAdminUsername();
  const password = process.env.E2E_ADMIN_PASSWORD || 'seed_admin';

  await page.goto(`${SPA_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Check if already logged in
  const url = page.url();
  if (!url.includes('/login')) return;

  await page.fill('#email', username);
  await page.fill('#password', password);
  const refreshAfterLogin = page.waitForResponse(
    (response) => {
      const pathname = new URL(response.url()).pathname;
      return pathname.endsWith('/auth/refresh') && response.request().method() === 'POST';
    },
    { timeout: 15000 }
  );
  await page.click('button[type="submit"]');

  const refreshResponse = await refreshAfterLogin;
  if (!refreshResponse.ok()) {
    throw new Error(`Browser login did not establish an HttpOnly session: ${refreshResponse.status()}`);
  }
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

export async function loginViaToken(page: Page, session?: AuthSessionResponse) {
  // Keep the API token available to Node-side fixtures, but authenticate the
  // browser through the real login form. The SPA intentionally keeps access
  // tokens in memory and receives refresh tokens only through HttpOnly cookies.
  if (session) {
    process.env.E2E_AUTH_TOKEN = session.accessToken;
  } else if (!process.env.E2E_AUTH_TOKEN) {
    await requestFreshAuthSession();
  }

  await page.goto(`${SPA_URL}/login`);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    const username = resolveE2EAdminUsername();
    const password = process.env.E2E_ADMIN_PASSWORD || 'seed_admin';

    await page.fill('#email', username);
    await page.fill('#password', password);
    const refreshAfterLogin = page.waitForResponse(
      (response) => {
        const pathname = new URL(response.url()).pathname;
        return pathname.endsWith('/auth/refresh') && response.request().method() === 'POST';
      },
      { timeout: 15000 }
    );
    await page.click('button[type="submit"]');
    const refreshResponse = await refreshAfterLogin;
    if (!refreshResponse.ok()) {
      throw new Error(`Browser login did not establish an HttpOnly session: ${refreshResponse.status()}`);
    }
    const browserCookies = await page.context().cookies(`${SPA_URL}/api/auth/refresh`);
    expect(
      browserCookies.some((cookie) => cookie.name === 'cvg_his_refresh' && cookie.path === '/api')
    ).toBe(true);
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
  }
}

// ── UI creation helpers ────────────────────────────────────────────────

async function createOwnerViaUI(page: Page, data: OwnerFormData): Promise<string> {
  await page.goto(`${SPA_URL}/owners/new`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('main').locator('.app-page-header__title')).toHaveText(
    'Cadastrar Novo Cliente',
    { timeout: 10000 }
  );

  await page.fill('#fullName', data.fullName);
  if (data.documentId) await page.fill('#documentId', data.documentId);

  // The current client form exposes dedicated contact fields instead of the
  // legacy dynamic contact-value control.
  await page.fill('#phone1', data.phone || '11999999999');

  await page.click('button[type="submit"]');

  // Wait for success message (deterministic)
  await expect(page.getByText('Cliente cadastrado com sucesso')).toBeVisible({ timeout: 15000 });
  await page.waitForURL(/\/owners\/(?!new$)[^/]+$/, { timeout: 15000 });

  // Extract owner ID from URL after redirect
  const url = page.url();
  const match = url.match(/\/owners\/([^/]+)$/);
  return match ? match[1] : '';
}

async function createPatientViaUI(page: Page, data: PatientFormData): Promise<string> {
  await page.goto(`${SPA_URL}/patients/new`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('main').locator('.app-page-header__title')).toHaveText(
    'Cadastrar Novo Animal',
    { timeout: 10000 }
  );

  await page.fill('#name', data.name);
  await page.selectOption('#species', data.species);
  await page.selectOption('#sex', data.sex);
  if (data.breed) {
    const breedSelect = page.locator('#breed');
    const matchingOption = breedSelect.locator('option').filter({ hasText: data.breed }).first();
    if (await matchingOption.count()) {
      await breedSelect.selectOption({ label: data.breed });
    }
  }

  // Select owner via SearchSelect (uses deterministic wait)
  const searchInput = page.getByPlaceholder(/buscar.*(tutor|cliente)|selecione.*(tutor|cliente)/i);
  if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await searchInput.click();
    await searchInput.fill(data.ownerName);
    const option = page.getByRole('option', { name: data.ownerName });
    await option.waitFor({ timeout: 10000 });
    await option.click();
    await page.waitForSelector('.search-select__dropdown', { state: 'detached', timeout: 5000 });
  } else {
    // Fallback: use the generic search-select input
    const genericInput = page.getByPlaceholder(/buscar/i).first();
    await genericInput.click();
    await genericInput.fill(data.ownerName);
    const option = page.getByRole('option', { name: data.ownerName });
    await option.waitFor({ timeout: 10000 });
    await option.click();
    await page.waitForSelector('.search-select__dropdown', { state: 'detached', timeout: 5000 });
  }

  await page.click('button[type="submit"]');

  // Wait for success
  await expect(page.getByText('Animal cadastrado com sucesso')).toBeVisible({ timeout: 15000 });
  await page.waitForURL(/\/patients\/(?!new$)[^/]+$/, { timeout: 15000 });

  // Extract patient ID from URL
  const url = page.url();
  const match = url.match(/\/patients\/([^/]+)$/);
  return match ? match[1] : '';
}

// ── Extended test ──────────────────────────────────────────────────────

export const test = base.extend<{
  authSession: AuthSessionResponse;
  spaPage: SpaPage;
  apiCall: ApiCall;
  cleanup: CleanupTracker;
  loginViaUI: () => Promise<void>;
  createOwnerViaUI: (data: OwnerFormData) => Promise<string>;
  createPatientViaUI: (data: PatientFormData) => Promise<string>;
}>({
  authSession: [async ({}, use) => {
    await use(await requestFreshAuthSession());
  }, { scope: 'worker' }],

  spaPage: async ({ page, authSession }, use) => {
    await loginViaToken(page, authSession);
    await use(new SpaPage(page));
  },

  apiCall: async ({ authSession }, use) => {
    await use(new ApiCall(authSession.accessToken));
  },

  cleanup: async ({ apiCall }, use) => {
    const tracker = new CleanupTracker(apiCall);
    await use(tracker);
    await tracker.cleanup();
  },

  loginViaUI: async ({ page }, use) => {
    await use(async () => {
      await loginViaUI(page);
    });
  },

  createOwnerViaUI: async ({ page }, use) => {
    await use(async (data: OwnerFormData) => {
      return createOwnerViaUI(page, data);
    });
  },

  createPatientViaUI: async ({ page }, use) => {
    await use(async (data: PatientFormData) => {
      return createPatientViaUI(page, data);
    });
  }
});

export { expect };

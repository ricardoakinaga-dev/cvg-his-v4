import { test as base, expect, type Page } from '@playwright/test';

/**
 * Reusable fixtures for SPA E2E tests.
 *
 * Usage:
 *   import { test, expect } from './fixtures/spa-fixture';
 *   test('my test', async ({ spaPage, apiCall }) => { ... });
 *
 * Features:
 *   - Auto-login via token injection
 *   - Deterministic waits (no waitForTimeout for SearchSelect)
 *   - Cleanup helpers for test data
 *   - Semantic selectors (getByRole, getByLabel, getByPlaceholder)
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:3101';
const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3102';
const AUTH_STORAGE_KEYS = {
  accessToken: 'cvg-his-v2:access_token',
  refreshToken: 'cvg-his-v2:refresh_token'
} as const;

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
  type: 'owner' | 'patient' | 'encounter' | 'appointment' | 'webhook';
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
        const endpointMap: Record<string, string> = {
          appointment: `/appointments/${r.id}`,
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
  await page.click('button[type="submit"]');

  // Wait for redirect away from login
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
}

export async function loginViaToken(page: Page, session?: AuthSessionResponse) {
  const authSession = session ?? (await requestFreshAuthSession());
  const authState = {
    accessToken: authSession.accessToken,
    refreshToken: authSession.refreshToken ?? null,
    accessTokenKey: AUTH_STORAGE_KEYS.accessToken,
    refreshTokenKey: AUTH_STORAGE_KEYS.refreshToken
  };

  await page.addInitScript(
    ({ accessToken, refreshToken, accessTokenKey, refreshTokenKey }) => {
      localStorage.setItem(accessTokenKey, accessToken);
      if (refreshToken) {
        localStorage.setItem(refreshTokenKey, refreshToken);
      }
    },
    authState
  );

  await page.goto(`${SPA_URL}/login`);
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(
    ({ accessToken, refreshToken, accessTokenKey, refreshTokenKey }) => {
      localStorage.setItem(accessTokenKey, accessToken);
      if (refreshToken) {
        localStorage.setItem(refreshTokenKey, refreshToken);
      }
    },
    authState
  );

  await page.goto(`${SPA_URL}/`);
  await page.waitForLoadState('networkidle');

  if (page.url().includes('/login')) {
    await loginViaUI(page);
  }
}

// ── UI creation helpers ────────────────────────────────────────────────

async function createOwnerViaUI(page: Page, data: OwnerFormData): Promise<string> {
  await page.goto(`${SPA_URL}/owners/new`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('main').locator('.app-page-header__title')).toHaveText('Novo Tutor', {
    timeout: 10000
  });

  await page.fill('#fullName', data.fullName);
  if (data.documentId) await page.fill('#documentId', data.documentId);

  // Fill the required contact value field explicitly to avoid matching the contact label input.
  await page.fill('#contact-value-0', data.phone || '11999999999');

  await page.click('button[type="submit"]');

  // Wait for success message (deterministic)
  await expect(page.getByText('Tutor cadastrado com sucesso')).toBeVisible({ timeout: 15000 });
  await page.waitForURL(/\/owners\/owner_/, { timeout: 15000 });

  // Extract owner ID from URL after redirect
  const url = page.url();
  const match = url.match(/\/owners\/([^/]+)$/);
  return match ? match[1] : '';
}

async function createPatientViaUI(page: Page, data: PatientFormData): Promise<string> {
  await page.goto(`${SPA_URL}/patients/new`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('main').locator('.app-page-header__title')).toHaveText(
    'Novo Paciente',
    { timeout: 10000 }
  );

  await page.fill('#name', data.name);
  await page.selectOption('#species', data.species);
  await page.selectOption('#sex', data.sex);
  if (data.breed) await page.fill('#breed', data.breed);

  // Select owner via SearchSelect (uses deterministic wait)
  const searchInput = page.getByPlaceholder(/buscar.*tutor|selecione.*tutor/i);
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
  await expect(page.getByText('Paciente cadastrado com sucesso')).toBeVisible({ timeout: 15000 });
  await page.waitForURL(/\/patients\/patient_/, { timeout: 15000 });

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

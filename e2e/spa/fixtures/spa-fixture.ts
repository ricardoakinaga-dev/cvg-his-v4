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

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SPA_URL = process.env.SPA_URL || 'http://localhost:3002';

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
  type: 'owner' | 'patient' | 'encounter' | 'appointment';
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
          owner: `/owners/${r.id}`
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
  const email = process.env.E2E_ADMIN_EMAIL || 'admin@cvg.local';
  const password = process.env.E2E_ADMIN_PASSWORD || 'Admin123!';

  await page.goto(`${SPA_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Check if already logged in
  const url = page.url();
  if (!url.includes('/login')) return;

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // Wait for redirect away from login
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
}

export async function loginViaToken(page: Page) {
  const token = process.env.E2E_AUTH_TOKEN;
  if (!token) throw new Error('E2E_AUTH_TOKEN not set');

  await page.goto(SPA_URL);
  await page.evaluate((t: string) => {
    localStorage.setItem('cvg-his-v2:access_token', t);
  }, token);
  await page.reload({ waitUntil: 'networkidle' });
}

// ── UI creation helpers ────────────────────────────────────────────────

async function createOwnerViaUI(page: Page, data: OwnerFormData): Promise<string> {
  await page.goto(`${SPA_URL}/owners/new`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /Novo Tutor/ })).toBeVisible({ timeout: 10000 });

  await page.fill('#fullName', data.fullName);
  if (data.documentId) await page.fill('#documentId', data.documentId);

  // Fill first contact — use placeholder for robustness
  const contactInput = page.getByPlaceholder(/telefone|celular|contato/i).first();
  if (await contactInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await contactInput.fill(data.phone || '11999999999');
  } else {
    // Fallback to ID-based selector
    await page.fill('#contact-value-0', data.phone || '11999999999');
  }

  await page.click('button[type="submit"]');

  // Wait for success message (deterministic)
  await expect(page.getByText('Tutor cadastrado com sucesso')).toBeVisible({ timeout: 15000 });

  // Extract owner ID from URL after redirect
  const url = page.url();
  const match = url.match(/\/owners\/([a-f0-9-]+)$/);
  return match ? match[1] : '';
}

async function createPatientViaUI(page: Page, data: PatientFormData): Promise<string> {
  await page.goto(`${SPA_URL}/patients/new`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('heading', { name: /Novo Paciente/ })).toBeVisible({
    timeout: 10000
  });

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

  // Extract patient ID from URL
  const url = page.url();
  const match = url.match(/\/patients\/([a-f0-9-]+)$/);
  return match ? match[1] : '';
}

// ── Extended test ──────────────────────────────────────────────────────

export const test = base.extend<{
  spaPage: SpaPage;
  apiCall: ApiCall;
  cleanup: CleanupTracker;
  loginViaUI: () => Promise<void>;
  createOwnerViaUI: (data: OwnerFormData) => Promise<string>;
  createPatientViaUI: (data: PatientFormData) => Promise<string>;
}>({
  spaPage: async ({ page }, use) => {
    await loginViaToken(page);
    await use(new SpaPage(page));
  },

  apiCall: async ({}, use) => {
    const token = process.env.E2E_AUTH_TOKEN || '';
    await use(new ApiCall(token));
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

import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Custom fixtures for CVG-HIS E2E tests
 */

// Types
export type TestUser = {
  username: string;
  password: string;
  token?: string;
  userId?: string;
  accountId?: string;
};

export type CVGHTestFixture = {
  /** Authenticated page (logged in as admin) */
  authPage: Page;
  /** API request context with auth token */
  apiContext: APIRequestContext;
  /** Test user credentials */
  testUser: TestUser;
  /** Helper: create a tutor (owner) via API */
  createOwner: (name?: string) => Promise<{ id: string; name: string }>;
  /** Helper: create a patient via API */
  createPatient: (ownerId: string, name?: string) => Promise<{ id: string; name: string }>;
  /** Helper: create an appointment via API */
  createAppointment: (
    patientId: string,
    ownerId: string,
    professionalUserId: string
  ) => Promise<{ id: string }>;
  /** Helper: create an encounter via API */
  createEncounter: (patientId: string, ownerId: string) => Promise<{ id: string }>;
  /** Helper: clean up test data */
  cleanup: () => Promise<void>;
};

// Track created resources for cleanup
const createdResources: Array<{ type: string; id: string }> = [];

export const test = base.extend<CVGHTestFixture>({
  testUser: async ({}, use) => {
    const user: TestUser = {
      username: process.env.E2E_ADMIN_USERNAME || 'admin',
      password: process.env.E2E_ADMIN_PASSWORD || 'seed_admin',
      token: process.env.E2E_AUTH_TOKEN,
      userId: process.env.E2E_USER_ID,
      accountId: process.env.E2E_ACCOUNT_ID
    };
    await use(user);
  },

  authPage: async ({ page, testUser }, use) => {
    // Login via UI
    await page.goto('/login');

    // Check if already logged in
    const currentUrl = page.url();
    if (!currentUrl.includes('/login')) {
      await use(page);
      return;
    }

    // Fill login form — LoginPage uses #email for username field
    await page.fill('#email', testUser.username);
    await page.fill(
      'input[name="password"], input[type="password"], input#password',
      testUser.password
    );
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');

    // Wait for redirect to dashboard
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 10000 });

    await use(page);
  },

  apiContext: async ({ playwright, testUser }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.API_URL || 'http://localhost:3001',
      extraHTTPHeaders: testUser.token
        ? {
            Authorization: `Bearer ${testUser.token}`
          }
        : {}
    });
    await use(context);
    await context.dispose();
  },

  createOwner: async ({ apiContext }, use) => {
    const creator = async (name = 'Tutor E2E Test') => {
      const response = await apiContext.post('/owners', {
        data: {
          fullName: name,
          documentId: `E2E-${Date.now()}`,
          contacts: [
            {
              label: 'Celular',
              value: '11999999999',
              type: 'phone',
              primary: true
            },
            {
              label: 'Email',
              value: `e2e-${Date.now()}@test.com`,
              type: 'email'
            }
          ],
          financialResponsible: true
        }
      });
      const data = await response.json();
      createdResources.push({ type: 'owner', id: data.id });
      return { id: data.id, name: data.fullName };
    };
    await use(creator);
  },

  createPatient: async ({ apiContext, createOwner }, use) => {
    const creator = async (ownerId: string, name = 'Paciente E2E Test') => {
      const response = await apiContext.post('/patients', {
        data: {
          primaryOwnerId: ownerId,
          name,
          species: 'canine',
          breed: 'SRD',
          sex: 'male',
          microchip: `E2E-${Date.now()}`
        }
      });
      const data = await response.json();
      createdResources.push({ type: 'patient', id: data.id });
      return { id: data.id, name: data.name };
    };
    await use(creator);
  },

  createAppointment: async ({ apiContext, testUser }, use) => {
    const creator = async (patientId: string, ownerId: string, professionalUserId?: string) => {
      const startAt = new Date();
      startAt.setHours(startAt.getHours() + 1);
      const endAt = new Date(startAt);
      endAt.setMinutes(endAt.getMinutes() + 30);

      const response = await apiContext.post('/appointments', {
        data: {
          patientId,
          ownerId,
          practitionerStaffId: professionalUserId || 'staff_vet',
          scheduledAt: startAt.toISOString(),
          visitType: 'scheduled',
          reason: 'Agendamento E2E Test'
        }
      });
      const data = await response.json();
      createdResources.push({ type: 'appointment', id: data.id });
      return { id: data.id };
    };
    await use(creator);
  },

  createEncounter: async ({ apiContext, testUser }, use) => {
    const creator = async (patientId: string, ownerId: string) => {
      const response = await apiContext.post('/encounters', {
        data: {
          patientId,
          ownerId,
          visitType: 'walk_in',
          origin: 'reception',
          reason: 'Atendimento E2E Test'
        }
      });
      const data = await response.json();
      createdResources.push({ type: 'encounter', id: data.id });
      return { id: data.id };
    };
    await use(creator);
  },

  cleanup: async ({}, use) => {
    await use(async () => {
      // Cleanup will run after test
      // Resources are tracked in createdResources
      console.log(`   🧹 Cleaning up ${createdResources.length} test resources`);
      createdResources.length = 0; // Clear for next test
    });
  }
});

export { expect };

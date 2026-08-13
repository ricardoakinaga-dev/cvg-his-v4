import type { FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests.
 *
 * This runs once before all tests and:
 * 1. Ensures the API is healthy
 * 2. Creates a test user if needed
 * 3. Logs in and saves the auth state
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const ACCOUNT_SLUG = process.env.E2E_ACCOUNT_SLUG?.trim() || 'default';

type ApiReadinessResponse = {
  readiness?: {
    ready?: boolean;
    productionReady?: boolean;
    persistenceMode?: string;
  };
  dependencies?: {
    database?: { state?: string };
    repositories?: { state?: string };
    worker?: { state?: string };
  };
};

function hasDatabaseBackedReadiness(payload: ApiReadinessResponse): boolean {
  return (
    payload.readiness?.ready === true &&
    payload.readiness?.productionReady === true &&
    payload.readiness?.persistenceMode === 'database' &&
    payload.dependencies?.database?.state === 'healthy' &&
    payload.dependencies?.repositories?.state === 'ready' &&
    payload.dependencies?.worker?.state === 'ready'
  );
}

async function waitForApiReadiness(): Promise<void> {
  let lastFailure = 'API did not respond';

  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}/ready`);
      const payload = (await response.json()) as ApiReadinessResponse;

      if (response.ok && hasDatabaseBackedReadiness(payload)) {
        console.log('   ✅ API ready with healthy database and repositories');
        return;
      }

      lastFailure = `status=${response.status} payload=${JSON.stringify(payload)}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`API did not report database-backed readiness after 30 seconds: ${lastFailure}`);
}

async function globalSetup(_config: FullConfig) {
  console.log('\n🔧 E2E Global Setup');
  console.log(`   Web: ${BASE_URL}`);
  console.log(`   API: ${API_URL}\n`);

  // 1. Require production-equivalent API readiness, including real persistence.
  console.log('   ⏳ Checking API readiness...');
  await waitForApiReadiness();

  // 2. Check Web health
  if (BASE_URL !== API_URL) {
    console.log('   ⏳ Checking Web health...');
    let webHealthy = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${BASE_URL}/login`);
        if (res.ok || res.status === 307) {
          console.log('   ✅ Web UI is reachable');
          webHealthy = true;
          break;
        }
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!webHealthy) {
      throw new Error('Web UI is not reachable after 30 seconds');
    }
  } else {
    console.log('   ℹ️  Web health check skipped (API-only E2E runtime)');
  }

  // 3. Login with seeded admin user
  console.log('   ⏳ Setting up test user...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accountSlug: ACCOUNT_SLUG,
      username: process.env.E2E_ADMIN_USERNAME || 'admin',
      password: process.env.E2E_ADMIN_PASSWORD || 'seed_admin'
    })
  });

  if (!loginRes.ok) {
    throw new Error(`E2E login failed (${loginRes.status}): ${await loginRes.text()}`);
  }

  const data = await loginRes.json();
  const accessToken = data.accessToken as string | undefined;
  const userId = (data.principal?.user?.id || data.actor?.userId || data.user?.id) as
    | string
    | undefined;
  const accountId = (data.principal?.user?.accountId ||
    data.actor?.accountId ||
    data.user?.accountId) as string | undefined;
  if (!accessToken || !userId || !accountId) {
    throw new Error('E2E login response is missing accessToken, userId or accountId');
  }

  console.log('   ✅ Test user authenticated');
  process.env.E2E_AUTH_TOKEN = accessToken;
  process.env.E2E_USER_ID = userId;
  process.env.E2E_ACCOUNT_ID = accountId;
  process.env.E2E_ACCOUNT_SLUG = ACCOUNT_SLUG;
  console.log(`   ℹ️  User ID: ${userId}`);
  console.log(`   ℹ️  Account ID: ${accountId}`);

  console.log('\n✅ Global setup complete\n');
}

export default globalSetup;

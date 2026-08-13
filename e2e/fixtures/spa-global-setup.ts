import type { FullConfig } from '@playwright/test';

/**
 * Global setup for SPA E2E tests.
 *
 * This runs once before all SPA tests and:
 * 1. Ensures the API is healthy
 * 2. Authenticates via API and saves the token
 * 3. Verifies the SPA is reachable
 *
 * The SPA uses localStorage for auth tokens, so tests will inject
 * the token directly into localStorage before navigating.
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:3111';
const SPA_URL = process.env.SPA_URL || 'http://127.0.0.1:3112';

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

function resolveE2EAccountSlug(): string {
  const accountSlug = process.env.E2E_ACCOUNT_SLUG?.trim();
  if (accountSlug) return accountSlug;
  return 'default';
}

async function globalSetup(_config: FullConfig) {
  console.log('\n🔧 SPA E2E Global Setup');
  console.log(`   SPA: ${SPA_URL}`);
  console.log(`   API: ${API_URL}\n`);

  // 1. Require production-equivalent API readiness, including real persistence.
  console.log('   ⏳ Checking API readiness...');
  await waitForApiReadiness();

  // 2. Authenticate via API
  console.log('   ⏳ Authenticating...');
  let token: string | null = null;
  let userId: string | null = null;
  let accountId: string | null = null;

  try {
    const username = resolveE2EAdminUsername();
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountSlug: resolveE2EAccountSlug(),
        username,
        password: process.env.E2E_ADMIN_PASSWORD || 'seed_admin'
      })
    });

    if (loginRes.ok) {
      const data = await loginRes.json();
      token = data.accessToken;
      userId = data.principal?.user?.id || data.actor?.userId || data.user?.id;
      accountId = data.principal?.user?.accountId || data.actor?.accountId || data.user?.accountId;
      console.log('   ✅ Authenticated via API login');
    } else {
      throw new Error(`API login failed (${loginRes.status}): ${await loginRes.text()}`);
    }
  } catch (err) {
    throw new Error(`SPA global auth setup failed: ${String(err)}`);
  }

  if (token && userId && accountId) {
    process.env.E2E_AUTH_TOKEN = token;
    process.env.E2E_USER_ID = userId;
    process.env.E2E_ACCOUNT_ID = accountId;
    process.env.E2E_ACCOUNT_SLUG = resolveE2EAccountSlug();
    console.log(`   ℹ️  Token obtained (length: ${token.length})`);
  } else {
    throw new Error('SPA global auth setup failed: token, userId or accountId missing');
  }

  // 3. Check SPA health
  console.log('   ⏳ Checking SPA health...');
  let spaReachable = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(SPA_URL);
      if (res.ok || res.status === 304) {
        console.log('   ✅ SPA is reachable');
        spaReachable = true;
        break;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!spaReachable) {
    throw new Error('SPA is not reachable after 30 seconds');
  }

  console.log('\n✅ SPA Global setup complete\n');
}

export default globalSetup;

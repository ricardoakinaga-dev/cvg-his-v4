import { chromium, type FullConfig } from '@playwright/test';

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

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 SPA E2E Global Setup');
  console.log(`   SPA: ${SPA_URL}`);
  console.log(`   API: ${API_URL}\n`);

  // 1. Check API health
  console.log('   ⏳ Checking API health...');
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        console.log(
          `   ✅ API healthy (status: ${data.status}, uptime: ${Math.round(data.uptime)}s)`
        );
        healthy = true;
        break;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!healthy) {
    throw new Error('API is not healthy after 30 seconds');
  }

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
        username,
        password: process.env.E2E_ADMIN_PASSWORD || 'seed_admin'
      })
    });

    if (loginRes.ok) {
      const data = await loginRes.json();
      token = data.accessToken;
      userId = data.actor?.userId || data.user?.id;
      accountId = data.actor?.accountId || data.user?.accountId;
      console.log('   ✅ Authenticated via API login');
    } else {
      throw new Error(`API login failed (${loginRes.status}): ${await loginRes.text()}`);
    }
  } catch (err) {
    throw new Error(`SPA global auth setup failed: ${String(err)}`);
  }

  if (token) {
    process.env.E2E_AUTH_TOKEN = token;
    process.env.E2E_USER_ID = userId || '';
    process.env.E2E_ACCOUNT_ID = accountId || '';
    console.log(`   ℹ️  Token obtained (length: ${token.length})`);
  } else {
    throw new Error('SPA global auth setup failed: no token obtained');
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
    console.log('   ⚠️  SPA not reachable — tests will fail if SPA is not running');
  }

  console.log('\n✅ SPA Global setup complete\n');
}

export default globalSetup;

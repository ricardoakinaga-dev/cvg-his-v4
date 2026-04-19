import { chromium, type FullConfig } from '@playwright/test';

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

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 E2E Global Setup');
  console.log(`   Web: ${BASE_URL}`);
  console.log(`   API: ${API_URL}\n`);

  // 1. Check API health
  console.log('   ⏳ Checking API health...');
  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        const healthStatus = data.status ?? (data.ok ? 'ok' : 'unknown');
        console.log(
          `   ✅ API healthy (status: ${healthStatus}, uptime: ${Math.round(data.uptime)}s)`
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

  // 2. Check Web health
  if (BASE_URL !== API_URL) {
    console.log('   ⏳ Checking Web health...');
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${BASE_URL}/login`);
        if (res.ok || res.status === 307) {
          console.log('   ✅ Web UI is reachable');
          break;
        }
      } catch {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  } else {
    console.log('   ℹ️  Web health check skipped (API-only E2E runtime)');
  }

  // 3. Login with seeded admin user
  console.log('   ⏳ Setting up test user...');
  try {
    // Login with credentials from docker-compose seed
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.E2E_ADMIN_USERNAME || 'admin',
        password: process.env.E2E_ADMIN_PASSWORD || 'seed_admin'
      })
    });

    if (loginRes.ok) {
      const data = await loginRes.json();
      console.log('   ✅ Test user authenticated');

      // Save token for tests (note: actor is nested in response)
      process.env.E2E_AUTH_TOKEN = data.accessToken;
      process.env.E2E_USER_ID = data.actor?.userId || data.user?.id || 'user_admin';
      process.env.E2E_ACCOUNT_ID =
        data.actor?.accountId || data.user?.accountId || 'acc_cvg_demo';
      console.log(`   ℹ️  User ID: ${process.env.E2E_USER_ID}`);
      console.log(`   ℹ️  Account ID: ${process.env.E2E_ACCOUNT_ID}`);
    } else {
      const err = await loginRes.text();
      console.log(`   ⚠️  Login failed (${loginRes.status}): ${err}`);

      // Try dev login as fallback
      console.log('   ⏳ Trying dev login...');
      const devLoginRes = await fetch(`${API_URL}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: '00000000-0000-0000-0000-000000000001',
          role: 'admin'
        })
      });

      if (devLoginRes.ok) {
        const data = await devLoginRes.json();
        console.log('   ✅ Dev login successful');
        process.env.E2E_AUTH_TOKEN = data.accessToken;
        process.env.E2E_USER_ID = data.user?.id || 'dev-user';
        process.env.E2E_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
      } else {
        console.log('   ⚠️  All auth methods failed');
        console.log('   ℹ️  Tests that require auth may fail');
      }
    }
  } catch (err) {
    console.log('   ⚠️  Auth setup failed:', err);
  }

  console.log('\n✅ Global setup complete\n');
}

export default globalSetup;

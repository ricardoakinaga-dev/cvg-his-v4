#!/usr/bin/env node

const required = ['DATABASE_URL', 'FILE_STORAGE_PATH'];
const recommended = ['REDIS_URL', 'API_BASE_URL', 'APP_NAME', 'HOST', 'PORT'];

const env = process.env;
const missing = required.filter((key) => !env[key]);

console.log('═══════════════════════════════════════════════════════════');
console.log('  CVG-HIS V2 Staging Check');
console.log('═══════════════════════════════════════════════════════════');

console.log(`NODE_ENV=${env.NODE_ENV ?? 'undefined'}`);
console.log(`APP_NAME=${env.APP_NAME ?? 'undefined'}`);

for (const key of required) {
  console.log(`${key}=${env[key] ? 'configured' : 'missing'}`);
}

for (const key of recommended) {
  console.log(`${key}=${env[key] ? 'configured' : 'optional'}`);
}

const authSecret = env.AUTH_SECRET;
const usesDefaultSecret =
  authSecret === undefined || authSecret === 'cvg-his-v2-phase-3-dev-secret';

if (usesDefaultSecret) {
  console.log('AUTH_SECRET=unsafe-default');
} else {
  console.log('AUTH_SECRET=configured');
}

if (missing.length > 0) {
  console.error(
    `Staging check failed: missing required environment variables: ${missing.join(', ')}`
  );
  process.exit(1);
}

if (usesDefaultSecret && ['staging', 'production'].includes(env.NODE_ENV ?? '')) {
  console.error('Staging check failed: AUTH_SECRET is using the default development secret.');
  process.exit(1);
}

const readyUrl = env.STAGING_READY_URL;
if (readyUrl) {
  try {
    const response = await fetch(readyUrl);
    const body = await response.text();
    console.log(`STAGING_READY_URL status=${response.status}`);
    if (!response.ok) {
      console.error(body);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Staging check failed: could not fetch ${readyUrl}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

console.log('Staging check passed.');

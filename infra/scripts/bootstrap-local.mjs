#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../..');

const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));

const dockerComposeFile = resolve(rootDir, 'docker-compose.dev.yml');

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: rootDir,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data;
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data;
      });
    }

    child.on('close', (code) => {
      if (code === 0 || options.ignoreExitCode) {
        resolve({ code, stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${cmd} ${args.join(' ')}`));
      }
    });

    child.on('error', reject);
  });
}

async function checkDocker() {
  try {
    await runCommand('docker', ['--version'], { silent: true });
    await runCommand('docker', ['compose', '--version'], { silent: true });
    return true;
  } catch {
    return false;
  }
}

async function waitForService(serviceName, checkFn, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      if (await checkFn()) {
        console.log(`✓ ${serviceName} is ready`);
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${serviceName} did not become ready in time`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  CVG-HIS V2 Local Bootstrap`);
  console.log(`  workspace: ${packageJson.name}@${packageJson.version}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const hasDocker = await checkDocker();

  if (!hasDocker) {
    console.log('⚠ Docker or Docker Compose not found.');
    console.log('  Falling back to in-memory mode.\n');
    console.log('To use real database and redis:');
    console.log('  1. Install Docker: https://docs.docker.com/get-docker/');
    console.log(
      '  2. Start services: docker compose -f docker-compose.dev.yml up -d postgres redis'
    );
    console.log('  3. Set DATABASE_URL environment variable');
    console.log('\nTo start development:');
    console.log('  pnpm dev:api    # Start API (in-memory mode)');
    console.log('  pnpm dev:worker # Start worker (in-memory mode)');
    return;
  }

  if (!existsSync(dockerComposeFile)) {
    console.log('⚠ docker-compose.dev.yml not found.');
    console.log('  Please ensure you are in the project root.');
    process.exit(1);
  }

  console.log('Step 1: Starting PostgreSQL and Redis...');
  try {
    await runCommand('docker', [
      'compose',
      '-f',
      'docker-compose.dev.yml',
      'up',
      '-d',
      'postgres',
      'redis'
    ]);
    console.log('✓ Containers started');
  } catch (e) {
    console.log('⚠ Could not start containers:', e.message);
    console.log('  Falling back to in-memory mode.\n');
    console.log('To start manually:');
    console.log('  docker compose -f docker-compose.dev.yml up -d postgres redis');
    return;
  }

  console.log('\nStep 2: Waiting for services to be healthy...');

  await waitForService('PostgreSQL', async () => {
    const result = await runCommand(
      'docker',
      ['compose', '-f', 'docker-compose.dev.yml', 'ps', '--format', 'json', 'postgres'],
      { silent: true }
    );
    return result.stdout.includes('healthy');
  });

  await waitForService('Redis', async () => {
    const result = await runCommand(
      'docker',
      ['compose', '-f', 'docker-compose.dev.yml', 'ps', '--format', 'json', 'redis'],
      { silent: true }
    );
    return result.stdout.includes('healthy');
  });

  console.log('\nStep 3: Environment setup');
  console.log('  DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvg_his');
  console.log('  REDIS_URL=redis://localhost:6379');
  console.log('\nTo start API with real database:');
  console.log('  DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvg_his pnpm dev:api');
  console.log('\nTo start Worker with real database:');
  console.log('  DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvg_his pnpm dev:worker');
  console.log('\nOr run both together:');
  console.log('  DATABASE_URL=postgres://postgres:postgres@localhost:5432/cvg_his pnpm dev');

  console.log('\n✓ Bootstrap complete!');
}

main().catch(console.error);

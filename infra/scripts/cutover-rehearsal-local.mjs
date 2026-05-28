#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z');
const runId = `${timestamp}-${process.pid}`;
const projectName = `cvg-his-v2-rehearsal-${process.pid}`;
const evidenceDir = resolve(process.env.CUTOVER_REHEARSAL_DIR ?? `/tmp/cvg-his-v2-cutover-rehearsals/${runId}`);
const envFile = join(evidenceDir, '.env.v2.rehearsal');
const overrideFile = join(evidenceDir, 'docker-compose.rehearsal.override.yml');
const composeFile = resolve('docker-compose.v2.yml');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
    env: options.env ?? process.env,
  });

  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${output ? `: ${output}` : ''}`);
  }

  return result;
}

function compose(args, options = {}) {
  return run(
    'docker',
    ['compose', '--project-name', projectName, '--env-file', envFile, '-f', composeFile, '-f', overrideFile, ...args],
    {
      ...options,
      capture: options.capture ?? true,
    },
  );
}

function waitForService(service) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ps = compose(['ps', '-q', service], { capture: true }).stdout.trim();
    if (ps) {
      const status = run(
        'docker',
        ['inspect', '--format', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}', ps],
        { capture: true },
      ).stdout.trim();
      if (status === 'healthy' || status === 'running') {
        return status;
      }
    }
    spawnSync('sleep', ['1']);
  }
  throw new Error(`${service} did not become healthy/running in time`);
}

function writeEnvFile() {
  const password = `postgres_${process.pid}_pw`;
  const authSecret = `local_rehearsal_auth_secret_${process.pid}_01234567890123456789`;
  writeFileSync(
    envFile,
    [
      'NODE_ENV=production',
      'POSTGRES_DB=cvg_his_v2_rehearsal',
      'POSTGRES_USER=postgres',
      `POSTGRES_PASSWORD=${password}`,
      `AUTH_SECRET=${authSecret}`,
      'CORS_ALLOWED_ORIGINS=http://127.0.0.1:3002',
      'VITE_APP_NAME=CVG HIS V2 Rehearsal',
      'VITE_DISABLE_PWA=1',
      'OTEL_ENABLED=false',
      'BACKUP_INCLUDE_STORAGE=true',
      '',
    ].join('\n'),
  );
}

function writeOverrideFile() {
  writeFileSync(
    overrideFile,
    [
      'services:',
      '  postgres:',
      '    ports: !reset []',
      '  redis:',
      '    ports: !reset []',
      'networks:',
      '  default:',
      `    name: ${projectName}_net`,
      '',
    ].join('\n'),
  );
}

function cleanup() {
  spawnSync(
    'docker',
    [
      'compose',
      '--project-name',
      projectName,
      '--env-file',
      envFile,
      '-f',
      composeFile,
      '-f',
      overrideFile,
      'down',
      '-v',
      '--remove-orphans',
    ],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'ignore', 'ignore'] },
  );
}

try {
  mkdirSync(evidenceDir, { recursive: true });
  writeEnvFile();
  writeOverrideFile();

  const readiness = run('node', ['infra/scripts/check-cutover-readiness.mjs', '--json'], { capture: true });
  writeFileSync(join(evidenceDir, 'cutover-readiness.json'), readiness.stdout);

  const config = compose(['config'], { capture: true });
  writeFileSync(join(evidenceDir, 'docker-compose.config.yml'), config.stdout);

  compose(['up', '-d', 'postgres', 'redis'], { capture: true });
  const postgresStatus = waitForService('postgres');
  const redisStatus = waitForService('redis');

  const ps = compose(['ps'], { capture: true });
  writeFileSync(join(evidenceDir, 'docker-compose.ps.txt'), ps.stdout);

  const postgresContainer = compose(['ps', '-q', 'postgres'], { capture: true }).stdout.trim();
  const redisContainer = compose(['ps', '-q', 'redis'], { capture: true }).stdout.trim();
  run('docker', ['logs', '--tail=120', postgresContainer], { capture: true });
  writeFileSync(
    join(evidenceDir, 'postgres.health.txt'),
    `container=${postgresContainer}\nstatus=${postgresStatus}\n`,
  );
  writeFileSync(join(evidenceDir, 'redis.health.txt'), `container=${redisContainer}\nstatus=${redisStatus}\n`);

  writeFileSync(
    join(evidenceDir, 'cutover-rehearsal-report.json'),
    JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        projectName,
        composeFile,
        envFile,
        overrideFile,
        evidenceDir,
        servicesStarted: ['postgres', 'redis'],
        postgresStatus,
        redisStatus,
        readinessEvidence: join(evidenceDir, 'cutover-readiness.json'),
        composeConfig: join(evidenceDir, 'docker-compose.config.yml'),
      },
      null,
      2,
    ),
  );

  console.log(`CUTOVER_REHEARSAL_REPORT=${join(evidenceDir, 'cutover-rehearsal-report.json')}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  cleanup();
}

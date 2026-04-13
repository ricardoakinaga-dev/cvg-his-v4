#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  const fullPath = resolve(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : undefined;
}

const files = {
  readme: read('README.md'),
  install: read('INSTALACAO_V2_OPENCLAW.md'),
  directives: read('OPENCLAW_DEPLOY_DIRETRIZES.md'),
  compose: read('docker-compose.v2.yml'),
  envExample: read('.env.v2.example'),
  caddy: read('infra/docker/Caddyfile.v2'),
  legacyReadme: read('apps/web/README.md'),
  deployDoc: read('docs/130-instalacao-publicacao-cvg-his-v2-real.md'),
  cutoverChecklist: read('docs/131-checklist-cutover-servidor.md'),
  policy: read('docs/470-politica-migracao-e-deploy.md')
};

const requiredBuildCommand =
  'build --no-cache cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa';
const requiredUpCommand = 'up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa';
const forbiddenWebBuildPattern = /build[^\n]*cvg-his-v2-web/;
const forbiddenWebUpPattern = /up[^\n]*cvg-his-v2-web/;

const checks = [
  {
    label: 'README raiz aponta apps/spa como frontend canonico',
    ok:
      files.readme?.includes('apps/spa') &&
      files.readme?.includes('frontend canonico') &&
      files.readme?.includes('pnpm deploy:check')
  },
  {
    label: 'guia de instalacao nao manda buildar ou subir o web legado',
    ok:
      files.install?.includes(requiredBuildCommand) &&
      files.install?.includes(requiredUpCommand) &&
      !forbiddenWebBuildPattern.test(files.install ?? '') &&
      !forbiddenWebUpPattern.test(files.install ?? '')
  },
  {
    label: 'diretrizes OpenClaw apontam apenas api, worker e spa como runtime oficial',
    ok:
      files.directives?.includes('cvg-his-v2-api') &&
      files.directives?.includes('cvg-his-v2-worker') &&
      files.directives?.includes('cvg-his-v2-spa') &&
      files.directives?.includes('apps/web') &&
      files.directives?.includes('fora do fluxo canonico')
  },
  {
    label: 'checklist de cutover usa portas e servicos atuais',
    ok:
      files.cutoverChecklist?.includes('3003') &&
      files.cutoverChecklist?.includes('3002') &&
      files.cutoverChecklist?.includes('cvg-his-v2-spa') &&
      !files.cutoverChecklist?.includes('subir `apps/web`') &&
      !forbiddenWebBuildPattern.test(files.cutoverChecklist ?? '') &&
      !forbiddenWebUpPattern.test(files.cutoverChecklist ?? '')
  },
  {
    label: 'politica de migracao aponta packages/db como unica trilha canônica',
    ok:
      files.policy?.includes('packages/db/src/migrate.ts') &&
      files.policy?.includes('packages/db/src/seed.ts') &&
      files.policy?.includes('packages/shared/database/src/migrations/001-016') &&
      files.policy?.includes('deprecada')
  },
  {
    label: 'compose deixa apps/web isolado em profile legacy',
    ok:
      files.compose?.includes("profiles: ['legacy']") &&
      files.compose?.includes('cvg-his-v2-web:') &&
      files.compose?.includes('cvg-his-v2-spa:')
  },
  {
    label: 'compose canonico nasce com NODE_ENV production-like por default',
    ok:
      files.compose?.includes('NODE_ENV: ${NODE_ENV:-production}') &&
      !files.compose?.includes('NODE_ENV: ${NODE_ENV:-development}')
  },
  {
    label: 'proxy publico aponta o dominio principal para a SPA e a API para 3003',
    ok:
      files.caddy?.includes('reverse_proxy 127.0.0.1:3002') &&
      files.caddy?.includes('reverse_proxy 127.0.0.1:3003') &&
      !files.caddy?.includes('reverse_proxy 127.0.0.1:3004')
  },
  {
    label: 'README do legado declara congelamento operacional',
    ok:
      files.legacyReadme?.includes('Frontend legado congelado') &&
      files.legacyReadme?.includes('nao recebe novas features')
  },
  {
    label: 'env example de publicacao nasce em production',
    ok:
      files.envExample?.includes('NODE_ENV=production') &&
      files.envExample?.includes('CORS_ALLOWED_ORIGINS=https://his.example.com') &&
      !files.envExample?.includes('NODE_ENV=development')
  },
  {
    label: 'doc vivo de deploy referencia o guardrail de deploy',
    ok:
      files.deployDoc?.includes('pnpm deploy:check') &&
      files.deployDoc?.includes('0012_audit_events_alignment.sql')
  }
];

let failures = 0;

for (const check of checks) {
  if (check.ok === undefined) {
    console.log(`[deploy-check] SKIP ${check.label} (documento nao existe ainda)`);
  } else if (check.ok) {
    console.log(`[deploy-check] PASS ${check.label}`);
  } else {
    failures += 1;
    console.error(`[deploy-check] FAIL ${check.label}`);
  }
}

if (failures > 0) {
  console.error(`[deploy-check] ${failures} check(s) failed`);
  process.exit(1);
}

console.log('[deploy-check] deploy documentation and runtime alignment are consistent');

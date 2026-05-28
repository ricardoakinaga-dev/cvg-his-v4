import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

const readText = (path) => readFileSync(join(root, path), 'utf8');
const exists = (path) => existsSync(join(root, path));

const checks = [];

const addCheck = ({ area, item, status, evidence, action = '' }) => {
  checks.push({ area, item, status, evidence, action });
};

const packageJson = JSON.parse(readText('package.json'));
const scripts = packageJson.scripts ?? {};

const vetusParity = spawnSync('node', ['scripts/check-vetus-parity.mjs'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

const requiredScripts = [
  ['build', 'Build completo do monorepo'],
  ['typecheck', 'Typecheck completo do monorepo'],
  ['validate:openapi', 'Contrato OpenAPI'],
  ['validate:rls', 'Cobertura RLS multi-tenant'],
  ['governance:access', 'Evidencia RBAC/ABAC por modulo critico'],
  ['governance:audit', 'Evidencia de cobertura de auditoria operacional'],
  ['governance:lgpd', 'Evidencia LGPD DSR, retencao e providers'],
  ['governance:observability', 'Evidencia de observabilidade e SLO operacional'],
  ['security:enterprise', 'Auditoria de segredos e dependencias'],
  ['security:evidence', 'Evidencia de seguranca com SBOM e SAST'],
  ['ops:backup:check', 'Backup/restore operacional'],
  ['ops:restore:drill:fixture', 'Restore drill real local com Postgres descartavel'],
  ['deploy:check', 'Cutover/deploy readiness'],
  ['deploy:rehearsal:local', 'Rehearsal local de cutover com Docker Compose'],
  ['validate:helm', 'Manifestos Helm'],
  ['test:e2e:spa:enterprise', 'E2E SPA Enterprise'],
  ['vetus:parity', 'Matriz Vetus final acima de 88'],
  ['rc:evidence', 'Pacote de evidencias Release Candidate'],
  ['rc:evidence:strict', 'Pacote de evidencias Release Candidate em modo estrito'],
];

for (const [name, label] of requiredScripts) {
  addCheck({
    area: 'Scripts',
    item: label,
    status: scripts[name] ? 'PASS' : 'FAIL',
    evidence: scripts[name] ? `package.json:${name}` : `Script ausente: ${name}`,
    action: scripts[name] ? '' : `Adicionar script ${name}.`,
  });
}

const enterpriseE2e = scripts['test:e2e:spa:enterprise'] ?? '';
const requiredSpecs = [
  'e2e/spa/master-search-360-reception.spec.ts',
  'e2e/spa/master-search-360-mobile.spec.ts',
  'e2e/spa/enterprise-surfaces-gate.spec.ts',
];

for (const spec of requiredSpecs) {
  addCheck({
    area: 'E2E',
    item: spec,
    status: exists(spec) && enterpriseE2e.includes(spec) ? 'PASS' : 'FAIL',
    evidence: exists(spec)
      ? `Arquivo existe; ${enterpriseE2e.includes(spec) ? 'incluido' : 'nao incluido'} em test:e2e:spa:enterprise`
      : 'Arquivo ausente',
    action: exists(spec) && enterpriseE2e.includes(spec) ? '' : 'Incluir o spec no gate Enterprise.',
  });
}

addCheck({
  area: 'Vetus',
  item: 'Matriz Vetus executavel acima de 88',
  status: vetusParity.status === 0 ? 'PASS' : 'FAIL',
  evidence: vetusParity.status === 0
    ? (vetusParity.stdout.match(/Score: \d+\/100/)?.[0] ?? 'pnpm vetus:parity passou')
    : (vetusParity.stderr.trim() || vetusParity.stdout.trim() || 'Falha ao executar matriz Vetus'),
  action: vetusParity.status === 0 ? '' : 'Executar pnpm vetus:parity e corrigir areas abaixo da meta.',
});

const ciPath = '.github/workflows/ci.yml';
if (exists(ciPath)) {
  const ci = readText(ciPath);
  const e2eBlock = ci.match(/- name: Run SPA E2E tests[\s\S]*?(?=\n      - name:|\n  [a-zA-Z_-]+:|\n$)/)?.[0] ?? '';
  for (const spec of requiredSpecs) {
    addCheck({
      area: 'CI',
      item: `CI executa ${spec}`,
      status: e2eBlock.includes(spec) ? 'PASS' : 'FAIL',
      evidence: e2eBlock.includes(spec) ? 'Bloco Run SPA E2E tests contem o spec' : 'Spec ausente no bloco Run SPA E2E tests',
      action: e2eBlock.includes(spec) ? '' : 'Adicionar spec ao job de E2E SPA.',
    });
  }
  addCheck({
    area: 'CI',
    item: 'E2E SPA sem continue-on-error',
    status: e2eBlock.includes('continue-on-error') ? 'FAIL' : 'PASS',
    evidence: e2eBlock.includes('continue-on-error')
      ? 'Bloco Run SPA E2E tests contem continue-on-error'
      : 'Bloco Run SPA E2E tests falha o pipeline quando E2E falha',
    action: e2eBlock.includes('continue-on-error') ? 'Remover continue-on-error do bloco E2E SPA.' : '',
  });
} else {
  addCheck({
    area: 'CI',
    item: 'Workflow CI',
    status: 'FAIL',
    evidence: 'Arquivo .github/workflows/ci.yml ausente',
    action: 'Criar workflow CI.',
  });
}

const requiredDocs = [
  'docs/construcoes-futuras/2026-05-28-plano-executivo-backlog-roadmap-premium-enterprise.md',
  'docs/construcoes-futuras/2026-05-28-guia-operacional-premium-enterprise.md',
  'docs/construcoes-futuras/2026-05-28-progresso-fase-4-gate-ci-jornada-360.md',
  'docs/construcoes-futuras/2026-05-28-progresso-fase-4-gate-enterprise-dashboard-relatorios.md',
  'docs/construcoes-futuras/2026-05-28-progresso-fase-4-e2e-360-postgresql-real.md',
  'docs/construcoes-futuras/2026-05-28-progresso-fase-4-e2e-360-mobile-visual.md',
  'docs/construcoes-futuras/2026-05-28-relatorio-matriz-vetus-final-premium-enterprise.md',
  'docs/construcoes-futuras/2026-05-28-pacote-evidencias-rc-premium-enterprise.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-restore-drill-real-local.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-cutover-rehearsal-local.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-seguranca-sbom-sast-evidencias.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-governanca-acesso-rbac-abac.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-auditoria-operacional-evidencias.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-lgpd-dsr-retencao-evidencias.md',
  'docs/construcoes-futuras/2026-05-28-progresso-rc-observabilidade-slo-evidencias.md',
];

for (const doc of requiredDocs) {
  addCheck({
    area: 'Documentacao',
    item: doc,
    status: exists(doc) ? 'PASS' : 'FAIL',
    evidence: exists(doc) ? 'Evidencia registrada' : 'Documento ausente',
    action: exists(doc) ? '' : 'Registrar evidencia do gate.',
  });
}

const lockPath = 'pnpm-lock.yaml';
if (exists(lockPath)) {
  const lock = readText(lockPath);
  const helperLines = lock
    .split('\n')
    .filter((line) => line.includes('vue-component-type-helpers'));
  const hasUnexpectedHelperVersion = helperLines.some((line) => !line.includes('3.2.7'));
  addCheck({
    area: 'Lockfile',
    item: 'vue-component-type-helpers fixado em 3.2.7',
    status: helperLines.length > 0 && !hasUnexpectedHelperVersion ? 'PASS' : 'FAIL',
    evidence: helperLines.length > 0 ? `${helperLines.length} entrada(s) verificadas` : 'Nenhuma entrada encontrada',
    action: helperLines.length > 0 && !hasUnexpectedHelperVersion
      ? ''
      : 'Ajustar pnpm-lock.yaml para manter somente 3.2.7.',
  });
}

const warnItems = [
  ['Homologacao', 'Evidencia de CI remoto verde', 'Confirmar execucao no GitHub Actions apos push.'],
  ['Homologacao', 'Backup/restore em ambiente real', 'Executar pnpm ops:backup:check contra ambiente homolog/staging.'],
  ['Homologacao', 'Deploy/cutover em ambiente real', 'Executar pnpm deploy:check e pnpm validate:helm com valores do ambiente alvo.'],
];

for (const [area, item, action] of warnItems) {
  addCheck({ area, item, status: 'WARN', evidence: 'Depende de ambiente externo ou aceite operacional', action });
}

const scoreWeights = { PASS: 1, WARN: 0.5, FAIL: 0 };
const score = Math.round(
  (checks.reduce((sum, check) => sum + scoreWeights[check.status], 0) / checks.length) * 100,
);

const byStatus = checks.reduce(
  (acc, check) => ({ ...acc, [check.status]: (acc[check.status] ?? 0) + 1 }),
  {},
);

console.log('# Enterprise Readiness Check');
console.log('');
console.log(`Score: ${score}/100`);
console.log(`PASS: ${byStatus.PASS ?? 0} | WARN: ${byStatus.WARN ?? 0} | FAIL: ${byStatus.FAIL ?? 0}`);
console.log('');
console.log('| Area | Item | Status | Evidence | Action |');
console.log('| --- | --- | --- | --- | --- |');
for (const check of checks) {
  console.log(
    `| ${check.area} | ${check.item} | ${check.status} | ${check.evidence} | ${check.action || '-'} |`,
  );
}

if ((byStatus.FAIL ?? 0) > 0) {
  process.exit(1);
}

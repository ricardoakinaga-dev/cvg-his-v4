import { spawnSync } from 'node:child_process';

const strictMode = process.argv.includes('--strict') || process.env.RC_EVIDENCE_STRICT === '1';

const commands = [
  {
    area: 'Readiness',
    item: 'Enterprise readiness gate',
    command: ['pnpm', ['readiness:enterprise']],
  },
  {
    area: 'Vetus',
    item: 'Vetus parity matrix',
    command: ['pnpm', ['vetus:parity']],
  },
  {
    area: 'Security',
    item: 'Security evidence with SBOM and SAST gate',
    command: ['pnpm', ['security:evidence']],
  },
  {
    area: 'Governance',
    item: 'RBAC/ABAC access governance evidence',
    command: ['pnpm', ['governance:access']],
  },
  {
    area: 'Governance',
    item: 'Operational audit coverage evidence',
    command: ['pnpm', ['governance:audit']],
  },
  {
    area: 'Governance',
    item: 'LGPD DSR, retention and provider evidence',
    command: ['pnpm', ['governance:lgpd']],
  },
  {
    area: 'Governance',
    item: 'Observability and SLO operational evidence',
    command: ['pnpm', ['governance:observability']],
  },
  {
    area: 'Backup',
    item: 'Static backup/restore surface',
    command: ['pnpm', ['ops:backup:check']],
  },
  {
    area: 'Deploy',
    item: 'Cutover/deploy static surface',
    command: ['pnpm', ['deploy:check']],
  },
  {
    area: 'Deploy',
    item: 'Local cutover rehearsal',
    command: ['pnpm', ['deploy:rehearsal:local']],
  },
  {
    area: 'Helm',
    item: 'Helm chart static/render validation',
    command: ['pnpm', ['validate:helm']],
  },
];

const externalEvidence = [
  {
    area: 'CI remoto',
    item: 'GitHub Actions verde com test:e2e:spa:enterprise',
    value: process.env.RC_CI_URL,
    action: 'Definir RC_CI_URL com o link do run verde.',
  },
  {
    area: 'Backup real',
    item: 'Restore drill real em homolog/staging',
    value: process.env.RC_BACKUP_DRILL_REPORT,
    action: 'Definir RC_BACKUP_DRILL_REPORT com o caminho/link do restore-drill-report.json real.',
  },
  {
    area: 'Deploy real',
    item: 'Deploy/cutover validado no ambiente alvo',
    value: process.env.RC_DEPLOY_EVIDENCE_URL,
    action: 'Definir RC_DEPLOY_EVIDENCE_URL com o link do checklist/evidencia de deploy.',
  },
];

function run(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  return {
    status: result.status === 0 ? 'PASS' : 'FAIL',
    exitCode: result.status ?? 1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  };
}

function compactEvidence(output) {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const interesting = lines.filter((line) =>
    /Score:|PASS:|WARN:|FAIL:|passed|validation passed|consistent|backup and restore|deploy documentation|Helm binary|Areas below target|Nenhuma area/i.test(
      line,
    ),
  );
  return (interesting.length ? interesting : lines.slice(-3)).join(' / ').slice(0, 500);
}

const results = commands.map((entry) => {
  const [command, args] = entry.command;
  const result = run(command, args);
  return {
    ...entry,
    ...result,
    evidence: compactEvidence(result.output),
  };
});

for (const entry of externalEvidence) {
  const hasEvidence = Boolean(entry.value);
  results.push({
    area: entry.area,
    item: entry.item,
    status: hasEvidence ? 'PASS' : strictMode ? 'FAIL' : 'WARN',
    exitCode: 0,
    evidence: entry.value || 'Evidencia externa nao informada nesta execucao.',
    action: hasEvidence ? '-' : entry.action,
  });
}

const totals = results.reduce(
  (acc, result) => ({
    ...acc,
    [result.status]: (acc[result.status] ?? 0) + 1,
  }),
  {},
);

console.log('# Enterprise RC Evidence Pack');
console.log('');
console.log(`Generated at: ${new Date().toISOString()}`);
console.log(`Mode: ${strictMode ? 'strict' : 'advisory'}`);
console.log(`PASS: ${totals.PASS ?? 0} | WARN: ${totals.WARN ?? 0} | FAIL: ${totals.FAIL ?? 0}`);
console.log('');
console.log('| Area | Item | Status | Evidence | Action |');
console.log('| --- | --- | --- | --- | --- |');
for (const result of results) {
  console.log(
    `| ${result.area} | ${result.item} | ${result.status} | ${result.evidence.replaceAll('|', '/')} | ${
      result.action ?? '-'
    } |`,
  );
}

if ((totals.FAIL ?? 0) > 0) {
  process.exit(1);
}

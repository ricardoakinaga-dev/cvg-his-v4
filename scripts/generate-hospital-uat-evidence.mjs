import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const templatePath = resolve(root, 'docs/templates/hospital-uat-evidence.template.json');
const outputPath = resolve(root, 'artifacts/usability/uat-evidence.json');
const candidateSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

if (!/^[0-9a-f]{40}$/.test(candidateSha)) {
  throw new Error('HEAD must be a complete lowercase Git SHA');
}

const template = JSON.parse(readFileSync(templatePath, 'utf8'));
const evidence = {
  ...template,
  candidateSha,
  generatedAt: new Date().toISOString(),
  status: 'NOT_PROVEN',
  decision: 'no-go',
  limitations: [
    ...(template.limitations ?? []),
    'A geração automática não cria identidade, execução, assinatura ou aprovação humana.'
  ]
};

mkdirSync(resolve(root, 'artifacts/usability'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(`Hospital UAT skeleton generated: ${outputPath}`);
console.log(`candidate_sha=${candidateSha}; status=NOT_PROVEN; decision=no-go`);

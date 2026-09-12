import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const outputDir = process.env.SECURITY_EVIDENCE_DIR ?? 'artifacts/security';
const outputPath = resolve(root, outputDir);

function currentCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function findPackageJsons(baseDir) {
  const found = [];
  const ignored = new Set([
    'node_modules',
    'dist',
    '.git',
    'coverage',
    'playwright-report',
    'spa-report'
  ]);

  function walk(dir) {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (ignored.has(entry.name)) {
        continue;
      }
      const next = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(next);
      } else if (entry.name === 'package.json') {
        found.push(next);
      }
    }
  }

  walk(baseDir);
  return found.sort();
}

function collectComponents() {
  const packageFiles = [
    'package.json',
    ...findPackageJsons('apps'),
    ...findPackageJsons('packages')
  ];
  const components = [];

  for (const file of packageFiles) {
    const pkg = readJson(file);
    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {})
    };

    components.push({
      type: 'application',
      name: pkg.name ?? file,
      version: pkg.version ?? '0.0.0',
      'bom-ref': `${pkg.name ?? file}@${pkg.version ?? '0.0.0'}`,
      properties: [
        { name: 'cvg:path', value: file },
        { name: 'cvg:dependencyCount', value: String(Object.keys(dependencies).length) }
      ]
    });

    for (const [name, version] of Object.entries(dependencies)) {
      components.push({
        type: 'library',
        name,
        version,
        'bom-ref': `library:${name}@${version}`,
        properties: [{ name: 'cvg:declaredBy', value: file }]
      });
    }
  }

  const unique = new Map();
  for (const component of components) {
    const key = `${component.type}:${component.name}:${component.version}`;
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, component);
      continue;
    }

    const existingProperties = existing.properties ?? [];
    for (const property of component.properties ?? []) {
      const alreadyDeclared = existingProperties.some((candidate) =>
        candidate.name === property.name && candidate.value === property.value
      );
      if (!alreadyDeclared) existingProperties.push(property);
    }
    existing.properties = existingProperties;
  }

  return [...unique.values()].sort((a, b) =>
    `${a.name}${a.version}`.localeCompare(`${b.name}${b.version}`)
  );
}

function assertUniqueBomRefs(components) {
  const refs = components.map((component) => component['bom-ref']);
  if (refs.some((ref) => typeof ref !== 'string' || ref.length === 0)) {
    throw new Error('SBOM component is missing a non-empty bom-ref.');
  }
  if (new Set(refs).size !== refs.length) {
    throw new Error('SBOM component bom-ref values must be unique.');
  }
}

function validateSemgrepCi() {
  const ci = readText('.github/workflows/ci.yml');
  const sastJob = ci.match(/  sast:\n[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|\n$)/)?.[0] ?? '';
  const checks = [
    ['job sast existe', Boolean(sastJob)],
    ['usa semgrep container pinned by digest', /container:\s*\n\s+image:\s*semgrep\/semgrep@sha256:[0-9a-f]{64}(?:\s|$)/.test(sastJob)],
    ['executa semgrep scan', /semgrep\s+scan/.test(sastJob)],
    ['usa regras locais e oficiais', /--config\s+\.semgrep\.yml/.test(sastJob) && /p\/security-audit/.test(sastJob) && /p\/nodejs/.test(sastJob) && /p\/typescript/.test(sastJob)],
    ['gera JSON', /--json-output\s+semgrep\.json/.test(sastJob)],
    ['gera SARIF', /--sarif-output\s+semgrep\.sarif/.test(sastJob)],
    ['faz upload SARIF pinned by SHA', /upload-sarif@[0-9a-f]{40}(?:\s|#|$)/.test(sastJob)],
    ['nao usa continue-on-error no SAST', !/continue-on-error:\s*true/.test(sastJob)]
  ];

  return checks.map(([label, pass]) => ({ label, status: pass ? 'PASS' : 'FAIL' }));
}

mkdirSync(outputPath, { recursive: true });

console.log('Running enterprise security audit...');
const securityAuditResult = run('pnpm', ['security:enterprise'], { capture: true, allowFailure: true });
if (securityAuditResult.status !== 0) {
  console.error('Enterprise security audit failed; security evidence will be marked FAIL.');
}

const semgrepChecks = validateSemgrepCi();
const semgrepFailures = semgrepChecks.filter((check) => check.status === 'FAIL');

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${createHash('sha256').update(`${Date.now()}-${root}`).digest('hex').slice(0, 32)}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: 'cvg-his-v4', name: 'generate-security-evidence.mjs', version: '1.0.0' }],
    component: {
      type: 'application',
      name: readJson('package.json').name,
      version: readJson('package.json').version
    }
  },
  components: collectComponents()
};
assertUniqueBomRefs(sbom.components);

const sbomPath = join(outputPath, 'sbom.cyclonedx.json');
writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`);
writeFileSync(join(outputPath, 'sbom.cdx.json'), readFileSync(sbomPath));

const report = {
  generatedAt: new Date().toISOString(),
  commit_sha: currentCommit(),
  status: semgrepFailures.length === 0 && securityAuditResult.status === 0 ? 'PASS' : 'FAIL',
  securityAudit: securityAuditResult.status === 0 ? 'PASS' : 'FAIL',
  securityAuditExitCode: securityAuditResult.status ?? 1,
  semgrepCi: semgrepChecks,
  sbom: {
    path: relative(root, sbomPath),
    components: sbom.components.length
  }
};

const reportPath = join(outputPath, 'security-evidence.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log('# Security Evidence');
console.log('');
console.log(`Status: ${report.status}`);
console.log(`SBOM: ${report.sbom.path}`);
console.log(`SBOM components: ${report.sbom.components}`);
console.log('');
console.log('| Check | Status |');
console.log('| --- | --- |');
for (const check of semgrepChecks) {
  console.log(`| ${check.label} | ${check.status} |`);
}

if (semgrepFailures.length > 0 || securityAuditResult.status !== 0) {
  process.exit(1);
}

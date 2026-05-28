import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const outputDir = process.env.SECURITY_EVIDENCE_DIR ?? 'artifacts/security';

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
    shell: false,
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }

  return result;
}

function findPackageJsons(baseDir) {
  const found = [];
  const ignored = new Set(['node_modules', 'dist', '.git', 'coverage', 'playwright-report', 'spa-report']);

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
  const packageFiles = ['package.json', ...findPackageJsons('apps'), ...findPackageJsons('packages')];
  const components = [];

  for (const file of packageFiles) {
    const pkg = readJson(file);
    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
      ...(pkg.peerDependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    };

    components.push({
      type: 'application',
      name: pkg.name ?? file,
      version: pkg.version ?? '0.0.0',
      'bom-ref': `${pkg.name ?? file}@${pkg.version ?? '0.0.0'}`,
      properties: [
        { name: 'cvg:path', value: file },
        { name: 'cvg:dependencyCount', value: String(Object.keys(dependencies).length) },
      ],
    });

    for (const [name, version] of Object.entries(dependencies)) {
      components.push({
        type: 'library',
        name,
        version,
        'bom-ref': `${name}@${version}`,
        properties: [{ name: 'cvg:declaredBy', value: file }],
      });
    }
  }

  const unique = new Map();
  for (const component of components) {
    const key = `${component.type}:${component.name}:${component.version}:${component.properties?.[0]?.value ?? ''}`;
    if (!unique.has(key)) {
      unique.set(key, component);
    }
  }

  return [...unique.values()].sort((a, b) => `${a.name}${a.version}`.localeCompare(`${b.name}${b.version}`));
}

function validateSemgrepCi() {
  const ci = readText('.github/workflows/ci.yml');
  const sastJob = ci.match(/  sast:\n[\s\S]*?(?=\n  [a-zA-Z0-9_-]+:|\n$)/)?.[0] ?? '';
  const checks = [
    ['job sast existe', Boolean(sastJob)],
    ['usa semgrep action', /returntocorp\/semgrep-action@v1/.test(sastJob)],
    ['usa security-extended', /p\/security-extended/.test(sastJob)],
    ['usa nodejs/typescript rules', /p\/nodejs/.test(sastJob) && /p\/typescript/.test(sastJob)],
    ['gera JSON', /output:\s*semgrep\.json/.test(sastJob)],
    ['gera SARIF', /sarif:\s*semgrep\.sarif/.test(sastJob)],
    ['faz upload SARIF', /upload-sarif@v3/.test(sastJob)],
    ['nao usa continue-on-error no SAST', !/continue-on-error:\s*true/.test(sastJob)],
  ];

  return checks.map(([label, pass]) => ({ label, status: pass ? 'PASS' : 'FAIL' }));
}

mkdirSync(join(root, outputDir), { recursive: true });

console.log('Running enterprise security audit...');
run('pnpm', ['security:enterprise']);

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
      version: readJson('package.json').version,
    },
  },
  components: collectComponents(),
};

const sbomPath = join(root, outputDir, 'sbom.cyclonedx.json');
writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`);

const report = {
  generatedAt: new Date().toISOString(),
  status: semgrepFailures.length === 0 ? 'PASS' : 'FAIL',
  securityAudit: 'PASS',
  semgrepCi: semgrepChecks,
  sbom: {
    path: relative(root, sbomPath),
    components: sbom.components.length,
  },
};

const reportPath = join(root, outputDir, 'security-evidence.json');
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

if (semgrepFailures.length > 0) {
  process.exit(1);
}

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { enrichCycloneDxBom, validateCycloneDxBom } from './validate-cyclonedx-sbom.mjs';

export const CDXGEN_PACKAGE = '@cyclonedx/cdxgen@12.8.3';
export const CDXGEN_INTEGRITY =
  'sha512-EfLTkLRjzfWGUdSngTV+yOl8VkNv+mkpC6J7IuuzSumB7FsZFPsPG4EHiGKqoZdeXjdJN1zloXSedw7cW6cF/w==';

export function cdxgenArguments(outputPath) {
  return [
    'dlx',
    CDXGEN_PACKAGE,
    '--type',
    'js',
    '--spec-version',
    '1.6',
    '--output',
    outputPath,
    '--recurse',
    '--validate',
    '--fail-on-error',
    '--no-install-deps',
    '--include-formulation',
    '--json-pretty',
    '.',
  ];
}

export function generateCycloneDxSbom({
  root = process.cwd(),
  output = process.env.SBOM_OUTPUT ?? 'artifacts/security/sbom.cyclonedx.json',
  runner = spawnSync,
} = {}) {
  const outputPath = resolve(root, output);
  const reportPath = resolve(root, process.env.SBOM_GENERATION_REPORT ?? 'artifacts/security/sbom-generation.json');
  const logPath = resolve(root, process.env.SBOM_GENERATION_LOG ?? 'artifacts/security/cdxgen.log');
  const lockPath = resolve(root, 'pnpm-lock.yaml');
  mkdirSync(dirname(outputPath), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });

  const startedAt = new Date().toISOString();
  const command = 'pnpm';
  const args = cdxgenArguments(outputPath);
  const processResult = runner(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  writeFileSync(logPath, `${processResult.stdout ?? ''}${processResult.stderr ?? ''}`);

  let validation = { status: 'FAIL', errors: ['cdxgen did not complete successfully.'] };
  try {
    if (processResult.status === 0) {
      const lockContents = readFileSync(lockPath, 'utf8');
      const generated = JSON.parse(readFileSync(outputPath, 'utf8'));
      const enriched = enrichCycloneDxBom(generated, lockContents, {
        generator: CDXGEN_PACKAGE,
        integrity: CDXGEN_INTEGRITY,
      });
      writeFileSync(outputPath, `${JSON.stringify(enriched, null, 2)}\n`);
      validation = validateCycloneDxBom(enriched, lockContents);
    }
  } catch (error) {
    validation = {
      status: 'FAIL',
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }

  const report = {
    startedAt,
    completedAt: new Date().toISOString(),
    status: processResult.status === 0 && validation.status === 'PASS' ? 'PASS' : 'FAIL',
    generator: CDXGEN_PACKAGE,
    generatorIntegrity: CDXGEN_INTEGRITY,
    command: [command, ...args.map((value) => (value === outputPath ? relative(root, value) : value))],
    generatorExitCode: processResult.status ?? 1,
    output: relative(root, outputPath),
    log: relative(root, logPath),
    validation,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export function runCli() {
  const report = generateCycloneDxSbom();
  console.log(
    `CycloneDX SBOM ${report.status}: ${report.validation.components ?? 0} components, ${report.validation.dependencies ?? 0} dependency nodes.`,
  );
  return report.status === 'PASS' ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(runCli());
}

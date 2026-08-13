import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { parse } from 'yaml';

const rootPackage = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const apiPackage = JSON.parse(
  readFileSync(new URL('../apps/api/package.json', import.meta.url), 'utf8'),
);
const databasePackage = JSON.parse(
  readFileSync(new URL('../packages/db/package.json', import.meta.url), 'utf8'),
);
const workerPackage = JSON.parse(
  readFileSync(new URL('../apps/worker/package.json', import.meta.url), 'utf8'),
);
const workflow = parse(
  readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
);

const dockerfiles = Object.fromEntries(
  ['api', 'spa', 'worker'].map((name) => [
    name,
    readFileSync(new URL(`../apps/${name}/Dockerfile`, import.meta.url), 'utf8'),
  ]),
);

function runnerStage(dockerfile) {
  return dockerfile.slice(dockerfile.lastIndexOf('\nFROM ') + 1);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : extname(entry.name) === '.ts' && !entry.name.endsWith('.test.ts')
        ? [path]
        : [];
  });
}

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function directSourceDependencies(directory) {
  const dependencies = new Set();
  for (const file of sourceFiles(directory)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/g)) {
      const specifier = match[2];
      if (!specifier || specifier.startsWith('.') || specifier.startsWith('node:')) continue;
      dependencies.add(packageName(specifier));
    }
  }
  return [...dependencies].sort();
}

test('pins package manager and every container base image exactly', () => {
  const packageManagerVersion = rootPackage.packageManager.replace(/^pnpm@/, '');
  assert.match(packageManagerVersion, /^\d+\.\d+\.\d+$/);

  for (const [name, dockerfile] of Object.entries(dockerfiles)) {
    const fromLines = dockerfile.match(/^FROM .+$/gm) ?? [];
    assert.ok(fromLines.length >= 2, `${name} must use a multi-stage build`);
    for (const fromLine of fromLines) {
      assert.match(fromLine, /@sha256:[a-f0-9]{64}(?:\s+AS\s+\w+)?$/i, `${name}: ${fromLine}`);
    }
    assert.match(dockerfile, new RegExp(`pnpm@${packageManagerVersion.replaceAll('.', '\\.')}`));
  }

  const setupSteps = Object.values(workflow.jobs)
    .flatMap((job) => job.steps ?? [])
    .filter((step) => String(step.uses ?? '').startsWith('pnpm/action-setup@'));
  assert.ok(setupSteps.length > 0);
  for (const step of setupSteps) {
    assert.equal(String(step.with?.version), packageManagerVersion);
  }
});

test('deploys only production dependency closures for API and worker', () => {
  const expectedPackages = {
    api: '@cvg-his-v2/api',
    worker: '@cvg-his-v2/worker',
  };

  for (const [name, packageName] of Object.entries(expectedPackages)) {
    const dockerfile = dockerfiles[name];
    assert.match(dockerfile, new RegExp(`pnpm --filter ${packageName.replace('/', '\\/')}\\.\\.\\. run build`));
    assert.match(dockerfile, new RegExp(`pnpm --filter ${packageName.replace('/', '\\/')} deploy --prod /runtime/${name}`));
    assert.doesNotMatch(dockerfile, /RUN pnpm build(?:\s|$)/);
    assert.doesNotMatch(runnerStage(dockerfile), /COPY --from=builder \/workspace\/(?:node_modules|apps|packages)/);
  }
});

test('declares every direct runtime import as a production dependency', () => {
  const root = dirname(fileURLToPath(import.meta.url));
  for (const [name, packageJson] of [
    ['api', apiPackage],
    ['worker', workerPackage],
  ]) {
    const declared = packageJson.dependencies ?? {};
    for (const dependency of directSourceDependencies(join(root, '..', 'apps', name, 'src'))) {
      assert.ok(declared[dependency], `${name} imports undeclared production dependency ${dependency}`);
    }
  }
});

test('runs every deployable image as a fixed non-root user', () => {
  for (const name of ['api', 'worker']) {
    const runner = runnerStage(dockerfiles[name]);
    assert.match(
      runner,
      /gcr\.io\/distroless\/nodejs22-debian13:nonroot@sha256:[a-f0-9]{64}/,
    );
    assert.match(runner, /\nUSER nonroot\n/);
    assert.match(runner, /ENTRYPOINT \["\/nodejs\/bin\/node"\]/);
  }
  assert.match(dockerfiles.spa, /nginxinc\/nginx-unprivileged:1\.31-alpine@sha256:/);
  assert.match(runnerStage(dockerfiles.spa), /\nUSER 101:101\n/);
});

test('keeps database bootstrap tooling explicit in the API production closure', () => {
  assert.equal(apiPackage.dependencies['@cvg-his/db'], 'workspace:*');
  assert.ok(apiPackage.dependencies.pg);
  assert.ok(databasePackage.dependencies.dotenv);
  assert.match(
    dockerfiles.api,
    /cp [^\n]*scripts\/provision-database-runtime-role\.mjs [^\n]*\/runtime\/api\/ops\//,
  );
  assert.match(
    dockerfiles.api,
    /cp [^\n]*scripts\/database-bootstrap\.mjs [^\n]*\/runtime\/api\/ops\//,
  );

  const bootstrapTemplate = readFileSync(
    new URL('../infra/helm/cvg-his-v2/templates/database-bootstrap-job.yaml', import.meta.url),
    'utf8',
  );
  const apiTemplate = readFileSync(
    new URL('../infra/helm/cvg-his-v2/templates/api-deployment.yaml', import.meta.url),
    'utf8',
  );
  const workerTemplate = readFileSync(
    new URL('../infra/helm/cvg-his-v2/templates/worker-deployment.yaml', import.meta.url),
    'utf8',
  );

  assert.match(bootstrapTemplate, /command: \["\/nodejs\/bin\/node"\]/);
  assert.match(bootstrapTemplate, /args: \["ops\/database-bootstrap\.mjs"\]/);
  for (const template of [apiTemplate, workerTemplate]) {
    assert.match(template, /command: \["\/nodejs\/bin\/node"\]/);
    assert.match(template, /- "ops\/provision-database-runtime-role\.mjs"/);
    assert.match(template, /- "--validate-only"/);
    assert.doesNotMatch(template, /\/bin\/sh|\bwhile\b|\bsleep\b/);
  }
});

test('defines container-native health checks without adding package-manager tools to runners', () => {
  assert.match(runnerStage(dockerfiles.api), /HEALTHCHECK[\s\S]+CMD \["\/nodejs\/bin\/node"/);
  assert.match(runnerStage(dockerfiles.worker), /HEALTHCHECK[\s\S]+CMD \["\/nodejs\/bin\/node"/);
  assert.doesNotMatch(runnerStage(dockerfiles.api), /apt-get|npm|pnpm/);
  assert.doesNotMatch(runnerStage(dockerfiles.worker), /apt-get|npm|pnpm/);
});

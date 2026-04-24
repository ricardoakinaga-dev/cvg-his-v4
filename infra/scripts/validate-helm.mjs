import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import YAML from 'yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const chartDir = path.join(rootDir, 'infra', 'helm', 'cvg-his-v2');
const baseValues = path.join(chartDir, 'values.yaml');

const environments = [
  {
    name: 'dev',
    release: 'cvg-his-v2-dev',
    values: path.join(chartDir, 'values.dev.yaml'),
    expectManagedSecrets: true,
    expectEmbeddedDatastores: true,
    expectApiProbes: false
  },
  {
    name: 'staging',
    release: 'cvg-his-v2-staging',
    values: path.join(chartDir, 'values.staging.yaml'),
    expectManagedSecrets: false,
    expectEmbeddedDatastores: false,
    expectApiProbes: true
  },
  {
    name: 'prod',
    release: 'cvg-his-v2-prod',
    values: path.join(chartDir, 'values.prod.yaml'),
    expectManagedSecrets: false,
    expectEmbeddedDatastores: false,
    expectApiProbes: true
  }
];

function runHelm(args) {
  return execFileSync('helm', args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function hasHelm() {
  const result = spawnSync('helm', ['version', '--short'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return result.status === 0;
}

function readYamlFile(filePath) {
  assert(fs.existsSync(filePath), `Required Helm file not found: ${path.relative(rootDir, filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = YAML.parse(content);
  assert(parsed && typeof parsed === 'object', `Invalid YAML file: ${path.relative(rootDir, filePath)}`);
  return parsed;
}

function validateStaticChart() {
  const chart = readYamlFile(path.join(chartDir, 'Chart.yaml'));
  const base = readYamlFile(baseValues);

  assert(chart.apiVersion === 'v2', 'Chart.yaml must use apiVersion v2');
  assert(chart.name === 'cvg-his-v2', 'Chart.yaml name must be cvg-his-v2');
  assert(base.api?.image?.repository, 'values.yaml must define api.image.repository');
  assert(base.worker?.image?.repository, 'values.yaml must define worker.image.repository');
  assert(base.spa?.image?.repository, 'values.yaml must define spa.image.repository');

  const requiredTemplates = [
    'api-deployment.yaml',
    'worker-deployment.yaml',
    'spa-deployment.yaml',
    'configmap.yaml',
    'poddisruptionbudgets.yaml',
    'secrets.yaml',
    'postgres-statefulset.yaml',
    'redis-statefulset.yaml'
  ];

  for (const template of requiredTemplates) {
    const templatePath = path.join(chartDir, 'templates', template);
    assert(fs.existsSync(templatePath), `Required Helm template not found: templates/${template}`);
  }

  for (const environment of environments) {
    const values = readYamlFile(environment.values);
    if (environment.expectManagedSecrets) {
      assert(values.api?.auth?.value, `${environment.name}: expected managed API auth secret value`);
    } else {
      assert(values.api?.auth?.existingSecret, `${environment.name}: expected API existingSecret`);
    }

    if (environment.expectEmbeddedDatastores) {
      assert(values.postgresql?.enabled === true, `${environment.name}: expected embedded PostgreSQL`);
      assert(values.redis?.enabled === true, `${environment.name}: expected embedded Redis`);
    } else {
      assert(values.postgresql?.enabled === false, `${environment.name}: expected external PostgreSQL`);
      assert(values.redis?.enabled === false, `${environment.name}: expected external Redis`);
      assert(values.postgresql?.existingSecret, `${environment.name}: expected PostgreSQL existingSecret`);
      assert(values.redis?.existingSecret, `${environment.name}: expected Redis existingSecret`);
    }
  }
}

function parseDocuments(rendered) {
  return YAML.parseAllDocuments(rendered)
    .map((document) => document.toJSON())
    .filter((value) => value && typeof value === 'object');
}

function findDoc(docs, kind, name) {
  return docs.find((doc) => doc.kind === kind && doc.metadata?.name === name);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

if (!hasHelm()) {
  validateStaticChart();
  console.log('Helm binary not found; static Helm chart validation passed for dev, staging, and prod.');
  process.exit(0);
}

for (const environment of environments) {
  const lintArgs = ['lint', chartDir, '-f', baseValues, '-f', environment.values];
  const templateArgs = [
    'template',
    environment.release,
    chartDir,
    '-f',
    baseValues,
    '-f',
    environment.values
  ];
  runHelm(lintArgs);
  const rendered = runHelm(templateArgs);
  const docs = parseDocuments(rendered);

  const prefix = `${environment.release}-cvg-his-v2`;
  const apiDeployment = findDoc(docs, 'Deployment', `${prefix}-api`);
  const workerDeployment = findDoc(docs, 'Deployment', `${prefix}-worker`);
  const spaDeployment = findDoc(docs, 'Deployment', `${prefix}-spa`);
  const apiService = findDoc(docs, 'Service', `${prefix}-api`);
  const workerService = findDoc(docs, 'Service', `${prefix}-worker`);
  const spaService = findDoc(docs, 'Service', `${prefix}-spa`);
  const apiPdb = findDoc(docs, 'PodDisruptionBudget', `${prefix}-api`);
  const workerPdb = findDoc(docs, 'PodDisruptionBudget', `${prefix}-worker`);
  const spaPdb = findDoc(docs, 'PodDisruptionBudget', `${prefix}-spa`);

  assert(apiDeployment, `${environment.name}: API deployment not rendered`);
  assert(workerDeployment, `${environment.name}: worker deployment not rendered`);
  assert(spaDeployment, `${environment.name}: SPA deployment not rendered`);
  assert(apiService, `${environment.name}: API service not rendered`);
  assert(workerService, `${environment.name}: worker service not rendered`);
  assert(spaService, `${environment.name}: SPA service not rendered`);
  assert(apiPdb, `${environment.name}: API PodDisruptionBudget not rendered`);
  assert(workerPdb, `${environment.name}: worker PodDisruptionBudget not rendered`);
  assert(spaPdb, `${environment.name}: SPA PodDisruptionBudget not rendered`);

  const apiContainer = apiDeployment.spec.template.spec.containers[0];
  const workerContainer = workerDeployment.spec.template.spec.containers[0];

  if (environment.expectApiProbes) {
    assert(
      apiContainer.livenessProbe?.httpGet?.path === '/live',
      `${environment.name}: API liveness probe must target /live`
    );
    assert(
      apiContainer.readinessProbe?.httpGet?.path === '/ready',
      `${environment.name}: API readiness probe must target /ready`
    );
  } else {
    assert(
      !apiContainer.livenessProbe && !apiContainer.readinessProbe,
      `${environment.name}: API probes should remain disabled in local development overlay`
    );
  }
  assert(
    workerContainer.livenessProbe?.httpGet?.path === '/live',
    `${environment.name}: worker liveness probe must target /live`
  );
  assert(
    workerContainer.readinessProbe?.httpGet?.path === '/ready',
    `${environment.name}: worker readiness probe must target /ready`
  );
  assert(
    workerContainer.envFrom?.some((entry) => entry.configMapRef?.name === `${prefix}-worker-config`),
    `${environment.name}: worker must consume its ConfigMap`
  );

  const secretDocs = docs.filter((doc) => doc.kind === 'Secret');
  if (environment.expectManagedSecrets) {
    assert(secretDocs.length >= 3, `${environment.name}: expected chart-managed secrets for local bootstrap`);
  } else {
    assert(secretDocs.length === 0, `${environment.name}: existingSecret mode must not render managed Secret resources`);
  }

  const postgresStatefulSet = findDoc(docs, 'StatefulSet', `${prefix}-postgres`);
  const redisStatefulSet = findDoc(docs, 'StatefulSet', `${prefix}-redis`);
  if (environment.expectEmbeddedDatastores) {
    assert(postgresStatefulSet, `${environment.name}: expected embedded PostgreSQL statefulset`);
    assert(redisStatefulSet, `${environment.name}: expected embedded Redis statefulset`);
  } else {
    assert(!postgresStatefulSet, `${environment.name}: external PostgreSQL environment must not render statefulset`);
    assert(!redisStatefulSet, `${environment.name}: external Redis environment must not render statefulset`);
  }
}

console.log('Helm validation passed for dev, staging, and prod.');

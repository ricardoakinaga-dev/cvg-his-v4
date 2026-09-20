import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import YAML from 'yaml';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const chartDir = path.join(rootDir, 'infra', 'helm', 'cvg-his-v2');
const baseValues = path.join(chartDir, 'values.yaml');
export const REQUIRED_HELM_VERSION = 'v3.15.4';
const REQUIRED_HELM_VERSION_PATTERN = /^v3\.15\.4(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const isRequiredHelmVersion = (version) => REQUIRED_HELM_VERSION_PATTERN.test(version);
const helmExecutable = process.env.HELM_BIN || 'helm';

const environments = [
  {
    name: 'dev',
    release: 'cvg-his-v2-dev',
    values: path.join(chartDir, 'values.dev.yaml'),
    expectManagedSecrets: true,
    expectEmbeddedDatastores: true,
    expectApiProbes: false,
    expectLocalAttachmentStorage: true
  },
  {
    name: 'staging',
    release: 'cvg-his-v2-staging',
    values: path.join(chartDir, 'values.staging.yaml'),
    expectManagedSecrets: false,
    expectEmbeddedDatastores: false,
    expectApiProbes: true,
    expectLocalAttachmentStorage: false
  },
  {
    name: 'prod',
    release: 'cvg-his-v2-prod',
    values: path.join(chartDir, 'values.prod.yaml'),
    expectManagedSecrets: false,
    expectEmbeddedDatastores: false,
    expectApiProbes: true,
    expectLocalAttachmentStorage: false
  }
];
const validationImageDigests = {
  api: `sha256:${'a'.repeat(64)}`,
  worker: `sha256:${'b'.repeat(64)}`,
  spa: `sha256:${'c'.repeat(64)}`
};

function runHelm(args) {
  return execFileSync(helmExecutable, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function assertHelmFailure(args, expectedMessage) {
  const result = spawnSync(helmExecutable, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  assert(result.status !== 0, `Helm command unexpectedly succeeded: ${args.join(' ')}`);
  assert(
    output.includes(expectedMessage),
    `Helm failure did not include the expected guardrail: ${expectedMessage}`
  );
}

function getHelmVersion() {
  const result = spawnSync(helmExecutable, ['version', '--short'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  return result.status === 0 ? result.stdout.trim() : null;
}

function readYamlFile(filePath) {
  assert(
    fs.existsSync(filePath),
    `Required Helm file not found: ${path.relative(rootDir, filePath)}`
  );
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = YAML.parse(content);
  assert(
    parsed && typeof parsed === 'object',
    `Invalid YAML file: ${path.relative(rootDir, filePath)}`
  );
  return parsed;
}

function validateStaticChart() {
  const chart = readYamlFile(path.join(chartDir, 'Chart.yaml'));
  const base = readYamlFile(baseValues);
  const production = readYamlFile(path.join(chartDir, 'values.prod.yaml'));
  const helmHelpers = fs.readFileSync(path.join(chartDir, 'templates', '_helpers.tpl'), 'utf8');

  assert(chart.apiVersion === 'v2', 'Chart.yaml must use apiVersion v2');
  assert(chart.name === 'cvg-his-v2', 'Chart.yaml name must be cvg-his-v2');
  assert(base.api?.image?.repository, 'values.yaml must define api.image.repository');
  assert(base.api?.setup?.secretKey, 'values.yaml must define the setup bootstrap secret key');
  assert(base.worker?.image?.repository, 'values.yaml must define worker.image.repository');
  assert(
    base.worker?.accountIds?.secretKey,
    'values.yaml must define worker.accountIds.secretKey for the production worker scope'
  );
  assert(base.spa?.image?.repository, 'values.yaml must define spa.image.repository');
  assert(
    /^sha256:[a-f0-9]{64}$/.test(base.postgresql?.image?.sha ?? ''),
    'values.yaml must define an immutable PostgreSQL image digest'
  );
  assert(
    /^sha256:[a-f0-9]{64}$/.test(base.redis?.image?.sha ?? ''),
    'values.yaml must define an immutable Redis image digest'
  );
  assert(
    production.global?.environment === 'production',
    'values.prod.yaml must declare the production environment'
  );
  assert(
    production.persistence?.enabled === false &&
      Boolean(production.api?.attachmentStorage?.existingSecret),
    'Production must use S3-compatible attachment storage without a shared local PVC'
  );
  assert(
    base.persistence?.accessMode === 'ReadWriteOnce',
    'Single-replica local attachment storage must declare its access mode explicitly'
  );
  assert(
    helmHelpers.includes('api.image.sha is required for production image immutability') &&
      helmHelpers.includes('worker.image.sha is required for production image immutability') &&
      helmHelpers.includes('spa.image.sha is required for production image immutability') &&
      helmHelpers.includes(
        'postgresql.image.sha is required for embedded datastore image immutability'
      ) &&
      helmHelpers.includes(
        'redis.image.sha is required for embedded datastore image immutability'
      ) &&
      helmHelpers.includes('sha256:<64 lowercase hex characters>'),
    'Helm images must fail closed without immutable SHA references'
  );

  const requiredTemplates = [
    'api-deployment.yaml',
    'worker-deployment.yaml',
    'spa-deployment.yaml',
    'configmap.yaml',
    'poddisruptionbudgets.yaml',
    'secrets.yaml',
    'database-maintenance-jobs.yaml',
    'postgres-statefulset.yaml',
    'redis-statefulset.yaml'
  ];

  for (const template of requiredTemplates) {
    const templatePath = path.join(chartDir, 'templates', template);
    assert(fs.existsSync(templatePath), `Required Helm template not found: templates/${template}`);
  }

  const apiDeploymentTemplate = fs.readFileSync(
    path.join(chartDir, 'templates', 'api-deployment.yaml'),
    'utf8'
  );
  const apiSecretsTemplate = fs.readFileSync(
    path.join(chartDir, 'templates', 'secrets.yaml'),
    'utf8'
  );
  const workerDeploymentTemplate = fs.readFileSync(
    path.join(chartDir, 'templates', 'worker-deployment.yaml'),
    'utf8'
  );
  const spaDeploymentTemplate = fs.readFileSync(
    path.join(chartDir, 'templates', 'spa-deployment.yaml'),
    'utf8'
  );
  const configMapTemplate = fs.readFileSync(
    path.join(chartDir, 'templates', 'configmap.yaml'),
    'utf8'
  );
  const spaNginxTemplate = fs.readFileSync(path.join(chartDir, 'files', 'spa-nginx.conf'), 'utf8');
  const dockerCompose = fs.readFileSync(path.join(rootDir, 'docker-compose.v2.yml'), 'utf8');
  const databaseMaintenanceJobs = fs.readFileSync(
    path.join(chartDir, 'templates', 'database-maintenance-jobs.yaml'),
    'utf8'
  );
  const chartReadme = fs.readFileSync(path.join(chartDir, 'README.md'), 'utf8');
  assert(
    apiDeploymentTemplate.includes('name: SETUP_BOOTSTRAP_TOKEN') &&
      apiDeploymentTemplate.includes('cvg-his-v2.api.setupSecretName'),
    'API deployment must load SETUP_BOOTSTRAP_TOKEN from the configured setup Secret'
  );
  assert(
    apiSecretsTemplate.includes('.Values.api.setup.value') &&
      apiSecretsTemplate.includes('.Values.api.setup.secretKey'),
    'Helm must support an operator-provided setup token without hardcoding it'
  );
  assert(
    dockerCompose.includes('SETUP_BOOTSTRAP_TOKEN: ${SETUP_BOOTSTRAP_TOKEN:-}'),
    'docker-compose.v2.yml must forward the operator-provided setup bootstrap token'
  );
  assert(
    databaseMaintenanceJobs.includes('packages/db/dist/migrate.js') &&
      databaseMaintenanceJobs.includes('packages/db/dist/reconcile-runtime-roles.js') &&
      databaseMaintenanceJobs.includes('"helm.sh/hook-weight": "-10"'),
    'Helm must run canonical database migrations before runtime-role reconciliation'
  );
  assert(
    chartReadme.includes('API_IMAGE_SHA=') &&
      chartReadme.includes('WORKER_IMAGE_SHA=') &&
      chartReadme.includes('SPA_IMAGE_SHA=') &&
      chartReadme.includes('--set-string api.image.sha="$API_IMAGE_SHA"') &&
      chartReadme.includes('--set-string worker.image.sha="$WORKER_IMAGE_SHA"') &&
      chartReadme.includes('--set-string spa.image.sha="$SPA_IMAGE_SHA"') &&
      !chartReadme.includes('RELEASE_IMAGE_SHA'),
    'Production runbook must bind API, worker, and SPA to their component-specific release digests'
  );
  assert(
    helmHelpers.includes('cvg-his-v2.databaseMaintenance.initContainers') &&
      helmHelpers.includes('packages/db/dist/migrate.js') &&
      helmHelpers.includes('packages/db/dist/reconcile-runtime-roles.js'),
    'Embedded PostgreSQL must migrate and reconcile roles before application containers start'
  );
  assert(
    workerDeploymentTemplate.includes('name: WORKER_ACCOUNT_IDS') &&
      workerDeploymentTemplate.includes('worker.accountIds.secretKey') &&
      workerDeploymentTemplate.includes('optional: false'),
    'Production-like worker must load WORKER_ACCOUNT_IDS from a required Secret key'
  );
  assert(
    workerDeploymentTemplate.includes('name: WORKER_REPORTS_USER_ID') &&
      workerDeploymentTemplate.includes('worker.reportsUser.secretKey') &&
      workerDeploymentTemplate.includes('worker.reportsUser.existingSecret') &&
      workerDeploymentTemplate.includes('optional: false'),
    'Production-like worker must load WORKER_REPORTS_USER_ID from a required Secret key'
  );
  assert(
    spaDeploymentTemplate.includes('mountPath: /tmp') &&
      spaDeploymentTemplate.includes('mountPath: /var/cache/nginx') &&
      spaDeploymentTemplate.includes('mountPath: /etc/nginx/conf.d/default.conf') &&
      spaDeploymentTemplate.includes('subPath: default.conf') &&
      spaDeploymentTemplate.includes('name: nginx-config') &&
      spaDeploymentTemplate.includes('name: nginx-runtime') &&
      spaDeploymentTemplate.includes('name: nginx-cache'),
    'SPA deployment must mount writable nginx runtime paths for a read-only root filesystem'
  );
  assert(
    spaNginxTemplate.includes('server __API_UPSTREAM__;') &&
      spaNginxTemplate.includes('__API_RESOLVER__') &&
      configMapTemplate.includes('.Files.Get "files/spa-nginx.conf"') &&
      configMapTemplate.includes('include "cvg-his-v2.api.fullname"') &&
      configMapTemplate.includes('replace "__API_UPSTREAM__"'),
    'SPA nginx template must render the release-scoped Helm API Service'
  );
  assert(
    apiDeploymentTemplate.includes('persistence.accessMode=ReadWriteMany') &&
      apiDeploymentTemplate.includes('persistence.enabled=true') &&
      apiDeploymentTemplate.includes('per-replica emptyDir storage is not safe for HA') &&
      apiDeploymentTemplate.includes('operator-provided RWX storageClass') &&
      apiDeploymentTemplate.includes('(empty .Values.persistence.storageClass)'),
    'Multi-replica local attachment storage must fail closed unless persistence and RWX are explicit'
  );
  assert(
    !workerDeploymentTemplate.includes('mountPath: /srv/cvg-his-v2/storage') &&
      !workerDeploymentTemplate.includes('claimName:') &&
      !workerDeploymentTemplate.includes('name: storage'),
    'Worker must not mount the API attachment filesystem'
  );
  const composeConfig = YAML.parse(dockerCompose);
  const composeWorkerVolumes = composeConfig?.services?.['cvg-his-v2-worker']?.volumes ?? [];
  assert(
    !composeWorkerVolumes.some((volume) => String(volume).includes('/srv/cvg-his-v2/storage')),
    'Compose worker must not mount the API attachment filesystem'
  );
  assert(
    spaDeploymentTemplate.includes('checksum/nginx-config:') &&
      spaDeploymentTemplate.includes('sha256sum'),
    'SPA pod template must checksum nginx configuration to trigger rollouts'
  );

  for (const environment of environments) {
    const values = readYamlFile(environment.values);
    if (environment.expectManagedSecrets) {
      assert(
        values.api?.auth?.value,
        `${environment.name}: expected managed API auth secret value`
      );
    } else {
      assert(values.api?.auth?.existingSecret, `${environment.name}: expected API existingSecret`);
      assert(
        values.api?.setup?.existingSecret,
        `${environment.name}: expected setup bootstrap existingSecret`
      );
    }

    if (environment.expectEmbeddedDatastores) {
      assert(
        values.postgresql?.enabled === true,
        `${environment.name}: expected embedded PostgreSQL`
      );
      assert(values.redis?.enabled === true, `${environment.name}: expected embedded Redis`);
    } else {
      assert(
        values.postgresql?.enabled === false,
        `${environment.name}: expected external PostgreSQL`
      );
      assert(values.redis?.enabled === false, `${environment.name}: expected external Redis`);
      assert(
        values.postgresql?.existingSecret,
        `${environment.name}: expected PostgreSQL existingSecret`
      );
      assert(values.redis?.existingSecret, `${environment.name}: expected Redis existingSecret`);
    }

    if (environment.name !== 'dev') {
      assert(
        values.worker?.accountIds?.existingSecret,
        `${environment.name}: worker.accountIds.existingSecret is required for production-like startup`
      );
      assert(
        values.worker?.accountIds?.secretKey,
        `${environment.name}: worker.accountIds.secretKey is required for production-like startup`
      );
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

const helmVersion = getHelmVersion();
const requireExecutableHelm = process.env.REQUIRE_HELM === '1';

validateStaticChart();

if (!helmVersion) {
  if (requireExecutableHelm) {
    throw new Error(
      'Helm executable is required for this validation (expected ' + REQUIRED_HELM_VERSION + ')'
    );
  }

  console.log(
    'Helm binary not found; static Helm chart validation passed for dev, staging, and prod.'
  );
  process.exit(0);
}

if (requireExecutableHelm && !isRequiredHelmVersion(helmVersion)) {
  throw new Error(
    'Helm ' + REQUIRED_HELM_VERSION + ' is required for this validation; found ' + helmVersion
  );
}

assertHelmFailure(
  [
    'template',
    'cvg-his-v2-local-ha-invalid',
    chartDir,
    '-f',
    baseValues,
    '-f',
    path.join(chartDir, 'values.dev.yaml'),
    '--set',
    'api.replicaCount=2'
  ],
  'api.replicaCount > 1 with local attachment storage requires persistence.accessMode=ReadWriteMany'
);

assertHelmFailure(
  [
    'template',
    'cvg-his-v2-local-ha-ephemeral-invalid',
    chartDir,
    '-f',
    baseValues,
    '-f',
    path.join(chartDir, 'values.dev.yaml'),
    '--set',
    'api.replicaCount=2',
    '--set',
    'persistence.enabled=false'
  ],
  'per-replica emptyDir storage is not safe for HA'
);

assertHelmFailure(
  [
    'template',
    'cvg-his-v2-local-ha-missing-class',
    chartDir,
    '-f',
    baseValues,
    '-f',
    path.join(chartDir, 'values.dev.yaml'),
    '--set',
    'api.replicaCount=2',
    '--set-string',
    'persistence.accessMode=ReadWriteMany'
  ],
  'operator-provided RWX storageClass'
);

runHelm([
  'template',
  'cvg-his-v2-local-ha-rwx',
  chartDir,
  '-f',
  baseValues,
  '-f',
  path.join(chartDir, 'values.dev.yaml'),
  '--set',
  'api.replicaCount=2',
  '--set-string',
  'persistence.accessMode=ReadWriteMany',
  '--set-string',
  'persistence.storageClass=operator-rwx-class'
]);

for (const environment of environments) {
  const values = readYamlFile(environment.values);
  const imageOverrideArgs =
    environment.name === 'prod'
      ? [
          '--set-string',
          `api.image.sha=${validationImageDigests.api}`,
          '--set-string',
          `worker.image.sha=${validationImageDigests.worker}`,
          '--set-string',
          `spa.image.sha=${validationImageDigests.spa}`
        ]
      : [];
  const lintArgs = [
    'lint',
    chartDir,
    '-f',
    baseValues,
    '-f',
    environment.values,
    ...imageOverrideArgs
  ];
  const templateArgs = [
    'template',
    environment.release,
    chartDir,
    '-f',
    baseValues,
    '-f',
    environment.values,
    ...imageOverrideArgs
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
  const spaNginxConfig = findDoc(docs, 'ConfigMap', `${prefix}-spa-config-nginx`);
  const attachmentStoragePvc = findDoc(docs, 'PersistentVolumeClaim', `${prefix}-storage`);

  assert(apiDeployment, `${environment.name}: API deployment not rendered`);
  assert(workerDeployment, `${environment.name}: worker deployment not rendered`);
  assert(spaDeployment, `${environment.name}: SPA deployment not rendered`);
  assert(apiService, `${environment.name}: API service not rendered`);
  assert(workerService, `${environment.name}: worker service not rendered`);
  assert(spaService, `${environment.name}: SPA service not rendered`);
  assert(apiPdb, `${environment.name}: API PodDisruptionBudget not rendered`);
  assert(workerPdb, `${environment.name}: worker PodDisruptionBudget not rendered`);
  assert(spaPdb, `${environment.name}: SPA PodDisruptionBudget not rendered`);
  assert(spaNginxConfig, `${environment.name}: SPA nginx ConfigMap not rendered`);

  const apiContainer = apiDeployment.spec.template.spec.containers[0];
  const workerContainer = workerDeployment.spec.template.spec.containers[0];
  const spaContainer = spaDeployment.spec.template.spec.containers[0];
  const setupTokenEnv = apiContainer.env?.find((entry) => entry.name === 'SETUP_BOOTSTRAP_TOKEN');
  const renderedSpaNginx = spaNginxConfig.data?.['default.conf'] ?? '';

  for (const [label, deployment] of [
    ['API', apiDeployment],
    ['worker', workerDeployment],
    ['SPA', spaDeployment]
  ]) {
    assert(
      deployment.spec.template.spec.securityContext?.seccompProfile?.type === 'RuntimeDefault',
      `${environment.name}: ${label} pod must use the RuntimeDefault seccomp profile`
    );
  }

  assert(
    renderedSpaNginx.includes(`server ${prefix}-api:3001;`) &&
      !renderedSpaNginx.includes('__API_UPSTREAM__') &&
      !renderedSpaNginx.includes('__API_RESOLVER__') &&
      !renderedSpaNginx.includes('127.0.0.11'),
    `${environment.name}: SPA nginx must proxy to the release-scoped API Service without Docker DNS`
  );
  assert(
    /^[a-f0-9]{64}$/.test(
      spaDeployment.spec.template.metadata?.annotations?.['checksum/nginx-config'] ?? ''
    ),
    `${environment.name}: SPA pod template must contain a rendered nginx ConfigMap checksum`
  );

  const apiStorageMount = apiContainer.volumeMounts?.find(
    (mount) => mount.name === 'storage' && mount.mountPath === '/srv/cvg-his-v2/storage'
  );
  const apiStorageVolume = apiDeployment.spec.template.spec.volumes?.find(
    (volume) => volume.name === 'storage'
  );
  const workerStorageMount = workerContainer.volumeMounts?.find(
    (mount) => mount.name === 'storage' || mount.mountPath === '/srv/cvg-his-v2/storage'
  );
  assert(!workerStorageMount, `${environment.name}: worker must not mount attachment storage`);
  if (environment.expectLocalAttachmentStorage) {
    assert(attachmentStoragePvc, `${environment.name}: local attachment PVC must be rendered`);
    assert(apiStorageMount, `${environment.name}: API must mount local attachment storage`);
    assert(
      apiStorageVolume?.persistentVolumeClaim?.claimName === `${prefix}-storage`,
      `${environment.name}: API must reference its release-scoped attachment PVC`
    );
    assert(
      attachmentStoragePvc.spec.accessModes?.[0] ===
        (values.persistence?.accessMode ?? readYamlFile(baseValues).persistence.accessMode),
      `${environment.name}: attachment PVC must render the configured access mode`
    );
  } else {
    assert(!attachmentStoragePvc, `${environment.name}: S3 attachment mode must not render a PVC`);
    assert(
      !apiStorageMount,
      `${environment.name}: S3 attachment mode must not mount local storage`
    );
    assert(
      !apiStorageVolume,
      `${environment.name}: S3 attachment mode must not define local storage`
    );
  }

  if (environment.name === 'prod') {
    assert(
      apiContainer.image.endsWith(`@${validationImageDigests.api}`),
      'prod: API image must use the API digest override'
    );
    assert(
      workerContainer.image.endsWith(`@${validationImageDigests.worker}`),
      'prod: worker image must use the worker digest override'
    );
    assert(
      spaContainer.image.endsWith(`@${validationImageDigests.spa}`),
      'prod: SPA image must use the SPA digest override'
    );
  }

  if (environment.name === 'dev') {
    assert(
      !setupTokenEnv,
      'dev: setup must remain fail-closed until the operator provides a generated token'
    );
  } else {
    assert(
      setupTokenEnv?.valueFrom?.secretKeyRef?.name,
      `${environment.name}: API must load SETUP_BOOTSTRAP_TOKEN from a Secret`
    );
    assert(
      setupTokenEnv.valueFrom.secretKeyRef.key === 'SETUP_BOOTSTRAP_TOKEN',
      `${environment.name}: setup bootstrap token must use the canonical Secret key`
    );
  }

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
  for (const [volumeName, mountPath] of [
    ['nginx-runtime', '/tmp'],
    ['nginx-cache', '/var/cache/nginx']
  ]) {
    assert(
      spaContainer.volumeMounts?.some(
        (mount) => mount.name === volumeName && mount.mountPath === mountPath
      ),
      `${environment.name}: SPA must mount ${mountPath} from ${volumeName}`
    );
    assert(
      spaDeployment.spec.template.spec.volumes?.some(
        (volume) => volume.name === volumeName && volume.emptyDir
      ),
      `${environment.name}: SPA ${volumeName} must be an emptyDir volume`
    );
  }
  assert(
    spaContainer.volumeMounts?.some(
      (mount) =>
        mount.name === 'nginx-config' &&
        mount.mountPath === '/etc/nginx/conf.d/default.conf' &&
        mount.subPath === 'default.conf' &&
        mount.readOnly === true
    ),
    `${environment.name}: SPA must mount the rendered nginx configuration read-only`
  );
  assert(
    spaDeployment.spec.template.spec.volumes?.some(
      (volume) =>
        volume.name === 'nginx-config' && volume.configMap?.name === `${prefix}-spa-config-nginx`
    ),
    `${environment.name}: SPA nginx volume must reference its release-scoped ConfigMap`
  );
  assert(
    workerContainer.envFrom?.some(
      (entry) => entry.configMapRef?.name === `${prefix}-worker-config`
    ),
    `${environment.name}: worker must consume its ConfigMap`
  );
  const workerAccountIdsEnv = workerContainer.env?.find(
    (entry) => entry.name === 'WORKER_ACCOUNT_IDS'
  );
  const workerReportsUserEnv = workerContainer.env?.find(
    (entry) => entry.name === 'WORKER_REPORTS_USER_ID'
  );
  if (environment.name === 'dev') {
    assert(
      !workerAccountIdsEnv,
      'dev: worker account scope should remain unset so local discovery can be used'
    );
  } else {
    assert(
      workerAccountIdsEnv?.valueFrom?.secretKeyRef?.name,
      `${environment.name}: worker must load WORKER_ACCOUNT_IDS from a Secret`
    );
    assert(
      workerAccountIdsEnv.valueFrom.secretKeyRef.name === values.worker.accountIds.existingSecret,
      `${environment.name}: worker account Secret must match values.worker.accountIds.existingSecret`
    );
    assert(
      workerAccountIdsEnv.valueFrom.secretKeyRef.key === values.worker.accountIds.secretKey,
      `${environment.name}: worker account Secret key must match values.worker.accountIds.secretKey`
    );
    assert(
      workerAccountIdsEnv.valueFrom.secretKeyRef.optional === false,
      `${environment.name}: worker account Secret reference must be required`
    );
    assert(
      workerReportsUserEnv?.valueFrom?.secretKeyRef?.name,
      `${environment.name}: worker must load WORKER_REPORTS_USER_ID from a Secret`
    );
    assert(
      workerReportsUserEnv.valueFrom.secretKeyRef.name === values.worker.reportsUser.existingSecret,
      `${environment.name}: worker report actor Secret must match values.worker.reportsUser.existingSecret`
    );
    assert(
      workerReportsUserEnv.valueFrom.secretKeyRef.key === values.worker.reportsUser.secretKey,
      `${environment.name}: worker report actor Secret key must match values.worker.reportsUser.secretKey`
    );
    assert(
      workerReportsUserEnv.valueFrom.secretKeyRef.optional === false,
      `${environment.name}: worker report actor Secret reference must be required`
    );
  }

  const secretDocs = docs.filter((doc) => doc.kind === 'Secret');
  if (environment.expectManagedSecrets) {
    assert(
      secretDocs.length >= 3,
      `${environment.name}: expected chart-managed secrets for local bootstrap`
    );
  } else {
    assert(
      secretDocs.length === 0,
      `${environment.name}: existingSecret mode must not render managed Secret resources`
    );
  }

  const postgresStatefulSet = findDoc(docs, 'StatefulSet', `${prefix}-postgres`);
  const redisStatefulSet = findDoc(docs, 'StatefulSet', `${prefix}-redis`);
  if (environment.expectEmbeddedDatastores) {
    assert(postgresStatefulSet, `${environment.name}: expected embedded PostgreSQL statefulset`);
    assert(redisStatefulSet, `${environment.name}: expected embedded Redis statefulset`);
    assert(
      /^.+@sha256:[a-f0-9]{64}$/.test(postgresStatefulSet.spec.template.spec.containers[0].image),
      `${environment.name}: PostgreSQL image must be pinned by digest`
    );
    assert(
      /^.+@sha256:[a-f0-9]{64}$/.test(redisStatefulSet.spec.template.spec.containers[0].image),
      `${environment.name}: Redis image must be pinned by digest`
    );
  } else {
    assert(
      !postgresStatefulSet,
      `${environment.name}: external PostgreSQL environment must not render statefulset`
    );
    assert(
      !redisStatefulSet,
      `${environment.name}: external Redis environment must not render statefulset`
    );
  }
}

console.log('Helm validation passed for dev, staging, and prod.');

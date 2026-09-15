#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import YAML from 'yaml';

export const MATRIX_PATH = 'docs/engineering/environment-runtime-matrix.json';

const EXPECTED_ENVIRONMENTS = {
  'local-development': {
    primaryRuntime: 'COMPOSE',
    composeFile: 'docker-compose.dev.yml',
    helmValues: 'infra/helm/cvg-his-v2/values.dev.yaml',
    authority: 'LOCAL_ONLY'
  },
  'ci-e2e': {
    primaryRuntime: 'COMPOSE',
    composeFile: 'docker-compose.e2e.yml',
    helmValues: null,
    authority: 'LOCAL_ONLY'
  },
  staging: {
    primaryRuntime: 'HELM',
    composeFile: 'docker-compose.v2.yml',
    helmValues: 'infra/helm/cvg-his-v2/values.staging.yaml',
    authority: 'PENDING_AUTHORITY'
  },
  production: {
    primaryRuntime: 'HELM',
    composeFile: 'docker-compose.v2.yml',
    helmValues: 'infra/helm/cvg-his-v2/values.prod.yaml',
    authority: 'PENDING_AUTHORITY'
  },
  'production-single-host': {
    primaryRuntime: 'COMPOSE',
    composeFile: 'docker-compose.v2.yml',
    helmValues: null,
    authority: 'PENDING_AUTHORITY'
  }
};

const REQUIRED_SOURCE_REFS = [
  'docs/132-superficie-canonica-deploy-e-migracao.md',
  'docs/adr/ADR-011-CONTAINER-RUNTIME.md',
  'docs/engineering/RELEASE_IDENTITY.md',
  'docs/130-instalacao-publicacao-cvg-his-v2-real.md',
  'docs/131-checklist-cutover-servidor.md',
  'docs/049-matriz-ambiente-runtime.md'
];

const REQUIRED_OPEN_DECISIONS = [
  'ORIGIN_AUTHORITY_RECONCILIATION',
  'STAGING_PROCESS_ENVIRONMENT',
  'IMAGE_DIGEST_BINDING',
  'TARGET_NAMESPACE_AND_OWNER',
  'SECRETS_PROVIDER_EFFECTIVE',
  'MIGRATION_FLOW_UNIFICATION',
  'WORKER_HEALTH_CONTRACT',
  'SYSTEMD_SURFACE_STATUS'
];

const MUTATING_SMOKE_MARKERS = [
  ' compose up',
  ' compose down',
  ' compose build',
  'helm install',
  'helm upgrade',
  'kubectl apply',
  'deploy:cutover'
];

const readText = (rootDir, relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const pathOnly = (reference) => reference.split('#', 1)[0].split('?', 1)[0];

function addReferenceError(rootDir, reference, label, errors) {
  if (typeof reference !== 'string' || reference.length === 0) {
    errors.push(label + ' must be a non-empty repository reference');
    return null;
  }
  const relativePath = pathOnly(reference);
  const absolutePath = path.resolve(rootDir, relativePath);
  const relativeToRoot = path.relative(rootDir, absolutePath);
  if (relativeToRoot.startsWith('..' + path.sep) || path.isAbsolute(relativeToRoot)) {
    errors.push(label + ' escapes repository root: ' + reference);
    return null;
  }
  if (!fs.existsSync(absolutePath)) {
    errors.push(label + ' does not exist: ' + reference);
    return null;
  }
  return absolutePath;
}

function parseYaml(rootDir, relativePath, label, errors) {
  const absolutePath = addReferenceError(rootDir, relativePath, label, errors);
  if (!absolutePath) return null;
  try {
    return YAML.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    errors.push(label + ' is invalid YAML: ' + error.message);
    return null;
  }
}

function validateCompose(rootDir, environment, errors) {
  const compose = environment.compose;
  if (!compose || typeof compose !== 'object') {
    errors.push(environment.id + '.compose must be an object');
    return;
  }
  const composePath = addReferenceError(rootDir, compose.file, environment.id + '.compose.file', errors);
  if (!composePath) return;
  const content = fs.readFileSync(composePath, 'utf8');
  for (const service of compose.requiredServices ?? []) {
    if (typeof service !== 'string' || !content.includes('\n  ' + service + ':')) {
      errors.push(environment.id + ' compose is missing required service: ' + service);
    }
  }
  for (const marker of ['apps/web', 'cvg-his-v2-web', '3004', 'charts' + '/helm']) {
    if (content.includes(marker)) {
      errors.push(environment.id + ' compose contains forbidden legacy marker: ' + marker);
    }
  }
}

function validateHelm(rootDir, environment, expected, errors) {
  const helm = environment.helm;
  if (expected.helmValues === null) {
    if (helm !== null) errors.push(environment.id + '.helm must be null for this environment');
    return;
  }
  if (!helm || typeof helm !== 'object') {
    errors.push(environment.id + '.helm must be an object');
    return;
  }
  if (helm.values !== expected.helmValues) {
    errors.push(environment.id + '.helm.values does not match the canonical environment values file');
  }
  const chart = parseYaml(rootDir, path.join(helm.chart, 'Chart.yaml'), environment.id + '.helm.chart', errors);
  const values = parseYaml(rootDir, helm.values, environment.id + '.helm.values', errors);
  if (chart && chart.name !== 'cvg-his-v2') {
    errors.push(environment.id + ' Helm chart must be named cvg-his-v2');
  }
  const expectedEnvironment = environment.id === 'local-development' ? 'development' : environment.id;
  if (values && values.global && values.global.environment !== expectedEnvironment) {
    errors.push(
      environment.id + ' Helm values global.environment must be ' + expectedEnvironment
    );
  }
}

export function validateEnvironmentRuntimeMatrix(
  rootDir = process.cwd(),
  matrixOverride = null
) {
  const errors = [];
  let matrix = matrixOverride;
  if (!matrix) {
    try {
      matrix = JSON.parse(readText(rootDir, MATRIX_PATH));
    } catch (error) {
      return ['matrix is not valid JSON: ' + error.message];
    }
  }
  if (!matrix || typeof matrix !== 'object') return ['matrix must be an object'];
  if (matrix.schemaVersion !== 1) errors.push('matrix.schemaVersion must be 1');
  if (matrix.status !== 'PROPOSED_PENDING_AUTHORITY') {
    errors.push('matrix.status must remain PROPOSED_PENDING_AUTHORITY until external acceptance');
  }
  if (matrix.product !== 'CVG-HIS-V4') errors.push('matrix.product must be CVG-HIS-V4');

  const identityPath = addReferenceError(rootDir, matrix.identityRef, 'matrix.identityRef', errors);
  if (identityPath) {
    const identity = fs.readFileSync(identityPath, 'utf8');
    for (const marker of [
      'PROJECT_ID=CVG-HIS-V4',
      'CANONICAL_COMPOSE=docker-compose.v2.yml',
      'CANONICAL_HELM_SURFACE=infra/helm/cvg-his-v2',
      'CANONICAL_HEALTH_PATHS=/health,/ready,/live,/health/ready,/health/live'
    ]) {
      if (!identity.includes(marker)) errors.push('release identity missing marker: ' + marker);
    }
  }

  const sourceRefs = Array.isArray(matrix.sourceRefs) ? matrix.sourceRefs : [];
  if (new Set(sourceRefs).size !== sourceRefs.length) errors.push('matrix.sourceRefs must be unique');
  for (const requiredRef of REQUIRED_SOURCE_REFS) {
    if (!sourceRefs.includes(requiredRef)) errors.push('matrix.sourceRefs missing: ' + requiredRef);
  }
  for (const reference of sourceRefs) addReferenceError(rootDir, reference, 'matrix.sourceRefs', errors);

  const openDecisions = Array.isArray(matrix.openDecisions) ? matrix.openDecisions : [];
  const openDecisionIds = openDecisions.map((decision) => decision && decision.id);
  if (new Set(openDecisionIds).size !== openDecisionIds.length) {
    errors.push('matrix.openDecisions ids must be unique');
  }
  for (const requiredDecision of REQUIRED_OPEN_DECISIONS) {
    const decision = openDecisions.find((entry) => entry && entry.id === requiredDecision);
    if (!decision) {
      errors.push('matrix.openDecisions missing: ' + requiredDecision);
      continue;
    }
    if (decision.status !== 'PENDING_AUTHORITY') {
      errors.push(requiredDecision + ' must remain PENDING_AUTHORITY');
    }
    if (typeof decision.owner !== 'string' || decision.owner.trim().length === 0) {
      errors.push(requiredDecision + '.owner must be non-empty');
    }
    if (!Array.isArray(decision.sourceRefs) || decision.sourceRefs.length === 0) {
      errors.push(requiredDecision + '.sourceRefs must be non-empty');
    } else {
      for (const reference of decision.sourceRefs) {
        addReferenceError(rootDir, reference, requiredDecision + '.sourceRefs', errors);
      }
    }
  }

  const environments = Array.isArray(matrix.environments) ? matrix.environments : [];
  const ids = environments.map((environment) => environment && environment.id);
  if (new Set(ids).size !== ids.length) errors.push('matrix environment ids must be unique');
  if (environments.length !== Object.keys(EXPECTED_ENVIRONMENTS).length) {
    errors.push('matrix must contain exactly ' + Object.keys(EXPECTED_ENVIRONMENTS).length + ' environments');
  }

  for (const environment of environments) {
    if (!environment || typeof environment !== 'object') {
      errors.push('each environment must be an object');
      continue;
    }
    const expected = EXPECTED_ENVIRONMENTS[environment.id];
    if (!expected) {
      errors.push('unknown environment: ' + environment.id);
      continue;
    }
    if (environment.primaryRuntime !== expected.primaryRuntime) {
      errors.push(environment.id + '.primaryRuntime must be ' + expected.primaryRuntime);
    }
    if (!environment.compose || environment.compose.file !== expected.composeFile) {
      errors.push(environment.id + '.compose.file must be ' + expected.composeFile);
    }
    if (environment.target?.authority !== expected.authority) {
      errors.push(environment.id + '.target.authority must be ' + expected.authority);
    }
    if (
      typeof environment.target?.owner !== 'string' ||
      environment.target.owner.trim().length === 0
    ) {
      errors.push(environment.id + '.target.owner must be non-empty');
    }
    if (environment.runbook) addReferenceError(rootDir, environment.runbook, environment.id + '.runbook', errors);
    else errors.push(environment.id + '.runbook is required');
    if (environment.primaryRuntime === 'COMPOSE' && environment.compose?.role === 'PRIMARY_TARGET') {
      errors.push(environment.id + ' Compose role cannot be PRIMARY_TARGET');
    }
    if (expected.primaryRuntime === 'HELM' && environment.helm?.role !== 'PRIMARY_TARGET') {
      errors.push(environment.id + ' Helm role must be PRIMARY_TARGET');
    }
    if (
      expected.primaryRuntime === 'HELM' &&
      environment.compose?.role !== 'PRODUCTION_LIKE_REHEARSAL_ONLY'
    ) {
      errors.push(environment.id + ' Compose role must be PRODUCTION_LIKE_REHEARSAL_ONLY');
    }
    if (
      environment.id === 'production-single-host' &&
      environment.compose?.role !== 'CANDIDATE_TARGET_PENDING_AUTHORITY'
    ) {
      errors.push(
        environment.id + ' Compose role must be CANDIDATE_TARGET_PENDING_AUTHORITY'
      );
    }
    if (expected.authority === 'PENDING_AUTHORITY') {
      if (!String(environment.target?.name ?? '').startsWith('UNASSIGNED_')) {
        errors.push(environment.id + ' target.name must remain UNASSIGNED_* while authority is pending');
      }
      if (!String(environment.target?.owner ?? '').includes('unassigned')) {
        errors.push(environment.id + ' target.owner must identify an unassigned owner');
      }
    }
    if (environment.smoke?.targetRequired !== (expected.authority === 'PENDING_AUTHORITY')) {
      errors.push(environment.id + '.smoke.targetRequired is inconsistent with authority');
    }
    if (!environment.originPolicy || typeof environment.originPolicy !== 'object') {
      errors.push(environment.id + '.originPolicy is required');
    } else {
      const originStatus = environment.originPolicy.status;
      if (originStatus !== 'LOCAL_ONLY' && originStatus !== 'PENDING_AUTHORITY') {
        errors.push(environment.id + '.originPolicy.status is invalid');
      }
      if (expected.authority === 'PENDING_AUTHORITY' && originStatus !== 'PENDING_AUTHORITY') {
        errors.push(environment.id + '.originPolicy must remain PENDING_AUTHORITY');
      }
      for (const field of ['spa', 'api']) {
        if (
          typeof environment.originPolicy[field] !== 'string' ||
          environment.originPolicy[field].trim().length === 0
        ) {
          errors.push(environment.id + '.originPolicy.' + field + ' must be non-empty');
        }
      }
      const originRefs = environment.originPolicy.sourceRefs;
      if (!Array.isArray(originRefs) || originRefs.length === 0) {
        errors.push(environment.id + '.originPolicy.sourceRefs must be non-empty');
      } else {
        for (const reference of originRefs) {
          addReferenceError(rootDir, reference, environment.id + '.originPolicy.sourceRefs', errors);
        }
      }
    }
    for (const field of [
      'runtimeEnvironment',
      'imageIdentity',
      'persistence',
      'migration',
      'secretProvider'
    ]) {
      const value = environment[field];
      if (!value || typeof value !== 'object') {
        errors.push(environment.id + '.' + field + ' is required');
      } else if (typeof value.status !== 'string' || typeof value.mode !== 'string') {
        errors.push(environment.id + '.' + field + ' requires status and mode');
      }
    }
    if (
      expected.authority === 'PENDING_AUTHORITY' &&
      environment.imageIdentity?.status !== 'PENDING_AUTHORITY'
    ) {
      errors.push(environment.id + '.imageIdentity must remain PENDING_AUTHORITY');
    }
    if (
      expected.authority === 'PENDING_AUTHORITY' &&
      environment.persistence?.status !== 'PENDING_AUTHORITY'
    ) {
      errors.push(environment.id + '.persistence must remain PENDING_AUTHORITY');
    }
    if (
      expected.authority === 'PENDING_AUTHORITY' &&
      environment.secretProvider?.status !== 'PENDING_AUTHORITY'
    ) {
      errors.push(environment.id + '.secretProvider must remain PENDING_AUTHORITY');
    }
    if (
      environment.id === 'staging' &&
      environment.runtimeEnvironment?.status !== 'PENDING_AUTHORITY'
    ) {
      errors.push('staging.runtimeEnvironment must remain PENDING_AUTHORITY');
    }
    const migrationStatus = environment.migration?.status;
    const expectedMigrationStatus =
      expected.authority === 'PENDING_AUTHORITY' ? 'PENDING_AUTHORITY' : 'NOT_APPLICABLE';
    if (migrationStatus !== expectedMigrationStatus) {
      errors.push(environment.id + '.migration.status must be ' + expectedMigrationStatus);
    }
    const commands = environment.smoke?.localCommands;
    if (!Array.isArray(commands) || commands.length === 0) {
      errors.push(environment.id + '.smoke.localCommands must be non-empty');
    } else {
      for (const command of commands) {
        if (typeof command !== 'string' || !command.trim()) {
          errors.push(environment.id + '.smoke.localCommands contains an empty command');
          continue;
        }
        for (const marker of MUTATING_SMOKE_MARKERS) {
          if (command.includes(marker)) {
            errors.push(environment.id + ' smoke command is mutating: ' + command);
          }
        }
      }
    }
    validateCompose(rootDir, environment, errors);
    validateHelm(rootDir, environment, expected, errors);
    if (environment.helm?.values) {
      const values = parseYaml(
        rootDir,
        environment.helm.values,
        environment.id + '.helm.values',
        errors
      );
      if (values && environment.runtimeEnvironment) {
        const actualApi = values.api?.env?.NODE_ENV;
        const actualWorker = values.worker?.env?.NODE_ENV;
        if (
          typeof environment.runtimeEnvironment.apiNodeEnv === 'string' &&
          actualApi !== environment.runtimeEnvironment.apiNodeEnv
        ) {
          errors.push(environment.id + ' runtimeEnvironment.apiNodeEnv does not match values');
        }
        if (
          typeof environment.runtimeEnvironment.workerNodeEnv === 'string' &&
          environment.runtimeEnvironment.workerNodeEnv !== 'not-applicable' &&
          actualWorker !== environment.runtimeEnvironment.workerNodeEnv
        ) {
          errors.push(
            environment.id + ' runtimeEnvironment.workerNodeEnv does not match values'
          );
        }
        const imageDigests = ['api', 'worker', 'spa'].map(
          (service) => values[service]?.image?.sha
        );
        if (
          imageDigests.some(
            (digest) =>
              digest !== undefined &&
              digest !== null &&
              digest !== '' &&
              !/^sha256:[a-f0-9]{64}$/.test(digest)
          )
        ) {
          errors.push(environment.id + ' contains a malformed image digest');
        }
        if (
          expected.authority === 'PENDING_AUTHORITY' &&
          imageDigests.some((digest) => !digest) &&
          environment.imageIdentity?.status !== 'PENDING_AUTHORITY'
        ) {
          errors.push(environment.id + ' missing image digests require pending authority');
        }
      }
    }
  }

  return [...new Set(errors)].sort();
}

const invokedAsScript = process.argv[1]
  ? import.meta.url ===
    pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  const errors = validateEnvironmentRuntimeMatrix();
  if (errors.length > 0) {
    console.error('[environment-runtime] FAIL');
    for (const error of errors) console.error('- ' + error);
    process.exitCode = 1;
  } else {
    console.log(
      '[environment-runtime] PASS matrix=' +
        MATRIX_PATH +
        ' environments=' +
        Object.keys(EXPECTED_ENVIRONMENTS).length
    );
  }
}

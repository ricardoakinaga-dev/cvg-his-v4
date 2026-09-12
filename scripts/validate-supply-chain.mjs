#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const shaRef = /^[0-9a-f]{40}$/;
const digestRef = /^sha256:[0-9a-f]{64}$/;
const localComposeImage = /^cvg-his-v[24]-/;

function filesUnder(directory, predicate) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'tmp', 'dist'].includes(entry.name)) return [];
        return filesUnder(path, predicate);
      }
      return predicate(entry.name) ? [path] : [];
    })
    .sort();
}

function workflowFiles(directory) {
  return filesUnder(directory, (name) => /\.ya?ml$/.test(name));
}

function dockerfiles(directory) {
  return filesUnder(directory, (name) => name === 'Dockerfile' || name.startsWith('Dockerfile.'));
}

function runtimeScriptFiles(directory) {
  return filesUnder(directory, (name) => /\.(?:mjs|sh)$/.test(name));
}

function composeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^docker-compose(?:\.[^.]+)?\.ya?ml$/.test(entry.name))
    .map((entry) => join(directory, entry.name))
    .sort();
}

function relativePath(path, rootDirectory = root) {
  return relative(rootDirectory, path).split('\\').join('/');
}

function isImmutableImage(image) {
  const at = image.lastIndexOf('@');
  return at > 0 && digestRef.test(image.slice(at + 1));
}

function scanImageReference(
  findings,
  image,
  path,
  scope,
  rootDirectory,
  { allowLocal = false } = {}
) {
  if (allowLocal && localComposeImage.test(image)) return false;
  if (!isImmutableImage(image)) {
    findings.push(
      `${relativePath(path, rootDirectory)}: ${scope} image ${image} is not pinned to a sha256 image digest`
    );
    return false;
  }
  return true;
}

const releaseImageArchives = ['/tmp/api-image.tar', '/tmp/worker-image.tar', '/tmp/spa-image.tar'];

function workflowSteps(content) {
  return content.split(/(?=^\s{6}- name:)/m).filter((section) => /^\s{6}- name:/.test(section));
}

export function inspectReleaseWorkflowPolicy(
  content,
  path = '.github/workflows/release-artifacts.yml'
) {
  const findings = [];
  const steps = workflowSteps(content);
  const prepublicationGateIndex = content.indexOf('name: Run pre-publication candidate assurance');
  const blockingGateIndex = content.indexOf('name: Run blocking Triple-A release gate');
  const scannerSteps = steps.filter((step) =>
    /uses:\s*aquasecurity\/trivy-action@[0-9a-f]{40}\b/.test(step)
  );
  const publicationMatches = [
    ...content.matchAll(/^\s*push:\s*true\s*$/gm),
    ...content.matchAll(
      /^\s*(?:docker\s+(?:image\s+)?push|docker\s+buildx\s+build\b.*--push|oras\s+(?:cp|copy)\b).*$/gm
    )
  ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
  const firstPublicationIndex = publicationMatches[0]?.index ?? -1;

  if (prepublicationGateIndex < 0) {
    findings.push(`${path}: release workflow has no blocking pre-publication assurance gate`);
  }
  if (blockingGateIndex < 0) {
    findings.push(`${path}: release workflow has no blocking final Triple-A gate`);
  }

  const quarantineReferences =
    content.match(
      /^\s*(?:API|WORKER|SPA)_CANDIDATE_IMAGE:\s*ghcr\.io\/.*:quarantine-\$\{\{ github\.run_id \}\}-\$\{\{ github\.event\.workflow_run\.head_sha \}\}\s*$/gm
    ) ?? [];
  if (quarantineReferences.length !== releaseImageArchives.length) {
    findings.push(`${path}: all image candidates must use run-scoped quarantine tags`);
  }

  const digestOnlyRepositories =
    content.match(
      /^\s*(?:API|WORKER|SPA)_IMAGE:\s*ghcr\.io\/\$\{\{ github\.repository_owner \}\}\/cvg-his-v4-(?:api|worker|spa)\s*$/gm
    ) ?? [];
  if (digestOnlyRepositories.length !== releaseImageArchives.length) {
    findings.push(`${path}: release image references must be repository names without tags`);
  }

  if (scannerSteps.length !== releaseImageArchives.length) {
    findings.push(
      `${path}: release workflow must scan exactly ${releaseImageArchives.length} image candidates with a SHA-pinned Trivy action`
    );
  }

  for (const archive of releaseImageArchives) {
    if (!content.includes(`outputs: type=oci,dest=${archive}`)) {
      findings.push(
        `${path}: release image candidate ${archive} is not built as a local OCI archive`
      );
    }
    const scannerStep = scannerSteps.find((step) => step.includes(`input: ${archive}`));
    if (!scannerStep) {
      findings.push(
        `${path}: release image candidate ${archive} is not scanned before publication`
      );
      continue;
    }
    if (!/^\s*scanners:\s*vuln\s*$/m.test(scannerStep)) {
      findings.push(
        `${path}: vulnerability scanner for ${archive} does not explicitly enable vuln scanning`
      );
    }
    if (!/^\s*severity:\s*(?:HIGH,CRITICAL|CRITICAL,HIGH)\s*$/m.test(scannerStep)) {
      findings.push(
        `${path}: vulnerability scanner for ${archive} does not block HIGH and CRITICAL findings`
      );
    }
    if (!/^\s*exit-code:\s*['"]?1['"]?\s*$/m.test(scannerStep)) {
      findings.push(`${path}: vulnerability scanner for ${archive} is not fail-closed`);
    }
    if (!/^\s*ignore-unfixed:\s*['"]?false['"]?\s*$/m.test(scannerStep)) {
      findings.push(
        `${path}: vulnerability scanner for ${archive} ignores an unspecified vulnerability set`
      );
    }
  }

  if (/^\s*push:\s*true\s*$/m.test(content)) {
    findings.push(`${path}: release images must not be rebuilt and pushed after local scanning`);
  }

  if (firstPublicationIndex < 0) {
    findings.push(`${path}: release workflow has no explicit image publication step`);
  } else {
    const lastScannerIndex = Math.max(
      ...scannerSteps.map((step) => content.indexOf(step) + step.length),
      -1
    );
    if (prepublicationGateIndex < 0 || firstPublicationIndex < prepublicationGateIndex) {
      findings.push(`${path}: image publication occurs before the pre-publication assurance gate`);
    }
    if (lastScannerIndex < 0 || firstPublicationIndex < lastScannerIndex) {
      findings.push(`${path}: image publication occurs before all vulnerability scans complete`);
    }
  }

  if (
    /^\s*(?:run:\s*)?(?:oras\s+(?:cp|copy)\b.*"\$\{(?:API|WORKER|SPA)_IMAGE\}"|(?:oras|docker)\s+tag\b).*$/m.test(
      content
    )
  ) {
    findings.push(`${path}: release repository references must never be published as mutable tags`);
  }

  for (const artifactStepName of [
    'name: Generate complete Triple-A evidence package',
    'name: Publish certified release manifest and evidence'
  ]) {
    const artifactStep = steps.find((step) => step.includes(artifactStepName));
    if (!artifactStep || content.indexOf(artifactStep) < blockingGateIndex) {
      findings.push(
        `${path}: ${artifactStepName.slice(6)} occurs before the blocking Triple-A gate`
      );
    } else if (/^\s*if:\s*always\(\)\s*$/m.test(artifactStep)) {
      findings.push(
        `${path}: ${artifactStepName.slice(6)} may expose a release manifest after a failed gate`
      );
    }
  }

  if (!/oras\s+(?:cp|copy)\s+--recursive\s+--from-oci-layout/.test(content)) {
    findings.push(
      `${path}: vetted OCI candidates are not published recursively from their scanned layouts`
    );
  }

  return findings;
}

export function inspectSupplyChain({ rootDirectory = root } = {}) {
  const findings = [];
  const workflowRoot = resolve(rootDirectory, '.github/workflows');
  const workflowPaths = workflowFiles(workflowRoot);
  let actionCount = 0;
  let workflowImageCount = 0;
  let composeImageCount = 0;
  let helmImageCount = 0;
  let dockerBaseCount = 0;
  let runtimeImageCount = 0;

  for (const path of workflowPaths) {
    const content = readFileSync(path, 'utf8');
    const relativeWorkflow = relative(rootDirectory, path).split('\\').join('/');
    const actions = content.match(/^\s*(?:-\s*)?uses:\s*[^\s#]+/gm) ?? [];
    actionCount += actions.length;
    for (const match of content.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
      const reference = match[1];
      const at = reference.lastIndexOf('@');
      const ref = at >= 0 ? reference.slice(at + 1) : '';
      if (!reference.startsWith('./') && !shaRef.test(ref)) {
        findings.push(`${relativeWorkflow}: ${reference} is not pinned to a full commit SHA`);
      }
    }
    for (const match of content.matchAll(/^\s*image:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
      workflowImageCount += 1;
      scanImageReference(findings, match[1], path, 'workflow', rootDirectory);
    }
    if (relativeWorkflow === '.github/workflows/release-artifacts.yml') {
      findings.push(...inspectReleaseWorkflowPolicy(content, relativeWorkflow));
    }
  }

  for (const path of composeFiles(rootDirectory)) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(/^\s*image:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
      composeImageCount += 1;
      scanImageReference(findings, match[1], path, 'Compose', rootDirectory, { allowLocal: true });
    }
  }

  const helmRoot = resolve(rootDirectory, 'infra/helm');
  for (const path of filesUnder(helmRoot, (name) => /\.ya?ml$/.test(name))) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(/^\s*image:\s*([^\s#{}]+)(?:\s+#.*)?$/gm)) {
      helmImageCount += 1;
      scanImageReference(findings, match[1], path, 'Helm', rootDirectory);
    }
  }

  for (const path of dockerfiles(rootDirectory)) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(
      /^\s*FROM\s+(?:--platform=[^\s]+\s+)?([^\s]+)(?:\s+AS\s+[^\s]+)?\s*$/gim
    )) {
      dockerBaseCount += 1;
      scanImageReference(findings, match[1], path, 'Docker base', rootDirectory);
    }
  }

  const runtimeScriptsRoot = resolve(rootDirectory, 'infra/scripts');
  for (const path of runtimeScriptFiles(runtimeScriptsRoot)) {
    const content = readFileSync(path, 'utf8');
    for (const match of content.matchAll(
      /(?<![/:])\b(?:postgres|redis)(?::[0-9][^\s'"`\\)]*|@sha256:[0-9a-f]{64})/g
    )) {
      runtimeImageCount += 1;
      scanImageReference(findings, match[0], path, 'runtime script', rootDirectory);
    }
  }

  return {
    findings,
    counts: {
      actionCount,
      workflowImageCount,
      composeImageCount,
      helmImageCount,
      dockerBaseCount,
      runtimeImageCount
    }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = inspectSupplyChain();
  console.log(`Supply-chain action references scanned: ${result.counts.actionCount}`);
  console.log(`Supply-chain workflow images scanned: ${result.counts.workflowImageCount}`);
  console.log(`Supply-chain Compose images scanned: ${result.counts.composeImageCount}`);
  console.log(`Supply-chain Helm static images scanned: ${result.counts.helmImageCount}`);
  console.log(`Supply-chain Docker base images scanned: ${result.counts.dockerBaseCount}`);
  console.log(`Supply-chain runtime script images scanned: ${result.counts.runtimeImageCount}`);
  if (result.findings.length === 0) {
    console.log('PASS: all external actions and container images are immutable.');
  } else {
    console.error(`FAIL: ${result.findings.length} mutable supply-chain reference(s) found.`);
    for (const finding of result.findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  }
}

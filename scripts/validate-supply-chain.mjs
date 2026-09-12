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

export function inspectSupplyChain({ rootDirectory = root } = {}) {
  const findings = [];
  const workflowRoot = resolve(rootDirectory, '.github/workflows');
  const workflowPaths = workflowFiles(workflowRoot);
  let actionCount = 0;
  let workflowImageCount = 0;
  let composeImageCount = 0;
  let helmImageCount = 0;
  let dockerBaseCount = 0;

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

  return {
    findings,
    counts: { actionCount, workflowImageCount, composeImageCount, helmImageCount, dockerBaseCount }
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = inspectSupplyChain();
  console.log(`Supply-chain action references scanned: ${result.counts.actionCount}`);
  console.log(`Supply-chain workflow images scanned: ${result.counts.workflowImageCount}`);
  console.log(`Supply-chain Compose images scanned: ${result.counts.composeImageCount}`);
  console.log(`Supply-chain Helm static images scanned: ${result.counts.helmImageCount}`);
  console.log(`Supply-chain Docker base images scanned: ${result.counts.dockerBaseCount}`);
  if (result.findings.length === 0) {
    console.log(
      'PASS: all external actions, workflow/Compose/Helm images and Docker bases are immutable.'
    );
  } else {
    console.error(`FAIL: ${result.findings.length} mutable supply-chain reference(s) found.`);
    for (const finding of result.findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  }
}

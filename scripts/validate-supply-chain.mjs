import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const workflowsDir = resolve(root, '.github/workflows');
const shaRef = /^[0-9a-f]{40}$/;
const digestRef = /^sha256:[0-9a-f]{64}$/;

function workflowFiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return workflowFiles(path);
      return /\.ya?ml$/.test(entry.name) ? [path] : [];
    })
    .sort();
}

function dockerfiles(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'tmp') return [];
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return dockerfiles(path);
      return entry.name === 'Dockerfile' || entry.name.startsWith('Dockerfile.') ? [path] : [];
    })
    .sort();
}

const findings = [];
for (const path of workflowFiles(workflowsDir)) {
  const relativePath = path.slice(root.length + 1);
  const content = readFileSync(path, 'utf8');
  const matches = [...content.matchAll(/^\s*(?:-\s*)?uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)];
  for (const match of matches) {
    const reference = match[1];
    const at = reference.lastIndexOf('@');
    const ref = at >= 0 ? reference.slice(at + 1) : '';
    const local = reference.startsWith('./');
    if (!local && !shaRef.test(ref)) {
      findings.push(`${relativePath}: ${reference} is not pinned to a full commit SHA`);
    }
  }

  for (const match of content.matchAll(/^\s*container:\s*\n\s+image:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
    const image = match[1];
    if (!image.includes('@') || !digestRef.test(image.slice(image.lastIndexOf('@') + 1))) {
      findings.push(`${relativePath}: workflow container ${image} is not pinned to a sha256 image digest`);
    }
  }
}

const count = workflowFiles(workflowsDir)
  .map((path) => readFileSync(path, 'utf8').match(/^\s*(?:-\s*)?uses:\s*[^\s#]+/gm) ?? [])
  .reduce((sum, entries) => sum + entries.length, 0);

let dockerBaseCount = 0;
for (const path of dockerfiles(root)) {
  const relativePath = path.slice(root.length + 1);
  const content = readFileSync(path, 'utf8');
  for (const match of content.matchAll(/^\s*FROM\s+(?:--platform=[^\s]+\s+)?([^\s]+)(?:\s+AS\s+[^\s]+)?\s*$/gim)) {
    dockerBaseCount += 1;
    const image = match[1];
    if (!image.includes('@') || !digestRef.test(image.slice(image.lastIndexOf('@') + 1))) {
      findings.push(`${relativePath}: ${image} is not pinned to a sha256 image digest`);
    }
  }
}

console.log(`Supply-chain action references scanned: ${count}`);
console.log(`Supply-chain Docker base images scanned: ${dockerBaseCount}`);
if (findings.length === 0) {
  console.log('PASS: all external actions and Docker base images are immutable.');
} else {
  console.error(`FAIL: ${findings.length} mutable supply-chain reference(s) found.`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
}

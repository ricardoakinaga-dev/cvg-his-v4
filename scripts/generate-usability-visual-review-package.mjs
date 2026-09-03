#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { REQUIRED_VISUAL_SNAPSHOTS } from './usability-certification-contract.mjs';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const snapshotRoot = 'e2e/spa/snapshots/visual/visual-regression.spec.ts';
const [candidateInput, outputInput, baseInput] = process.argv.slice(2);

if (!candidateInput || !SHA_PATTERN.test(candidateInput)) {
  console.error(
    'Usage: node scripts/generate-usability-visual-review-package.mjs <40-char-candidate-sha> [output-dir] [base-sha]'
  );
  process.exit(2);
}

function gitText(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  }).trim();
}

function resolveCommit(revision) {
  return gitText(['rev-parse', '--verify', `${revision}^{commit}`]);
}

function gitBlob(revision, path) {
  return execFileSync('git', ['show', `${revision}:${path}`], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024
  });
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function pngDimensions(buffer, label) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(`${label} is not a valid PNG`);
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function compareExactInventory(actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((item) => !actualSet.has(item));
  const unexpected = actual.filter((item) => !expectedSet.has(item));
  if (missing.length || unexpected.length || actualSet.size !== actual.length) {
    throw new Error(
      `Visual inventory mismatch. Missing: ${missing.join(', ') || 'none'}. ` +
        `Unexpected/duplicate: ${unexpected.join(', ') || 'none'}.`
    );
  }
}

const candidateSha = resolveCommit(candidateInput);
if (candidateSha !== candidateInput) {
  throw new Error(`Candidate did not resolve exactly to ${candidateInput}`);
}
const baseSha = resolveCommit(baseInput || `${candidateSha}^`);
const outputDirectory = resolve(
  outputInput || join('artifacts', 'playwright', candidateSha, 'visual-review')
);

const changedPaths = gitText([
  'diff',
  '--name-only',
  '--diff-filter=AM',
  baseSha,
  candidateSha,
  '--',
  `${snapshotRoot}/*.png`
])
  .split('\n')
  .filter(Boolean);
const changedSnapshots = changedPaths.map((path) => basename(path));
compareExactInventory(changedSnapshots, REQUIRED_VISUAL_SNAPSHOTS);

await Promise.all([
  mkdir(join(outputDirectory, 'before'), { recursive: true }),
  mkdir(join(outputDirectory, 'after'), { recursive: true })
]);

const items = [];
for (const snapshot of REQUIRED_VISUAL_SNAPSHOTS) {
  const path = `${snapshotRoot}/${snapshot}`;
  const before = gitBlob(baseSha, path);
  const after = gitBlob(candidateSha, path);
  const beforeDimensions = pngDimensions(before, `${baseSha}:${path}`);
  const afterDimensions = pngDimensions(after, `${candidateSha}:${path}`);
  await Promise.all([
    writeFile(join(outputDirectory, 'before', snapshot), before),
    writeFile(join(outputDirectory, 'after', snapshot), after)
  ]);
  items.push({
    snapshot,
    path,
    classification: 'pending-product-ux',
    decision: 'pending',
    before: { sha256: sha256(before), ...beforeDimensions },
    after: { sha256: sha256(after), ...afterDimensions }
  });
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  candidateSha,
  baseSha,
  status: 'pending-product-ux',
  snapshotCount: items.length,
  items
};

const cards = items
  .map(
    (item, index) => `<article class="review-card" id="snapshot-${index + 1}">
  <h2>${index + 1}. ${escapeHtml(item.snapshot)}</h2>
  <p><code>${escapeHtml(item.path)}</code></p>
  <div class="comparison">
    <figure><figcaption>Antes — ${escapeHtml(baseSha.slice(0, 12))}</figcaption><img src="before/${encodeURIComponent(item.snapshot)}" alt="Baseline anterior de ${escapeHtml(item.snapshot)}"></figure>
    <figure><figcaption>Depois — ${escapeHtml(candidateSha.slice(0, 12))}</figcaption><img src="after/${encodeURIComponent(item.snapshot)}" alt="Baseline candidata de ${escapeHtml(item.snapshot)}"></figure>
  </div>
  <dl>
    <dt>Hash anterior</dt><dd><code>${item.before.sha256}</code></dd>
    <dt>Hash candidato</dt><dd><code>${item.after.sha256}</code></dd>
    <dt>Dimensões</dt><dd>${item.before.width}×${item.before.height} → ${item.after.width}×${item.after.height}</dd>
  </dl>
  <p class="pending">Classificação e decisão formal: pendentes de Produto/UX.</p>
</article>`
  )
  .join('\n');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Revisão visual hospitalar — ${escapeHtml(candidateSha.slice(0, 12))}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0 auto; max-width: 1800px; padding: 24px; line-height: 1.45; }
    header { border-bottom: 2px solid #777; margin-bottom: 24px; }
    .review-card { border: 1px solid #8888; border-radius: 8px; margin: 24px 0; padding: 16px; }
    .comparison { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    figure { margin: 0; min-width: 0; }
    figcaption { font-weight: 700; margin-bottom: 8px; }
    img { background: white; border: 1px solid #777; height: auto; max-width: 100%; }
    dl { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 12px; }
    dd { margin: 0; overflow-wrap: anywhere; }
    .pending { background: #fff3cd; color: #422c00; padding: 12px; }
    @media (max-width: 900px) { .comparison { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>Pacote de revisão visual hospitalar</h1>
    <p>Candidato: <code>${escapeHtml(candidateSha)}</code></p>
    <p>Base: <code>${escapeHtml(baseSha)}</code></p>
    <p>Este pacote é somente evidência técnica. Produto e UX devem registrar classificação, decisão, identidade e referência no JSON de certificação manual.</p>
  </header>
  <main>${cards}</main>
</body>
</html>
`;

await Promise.all([
  writeFile(
    join(outputDirectory, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  ),
  writeFile(join(outputDirectory, 'index.html'), html, 'utf8')
]);

console.log(
  `Visual review package generated at ${outputDirectory}: ${items.length} snapshots, ${baseSha}..${candidateSha}.`
);

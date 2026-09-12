import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

function toPosix(path) {
  return path.split(sep).join('/');
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function immutableImageReference(reference, digest) {
  const lastColon = reference.lastIndexOf(':');
  const lastSlash = reference.lastIndexOf('/');
  if (lastColon <= lastSlash) return `${reference}@${digest}`;
  return `${reference.slice(0, lastColon)}@${digest}`;
}

function migrationState(rootDir) {
  const migrationDirectory = resolve(rootDir, 'packages/db/migrations');
  if (!existsSync(migrationDirectory)) {
    return {
      runner: 'packages/db/src/migrate.ts',
      source_directory: 'packages/db/migrations',
      count: 0,
      latest: null,
      source_sha256: null,
      files: [],
    };
  }
  const files = readdirSync(migrationDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => ({
      name: entry.name,
      sha256: sha256(resolve(migrationDirectory, entry.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const sourceSha = createHash('sha256')
    .update(files.map((file) => `${file.name}:${file.sha256}`).join('\n'))
    .digest('hex');
  return {
    runner: 'packages/db/src/migrate.ts',
    source_directory: 'packages/db/migrations',
    count: files.length,
    latest: files.at(-1)?.name ?? null,
    source_sha256: sourceSha,
    files,
  };
}

function git(rootDir, args) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} falhou`);
  return result.stdout.trim();
}

export function generateReleaseManifest({
  rootDir = resolve(fileURLToPath(new URL('..', import.meta.url))),
  outputDir = process.env.RELEASE_OUTPUT_DIR ?? 'artifacts/release',
  commitSha = process.env.RELEASE_SHA,
  version = process.env.RELEASE_VERSION,
  pipelineUrl = process.env.RELEASE_PIPELINE_URL ?? null,
  requireImageDigests = process.env.RELEASE_REQUIRE_IMAGE_DIGESTS === '1',
  images,
} = {}) {
  const resolvedSha = (commitSha || git(rootDir, ['rev-parse', 'HEAD'])).toLowerCase();
  if (!SHA_PATTERN.test(resolvedSha)) {
    throw new Error('RELEASE_SHA deve ser um SHA Git completo com 40 caracteres hexadecimais');
  }

  const releaseVersion = version || `sha-${resolvedSha.slice(0, 12)}`;
  const resolvedOutputDir = isAbsolute(outputDir) ? outputDir : resolve(rootDir, outputDir);
  mkdirSync(resolvedOutputDir, { recursive: true });

  const imageInputs = images ?? [
    { component: 'api', reference: process.env.API_IMAGE, digest: process.env.API_DIGEST },
    { component: 'worker', reference: process.env.WORKER_IMAGE, digest: process.env.WORKER_DIGEST },
    { component: 'spa', reference: process.env.SPA_IMAGE, digest: process.env.SPA_DIGEST },
  ];
  const normalizedImages = imageInputs
    .filter((image) => image.reference || image.digest)
    .map((image) => {
      if (!image.reference) throw new Error(`${image.component}: referência de imagem ausente`);
      if (!DIGEST_PATTERN.test(image.digest ?? '')) {
        throw new Error(`${image.component}: digest deve usar sha256 com 64 caracteres hexadecimais`);
      }
      return {
        component: image.component,
        reference: image.reference,
        digest: image.digest,
        immutable_reference: immutableImageReference(image.reference, image.digest),
      };
    });
  if (requireImageDigests && normalizedImages.length !== 3) {
    throw new Error('release estrito exige digests de API, worker e SPA');
  }

  const canonicalSbomPath = resolve(resolvedOutputDir, 'sbom.cyclonedx.json');
  const requiredSbomPath = resolve(resolvedOutputDir, 'sbom.cdx.json');
  if (existsSync(canonicalSbomPath)) {
    writeFileSync(requiredSbomPath, readFileSync(canonicalSbomPath));
  }

  const excluded = new Set([
    'release-manifest.json',
    'enterprise-release-manifest.json',
    'CHECKSUMS.sha256'
  ]);
  const files = readdirSync(resolvedOutputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !excluded.has(entry.name))
    .map((entry) => {
      const path = resolve(resolvedOutputDir, entry.name);
      return {
        path: toPosix(relative(rootDir, path)),
        sha256: sha256(path),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const sbom = files.find((file) => basename(file.path) === 'sbom.cyclonedx.json');
  const sbomAlias = files.find((file) => basename(file.path) === 'sbom.cdx.json');
  if (requireImageDigests && !sbom) throw new Error('release estrito exige sbom.cyclonedx.json');
  const sourceBundle = files.find((file) => /^source-[0-9a-f]{40}\.tar\.gz$/.test(basename(file.path)));
  const migrations = migrationState(rootDir);
  const attestationReferences = files
    .filter((file) => basename(file.path).endsWith('-attestation-verification.json'))
    .map((file) => ({ path: file.path, sha256: file.sha256 }));
  const evidenceReferences = files
    .filter((file) => /(?:security-evidence|ci-evidence|TRIPLE_A_RELEASE_EVIDENCE)\.json$/.test(basename(file.path)))
    .map((file) => ({ path: file.path, sha256: file.sha256 }));

  let committedAt = null;
  try {
    committedAt = git(rootDir, ['show', '-s', '--format=%cI', resolvedSha]);
  } catch {
    // Fixture/unit-test SHAs need not exist in a temporary Git repository.
  }

  const manifest = {
    schema_version: 1,
    product: 'CVG-HIS V4',
    repository: 'cvg-his-v4',
    version: releaseVersion,
    commit_sha: resolvedSha,
    committed_at: committedAt,
    pipeline_url: pipelineUrl,
    source: sourceBundle
      ? { path: sourceBundle.path, sha256: sourceBundle.sha256 }
      : null,
    source_hash: sourceBundle?.sha256 ?? null,
    migration_state: migrations,
    images: normalizedImages,
    files,
    sbom: sbom?.path ?? null,
    sbom_alias: sbomAlias?.path ?? null,
    attestation_references: attestationReferences,
    evidence_references: evidenceReferences,
  };

  const manifestPath = resolve(resolvedOutputDir, 'release-manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const manifestAliasPath = resolve(resolvedOutputDir, 'enterprise-release-manifest.json');
  writeFileSync(manifestAliasPath, readFileSync(manifestPath));

  const checksumEntries = [
    ...files,
    { path: toPosix(relative(rootDir, manifestPath)), sha256: sha256(manifestPath) },
    { path: toPosix(relative(rootDir, manifestAliasPath)), sha256: sha256(manifestAliasPath) },
  ].sort((a, b) => a.path.localeCompare(b.path));
  const checksumsPath = resolve(resolvedOutputDir, 'CHECKSUMS.sha256');
  writeFileSync(
    checksumsPath,
    `${checksumEntries.map((file) => `${file.sha256}  ${basename(file.path)}`).join('\n')}\n`
  );

  return { manifest, manifestPath, manifestAliasPath, checksumsPath };
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(isAbsolute(process.argv[1]) ? process.argv[1] : resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  try {
    const { manifest, manifestPath } = generateReleaseManifest();
    console.log(`Manifesto de release gerado em ${toPosix(relative(process.cwd(), manifestPath))}.`);
    console.log(`SHA: ${manifest.commit_sha}; imagens: ${manifest.images.length}; arquivos: ${manifest.files.length}.`);
  } catch (error) {
    console.error(`Falha ao gerar manifesto de release: ${error.message}`);
    process.exitCode = 1;
  }
}

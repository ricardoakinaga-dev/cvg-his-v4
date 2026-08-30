import fs from 'node:fs';
import path from 'node:path';

export const CANONICAL_HELM_SURFACE = 'infra/helm/cvg-his-v2';
export const LEGACY_HELM_SURFACE = 'charts/helm';
export const RELEASE_IDENTITY_PATH = 'docs/engineering/RELEASE_IDENTITY.md';
export const REQUIRED_HELM_VERSION = 'v3.15.4';
export const REQUIRED_HELM_SHA256 =
  '11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9';

const REQUIRED_HELM_CI_MARKERS = [
  `CVG_HELM_VERSION: ${REQUIRED_HELM_VERSION}`,
  `CVG_HELM_SHA256: ${REQUIRED_HELM_SHA256}`,
  'sha256sum --check',
  'test "$(command -v helm)" = "/usr/local/bin/helm"',
  'HELM_BIN=/usr/local/bin/helm REQUIRE_HELM=1 pnpm validate:helm'
];

const ACTIVE_DIRECTORY_PATHS = ['.github/workflows', 'infra/scripts', 'scripts'];
const ACTIVE_ROOT_FILES = ['README.md', 'package.json', 'pnpm-workspace.yaml'];

const isTextFile = (filePath) => /\.(cjs|js|mjs|ts|tsx|vue|yml|yaml|json|md|sh)$/.test(filePath);

const walkFiles = (root, relativeDirectory) => {
  const directory = path.join(root, relativeDirectory);
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) return walkFiles(root, relativePath);
    return isTextFile(entry.name) ? [relativePath] : [];
  });
};

const activeDeployFiles = (root) => {
  const rootFiles = ACTIVE_ROOT_FILES.filter((relativePath) =>
    fs.existsSync(path.join(root, relativePath))
  );
  const composeFiles = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^docker-compose(?:\..+)?\.ya?ml$/.test(entry.name))
    .map((entry) => entry.name);

  return [
    ...new Set([
      ...rootFiles,
      ...composeFiles,
      ...ACTIVE_DIRECTORY_PATHS.flatMap((directory) => walkFiles(root, directory))
    ])
  ].filter((relativePath) => relativePath !== 'scripts/check-deploy-surface-of-truth.mjs');
};

export const findForbiddenDeploySurfaceReferences = (files) =>
  files
    .filter(({ content }) => content.includes(LEGACY_HELM_SURFACE))
    .map(({ path: filePath }) => ({
      path: filePath,
      reason: 'active configuration references the legacy charts/helm track'
    }));

export const findMissingHelmCiMarkers = (workflow) =>
  REQUIRED_HELM_CI_MARKERS.filter((marker) => !workflow.includes(marker));

const read = (root, relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

export const validateDeploySurface = (root) => {
  const errors = [];
  const requireFile = (relativePath) => {
    if (!fs.existsSync(path.join(root, relativePath))) {
      errors.push(`required deploy identity file is missing: ${relativePath}`);
      return false;
    }
    return true;
  };

  const identityExists = requireFile(RELEASE_IDENTITY_PATH);
  const chartExists = requireFile(`${CANONICAL_HELM_SURFACE}/Chart.yaml`);
  const validatorExists = requireFile('infra/scripts/validate-helm.mjs');
  const workflowExists = requireFile('.github/workflows/ci.yml');

  if (identityExists) {
    const identity = read(root, RELEASE_IDENTITY_PATH);
    for (const marker of [
      `CANONICAL_HELM_SURFACE=${CANONICAL_HELM_SURFACE}`,
      `LEGACY_HELM_SURFACE=${LEGACY_HELM_SURFACE}`,
      'LEGACY_HELM_STATUS=NON_CANONICAL',
      'CANONICAL_HEALTH_PATHS=/health,/ready,/live,/health/ready,/health/live'
    ]) {
      if (!identity.includes(marker)) errors.push(`release identity is missing marker: ${marker}`);
    }
  }

  if (
    chartExists &&
    !read(root, `${CANONICAL_HELM_SURFACE}/Chart.yaml`).includes('name: cvg-his-v2')
  ) {
    errors.push(
      `canonical Helm chart is not named cvg-his-v2: ${CANONICAL_HELM_SURFACE}/Chart.yaml`
    );
  }

  if (
    validatorExists &&
    !read(root, 'infra/scripts/validate-helm.mjs').includes(CANONICAL_HELM_SURFACE) &&
    !read(root, 'infra/scripts/validate-helm.mjs').includes("'infra', 'helm', 'cvg-his-v2'")
  ) {
    errors.push('validate:helm does not point at the canonical Helm surface');
  }

  if (fs.existsSync(path.join(root, 'package.json'))) {
    const packageJson = JSON.parse(read(root, 'package.json'));
    if (
      packageJson.repository?.url !== 'git+https://github.com/ricardoakinaga-dev/cvg-his-v4.git'
    ) {
      errors.push(
        'package.json repository metadata does not identify the canonical cvg-his-v4 repository'
      );
    }
    if (packageJson.scripts?.['validate:helm'] !== 'node infra/scripts/validate-helm.mjs') {
      errors.push('package.json validate:helm is not the canonical validator command');
    }
    if (
      packageJson.scripts?.['validate:deploy-surface'] !==
      'node scripts/check-deploy-surface-of-truth.mjs'
    ) {
      errors.push('package.json validate:deploy-surface is not wired to the canonical guard');
    }
  } else {
    errors.push('package.json is missing');
  }

  if (workflowExists) {
    const workflow = read(root, '.github/workflows/ci.yml');
    if (!workflow.includes('pnpm validate:deploy-surface')) {
      errors.push('CI repository-guards job does not execute validate:deploy-surface');
    }
    for (const marker of findMissingHelmCiMarkers(workflow)) {
      errors.push(`CI Helm contract is missing: ${marker}`);
    }
  }

  const legacyReadmePath = path.join(root, LEGACY_HELM_SURFACE, 'README.md');
  if (!fs.existsSync(legacyReadmePath)) {
    errors.push('legacy Helm track must retain a deprecation README');
  } else {
    const legacyReadme = fs.readFileSync(legacyReadmePath, 'utf8');
    if (!legacyReadme.includes('LEGACY') || !legacyReadme.includes(CANONICAL_HELM_SURFACE)) {
      errors.push('legacy Helm README does not identify the canonical replacement');
    }
    if (
      legacyReadme.includes('/health/startup') ||
      /\bhelm\s+(install|upgrade)\b/.test(legacyReadme)
    ) {
      errors.push('legacy Helm README still contains executable or stale deployment instructions');
    }
  }

  const files = activeDeployFiles(root).map((relativePath) => ({
    path: relativePath,
    content: read(root, relativePath)
  }));
  errors.push(
    ...findForbiddenDeploySurfaceReferences(files).map(
      ({ path: filePath, reason }) => `${filePath}: ${reason}`
    )
  );

  return {
    errors,
    canonicalHelmSurface: CANONICAL_HELM_SURFACE,
    legacyHelmSurface: LEGACY_HELM_SURFACE,
    scannedFiles: files.map(({ path: filePath }) => filePath)
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = validateDeploySurface(process.cwd());
  if (result.errors.length > 0) {
    console.error('[deploy-surface] FAIL');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `[deploy-surface] PASS canonical=${result.canonicalHelmSurface} scanned=${result.scannedFiles.length}`
    );
  }
}

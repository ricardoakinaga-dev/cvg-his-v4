#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
run_id="${GITHUB_RUN_ID:-local}-$$"
api_image="cvg-his-v2-api:release-validation-${run_id}"
worker_image="cvg-his-v2-worker:release-validation-${run_id}"
spa_image="cvg-his-v2-spa:release-validation-${run_id}"
release_image_mode="${RELEASE_IMAGE_MODE:-build}"
release_source_sha=''
release_image_evidence_output=''
api_oci_digest=''
api_runtime_manifest_digest=''
api_config_digest=''
api_archive_sha256=''
api_observed_image_id=''
worker_oci_digest=''
worker_runtime_manifest_digest=''
worker_config_digest=''
worker_archive_sha256=''
worker_observed_image_id=''
spa_oci_digest=''
spa_runtime_manifest_digest=''
spa_config_digest=''
spa_archive_sha256=''
spa_observed_image_id=''
redis_image='redis@sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf'
api_container="cvg-release-api-${run_id}"
worker_container="cvg-release-worker-${run_id}"
spa_container="cvg-release-spa-${run_id}"
redis_container="cvg-release-redis-${run_id}"
attachment_fixture_container="cvg-release-attachment-fixture-${run_id}"
validation_network="cvg-release-${run_id}"
postgres_container=''
postgres_health=''
postgres_network_connected=0
release_database='cvg_his_v2_release_image_test'
expected_release_database_url="postgres://postgres:postgres@127.0.0.1:5433/${release_database}"
helm_bin="${HELM_BIN:-helm}"
spa_proxy_config_dir=''
attachment_fixture_tls_dir=''

cleanup() {
  local status=$?
  if [[ ${status} -ne 0 ]]; then
    for container in "${api_container}" "${worker_container}" "${spa_container}" "${redis_container}" "${attachment_fixture_container}"; do
      docker logs "${container}" 2>/dev/null || true
    done
  fi
  docker rm --force \
    "${api_container}" "${worker_container}" "${spa_container}" "${redis_container}" \
    "${attachment_fixture_container}" \
    >/dev/null 2>&1 || true
  if [[ ${postgres_network_connected} -eq 1 && -n "${postgres_container}" ]]; then
    docker network disconnect --force "${validation_network}" "${postgres_container}" \
      >/dev/null 2>&1 || true
  fi
  docker network rm "${validation_network}" >/dev/null 2>&1 || true
  if [[ -n "${spa_proxy_config_dir}" ]]; then
    unlink "${spa_proxy_config_dir}/default.conf" >/dev/null 2>&1 || true
    rmdir "${spa_proxy_config_dir}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${attachment_fixture_tls_dir}" ]]; then
    unlink "${attachment_fixture_tls_dir}/ca.crt" >/dev/null 2>&1 || true
    unlink "${attachment_fixture_tls_dir}/server.crt" >/dev/null 2>&1 || true
    unlink "${attachment_fixture_tls_dir}/server.key" >/dev/null 2>&1 || true
    unlink "${attachment_fixture_tls_dir}/openssl.cnf" >/dev/null 2>&1 || true
    rmdir "${attachment_fixture_tls_dir}" >/dev/null 2>&1 || true
  fi
  exit "${status}"
}
trap cleanup EXIT

wait_for_http() {
  local url=$1
  local attempts=${2:-60}
  local container=${3:-}
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl --fail --silent --show-error "${url}" >/dev/null 2>&1; then
      return 0
    fi
    if [[ -n "${container}" && "$(docker inspect --format '{{.State.Running}}' "${container}" 2>/dev/null || true)" != 'true' ]]; then
      echo "Container ${container} exited while waiting for ${url}" >&2
      docker logs "${container}" >&2 || true
      return 1
    fi
    sleep 1
  done
  echo "Timed out waiting for ${url}" >&2
  return 1
}

wait_for_http_status() {
  local url=$1
  local expected_status=$2
  local attempts=${3:-30}
  local container=${4:-}
  local status=''
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    status="$(curl --silent --output /dev/null --write-out '%{http_code}' "${url}" || true)"
    if [[ "${status}" == "${expected_status}" ]]; then
      return 0
    fi
    if [[ -n "${container}" && "$(docker inspect --format '{{.State.Running}}' "${container}" 2>/dev/null || true)" != 'true' ]]; then
      echo "Container ${container} exited while waiting for HTTP ${expected_status} from ${url}" >&2
      docker logs "${container}" >&2 || true
      return 1
    fi
    sleep 1
  done
  echo "Timed out waiting for HTTP ${expected_status} from ${url} (last status: ${status})" >&2
  return 1
}

wait_for_container_healthy() {
  local container=$1
  local attempts=${2:-60}
  local health=''
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${container}")"
    if [[ "${health}" == 'healthy' ]]; then
      return 0
    fi
    if [[ "${health}" == 'unhealthy' ]]; then
      docker inspect --format '{{range .State.Health.Log}}{{println .Output}}{{end}}' "${container}" >&2
      return 1
    fi
    sleep 1
  done
  echo "Timed out waiting for ${container} health (last state: ${health})" >&2
  return 1
}

wait_for_redis() {
  local container=$1
  local attempts=${2:-30}
  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if [[ "$(docker exec "${container}" redis-cli ping 2>/dev/null || true)" == 'PONG' ]]; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for Redis container ${container}" >&2
  return 1
}

published_port() {
  local container=$1
  local port=$2
  docker port "${container}" "${port}/tcp" | awk -F: 'END { print $NF }'
}

assert_node_image() {
  local image=$1
  local required_path=$2
  test "$(docker image inspect --format '{{.Config.User}}' "${image}")" = 'node'
  docker run --rm --cap-drop ALL --security-opt no-new-privileges --entrypoint sh "${image}" -ec '
    test "$(id -u)" -ne 0
    test "$(stat -c %u /app/dist/index.js)" -eq 0
    test ! -w /app/dist/index.js
    writable_payload=''
    writable_payload="$(find /app -type f -perm /222 -print -quit)"
    test -z "${writable_payload}"
    test -w /srv/cvg-his-v2/storage
    for path in \
      /usr/local/lib/node_modules/npm \
      /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm \
      /usr/local/bin/npx \
      /usr/local/bin/corepack \
      /usr/local/lib/node_modules/pnpm \
      /usr/local/bin/pnpm \
      /usr/local/bin/yarn \
      /usr/local/bin/yarnpkg \
      /opt/yarn-v1.22.22; do
      test ! -e "${path}"
    done
    test -z "$(find /app -type f \( -name "*.ts" -o -name "*.map" -o -name "*.test.js" -o -name "*.spec.js" \) -print -quit)"
  '
  docker run --rm --cap-drop ALL --security-opt no-new-privileges --entrypoint sh "${image}" -ec "test -f '${required_path}'"
}

verify_prebuilt_image_binding() {
  local label=$1
  local image=$2
  local expected_digest=$3
  local archive=$4
  local observed_image_id=''
  local observed_repo_digests=''
  local binding=''

  observed_image_id="$(docker image inspect --format '{{.Id}}' "${image}")"
  observed_repo_digests="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "${image}")"
  binding="$(
    OCI_ARCHIVE="${archive}" EXPECTED_OCI_DIGEST="${expected_digest}" node --input-type=module <<'NODE'
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

const archive = process.env.OCI_ARCHIVE;
const expectedDigest = process.env.EXPECTED_OCI_DIGEST;
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const hash = (buffer) => `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
const hashFile = async (path) => {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return `sha256:${digest.digest('hex')}`;
};
const readArchiveEntry = (entry) =>
  execFileSync('tar', ['-xOf', archive, entry], { maxBuffer: 16 * 1024 * 1024 });
const readJsonBlob = (digest) => {
  if (!digestPattern.test(digest)) throw new Error(`invalid OCI digest ${digest}`);
  const bytes = readArchiveEntry(`blobs/sha256/${digest.slice('sha256:'.length)}`);
  if (hash(bytes) !== digest) throw new Error(`OCI blob digest mismatch for ${digest}`);
  return JSON.parse(bytes.toString('utf8'));
};

const layout = JSON.parse(readArchiveEntry('oci-layout').toString('utf8'));
if (layout.imageLayoutVersion !== '1.0.0') throw new Error('unsupported OCI layout version');
const index = JSON.parse(readArchiveEntry('index.json').toString('utf8'));
const rootDescriptors = (index.manifests ?? []).filter(
  (descriptor) => descriptor.digest === expectedDigest
);
if (rootDescriptors.length !== 1) {
  throw new Error(`expected OCI digest ${expectedDigest} is not the unique archive root`);
}

const expectedObject = readJsonBlob(expectedDigest);
let runtimeManifestDigest = expectedDigest;
let runtimeManifest = expectedObject;
if (Array.isArray(expectedObject.manifests)) {
  const architecture = process.arch === 'x64' ? 'amd64' : process.arch;
  const candidates = expectedObject.manifests.filter(
    (descriptor) =>
      descriptor.platform?.os === 'linux' && descriptor.platform?.architecture === architecture
  );
  if (candidates.length !== 1) {
    throw new Error(`OCI index must contain exactly one linux/${architecture} runtime manifest`);
  }
  runtimeManifestDigest = candidates[0].digest;
  runtimeManifest = readJsonBlob(runtimeManifestDigest);
}

const configDigest = runtimeManifest.config?.digest;
if (!digestPattern.test(configDigest ?? '')) {
  throw new Error('OCI runtime manifest has no immutable config digest');
}
readJsonBlob(configDigest);
const archiveSha256 = await hashFile(archive);
process.stdout.write(`${runtimeManifestDigest}\t${configDigest}\t${archiveSha256}`);
NODE
  )"

  local runtime_manifest_digest=''
  local config_digest=''
  local archive_sha256=''
  IFS=$'\t' read -r runtime_manifest_digest config_digest archive_sha256 <<<"${binding}"
  if [[ \
    "${observed_image_id}" != "${expected_digest}" && \
    "${observed_image_id}" != "${config_digest}" && \
    "${observed_repo_digests}" != *"@${expected_digest}"* \
  ]]; then
    echo "${label} prebuilt image ${image} is not the runtime payload bound to ${expected_digest}" >&2
    exit 1
  fi
  printf '%s\t%s\t%s\t%s\n' \
    "${runtime_manifest_digest}" "${config_digest}" "${archive_sha256}" "${observed_image_id}"
}

write_prebuilt_evidence() {
  local output=$1
  mkdir -p "$(dirname "${output}")"
  RELEASE_IMAGE_EVIDENCE_OUTPUT="${output}" \
    RELEASE_SOURCE_SHA="${release_source_sha}" \
    RELEASE_API_IMAGE_REF="${api_image}" \
    RELEASE_API_OCI_DIGEST="${api_oci_digest}" \
    RELEASE_API_RUNTIME_MANIFEST_DIGEST="${api_runtime_manifest_digest}" \
    RELEASE_API_CONFIG_DIGEST="${api_config_digest}" \
    RELEASE_API_ARCHIVE_SHA256="${api_archive_sha256}" \
    RELEASE_API_OBSERVED_IMAGE_ID="${api_observed_image_id}" \
    RELEASE_WORKER_IMAGE_REF="${worker_image}" \
    RELEASE_WORKER_OCI_DIGEST="${worker_oci_digest}" \
    RELEASE_WORKER_RUNTIME_MANIFEST_DIGEST="${worker_runtime_manifest_digest}" \
    RELEASE_WORKER_CONFIG_DIGEST="${worker_config_digest}" \
    RELEASE_WORKER_ARCHIVE_SHA256="${worker_archive_sha256}" \
    RELEASE_WORKER_OBSERVED_IMAGE_ID="${worker_observed_image_id}" \
    RELEASE_SPA_IMAGE_REF="${spa_image}" \
    RELEASE_SPA_OCI_DIGEST="${spa_oci_digest}" \
    RELEASE_SPA_RUNTIME_MANIFEST_DIGEST="${spa_runtime_manifest_digest}" \
    RELEASE_SPA_CONFIG_DIGEST="${spa_config_digest}" \
    RELEASE_SPA_ARCHIVE_SHA256="${spa_archive_sha256}" \
    RELEASE_SPA_OBSERVED_IMAGE_ID="${spa_observed_image_id}" \
    node --input-type=module <<'NODE'
import { renameSync, writeFileSync } from 'node:fs';

const imageEvidence = (name) => {
  const prefix = `RELEASE_${name.toUpperCase()}`;
  return {
    reference: process.env[`${prefix}_IMAGE_REF`],
    ociDigest: process.env[`${prefix}_OCI_DIGEST`],
    runtimeManifestDigest: process.env[`${prefix}_RUNTIME_MANIFEST_DIGEST`],
    imageConfigDigest: process.env[`${prefix}_CONFIG_DIGEST`],
    observedDockerImageId: process.env[`${prefix}_OBSERVED_IMAGE_ID`],
    archiveSha256: process.env[`${prefix}_ARCHIVE_SHA256`]
  };
};

const evidence = {
  schemaVersion: 1,
  status: 'passed',
  mode: 'prebuilt',
  sourceSha: process.env.RELEASE_SOURCE_SHA,
  validatedAt: new Date().toISOString(),
  images: {
    api: imageEvidence('api'),
    worker: imageEvidence('worker'),
    spa: imageEvidence('spa')
  },
  checks: {
    api: [
      'oci-layout-digest-and-runtime-config-binding',
      'non-root-read-only-runtime',
      'database-migration',
      'runtime-role-reconciliation',
      'production-readiness'
    ],
    worker: [
      'oci-layout-digest-and-runtime-config-binding',
      'non-root-read-only-runtime',
      'production-readiness'
    ],
    spa: [
      'oci-layout-digest-and-runtime-config-binding',
      'non-root-read-only-runtime',
      'production-readiness',
      'helm-rendered-api-live-proxy'
    ]
  }
};
const output = process.env.RELEASE_IMAGE_EVIDENCE_OUTPUT;
const temporaryOutput = `${output}.tmp-${process.pid}`;
writeFileSync(temporaryOutput, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
renameSync(temporaryOutput, output);
NODE
}

cd "${repo_root}"

case "${release_image_mode}" in
  build)
    for variable_name in \
      RELEASE_API_IMAGE_REF RELEASE_WORKER_IMAGE_REF RELEASE_SPA_IMAGE_REF \
      RELEASE_API_OCI_DIGEST RELEASE_WORKER_OCI_DIGEST RELEASE_SPA_OCI_DIGEST \
      RELEASE_API_OCI_ARCHIVE RELEASE_WORKER_OCI_ARCHIVE RELEASE_SPA_OCI_ARCHIVE \
      RELEASE_IMAGE_EVIDENCE_OUTPUT RELEASE_SOURCE_SHA; do
      if [[ -n "${!variable_name:-}" ]]; then
        echo "${variable_name} requires RELEASE_IMAGE_MODE=prebuilt; refusing to rebuild ambiguous release inputs" >&2
        exit 1
      fi
    done
    ;;
  prebuilt)
    for variable_name in \
      RELEASE_API_IMAGE_REF RELEASE_WORKER_IMAGE_REF RELEASE_SPA_IMAGE_REF \
      RELEASE_API_OCI_DIGEST RELEASE_WORKER_OCI_DIGEST RELEASE_SPA_OCI_DIGEST \
      RELEASE_API_OCI_ARCHIVE RELEASE_WORKER_OCI_ARCHIVE RELEASE_SPA_OCI_ARCHIVE \
      RELEASE_IMAGE_EVIDENCE_OUTPUT RELEASE_SOURCE_SHA; do
      if [[ -z "${!variable_name:-}" ]]; then
        echo "${variable_name} is required when RELEASE_IMAGE_MODE=prebuilt" >&2
        exit 1
      fi
    done
    api_image="${RELEASE_API_IMAGE_REF}"
    worker_image="${RELEASE_WORKER_IMAGE_REF}"
    spa_image="${RELEASE_SPA_IMAGE_REF}"
    api_oci_digest="${RELEASE_API_OCI_DIGEST}"
    worker_oci_digest="${RELEASE_WORKER_OCI_DIGEST}"
    spa_oci_digest="${RELEASE_SPA_OCI_DIGEST}"
    release_image_evidence_output="${RELEASE_IMAGE_EVIDENCE_OUTPUT}"
    release_source_sha="${RELEASE_SOURCE_SHA}"
    for digest in "${api_oci_digest}" "${worker_oci_digest}" "${spa_oci_digest}"; do
      if [[ ! "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
        echo "Prebuilt OCI digest is invalid: ${digest}" >&2
        exit 1
      fi
    done
    if [[ ! "${release_source_sha}" =~ ^[0-9a-f]{40}$ ]]; then
      echo 'RELEASE_SOURCE_SHA must be a full lowercase Git commit SHA in prebuilt mode' >&2
      exit 1
    fi
    for archive in \
      "${RELEASE_API_OCI_ARCHIVE}" \
      "${RELEASE_WORKER_OCI_ARCHIVE}" \
      "${RELEASE_SPA_OCI_ARCHIVE}"; do
      if [[ ! -f "${archive}" || ! -r "${archive}" ]]; then
        echo "Prebuilt OCI archive is missing or unreadable: ${archive}" >&2
        exit 1
      fi
    done
    ;;
  *)
    echo 'RELEASE_IMAGE_MODE must be build or prebuilt' >&2
    exit 1
    ;;
esac

if [[ -z "${RELEASE_IMAGE_DATABASE_URL:-}" ]]; then
  echo 'RELEASE_IMAGE_DATABASE_URL targeting the disposable cvg_his_v2_release_image_test database is required' >&2
  exit 1
fi
if [[ "${RELEASE_IMAGE_DATABASE_URL}" != "${expected_release_database_url}" ]]; then
  echo "RELEASE_IMAGE_DATABASE_URL must be the local disposable URL ${expected_release_database_url}" >&2
  exit 1
fi
postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test 2>/dev/null || true)"
if [[ -z "${postgres_container}" ]]; then
  echo 'The local postgres-test container must be running before release image validation' >&2
  exit 1
fi
postgres_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "${postgres_container}" 2>/dev/null || true)"
if [[ "${postgres_health}" != 'healthy' ]]; then
  echo 'The local postgres-test container must be healthy before release image validation' >&2
  exit 1
fi
if ! command -v "${helm_bin}" >/dev/null 2>&1; then
  echo 'Pinned Helm is required for release image validation' >&2
  exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo 'OpenSSL is required for the release attachment readiness TLS fixture' >&2
  exit 1
fi

if [[ "${release_image_mode}" == 'build' ]]; then
  docker build --progress plain --file apps/api/Dockerfile --tag "${api_image}" .
  docker build --progress plain --file apps/worker/Dockerfile --tag "${worker_image}" .
  docker build --progress plain --file apps/spa/Dockerfile --tag "${spa_image}" .
else
  IFS=$'\t' read -r \
    api_runtime_manifest_digest api_config_digest api_archive_sha256 api_observed_image_id < <(
    verify_prebuilt_image_binding \
      API "${api_image}" "${api_oci_digest}" "${RELEASE_API_OCI_ARCHIVE}"
  )
  IFS=$'\t' read -r \
    worker_runtime_manifest_digest worker_config_digest worker_archive_sha256 worker_observed_image_id < <(
    verify_prebuilt_image_binding \
      worker "${worker_image}" "${worker_oci_digest}" "${RELEASE_WORKER_OCI_ARCHIVE}"
  )
  IFS=$'\t' read -r \
    spa_runtime_manifest_digest spa_config_digest spa_archive_sha256 spa_observed_image_id < <(
    verify_prebuilt_image_binding \
      SPA "${spa_image}" "${spa_oci_digest}" "${RELEASE_SPA_OCI_ARCHIVE}"
  )
fi

assert_node_image "${api_image}" /app/packages/db/dist/migrate.js
docker run --rm --cap-drop ALL --security-opt no-new-privileges --entrypoint sh "${api_image}" -ec '
  test -f /app/packages/db/dist/reconcile-runtime-roles.js
  test -n "$(find /app/packages/db/migrations -type f -name "*.sql" -print -quit)"
'
assert_node_image "${worker_image}" /app/dist/index.js

test "$(docker image inspect --format '{{.Config.User}}' "${spa_image}")" = 'nginx'
docker run --rm --cap-drop ALL --security-opt no-new-privileges --entrypoint sh "${spa_image}" -ec '
  test "$(id -u)" -ne 0
  test "$(stat -c %u /usr/share/nginx/html/index.html)" -eq 0
  test ! -w /usr/share/nginx/html/index.html
  test ! -w /etc/nginx/conf.d/default.conf
  test ! -w /etc/nginx/nginx.conf
  test -w /var/cache/nginx
  ! grep -q "__API_" /etc/nginx/conf.d/default.conf
  grep -q "resolver 127.0.0.11" /etc/nginx/conf.d/default.conf
  grep -q "server cvg-his-v2-api:3001 resolve;" /etc/nginx/conf.d/default.conf
'

spa_proxy_config_dir="$(mktemp -d /tmp/cvg-release-spa-proxy.XXXXXX)"
"${helm_bin}" template cvg-his-v2-prod infra/helm/cvg-his-v2 \
  -f infra/helm/cvg-his-v2/values.yaml \
  -f infra/helm/cvg-his-v2/values.prod.yaml \
  --set-string api.image.sha="sha256:$(printf 'a%.0s' {1..64})" \
  --set-string worker.image.sha="sha256:$(printf 'b%.0s' {1..64})" \
  --set-string spa.image.sha="sha256:$(printf 'c%.0s' {1..64})" \
  | SPA_PROXY_CONFIG_DIR="${spa_proxy_config_dir}" node --input-type=module -e '
      import fs from "node:fs";
      import path from "node:path";
      import YAML from "yaml";
      const docs = YAML.parseAllDocuments(fs.readFileSync(0, "utf8")).map((doc) => doc.toJSON());
      const config = docs.find(
        (doc) => doc?.kind === "ConfigMap" &&
          doc?.metadata?.name === "cvg-his-v2-prod-cvg-his-v2-spa-config-nginx"
      );
      const content = config?.data?.["default.conf"];
      if (!content?.includes("server cvg-his-v2-prod-cvg-his-v2-api:3001;")) {
        throw new Error("Helm-rendered SPA proxy does not target the release-scoped API Service");
      }
      if (content.includes("__API_") || content.includes("127.0.0.11")) {
        throw new Error("Helm-rendered SPA proxy contains unresolved or Docker-only DNS configuration");
      }
      fs.writeFileSync(path.join(process.env.SPA_PROXY_CONFIG_DIR, "default.conf"), content);
    '

docker run --detach --name "${spa_container}" --publish 127.0.0.1::3002 \
  --read-only \
  --user 10000:10000 \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m,uid=10000,gid=10000,mode=0750 \
  --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=32m,uid=10000,gid=10000,mode=0750 \
  "${spa_image}" >/dev/null
spa_port="$(published_port "${spa_container}" 3002)"
wait_for_http "http://127.0.0.1:${spa_port}/" 60 "${spa_container}"
wait_for_container_healthy "${spa_container}"

  api_role='cvg_api'
  worker_role='cvg_worker'
  api_password='release_api_runtime_password_2026'
  worker_password='release_worker_runtime_password_2026'
  account_id='00000000-0000-4000-8000-000000000001'
  report_user_id='00000000-0000-4000-8000-000000000002'
  docker compose -f docker-compose.test.yml exec -T postgres-test dropdb \
    --username postgres --if-exists --force "${release_database}"
  docker compose -f docker-compose.test.yml exec -T postgres-test createdb \
    --username postgres "${release_database}"
  docker run --rm --network host \
    --read-only \
    --user 10000:10000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --env DATABASE_URL="${RELEASE_IMAGE_DATABASE_URL}" \
    "${api_image}" node packages/db/dist/migrate.js
  docker compose -f docker-compose.test.yml exec -T postgres-test psql \
    --username postgres --dbname "${release_database}" <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_api') THEN
    CREATE ROLE cvg_api LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cvg_worker') THEN
    CREATE ROLE cvg_worker LOGIN;
  END IF;
END
$roles$;
ALTER ROLE cvg_api PASSWORD 'release_api_runtime_password_2026';
ALTER ROLE cvg_worker PASSWORD 'release_worker_runtime_password_2026';
SQL
  docker run --rm --network host \
    --read-only \
    --user 10000:10000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --env DATABASE_URL="${RELEASE_IMAGE_DATABASE_URL}" \
    --env POSTGRES_API_USER=cvg_api \
    --env POSTGRES_WORKER_USER=cvg_worker \
    "${api_image}" node packages/db/dist/reconcile-runtime-roles.js
  docker compose -f docker-compose.test.yml exec -T postgres-test psql \
    --username postgres --dbname "${release_database}" <<'SQL'
INSERT INTO tenants (id, slug, name)
VALUES (
  '00000000-0000-4000-8000-000000000003',
  'release-validation',
  'Release Validation'
);
INSERT INTO accounts (id, tenant_id, slug, name)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000003',
  'release-validation',
  'Release Validation'
);
INSERT INTO users (
  id, account_id, email, password_hash, full_name, username,
  principal_kind, interactive_login_enabled, is_active
)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'reports@release-validation.invalid',
  'disabled',
  'Release Validation Reports',
  'release-validation-reports',
  'service',
  FALSE,
  TRUE
);
INSERT INTO account_service_principals (account_id, purpose, user_id, is_active)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'report-execution',
  '00000000-0000-4000-8000-000000000002',
  TRUE
);
SQL

  docker network create "${validation_network}" >/dev/null
  docker network connect --alias postgres "${validation_network}" "${postgres_container}"
  postgres_network_connected=1
  attachment_fixture_tls_dir="$(mktemp -d /tmp/cvg-release-attachment-tls.XXXXXX)"
  chmod 0755 "${attachment_fixture_tls_dir}"
  tee "${attachment_fixture_tls_dir}/openssl.cnf" >/dev/null <<'OPENSSL_CONFIG'
[req]
distinguished_name = subject
x509_extensions = extensions
prompt = no
[subject]
CN = attachment-fixture
[extensions]
subjectAltName = DNS:attachment-fixture
basicConstraints = critical,CA:TRUE
keyUsage = critical,digitalSignature,keyEncipherment,keyCertSign
extendedKeyUsage = serverAuth
OPENSSL_CONFIG
  openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
    -config "${attachment_fixture_tls_dir}/openssl.cnf" \
    -keyout "${attachment_fixture_tls_dir}/server.key" \
    -out "${attachment_fixture_tls_dir}/server.crt" >/dev/null 2>&1
  cp "${attachment_fixture_tls_dir}/server.crt" "${attachment_fixture_tls_dir}/ca.crt"
  chmod 0444 \
    "${attachment_fixture_tls_dir}/ca.crt" \
    "${attachment_fixture_tls_dir}/server.crt" \
    "${attachment_fixture_tls_dir}/server.key"
  docker run --detach --name "${attachment_fixture_container}" \
    --network "${validation_network}" \
    --network-alias attachment-fixture \
    --publish 127.0.0.1::9080 \
    --read-only \
    --user 10000:10000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --volume "${repo_root}/scripts/release-attachment-readiness-fixture.mjs:/fixture.mjs:ro" \
    --volume "${attachment_fixture_tls_dir}:/run/attachment-fixture:ro" \
    --env ATTACHMENT_FIXTURE_CERT_PATH=/run/attachment-fixture/server.crt \
    --env ATTACHMENT_FIXTURE_KEY_PATH=/run/attachment-fixture/server.key \
    --env ATTACHMENT_FIXTURE_ACCESS_KEY=release_validation_access \
    --env ATTACHMENT_FIXTURE_SECRET_KEY=release_validation_private_key \
    --env ATTACHMENT_FIXTURE_REGION=us-east-1 \
    --env ATTACHMENT_FIXTURE_BUCKET=release-validation \
    --entrypoint node \
    "${api_image}" /fixture.mjs >/dev/null
  attachment_fixture_port="$(published_port "${attachment_fixture_container}" 9080)"
  wait_for_http \
    "http://127.0.0.1:${attachment_fixture_port}/ready" \
    30 \
    "${attachment_fixture_container}"
  docker run --detach --name "${redis_container}" --network "${validation_network}" \
    --network-alias redis \
    --read-only \
    --user 999:1000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --tmpfs /data:rw,noexec,nosuid,size=32m,uid=999,gid=1000,mode=0750 \
    "${redis_image}" >/dev/null
  wait_for_redis "${redis_container}"

  api_database_url="postgres://${api_role}:${api_password}@postgres:5432/${release_database}"
  worker_database_url="postgres://${worker_role}:${worker_password}@postgres:5432/${release_database}"
  docker run --detach --name "${api_container}" --network "${validation_network}" \
    --network-alias cvg-his-v2-prod-cvg-his-v2-api \
    --publish 127.0.0.1::3001 \
    --read-only \
    --user 10000:10000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --env NODE_ENV=production \
    --env HOST=0.0.0.0 \
    --env CORS_ALLOWED_ORIGINS=https://release-validation.invalid \
    --env DATABASE_URL="${api_database_url}" \
    --env DATABASE_REQUIRE_RLS_ROLE=1 \
    --env REDIS_URL=redis://redis:6379 \
    --env RUNTIME_DISTRIBUTED_STATE_ENABLED=1 \
    --env AUTH_SECRET=9d6188296fa64aac571ce96b8a3f102d631f5a8c2774e50b \
    --env PAGARME_API_KEY=pagarme_release_validation_key \
    --env PAGARME_PIX_KEY=release-validation-pix-key \
    --env NFSE_API_URL=https://nfse.release-validation.invalid \
    --env NFSE_API_KEY=nfse_release_validation_key \
    --env NFSE_MUNICIPALITY_CODE=3550308 \
    --env 'NFSE_ISSUER_JSON={"cnpj":"99999999000101","inscricaoMunicipal":"000001","razaoSocial":"Release Validation","address":{"street":"Avenida Exemplo","number":"1000","district":"Centro","city":"Sao Paulo","state":"SP","zipCode":"01000000","country":"BR"}}' \
    --env RESEND_API_KEY=resend_release_validation_key \
    --env SMS_API_KEY=sms_release_validation_key \
    --env GOOGLE_CALENDAR_ACCESS_TOKEN=calendar_release_validation_token \
    --env GOOGLE_CALENDAR_CALENDAR_ID=release-validation-calendar \
    --env ATTACHMENT_SCANNER_HOST=attachment-fixture \
    --env ATTACHMENT_STORAGE_S3_ENDPOINT=https://attachment-fixture:9443 \
    --env ATTACHMENT_STORAGE_S3_BUCKET=release-validation \
    --env ATTACHMENT_STORAGE_S3_ACCESS_KEY=release_validation_access \
    --env ATTACHMENT_STORAGE_S3_SECRET_KEY=release_validation_private_key \
    --env NODE_EXTRA_CA_CERTS=/run/attachment-fixture/ca.crt \
    --volume "${attachment_fixture_tls_dir}/ca.crt:/run/attachment-fixture/ca.crt:ro" \
    --env WEBAUTHN_RP_ID=release-validation.invalid \
    --env WEBAUTHN_ORIGINS=https://release-validation.invalid \
    "${api_image}" >/dev/null
  api_port="$(published_port "${api_container}" 3001)"
  wait_for_http "http://127.0.0.1:${api_port}/ready" 90 "${api_container}"
  wait_for_container_healthy "${api_container}" 90
  curl --fail --silent --show-error \
    "http://127.0.0.1:${attachment_fixture_port}/ready" \
    | node --input-type=module -e '
        const chunks = [];
        for await (const chunk of process.stdin) chunks.push(chunk);
        const status = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (status.scannerProbeObserved !== true || status.storageProbeObserved !== true) {
          throw new Error("API readiness did not reach both attachment provider fixtures");
        }
      '

  docker run --detach --name "${worker_container}" --network "${validation_network}" \
    --publish 127.0.0.1::3002 \
    --read-only \
    --user 10000:10000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --env NODE_ENV=production \
    --env DATABASE_URL="${worker_database_url}" \
    --env DATABASE_REQUIRE_RLS_ROLE=1 \
    --env WORKER_ACCOUNT_IDS="${account_id}" \
    --env WORKER_REPORTS_USER_ID="${report_user_id}" \
    --env WORKER_INTERVAL_MS=60000 \
    "${worker_image}" >/dev/null
  worker_port="$(published_port "${worker_container}" 3002)"
  wait_for_http "http://127.0.0.1:${worker_port}/ready" 90 "${worker_container}"
  wait_for_container_healthy "${worker_container}" 90

  docker container rm --force "${spa_container}" >/dev/null
  docker run --detach --name "${spa_container}" --network "${validation_network}" \
    --publish 127.0.0.1::3002 \
    --read-only \
    --user 10000:10000 \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    --tmpfs /tmp:rw,noexec,nosuid,size=16m,uid=10000,gid=10000,mode=0750 \
    --tmpfs /var/cache/nginx:rw,noexec,nosuid,size=32m,uid=10000,gid=10000,mode=0750 \
    --volume "${spa_proxy_config_dir}/default.conf:/etc/nginx/conf.d/default.conf:ro" \
    "${spa_image}" >/dev/null
  spa_port="$(published_port "${spa_container}" 3002)"
  wait_for_http "http://127.0.0.1:${spa_port}/api/live" 90 "${spa_container}"
  wait_for_container_healthy "${spa_container}" 90
  docker stop "${attachment_fixture_container}" >/dev/null
  wait_for_http_status \
    "http://127.0.0.1:${api_port}/ready" \
    503 \
    30 \
    "${api_container}"
  wait_for_http "http://127.0.0.1:${api_port}/live" 10 "${api_container}"
if [[ "${release_image_mode}" == 'prebuilt' ]]; then
  write_prebuilt_evidence "${release_image_evidence_output}"
fi
echo 'PASS: release images are least-privilege, immutable, Helm-compatible, and expose production readiness endpoints.'

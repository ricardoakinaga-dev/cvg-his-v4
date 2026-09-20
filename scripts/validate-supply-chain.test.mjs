import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  inspectProductionRuntimeDockerfilePolicy,
  inspectReleaseImageValidationPolicy,
  inspectReleaseWorkflowPolicy,
  inspectSpaRuntimeDockerfilePolicy,
  inspectSupplyChain
} from './validate-supply-chain.mjs';

const DIGEST = 'sha256:' + 'a'.repeat(64);

function workflowStepBounds(content, name) {
  const marker = `      - name: ${name}`;
  const start = content.indexOf(marker);
  assert.notEqual(start, -1, `missing workflow fixture step: ${name}`);
  const next = content.indexOf('\n      - name:', start + marker.length);
  return { start, end: next < 0 ? content.length : next + 1 };
}

function mutateWorkflowStep(content, name, mutate) {
  const { start, end } = workflowStepBounds(content, name);
  const step = content.slice(start, end);
  const mutatedStep = mutate(step);
  assert.notEqual(mutatedStep, step, `workflow mutation did not change step: ${name}`);
  return `${content.slice(0, start)}${mutatedStep}${content.slice(end)}`;
}

function moveWorkflowStepAfter(content, name, destinationName) {
  const source = workflowStepBounds(content, name);
  const step = content.slice(source.start, source.end);
  const withoutStep = `${content.slice(0, source.start)}${content.slice(source.end)}`;
  const destination = workflowStepBounds(withoutStep, destinationName);
  return `${withoutStep.slice(0, destination.end)}${step}${withoutStep.slice(destination.end)}`;
}

function withReleaseImageModes(gate) {
  const modeSetup = `
release_image_mode="\${RELEASE_IMAGE_MODE:-build}"
assert_node_image() {
  writable_payload=''
  writable_payload="$(find /app -type f -perm /222 -print -quit)"
  test -z "\${writable_payload}"
}
verify_prebuilt_image_binding() {
  local image=$2
  local expected_digest=$3
  observed_image_id="$(docker image inspect --format '{{.Id}}' "\${image}")"
  observed_repo_digests="$(docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "\${image}")"
  # descriptor.digest === expectedDigest
  # rootDescriptors.length !== 1
  # hash(bytes) !== digest
  if [[ \
    "\${observed_image_id}" != "\${expected_digest}" && \
    "\${observed_image_id}" != "\${config_digest}" && \
    "\${observed_repo_digests}" != *"@\${expected_digest}"* \
  ]]; then
    exit 1
  fi
}
case "\${release_image_mode}" in
  build)
    ;;
  prebuilt)
    for variable_name in \
      RELEASE_API_IMAGE_REF RELEASE_WORKER_IMAGE_REF RELEASE_SPA_IMAGE_REF \
      RELEASE_API_OCI_DIGEST RELEASE_WORKER_OCI_DIGEST RELEASE_SPA_OCI_DIGEST \
      RELEASE_API_OCI_ARCHIVE RELEASE_WORKER_OCI_ARCHIVE RELEASE_SPA_OCI_ARCHIVE; do
      if [[ -z "\${!variable_name:-}" ]]; then
        exit 1
      fi
    done
    api_image="\${RELEASE_API_IMAGE_REF}"
    worker_image="\${RELEASE_WORKER_IMAGE_REF}"
    spa_image="\${RELEASE_SPA_IMAGE_REF}"
    api_oci_digest="\${RELEASE_API_OCI_DIGEST}"
    worker_oci_digest="\${RELEASE_WORKER_OCI_DIGEST}"
    spa_oci_digest="\${RELEASE_SPA_OCI_DIGEST}"
    for digest in "\${api_oci_digest}" "\${worker_oci_digest}" "\${spa_oci_digest}"; do
      if [[ ! "\${digest}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
        exit 1
      fi
    done
    ;;
esac
`;
  const imageSelection = `if [[ "\${release_image_mode}" == 'build' ]]; then
  docker build --progress plain --file apps/api/Dockerfile --tag "\${api_image}" .
  docker build --progress plain --file apps/worker/Dockerfile --tag "\${worker_image}" .
  docker build --progress plain --file apps/spa/Dockerfile --tag "\${spa_image}" .
else
  verify_prebuilt_image_binding \\
    API "\${api_image}" "\${api_oci_digest}" "\${RELEASE_API_OCI_ARCHIVE}"
  verify_prebuilt_image_binding \\
    worker "\${worker_image}" "\${worker_oci_digest}" "\${RELEASE_WORKER_OCI_ARCHIVE}"
  verify_prebuilt_image_binding \\
    SPA "\${spa_image}" "\${spa_oci_digest}" "\${RELEASE_SPA_OCI_ARCHIVE}"
fi
assert_node_image "\${api_image}" /app/packages/db/dist/migrate.js
assert_node_image "\${worker_image}" /app/dist/index.js`;
  return `${modeSetup}\n${gate.replace(
    'docker build --file apps/api/Dockerfile .',
    imageSelection
  )}`;
}

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-supply-chain-'));
  mkdirSync(join(directory, '.github/workflows'), { recursive: true });
  mkdirSync(join(directory, 'infra/helm/chart/templates'), { recursive: true });
  mkdirSync(join(directory, 'infra/scripts'), { recursive: true });
  writeFileSync(
    join(directory, '.github/workflows/ci.yml'),
    `jobs:\n  test:\n    uses: acme/test@${'b'.repeat(40)}\n    services:\n      postgres:\n        image: postgres@${DIGEST}\n`
  );
  writeFileSync(
    join(directory, 'docker-compose.test.yml'),
    `services:\n  db:\n    image: postgres@${DIGEST}\n  app:\n    image: cvg-his-v2-local:dev\n`
  );
  writeFileSync(
    join(directory, 'infra/helm/chart/templates/pod.yaml'),
    `apiVersion: v1\nspec:\n  containers:\n    - name: db\n      image: postgres@${DIGEST}\n`
  );
  writeFileSync(join(directory, 'Dockerfile'), `FROM node@${DIGEST}\n`);
  writeFileSync(join(directory, '.npmrc'), 'inject-workspace-packages=true\n');
  writeFileSync(
    join(directory, 'infra/scripts/restore.sh'),
    `docker run --rm postgres@${DIGEST} pg_restore -l /backup/database.dump\n`
  );
  return directory;
}

test('supply-chain validator covers workflow services, Compose, Helm and Docker bases', () => {
  const directory = fixture();
  try {
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.deepEqual(result.findings, []);
    assert.equal(result.counts.workflowImageCount, 1);
    assert.equal(result.counts.composeImageCount, 2);
    assert.equal(result.counts.helmImageCount, 1);
    assert.equal(result.counts.dockerBaseCount, 1);
    assert.equal(result.counts.runtimeImageCount, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('release workflow preserves the exact scanned OCI candidate chain', () => {
  const workflow = readFileSync(
    join(process.cwd(), '.github/workflows/release-artifacts.yml'),
    'utf8'
  );
  assert.deepEqual(inspectReleaseWorkflowPolicy(workflow), []);

  const dynamicConditionWorkflow = workflow.replace(
    '      - name: Scan API image candidate for vulnerabilities',
    "      - if: ${{ github.event.workflow_run.conclusion == 'success' && github.ref == 'refs/heads/main' }}\n        name: Scan API image candidate for vulnerabilities"
  );
  assert.deepEqual(inspectReleaseWorkflowPolicy(dynamicConditionWorkflow), []);

  const parenthesizedKnownValueWorkflow = workflow.replace(
    '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
    "    if: ${{ false || ('workflow_run' == github.event_name) }}"
  );
  assert.deepEqual(inspectReleaseWorkflowPolicy(parenthesizedKnownValueWorkflow), []);

  const hashFilesCharacterClassWorkflow = workflow.replace(
    '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
    "    if: ${{ false || hashFiles('scripts/validate-supply-chain.test.m[!x]s') }}"
  );
  assert.deepEqual(inspectReleaseWorkflowPolicy(hashFilesCharacterClassWorkflow), []);

  const runtimeStep = 'Prove the exact OCI candidates at production runtime boundaries';
  const publicationStep = 'Publish vetted image candidates to quarantine without rebuilding';
  const uploadStep = 'Publish certified release manifest and evidence';
  const mutations = [
    workflow.replace('platforms: linux/amd64', 'platforms: linux/arm64'),
    workflow.replace(
      'outputs: type=oci,dest=/tmp/api-image.tar',
      'outputs: type=docker,dest=/tmp/api-image.tar'
    ),
    workflow.replace('input: /tmp/api-image.tar', 'input: /tmp/unscanned-api-image.tar'),
    workflow.replace(
      '      - name: Scan API image candidate for vulnerabilities',
      '      - if: false\n        name: Scan API image candidate for vulnerabilities'
    ),
    workflow.replace(
      '      - name: Scan API image candidate for vulnerabilities',
      '      - "if": false\n        name: Scan API image candidate for vulnerabilities'
    ),
    workflow.replace(
      '      - name: Scan API image candidate for vulnerabilities',
      '      - "i\\u0066": false\n        name: Scan API image candidate for vulnerabilities'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    "if": false'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    "i\\u0066": false'
    ),
    workflow.replace(
      '      - name: Scan API image candidate for vulnerabilities',
      "      - if: ${{ false && github.ref == 'refs/heads/main' }}\n        name: Scan API image candidate for vulnerabilities"
    ),
    workflow.replace(
      '      - name: Build API image candidate',
      '      - if: ${{ false }}\n        name: Build API image candidate'
    ),
    workflow.replace(
      '      - name: Build API image candidate',
      "      - if: ${{ false && github.ref == 'refs/heads/main' }}\n        name: Build API image candidate"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: false'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ false && github.event.workflow_run.conclusion == 'success' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      false'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >- # disable gate\n      false'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: |- # disable gate\n      false'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: 0'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: null'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ""'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ''"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ null }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: # disabled gate'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ 'A' != 'a' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ 'A' !== 'a' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 1 < null }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ null > 1 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ null != 0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name == 0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ false == github.event_name }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('false') == github.event_name }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ (fromJSON('false')) == github.event_name }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name == !false }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ false == !false }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !true == github.event_name }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ false && 0 == unsupported() }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name == null }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name == false }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name < 0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name > 0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ github.event_name == fromJSON('0') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !github.event_name }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ github.event_name != github.event_name }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ github['event_name'] == 'push' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ github.event_name == ('push') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ startsWith(github.event_name, 'push') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(github.event_name, 'push') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ endsWith(github.event_name, 'push') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(null, 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(0, 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('[]'), 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ join(fromJSON('[]'), '') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0}', '') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{{0}}', 'x') == '{x}' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{{Hello {0}}}', 'Mona') == '{Hello {0}}' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0}', '{1}', 'x') == 'x' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ toJSON(fromJSON('[1,2]')) == '[1,2]' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ fromJSON(\'{"enabled":false}\')[\'enabled\'] }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('[false]')[0] }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0}', fromJSON('[]')) == '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0}', fromJSON('{}')) == '[object Object]' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ '0b1' == true }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('#scripts/validate-supply-chain.mjs') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('__gauntlet_never__/**') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('.gauntlet/**', '!.gauntlet/**') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('.gauntlet/round-final2-block.json') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('**/*', '!**/*') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains((fromJSON('[]')), 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains((false && true), 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(format('{0}', false && true), 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ (fromJSON('false')) == true }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: &disabled false'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('false') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains('', 'x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ fromJSON(toJSON(false)) }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ toJSON(false) == 'true' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ fromJSON(toJSON(true)) == false }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ toJSON(fromJSON('false')) == 'true' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ '+1' != true }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ '0x1' != true }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('package.json') == 'static-hash' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains('a', fromJSON('[]')) }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ join(fromJSON('{}')) == '[object Object]' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('[false]').length }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !fromJSON('[false,true]')[true] }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('[false]').*, true) }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0:}', false) == '{0:}' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ +1 != 1 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ '0x80000000' == 2147483648 }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0xFFFFFFFF != -1 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ '0xFFFFFFFF' != -1 }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 1e309 != 1e309 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !1e309 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0}', 1.2345678901234567) == '1.2345678901234567' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !contains(fromJSON('[{\"enabled\":true}]').*.enabled, true) }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !Infinity }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ NaN }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ fromJSON(false) }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ fromJSON(0) }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('NaN') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !fromJSON('Infinity') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON(' NaN ') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !fromJSON(\'{"Enabled":true}\').enabled }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ github.Event_Name != 'workflow_run' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('scripts/validate-supply-chain.mjs', '!!!scripts/validate-supply-chain.mjs') != '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('scripts/validate-supply-chain.mjs', '!scripts/validate-supply-chain.mjs ') != '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('scripts/validate-supply-chain.mjs', '! scripts/validate-supply-chain.mjs') != '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('false, true') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('false /*x*/') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !fromJSON('[Infinity]')[0] }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('0x10') != 16 }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('0xFFFFFFFF') == -1 }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('undefined') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('[undefined]')[0] }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !contains(fromJSON('[undefined]'), '') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('undefined, false') != 'undefined' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Date(0) /*x*/'), '/*x*/') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Date(/*x*/0)'), '/*x*/') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Date(/*x*/0)'), ' 0 ') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Date( 0 )'), ' 0 ') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(\"a  b\")'), 'a b') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(''x'')'), '''') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(0x10)'), '0x') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo0x10(0)'), 'new Foo16') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(1.0)'), 'new Foo(1)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(NaN)'), 'new Foo(NaN)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo({\"a\":1})'), 'new Foo({\"a\":1})') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Infinity(0)'), 'new \"Infinity\"(0)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(1e0)'), 'new Foo(1e0)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo([new Bar(1)])'), '\"new Bar(1)\"') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":NaN})\'), \'"x": NaN\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(1.00)'), 'new Foo(1.00)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(1e309)'), 'new Foo(Infinity)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":undefined})\'), \'"x": "undefined"\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":1.0,"y":0})\'), \'"x": 1,\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(new Bar(1))'), 'new Bar(1)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(,1)'), 'new Foo(,1)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":1.2345678901234567,"y":0})\'), \'"x": 1.23456789012346,\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":9007199254740993,"y":0})\'), \'"x": 9.00719925474099E+15,\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo([,1])'), '[,1]') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('new Foo.Bar(0)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(1,)'), 'undefined') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      !contains(fromJSON(\'new Foo({"a":1,"A":2})\'), \'"a": 1\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !fromJSON('new Foo.Bar(0)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('new Foo(0b10)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !fromJSON('0b10') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('new Foo(0o10)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !contains(fromJSON('new 1(0)'), 'new 1') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('new 𐐀(0)') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(1e-6)'), '0.000001') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":,})\'), \'"x":,\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: >-\n      contains(fromJSON(\'new Foo({"x":-0.0})\'), \'"x": 0.0\')'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('new Foo(-0)'), '-0') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('new Foo({\"x\":})') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !fromJSON('false, true') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('/*x*/false') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('012') == 12 }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ contains(fromJSON('{a:''\\n''}').a, 'n') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ fromJSON('{a:false}').a }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !fromJSON(\'{"a":false,"A":true}\').a }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ toJSON(fromJSON(\'{"a":1,"A":2}\')) != toJSON(fromJSON(\'{"a":2}\')) }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format(hashFiles('scripts/validate-supply-chain.mjs')) == '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ format('{0}', hashFiles('scripts/validate-supply-chain.mjs')) == '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ join(hashFiles('scripts/validate-supply-chain.mjs')) == '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ toJSON(hashFiles('scripts/validate-supply-chain.mjs')) == '' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !contains(hashFiles('scripts/validate-supply-chain.mjs'), '') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !startsWith(hashFiles('scripts/validate-supply-chain.mjs'), '') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !endsWith(hashFiles('scripts/validate-supply-chain.mjs'), '') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ hashFiles('scripts/**-parity-audit.mjs') }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ !contains(fromJSON('[{\"1\":true}]').*[1], true) }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ failure() }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ cancelled() }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ !success() }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ success() == false }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ always() == false }}'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: &disabled false\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0x0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0x00 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0X0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ -0x0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ 'A''B' != 'a''b' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      "    if: ${{ 'it''s' != 'IT''S' }}"
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0e0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0.0e+10 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ -0e-10 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 0 == 1 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 1 != 1 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 1 < 0 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ 1 > 2 }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ${{ false == true }}'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if: ~'
    ),
    workflow.replace(
      '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
      '    if:'
    ),
    workflow.replace(
      '      - name: Prove the exact OCI candidates at production runtime boundaries',
      "      - if: ${{ github.event_name == 'push' }}\n        name: Prove the exact OCI candidates at production runtime boundaries"
    ),
    workflow
      .replace('\n  workflow_run:', '\n    workflow_run:')
      .replace(
        '      - name: Prove the exact OCI candidates at production runtime boundaries',
        "      - if: ${{ github.event_name == 'push' }}\n        name: Prove the exact OCI candidates at production runtime boundaries"
      ),
    workflow.replace(
      '      - name: Prove the exact OCI candidates at production runtime boundaries',
      "      - if: ${{ github.event_name != 'workflow_run' }}\n        name: Prove the exact OCI candidates at production runtime boundaries"
    ),
    workflow
      .replace('\n  workflow_run:', "\n    'workflow_run':")
      .replace(
        '      - name: Prove the exact OCI candidates at production runtime boundaries',
        "      - if: ${{ github.event_name != 'workflow_run' }}\n        name: Prove the exact OCI candidates at production runtime boundaries"
      ),
    workflow
      .replace('\n  workflow_run:', '\n  "workflow_\\u0072un":')
      .replace(
        '      - name: Prove the exact OCI candidates at production runtime boundaries',
        "      - if: ${{ github.event_name == 'push' }}\n        name: Prove the exact OCI candidates at production runtime boundaries"
      ),
    workflow
      .replace('\n  workflow_run:', '\n  "workflow_\\u0072un":')
      .replace(
        '      - name: Prove the exact OCI candidates at production runtime boundaries',
        "      - if: ${{ github.event_name != 'workflow_run' }}\n        name: Prove the exact OCI candidates at production runtime boundaries"
      ),
    workflow.replace('\n  workflow_run:', '\n  push:'),
    workflow.replace('    workflows: [CI]', '    workflows: [OTHER]'),
    workflow.replace('    types: [completed]', '    types: [requested]'),
    workflow.replace('    types: [completed]', '    types: [completed]\n  push:'),
    workflow.replace(
      'on:\n  workflow_run:\n    workflows: [CI]\n    types: [completed]',
      'on: [workflow_run]'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: false\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: >-\n          false\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: >- # disable gate\n          false\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: |- # disable gate\n          false\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: 0\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: null\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ""\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      "      - if: ''\n        name: Run blocking Triple-A release gate"
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ null }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: # disabled gate\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      "      - if: ${{ 'A' != 'a' }}\n        name: Run blocking Triple-A release gate"
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      "      - if: ${{ 'A' !== 'a' }}\n        name: Run blocking Triple-A release gate"
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 1 < null }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ null > 1 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ null != 0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0x0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0x00 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0X0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ -0x0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      "      - if: ${{ 'A''B' != 'a''b' }}\n        name: Run blocking Triple-A release gate"
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      "      - if: ${{ 'it''s' != 'IT''S' }}\n        name: Run blocking Triple-A release gate"
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0e0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0.0e+10 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ -0e-10 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 0 == 1 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 1 != 1 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 1 < 0 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ 1 > 2 }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ${{ false == true }}\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if: ~\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Run blocking Triple-A release gate',
      '      - if:\n        name: Run blocking Triple-A release gate'
    ),
    workflow.replace(
      '      - name: Publish vetted image candidates to quarantine without rebuilding',
      "      - if: ${{ false && github.ref == 'refs/heads/main' }}\n        name: Publish vetted image candidates to quarantine without rebuilding"
    ),
    workflow.replace('        if: failure()', '        "if": false'),
    workflow.replace(
      'docker load --platform linux/amd64 --input /tmp/api-image.tar',
      'docker load --input /tmp/api-image.tar'
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace('RELEASE_IMAGE_MODE: prebuilt', 'RELEASE_IMAGE_MODE: build')
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace(
        'RELEASE_API_IMAGE_REF: cvg-his-v4-api:${{ env.RELEASE_SHA }}',
        'RELEASE_API_IMAGE_REF: cvg-his-v4-worker:${{ env.RELEASE_SHA }}'
      )
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace(
        'RELEASE_API_OCI_DIGEST: ${{ steps.api.outputs.digest }}',
        'RELEASE_API_OCI_DIGEST: ${{ steps.worker.outputs.digest }}'
      )
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace(
        'RELEASE_API_OCI_ARCHIVE: /tmp/api-image.tar',
        'RELEASE_API_OCI_ARCHIVE: /tmp/worker-image.tar'
      )
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace(
        'RELEASE_SOURCE_SHA: ${{ env.RELEASE_SHA }}',
        'RELEASE_SOURCE_SHA: ${{ github.sha }}'
      )
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace(
        'RELEASE_IMAGE_EVIDENCE_OUTPUT: artifacts/release/runtime-image-validation.json',
        'RELEASE_IMAGE_EVIDENCE_OUTPUT: /tmp/runtime-image-validation.json'
      )
    ),
    mutateWorkflowStep(workflow, runtimeStep, (step) =>
      step.replace('run: pnpm validate:release-images', 'run: true')
    ),
    moveWorkflowStepAfter(workflow, runtimeStep, publicationStep),
    moveWorkflowStepAfter(workflow, 'Build API image candidate', publicationStep),
    moveWorkflowStepAfter(
      workflow,
      'Scan API image candidate for vulnerabilities',
      publicationStep
    ),
    moveWorkflowStepAfter(
      workflow,
      'Load the exact scanned OCI candidates without rebuilding',
      publicationStep
    ),
    mutateWorkflowStep(workflow, publicationStep, (step) =>
      step.replace(
        'oras copy --recursive --from-oci-layout "/tmp/api-image:${RELEASE_SHA}" "${API_CANDIDATE_IMAGE}"',
        'oras copy --recursive --from-oci-layout "/tmp/worker-image:${RELEASE_SHA}" "${API_CANDIDATE_IMAGE}"'
      )
    ),
    mutateWorkflowStep(workflow, publicationStep, (step) =>
      step.replace('test "$(oras resolve "${API_CANDIDATE_IMAGE}")" = "${API_DIGEST}"', '')
    ),
    mutateWorkflowStep(workflow, publicationStep, (step) =>
      step.replace(
        'test "$(oras resolve "${API_CANDIDATE_IMAGE}")" = "${API_DIGEST}"',
        'test "$(oras resolve "${API_CANDIDATE_IMAGE}")" = "${WORKER_DIGEST}"'
      )
    ),
    mutateWorkflowStep(workflow, uploadStep, (step) =>
      step.replace('            artifacts/release/', '            artifacts/release/*.json')
    )
  ];

  for (const mutation of mutations) {
    assert.notDeepEqual(inspectReleaseWorkflowPolicy(mutation), []);
  }
  assert.deepEqual(
    inspectReleaseWorkflowPolicy(
      workflow.replace(
        '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
        "    if: ${{ format(fromJSON('{}')) == 'Object' }}"
      )
    ),
    []
  );
  assert.deepEqual(
    inspectReleaseWorkflowPolicy(
      workflow.replace(
        '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
        "    if: ${{ contains(fromJSON('[[true]]').*[0], true) }}"
      )
    ),
    []
  );
  assert.deepEqual(
    inspectReleaseWorkflowPolicy(
      workflow.replace(
        '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
        "    if: ${{ toJSON(1e309) == 'Infinity' }}"
      )
    ),
    []
  );
  for (const expression of [
    '0xFFFFFFFF == -1',
    "'0xFFFFFFFF' == -1",
    'fromJSON(true)',
    "format('{0}', hashFiles('scripts/validate-supply-chain.mjs')) != ''",
    "fromJSON('Infinity')",
    "!fromJSON('NaN')",
    "hashFiles('scripts/validate-supply-chain.mjs', '!!scripts/validate-supply-chain.mjs') != ''",
    "!fromJSON(' NaN ')",
    "fromJSON('{\"Enabled\":true}').enabled",
    "github.Event_Name == 'workflow_run'",
    "hashFiles('scripts/validate-supply-chain.mjs', '!!scripts/validate-supply-chain.mjs ') != ''",
    "!fromJSON('false /*x*/')",
    "!fromJSON('/*x*/false')",
    "!fromJSON('undefined')",
    "fromJSON('{\"a\":false,\"A\":true}').a",
    "fromJSON('[Infinity]')[0]",
    "fromJSON('0x10') == 16",
    "fromJSON('0xFFFFFFFF') == 4294967295",
    "!fromJSON('[undefined]')[0]",
    "contains(fromJSON('[undefined]'), '')",
    "fromJSON('undefined /*x*/') != 'undefined'",
    "fromJSON('012') == 10",
    "!contains(fromJSON('new Date(0) /*x*/'), '/*x*/')",
    "!contains(fromJSON('new Date(/*x*/0)'), '/*x*/')",
    "!contains(fromJSON('new Date(/*x*/0)'), ' 0 ')",
    "!contains(fromJSON('new Date( 0 )'), ' 0 ')",
    "!contains(fromJSON('new Foo(\"a  b\")'), 'a b')",
    "!contains(fromJSON('new Foo(''x'')'), '''')",
    "!contains(fromJSON('new Foo(0x10)'), '0x')",
    "!contains(fromJSON('new Foo0x10(0)'), 'new Foo16')",
    "!contains(fromJSON('new Foo(1.0)'), 'new Foo(1)')",
    "!contains(fromJSON('new Foo(NaN)'), 'new Foo(NaN)')",
    "!contains(fromJSON('new Foo({\"a\":1})'), 'new Foo({\"a\":1})')",
    "!contains(fromJSON('new Infinity(0)'), 'new \"Infinity\"(0)')",
    "!contains(fromJSON('new Foo(1e0)'), 'new Foo(1e0)')",
    "!contains(fromJSON('new Foo([new Bar(1)])'), '\"new Bar(1)\"')",
    "!contains(fromJSON('new Foo(1.00)'), 'new Foo(1.00)')",
    "!contains(fromJSON('new Foo(1e309)'), 'new Foo(Infinity)')",
    "!contains(fromJSON('new Foo(new Bar(1))'), 'new Bar(1)')",
    "!contains(fromJSON('new Foo(,1)'), 'new Foo(,1)')",
    "!contains(fromJSON('new Foo([,1])'), '[,1]')",
    "!contains(fromJSON('new Foo(1,)'), 'undefined')",
    "!contains(fromJSON('new Foo(1e-6)'), '0.000001')",
    "!contains(fromJSON('{a:''\\n''}').a, 'n')",
    "!fromJSON('{a:false}').a",
    "toJSON(fromJSON('{\"a\":1,\"A\":2}')) == toJSON(fromJSON('{\"a\":2}'))"
  ]) {
    assert.deepEqual(
      inspectReleaseWorkflowPolicy(
        workflow.replace(
          '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
          `    if: \${{ ${expression} }}`
        )
      ),
      []
    );
  }
  assert.deepEqual(
    inspectReleaseWorkflowPolicy(
      workflow.replace(
        '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
        '    if: >-\n      !contains(fromJSON(\'new Foo({"x":NaN})\'), \'"x": NaN\')'
      )
    ),
    []
  );
  for (const expression of [
    "!contains(fromJSON('new Foo({\"x\":undefined})'), '\"x\": \"undefined\"')",
    "!contains(fromJSON('new Foo({\"x\":1.0,\"y\":0})'), '\"x\": 1,')",
    "!contains(fromJSON('new Foo({\"x\":1.2345678901234567,\"y\":0})'), '\"x\": 1.23456789012346,')",
    "!contains(fromJSON('new Foo({\"x\":9007199254740993,\"y\":0})'), '\"x\": 9.00719925474099E+15,')"
  ]) {
    assert.deepEqual(
      inspectReleaseWorkflowPolicy(
        workflow.replace(
          '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
          `    if: >-\n      ${expression}`
        )
      ),
      []
    );
  }
  for (const expression of [
    "!contains(fromJSON('new Foo({\"x\":,})'), '\"x\":,')",
    "!contains(fromJSON('new Foo({\"x\":-0.0})'), '\"x\": 0.0')"
  ]) {
    assert.deepEqual(
      inspectReleaseWorkflowPolicy(
        workflow.replace(
          '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
          `    if: >-\n      ${expression}`
        )
      ),
      []
    );
  }
  assert.deepEqual(
    inspectReleaseWorkflowPolicy(
      workflow.replace(
        '    if: >-\n      github.event.workflow_run.conclusion == \'success\' &&\n      github.event.workflow_run.head_branch == \'main\' &&\n      github.event.workflow_run.event == \'push\'',
        '    if: >-\n      contains(fromJSON(\'new Foo({"a":1,"A":2})\'), \'"a": 1\')'
      )
    ),
    []
  );
});

test('production runtime policy accepts minimal non-root deploy closures', () => {
  const nodeDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
RUN pnpm --filter @cvg-his-v2/api deploy --prod /prod/api
FROM node:22.23.2-alpine3.24@${DIGEST} AS runner
RUN corepack disable && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/lib/node_modules/pnpm /usr/local/bin/pnpm /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-v1.22.22
COPY --from=builder /prod/api ./
RUN chmod -R a-w /app
USER node
HEALTHCHECK CMD wget -qO- "http://127.0.0.1:\${PORT}/ready" >/dev/null || exit 1
CMD ["node", "dist/index.js"]
`;
  assert.deepEqual(
    inspectProductionRuntimeDockerfilePolicy(nodeDockerfile, {
      path: 'apps/api/Dockerfile',
      packageName: '@cvg-his-v2/api',
      deployDirectory: 'api',
      healthcheck: true
    }),
    []
  );

  const spaDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
FROM nginx:1.30.5-alpine3.24@${DIGEST} AS runner
RUN sed -i 's!^pid .*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf && chown -R nginx:nginx /var/cache/nginx
COPY infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i -e 's!__API_RESOLVER__!resolver 127.0.0.11 valid=10s ipv6=off;!' -e 's!__API_UPSTREAM__!cvg-his-v2-api:3001 resolve!' /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/spa/dist .
RUN chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf
USER nginx
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3002/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
`;
  assert.deepEqual(inspectSpaRuntimeDockerfilePolicy(spaDockerfile), []);
  assert.equal(
    inspectSpaRuntimeDockerfilePolicy(
      spaDockerfile.replace('infra/helm/cvg-his-v2/files/spa-nginx.conf', 'apps/spa/nginx.conf')
    ).some((finding) => finding.includes('canonical nginx template')),
    true
  );
});

test('release image gate preserves the production Helm security context', () => {
  const validGate = withReleaseImageModes(`
release_database='cvg_his_v2_release_image_test'
expected_release_database_url="postgres://postgres:postgres@127.0.0.1:5433/\${release_database}"
if [[ -z "\${RELEASE_IMAGE_DATABASE_URL:-}" ]]; then
  echo 'RELEASE_IMAGE_DATABASE_URL targeting the disposable database is required'
  exit 1
fi
if [[ "\${RELEASE_IMAGE_DATABASE_URL}" != "\${expected_release_database_url}" ]]; then
  exit 1
fi
postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test 2>/dev/null || true)"
if [[ -z "\${postgres_container}" ]]; then
  exit 1
fi
postgres_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "\${postgres_container}" 2>/dev/null || true)"
if [[ "\${postgres_health}" != 'healthy' ]]; then
  exit 1
fi
docker build --file apps/api/Dockerfile .
"\${helm_bin}" template cvg-his-v2-prod infra/helm/cvg-his-v2
# cvg-his-v2-prod-cvg-his-v2-spa-config-nginx
# server cvg-his-v2-prod-cvg-his-v2-api:3001;
docker run --rm --network host \\
  --read-only \\
  --user 10000:10000 \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  "\${api_image}" node packages/db/dist/migrate.js
docker run --rm --network host \\
  --read-only \\
  --user 10000:10000 \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  "\${api_image}" node packages/db/dist/reconcile-runtime-roles.js
docker run --detach --name "\${api_container}" \\
  --network-alias cvg-his-v2-prod-cvg-his-v2-api \\
  --read-only \\
  --user 10000:10000 \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  "\${api_image}"
wait_for_http "http://127.0.0.1:\${api_port}/ready"
docker run --detach --name "\${worker_container}" \\
  --read-only \\
  --user 10000:10000 \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  "\${worker_image}"
wait_for_http "http://127.0.0.1:\${worker_port}/ready"
docker run --detach --name "\${spa_container}" \\
  --read-only \\
  --user 10000:10000 \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  "\${spa_image}"
docker run --detach --name "\${spa_container}" \\
  --network "\${validation_network}" \\
  --read-only \\
  --user 10000:10000 \\
  --cap-drop ALL \\
  --security-opt no-new-privileges \\
  --volume "\${spa_proxy_config_dir}/default.conf:/etc/nginx/conf.d/default.conf:ro" \\
  "\${spa_image}"
wait_for_http "http://127.0.0.1:\${spa_port}/api/live"
`);
  assert.deepEqual(inspectReleaseImageValidationPolicy(validGate), []);

  for (const mutation of [
    validGate.replace('--read-only', ''),
    validGate.replace('--user 10000:10000', ''),
    validGate.replace('--cap-drop ALL', ''),
    validGate.replace('--security-opt no-new-privileges', ''),
    validGate.replace('${worker_port}/ready', '${worker_port}/live'),
    validGate.replace('if [[ -z "\${RELEASE_IMAGE_DATABASE_URL:-}" ]]', 'if false'),
    `exit 0\n${validGate}`,
    `status=0; exit "$status"\n${validGate}`,
    `exec true\n${validGate}`,
    `if true; then\n  exit 0\nfi\n${validGate}`,
    `{\n  status=0\n  exit "$status"\n}\n${validGate}`,
    `while true; do\n  exec true\ndone\n${validGate}`,
    `bypass_gate() {\n  exit 0\n}\nbypass_gate\n${validGate}`,
    validGate.replace(
      'writable_payload="$(find /app -type f -perm /222 -print -quit)"',
      "writable_payload=''"
    ),
    validGate.replace('test -z "\${writable_payload}"', '# writable payload result ignored'),
    validGate.replace(
      'postgres://postgres:postgres@127.0.0.1:5433/\${release_database}',
      'postgres://remote.example:5432/\${release_database}'
    ),
    validGate.replace(
      'postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test 2>/dev/null || true)"',
      'postgres_container="unchecked"'
    ),
    validGate.replace(" != 'healthy'", " != 'unchecked'"),
    validGate.replace('${spa_port}/api/live', '${spa_port}/')
  ]) {
    assert.notDeepEqual(inspectReleaseImageValidationPolicy(mutation), []);
  }

  for (const mutation of [
    validGate.replace(
      'API "\${api_image}" "\${api_oci_digest}" "\${RELEASE_API_OCI_ARCHIVE}"',
      'API "\${api_image}" "\${api_oci_digest}" "\${RELEASE_WORKER_OCI_ARCHIVE}"'
    ),
    validGate.replace(
      '"\${observed_image_id}" != "\${expected_digest}" &&',
      '"\${observed_image_id}" == "\${expected_digest}" &&'
    ),
    validGate.replace(
      'api_oci_digest="\${RELEASE_API_OCI_DIGEST}"',
      'api_oci_digest="\${RELEASE_WORKER_OCI_DIGEST}"'
    ),
    validGate.replace(
      'else\n  verify_prebuilt_image_binding',
      'else\n  docker build --file apps/api/Dockerfile .\n  verify_prebuilt_image_binding'
    )
  ]) {
    assert.equal(
      inspectReleaseImageValidationPolicy(mutation).some((finding) => finding.includes('prebuilt')),
      true
    );
  }
});

test('release image gate rejects unreachable validation bodies', () => {
  const validGate = withReleaseImageModes(`
release_database='cvg_his_v2_release_image_test'
expected_release_database_url="postgres://postgres:postgres@127.0.0.1:5433/\${release_database}"
if [[ -z "\${RELEASE_IMAGE_DATABASE_URL:-}" ]]; then
  exit 1
fi
if [[ "\${RELEASE_IMAGE_DATABASE_URL}" != "\${expected_release_database_url}" ]]; then
  exit 1
fi
postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test 2>/dev/null || true)"
if [[ -z "\${postgres_container}" ]]; then
  exit 1
fi
postgres_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "\${postgres_container}" 2>/dev/null || true)"
if [[ "\${postgres_health}" != 'healthy' ]]; then
  exit 1
fi
docker build --file apps/api/Dockerfile .
"\${helm_bin}" template cvg-his-v2-prod infra/helm/cvg-his-v2
# cvg-his-v2-prod-cvg-his-v2-spa-config-nginx
# server cvg-his-v2-prod-cvg-his-v2-api:3001;
docker run --rm --network host --read-only --user 10000:10000 "\${api_image}" node packages/db/dist/migrate.js
docker run --rm --network host --read-only --user 10000:10000 "\${api_image}" node packages/db/dist/reconcile-runtime-roles.js
docker run --detach --name "\${api_container}" --network-alias cvg-his-v2-prod-cvg-his-v2-api --read-only --user 10000:10000 --tmpfs /srv/cvg-his-v2/storage:rw,noexec,nosuid,size=32m,uid=10000,gid=10000,mode=0750 "\${api_image}"
wait_for_http "http://127.0.0.1:\${api_port}/ready"
docker run --detach --name "\${worker_container}" --read-only --user 10000:10000 --tmpfs /srv/cvg-his-v2/storage:rw,noexec,nosuid,size=32m,uid=10000,gid=10000,mode=0750 "\${worker_image}"
wait_for_http "http://127.0.0.1:\${worker_port}/ready"
docker run --detach --name "\${spa_container}" --read-only --user 10000:10000 "\${spa_image}"
docker run --detach --name "\${spa_container}" --network "\${validation_network}" --read-only --user 10000:10000 --volume "\${spa_proxy_config_dir}/default.conf:/etc/nginx/conf.d/default.conf:ro" "\${spa_image}"
wait_for_http "http://127.0.0.1:\${spa_port}/api/live"
`);

  const mutations = [
    `if false; then\n${validGate}\nfi`,
    `false && {\n${validGate}\n}`,
    `validate_release_images() {\n${validGate}\n}`,
    `validate_release_images()\n{\n${validGate}\n}`,
    `while false; do\n${validGate}\ndone`
  ];

  for (const mutation of mutations) {
    assert.equal(
      inspectReleaseImageValidationPolicy(mutation).some((finding) =>
        /execute at top level|constant shell control flow/.test(finding)
      ),
      true
    );
  }
});

test('release image gate allows exit handling inside uncalled functions', () => {
  const validGate = withReleaseImageModes(`
cleanup_for_test()
{
  local status=0
  exit "$status"
}
release_database='cvg_his_v2_release_image_test'
expected_release_database_url="postgres://postgres:postgres@127.0.0.1:5433/\${release_database}"
if [[ -z "\${RELEASE_IMAGE_DATABASE_URL:-}" ]]; then
  exit 1
fi
if [[ "\${RELEASE_IMAGE_DATABASE_URL}" != "\${expected_release_database_url}" ]]; then
  exit 1
fi
postgres_container="$(docker compose -f docker-compose.test.yml ps -q postgres-test 2>/dev/null || true)"
if [[ -z "\${postgres_container}" ]]; then
  exit 1
fi
postgres_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "\${postgres_container}" 2>/dev/null || true)"
if [[ "\${postgres_health}" != 'healthy' ]]; then
  exit 1
fi
docker build --file apps/api/Dockerfile .
"\${helm_bin}" template cvg-his-v2-prod infra/helm/cvg-his-v2
# cvg-his-v2-prod-cvg-his-v2-spa-config-nginx
# server cvg-his-v2-prod-cvg-his-v2-api:3001;
docker run --rm --network host --read-only --user 10000:10000 --cap-drop ALL --security-opt no-new-privileges "\${api_image}" node packages/db/dist/migrate.js
docker run --rm --network host --read-only --user 10000:10000 --cap-drop ALL --security-opt no-new-privileges "\${api_image}" node packages/db/dist/reconcile-runtime-roles.js
docker run --detach --name "\${api_container}" --network-alias cvg-his-v2-prod-cvg-his-v2-api --read-only --user 10000:10000 --cap-drop ALL --security-opt no-new-privileges "\${api_image}"
wait_for_http "http://127.0.0.1:\${api_port}/ready"
docker run --detach --name "\${worker_container}" --read-only --user 10000:10000 --cap-drop ALL --security-opt no-new-privileges "\${worker_image}"
wait_for_http "http://127.0.0.1:\${worker_port}/ready"
docker run --detach --name "\${spa_container}" --read-only --user 10000:10000 --cap-drop ALL --security-opt no-new-privileges "\${spa_image}"
docker run --detach --name "\${spa_container}" --network "\${validation_network}" --read-only --user 10000:10000 --cap-drop ALL --security-opt no-new-privileges --volume "\${spa_proxy_config_dir}/default.conf:/etc/nginx/conf.d/default.conf:ro" "\${spa_image}"
wait_for_http "http://127.0.0.1:\${spa_port}/api/live"
`);

  assert.deepEqual(inspectReleaseImageValidationPolicy(validGate), []);
});

test('release image gate treats EXIT-trapped cleanup as reachable', () => {
  const source = readFileSync(join(process.cwd(), 'scripts/validate-release-images.sh'), 'utf8');
  assert.deepEqual(inspectReleaseImageValidationPolicy(source), []);

  for (const mutation of [
    source.replace('exit "${status}"', 'exit 0'),
    source.replace('local status=$?', 'local status=0'),
    source.replace('trap cleanup EXIT', "trap 'exit 0' EXIT"),
    source
      .replace(
        'cleanup() {',
        "release_gate_exit_zero() {\n  exit 0\n}\n\ncleanup() {"
      )
      .replace('trap cleanup EXIT', "trap 'release_gate_exit_zero' EXIT"),
    source
      .replace(
        'cleanup() {',
        'release_gate_status_zero() {\n  status=0\n}\n\ncleanup() {'
      )
      .replace('  exit "${status}"', '  release_gate_status_zero\n  exit "${status}"'),
    source.replace('  exit "${status}"', '  (( status = 0 ))\n  exit "${status}"')
  ]) {
    assert.equal(
      inspectReleaseImageValidationPolicy(mutation).some((finding) =>
        finding.includes('reachable successful exit can bypass release image validation')
      ),
      true
    );
  }
});

test('production runtime policy evaluates effective instructions instead of comments or earlier values', () => {
  const validDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
RUN pnpm --filter @cvg-his-v2/api deploy --prod /prod/api
FROM node:22.23.2-alpine3.24@${DIGEST} AS runner
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/lib/node_modules/pnpm /usr/local/bin/pnpm /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-v1.22.22
COPY --from=builder /prod/api ./
RUN chmod -R a-w /app
USER node
HEALTHCHECK CMD wget -qO- "http://127.0.0.1:\${PORT}/ready" >/dev/null || exit 1
CMD ["node", "dist/index.js"]
`;
  const options = {
    path: 'apps/api/Dockerfile',
    packageName: '@cvg-his-v2/api',
    deployDirectory: 'api',
    healthcheck: true
  };

  const commentOnlyDeploy = validDockerfile.replace(
    'RUN pnpm --filter @cvg-his-v2/api deploy --prod /prod/api',
    '# pnpm --filter @cvg-his-v2/api deploy --prod /prod/api'
  );
  assert.equal(
    inspectProductionRuntimeDockerfilePolicy(commentOnlyDeploy, options).some((finding) =>
      finding.includes('pnpm --prod deploy closure')
    ),
    true
  );

  const extraWorkspaceCopy = validDockerfile.replace(
    'COPY --from=builder /prod/api ./',
    'COPY --from=builder /prod/api ./\nCOPY --from=builder /app ./workspace'
  );
  assert.equal(
    inspectProductionRuntimeDockerfilePolicy(extraWorkspaceCopy, options).some((finding) =>
      finding.includes('copy only the production deploy closure')
    ),
    true
  );

  for (const extraTransfer of [
    'COPY . ./workspace',
    'COPY scripts ./scripts',
    'ADD scripts /app/scripts',
    'COPY --from=other /payload ./payload'
  ]) {
    const mutation = validDockerfile.replace(
      'COPY --from=builder /prod/api ./',
      `COPY --from=builder /prod/api ./\n${extraTransfer}`
    );
    assert.equal(
      inspectProductionRuntimeDockerfilePolicy(mutation, options).some((finding) =>
        finding.includes('copy only the production deploy closure')
      ),
      true
    );
  }

  for (const healthcheckMutation of [
    validDockerfile.replace('|| exit 1', '|| true'),
    validDockerfile.replace('|| exit 1', '|| exit 0'),
    validDockerfile.replace('|| exit 1', '|| exit 1; true')
  ]) {
    assert.equal(
      inspectProductionRuntimeDockerfilePolicy(healthcheckMutation, options).some((finding) =>
        finding.includes('healthcheck')
      ),
      true
    );
  }

  for (const writableMutation of [
    validDockerfile.replace(
      'RUN chmod -R a-w /app',
      'RUN chmod -R a-w /app\nRUN chmod -R u+w /app'
    ),
    validDockerfile.replace(
      'RUN chmod -R a-w /app',
      'RUN chmod -R a-w /app\nRUN chmod -R 0644 /app'
    ),
    validDockerfile.replace(
      'RUN chmod -R a-w /app',
      'RUN chmod -R a-w /app\nRUN touch /app/runtime-write-probe'
    )
  ]) {
    assert.equal(
      inspectProductionRuntimeDockerfilePolicy(writableMutation, options).some((finding) =>
        finding.includes('makes /app writable again')
      ),
      true
    );
  }

  for (const mutation of [`${validDockerfile}\nUSER root\n`, `${validDockerfile}\nCMD ["sh"]\n`]) {
    assert.notDeepEqual(inspectProductionRuntimeDockerfilePolicy(mutation, options), []);
  }
});

test('SPA runtime policy rejects mutable payloads and effective root execution', () => {
  const unsafeSpaDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
FROM nginx:1.30.5-alpine3.24@${DIGEST} AS runner
RUN sed -i 's!^pid .*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf && chown -R nginx:nginx /var/cache/nginx
COPY infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i -e 's!__API_RESOLVER__!resolver 127.0.0.11 valid=10s ipv6=off;!' -e 's!__API_UPSTREAM__!cvg-his-v2-api:3001 resolve!' /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/spa/dist .
RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d
RUN chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf
USER nginx
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3002/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
USER root
`;
  const findings = inspectSpaRuntimeDockerfilePolicy(unsafeSpaDockerfile);
  assert.equal(
    findings.some((finding) => finding.includes('root-owned')),
    true
  );
  assert.equal(
    findings.some((finding) => finding.includes('non-root nginx')),
    true
  );
});

test('SPA runtime policy rejects fail-open healthchecks', () => {
  const validDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
FROM nginx:1.30.5-alpine3.24@${DIGEST} AS runner
RUN sed -i 's!^pid .*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf && chown -R nginx:nginx /var/cache/nginx
COPY infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i -e 's!__API_RESOLVER__!resolver 127.0.0.11 valid=10s ipv6=off;!' -e 's!__API_UPSTREAM__!cvg-his-v2-api:3001 resolve!' /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/spa/dist .
RUN chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf
USER nginx
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3002/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
`;

  for (const mutation of [
    validDockerfile.replace('|| exit 1', '|| true'),
    validDockerfile.replace('|| exit 1', '|| exit 0'),
    validDockerfile.replace('|| exit 1', '|| exit 1; true')
  ]) {
    assert.equal(
      inspectSpaRuntimeDockerfilePolicy(mutation).some((finding) =>
        finding.includes('healthcheck must fail closed')
      ),
      true
    );
  }
});

test('SPA runtime policy rejects every non-canonical final-stage COPY or ADD', () => {
  const validDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
FROM nginx:1.30.5-alpine3.24@${DIGEST} AS runner
RUN sed -i 's!^pid .*;!pid /tmp/nginx.pid;!' /etc/nginx/nginx.conf && chown -R nginx:nginx /var/cache/nginx
COPY infra/helm/cvg-his-v2/files/spa-nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i -e 's!__API_RESOLVER__!resolver 127.0.0.11 valid=10s ipv6=off;!' -e 's!__API_UPSTREAM__!cvg-his-v2-api:3001 resolve!' /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/spa/dist .
RUN chmod -R a-w /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf
USER nginx
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3002/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
`;

  for (const extraTransfer of [
    'COPY . ./workspace',
    'COPY scripts ./scripts',
    'ADD scripts /usr/share/nginx/html/scripts',
    'COPY --from=other /payload ./payload'
  ]) {
    const mutation = validDockerfile.replace(
      'COPY --from=builder /app/apps/spa/dist .',
      `COPY --from=builder /app/apps/spa/dist .\n${extraTransfer}`
    );
    assert.equal(
      inspectSpaRuntimeDockerfilePolicy(mutation).some((finding) =>
        finding.includes('copy only the built static assets')
      ),
      true
    );
  }
});

test('repository runtime contract fails closed when a required Dockerfile is absent', () => {
  const directory = fixture();
  try {
    writeFileSync(join(directory, 'package.json'), '{"name":"cvg-his-v2"}\n');
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.filter((finding) => finding.includes('required production Dockerfile'))
        .length,
      3
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('production runtime policy rejects workspace copies and privileged bloated runners', () => {
  const unsafeDockerfile = `
FROM node:22-bookworm-slim@${DIGEST} AS builder
FROM node:22-bookworm-slim@${DIGEST} AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
CMD ["node", "apps/api/dist/index.js"]
`;
  const findings = inspectProductionRuntimeDockerfilePolicy(unsafeDockerfile, {
    path: 'apps/api/Dockerfile',
    packageName: '@cvg-his-v2/api',
    deployDirectory: 'api',
    healthcheck: true
  });
  assert.equal(
    findings.some((finding) => finding.includes('pnpm --prod deploy closure')),
    true
  );
  assert.equal(
    findings.some((finding) => finding.includes('immutable Alpine runner')),
    true
  );
  assert.equal(
    findings.some((finding) => finding.includes('copy only the production deploy closure')),
    true
  );
  assert.equal(
    findings.some((finding) => finding.includes('non-root node user')),
    true
  );
});

test('mutable workflow service images fail closed', () => {
  const directory = fixture();
  try {
    writeFileSync(
      join(directory, '.github/workflows/ci.yml'),
      'jobs:\n  test:\n    services:\n      postgres:\n        image: postgres:16\n'
    );
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.some((finding) => finding.includes('workflow image postgres:16')),
      true
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('mutable Helm static images fail closed while local Compose images remain explicit exceptions', () => {
  const directory = fixture();
  try {
    writeFileSync(
      join(directory, 'infra/helm/chart/templates/pod.yaml'),
      'apiVersion: v1\nspec:\n  containers:\n    - name: db\n      image: redis:7-alpine\n'
    );
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.some((finding) => finding.includes('Helm image redis:7-alpine')),
      true
    );
    assert.equal(
      result.findings.some((finding) => finding.includes('cvg-his-v2-local:dev')),
      false
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('mutable runtime script images fail closed', () => {
  const directory = fixture();
  try {
    writeFileSync(
      join(directory, 'infra/scripts/restore.sh'),
      'docker run --rm postgres:16-alpine pg_restore -l /backup/database.dump\n'
    );
    const result = inspectSupplyChain({ rootDirectory: directory });
    assert.equal(
      result.findings.some((finding) =>
        finding.includes('runtime script image postgres:16-alpine')
      ),
      true
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const SMOKE_SPECS = Object.freeze({
  api: Object.freeze({
    containerPort: 3001,
    path: '/health',
    environment: Object.freeze({
      NODE_ENV: 'test',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true',
    }),
    addHosts: Object.freeze([]),
  }),
  worker: Object.freeze({
    containerPort: 3002,
    path: '/live',
    environment: Object.freeze({
      NODE_ENV: 'test',
      WORKER_POLL_INTERVAL_MS: '60000',
    }),
    addHosts: Object.freeze([]),
  }),
  spa: Object.freeze({
    containerPort: 3002,
    path: '/health',
    environment: Object.freeze({}),
    addHosts: Object.freeze(['cvg-his-v2-api:127.0.0.1']),
  }),
});

function docker(args, options = {}) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function resolveSmokeSpec(kind) {
  const spec = SMOKE_SPECS[kind];
  if (!spec) throw new Error(`Unsupported image kind: ${kind}`);
  return {
    containerPort: spec.containerPort,
    path: spec.path,
    environment: { ...spec.environment },
    addHosts: [...spec.addHosts],
  };
}

export function buildContainerRunArgs(kind, image, containerName) {
  if (!image || /\s/.test(image)) throw new Error('Image reference must be a non-empty value without whitespace');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(containerName)) {
    throw new Error('Container name contains unsupported characters');
  }

  const spec = resolveSmokeSpec(kind);
  return [
    'run',
    '-d',
    '--name',
    containerName,
    '-p',
    `127.0.0.1::${spec.containerPort}`,
    ...spec.addHosts.flatMap((host) => ['--add-host', host]),
    ...Object.entries(spec.environment).flatMap(([name, value]) => ['-e', `${name}=${value}`]),
    image,
  ];
}

export async function smokeContainerImage({ kind, image, attempts = 40, intervalMs = 500 }) {
  const spec = resolveSmokeSpec(kind);
  const containerName = `cvg-smoke-${kind}-${randomUUID().slice(0, 12)}`;
  let started = false;

  try {
    docker(buildContainerRunArgs(kind, image, containerName));
    started = true;
    const mappedPort = docker(['port', containerName, String(spec.containerPort)]).split(':').at(-1);
    if (!mappedPort || !/^\d+$/.test(mappedPort)) {
      throw new Error(`Docker did not publish port ${spec.containerPort} for ${containerName}`);
    }

    let lastDetail = 'container did not answer';
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const running = docker(['inspect', containerName, '--format', '{{.State.Running}}']);
      if (running !== 'true') {
        const exitCode = docker(['inspect', containerName, '--format', '{{.State.ExitCode}}']);
        const logs = docker(['logs', containerName]);
        throw new Error(`${kind} container exited with code ${exitCode}\n${logs}`);
      }

      try {
        const response = await fetch(`http://127.0.0.1:${mappedPort}${spec.path}`);
        if (response.ok) {
          return {
            kind,
            image,
            statusCode: response.status,
            configuredUser: docker(['inspect', containerName, '--format', '{{.Config.User}}']),
          };
        }
        lastDetail = `HTTP ${response.status}`;
      } catch (error) {
        lastDetail = error instanceof Error ? error.message : String(error);
      }
      await wait(intervalMs);
    }

    throw new Error(`${kind} image failed its ${spec.path} smoke check: ${lastDetail}`);
  } finally {
    if (started) {
      try {
        docker(['rm', '-f', containerName]);
      } catch {
        // The exact ephemeral container may already have been removed by Docker.
      }
    }
  }
}

function parseCliArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith('--') || !value) throw new Error(`Invalid argument near ${flag ?? '<end>'}`);
    options[flag.slice(2)] = value;
  }
  if (!options.kind || !options.image) throw new Error('--kind and --image are required');
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseCliArguments(process.argv.slice(2));
  const result = await smokeContainerImage({ kind: options.kind, image: options.image });
  console.log(
    `Container smoke PASS: kind=${result.kind}, HTTP=${result.statusCode}, user=${result.configuredUser}`,
  );
}

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LOCK_HASH_PROPERTY = 'cvg:pnpm-lock.sha256';
export const GENERATOR_PROPERTY = 'cvg:sbom.generator';
export const GENERATOR_INTEGRITY_PROPERTY = 'cvg:sbom.generator.integrity';

function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

export function enrichCycloneDxBom(bom, lockContents, generatorEvidence) {
  const clone = structuredClone(bom);
  const existingProperties = (clone.metadata?.properties ?? []).filter(
    (property) =>
      ![LOCK_HASH_PROPERTY, GENERATOR_PROPERTY, GENERATOR_INTEGRITY_PROPERTY].includes(property.name),
  );

  clone.metadata = {
    ...(clone.metadata ?? {}),
    properties: [
      ...existingProperties,
      { name: LOCK_HASH_PROPERTY, value: sha256(lockContents) },
      { name: GENERATOR_PROPERTY, value: generatorEvidence.generator },
      { name: GENERATOR_INTEGRITY_PROPERTY, value: generatorEvidence.integrity },
    ],
  };
  return clone;
}

function isExactVersion(version) {
  return (
    typeof version === 'string' &&
    version.length > 0 &&
    !/[~^*<>=|\s]/.test(version) &&
    !version.startsWith('workspace:') &&
    !version.startsWith('link:')
  );
}

export function validateCycloneDxBom(bom, lockContents) {
  const errors = [];
  if (bom?.bomFormat !== 'CycloneDX') errors.push('bomFormat must be CycloneDX.');
  if (!['1.5', '1.6', '1.7'].includes(bom?.specVersion)) {
    errors.push('specVersion must be a supported CycloneDX JSON version.');
  }
  if (!String(bom?.serialNumber ?? '').startsWith('urn:uuid:')) {
    errors.push('serialNumber must be a CycloneDX urn:uuid value.');
  }
  if (!Number.isInteger(bom?.version) || bom.version < 1) errors.push('version must be a positive integer.');
  if (!bom?.metadata?.timestamp) errors.push('metadata.timestamp is required.');
  if (!Array.isArray(bom?.components) || bom.components.length === 0) {
    errors.push('components must contain the resolved dependency inventory.');
  }
  if (!Array.isArray(bom?.dependencies) || bom.dependencies.length === 0) {
    errors.push('dependencies must contain a transitive dependency graph.');
  }

  const properties = new Map(
    (bom?.metadata?.properties ?? []).map((property) => [property.name, property.value]),
  );
  if (properties.get(LOCK_HASH_PROPERTY) !== sha256(lockContents)) {
    errors.push('SBOM lockfile digest does not match pnpm-lock.yaml.');
  }
  if (!properties.get(GENERATOR_PROPERTY) || !properties.get(GENERATOR_INTEGRITY_PROPERTY)) {
    errors.push('SBOM generator version and registry integrity evidence are required.');
  }

  for (const component of bom?.components ?? []) {
    if (component.type !== 'library') continue;
    if (!isExactVersion(component.version)) {
      errors.push(`Library ${component.name ?? '<unknown>'} must use an exact version.`);
    }
    if (!String(component.purl ?? '').startsWith('pkg:')) {
      errors.push(`Library ${component.name ?? '<unknown>'} must include a package URL.`);
    }
    if (!component['bom-ref']) {
      errors.push(`Library ${component.name ?? '<unknown>'} must include a bom-ref.`);
    }
  }

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    specVersion: bom?.specVersion ?? null,
    components: bom?.components?.length ?? 0,
    dependencies: bom?.dependencies?.length ?? 0,
    lockSha256: sha256(lockContents),
    errors,
  };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    values.set(argv[index].slice(2), argv[index + 1]);
    index += 1;
  }
  return values;
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const input = resolve(args.get('input') ?? 'artifacts/security/sbom.cyclonedx.json');
  const lockfile = resolve(args.get('lockfile') ?? 'pnpm-lock.yaml');
  try {
    const result = validateCycloneDxBom(
      JSON.parse(readFileSync(input, 'utf8')),
      readFileSync(lockfile, 'utf8'),
    );
    console.log(JSON.stringify(result, null, 2));
    return result.status === 'PASS' ? 0 : 1;
  } catch (error) {
    console.error(`CycloneDX validation FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(runCli());
}

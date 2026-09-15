import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolveContainedPath } from './root-contained-path.mjs';
import { NATIVE_TEST_SHARDS, discoverNativeTestSources } from './native-test-inventory.mjs';
import { validateVitestInventory } from './vitest-test-inventory.mjs';

export const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function executionInputDigest(inputs) {
  const entries = (Array.isArray(inputs) ? inputs : []).filter((input) => typeof input === 'string');
  return sha256Bytes(entries.join('\n'));
}

export function validateExecutionInputs({ root, manifest }) {
  const errors = [];
  const inputs = manifest?.executionInputs;
  if (inputs === undefined) return errors;
  if (!Array.isArray(inputs) || inputs.length === 0) return ['executionInputs must be a non-empty list'];
  const seen = new Set();
  for (const input of inputs) {
    if (typeof input !== 'string' || input.length === 0) {
      errors.push('executionInputs entries must be non-empty strings');
      continue;
    }
    if (seen.has(input)) {
      errors.push(`${input}: duplicate execution input`);
      continue;
    }
    seen.add(input);
    const resolved = resolveContainedPath(root, input);
    if (!resolved.ok) {
      errors.push(`${input}: ${resolved.reason}`);
      continue;
    }
    if (!statSync(resolved.realpath).isFile()) errors.push(`${input}: execution input is not a regular file`);
  }
  return errors;
}

export function validateExecutionInputDigest(manifest) {
  const digest = manifest?.executionInputsSha256;
  if (digest === undefined) return [];
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) return ['executionInputsSha256 is malformed'];
  if (digest !== executionInputDigest(manifest.executionInputs ?? [])) {
    return ['executionInputsSha256 does not match the recorded execution inputs'];
  }
  return [];
}

function requiredNativeShards(manifest) {
  const required = Array.isArray(manifest?.requiredShards) ? manifest.requiredShards : [];
  return Object.keys(NATIVE_TEST_SHARDS).filter((shard) => required.includes(shard));
}

export function validateNativeInventories({ root, manifest }) {
  const errors = [];
  const requiredShards = requiredNativeShards(manifest);
  const nativeTests = manifest?.nativeTests;
  if (nativeTests === undefined) {
    if (requiredShards.length) {
      errors.push(`nativeTests is required when requiredShards includes: ${requiredShards.join(', ')}`);
    }
    return errors;
  }
  if (!nativeTests || typeof nativeTests !== 'object' || Array.isArray(nativeTests)) {
    return ['nativeTests must be an object'];
  }
  const seenAcrossShards = new Map();
  for (const [shard, app] of Object.entries(NATIVE_TEST_SHARDS)) {
    const prefix = `apps/${app}/src/`;
    const list = nativeTests[shard];
    const required = requiredShards.includes(shard);
    if (list === undefined) {
      if (required) errors.push(`nativeTests[${shard}] is required by requiredShards`);
      continue;
    }
    if (!Array.isArray(list) || list.length === 0) {
      errors.push(`nativeTests[${shard}] must be a non-empty list`);
      continue;
    }
    const seen = new Set();
    for (const path of list) {
      if (typeof path !== 'string' || !path.startsWith(prefix) || !path.endsWith('.test.ts')) {
        errors.push(`nativeTests[${shard}] entry does not belong to the shard: ${path}`);
        continue;
      }
      if (seen.has(path)) {
        errors.push(`${path}: duplicate native test in ${shard}`);
        continue;
      }
      seen.add(path);
      if (seenAcrossShards.has(path)) errors.push(`${path}: native test placed in multiple shards`);
      else seenAcrossShards.set(path, shard);
      const resolved = resolveContainedPath(root, path);
      if (!resolved.ok) {
        errors.push(`${path}: ${resolved.reason}`);
        continue;
      }
      if (!statSync(resolved.realpath).isFile()) errors.push(`${path}: native test is not a regular file`);
      if (!(manifest.executionInputs ?? []).includes(path)) {
        errors.push(`${path}: native test is missing from executionInputs`);
      }
    }
    let discovered;
    try {
      discovered = discoverNativeTestSources(root, app);
    } catch (error) {
      errors.push(`native discovery failed for ${shard}: ${error.message}`);
      continue;
    }
    const expected = [...list].sort();
    if (JSON.stringify(expected) !== JSON.stringify(discovered)) {
      const missing = discovered.filter((path) => !expected.includes(path));
      const stale = expected.filter((path) => !discovered.includes(path));
      errors.push(
        `nativeTests[${shard}] differs from discovered sources (missing=${missing.join(',') || 'none'}; stale=${stale.join(',') || 'none'})`
      );
    }
  }
  for (const shard of Object.keys(nativeTests)) {
    if (!(shard in NATIVE_TEST_SHARDS)) errors.push(`nativeTests contains an unsupported shard: ${shard}`);
  }
  return errors;
}

export function applyNativeInventoryChanges({ nativeTests, shard, added = [], removed = [] }) {
  const app = NATIVE_TEST_SHARDS[shard];
  if (!app) throw new Error(`unsupported native shard: ${shard}`);
  const prefix = `apps/${app}/src/`;
  const next = { ...(nativeTests ?? {}) };
  const list = [...(next[shard] ?? [])];
  for (const path of removed) {
    const index = list.indexOf(path);
    if (index === -1) throw new Error(`Cannot remove an unknown native test from ${shard}: ${path}`);
    list.splice(index, 1);
  }
  for (const path of added) {
    if (typeof path !== 'string' || !path.startsWith(prefix) || !path.endsWith('.test.ts')) {
      throw new Error(`native test does not belong to ${shard}: ${path}`);
    }
    if (list.includes(path)) throw new Error(`native test already present in ${shard}: ${path}`);
    for (const [otherShard, otherList] of Object.entries(next)) {
      if (otherShard !== shard && Array.isArray(otherList) && otherList.includes(path)) {
        throw new Error(`native test already present in ${otherShard}: ${path}`);
      }
    }
    list.push(path);
  }
  next[shard] = list.sort();
  return next;
}

export function applyExecutionInputChanges({ inputs, replaced = [], added = [], removed = [] }) {
  const next = [...(Array.isArray(inputs) ? inputs : [])];
  for (const change of replaced) {
    if (!change || typeof change.from !== 'string' || typeof change.to !== 'string' || !change.from || !change.to) {
      throw new Error('invalid execution input replacement');
    }
    const index = next.indexOf(change.from);
    if (index === -1) throw new Error(`Cannot replace an unknown execution input: ${change.from}`);
    if (change.from !== change.to && next.includes(change.to)) {
      throw new Error(`Execution input successor already present: ${change.to}`);
    }
    next[index] = change.to;
  }
  for (const path of removed) {
    const index = next.indexOf(path);
    if (index === -1) throw new Error(`Cannot remove an unknown execution input: ${path}`);
    next.splice(index, 1);
  }
  for (const path of added) {
    if (next.includes(path)) throw new Error(`Execution input already present: ${path}`);
    next.push(path);
  }
  return next;
}

/**
 * Canonical digest of the frozen source set. The digest intentionally covers
 * only the ordered `path:sha256` identities, never the manifest file itself, so
 * it never depends on a self-referential SHA.
 */
export function sourceSetDigest(files) {
  const entries = (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file.path === 'string' && typeof file.sha256 === 'string')
    .map((file) => `${file.path}:${file.sha256}`)
    .sort();
  return sha256Bytes(entries.join('\n'));
}

/**
 * Validate the current worktree against the frozen source identity.
 *
 * Separation of concerns:
 * - per-file `sha256` is the identity of each source version;
 * - `sourceSetSha256` is the verifiable digest of the whole recorded set;
 * - `manifestRevision` is a monotonic counter of identity refreshes;
 * - `head` is the collection commit (the git HEAD whose bytes were hashed),
 *   never the commit that contains this manifest.
 */
export function validateCriticalSourceIdentity({ root, manifest }) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') return ['manifest must be a JSON object'];
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    errors.push('manifest.files must be a non-empty list');
  }
  const files = Array.isArray(manifest.files) ? manifest.files : [];
  const seen = new Set();
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.sha256 !== 'string') {
      errors.push('manifest entry requires path and sha256');
      continue;
    }
    if (seen.has(file.path)) errors.push(`${file.path}: duplicate manifest path`);
    seen.add(file.path);
    if (!/^[a-f0-9]{64}$/.test(file.sha256)) {
      errors.push(`${file.path}: recorded sha256 is malformed`);
      continue;
    }
    const resolved = resolveContainedPath(root, file.path);
    if (!resolved.ok) {
      errors.push(`${file.path}: ${resolved.reason}`);
      continue;
    }
    if (sha256Bytes(readFileSync(resolved.realpath)) !== file.sha256) {
      errors.push(`${file.path}: hash mismatch`);
    }
  }
  if (!Number.isInteger(manifest.manifestRevision) || manifest.manifestRevision < 1) {
    errors.push('manifestRevision must be a positive integer');
  }
  if (manifest.sourceSetSha256 !== sourceSetDigest(files)) {
    errors.push('sourceSetSha256 does not match the recorded source identities');
  }
  if (typeof manifest.head !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.head)) {
    errors.push('head must be the 40-hex collection commit');
  }
  if (!Array.isArray(manifest.scopeHistory) || manifest.scopeHistory.length === 0) {
    errors.push('scopeHistory must preserve at least one refresh entry');
  }
  const lastHistory = Array.isArray(manifest.scopeHistory) ? manifest.scopeHistory.at(-1) : undefined;
  if (lastHistory && typeof lastHistory === 'object') {
    if (
      Number.isInteger(lastHistory.manifestRevision) &&
      lastHistory.manifestRevision !== manifest.manifestRevision
    ) {
      errors.push('scopeHistory revision does not match manifestRevision');
    }
    if (
      typeof lastHistory.executionInputsSha256 === 'string' &&
      lastHistory.executionInputsSha256 !== manifest.executionInputsSha256
    ) {
      errors.push('scopeHistory execution input digest does not match the recorded execution inputs');
    }
  }
  if (manifest.executionInputs !== undefined) {
    errors.push(...validateExecutionInputs({ root, manifest }));
    errors.push(...validateExecutionInputDigest(manifest));
  }
  errors.push(...validateVitestInventory({ root, manifest }));
  errors.push(...validateNativeInventories({ root, manifest }));
  return errors;
}

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  prepareObservedProcessScript,
  prepareFrozenProcessArtifact
} from './process-v8-conversion.mjs';
import { validateNativeSourceMap, convertNativeScript } from './native-v8-conversion.mjs';
import { assertSourceMetricPresence } from './source-metric-presence.mjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { TraceMap, decodedMappings, encodedMappings, traceSegment } = coverageRequire(
  '@jridgewell/trace-mapping'
);
import { splitSourceLines } from './source-lines.cjs';
const hash = (text) => createHash('sha256').update(text).digest('hex');
const canonical = (url) => pathToFileURL(fileURLToPath(url)).href;

// Remapping iterates duplicate columns rather than preserving trace-mapping's
// effective GLB selection. Collapse each group to that selection only AFTER
// strict validation of every original segment, including shadowed segments.
function effectiveMap(sourceMap, code) {
  const trace = new TraceMap(sourceMap);
  const lines = splitSourceLines(code);
  const mappings = decodedMappings(trace).map((segments, line) => {
    const result = [];
    for (let i = 0; i < segments.length; ) {
      const column = segments[i][0];
      result.push([...traceSegment(trace, line, column)]);
      do {
        i++;
      } while (i < segments.length && segments[i][0] === column);
      // Exact duplicate-column lookup selects the first segment, while GLB
      // between columns selects the last. Preserve BOTH, not just the point.
      if (
        column + 1 <= (lines[line]?.length ?? -1) &&
        (!segments[i] || segments[i][0] > column + 1)
      ) {
        const following = traceSegment(trace, line, column + 1);
        const exact = result[result.length - 1];
        if (JSON.stringify(following.slice(1)) !== JSON.stringify(exact.slice(1)))
          result.push([column + 1, ...following.slice(1)]);
      }
    }
    return result;
  });
  return { ...sourceMap, mappings: encodedMappings(new TraceMap({ ...sourceMap, mappings })) };
}

// Compose every effective parent segment explicitly. A failed child lookup is
// an unmapped boundary, not a segment to omit (omission inherits the preceding
// mapped source). Child maps already terminate in authenticated originals.
function composeFlatMap(sourceMap, children) {
  const sources = [],
    names = [],
    sourceIds = new Map(),
    nameIds = new Map();
  const childTraces = new Map([...children].map(([url, map]) => [url, new TraceMap(map)]));
  const index = (value, values, ids) => {
    if (!ids.has(value)) {
      ids.set(value, values.length);
      values.push(value);
    }
    return ids.get(value);
  };
  const mappings = decodedMappings(new TraceMap(sourceMap)).map((segments) =>
    segments.map((segment) => {
      const column = segment[0];
      if (segment.length === 1) return [column];
      let source = sourceMap.sources[segment[1]],
        line = segment[2],
        originalColumn = segment[3];
      let name = segment.length === 5 ? sourceMap.names[segment[4]] : undefined;
      if (childTraces.has(source)) {
        const child = childTraces.get(source);
        const traced = traceSegment(child, line, originalColumn);
        if (!traced || traced.length === 1) return [column];
        source = child.sources[traced[1]];
        line = traced[2];
        originalColumn = traced[3];
        if (traced.length === 5) name = child.names[traced[4]];
      }
      const result = [column, index(source, sources, sourceIds), line, originalColumn];
      if (name !== undefined) result.push(index(name, names, nameIds));
      return result;
    })
  );
  const result = { version: 3, names, sources, sourceRoot: '', mappings };
  return { ...result, mappings: encodedMappings(new TraceMap(result)) };
}

// Pure composition boundary. terminalHashes must come from the original-input
// manifest, not the generated artifact snapshot. All files/hashes are provided
// by the controller; no implicit disk reads or source-path guessing.
export function prepareProcessSourceMapChain(
  input,
  { terminalHashes, maxDepth = 32, maxStages = 1024, maxMapBytes = 64 * 1024 * 1024 } = {}
) {
  if (!terminalHashes || typeof terminalHashes !== 'object' || Array.isArray(terminalHashes))
    throw new Error('explicit terminal original hashes required');
  for (const limit of [maxDepth, maxStages, maxMapBytes]) {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('invalid map chain limit');
  }
  const root = prepareObservedProcessScript(input);
  const visiting = new Set(),
    memo = new Map(),
    terminalSources = {},
    stages = [];
  let mapBytes = 0;
  const terminal = (url) => {
    if (!Object.hasOwn(terminalHashes, url)) return false;
    const digest = terminalHashes[url];
    if (
      !/^[a-f0-9]{64}$/.test(digest) ||
      !Object.hasOwn(input.files ?? {}, url) ||
      typeof input.files[url] !== 'string' ||
      !Object.hasOwn(input.frozenHashes ?? {}, url) ||
      input.frozenHashes[url] !== digest ||
      hash(input.files[url]) !== digest
    )
      throw new Error('terminal original not bound to frozen inputs');
    terminalSources[url] = input.files[url];
    return true;
  };
  const compose = (url, prepared, depth) => {
    if (depth > maxDepth) throw new Error('map chain depth limit exceeded');
    const digest = hash(prepared.code),
      key = `${url}\n${digest}`;
    if (visiting.has(key)) throw new Error('cyclic source map chain');
    if (memo.has(key)) {
      const cached = memo.get(key);
      if (depth + cached.height > maxDepth) throw new Error('map chain depth limit exceeded');
      return cached;
    }
    if (stages.length >= maxStages) throw new Error('map chain stage limit exceeded');
    mapBytes += prepared.provenance.mapBytes;
    if (mapBytes > maxMapBytes) throw new Error('map chain byte limit exceeded');
    // Validate EVERY intermediate map, including segments that composition might
    // otherwise discard. No synthetic coverage is needed for this validation.
    validateNativeSourceMap(prepared);
    visiting.add(key);
    stages.push({ url, codeSha256: digest, ...prepared.provenance });
    const children = new Map();
    let height = 0;
    for (const source of prepared.sourceMap.sources) {
      if (terminal(source)) continue;
      const child = prepareFrozenProcessArtifact({
        url: source,
        files: input.files,
        frozenHashes: input.frozenHashes
      });
      const composed = compose(source, child, depth + 1);
      children.set(source, composed.map);
      height = Math.max(height, 1 + composed.height);
    }
    const result = composeFlatMap(effectiveMap(prepared.sourceMap, prepared.code), children);
    if (!result.sources.length || result.sources.some((source) => !terminal(source)))
      throw new Error('map chain did not reach terminal originals');
    validateNativeSourceMap({ code: prepared.code, sourceMap: result, sources: terminalSources });
    visiting.delete(key);
    const composed = { map: result, height };
    memo.set(key, composed);
    return composed;
  };
  const sourceMap = compose(canonical(input.observation.url), root, 0).map;
  return { code: root.code, coverage: root.coverage, sourceMap, sources: terminalSources, stages };
}

export async function convertProcessSourceMapChain(input, options) {
  const prepared = prepareProcessSourceMapChain(input, options);
  const result = await convertNativeScript(prepared);
  for (const entry of Object.values(result)) assertSourceMetricPresence(entry, prepared.sources);
  return result;
}

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { convertNativeScript } from './native-v8-conversion.mjs';
import { assertSourceMetricPresence } from './source-metric-presence.mjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { parse } = coverageRequire('acorn');
const { TraceMap } = coverageRequire('@jridgewell/trace-mapping');
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const MAX_MAP_BYTES = 16 * 1024 * 1024;

function fileUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('file:'))
    throw new Error('absolute file URL required');
  const parsed = new URL(value);
  if (parsed.search || parsed.hash)
    throw new Error('source artifact URL cannot have query or fragment');
  return pathToFileURL(fileURLToPath(parsed)).href;
}

function authenticate(url, files, frozenHashes) {
  const canonical = fileUrl(url);
  if (
    !Object.hasOwn(files ?? {}, canonical) ||
    typeof files[canonical] !== 'string' ||
    !Object.hasOwn(frozenHashes ?? {}, canonical) ||
    !/^[a-f0-9]{64}$/.test(frozenHashes[canonical]) ||
    sha256(files[canonical]) !== frozenHashes[canonical]
  )
    throw new Error(`unbound or changed source artifact: ${canonical}`);
  return files[canonical];
}

function normalizeMap(map, base) {
  if (
    !map ||
    map.version !== 3 ||
    map.sections !== undefined ||
    !Array.isArray(map.sources) ||
    !map.sources.length ||
    map.sources.some((source) => typeof source !== 'string') ||
    !Array.isArray(map.names) ||
    typeof map.mappings !== 'string' ||
    (map.sourceRoot !== undefined && typeof map.sourceRoot !== 'string')
  )
    throw new Error('explicit flat source map required');
  return {
    ...map,
    // Use the same URL-reference semantics as mapping consumption. Filesystem
    // joins would turn a%20b.ts into the distinct literal-percent filename.
    sources: new TraceMap(map, base).resolvedSources.map(fileUrl),
    sourceRoot: ''
  };
}

// Vite-node inserts a prefix on line zero, but its inline map describes the
// transformed module before that prefix. Shift only generated columns; retain
// raw code, V8 offsets and every count. Other VLQ fields stay byte-for-byte intact.
function shiftFirstLine(mappings, columns) {
  if (!mappings || mappings.startsWith(';')) return mappings;
  let value = 0n,
    shift = 0n,
    consumed = 0,
    terminated = false;
  for (const char of mappings) {
    const digit = alphabet.indexOf(char);
    if (digit < 0 || shift > 55n) throw new Error('invalid first source map column');
    value += BigInt(digit & 31) << shift;
    consumed++;
    if (!(digit & 32)) {
      terminated = true;
      break;
    }
    shift += 5n;
  }
  if (!terminated || value & 1n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('invalid first source map column');
  let encodedValue = ((value >> 1n) + BigInt(columns)) << 1n;
  if (encodedValue > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('unsafe shifted source map column');
  let encoded = '';
  do {
    let digit = Number(encodedValue & 31n);
    encodedValue >>= 5n;
    if (encodedValue) digit |= 32;
    encoded += alphabet[digit];
  } while (encodedValue);
  return `A,${encoded}${mappings.slice(consumed)}`;
}

function wrapperColumns(code, ast) {
  if (!code.startsWith("'use strict';async (__vite_ssr_import__,")) return 0;
  const fn = ast.body[1]?.expression;
  const inner = fn?.body?.body?.[0];
  if (
    ast.body.length !== 2 ||
    ast.body[0].directive !== 'use strict' ||
    fn?.type !== 'ArrowFunctionExpression' ||
    !fn.async ||
    fn.body.type !== 'BlockStatement' ||
    fn.body.body.length !== 1 ||
    inner?.type !== 'BlockStatement' ||
    !fn.params.every((p) => p.type === 'Identifier') ||
    !code.endsWith('\n}}')
  )
    throw new Error('unsupported Vitest wrapper');
  const prefix = code.slice(0, inner.start + 1);
  if (!/^'use strict';async \([A-Za-z0-9_$,]+\)=>\{\{$/.test(prefix))
    throw new Error('unsupported Vitest wrapper prefix');
  return prefix.length;
}

/**
 * Pure boundary. The controller supplies verified report identity, source bytes
 * and hashes frozen BEFORE execution. No disk/network lookup or shard promotion.
 * Runtime observation authenticity remains the controller's responsibility.
 * This is one map step: targets can themselves be generated JavaScript. The
 * controller must authenticate/compose the remaining chain before certification.
 */
export function prepareObservedProcessScript({
  observation,
  coverage,
  pid,
  threadId,
  files,
  frozenHashes,
  cachedMap
}) {
  if (
    !Number.isSafeInteger(pid) ||
    pid < 1 ||
    !Number.isSafeInteger(threadId) ||
    threadId < 0 ||
    observation?.schemaVersion !== 1 ||
    observation.kind !== 'executed-script-observation' ||
    observation.pid !== pid ||
    observation.threadId !== threadId ||
    typeof observation.code !== 'string' ||
    typeof observation.scriptId !== 'string' ||
    !/^[0-9]+$/.test(observation.scriptId) ||
    observation.scriptId !== coverage?.scriptId ||
    observation.url !== coverage?.url ||
    sha256(observation.code) !== observation.sha256
  )
    throw new Error('executed script identity/hash mismatch');
  return {
    ...prepareSourceMap({
      code: observation.code,
      url: observation.url,
      files,
      frozenHashes,
      cachedMap
    }),
    coverage
  };
}

// An intermediate artifact is frozen build output, not an inspector observation.
// Never synthesize a PID/scriptId or V8 range to prepare its map.
export function prepareFrozenProcessArtifact({ url, files, frozenHashes }) {
  const canonical = fileUrl(url);
  const code = authenticate(canonical, files, frozenHashes);
  return prepareSourceMap({ code, url: canonical, files, frozenHashes });
}

function prepareSourceMap({ code, url, files, frozenHashes, cachedMap }) {
  // Runtime URLs may identify a loader variant with a query/fragment. Preserve
  // that identity above; relative map paths still resolve against its file path.
  if (typeof url !== 'string' || !url.startsWith('file:'))
    throw new Error('absolute executed file URL required');
  const base = pathToFileURL(fileURLToPath(url)).href;
  const comments = [];
  const ast = parse(code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    onComment: comments
  });
  const directives = comments
    .map((comment) => /^\s*[#@]\s*sourceMappingURL=([\s\S]*)$/.exec(comment.value))
    .filter(Boolean);
  if (!directives.length || (directives.length > 1 && cachedMap === undefined))
    throw new Error('an unambiguous sourceMappingURL requires a runtime map for multiple comments');
  // Node's final directive is accepted only when the runtime cache independently
  // agrees below. Never fall back to an earlier map after a mismatch.
  // Count candidates before validating values: a malformed final directive
  // must never disappear and reactivate an earlier map.
  const finalValue = /^([^\s]+)\s*$/.exec(directives.at(-1)[1]);
  if (!finalValue) throw new Error('invalid final sourceMappingURL');
  const reference = finalValue[1];
  let mapText,
    rawMapBytes,
    mapBase = base,
    kind;
  if (reference.startsWith('data:')) {
    const match = /^data:application\/json(?:;charset=utf-8)?;base64,([A-Za-z0-9+/]*={0,2})$/i.exec(
      reference
    );
    if (!match || match[1].length > Math.ceil(MAX_MAP_BYTES / 3) * 4)
      throw new Error('invalid or oversized inline source map');
    const bytes = Buffer.from(match[1], 'base64');
    if (bytes.toString('base64') !== match[1]) throw new Error('non-canonical inline source map');
    mapText = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    rawMapBytes = bytes;
    kind = 'inline';
  } else {
    if (authenticate(base, files, frozenHashes) !== code)
      throw new Error('executed code differs from frozen generated artifact');
    // sourceMappingURL is a URL reference (TypeScript percent-encodes it),
    // unlike the source path strings inside the emitted map.
    mapBase = fileUrl(new URL(reference, base).href);
    mapText = authenticate(mapBase, files, frozenHashes);
    rawMapBytes = Buffer.from(mapText, 'utf8');
    kind = 'external';
  }
  if (rawMapBytes.length > MAX_MAP_BYTES) throw new Error('oversized source map');
  const normalized = normalizeMap(JSON.parse(mapText), mapBase);
  if (cachedMap !== undefined && !isDeepStrictEqual(normalized, cachedMap))
    throw new Error('cached source map differs from executed map');
  if (
    normalized.sourcesContent !== undefined &&
    (!Array.isArray(normalized.sourcesContent) ||
      normalized.sourcesContent.length !== normalized.sources.length)
  )
    throw new Error('invalid source map source contents');
  const sources = {};
  normalized.sources.forEach((url, index) => {
    if (Object.hasOwn(sources, url)) throw new Error('duplicate original source identity');
    const source = authenticate(url, files, frozenHashes);
    const embedded = normalized.sourcesContent?.[index];
    if (embedded !== undefined && embedded !== null && embedded !== source)
      throw new Error('embedded original source differs from frozen artifact');
    sources[url] = source;
  });
  const columns = wrapperColumns(code, ast);
  const sourceMap = columns
    ? { ...normalized, mappings: shiftFirstLine(normalized.mappings, columns) }
    : normalized;
  return {
    code,
    sourceMap,
    sources,
    provenance: {
      kind,
      directiveCount: directives.length,
      wrapperColumns: columns,
      mapBytes: rawMapBytes.length,
      mapSha256: sha256(rawMapBytes)
    }
  };
}

export async function convertObservedProcessScript(input) {
  const prepared = prepareObservedProcessScript(input);
  const converted = await convertNativeScript(prepared);
  for (const entry of Object.values(converted)) assertSourceMetricPresence(entry, prepared.sources);
  return converted;
}

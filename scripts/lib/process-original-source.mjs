import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { splitSourceLines } from './source-lines.cjs';
import { convertNativeScript } from './native-v8-conversion.mjs';
import { assertSourceMetricPresence } from './source-metric-presence.mjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { parse } = coverageRequire('acorn');
const { TraceMap, encodedMappings } = coverageRequire('@jridgewell/trace-mapping');
const hash = (code) => createHash('sha256').update(code).digest('hex');

// Pure, original-only route. The controller owns observation provenance and
// pre-execution freezing. An explicit terminal identity is mandatory; filename
// extensions, absent V8 cache entries and matching names prove nothing.
export function prepareObservedOriginalScript(input, { maxPoints = 1_000_000 } = {}) {
  const {
    observation,
    coverage,
    pid,
    threadId,
    originalUrl,
    files,
    frozenHashes,
    terminalHashes,
    cachedMap
  } = input;
  if (!Number.isSafeInteger(maxPoints) || maxPoints < 1 || maxPoints > 1_000_000)
    throw new Error('invalid identity map budget');
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
    hash(observation.code) !== observation.sha256
  )
    throw new Error('executed original identity/hash mismatch');
  if (typeof originalUrl !== 'string' || !originalUrl.startsWith('file:'))
    throw new Error('explicit terminal original URL required');
  const original = new URL(originalUrl);
  if (
    original.search ||
    original.hash ||
    pathToFileURL(fileURLToPath(original)).href !== originalUrl
  )
    throw new Error('canonical terminal original URL required');
  // Loader query identity remains on the observation; only the explicit
  // original association below uses the underlying canonical file URL.
  const runtime = new URL(observation.url);
  runtime.search = '';
  runtime.hash = '';
  if (pathToFileURL(fileURLToPath(runtime)).href !== originalUrl)
    throw new Error('runtime URL differs from explicit original');
  const digest = terminalHashes?.[originalUrl];
  if (
    !Object.hasOwn(terminalHashes ?? {}, originalUrl) ||
    typeof digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(digest) ||
    !Object.hasOwn(files ?? {}, originalUrl) ||
    typeof files[originalUrl] !== 'string' ||
    !Object.hasOwn(frozenHashes ?? {}, originalUrl) ||
    frozenHashes[originalUrl] !== digest ||
    hash(files[originalUrl]) !== digest ||
    files[originalUrl] !== observation.code
  )
    throw new Error('observed code is not identical to frozen terminal original');
  if (cachedMap !== undefined) throw new Error('cached map requires mapped route');
  // Count without allocating lines/AST first. Each ECMAScript line terminator
  // replaces one UTF16 unit in the point count, except CRLF which replaces two.
  let points = observation.code.length + 1;
  for (let i = 0; i < observation.code.length; i++) {
    if (observation.code.charCodeAt(i) === 13 && observation.code.charCodeAt(i + 1) === 10) {
      points--;
      i++;
    }
  }
  if (points > maxPoints) throw new Error('identity map point budget exceeded');
  const comments = [];
  parse(observation.code, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    onComment: comments
  });
  if (comments.some((comment) => /^\s*[#@]\s*sourceMappingURL=/.test(comment.value)))
    throw new Error('source map directive requires mapped route');
  const lines = splitSourceLines(observation.code);
  // Exact UTF16 identity at every column, including line ends. Never omit the
  // explicit map: the dependency's implicit lookup has filesystem fallbacks.
  const mappings = lines.map((line, lineIndex) =>
    Array.from({ length: line.length + 1 }, (_, column) => [column, 0, lineIndex, column])
  );
  const sourceMap = {
    version: 3,
    names: [],
    sources: [originalUrl],
    sourceRoot: '',
    mappings: encodedMappings(
      new TraceMap({ version: 3, names: [], sources: [originalUrl], mappings })
    )
  };
  return {
    code: observation.code,
    coverage,
    sourceMap,
    sources: { [originalUrl]: observation.code }
  };
}

export async function convertObservedOriginalScript(input, options) {
  const prepared = prepareObservedOriginalScript(input, options);
  const result = await convertNativeScript(prepared);
  for (const entry of Object.values(result)) assertSourceMetricPresence(entry, prepared.sources);
  return result;
}

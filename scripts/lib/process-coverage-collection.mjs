import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  convertProcessSourceMapChain,
  prepareProcessSourceMapChain
} from './process-source-map-chain.mjs';
import {
  convertObservedOriginalScript,
  prepareObservedOriginalScript
} from './process-original-source.mjs';
import { validateRawCoverageEntry } from './raw-coverage-validation.mjs';
import { validateNativeCoverage, soleFullSpanFunction } from './native-v8-conversion.mjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { parse } = coverageRequire('acorn');
const { createCoverageMap } = coverageRequire('istanbul-lib-coverage');
const { mergeFunctionCovs } = coverageRequire('@bcoe/v8-coverage');
const hash = (text) => createHash('sha256').update(text).digest('hex');
const numeric = (text) => Number.isSafeInteger(Number(text)) && Number(text) >= 0;

const validateIntervals = validateNativeCoverage;

function combineIntervals(previous, next, length, soleFunction) {
  validateIntervals(next, length, soleFunction);
  // V8 emits the script wrapper before a coextensive function. For a bare
  // anonymous arrow both names and spans can be identical. Authenticate this
  // exception against the observed AST, not arbitrary duplicated ranges.
  const identities = (items) =>
    items.map((fn, index) => {
      const span = `${fn.ranges[0].startOffset}:${fn.ranges[0].endOffset}`;
      if (!soleFunction || span !== `0:${length}`) return span;
      const wrapper =
        soleFunction.name !== ''
          ? fn.functionName === ''
          : items.some(
              (other, otherIndex) =>
                otherIndex > index &&
                other.ranges[0].startOffset === 0 &&
                other.ranges[0].endOffset === length
            );
      return `${span}:${wrapper ? 'script' : 'function'}`;
    });
  const previousKeys = identities(previous?.functions ?? []);
  const functions = new Map(
    (previous?.functions ?? []).map((fn, index) => [previousKeys[index], fn])
  );
  const nextKeys = identities(next.functions);
  for (const [index, fn] of next.functions.entries()) {
    const key = nextKeys[index];
    const old = functions.get(key);
    if (old && old.functionName !== fn.functionName)
      throw new Error('V8 function identity changed');
    // Unlike mergeScriptCovs, this never discards function-level counts when
    // another interval has block-level coverage. Inputs remain immutable.
    const normalized = mergeFunctionCovs([structuredClone(fn)]);
    const sameRoot = (actual, expected) =>
      actual.startOffset === expected.startOffset &&
      actual.endOffset === expected.endOffset &&
      actual.count === expected.count;
    if (!sameRoot(normalized.ranges[0], fn.ranges[0]))
      throw new Error('V8 normalization changed function root counter');
    const combined = old ? mergeFunctionCovs(structuredClone([old, normalized])) : normalized;
    const expected = { ...fn.ranges[0], count: fn.ranges[0].count + (old?.ranges[0].count ?? 0) };
    if (!sameRoot(combined.ranges[0], expected))
      throw new Error('V8 aggregation changed function root counter');
    functions.set(key, combined);
  }
  const result = {
    ...next,
    functions: [...functions.entries()]
      .sort(
        ([keyA, a], [keyB, b]) =>
          a.ranges[0].startOffset - b.ranges[0].startOffset ||
          b.ranges[0].endOffset - a.ranges[0].endOffset ||
          Number(keyB.endsWith(':script')) - Number(keyA.endsWith(':script'))
      )
      .map(([, fn]) => fn)
  };
  validateIntervals(result, length, soleFunction); // Includes sum overflow before Uint32 conversion.
  return result;
}

// Collection boundary only. Caller owns fresh pinned artifact directories,
// process lifecycle/test acceptance and pre/post snapshots. Never publish here.
export async function collectProcessCoverage(
  input,
  {
    maxBytes = 2 * 1024 * 1024 * 1024,
    maxRecords = 20_000,
    maxObservationBytes = 256 * 1024 * 1024,
    maxAggregateBytes = 256 * 1024 * 1024
  } = {}
) {
  const { root, files, frozenHashes, terminalHashes, reports, observations } = input;
  if (!isAbsolute(root) || resolve(root) !== root)
    throw new Error('canonical repository root required');
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    maxBytes > 2 * 1024 * 1024 * 1024 ||
    !Number.isSafeInteger(maxObservationBytes) ||
    maxObservationBytes < 1 ||
    maxObservationBytes > 256 * 1024 * 1024 ||
    !Number.isSafeInteger(maxAggregateBytes) ||
    maxAggregateBytes < 1 ||
    maxAggregateBytes > 256 * 1024 * 1024 ||
    !Number.isSafeInteger(maxRecords) ||
    maxRecords < 1 ||
    maxRecords > 20_000
  )
    throw new Error('invalid collection budget');
  const iterable = (value) =>
    value &&
    typeof value !== 'string' &&
    (typeof value[Symbol.iterator] === 'function' ||
      typeof value[Symbol.asyncIterator] === 'function');
  if (!iterable(reports) || !iterable(observations)) throw new Error('record iterables required');
  const eligible = (url) => {
    if (typeof url !== 'string') throw new Error('invalid report URL');
    if (!url.startsWith('file:')) return false;
    const parts = relative(root, fileURLToPath(url)).split(sep);
    return ['apps', 'packages'].includes(parts[0]) && !parts.includes('node_modules');
  };
  let bytes = 0,
    recordCount = 0,
    observationBytes = 0;
  const seen = new Set(),
    rawHashes = {},
    observed = new Map();
  const read = (record, pattern) => {
    if (++recordCount > maxRecords) throw new Error('collection record budget exceeded');
    if (!record || typeof record.name !== 'string' || typeof record.text !== 'string')
      throw new Error('invalid collection record');
    const match = pattern.exec(record.name);
    if (!match || !match.slice(1).every(numeric) || seen.has(record.name))
      throw new Error('invalid or duplicate collection filename');
    seen.add(record.name);
    const size = Buffer.byteLength(record.text);
    if (size > 64 * 1024 * 1024 || size > maxBytes - bytes)
      throw new Error('collection byte budget exceeded');
    bytes += size;
    rawHashes[record.name] = hash(record.text);
    return { match, value: JSON.parse(record.text) };
  };
  for await (const record of observations) {
    if (typeof record?.text !== 'string') throw new Error('invalid observation record');
    const size = Buffer.byteLength(record.text);
    if (size > maxObservationBytes - observationBytes)
      throw new Error('retained observation byte budget exceeded');
    observationBytes += size;
    const { match, value: o } = read(
      record,
      /^executed-script-([1-9][0-9]*)-(0|[1-9][0-9]*)-([0-9]+)\.json$/
    );
    if (
      !o ||
      o.schemaVersion !== 1 ||
      o.kind !== 'executed-script-observation' ||
      o.pid !== Number(match[1]) ||
      o.threadId !== Number(match[2]) ||
      o.scriptId !== match[3] ||
      typeof o.code !== 'string' ||
      o.sha256 !== hash(o.code) ||
      !eligible(o.url)
    )
      throw new Error('observation filename/identity/hash mismatch');
    observed.set(`${o.pid}:${o.threadId}:${o.scriptId}`, o);
  }
  const merged = createCoverageMap({});
  const snapshotIds = new Set(),
    matchedObservations = new Set();
  let convertedScripts = 0;
  const groups = new Map();
  let aggregateBytes = 0;
  // Reports are streamed after the bounded observation index is ready. The
  // real suite exceeds 1 GiB of reports; retain only the current report plus
  // a separately byte-bounded aggregate of eligible script ranges/maps.
  for await (const record of reports) {
    const { match, value: report } = read(
      record,
      /^coverage-([1-9][0-9]*)-([0-9]+)-(0|[1-9][0-9]*)\.json$/
    );
    const pid = Number(match[1]),
      threadId = Number(match[3]);
    if (!Array.isArray(report?.result)) throw new Error('invalid V8 report result');
    if (
      typeof report.timestamp !== 'number' ||
      !Number.isFinite(report.timestamp) ||
      report.timestamp < 0
    )
      throw new Error('invalid V8 snapshot timestamp');
    const snapshotId = `${pid}:${threadId}:${report.timestamp}`;
    if (snapshotIds.has(snapshotId)) throw new Error('duplicate V8 snapshot');
    snapshotIds.add(snapshotId);
    const cache = report['source-map-cache'];
    if (
      Object.hasOwn(report, 'source-map-cache') &&
      (!cache || typeof cache !== 'object' || Array.isArray(cache))
    )
      throw new Error('invalid V8 source-map cache');
    const scriptIds = new Set();
    for (const coverage of report.result) {
      if (
        typeof coverage?.scriptId !== 'string' ||
        !/^[0-9]+$/.test(coverage.scriptId) ||
        scriptIds.has(coverage.scriptId)
      )
        throw new Error('invalid or duplicate V8 script identity');
      scriptIds.add(coverage.scriptId);
      if (!eligible(coverage.url)) continue;
      const observation = observed.get(`${pid}:${threadId}:${coverage.scriptId}`);
      if (!observation || observation.url !== coverage.url)
        throw new Error('missing matching executed observation');
      matchedObservations.add(`${pid}:${threadId}:${coverage.scriptId}`);
      let cachedMap;
      if (cache && Object.hasOwn(cache, coverage.url)) {
        const entry = cache[coverage.url];
        if (
          !entry ||
          typeof entry !== 'object' ||
          Array.isArray(entry) ||
          !Object.hasOwn(entry, 'data')
        )
          throw new Error('invalid V8 source-map cache entry');
        cachedMap = entry.data;
      }
      let hasDirective = false;
      // Tokenization is not enough to distinguish regex/string/template text.
      // Acorn comments determine routing; conversion revalidates the contract.
      const ast = parse(observation.code, {
        ecmaVersion: 'latest',
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        onComment: (_block, text) => {
          if (/^\s*[#@]\s*sourceMappingURL=/.test(text)) hasDirective = true;
        }
      });
      const base = { pid, threadId, observation, coverage, files, frozenHashes, cachedMap };
      const key = `${pid}:${threadId}:${coverage.scriptId}`;
      const mapped = hasDirective || cachedMap !== undefined;
      const cacheId = hash(JSON.stringify(cachedMap) ?? 'absent');
      let group = groups.get(key);
      if (!group || !group.caches.has(cacheId)) {
        const prepared = mapped
          ? prepareProcessSourceMapChain(base, { terminalHashes })
          : prepareObservedOriginalScript({
              ...base,
              terminalHashes,
              originalUrl: pathToFileURL(fileURLToPath(coverage.url)).href
            });
        const mapHash = hash(JSON.stringify(prepared.sourceMap));
        if (group && group.mapHash !== mapHash) throw new Error('V8 interval source map changed');
        if (!group) {
          group = {
            base: { ...base, coverage: undefined },
            mapped,
            mapHash,
            caches: new Set(),
            coverage: undefined,
            size: 0
          };
          groups.set(key, group);
        }
        group.caches.add(cacheId);
      }
      const soleFunction = soleFullSpanFunction(ast, observation.code.length);
      group.coverage = combineIntervals(
        group.coverage,
        coverage,
        observation.code.length,
        soleFunction
      );
      const size =
        Buffer.byteLength(JSON.stringify(group.coverage)) +
        Buffer.byteLength(JSON.stringify(group.base.cachedMap) ?? '') +
        group.caches.size * 64;
      aggregateBytes += size - group.size;
      group.size = size;
      if (aggregateBytes > maxAggregateBytes)
        throw new Error('retained V8 aggregate byte budget exceeded');
      convertedScripts++;
    }
  }
  for (const { base: original, mapped, coverage } of groups.values()) {
    const base = { ...original, coverage };
    const converted = mapped
      ? await convertProcessSourceMapChain(base, { terminalHashes })
      : await convertObservedOriginalScript({
          ...base,
          terminalHashes,
          originalUrl: pathToFileURL(fileURLToPath(coverage.url)).href
        });
    merged.merge(converted);
  }
  if (matchedObservations.size !== observed.size) throw new Error('unmatched executed observation');
  if (!convertedScripts || !merged.files().length)
    throw new Error('empty process coverage collection');
  // Check again after merges, which can overflow otherwise valid raw counters.
  for (const path of merged.files()) {
    const url = pathToFileURL(path).href;
    if (
      !Object.hasOwn(terminalHashes ?? {}, url) ||
      !Object.hasOwn(files ?? {}, url) ||
      hash(files[url]) !== terminalHashes[url]
    )
      throw new Error('merged source is not a frozen terminal original');
    const errors = validateRawCoverageEntry(merged.fileCoverageFor(path).data, files[url]);
    if (errors.length) throw new Error(`invalid merged process coverage: ${errors.join('; ')}`);
  }
  return { coverage: merged.toJSON(), convertedScripts, rawHashes };
}

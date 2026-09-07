import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseAstAsync } from 'vitest/node';
import { validateRawCoverageEntry } from './raw-coverage-validation.mjs';
import { splitSourceLines } from './source-lines.cjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));
const { TraceMap, decodedMappings, encodedMappings, traceSegment } = coverageRequire(
  '@jridgewell/trace-mapping'
);
const { convert } = await import(coverageRequire.resolve('ast-v8-to-istanbul'));
const { mergeFunctionCovs } = coverageRequire('@bcoe/v8-coverage');
const { canonicalizeLineEnds } = require('./critical-coverage-json-reporter.cjs');

function strictMappings(encoded) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const state = [0n, 0n, 0n, 0n, 0n];
  return encoded.split(';').map((line) => {
    state[0] = 0n;
    if (!line) return [];
    return line.split(',').map((segment) => {
      const deltas = [];
      let value = 0n;
      let shift = 0n;
      for (const char of segment) {
        const digit = alphabet.indexOf(char);
        if (digit < 0) throw new Error('invalid source map VLQ character');
        value += BigInt(digit & 31) << shift;
        if (value > BigInt(Number.MAX_SAFE_INTEGER) || shift > 55n)
          throw new Error('unsafe source map VLQ integer');
        if (digit & 32) shift += 5n;
        else {
          deltas.push(value & 1n ? -(value >> 1n) : value >> 1n);
          value = 0n;
          shift = 0n;
        }
      }
      if (shift !== 0n || ![1, 4, 5].includes(deltas.length))
        throw new Error('invalid source map VLQ segment');
      return deltas.map((delta, index) => {
        state[index] += delta;
        if (state[index] < 0n || state[index] > BigInt(Number.MAX_SAFE_INTEGER))
          throw new Error('invalid source map coordinates');
        return Number(state[index]);
      });
    });
  });
}

// Pure conversion boundary: callers supply and authenticate executed code,
// cached source map and original source bytes. No implicit source-map lookup.
// Missing/unexecuted files remain the parent manifest checker's responsibility.
export function validateNativeSourceMap({ code, sourceMap, sources }) {
  if (typeof code !== 'string') throw new Error('invalid generated script');
  if (
    !sourceMap ||
    sourceMap.version !== 3 ||
    sourceMap.sections !== undefined ||
    sourceMap.sourceRoot ||
    !Array.isArray(sourceMap.sources) ||
    !sourceMap.sources.length ||
    typeof sourceMap.mappings !== 'string'
  )
    throw new Error('explicit flat source map required');
  const originals = new Map();
  const sourceContents = sourceMap.sources.map((url) => {
    if (typeof url !== 'string' || !url.startsWith('file:'))
      throw new Error('source identity must be an absolute file URL');
    const path = fileURLToPath(url);
    if (originals.has(path)) throw new Error('duplicate original source identity');
    if (!Object.hasOwn(sources ?? {}, url) || typeof sources[url] !== 'string')
      throw new Error('missing authenticated original source');
    originals.set(path, sources[url]);
    return sources[url];
  });
  if (!Array.isArray(sourceMap.names) || sourceMap.names.some((name) => typeof name !== 'string'))
    throw new Error('invalid source map names');
  const generatedLines = splitSourceLines(code);
  const originalLines = sourceContents.map(splitSourceLines);
  const mappings = strictMappings(sourceMap.mappings);
  if (JSON.stringify(mappings) !== JSON.stringify(decodedMappings(new TraceMap(sourceMap))))
    throw new Error('lossy source map VLQ decoding');
  for (const [line, segments] of mappings.entries()) {
    let previousColumn = -1;
    for (const segment of segments) {
      if (
        ![1, 4, 5].includes(segment.length) ||
        segment.some((value) => !Number.isSafeInteger(value) || value < 0)
      )
        throw new Error('invalid source map coordinates');
      if (
        line >= generatedLines.length ||
        segment[0] < previousColumn ||
        segment[0] > generatedLines[line].length
      )
        throw new Error('invalid generated source map coordinates');
      previousColumn = segment[0];
      if (segment.length > 1) {
        const lines = originalLines[segment[1]];
        if (!lines || segment[2] >= lines.length || segment[3] > lines[segment[2]].length)
          throw new Error('invalid original source map coordinates');
      }
      if (segment.length === 5 && segment[4] >= sourceMap.names.length)
        throw new Error('invalid source map name index');
    }
  }
  return { originals, sourceContents };
}

// ast-v8-to-istanbul 0.3.12 locates raw offsets using LF-only line breaks.
// Translate only generated map coordinates into that locator's coordinate
// system. The authenticated map is validated above in ECMAScript coordinates;
// code, original positions, V8 offsets and counters remain byte-for-byte intact.
function converterCoordinateMap(code, sourceMap) {
  const ecmaStarts = [0],
    lfStarts = [0];
  for (const match of code.matchAll(/\r\n|[\n\r\u2028\u2029]/g))
    ecmaStarts.push(match.index + match[0].length);
  for (const match of code.matchAll(/\n/g)) lfStarts.push(match.index + 1);
  const translated = lfStarts.map(() => []);
  const trace = new TraceMap(sourceMap);
  const mappings = decodedMappings(trace);
  const lines = splitSourceLines(code);
  let addedUnmapped = 0;
  let lfLine = 0;
  for (const [line, start] of ecmaStarts.entries()) {
    const segments = mappings[line] ?? [];
    while (lfLine + 1 < lfStarts.length && lfStarts[lfLine + 1] <= start) lfLine++;
    const offset = start - lfStarts[lfLine];
    // GLB is the authenticated map's meaning. The dependency retries misses
    // with LUB even for LF input, so protect ALL gaps (prefix/middle/tail),
    // not just boundaries introduced by merging non-LF logical lines.
    const unmapped = (from, to) => {
      const needed = Math.max(0, to - from + 1);
      if (needed > 1_000_000 - addedUnmapped)
        throw new Error('converter unmapped coordinate budget exceeded');
      addedUnmapped += needed;
      for (let column = from; column <= to; column++) translated[lfLine].push([offset + column]);
    };
    unmapped(0, segments.length ? segments[0][0] - 1 : lines[line].length);
    for (let i = 0; i < segments.length; ) {
      const column = segments[i][0];
      const exact = traceSegment(trace, line, column);
      translated[lfLine].push([offset + column, ...exact.slice(1)]);
      do {
        i++;
      } while (i < segments.length && segments[i][0] === column);
      // At a duplicate column GLB chooses the first segment, but at the next
      // column it chooses the last duplicate. Query the interval itself.
      const effective = traceSegment(trace, line, column + 1);
      const intervalEnd = i < segments.length ? segments[i][0] - 1 : lines[line].length;
      if (!effective || effective.length === 1) unmapped(column + 1, intervalEnd);
      else if (
        column + 1 <= intervalEnd &&
        JSON.stringify(effective.slice(1)) !== JSON.stringify(exact.slice(1))
      )
        translated[lfLine].push([offset + column + 1, ...effective.slice(1)]);
    }
  }
  return {
    ...sourceMap,
    mappings: encodedMappings(new TraceMap({ ...sourceMap, mappings: translated }))
  };
}

// Validate before normalization: otherwise malformed intervals could disappear
// in a merge. Continuations may legitimately have more hits than their parent.
export function validateNativeCoverage(coverage, length, soleFunction) {
  if (!Array.isArray(coverage.functions) || !coverage.functions.length)
    throw new Error('missing V8 function ranges');
  const roots = new Map();
  for (const fn of coverage.functions) {
    if (
      typeof fn.functionName !== 'string' ||
      typeof fn.isBlockCoverage !== 'boolean' ||
      !Array.isArray(fn.ranges) ||
      !fn.ranges.length ||
      (!fn.isBlockCoverage && fn.ranges.length !== 1)
    )
      throw new Error('invalid V8 function');
    const stack = [];
    let previousStart = -1;
    for (const range of fn.ranges) {
      const { startOffset: start, endOffset: end, count } = range;
      if (
        ![start, end, count].every(Number.isSafeInteger) ||
        start < 0 ||
        end <= start ||
        end > length ||
        count < 0 ||
        count > 0xffffffff
      )
        throw new Error('invalid V8 counter or offset');
      if (start < previousStart) throw new Error('unordered V8 ranges');
      previousStart = start;
      while (stack.length && start >= stack.at(-1).endOffset) stack.pop();
      if (
        range !== fn.ranges[0] &&
        (!stack.length ||
          end > stack.at(-1).endOffset ||
          (start === stack.at(-1).startOffset && end === stack.at(-1).endOffset))
      )
        throw new Error('invalid V8 range tree');
      stack.push(range);
      if (stack.length > 256) throw new Error('V8 range depth budget exceeded');
    }
    const root = fn.ranges[0];
    const normalizedRoot = mergeFunctionCovs([structuredClone(fn)]).ranges[0];
    if (
      normalizedRoot.startOffset !== root.startOffset ||
      normalizedRoot.endOffset !== root.endOffset ||
      normalizedRoot.count !== root.count
    )
      throw new Error('V8 normalization changed function root counter');
    const key = `${fn.ranges[0].startOffset}:${fn.ranges[0].endOffset}`;
    const peers = roots.get(key) ?? [];
    peers.push(fn);
    roots.set(key, peers);
    if (
      peers.length > 1 &&
      !(
        soleFunction &&
        fn.ranges[0].startOffset === 0 &&
        fn.ranges[0].endOffset === length &&
        peers.length === 2 &&
        peers[0].functionName === '' &&
        peers[1].functionName === soleFunction.name
      )
    )
      throw new Error('duplicate V8 function range');
  }
  const functionStack = [];
  const functionRoots = coverage.functions
    .map((fn) => fn.ranges[0])
    .sort((a, b) => a.startOffset - b.startOffset || b.endOffset - a.endOffset);
  for (const range of functionRoots) {
    while (functionStack.length && range.startOffset >= functionStack.at(-1).endOffset)
      functionStack.pop();
    if (functionStack.length && range.endOffset > functionStack.at(-1).endOffset)
      throw new Error('invalid V8 crossing function roots');
    functionStack.push(range);
  }
  let relationships = 0;
  for (const fn of coverage.functions) {
    const owner = fn.ranges[0];
    const peers = roots.get(`${owner.startOffset}:${owner.endOffset}`);
    const coextensiveWrapper = peers.length === 2 && peers[0] === fn;
    for (const block of fn.ranges.slice(1))
      for (const child of functionRoots) {
        if (++relationships > 5_000_000)
          throw new Error('V8 function relationship budget exceeded');
        if (
          child === owner ||
          (!coextensiveWrapper &&
            child.startOffset === owner.startOffset &&
            child.endOffset === owner.endOffset) ||
          child.startOffset < owner.startOffset ||
          child.endOffset > owner.endOffset
        )
          continue;
        if (
          block.startOffset < child.endOffset &&
          child.startOffset < block.endOffset &&
          !(block.startOffset <= child.startOffset && block.endOffset >= child.endOffset)
        )
          throw new Error('V8 parent block invades nested function root');
      }
  }
}

export function soleFullSpanFunction(ast, length) {
  const only = ast.body.length === 1 ? ast.body[0] : undefined;
  const candidate = only?.type === 'ExpressionStatement' ? only.expression : only;
  return candidate &&
    ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(
      candidate.type
    ) &&
    candidate.start === 0 &&
    candidate.end === length
    ? { name: candidate.id?.name ?? '' }
    : undefined;
}

export async function convertNativeScript({ coverage, code, sourceMap, sources }) {
  if (!coverage?.url?.startsWith('file:')) throw new Error('invalid generated script');
  const { originals, sourceContents } = validateNativeSourceMap({ code, sourceMap, sources });
  const ast = await parseAstAsync(code);
  validateNativeCoverage(coverage, code.length, soleFullSpanFunction(ast, code.length));
  // V8 endOffset is exclusive; this converter version uses inclusive fills.
  // Adapt coordinates on a copy, preserving raw evidence and exact hit counts.
  const inclusiveCoverage = {
    ...coverage,
    functions: coverage.functions.map((fn) => ({
      ...fn,
      ranges: fn.ranges.map((range) => {
        if (range.endOffset === range.startOffset)
          throw new Error('empty V8 range cannot be converted');
        return { ...range, endOffset: range.endOffset - 1 };
      })
    }))
  };
  // 0.3.12's property/method handlers query the prefix instead of its function
  // expression. Adjust only the private AST lookup offset; retain the key's
  // declaration coordinates, body, source bytes, maps and raw counters.
  const pending = [ast];
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    // ClassBody's initializer statement lookup uses the value's function
    // execution count. Route the private field node through the declarator
    // handler: retain the value's mapped statement location, but look up its
    // evaluation count at the field prefix, separately from calls of the value.
    // Traversal still visits the original value exactly once.
    if (node.type === 'PropertyDefinition' && node.value) {
      node.type = 'VariableDeclarator';
      node.init = node.value;
      delete node.value;
    }
    if (
      ((node.type === 'Property' && node.kind === 'init' && !node.method) ||
        (node.type === 'MethodDefinition' && node.static)) &&
      node.value?.type === 'FunctionExpression'
    )
      node.start = node.value.start;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) for (const child of value) pending.push(child);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  const result = await convert({
    code,
    coverage: inclusiveCoverage,
    sourceMap: { ...converterCoordinateMap(code, sourceMap), sourcesContent: sourceContents },
    ast
  });
  const normalized = {};
  for (const [path, data] of Object.entries(result)) {
    if (!originals.has(path)) throw new Error('unexpected converted source identity');
    const entry = canonicalizeLineEnds(data, originals.get(path));
    const errors = validateRawCoverageEntry(entry, originals.get(path));
    if (errors.length) throw new Error(`invalid converted coverage: ${errors.join('; ')}`);
    normalized[path] = entry;
  }
  if (!Object.keys(normalized).length) throw new Error('empty converted coverage');
  return normalized;
}

export const CRITICAL_COVERAGE_UNSAFE_GLOB_CHARS = [
  ',',
  '{',
  '}',
  '[',
  ']',
  '(',
  ')',
  '!',
  '?',
  '*',
  '@',
  '+',
  '|'
];

export function assertCriticalCoveragePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('critical coverage include requires at least one source path');
  }
  const seen = new Set();
  for (const path of paths) {
    if (typeof path !== 'string' || path.length === 0) {
      throw new Error('critical coverage include paths must be non-empty strings');
    }
    if (seen.has(path)) {
      throw new Error(`duplicate critical coverage include path: ${path}`);
    }
    seen.add(path);
    for (const char of CRITICAL_COVERAGE_UNSAFE_GLOB_CHARS) {
      if (path.includes(char)) {
        throw new Error(`critical coverage include path contains unsupported glob character "${char}": ${path}`);
      }
    }
  }
}

export function buildCriticalCoverageInclude(paths) {
  assertCriticalCoveragePaths(paths);
  return paths.length === 1 ? paths[0] : `{${paths.join(',')}}`;
}

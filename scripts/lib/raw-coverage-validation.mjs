import { splitSourceLines } from './source-lines.cjs';

export function validateRawCoverageEntry(entry, source) {
  const errors = [];
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = (value) => Number.isSafeInteger(value) && value >= 0;

  if (typeof source !== 'string') return ['invalid source text'];
  const lines = splitSourceLines(source);
  const point = (value) => object(value)
    && Number.isSafeInteger(value.line)
    && value.line >= 1
    && value.line <= lines.length
    && integer(value.column)
    && value.column <= lines[value.line - 1].length;
  const location = (value) => object(value)
    && point(value.start)
    && point(value.end)
    && (value.start.line < value.end.line
      || (value.start.line === value.end.line && value.start.column <= value.end.column));
  const optionalLine = (value) => value === undefined
    || (Number.isSafeInteger(value) && value >= 1 && value <= lines.length);

  if (!object(entry) || typeof entry.path !== 'string') return ['invalid file coverage schema'];
  for (const [map, counters] of [['statementMap', 's'], ['fnMap', 'f'], ['branchMap', 'b']]) {
    if (!object(entry[map]) || !object(entry[counters])) {
      errors.push(`invalid metric schema: ${map}/${counters}`);
      continue;
    }
    const mapKeys = Object.keys(entry[map]).sort();
    const counterKeys = Object.keys(entry[counters]).sort();
    if (JSON.stringify(mapKeys) !== JSON.stringify(counterKeys)) errors.push(`map/counter key mismatch: ${map}/${counters}`);
    if ([...mapKeys, ...counterKeys].some((key) => !/^(0|[1-9][0-9]*)$/.test(key))) errors.push(`invalid metric keys: ${map}/${counters}`);
    for (const [key, value] of Object.entries(entry[counters])) {
      if (counters === 'b' ? !Array.isArray(value) || !value.every(integer) : !integer(value)) errors.push(`invalid hit count: ${counters}:${key}`);
    }
    for (const [key, value] of Object.entries(entry[map])) {
      if (map === 'statementMap' && !location(value)) errors.push(`invalid source location: ${map}:${key}`);
      if (map === 'fnMap' && (!object(value) || typeof value.name !== 'string' || !location(value.decl) || !location(value.loc) || !optionalLine(value.line))) errors.push(`invalid function schema/location: ${key}`);
      if (map === 'branchMap') {
        if (!object(value) || typeof value.type !== 'string' || !value.type || !location(value.loc) || !optionalLine(value.line) || !Array.isArray(value.locations) || !value.locations.length || !value.locations.every(location)) errors.push(`invalid branch schema/location: ${key}`);
        if (!Array.isArray(entry.b[key]) || !Array.isArray(value?.locations) || entry.b[key].length !== value.locations.length) errors.push(`branch counter/location length mismatch: ${key}`);
      }
    }
  }
  return errors;
}

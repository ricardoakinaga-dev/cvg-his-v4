export type DiffChangeKind = 'added' | 'removed' | 'changed';

export type JsonDiffChange = {
  path: string;
  before: unknown;
  after: unknown;
  kind: DiffChangeKind;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

function joinPath(base: string, key: string | number): string {
  if (typeof key === 'number') {
    return `${base}[${key}]`;
  }

  if (!base) {
    return key;
  }

  return `${base}.${key}`;
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => deepEqual(value, right[index]));
  }

  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    return leftKeys.every((key) => deepEqual(left[key], right[key]));
  }

  return false;
}

function walkDiff(before: unknown, after: unknown, path: string, acc: JsonDiffChange[]): void {
  if (before === undefined && after === undefined) {
    return;
  }

  if (deepEqual(before, after)) {
    return;
  }

  if (before === undefined) {
    acc.push({ path, before: undefined, after, kind: 'added' });
    return;
  }

  if (after === undefined) {
    acc.push({ path, before, after: undefined, kind: 'removed' });
    return;
  }

  if (isPrimitive(before) || isPrimitive(after)) {
    acc.push({ path, before, after, kind: 'changed' });
    return;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) {
      acc.push({ path, before, after, kind: 'changed' });
      return;
    }

    const maxLength = Math.max(before.length, after.length);
    for (let index = 0; index < maxLength; index += 1) {
      walkDiff(before[index], after[index], joinPath(path, index), acc);
    }
    return;
  }

  if (isObject(before) && isObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      walkDiff(before[key], after[key], joinPath(path, key), acc);
    }
    return;
  }

  acc.push({ path, before, after, kind: 'changed' });
}

export function buildJsonDiff(before: unknown, after: unknown): JsonDiffChange[] {
  const changes: JsonDiffChange[] = [];
  walkDiff(before, after, '', changes);

  return changes
    .map((change) => ({
      ...change,
      path: change.path || '$'
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

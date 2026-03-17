export type JsonObject = Record<string, unknown>;

export type DiffResult = {
  added: string[];
  removed: string[];
  changed: string[];
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

export function diffJson(before: JsonObject | null, after: JsonObject | null): DiffResult {
  const beforeValue = before ?? {};
  const afterValue = after ?? {};

  const beforeKeys = new Set(Object.keys(beforeValue));
  const afterKeys = new Set(Object.keys(afterValue));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const key of afterKeys) {
    if (!beforeKeys.has(key)) {
      added.push(key);
      continue;
    }

    if (!deepEqual(beforeValue[key], afterValue[key])) {
      changed.push(key);
    }
  }

  for (const key of beforeKeys) {
    if (!afterKeys.has(key)) {
      removed.push(key);
    }
  }

  return {
    added,
    removed,
    changed
  };
}

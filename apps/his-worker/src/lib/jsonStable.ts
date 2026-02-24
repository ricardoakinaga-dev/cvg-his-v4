function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableSerialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item ?? null)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    const items: string[] = [];

    for (const key of keys) {
      const item = value[key];
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        continue;
      }

      items.push(`${JSON.stringify(key)}:${stableSerialize(item)}`);
    }

    return `{${items.join(',')}}`;
  }

  return 'null';
}

export function stableStringify(value: unknown): string {
  return stableSerialize(value);
}

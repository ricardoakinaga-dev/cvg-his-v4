import {
  afterAll,
  beforeAll,
  describe,
  it,
  test as vitestTest,
} from 'vitest';

interface CompatibleMockCall {
  readonly arguments: readonly unknown[];
}

interface CompatibleMockContext {
  readonly calls: CompatibleMockCall[];
  callCount(): number;
}

type CompatibleMockFunction = ((...args: unknown[]) => unknown) & {
  readonly mock: CompatibleMockContext;
};

function createCompatibleMock(
  implementation: ((...args: unknown[]) => unknown) | undefined,
): CompatibleMockFunction {
  const calls: CompatibleMockCall[] = [];
  const fn = (...args: unknown[]): unknown => {
    calls.push(Object.freeze({ arguments: Object.freeze([...args]) }));
    return implementation?.(...args);
  };

  return Object.assign(fn, {
    mock: Object.freeze({
      calls,
      callCount: () => calls.length,
    }),
  });
}

const test = Object.assign(vitestTest, {
  mock: Object.freeze({ fn: createCompatibleMock }),
});

const before = beforeAll;
const after = afterAll;

export { after, before, describe, it, test };
export default test;

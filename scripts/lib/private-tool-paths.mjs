import { accessSync, constants, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';

// Executables may be multicall aliases (e.g. redis-server -> redis-check-rdb).
// Resolve the parent, not the final invocation name: argv0 selects behavior.
export function resolvePrivateToolPaths(tools) {
  const directoryKeys = ['postgresBin', 'postgresShare', 'postgresLib', 'redisLib'];
  const executableKeys = ['redisServer', 'redisCli'];
  const required = ['postgresBin', 'postgresShare', ...executableKeys];
  for (const key of required)
    if (typeof tools?.[key] !== 'string' || !tools[key])
      throw new Error(`explicit private tool required: ${key}`);
  const result = {};
  for (const key of [...directoryKeys, ...executableKeys]) {
    const value = tools[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !isAbsolute(value))
      throw new Error(`absolute private tool path required: ${key}`);
    if (directoryKeys.includes(key)) {
      const resolved = realpathSync(value);
      if (!statSync(resolved).isDirectory())
        throw new Error(`private tool directory required: ${key}`);
      result[key] = resolved;
    } else {
      const invocation = join(realpathSync(dirname(value)), basename(value));
      if (!statSync(invocation).isFile()) throw new Error(`private executable required: ${key}`);
      accessSync(invocation, constants.X_OK);
      result[key] = invocation;
    }
  }
  return result;
}

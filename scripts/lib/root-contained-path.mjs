import { realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';

const isChildPath = (path) => path && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);

export function resolveContainedPath(root, candidate, { allowRoot = false } = {}) {
  if (typeof candidate !== 'string' || !candidate) return { ok: false, reason: 'invalid path' };
  const rootPath = resolve(root);
  const absolute = resolve(rootPath, candidate);
  const relativePath = relative(rootPath, absolute);
  const path = relativePath.split(sep).join('/');
  if (!(allowRoot && relativePath === '') && !isChildPath(relativePath)) return { ok: false, reason: 'path escapes root', absolute, path };

  let rootRealPath;
  try {
    rootRealPath = realpathSync(rootPath);
  } catch {
    return { ok: false, reason: 'root is unavailable', absolute, path };
  }
  let realPath;
  try {
    realPath = realpathSync(absolute);
  } catch {
    return { ok: false, reason: 'path does not exist', absolute, path };
  }
  const realRelativePath = relative(rootRealPath, realPath);
  if (!(allowRoot && realRelativePath === '') && !isChildPath(realRelativePath)) return { ok: false, reason: 'path escapes root via symlink', absolute, path };
  return { ok: true, absolute, path, realpath: realPath };
}

import {
  constants,
  openSync,
  closeSync,
  fstatSync,
  lstatSync,
  readSync,
  opendirSync,
  realpathSync
} from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const sameIdentity = (a, b) => a.dev === b.dev && a.ino === b.ino;
const sameVersion = (a, b) =>
  sameIdentity(a, b) && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
const stat = (fd) => fstatSync(fd, { bigint: true });
const pathStat = (path) => lstatSync(path, { bigint: true });
const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;

// Captures generated/intermediate artifacts, not a terminal-original manifest.
// The controller must call before executing tests, retain this result, and
// compare a fresh snapshot after exit. This is not a same-UID hostile sandbox.
export function snapshotGeneratedArtifacts(
  root,
  {
    maxFileBytes = 64 * 1024 * 1024,
    maxTotalBytes = 512 * 1024 * 1024,
    maxEntries = 250000,
    maxDepth = 128
  } = {}
) {
  if (process.platform !== 'linux') throw new Error('generated snapshot requires Linux procfs');
  for (const value of [maxFileBytes, maxTotalBytes, maxEntries, maxDepth]) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('invalid snapshot limit');
  }
  if (maxFileBytes > 64 * 1024 * 1024)
    throw new Error('snapshot file limit exceeds allocation cap');
  const absolute = resolve(root);
  if (realpathSync(absolute) !== absolute)
    throw new Error('generated snapshot root is not canonical');
  const files = {},
    frozenHashes = {},
    pathHashes = {};
  let entries = 0,
    totalBytes = 0;
  const rootFd = openSync(absolute, directoryFlags);

  const walk = (parentFd, name, logicalPath, depth) => {
    if (depth > maxDepth) throw new Error('generated snapshot depth limit exceeded');
    const pinnedPath = `/proc/self/fd/${parentFd}/${name}`;
    const before = pathStat(pinnedPath);
    if (before.isSymbolicLink()) throw new Error(`generated tree contains symlink: ${logicalPath}`);
    if (!before.isDirectory()) throw new Error(`generated tree is not a directory: ${logicalPath}`);
    const fd = openSync(pinnedPath, directoryFlags);
    try {
      const identity = stat(fd);
      if (!sameIdentity(before, identity))
        throw new Error('generated directory changed before capture');
      const names = [];
      const directory = opendirSync(`/proc/self/fd/${fd}`, { encoding: 'buffer', bufferSize: 32 });
      try {
        for (let entry; (entry = directory.readSync()) !== null; ) {
          if (++entries > maxEntries) throw new Error('generated snapshot entry limit exceeded');
          // POSIX filenames are bytes. Lossy decoding could merge two distinct
          // names and hide one artifact from before/after comparisons.
          names.push(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(entry.name));
        }
      } finally {
        directory.closeSync();
      }
      for (const child of names.sort()) {
        if (child === 'node_modules') continue;
        const childPath = `/proc/self/fd/${fd}/${child}`;
        const logicalChild = join(logicalPath, child);
        const childStat = pathStat(childPath);
        if (childStat.isSymbolicLink())
          throw new Error(`generated tree contains symlink: ${logicalChild}`);
        if (childStat.isDirectory()) {
          walk(fd, child, logicalChild, depth + 1);
          continue;
        }
        if (!/\.(?:js|mjs|cjs|map)$/.test(child)) continue;
        if (!childStat.isFile()) throw new Error('generated artifact is not a regular file');
        if (
          childStat.size > BigInt(maxFileBytes) ||
          childStat.size > BigInt(maxTotalBytes - totalBytes)
        ) {
          throw new Error('generated snapshot byte limit exceeded');
        }
        const fileFd = openSync(
          childPath,
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
        );
        try {
          const opened = stat(fileFd);
          if (!opened.isFile() || !sameVersion(childStat, opened))
            throw new Error('generated artifact changed before capture');
          const expected = Number(opened.size);
          const buffer = Buffer.alloc(expected + 1);
          let length = 0;
          while (length < buffer.length) {
            const read = readSync(fileFd, buffer, length, buffer.length - length, null);
            if (!read) break;
            length += read;
          }
          if (
            length !== expected ||
            !sameVersion(opened, stat(fileFd)) ||
            !sameVersion(opened, pathStat(childPath))
          ) {
            throw new Error('generated artifact changed during capture');
          }
          const bytes = buffer.subarray(0, length);
          const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
          const url = pathToFileURL(logicalChild).href;
          const digest = createHash('sha256').update(bytes).digest('hex');
          files[url] = text;
          frozenHashes[url] = digest;
          pathHashes[logicalChild] = digest;
          totalBytes += length;
        } finally {
          closeSync(fileFd);
        }
      }
      if (!sameVersion(identity, stat(fd)) || !sameVersion(identity, pathStat(pinnedPath))) {
        throw new Error('generated directory changed during capture');
      }
    } finally {
      closeSync(fd);
    }
  };
  try {
    const rootIdentity = stat(rootFd);
    for (const name of ['apps', 'packages']) walk(rootFd, name, join(absolute, name), 1);
    if (!sameIdentity(rootIdentity, pathStat(absolute)))
      throw new Error('generated snapshot root changed');
  } finally {
    closeSync(rootFd);
  }
  return Object.freeze({
    files: Object.freeze(files),
    frozenHashes: Object.freeze(frozenHashes),
    pathHashes: Object.freeze(pathHashes)
  });
}

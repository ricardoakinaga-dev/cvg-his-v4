import {
  constants,
  openSync,
  closeSync,
  fstatSync,
  lstatSync,
  opendirSync,
  readSync
} from 'node:fs';

const patterns = {
  reports: /^coverage-[1-9][0-9]*-[0-9]+-(?:0|[1-9][0-9]*)\.json$/,
  observations: /^executed-script-[1-9][0-9]*-(?:0|[1-9][0-9]*)-[0-9]+\.json$/,
  instrumented:
    /^instrumented-[1-9][0-9]*-(?:0|[1-9][0-9]*)-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}-(?:0|[1-9][0-9]*)\.json$/
};
const stat = (fd) => fstatSync(fd, { bigint: true });
const version = (a, b) =>
  a.dev === b.dev &&
  a.ino === b.ino &&
  a.size === b.size &&
  a.mtimeNs === b.mtimeNs &&
  a.ctimeNs === b.ctimeNs;
const decode = (bytes) => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);

// Caller owns the directory fd from BEFORE the run until AFTER collection,
// and must first prove all producer processes stopped. This is a bounded reader,
// not a same-UID hostile filesystem sandbox or an atomic snapshot guarantee.
export function* readPinnedProcessRecords(
  descriptor,
  kind,
  { maxRecords = 20_000, maxFileBytes = 64 * 1024 * 1024, maxBytes = 2 * 1024 * 1024 * 1024 } = {}
) {
  if (
    process.platform !== 'linux' ||
    !Number.isSafeInteger(descriptor) ||
    descriptor < 0 ||
    !Object.hasOwn(patterns, kind)
  )
    throw new Error('pinned process records require Linux, descriptor and record kind');
  for (const [value, cap] of [
    [maxRecords, 20_000],
    [maxFileBytes, 64 * 1024 * 1024],
    [maxBytes, 2 * 1024 * 1024 * 1024]
  ])
    if (!Number.isSafeInteger(value) || value < 1 || value > cap)
      throw new Error('invalid pinned record budget');
  const before = stat(descriptor);
  if (!before.isDirectory()) throw new Error('pinned record descriptor is not a directory');
  // Cumulative instrumented snapshots must never be silently skipped by a V8
  // reader (or vice versa). Legacy observations/reports retain their shared tree.
  const allowedPatterns =
    kind === 'instrumented' ? [patterns.instrumented] : [patterns.reports, patterns.observations];
  const pinned = `/proc/self/fd/${descriptor}`,
    names = [];
  const directory = opendirSync(pinned, { encoding: 'buffer', bufferSize: 32 });
  try {
    for (let entry; (entry = directory.readSync()) !== null; ) {
      if (names.length >= maxRecords) throw new Error('pinned record budget exceeded');
      const name = decode(entry.name);
      if (!allowedPatterns.some((pattern) => pattern.test(name)))
        throw new Error('unexpected pinned record filename');
      names.push(name);
    }
  } finally {
    directory.closeSync();
  }
  let bytes = 0;
  for (const name of names.sort()) {
    if (!patterns[kind].test(name)) continue;
    const path = `${pinned}/${name}`;
    const expected = lstatSync(path, { bigint: true });
    if (!expected.isFile()) throw new Error('pinned record is not a regular file');
    if (expected.size > BigInt(maxFileBytes) || expected.size > BigInt(maxBytes - bytes))
      throw new Error('pinned record byte budget exceeded');
    const file = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let text;
    try {
      const opened = stat(file);
      if (!opened.isFile() || !version(expected, opened))
        throw new Error('pinned record changed before reading');
      const buffer = Buffer.alloc(Number(opened.size) + 1);
      let length = 0;
      while (length < buffer.length) {
        const read = readSync(file, buffer, length, buffer.length - length, null);
        if (!read) break;
        length += read;
      }
      if (
        BigInt(length) !== opened.size ||
        !version(opened, stat(file)) ||
        !version(opened, lstatSync(path, { bigint: true }))
      )
        throw new Error('pinned record changed while reading');
      bytes += length;
      text = decode(buffer.subarray(0, length));
    } finally {
      closeSync(file);
    }
    yield { name, text };
  }
  if (!version(before, stat(descriptor))) throw new Error('pinned directory changed while reading');
}

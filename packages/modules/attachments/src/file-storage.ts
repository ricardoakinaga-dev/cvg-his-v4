import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export interface FileStorageResult {
  readonly storageKey: string;
  readonly checksum: string;
  readonly sizeBytes: number;
}

export interface FileStorage {
  store(
    accountId: string,
    linkedEntityId: string,
    fileName: string,
    content: Buffer
  ): Promise<FileStorageResult>;
  retrieve(storageKey: string): Promise<Buffer | null>;
  delete(storageKey: string): Promise<boolean>;
  exists(storageKey: string): Promise<boolean>;
}

export interface LocalFileStorageOptions {
  readonly basePath: string;
}

export class LocalFileStorage implements FileStorage {
  readonly #basePath: string;

  public constructor(options: LocalFileStorageOptions) {
    this.#basePath = options.basePath;
  }

  public async store(
    accountId: string,
    linkedEntityId: string,
    fileName: string,
    content: Buffer
  ): Promise<FileStorageResult> {
    const checksum = createHash('sha256').update(content).digest('hex');
    const sizeBytes = content.length;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${accountId}/${linkedEntityId}/${checksum.slice(0, 12)}_${safeName}`;
    const fullPath = join(this.#basePath, storageKey);

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);

    return { storageKey, checksum, sizeBytes };
  }

  public async retrieve(storageKey: string): Promise<Buffer | null> {
    try {
      const fullPath = join(this.#basePath, storageKey);
      return await readFile(fullPath);
    } catch {
      return null;
    }
  }

  public async delete(storageKey: string): Promise<boolean> {
    try {
      const fullPath = join(this.#basePath, storageKey);
      await unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async exists(storageKey: string): Promise<boolean> {
    try {
      const fullPath = join(this.#basePath, storageKey);
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export function createMemoryFileStorage(): FileStorage {
  const store = new Map<string, Buffer>();

  return {
    async store(accountId, linkedEntityId, fileName, content) {
      const checksum = createHash('sha256').update(content).digest('hex');
      const sizeBytes = content.length;
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageKey = `${accountId}/${linkedEntityId}/${checksum.slice(0, 12)}_${safeName}`;
      store.set(storageKey, content);
      return { storageKey, checksum, sizeBytes };
    },
    async retrieve(storageKey) {
      return store.get(storageKey) ?? null;
    },
    async delete(storageKey) {
      return store.delete(storageKey);
    },
    async exists(storageKey) {
      return store.has(storageKey);
    }
  };
}

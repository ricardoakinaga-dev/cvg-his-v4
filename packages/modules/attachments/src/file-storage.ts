import { createHash, createHmac } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

export interface FileStorageResult {
  readonly storageKey: string;
  readonly checksum: string;
  readonly sizeBytes: number;
}

export interface FileStorage {
  /** True only for private, externally durable storage suitable for production. */
  readonly productionReady?: boolean;
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
  public readonly productionReady = false;
  readonly #basePath: string;

  public constructor(options: LocalFileStorageOptions) {
    this.#basePath = resolve(options.basePath);
  }

  #safePath(storageKey: string): string | null {
    if (!storageKey || storageKey.includes('\0')) return null;
    const fullPath = resolve(this.#basePath, storageKey);
    const pathFromBase = relative(this.#basePath, fullPath);
    if (pathFromBase.startsWith('..') || pathFromBase.includes(`..${String.fromCharCode(47)}`)) {
      return null;
    }
    return fullPath;
  }

  public async store(
    accountId: string,
    linkedEntityId: string,
    fileName: string,
    content: Buffer
  ): Promise<FileStorageResult> {
    const checksum = createHash('sha256').update(content).digest('hex');
    const sizeBytes = content.length;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'unnamed';
    const safeAccountId = accountId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeLinkedEntityId = linkedEntityId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `${accountId}/${linkedEntityId}/${checksum.slice(0, 12)}_${safeName}`;
    const safeStorageKey = `${safeAccountId}/${safeLinkedEntityId}/${checksum.slice(0, 12)}_${safeName}`;
    const fullPath = this.#safePath(safeStorageKey);
    if (!fullPath) throw new Error('Invalid attachment storage path');

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);

    return { storageKey: safeStorageKey, checksum, sizeBytes };
  }

  public async retrieve(storageKey: string): Promise<Buffer | null> {
    const fullPath = this.#safePath(storageKey);
    if (!fullPath) return null;
    try {
      return await readFile(fullPath);
    } catch {
      return null;
    }
  }

  public async delete(storageKey: string): Promise<boolean> {
    const fullPath = this.#safePath(storageKey);
    if (!fullPath) return false;
    try {
      await unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async exists(storageKey: string): Promise<boolean> {
    const fullPath = this.#safePath(storageKey);
    if (!fullPath) return false;
    try {
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export interface S3CompatibleFileStorageOptions {
  readonly endpoint: string;
  readonly bucket: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly region?: string;
  readonly pathStyle?: boolean;
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(/%2F/g, '/');
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Private S3-compatible object storage adapter. It uses SigV4 directly so the
 * API does not need a cloud SDK and works with AWS S3, MinIO and compatible
 * gateways. No public URL is ever returned; downloads remain authorization
 * checked by the API route.
 */
export class S3CompatibleFileStorage implements FileStorage {
  public readonly productionReady = true;
  readonly #endpoint: URL;
  readonly #bucket: string;
  readonly #accessKeyId: string;
  readonly #secretAccessKey: string;
  readonly #region: string;
  readonly #pathStyle: boolean;

  public constructor(options: S3CompatibleFileStorageOptions) {
    this.#endpoint = new URL(options.endpoint);
    if (this.#endpoint.protocol !== 'http:' && this.#endpoint.protocol !== 'https:') {
      throw new Error('S3 endpoint must use http or https');
    }
    this.#bucket = options.bucket.trim();
    this.#accessKeyId = options.accessKeyId.trim();
    this.#secretAccessKey = options.secretAccessKey;
    this.#region = options.region?.trim() || 'us-east-1';
    this.#pathStyle = options.pathStyle ?? true;
    if (!this.#bucket || !this.#accessKeyId || !this.#secretAccessKey) {
      throw new Error('S3 bucket and credentials are required');
    }
  }

  public async store(
    accountId: string,
    linkedEntityId: string,
    fileName: string,
    content: Buffer
  ): Promise<FileStorageResult> {
    const checksum = sha256(content);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'unnamed';
    const storageKey = `${accountId}/${linkedEntityId}/${checksum.slice(0, 12)}_${safeName}`;
    const response = await this.#request('PUT', storageKey, content, {
      'content-type': 'application/octet-stream'
    });
    if (!response.ok) {
      throw new Error(`S3 object upload failed with status ${response.status}`);
    }
    return { storageKey, checksum, sizeBytes: content.length };
  }

  public async retrieve(storageKey: string): Promise<Buffer | null> {
    const response = await this.#request('GET', storageKey);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`S3 object download failed with status ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  public async delete(storageKey: string): Promise<boolean> {
    const response = await this.#request('DELETE', storageKey);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(`S3 object deletion failed with status ${response.status}`);
    return true;
  }

  public async exists(storageKey: string): Promise<boolean> {
    const response = await this.#request('HEAD', storageKey);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(`S3 object check failed with status ${response.status}`);
    return true;
  }

  async #request(
    method: 'GET' | 'PUT' | 'DELETE' | 'HEAD',
    storageKey: string,
    body?: Buffer,
    extraHeaders: Record<string, string> = {}
  ): Promise<Response> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').replace(/Z$/, 'Z');
    const shortDate = amzDate.slice(0, 8);
    const payloadHash = sha256(body ?? Buffer.alloc(0));
    const host = this.#endpoint.host;
    const encodedKey = storageKey.split('/').map(awsEncode).join('/');
    const path = this.#pathStyle
      ? `${this.#endpoint.pathname.replace(/\/$/, '')}/${awsEncode(this.#bucket)}/${encodedKey}`
      : `${this.#endpoint.pathname.replace(/\/$/, '')}/${encodedKey}`;
    const url = new URL(this.#endpoint.toString());
    if (!this.#pathStyle) url.hostname = `${this.#bucket}.${url.hostname}`;
    url.pathname = path || '/';

    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...extraHeaders
    };
    const canonicalHeaders = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort()
      .map((name) => `${name}:${headers[name].trim().replace(/\s+/g, ' ')}\n`)
      .join('');
    const signedHeaders = Object.keys(headers).map((name) => name.toLowerCase()).sort().join(';');
    const canonicalRequest = [
      method,
      path || '/',
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    const scope = `${shortDate}/${this.#region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      sha256(canonicalRequest)
    ].join('\n');
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${this.#secretAccessKey}`, shortDate), this.#region), 's3'),
      'aws4_request'
    );
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${this.#accessKeyId}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return fetch(url, {
      method,
      headers,
      body: body ?? undefined
    });
  }
}

export function createMemoryFileStorage(): FileStorage {
  const store = new Map<string, Buffer>();

  return {
    productionReady: false,
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

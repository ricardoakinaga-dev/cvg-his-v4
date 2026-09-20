import { readFileSync } from 'node:fs';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createServer as createTcpServer } from 'node:net';

const certificatePath = process.env.ATTACHMENT_FIXTURE_CERT_PATH;
const privateKeyPath = process.env.ATTACHMENT_FIXTURE_KEY_PATH;
const accessKeyId = process.env.ATTACHMENT_FIXTURE_ACCESS_KEY;
const secretAccessKey = process.env.ATTACHMENT_FIXTURE_SECRET_KEY;
const region = process.env.ATTACHMENT_FIXTURE_REGION ?? 'us-east-1';
const bucket = process.env.ATTACHMENT_FIXTURE_BUCKET;
if (!certificatePath || !privateKeyPath || !accessKeyId || !secretAccessKey || !bucket) {
  throw new Error('Attachment readiness fixture TLS and S3 configuration are required');
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hasValidS3Signature(request) {
  if (request.method !== 'HEAD' || request.url !== `/${bucket}`) return false;
  const authorization = request.headers.authorization ?? '';
  const match = authorization.match(
    /^AWS4-HMAC-SHA256 Credential=([^/]+)\/([^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/
  );
  if (!match) return false;
  const [, credential, scope, signedHeaders, receivedSignature] = match;
  const amzDate = request.headers['x-amz-date'];
  const payloadHash = request.headers['x-amz-content-sha256'];
  if (
    credential !== accessKeyId ||
    typeof amzDate !== 'string' ||
    !/^\d{8}T\d{6}Z$/.test(amzDate) ||
    payloadHash !== sha256(Buffer.alloc(0)) ||
    scope !== `${amzDate.slice(0, 8)}/${region}/s3/aws4_request`
  ) {
    return false;
  }

  const headerNames = signedHeaders.split(';');
  if (
    headerNames.join(';') !== [...new Set(headerNames)].sort().join(';') ||
    !headerNames.includes('host') ||
    !headerNames.includes('x-amz-date') ||
    !headerNames.includes('x-amz-content-sha256')
  ) {
    return false;
  }
  const canonicalHeaders = headerNames.map((name) => {
    const value = request.headers[name];
    if (value === undefined) return undefined;
    const normalized = (Array.isArray(value) ? value.join(',') : value).trim().replace(/\s+/g, ' ');
    return `${name}:${normalized}\n`;
  });
  if (canonicalHeaders.some((header) => header === undefined)) return false;
  const canonicalRequest = [
    request.method,
    request.url,
    '',
    canonicalHeaders.join(''),
    signedHeaders,
    payloadHash
  ].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const shortDate = amzDate.slice(0, 8);
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretAccessKey}`, shortDate), region), 's3'),
    'aws4_request'
  );
  const expectedSignature = createHmac('sha256', signingKey).update(stringToSign).digest();
  const actualSignature = Buffer.from(receivedSignature, 'hex');
  return (
    actualSignature.length === expectedSignature.length &&
    timingSafeEqual(actualSignature, expectedSignature)
  );
}

let scannerProbeObserved = false;
let storageProbeObserved = false;

const scanner = createTcpServer((socket) => {
  const chunks = [];
  socket.on('data', (chunk) => chunks.push(chunk));
  socket.on('end', () => {
    const command = Buffer.concat(chunks);
    if (command.equals(Buffer.from('zPING\0', 'ascii'))) {
      scannerProbeObserved = true;
      socket.end('PONG\n');
      return;
    }
    socket.destroy();
  });
});

const storage = createHttpsServer(
  {
    cert: readFileSync(certificatePath),
    key: readFileSync(privateKeyPath)
  },
  (request, response) => {
    const signed = hasValidS3Signature(request);
    storageProbeObserved ||= signed;
    response.statusCode = signed ? 200 : 403;
    response.end();
  }
);

const health = createHttpServer((_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.statusCode = 200;
  response.end(JSON.stringify({ ready: true, scannerProbeObserved, storageProbeObserved }));
});

await Promise.all([
  new Promise((resolve, reject) => {
    scanner.once('error', reject);
    scanner.listen(3310, '0.0.0.0', resolve);
  }),
  new Promise((resolve, reject) => {
    storage.once('error', reject);
    storage.listen(9443, '0.0.0.0', resolve);
  }),
  new Promise((resolve, reject) => {
    health.once('error', reject);
    health.listen(9080, '0.0.0.0', resolve);
  })
]);

const shutdown = () => {
  scanner.close();
  storage.close();
  health.close(() => process.exit(0));
};
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

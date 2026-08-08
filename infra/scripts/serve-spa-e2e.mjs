import { createReadStream, existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const host = process.env.SPA_E2E_HOST || '127.0.0.1';
const port = Number(process.env.SPA_E2E_PORT || '3102');
const apiTarget = process.env.SPA_E2E_API_TARGET || 'http://127.0.0.1:3101';
const distDir = join(process.cwd(), 'apps/spa/dist');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2'
};

function writeJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function safePathname(pathname) {
  const normalized = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

async function proxyApi(req, res, url) {
  try {
    const targetUrl = new URL(url.pathname.replace(/^\/api/, '') + url.search, apiTarget);
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || key.toLowerCase() === 'host' || key.toLowerCase() === 'connection') continue;
      if (Array.isArray(value)) {
        headers.set(key, value.join(', '));
      } else {
        headers.set(key, value);
      }
    }

    const body =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks)));
            req.on('error', reject);
          });

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body
    });

    const responseHeaders = Object.fromEntries(upstream.headers.entries());
    const setCookies =
      typeof upstream.headers.getSetCookie === 'function'
        ? upstream.headers.getSetCookie()
        : [];
    delete responseHeaders.connection;
    delete responseHeaders['content-encoding'];
    delete responseHeaders['set-cookie'];

    if (setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }
    res.writeHead(upstream.status, responseHeaders);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (!res.destroyed) {
      res.end(Buffer.from(arrayBuffer));
    }
  } catch (error) {
    if (!res.destroyed) {
      writeJson(res, 502, { error: 'API proxy failure', detail: String(error) });
    }
  }
}

async function serveStatic(req, res, url) {
  const requestedPath = safePathname(url.pathname === '/' ? '/index.html' : url.pathname);
  const absolutePath = join(distDir, requestedPath);

  if (existsSync(absolutePath)) {
    const stats = await fs.stat(absolutePath);
    if (stats.isDirectory()) {
      return serveFile(join(absolutePath, 'index.html'), res);
    }
    return serveFile(absolutePath, res);
  }

  return serveFile(join(distDir, 'index.html'), res);
}

async function serveFile(filePath, res) {
  const extension = extname(filePath);
  const contentType = contentTypes[extension] || 'application/octet-stream';

  try {
    const stats = await fs.stat(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size
    });
    const stream = createReadStream(filePath);
    stream.on('error', (error) => {
      if (!res.destroyed && !res.headersSent) {
        writeJson(res, 500, { error: 'Static stream failure', filePath, detail: String(error) });
        return;
      }

      if (!res.destroyed) {
        res.end();
      }
    });
    stream.pipe(res);
  } catch (error) {
    writeJson(res, 404, { error: 'File not found', filePath, detail: String(error) });
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      writeJson(res, 400, { error: 'Missing request URL' });
      return;
    }

    const url = new URL(req.url, `http://${host}:${port}`);
    if (url.pathname.startsWith('/api/')) {
      await proxyApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    writeJson(res, 500, { error: 'SPA E2E server failure', detail: String(error) });
  }
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 0;
server.on('clientError', (error, socket) => {
  console.error('[spa-e2e-server] client error', error);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

process.on('uncaughtException', (error) => {
  console.error('[spa-e2e-server] uncaught exception', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[spa-e2e-server] unhandled rejection', error);
});

server.listen(port, host, () => {
  console.log(`[spa-e2e-server] listening on http://${host}:${port}`);
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, resetProxyCache } from './route';

// Mock fetch globally
const originalFetch = global.fetch;
const mockFetch = vi.fn();

describe('Proxy Route Handler', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
    vi.stubEnv('HIS_API_INTERNAL_URL', 'http://upstream.test');
    vi.stubEnv('NODE_ENV', 'test');
    resetProxyCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  const createMockRequest = (
    path: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      cookies?: Record<string, string>;
      search?: string;
    } = {}
  ): NextRequest => {
    const url = new URL(`http://localhost/api/proxy${path}${options.search || ''}`);
    const request = new NextRequest(url, {
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body
    });

    // Mock cookies
    if (options.cookies) {
      Object.entries(options.cookies).forEach(([key, value]) => {
        request.cookies.set(key, value);
      });
    }

    return request;
  };

  describe('GET handler', () => {
    it('should proxy GET request to upstream and return response', async () => {
      const mockResponseBody = { status: 'ok', data: [] };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(mockResponseBody)
      });

      const request = createMockRequest('/owners', { search: '?query=test' });
      const response = await GET(request, { params: { path: ['owners'] } });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://upstream.test/owners?query=test'),
        expect.objectContaining({
          method: 'GET',
          cache: 'no-store',
          redirect: 'manual'
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBeTruthy();
    });

    it('should forward query string to upstream', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/owners', { search: '?name=John&limit=10' });
      await GET(request, { params: { path: ['owners'] } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('owners?name=John&limit=10'),
        expect.any(Object)
      );
    });

    it('should allow auth paths for login flows', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        body: '{}'
      });

      const request = createMockRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ type: 'email', email: 'admin@cvg.local', password: 'Admin123!' }),
        headers: { 'content-type': 'application/json' }
      });
      const response = await POST(request, { params: { path: ['auth', 'login'] } });

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://upstream.test/auth/login'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should block disallowed paths with 403', async () => {
      const request = createMockRequest('/admin/secrets');
      const response = await GET(request, { params: { path: ['admin', 'secrets'] } });

      expect(response.status).toBe(403);
      expect(mockFetch).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.error.code).toBe('PROXY_PATH_BLOCKED');
      expect(body.error.requestId).toBeTruthy();
    });

    it('should include x-request-id in upstream headers', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health');
      await GET(request, { params: { path: ['health'] } });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.get('x-request-id')).toBeTruthy();
    });

    it('should return x-request-id in response headers', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health');
      const response = await GET(request, { params: { path: ['health'] } });

      const requestId = response.headers.get('x-request-id');
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^[a-z0-9]+-[a-f0-9]{8}$/);
    });
  });

  describe('POST handler', () => {
    it('should forward POST body to upstream', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 201,
        headers: new Headers(),
        body: '{}'
      });

      const requestBody = JSON.stringify({ name: 'Test Owner' });
      const request = createMockRequest('/owners', {
        method: 'POST',
        body: requestBody,
        headers: { 'content-type': 'application/json' }
      });

      await POST(request, { params: { path: ['owners'] } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(ArrayBuffer)
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should return 502 on upstream connection failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const request = createMockRequest('/health');
      const response = await GET(request, { params: { path: ['health'] } });

      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error.code).toBe('PROXY_UPSTREAM_ERROR');
      expect(body.error.message).toBe('Upstream API unavailable.');
      expect(body.error.requestId).toBeTruthy();
    });

    it('should return 504 on timeout', async () => {
      vi.stubEnv('HIS_PROXY_TIMEOUT_MS', '100');

      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            setTimeout(() => reject(error), 50);
          })
      );

      const request = createMockRequest('/health');
      const response = await GET(request, { params: { path: ['health'] } });

      expect(response.status).toBe(504);
      const body = await response.json();
      expect(body.error.code).toBe('PROXY_TIMEOUT');
      expect(body.error.message).toContain('timed out');
    });
  });

  describe('Header handling', () => {
    it('should block hop-by-hop headers from request', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health', {
        headers: {
          connection: 'keep-alive',
          'transfer-encoding': 'chunked',
          'x-custom': 'value'
        }
      });

      await GET(request, { params: { path: ['health'] } });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.has('connection')).toBe(false);
      expect(headers.has('transfer-encoding')).toBe(false);
      expect(headers.get('x-custom')).toBe('value');
    });

    it('should block hop-by-hop headers from response', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers({
          connection: 'keep-alive',
          'transfer-encoding': 'chunked',
          'x-custom': 'value'
        }),
        body: '{}'
      });

      const request = createMockRequest('/health');
      const response = await GET(request, { params: { path: ['health'] } });

      expect(response.headers.has('connection')).toBe(false);
      expect(response.headers.has('transfer-encoding')).toBe(false);
      expect(response.headers.get('x-custom')).toBe('value');
    });

    it('should block security-sensitive headers', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health', {
        headers: {
          'x-account-id': 'malicious-account',
          'x-role': 'admin',
          'x-user-id': 'malicious-user'
        }
      });

      await GET(request, { params: { path: ['health'] } });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.has('x-account-id')).toBe(false);
      expect(headers.has('x-role')).toBe(false);
      expect(headers.has('x-user-id')).toBe(false);
    });

    it('should extract token from cookie and set Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health', {
        cookies: { his_token: 'test-jwt-token' }
      });

      await GET(request, { params: { path: ['health'] } });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.get('authorization')).toBe('Bearer test-jwt-token');
    });

    it('should not override existing Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health', {
        headers: { authorization: 'Basic existing-auth' },
        cookies: { his_token: 'test-jwt-token' }
      });

      await GET(request, { params: { path: ['health'] } });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.get('authorization')).toBe('Basic existing-auth');
    });
  });

  describe('Upstream URL resolution', () => {
    it('should use HIS_API_INTERNAL_URL when set', async () => {
      vi.stubEnv('HIS_API_INTERNAL_URL', 'http://internal-api:3001');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health');
      await GET(request, { params: { path: ['health'] } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://internal-api:3001/health'),
        expect.any(Object)
      );
    });

    it('should fallback to default if HIS_API_INTERNAL_URL is not set (dev mode)', async () => {
      vi.stubEnv('HIS_API_INTERNAL_URL', undefined);
      vi.stubEnv('NODE_ENV', 'development');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health');
      await GET(request, { params: { path: ['health'] } });

      // Should fallback to default http://127.0.0.1:3000
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://127.0.0.1:3000/health'),
        expect.any(Object)
      );
    });

    it('should ignore deprecated HIS_API_BASE_URL and use default instead', async () => {
      vi.stubEnv('HIS_API_INTERNAL_URL', undefined);
      vi.stubEnv('HIS_API_BASE_URL', 'http://deprecated-api:3002');
      vi.stubEnv('NODE_ENV', 'development');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        body: '{}'
      });

      const request = createMockRequest('/health');
      await GET(request, { params: { path: ['health'] } });

      // Should NOT use deprecated HIS_API_BASE_URL, fallback to default
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://127.0.0.1:3000/health'),
        expect.any(Object)
      );
    });
  });
});

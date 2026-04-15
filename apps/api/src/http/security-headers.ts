import type { IncomingMessage, ServerResponse } from 'node:http';

function isProductionLikeEnvironment(environment: string): boolean {
  return (
    environment === 'production'
    || environment === 'staging'
    || environment === 'prod'
    || environment === 'stage'
  );
}

function isSecureRequest(request: IncomingMessage): boolean {
  if ((request.socket as { encrypted?: boolean }).encrypted) {
    return true;
  }

  const forwardedProto = request.headers['x-forwarded-proto'];
  const headerValue = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return headerValue?.split(',')[0].trim().toLowerCase() === 'https';
}

export function applySecurityHeaders(
  request: IncomingMessage,
  response: ServerResponse,
  environment: string
): void {
  response.setHeader('x-content-type-options', 'nosniff');
  response.setHeader('x-frame-options', 'DENY');
  response.setHeader('x-xss-protection', '0');
  response.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  response.setHeader('x-permitted-cross-domain-policies', 'none');
  response.setHeader('cross-origin-opener-policy', 'same-origin');
  response.setHeader('cross-origin-resource-policy', 'same-origin');
  response.setHeader(
    'permissions-policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  response.setHeader('cache-control', 'no-store, no-cache, must-revalidate');
  response.setHeader(
    'content-security-policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );

  if (isProductionLikeEnvironment(environment) && isSecureRequest(request)) {
    response.setHeader(
      'strict-transport-security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
}

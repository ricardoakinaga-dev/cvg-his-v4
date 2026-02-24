import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const AUTH_COOKIE_NAME = 'his_token';
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 8;
const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const tokenPayloadSchema = z.object({
  token: z
    .string()
    .transform((value) => value.trim().replace(/^Bearer\s+/i, '').trim())
    .refine((value) => value.length > 0, 'Token is required')
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveCookieMaxAgeSeconds(): number {
  const raw = process.env.HIS_AUTH_COOKIE_MAX_AGE_SECONDS?.trim();
  if (!raw) {
    return DEFAULT_MAX_AGE_SECONDS;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return DEFAULT_MAX_AGE_SECONDS;
  }

  return parsed;
}

function resolveCookieDomain(): string | undefined {
  const value = process.env.HIS_AUTH_COOKIE_DOMAIN?.trim();
  if (!value) {
    return undefined;
  }

  let normalized = value;
  if (normalized.includes('://')) {
    try {
      normalized = new URL(normalized).hostname;
    } catch {
      return undefined;
    }
  }

  normalized = normalized.split('/')[0]?.trim() ?? '';
  if (!normalized) {
    return undefined;
  }

  // Strip optional leading dot and trailing dot.
  normalized = normalized.replace(/^\.+/, '').replace(/\.+$/, '');
  // Strip optional port suffix.
  normalized = normalized.replace(/:\d+$/, '');
  normalized = normalized.toLowerCase();

  if (
    normalized.length === 0 ||
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    IPV4_PATTERN.test(normalized) ||
    normalized.includes(':')
  ) {
    return undefined;
  }

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(normalized)) {
    return undefined;
  }

  const labels = normalized.split('.');
  if (labels.some((label) => label.startsWith('-') || label.endsWith('-'))) {
    return undefined;
  }

  return normalized;
}

function buildCookieOptions() {
  const domain = resolveCookieDomain();

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: resolveCookieMaxAgeSeconds(),
    ...(domain ? { domain } : {})
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = tokenPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid token payload.' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(AUTH_COOKIE_NAME, parsed.data.token, buildCookieOptions());
  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    ...buildCookieOptions(),
    maxAge: 0
  });
  return response;
}

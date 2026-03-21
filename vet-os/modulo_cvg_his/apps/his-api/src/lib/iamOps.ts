const DEFAULT_WEB_BASE_URL = 'http://localhost:3001';
const EXPECTED_PUBLIC_API_BASE = '/api/proxy';
const MIN_JWT_SECRET_LENGTH = 16;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

export type EnvMap = Record<string, string | undefined>;

export type ValidationIssue = {
  level: 'error' | 'warning';
  field: string;
  message: string;
  hint?: string;
};

export type PreflightResult = {
  ok: boolean;
  issues: ValidationIssue[];
  checks: Array<{ name: string; status: 'ok' | 'error' | 'warning'; detail: string }>;
};

export type SmokeAuthConfig = {
  headerName: string;
  headerValue: string;
  source: 'auth_header' | 'bearer_token' | 'cookie';
};

export type SmokeEndpoint = {
  name: 'auth/me' | 'admin/iam/users' | 'admin/iam/roles';
  url: string;
};

export function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '***';
  }

  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}

function hasValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeTrim(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isPostgresUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasStrongEnoughPassword(value: string): boolean {
  if (value.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return false;
  }

  let classes = 0;
  if (/[a-z]/.test(value)) {
    classes += 1;
  }
  if (/[A-Z]/.test(value)) {
    classes += 1;
  }
  if (/\d/.test(value)) {
    classes += 1;
  }
  if (/[^A-Za-z0-9]/.test(value)) {
    classes += 1;
  }

  return classes >= 3;
}

function normalizeInternalUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export function validatePreflightEnv(env: EnvMap, options?: { includeWeb?: boolean }): PreflightResult {
  const includeWeb = options?.includeWeb ?? true;
  const issues: ValidationIssue[] = [];
  const checks: PreflightResult['checks'] = [];

  const databaseUrl = safeTrim(env.DATABASE_URL);
  if (!databaseUrl) {
    issues.push({
      level: 'error',
      field: 'DATABASE_URL',
      message: 'DATABASE_URL não está definida.',
      hint: 'Configure a URL do Postgres antes de rodar migrate/seed.'
    });
  } else if (!isPostgresUrl(databaseUrl)) {
    issues.push({
      level: 'error',
      field: 'DATABASE_URL',
      message: 'DATABASE_URL não parece ser uma URL Postgres válida.',
      hint: 'Use formato postgres:// ou postgresql://.'
    });
  } else {
    checks.push({ name: 'DATABASE_URL', status: 'ok', detail: 'URL do Postgres presente.' });
  }

  const jwtSecret = safeTrim(env.JWT_SECRET);
  if (!jwtSecret) {
    issues.push({
      level: 'error',
      field: 'JWT_SECRET',
      message: 'JWT_SECRET não está definida.',
      hint: 'Defina um segredo forte antes de ativar o IAM.'
    });
  } else if (jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    issues.push({
      level: 'error',
      field: 'JWT_SECRET',
      message: `JWT_SECRET precisa ter ao menos ${MIN_JWT_SECRET_LENGTH} caracteres.`,
      hint: 'Use um segredo aleatório longo.'
    });
  } else {
    checks.push({
      name: 'JWT_SECRET',
      status: 'ok',
      detail: `Segredo presente (${maskSecret(jwtSecret)}).`
    });
  }

  for (const field of ['JWT_ISSUER', 'JWT_AUDIENCE'] as const) {
    const value = safeTrim(env[field]);
    if (!value) {
      issues.push({
        level: 'error',
        field,
        message: `${field} não está definida.`,
        hint: 'Preencha a identidade do emissor e audiência do token.'
      });
    } else {
      checks.push({ name: field, status: 'ok', detail: `Valor presente: ${value}` });
    }
  }

  if (includeWeb) {
    const publicApiBase = safeTrim(env.NEXT_PUBLIC_HIS_API_BASE_URL);
    if (!publicApiBase) {
      issues.push({
        level: 'error',
        field: 'NEXT_PUBLIC_HIS_API_BASE_URL',
        message: 'NEXT_PUBLIC_HIS_API_BASE_URL não está definida.',
        hint: `Defina exatamente ${EXPECTED_PUBLIC_API_BASE} no build do his-web.`
      });
    } else if (publicApiBase !== EXPECTED_PUBLIC_API_BASE) {
      issues.push({
        level: 'error',
        field: 'NEXT_PUBLIC_HIS_API_BASE_URL',
        message: `NEXT_PUBLIC_HIS_API_BASE_URL deve ser ${EXPECTED_PUBLIC_API_BASE}.`,
        hint: 'Não use URL absoluta nem caminho diferente para o proxy público.'
      });
    } else {
      checks.push({
        name: 'NEXT_PUBLIC_HIS_API_BASE_URL',
        status: 'ok',
        detail: `Proxy público configurado em ${EXPECTED_PUBLIC_API_BASE}.`
      });
    }

    const internalUrl = safeTrim(env.HIS_API_INTERNAL_URL);
    if (!internalUrl) {
      issues.push({
        level: 'error',
        field: 'HIS_API_INTERNAL_URL',
        message: 'HIS_API_INTERNAL_URL não está definida.',
        hint: 'Defina a URL interna do his-api consumida pelo proxy do his-web.'
      });
    } else if (!isHttpUrl(internalUrl)) {
      issues.push({
        level: 'error',
        field: 'HIS_API_INTERNAL_URL',
        message: 'HIS_API_INTERNAL_URL precisa ser uma URL http(s) válida.',
        hint: 'Exemplo: http://his-api:3000 ou http://127.0.0.1:3000.'
      });
    } else if (internalUrl.includes('/api/proxy')) {
      issues.push({
        level: 'error',
        field: 'HIS_API_INTERNAL_URL',
        message: 'HIS_API_INTERNAL_URL deve apontar para o his-api upstream, não para /api/proxy.',
        hint: 'Use o host interno real do backend.'
      });
    } else {
      checks.push({
        name: 'HIS_API_INTERNAL_URL',
        status: 'ok',
        detail: `Upstream interno configurado em ${normalizeInternalUrl(internalUrl)}.`
      });
    }
  } else {
    checks.push({
      name: 'WEB_CHECKS',
      status: 'warning',
      detail: 'Validação de variáveis do his-web pulada por IAM_SKIP_WEB_CHECKS=1.'
    });
  }

  return {
    ok: issues.every((issue) => issue.level !== 'error'),
    issues,
    checks
  };
}

export function validateAdminBootstrapEnv(env: EnvMap): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const adminEmail = safeTrim(env.ADMIN_EMAIL);
  const adminPassword = safeTrim(env.ADMIN_PASSWORD);

  if (!adminEmail) {
    issues.push({
      level: 'error',
      field: 'ADMIN_EMAIL',
      message: 'ADMIN_EMAIL não está definida.',
      hint: 'Informe o e-mail da conta administrativa inicial.'
    });
  } else if (!isLikelyEmail(adminEmail)) {
    issues.push({
      level: 'error',
      field: 'ADMIN_EMAIL',
      message: 'ADMIN_EMAIL não parece ser um e-mail válido.',
      hint: 'Use formato nome@dominio.tld.'
    });
  }

  if (!adminPassword) {
    issues.push({
      level: 'error',
      field: 'ADMIN_PASSWORD',
      message: 'ADMIN_PASSWORD não está definida.',
      hint: 'Use uma senha temporária forte e troque após o primeiro login.'
    });
  } else if (!hasStrongEnoughPassword(adminPassword)) {
    issues.push({
      level: 'error',
      field: 'ADMIN_PASSWORD',
      message: `ADMIN_PASSWORD precisa ter ao menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres e combinar ao menos 3 classes de caracteres.`,
      hint: 'Exemplo forte: Troque-Agora-123!.'
    });
  }

  return issues;
}

export function resolveSmokeBaseUrl(env: EnvMap): string {
  const rawBaseUrl = safeTrim(env.IAM_SMOKE_BASE_URL) || DEFAULT_WEB_BASE_URL;

  if (!isHttpUrl(rawBaseUrl)) {
    throw new Error('IAM_SMOKE_BASE_URL precisa ser uma URL http(s) válida.');
  }

  return rawBaseUrl.replace(/\/+$/, '');
}

export function resolveSmokeAuth(env: EnvMap): SmokeAuthConfig {
  const explicitHeader = safeTrim(env.IAM_SMOKE_AUTH_HEADER);
  if (explicitHeader) {
    return {
      headerName: 'authorization',
      headerValue: explicitHeader,
      source: 'auth_header'
    };
  }

  const bearerToken = safeTrim(env.IAM_SMOKE_BEARER_TOKEN);
  if (bearerToken) {
    return {
      headerName: 'authorization',
      headerValue: `Bearer ${bearerToken}`,
      source: 'bearer_token'
    };
  }

  const cookie = safeTrim(env.IAM_SMOKE_COOKIE);
  if (cookie) {
    return {
      headerName: 'cookie',
      headerValue: cookie,
      source: 'cookie'
    };
  }

  throw new Error(
    'Autenticação do smoke não informada. Defina IAM_SMOKE_AUTH_HEADER, IAM_SMOKE_BEARER_TOKEN ou IAM_SMOKE_COOKIE.'
  );
}

export function buildSmokeEndpoints(baseUrl: string): SmokeEndpoint[] {
  return [
    { name: 'auth/me', url: `${baseUrl}/api/proxy/auth/me` },
    { name: 'admin/iam/users', url: `${baseUrl}/api/proxy/admin/iam/users` },
    { name: 'admin/iam/roles', url: `${baseUrl}/api/proxy/admin/iam/roles` }
  ];
}

export function formatValidationReport(title: string, result: PreflightResult): string {
  const lines = [title];

  for (const check of result.checks) {
    const marker = check.status === 'ok' ? '[OK]' : check.status === 'warning' ? '[WARN]' : '[ERR]';
    lines.push(`${marker} ${check.name}: ${check.detail}`);
  }

  for (const issue of result.issues) {
    const marker = issue.level === 'error' ? '[ERR]' : '[WARN]';
    lines.push(`${marker} ${issue.field}: ${issue.message}`);
    if (issue.hint) {
      lines.push(`      acao: ${issue.hint}`);
    }
  }

  lines.push(result.ok ? 'STATUS: READY' : 'STATUS: BLOCKED');
  return lines.join('\n');
}

export function parseSmokeJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

export function validateAuthMePayload(payload: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const field of ['accountId', 'roles', 'permissions']) {
    if (!(field in payload)) {
      issues.push({
        level: 'error',
        field,
        message: `Resposta de /auth/me sem o campo ${field}.`
      });
    }
  }

  // sessionId is optional (e.g., for pre-generated tokens). Do not report missing sessionId as warning.
  // However, if present, ensure it's a string.

  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
  for (const permission of ['users.read', 'roles.read']) {
    if (!permissions.includes(permission)) {
      issues.push({
        level: 'error',
        field: 'permissions',
        message: `Sessão autenticada sem a permissão mínima ${permission}.`,
        hint: 'Revise seed, vínculos em user_roles e role_permissions.'
      });
    }
  }

  return issues;
}

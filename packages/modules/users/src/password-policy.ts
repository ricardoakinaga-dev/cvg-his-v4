/**
 * Single password policy for every credential the system creates or changes
 * (R2-SEC-01, audit finding A6): the initial administrator, users created by
 * administrators and password changes all go through `assertPasswordPolicy`.
 *
 * Rules:
 *   - 12 to 128 characters;
 *   - not a well-known password (bundled denylist, case-insensitive);
 *   - does not contain the username, the e-mail local part or the display
 *     name (4+ characters);
 *   - optionally, not present in a breach corpus (Have I Been Pwned range
 *     API with k-anonymity: only the first 5 characters of the SHA-1 leave
 *     the process). Enabled with PASSWORD_BREACH_CHECK=hibp.
 */
import { createHash } from 'node:crypto';

import { AppError } from '@cvg-his-v2/shared-errors';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export type PasswordPolicyViolation =
  | 'too_short'
  | 'too_long'
  | 'common_password'
  | 'contains_identifier'
  | 'breached';

export interface PasswordPolicyContext {
  readonly username?: string;
  readonly email?: string;
  readonly displayName?: string;
}

export interface BreachedPasswordChecker {
  isBreached(password: string): Promise<boolean>;
}

export interface PasswordPolicyLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

export class PasswordPolicyError extends AppError {
  readonly violations: readonly PasswordPolicyViolation[];

  constructor(violations: readonly PasswordPolicyViolation[]) {
    super(
      'PASSWORD_POLICY_VIOLATION',
      `Password does not satisfy the policy: ${violations.join(', ')}`,
      400,
      { field: 'password', reason: 'invalid_format', violations }
    );
    this.name = 'PasswordPolicyError';
    this.violations = violations;
  }
}

/**
 * Well-known passwords and trivial patterns. Leaked credentials at scale are
 * covered by the optional breach checker; this list blocks the values that
 * appear in every dictionary attack regardless of length.
 */
export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(
  [
    '123456', '123456789', '12345678', '1234567890', '12345678910', '123456789012', 'password', 'password1',
    'password123', 'password1234', 'password12345', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'qwerty', 'qwerty123',
    'qwertyuiop', 'qwerty123456', 'abc123', 'abc123456', 'abcd1234', 'abcdefgh', 'abcdefghij', 'abcdefghijkl',
    'iloveyou', 'iloveyou123', 'admin', 'admin123', 'admin1234', 'administrator', 'administrador', 'root', 'toor',
    'welcome', 'welcome1', 'welcome123', 'letmein', 'letmein123', 'monkey', 'dragon', 'sunshine', 'princess',
    'football', 'baseball', 'superman', 'batman', 'trustno1', 'master', 'shadow', 'michael', 'jennifer', 'charlie',
    'jordan23', 'freedom', 'whatever', 'starwars', 'computer', 'internet', 'senha', 'senha123', 'senha1234',
    'senha12345', 'senha123456', 'minhasenha', 'mudar123', 'mudar1234', 'mudarsenha', 'trocar123', 'brasil', 'brasil123',
    'brasil2026', 'flamengo', 'corinthians', 'palmeiras', 'saopaulo', 'vasco', 'gremio', 'santos', 'cruzeiro',
    'clinica', 'clinica123', 'clinica1234', 'veterinaria', 'veterinaria123', 'petshop', 'petshop123', 'hospital',
    'hospital123', 'recepcao', 'recepcao123', 'financeiro', 'financeiro123', 'usuario', 'usuario123', 'teste',
    'teste123', 'teste1234', 'test1234', 'testing123', 'temp1234', 'temporaria', 'default', 'changeme', 'changeme123',
    '000000', '00000000', '111111', '11111111', '121212', '123123', '123123123', '123321', '1234', '12345', '123qwe',
    '1q2w3e4r', '1q2w3e4r5t', '1qaz2wsx', 'zaq12wsx', 'asdfgh', 'asdfghjkl', 'zxcvbnm', 'qazwsx', 'qazwsxedc',
    '654321', '987654321', '666666', '696969', '7777777', '88888888', '11223344', '112233', 'aaaaaa', 'aaaaaaaa',
    'aaaaaaaaaaaa', 'abcabc', 'ababab', 'passpass', 'pass1234', 'secret', 'secret123', 'login', 'login123', 'access',
    'access123', 'hello', 'hello123', 'hello1234', 'summer', 'summer2026', 'winter2026', 'january', 'december',
    'cheese', 'pepper', 'ginger', 'cookie', 'banana', 'orange', 'purple', 'yellow', 'silver', 'golden', 'killer',
    'hunter', 'soccer', 'hockey', 'tennis', 'george', 'thomas', 'daniel', 'andrew', 'joshua', 'matthew', 'ashley',
    'amanda', 'nicole', 'jessica', 'maria', 'mariana', 'juliana', 'fernanda', 'carlos', 'ricardo', 'rodrigo',
    'gabriel', 'lucas', 'pedro', 'paulo', 'joao', 'jose', 'antonio', 'francisco', 'marcos', 'rafael', 'bruno',
    'eduardo', 'felipe', 'gustavo', 'guilherme', 'leonardo', 'thiago', 'vinicius', 'amor', 'amor123', 'deus',
    'jesus', 'jesus123', 'familia', 'familia123', 'dinheiro', 'natal', 'ola123', 'oi12345', 'shadow123',
    'pokemon', 'naruto', 'dragonball', 'minecraft', 'fortnite', 'samsung', 'iphone', 'google', 'facebook',
    'instagram', 'whatsapp', 'microsoft', 'windows', 'linux', 'ubuntu', 'oracle', 'postgres', 'postgresql',
    'mysql', 'server', 'servidor', 'cliente', 'empresa', 'empresa123', 'sistema', 'sistema123', 'cvghis', 'cvg-his',
    'cvghis123', 'cvghisv4', 'vetus', 'vetus123', 'senhaforte', 'senhaforte123', 'senha@123', 'senha#123',
    'senha!123', 'senha@2026', 'password!', 'password@123', 'password#1', 'passwordpassword', 'welcome@123',
    'admin@123', 'admin#123', 'admin2026', 'adminadmin', 'administrador123', 'super123', 'supervisor', 'gerente',
    'gerente123', 'medico', 'medico123', 'doutor', 'doutor123', 'doutora', 'enfermagem', 'enfermeira', 'atendente',
    'caixa123', 'balcao123', 'agenda123', 'cadastro123', 'prontuario', 'prontuario123'
  ].map((value) => value.toLowerCase())
);

const IDENTIFIER_MIN_LENGTH = 4;

function identifiersFrom(context: PasswordPolicyContext): string[] {
  const values: string[] = [];
  const push = (value: string | undefined) => {
    const normalized = value?.trim().toLowerCase();
    if (normalized && normalized.length >= IDENTIFIER_MIN_LENGTH) values.push(normalized);
  };
  push(context.username);
  push(context.displayName);
  push(context.email?.split('@')[0]);
  return values;
}

/** Synchronous rules (length, denylist, identifiers). */
export function evaluatePasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {}
): PasswordPolicyViolation[] {
  const violations: PasswordPolicyViolation[] = [];
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) violations.push('too_short');
  if (typeof password === 'string' && password.length > PASSWORD_MAX_LENGTH) violations.push('too_long');
  if (typeof password !== 'string') return violations;
  const lowered = password.toLowerCase();
  const stripped = lowered.replace(/[^a-z0-9]/g, '');
  if (COMMON_PASSWORDS.has(lowered) || COMMON_PASSWORDS.has(stripped) || /^(.)\1+$/.test(lowered)) {
    violations.push('common_password');
  }
  if (identifiersFrom(context).some((identifier) => lowered.includes(identifier))) {
    violations.push('contains_identifier');
  }
  return violations;
}

/**
 * Applies the synchronous rules first (never sends a trivially weak password
 * to a remote service), then the breach corpus when a checker is configured.
 */
export async function assertPasswordPolicy(
  password: string,
  context: PasswordPolicyContext = {},
  breachChecker?: BreachedPasswordChecker
): Promise<void> {
  const violations = evaluatePasswordPolicy(password, context);
  if (violations.length > 0) throw new PasswordPolicyError(violations);
  if (breachChecker && (await breachChecker.isBreached(password))) {
    throw new PasswordPolicyError(['breached']);
  }
}

export interface HibpRangeBreachCheckerOptions {
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  /** When the service is unreachable: allow the password (true, default) or refuse it. */
  readonly failOpen?: boolean;
  readonly logger?: PasswordPolicyLogger;
  readonly baseUrl?: string;
}

/**
 * Have I Been Pwned "range" check with k-anonymity: the password never leaves
 * the process; only the first five hex characters of its SHA-1 are sent.
 */
export class HibpRangeBreachChecker implements BreachedPasswordChecker {
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  readonly #failOpen: boolean;
  readonly #logger?: PasswordPolicyLogger;
  readonly #baseUrl: string;

  constructor(options: HibpRangeBreachCheckerOptions = {}) {
    this.#fetch = options.fetch ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 3_000;
    this.#failOpen = options.failOpen ?? true;
    this.#logger = options.logger;
    this.#baseUrl = options.baseUrl ?? 'https://api.pwnedpasswords.com/range/';
  }

  async isBreached(password: string): Promise<boolean> {
    const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await this.#fetch(`${this.#baseUrl}${prefix}`, {
        signal: controller.signal,
        headers: { 'Add-Padding': 'true', 'User-Agent': 'cvg-his-password-policy' }
      });
      if (!response.ok) throw new Error(`breach corpus answered ${response.status}`);
      const body = await response.text();
      for (const line of body.split('\n')) {
        const [candidate, count] = line.trim().split(':');
        if (candidate === suffix && Number(count) > 0) return true;
      }
      return false;
    } catch (error) {
      this.#logger?.warn('password breach check unavailable', {
        failOpen: this.#failOpen,
        error: error instanceof Error ? error.message : String(error)
      });
      if (this.#failOpen) return false;
      throw new AppError('PASSWORD_BREACH_CHECK_UNAVAILABLE', 'Password breach check is unavailable', 503);
    } finally {
      clearTimeout(timer);
    }
  }
}

/** PASSWORD_BREACH_CHECK=hibp enables the corpus check; anything else disables it. */
export function createBreachCheckerFromEnv(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  options: HibpRangeBreachCheckerOptions = {}
): BreachedPasswordChecker | undefined {
  const mode = (environment.PASSWORD_BREACH_CHECK ?? 'off').trim().toLowerCase();
  if (mode === 'hibp') {
    return new HibpRangeBreachChecker({
      ...options,
      failOpen: environment.PASSWORD_BREACH_CHECK_FAIL_CLOSED === '1' ? false : (options.failOpen ?? true)
    });
  }
  return undefined;
}

import { createHmac } from 'node:crypto';

import type {
  AuthSessionResponse,
  AuthTokens,
  LoginMfaRequiredResponse,
  RefreshSessionRequest
} from '@cvg-his-v2/shared-contracts';
import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import { BruteForceProtection } from './brute-force.js';
import { MfaService } from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService, type UserRecord } from '@cvg-his-v2/module-users';
import { AuthenticationError, ForbiddenError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccessProfile,
  AuthenticatedPrincipal,
  SessionId,
  SessionSummary,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type {
  PersistedSessionRecord,
  SessionRepository
} from './repositories/session.repository.js';

type SessionRecord = PersistedSessionRecord;

interface TokenPayload {
  readonly typ: 'access' | 'refresh';
  readonly sub: string;
  readonly account_id: string;
  readonly session_id: string;
  readonly auth_time: string;
  readonly exp: number;
  readonly nonce?: string;
}

export interface AuthServiceOptions {
  readonly secret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly users: UsersService;
  readonly staff: StaffService;
  readonly accessControl: AccessControlService;
  readonly audit: AuditService;
  readonly mfa?: MfaService;
  readonly sessionRepository?: SessionRepository;
  readonly bruteForce?: BruteForceProtection;
}

export class AuthService {
  readonly #secret: string;
  readonly #accessTokenTtlSeconds: number;
  readonly #refreshTokenTtlSeconds: number;
  readonly #users: UsersService;
  readonly #staff: StaffService;
  readonly #accessControl: AccessControlService;
  readonly #audit: AuditService;
  readonly #mfa?: MfaService;
  readonly #sessionRepository?: SessionRepository;
  readonly #bruteForce?: BruteForceProtection;
  readonly #sessions = new Map<SessionId, SessionRecord>();

  public constructor(options: AuthServiceOptions) {
    this.#secret = options.secret;
    this.#accessTokenTtlSeconds = options.accessTokenTtlSeconds;
    this.#refreshTokenTtlSeconds = options.refreshTokenTtlSeconds;
    this.#users = options.users;
    this.#staff = options.staff;
    this.#accessControl = options.accessControl;
    this.#audit = options.audit;
    this.#mfa = options.mfa;
    this.#sessionRepository = options.sessionRepository;
    this.#bruteForce = options.bruteForce;
  }

  public get mfaService(): MfaService | undefined {
    return this.#mfa;
  }

  public async login(
    input: { readonly username: string; readonly password: string },
    correlationId: string
  ): Promise<AuthSessionResponse | LoginMfaRequiredResponse> {
    const username = requireNonEmptyString(input.username, 'username');
    const password = requireNonEmptyString(input.password, 'password');

    if (this.#bruteForce?.isPasswordLocked(username)) {
      const remaining = this.#bruteForce.getRemainingLockSeconds(username);
      this.#audit.write({
        actorId: 'anonymous',
        accountId: 'acc_cvg_demo' as never,
        module: 'auth',
        action: 'login_blocked_locked',
        entityType: 'user',
        entityId: username,
        correlationId,
        payloadSummary: `Login blocked due to lockout, ${remaining}s remaining`,
        riskLevel: 'high'
      });
      throw new AuthenticationError('Account temporarily locked due to too many failed attempts');
    }

    const user = this.#users.findByUsername(username);

    if (!user || !(await this.#users.verifyPassword(user, password))) {
      if (this.#bruteForce) {
        this.#bruteForce.recordPasswordFailure(username);
      }
      this.#audit.write({
        actorId: user?.id ?? 'anonymous',
        accountId: (user?.accountId ?? 'acc_cvg_demo') as never,
        module: 'auth',
        action: 'login_failed',
        entityType: 'user',
        entityId: user?.id ?? username,
        correlationId,
        payloadSummary: 'Invalid username or password',
        riskLevel: 'medium'
      });
      throw new AuthenticationError('Invalid username or password');
    }

    if (this.#bruteForce) {
      this.#bruteForce.recordPasswordSuccess(username);
    }

    if (user.status !== 'active') {
      throw new ForbiddenError('Inactive users cannot sign in');
    }

    if (this.#mfa && this.#mfa.isMfaRequired(user.roleCodes)) {
      const mfaActive = await this.#mfa.isMfaActive(user.id);
      if (!mfaActive) {
        this.#audit.write({
          actorId: user.id,
          accountId: user.accountId,
          module: 'auth',
          action: 'login_mfa_required',
          entityType: 'user',
          entityId: user.id,
          correlationId,
          payloadSummary: `MFA required for user ${user.username} with roles: ${user.roleCodes.join(', ')}`,
          riskLevel: 'medium'
        });
        return {
          requiresMfa: true,
          userId: user.id,
          mfaMethods: ['totp']
        };
      }
    }

    return this.#completeLogin(user, correlationId);
  }

  public async completeMfaLogin(
    input: { readonly userId: string; readonly token: string },
    correlationId: string
  ): Promise<AuthSessionResponse> {
    if (!this.#mfa) {
      throw new AuthenticationError('MFA is not configured on this server');
    }

    const userId = requireNonEmptyString(input.userId, 'userId');
    const token = requireNonEmptyString(input.token, 'token');

    if (this.#bruteForce?.isMfaLocked(userId)) {
      const remaining = this.#bruteForce.getRemainingLockSeconds(userId);
      this.#audit.write({
        actorId: userId,
        accountId: 'unknown' as never,
        module: 'auth',
        action: 'mfa_blocked_locked',
        entityType: 'user',
        entityId: userId,
        correlationId,
        payloadSummary: `MFA blocked due to lockout, ${remaining}s remaining`,
        riskLevel: 'high'
      });
      throw new AuthenticationError(
        'Account temporarily locked due to too many failed MFA attempts'
      );
    }

    const isValid = await this.#mfa.verifyLogin(userId, token);
    if (!isValid) {
      if (this.#bruteForce) {
        this.#bruteForce.recordMfaFailure(userId);
      }
      this.#audit.write({
        actorId: userId,
        accountId: 'unknown' as never,
        module: 'auth',
        action: 'mfa_login_failed',
        entityType: 'user',
        entityId: userId,
        correlationId,
        payloadSummary: 'Invalid MFA TOTP code',
        riskLevel: 'high'
      });
      throw new AuthenticationError('Invalid MFA code');
    }

    if (this.#bruteForce) {
      this.#bruteForce.recordMfaSuccess(userId);
    }

    const user = this.#users.getOrThrow(userId as UserId);
    return this.#completeLogin(user, correlationId);
  }

  #completeLogin(user: UserRecord, correlationId: string): AuthSessionResponse {
    const session = this.#createSession(user);
    const principal = this.#buildPrincipal(user, session);
    const tokens = this.#createTokens(session);

    this.#audit.write({
      actorId: user.id,
      accountId: user.accountId,
      module: 'auth',
      action: 'login',
      entityType: 'session',
      entityId: session.sessionId,
      correlationId,
      payloadSummary: `User ${user.username} authenticated`,
      riskLevel: 'medium'
    });

    return {
      ...tokens,
      principal
    };
  }

  public refresh(input: RefreshSessionRequest, correlationId: string): AuthSessionResponse {
    const token = requireNonEmptyString(input.refreshToken, 'refreshToken');
    const payload = this.#verifyToken(token, 'refresh');
    const session = this.#requireActiveSession(payload.session_id as SessionId);

    if (payload.nonce !== session.refreshNonce) {
      throw new AuthenticationError('Refresh token has been rotated');
    }

    const rotatedSession: SessionRecord = {
      ...session,
      refreshNonce: createCorrelationId('rnonce'),
      expiresAt: futureIso(this.#accessTokenTtlSeconds),
      refreshExpiresAt: futureIso(this.#refreshTokenTtlSeconds),
      active: true
    };
    this.#sessions.set(rotatedSession.sessionId, rotatedSession);

    if (this.#sessionRepository) {
      this.#sessionRepository.update(rotatedSession).catch((err) => {
        console.error('Failed to update session in database:', err);
      });
    }

    const user = this.#users.getOrThrow(rotatedSession.userId);
    const principal = this.#buildPrincipal(user, rotatedSession);
    const tokens = this.#createTokens(rotatedSession);

    this.#audit.write({
      actorId: user.id,
      accountId: user.accountId,
      module: 'auth',
      action: 'refresh',
      entityType: 'session',
      entityId: rotatedSession.sessionId,
      correlationId,
      payloadSummary: 'Session refreshed',
      riskLevel: 'low'
    });

    return {
      ...tokens,
      principal
    };
  }

  public logout(
    input: { readonly refreshToken?: string; readonly accessToken?: string },
    correlationId: string
  ): void {
    const token = input.refreshToken ?? input.accessToken;
    if (!token) {
      throw new AuthenticationError('A token is required to logout');
    }

    const type = input.refreshToken ? 'refresh' : 'access';
    const payload = this.#verifyToken(token, type);
    const session = this.#requireActiveSession(payload.session_id as SessionId);
    const revokedAt = nowIso();

    this.#sessions.set(session.sessionId, {
      ...session,
      active: false,
      revokedAt
    });

    if (this.#sessionRepository) {
      this.#sessionRepository
        .update({
          ...session,
          active: false
        })
        .catch((err) => {
          console.error('Failed to revoke session in database:', err);
        });
    }

    if (this.#bruteForce) {
      this.#bruteForce.recordSuccess(session.userId);
    }

    this.#audit.write({
      actorId: session.userId,
      accountId: session.accountId,
      module: 'auth',
      action: 'logout',
      entityType: 'session',
      entityId: session.sessionId,
      correlationId,
      payloadSummary: 'Session revoked by logout',
      riskLevel: 'low'
    });
  }

  public authenticateAccessToken(accessToken: string): AuthenticatedPrincipal {
    const payload = this.#verifyToken(accessToken, 'access');
    const session = this.#requireActiveSession(payload.session_id as SessionId);
    const user = this.#users.getOrThrow(payload.sub as UserId);
    return this.#buildPrincipal(user, session);
  }

  public getSession(accessToken: string): SessionSummary {
    const payload = this.#verifyToken(accessToken, 'access');
    return this.#requireActiveSession(payload.session_id as SessionId);
  }

  public listSessions(): readonly SessionSummary[] {
    return Array.from(this.#sessions.values());
  }

  public async hydrateFromRepository(userIds?: readonly UserId[]): Promise<void> {
    if (!this.#sessionRepository) {
      return;
    }

    const targetUserIds = userIds ?? this.#users.list().map((user) => user.id);

    for (const userId of targetUserIds) {
      const user = this.#users.getOrThrow(userId);
      const persistedSessions = await this.#sessionRepository.findByUserId(userId);

      for (const session of persistedSessions) {
        const existing = this.#sessions.get(session.sessionId);
        this.#sessions.set(session.sessionId, {
          ...(existing ?? session),
          ...session,
          roleCodes: user.roleCodes,
          refreshNonce: session.refreshNonce || existing?.refreshNonce || createCorrelationId('rnonce')
        });
      }
    }
  }

  #createSession(user: UserRecord): SessionRecord {
    const authTime = nowIso();
    const session: SessionRecord = {
      sessionId: createCorrelationId('sess') as SessionId,
      userId: user.id,
      accountId: user.accountId,
      createdAt: authTime,
      authTime,
      expiresAt: futureIso(this.#accessTokenTtlSeconds),
      refreshExpiresAt: futureIso(this.#refreshTokenTtlSeconds),
      active: true,
      roleCodes: user.roleCodes,
      refreshNonce: createCorrelationId('rnonce')
    };

    this.#sessions.set(session.sessionId, session);

    if (this.#sessionRepository) {
      this.#sessionRepository.create(session).catch((err) => {
        console.error('Failed to persist session to database:', err);
      });
    }

    return session;
  }

  #buildPrincipal(user: UserRecord, session: SessionRecord): AuthenticatedPrincipal {
    const staff = this.#staff.findByUserId(user.id);
    const access: AccessProfile = this.#accessControl.createProfile({
      roleCodes: session.roleCodes,
      department: staff?.department,
      accountId: user.accountId,
      userId: user.id
    });

    return {
      user: {
        id: user.id,
        accountId: user.accountId,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        staffId: user.staffId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      staff,
      session,
      access
    };
  }

  #createTokens(session: SessionRecord): AuthTokens {
    const accessToken = this.#signToken({
      typ: 'access',
      sub: session.userId,
      account_id: session.accountId,
      session_id: session.sessionId,
      auth_time: session.authTime,
      exp: toEpochSeconds(session.expiresAt)
    });

    const refreshToken = this.#signToken({
      typ: 'refresh',
      sub: session.userId,
      account_id: session.accountId,
      session_id: session.sessionId,
      auth_time: session.authTime,
      exp: toEpochSeconds(session.refreshExpiresAt),
      nonce: session.refreshNonce
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer'
    };
  }

  #signToken(payload: TokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.#secret).update(encodedPayload).digest('base64url');

    return `${encodedPayload}.${signature}`;
  }

  #verifyToken(token: string, expectedType: 'access' | 'refresh'): TokenPayload {
    const [encodedPayload, providedSignature] = token.split('.');
    if (!encodedPayload || !providedSignature) {
      throw new AuthenticationError('Malformed token');
    }

    const expectedSignature = createHmac('sha256', this.#secret)
      .update(encodedPayload)
      .digest('base64url');

    if (providedSignature !== expectedSignature) {
      throw new AuthenticationError('Invalid token signature');
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as TokenPayload;

    if (payload.typ !== expectedType) {
      throw new AuthenticationError('Unexpected token type');
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new AuthenticationError('Token expired');
    }

    return payload;
  }

  #requireActiveSession(sessionId: SessionId): SessionRecord {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found', { sessionId });
    }

    if (!session.active || session.revokedAt) {
      throw new AuthenticationError('Session is not active', { sessionId });
    }

    return session;
  }
}

function futureIso(ttlSeconds: number): string {
  return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

function toEpochSeconds(isoDate: string): number {
  return Math.floor(new Date(isoDate).getTime() / 1000);
}

export type {
  PersistedSessionRecord,
  SessionRepository,
  UpdateSessionParams
} from './repositories/session.repository.js';
export { DatabaseSessionRepository } from './repositories/database-session.repository.js';
export { BruteForceProtection } from './brute-force.js';

// OIDC/SSO
export {
  type OIDCConfig,
  type PKCEPair,
  type OIDCAuthorizationRequest,
  type OIDCTokenResponse,
  type OIDCUserInfo,
  generatePKCE,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  validateOIDCConfig
} from './oidc.js';

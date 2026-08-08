import { createHmac, randomUUID } from 'node:crypto';

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
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
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
  readonly verifierSecrets?: readonly string[];
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
  readonly #verifierSecrets: readonly string[];
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
  readonly #pendingMfaLogins = new Map<
    string,
    { readonly accountId: string; readonly userId: UserId; readonly expiresAt: number }
  >();

  public constructor(options: AuthServiceOptions) {
    this.#secret = options.secret;
    this.#verifierSecrets = [options.secret, ...(options.verifierSecrets ?? [])].filter(
      (value, index, array) => value.length > 0 && array.indexOf(value) === index
    );
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
    input: { readonly username: string; readonly password: string; readonly accountId?: string },
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

    const user = this.#users.findByUsername(username, input.accountId as never);

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
      const challengeId = randomUUID();
      const isMfaActive = await this.#runAsUser(user, correlationId, () =>
        this.#mfa!.isMfaActive(user.accountId, user.id)
      );
      this.#pendingMfaLogins.set(challengeId, {
        accountId: user.accountId,
        userId: user.id,
        expiresAt: Date.now() + 5 * 60 * 1000
      });
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
        mfaMethods: isMfaActive ? ['totp'] : [],
        challengeId,
        enrollmentRequired: !isMfaActive
      };
    }

    return this.#runAsUser(user, correlationId, () => this.#completeLogin(user, correlationId));
  }

  public async completeMfaLogin(
    input: { readonly userId: string; readonly token: string; readonly challengeId: string },
    correlationId: string
  ): Promise<AuthSessionResponse> {
    if (!this.#mfa) {
      throw new AuthenticationError('MFA is not configured on this server');
    }

    const userId = requireNonEmptyString(input.userId, 'userId');
    const token = requireNonEmptyString(input.token, 'token');
    const challengeId = requireNonEmptyString(input.challengeId, 'challengeId');
    const userKey = userId as UserId;
    const pendingEntry = this.#pendingMfaLogins.get(challengeId);
    if (!pendingEntry || pendingEntry.userId !== userKey || pendingEntry.expiresAt < Date.now()) {
      this.#pendingMfaLogins.delete(challengeId);
      throw new AuthenticationError('MFA login challenge is missing or expired');
    }

    if (this.#bruteForce?.isMfaLocked(userId)) {
      const remaining = this.#bruteForce.getRemainingLockSeconds(userId);
      this.#audit.write({
        actorId: userId,
        accountId: pendingEntry.accountId as never,
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

    const pendingUser = this.#users.getOrThrow(userKey);
    const isValid = await this.#runAsUser(pendingUser, correlationId, () =>
      this.#mfa!.verifyLogin(pendingEntry.accountId, userId, token)
    );
    if (!isValid) {
      if (this.#bruteForce) {
        this.#bruteForce.recordMfaFailure(userId);
      }
      this.#audit.write({
        actorId: userId,
        accountId: pendingEntry.accountId as never,
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

    this.#pendingMfaLogins.delete(challengeId);
    const user = this.#users.getOrThrow(userKey);
    return this.#runAsUser(user, correlationId, () => this.#completeLogin(user, correlationId));
  }

  #runAsUser<T>(user: UserRecord, correlationId: string, operation: () => T): T {
    return runWithTenantContext(
      {
        tenantId: '00000000-0000-0000-0000-000000000001',
        accountId: user.accountId,
        userId: user.id,
        correlationId
      },
      operation
    );
  }

  public getPendingMfaEnrollmentUser(challengeId: string): UserRecord {
    const challenge = this.#pendingMfaLogins.get(challengeId);
    if (!challenge || challenge.expiresAt < Date.now()) {
      this.#pendingMfaLogins.delete(challengeId);
      throw new AuthenticationError('MFA login challenge is missing or expired');
    }
    return this.#users.getOrThrow(challenge.userId);
  }

  async #completeLogin(user: UserRecord, correlationId: string): Promise<AuthSessionResponse> {
    const session = await this.#createSession(user);
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

  public async refresh(
    input: RefreshSessionRequest,
    correlationId: string
  ): Promise<AuthSessionResponse> {
    const token = requireNonEmptyString(input.refreshToken, 'refreshToken');
    const payload = this.#verifyToken(token, 'refresh');
    const session = this.#requireActiveSession(payload.session_id as SessionId, 'refresh');

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
    if (this.#sessionRepository) {
      await this.#runAsUser(this.#users.getOrThrow(session.userId), correlationId, () =>
        this.#sessionRepository!.update(rotatedSession)
      );
    }
    this.#sessions.set(rotatedSession.sessionId, rotatedSession);

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

  public async logout(
    input: { readonly refreshToken?: string; readonly accessToken?: string },
    correlationId: string
  ): Promise<void> {
    const token = input.refreshToken ?? input.accessToken;
    if (!token) {
      throw new AuthenticationError('A token is required to logout');
    }

    const type = input.refreshToken ? 'refresh' : 'access';
    const payload = this.#verifyToken(token, type);
    const session = this.#requireActiveSession(payload.session_id as SessionId, type);
    const revokedAt = nowIso();

    const revokedSession = {
      ...session,
      active: false,
      revokedAt
    };

    if (this.#sessionRepository) {
      await this.#runAsUser(this.#users.getOrThrow(session.userId), correlationId, () =>
        this.#sessionRepository!.update(revokedSession)
      );
    }
    this.#sessions.set(session.sessionId, revokedSession);

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
    const session = this.#requireActiveSession(payload.session_id as SessionId, 'access');
    const user = this.#users.getOrThrow(payload.sub as UserId);
    return this.#buildPrincipal(user, session);
  }

  public getSession(accessToken: string): SessionSummary {
    const payload = this.#verifyToken(accessToken, 'access');
    return this.#requireActiveSession(payload.session_id as SessionId, 'access');
  }

  public listSessions(): readonly SessionSummary[] {
    return Array.from(this.#sessions.values());
  }

  public listSessionsForUser(userId: UserId): readonly SessionSummary[] {
    return Array.from(this.#sessions.values())
      .filter((session) => session.userId === userId)
      .reverse();
  }

  public async revokeOtherSessions(
    currentSessionId: SessionId,
    correlationId: string
  ): Promise<number> {
    const currentSession = this.#requireActiveSession(currentSessionId, 'access');
    let revoked = 0;

    for (const session of this.#sessions.values()) {
      if (session.userId !== currentSession.userId || session.sessionId === currentSessionId) {
        continue;
      }
      if (!session.active || session.revokedAt) {
        continue;
      }

      const revokedAt = nowIso();
      const revokedSession = {
        ...session,
        active: false,
        revokedAt
      };

      if (this.#sessionRepository) {
        await this.#runAsUser(
          this.#users.getOrThrow(currentSession.userId),
          correlationId,
          () => this.#sessionRepository!.update(revokedSession)
        );
      }
      this.#sessions.set(session.sessionId, revokedSession);
      revoked += 1;
    }

    this.#audit.write({
      actorId: currentSession.userId,
      accountId: currentSession.accountId,
      module: 'auth',
      action: 'logout_other_sessions',
      entityType: 'session',
      entityId: currentSessionId,
      correlationId,
      payloadSummary: `Revoked ${revoked} other active sessions`,
      riskLevel: 'medium'
    });

    return revoked;
  }

  public async revokeSessionForUser(
    currentSessionId: SessionId,
    targetSessionId: SessionId,
    correlationId: string
  ): Promise<boolean> {
    const currentSession = this.#requireActiveSession(currentSessionId, 'access');
    const targetSession = this.#sessions.get(targetSessionId);

    if (!targetSession || targetSession.userId !== currentSession.userId) {
      throw new NotFoundError('Session not found');
    }

    if (targetSession.sessionId === currentSessionId) {
      throw new ForbiddenError('Current session cannot revoke itself through this operation');
    }

    if (!targetSession.active || targetSession.revokedAt) {
      return false;
    }

    const revokedAt = nowIso();
    const revokedSession = {
      ...targetSession,
      active: false,
      revokedAt
    };

    if (this.#sessionRepository) {
      await this.#runAsUser(
        this.#users.getOrThrow(currentSession.userId),
        correlationId,
        () => this.#sessionRepository!.update(revokedSession)
      );
    }
    this.#sessions.set(targetSession.sessionId, revokedSession);

    this.#audit.write({
      actorId: currentSession.userId,
      accountId: currentSession.accountId,
      module: 'auth',
      action: 'logout_session',
      entityType: 'session',
      entityId: targetSessionId,
      correlationId,
      payloadSummary: `Revoked session ${targetSessionId}`,
      riskLevel: 'medium'
    });

    return true;
  }

  public async hydrateFromRepository(userIds?: readonly UserId[]): Promise<void> {
    if (!this.#sessionRepository) {
      return;
    }

    const targetUserIds = userIds ?? this.#users.list().map((user) => user.id);

    for (const userId of targetUserIds) {
      const user = this.#users.getOrThrow(userId);
      const persistedSessions = await this.#runAsUser(user, createCorrelationId('hydrate'), () =>
        this.#sessionRepository!.findByUserId(userId)
      );

      for (const session of persistedSessions) {
        const existing = this.#sessions.get(session.sessionId);
        this.#sessions.set(session.sessionId, {
          ...(existing ?? session),
          ...session,
          roleCodes: user.roleCodes,
          refreshNonce:
            session.refreshNonce || existing?.refreshNonce || createCorrelationId('rnonce')
        });
      }
    }
  }

  async #createSession(user: UserRecord): Promise<SessionRecord> {
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

    if (this.#sessionRepository) {
      await this.#sessionRepository.create(session);
    }

    this.#sessions.set(session.sessionId, session);

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

    const isValidSignature = this.#verifierSecrets.some((secret) => {
      const expectedSignature = createHmac('sha256', secret)
        .update(encodedPayload)
        .digest('base64url');
      return providedSignature === expectedSignature;
    });

    if (!isValidSignature) {
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

  #requireActiveSession(sessionId: SessionId, tokenType: 'access' | 'refresh'): SessionRecord {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found', { sessionId });
    }

    if (!session.active || session.revokedAt) {
      throw new AuthenticationError('Session is not active', { sessionId });
    }

    const expiry = tokenType === 'refresh' ? session.refreshExpiresAt : session.expiresAt;
    if (new Date(expiry).getTime() <= Date.now()) {
      const revokedAt = nowIso();
      this.#sessions.set(sessionId, {
        ...session,
        active: false,
        revokedAt
      });
      if (this.#sessionRepository) {
        this.#sessionRepository
          .update({
            sessionId,
            active: false,
            revokedAt
          })
          .catch((err) => {
            console.error('Failed to expire session in database:', err);
          });
      }
      throw new AuthenticationError('Session expired', { sessionId });
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

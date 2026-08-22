import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

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
import { createCorrelationId, createSecureId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import type {
  PersistedSessionRecord,
  SessionRepository
} from './repositories/session.repository.js';

type SessionRecord = PersistedSessionRecord;

interface PendingMfaLogin {
  readonly accountId: string;
  readonly userId: UserId;
  readonly expiresAt: number;
  readonly bruteForce: BruteForceProtection | undefined;
}

// AuthService instances in the same process must see the same one-time challenge.
const pendingMfaLogins = new Map<string, PendingMfaLogin>();

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
      // Deliberately generic: a lockout-specific message would confirm to an
      // attacker that the username exists. The real reason stays in the audit trail.
      throw new AuthenticationError('Invalid username or password');
    }

    const user = await this.#users.resolveByUsername(username, input.accountId as never);

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
      pendingMfaLogins.set(challengeId, {
        accountId: user.accountId,
        userId: user.id,
        expiresAt: Date.now() + 5 * 60 * 1000,
        bruteForce: this.#bruteForce
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
    const pendingEntry = pendingMfaLogins.get(challengeId);
    if (!pendingEntry || pendingEntry.userId !== userKey || pendingEntry.expiresAt < Date.now()) {
      pendingMfaLogins.delete(challengeId);
      throw new AuthenticationError('MFA login challenge is missing or expired');
    }
    const bruteForce = pendingEntry.bruteForce;

    if (bruteForce?.isMfaLocked(userId)) {
      const remaining = bruteForce.getRemainingLockSeconds(userId);
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
    pendingMfaLogins.delete(challengeId);

    const pendingUser = this.#users.getOrThrow(userKey);
    const isValid = await this.#runAsUser(pendingUser, correlationId, () =>
      this.#mfa!.verifyLogin(pendingEntry.accountId, userId, token)
    );
    if (!isValid) {
      if (bruteForce) {
        bruteForce.recordMfaFailure(userId);
      }
      if (pendingEntry.expiresAt >= Date.now()) {
        pendingMfaLogins.set(challengeId, pendingEntry);
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

    if (bruteForce) {
      bruteForce.recordMfaSuccess(userId);
    }

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
    const challenge = pendingMfaLogins.get(challengeId);
    if (!challenge || challenge.expiresAt < Date.now()) {
      pendingMfaLogins.delete(challengeId);
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
    const { session, user } = await this.#loadAuthoritativeSession(
      payload,
      'refresh',
      correlationId
    );

    if (payload.nonce !== session.refreshNonce) {
      throw new AuthenticationError('Refresh token has been rotated');
    }

    const refreshNonce = createSecureId('rnonce');
    const expiresAt = futureIso(this.#accessTokenTtlSeconds);
    const refreshExpiresAt = futureIso(this.#refreshTokenTtlSeconds);
    let rotatedSession: SessionRecord;
    if (this.#sessionRepository) {
      const persisted = await this.#runAsUser(user, correlationId, () =>
        this.#sessionRepository!.rotateRefreshNonce({
          sessionId: session.sessionId,
          expectedRefreshNonce: session.refreshNonce,
          refreshNonce,
          expiresAt,
          refreshExpiresAt
        })
      );
      if (!persisted) {
        throw new AuthenticationError('Refresh token has been rotated');
      }
      rotatedSession = persisted;
    } else {
      rotatedSession = {
        ...session,
        refreshNonce,
        expiresAt,
        refreshExpiresAt,
        active: true
      };
    }
    this.#sessions.set(rotatedSession.sessionId, rotatedSession);

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
    const { session, user } = await this.#loadAuthoritativeSession(
      payload,
      type,
      correlationId
    );
    const revokedAt = nowIso();

    const revokedSession = {
      ...session,
      active: false,
      revokedAt
    };

    if (this.#sessionRepository) {
      await this.#runAsUser(user, correlationId, () =>
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

  /**
   * Synchronizes repository-authoritative user/session state for the existing
   * synchronous authentication surface. API request handling must await this
   * before calling authenticateAccessToken when persistence is configured.
   */
  public async synchronizeAccessToken(
    accessToken: string,
    correlationId: string
  ): Promise<void> {
    const payload = this.#verifyToken(accessToken, 'access');
    await this.#loadAuthoritativeSession(payload, 'access', correlationId);
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
    const { session: currentSession, user } = await this.#loadCurrentSessionForMutation(
      currentSessionId,
      correlationId
    );
    const candidateSessions = this.#sessionRepository
      ? await this.#runAsUser(user, correlationId, () =>
          this.#sessionRepository!.findByUserId(currentSession.userId)
        )
      : Array.from(this.#sessions.values());
    let revoked = 0;

    for (const session of candidateSessions) {
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
        await this.#runAsUser(user, correlationId, () =>
          this.#sessionRepository!.update(revokedSession)
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
    const { session: currentSession, user } = await this.#loadCurrentSessionForMutation(
      currentSessionId,
      correlationId
    );
    const targetSession = this.#sessionRepository
      ? await this.#runAsUser(user, correlationId, () =>
          this.#sessionRepository!.findById(targetSessionId)
        )
      : this.#sessions.get(targetSessionId);

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
      await this.#runAsUser(user, correlationId, () =>
        this.#sessionRepository!.update(revokedSession)
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
            session.refreshNonce || existing?.refreshNonce || createSecureId('rnonce')
        });
      }
    }
  }

  async #loadAuthoritativeSession(
    payload: TokenPayload,
    tokenType: 'access' | 'refresh',
    correlationId: string
  ): Promise<{ readonly session: SessionRecord; readonly user: UserRecord }> {
    if (!this.#sessionRepository) {
      const session = this.#requireActiveSession(payload.session_id as SessionId, tokenType);
      this.#assertTokenSessionMatch(payload, session);
      return { session, user: this.#users.getOrThrow(session.userId) };
    }

    const session = await this.#runAsTokenPayload(payload, correlationId, () =>
      this.#sessionRepository!.findById(payload.session_id as SessionId)
    );
    if (!session) {
      throw new AuthenticationError('Session is not active');
    }

    this.#assertTokenSessionMatch(payload, session);
    if (!session.active || session.revokedAt) {
      this.#sessions.set(session.sessionId, session);
      throw new AuthenticationError('Session is not active');
    }

    const expiry = tokenType === 'refresh' ? session.refreshExpiresAt : session.expiresAt;
    if (new Date(expiry).getTime() <= Date.now()) {
      const expiredSession: SessionRecord = {
        ...session,
        active: false,
        revokedAt: nowIso()
      };
      await this.#runAsTokenPayload(payload, correlationId, () =>
        this.#sessionRepository!.update(expiredSession)
      );
      this.#sessions.set(expiredSession.sessionId, expiredSession);
      throw new AuthenticationError('Session expired');
    }

    const user = await this.#runAsTokenPayload(payload, correlationId, () =>
      this.#users.resolveById(session.userId, session.accountId)
    );
    if (!user || user.status !== 'active') {
      throw new AuthenticationError('Session is not active');
    }

    this.#sessions.set(session.sessionId, session);
    return { session, user };
  }

  async #loadCurrentSessionForMutation(
    sessionId: SessionId,
    correlationId: string
  ): Promise<{ readonly session: SessionRecord; readonly user: UserRecord }> {
    const cachedSession = this.#requireActiveSession(sessionId, 'access');
    const user = await this.#runAsUser(
      this.#users.getOrThrow(cachedSession.userId),
      correlationId,
      () => this.#users.resolveById(cachedSession.userId, cachedSession.accountId)
    );
    if (!user || user.status !== 'active') {
      throw new AuthenticationError('Session is not active');
    }

    if (!this.#sessionRepository) {
      return { session: cachedSession, user };
    }

    const persistedSession = await this.#runAsUser(user, correlationId, () =>
      this.#sessionRepository!.findById(sessionId)
    );
    if (
      !persistedSession
      || persistedSession.userId !== cachedSession.userId
      || persistedSession.accountId !== cachedSession.accountId
      || !persistedSession.active
      || persistedSession.revokedAt
    ) {
      throw new AuthenticationError('Session is not active');
    }

    this.#sessions.set(sessionId, persistedSession);
    return { session: persistedSession, user };
  }

  #runAsTokenPayload<T>(payload: TokenPayload, correlationId: string, operation: () => T): T {
    return runWithTenantContext(
      {
        tenantId: '00000000-0000-0000-0000-000000000001',
        accountId: payload.account_id,
        userId: payload.sub,
        correlationId
      },
      operation
    );
  }

  #assertTokenSessionMatch(payload: TokenPayload, session: SessionRecord): void {
    if (session.userId !== payload.sub || session.accountId !== payload.account_id) {
      throw new AuthenticationError('Token does not match session');
    }
  }

  async #createSession(user: UserRecord): Promise<SessionRecord> {
    const authTime = nowIso();
    const session: SessionRecord = {
      sessionId: createSecureId('sess') as SessionId,
      userId: user.id,
      accountId: user.accountId,
      createdAt: authTime,
      authTime,
      expiresAt: futureIso(this.#accessTokenTtlSeconds),
      refreshExpiresAt: futureIso(this.#refreshTokenTtlSeconds),
      active: true,
      roleCodes: user.roleCodes,
      refreshNonce: createSecureId('rnonce')
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
      // Repository-synchronized user roles are authoritative. Session roles are
      // an audit snapshot and must not preserve privileges revoked after login.
      roleCodes: user.roleCodes,
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

    const providedSignatureBuffer = Buffer.from(providedSignature, 'utf8');
    const isValidSignature = this.#verifierSecrets.some((secret) => {
      const expectedSignature = createHmac('sha256', secret)
        .update(encodedPayload)
        .digest('base64url');
      const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');
      return (
        providedSignatureBuffer.length === expectedSignatureBuffer.length
        && timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
      );
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
  RotateRefreshNonceParams,
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

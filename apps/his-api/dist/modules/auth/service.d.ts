import type { IncomingHttpHeaders } from 'node:http';
export type AuthActor = {
    accountId: string;
    userId?: string;
    unitId?: string;
    role?: string;
    roles: string[];
    permissions: string[];
};
export type JwtSignOptions = {
    jwtSecret: string;
    jwtIssuer: string;
    jwtAudience: string;
    expiresIn?: number;
};
export type JwtPayload = {
    accountId: string;
    userId?: string;
    unitId?: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
};
export type ResolveActorOptions = {
    jwtSecret: string;
    jwtIssuer: string;
    jwtAudience: string[];
};
export declare function resolveActorFromHeaders(headers: IncomingHttpHeaders, options: ResolveActorOptions): AuthActor | undefined;
/**
 * Sign a JWT token with the provided payload
 */
export declare function signJwt(payload: JwtPayload, options: JwtSignOptions): string;
/**
 * Generate a secure random API key
 */
export declare function generateApiKey(): string;
/**
 * Verify a JWT token and return the payload
 */
export declare function verifyJwt(token: string, options: ResolveActorOptions): JwtPayload | undefined;
//# sourceMappingURL=service.d.ts.map
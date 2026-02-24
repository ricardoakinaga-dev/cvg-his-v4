/**
 * HTTP Reply Helpers for Standardized API Responses
 *
 * This module provides consistent response formats for the his-api:
 * - ok(data): 200 with data
 * - created(data): 201 with data
 * - paginated({items, page, pageSize, total}): 200 with pagination metadata
 * - problem(code, message, details?): Error response in Problem JSON format
 */
import type { FastifyReply } from 'fastify';
/**
 * Standard API response for single item
 */
export type ApiSuccessResponse<T> = {
    data: T;
    requestId: string;
};
/**
 * Standard paginated response
 */
export type PaginatedResponse<T> = {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
    requestId: string;
};
/**
 * Problem JSON format for error responses (RFC 7807 inspired)
 */
export type ProblemResponse = {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
};
/**
 * Send a 200 OK response with data
 *
 * @example
 * return ok(reply, request.id, { user: { id: '1', name: 'John' } });
 */
export declare function ok<T>(reply: FastifyReply, requestId: string, data: T): FastifyReply;
/**
 * Send a 201 Created response with data
 *
 * @example
 * return created(reply, request.id, { id: '1', name: 'New Resource' });
 */
export declare function created<T>(reply: FastifyReply, requestId: string, data: T): FastifyReply;
/**
 * Send a 200 OK response with paginated data
 *
 * @example
 * return paginated(reply, request.id, {
 *   items: users,
 *   page: 1,
 *   pageSize: 20,
 *   total: 100
 * });
 */
export declare function paginated<T>(reply: FastifyReply, requestId: string, input: {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}): FastifyReply;
/**
 * Send an error response in Problem JSON format
 *
 * @example
 * return problem(reply, request.id, 404, 'NOT_FOUND', 'Resource not found');
 *
 * @example
 * return problem(reply, request.id, 400, 'VALIDATION_ERROR', 'Invalid input', {
 *   field: 'email',
 *   reason: 'Invalid email format'
 * });
 */
export declare function problem(reply: FastifyReply, requestId: string, statusCode: number, code: string, message: string, details?: Record<string, unknown>): FastifyReply;
/**
 * Common problem responses for convenience
 */
export declare const problems: {
    badRequest: (reply: FastifyReply, requestId: string, message?: string, details?: Record<string, unknown>) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    unauthorized: (reply: FastifyReply, requestId: string, message?: string) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    forbidden: (reply: FastifyReply, requestId: string, message?: string) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    notFound: (reply: FastifyReply, requestId: string, message?: string) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    conflict: (reply: FastifyReply, requestId: string, message: string, details?: Record<string, unknown>) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    validationError: (reply: FastifyReply, requestId: string, message: string, details?: Record<string, unknown>) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    internalError: (reply: FastifyReply, requestId: string, message?: string) => FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
};
//# sourceMappingURL=http.d.ts.map
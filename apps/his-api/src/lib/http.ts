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
export function ok<T>(
  reply: FastifyReply,
  requestId: string,
  data: T
): FastifyReply {
  return reply.send({
    data,
    requestId
  } satisfies ApiSuccessResponse<T>);
}

/**
 * Send a 201 Created response with data
 * 
 * @example
 * return created(reply, request.id, { id: '1', name: 'New Resource' });
 */
export function created<T>(
  reply: FastifyReply,
  requestId: string,
  data: T
): FastifyReply {
  return reply.status(201).send({
    data,
    requestId
  } satisfies ApiSuccessResponse<T>);
}

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
export function paginated<T>(
  reply: FastifyReply,
  requestId: string,
  input: {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
  }
): FastifyReply {
  const totalPages = Math.ceil(input.total / input.pageSize);
  const hasMore = input.page < totalPages;

  return reply.send({
    items: input.items,
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    hasMore,
    requestId
  } satisfies PaginatedResponse<T>);
}

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
export function problem(
  reply: FastifyReply,
  requestId: string,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): FastifyReply {
  const response: ProblemResponse = {
    code,
    message,
    requestId
  };

  if (details) {
    response.details = details;
  }

  return reply.status(statusCode).send(response);
}

/**
 * Common problem responses for convenience
 */
export const problems = {
  badRequest: (reply: FastifyReply, requestId: string, message: string = 'Bad request', details?: Record<string, unknown>) =>
    problem(reply, requestId, 400, 'BAD_REQUEST', message, details),

  unauthorized: (reply: FastifyReply, requestId: string, message: string = 'Unauthorized') =>
    problem(reply, requestId, 401, 'UNAUTHORIZED', message),

  forbidden: (reply: FastifyReply, requestId: string, message: string = 'Forbidden') =>
    problem(reply, requestId, 403, 'FORBIDDEN', message),

  notFound: (reply: FastifyReply, requestId: string, message: string = 'Resource not found') =>
    problem(reply, requestId, 404, 'NOT_FOUND', message),

  conflict: (reply: FastifyReply, requestId: string, message: string, details?: Record<string, unknown>) =>
    problem(reply, requestId, 409, 'CONFLICT', message, details),

  validationError: (reply: FastifyReply, requestId: string, message: string, details?: Record<string, unknown>) =>
    problem(reply, requestId, 400, 'VALIDATION_ERROR', message, details),

  internalError: (reply: FastifyReply, requestId: string, message: string = 'Internal server error') =>
    problem(reply, requestId, 500, 'INTERNAL_ERROR', message)
};

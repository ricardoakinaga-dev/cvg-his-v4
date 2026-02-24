/**
 * HTTP Reply Helpers for Standardized API Responses
 *
 * This module provides consistent response formats for the his-api:
 * - ok(data): 200 with data
 * - created(data): 201 with data
 * - paginated({items, page, pageSize, total}): 200 with pagination metadata
 * - problem(code, message, details?): Error response in Problem JSON format
 */
/**
 * Send a 200 OK response with data
 *
 * @example
 * return ok(reply, request.id, { user: { id: '1', name: 'John' } });
 */
export function ok(reply, requestId, data) {
    return reply.send({
        data,
        requestId
    });
}
/**
 * Send a 201 Created response with data
 *
 * @example
 * return created(reply, request.id, { id: '1', name: 'New Resource' });
 */
export function created(reply, requestId, data) {
    return reply.status(201).send({
        data,
        requestId
    });
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
export function paginated(reply, requestId, input) {
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
    });
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
export function problem(reply, requestId, statusCode, code, message, details) {
    const response = {
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
    badRequest: (reply, requestId, message = 'Bad request', details) => problem(reply, requestId, 400, 'BAD_REQUEST', message, details),
    unauthorized: (reply, requestId, message = 'Unauthorized') => problem(reply, requestId, 401, 'UNAUTHORIZED', message),
    forbidden: (reply, requestId, message = 'Forbidden') => problem(reply, requestId, 403, 'FORBIDDEN', message),
    notFound: (reply, requestId, message = 'Resource not found') => problem(reply, requestId, 404, 'NOT_FOUND', message),
    conflict: (reply, requestId, message, details) => problem(reply, requestId, 409, 'CONFLICT', message, details),
    validationError: (reply, requestId, message, details) => problem(reply, requestId, 400, 'VALIDATION_ERROR', message, details),
    internalError: (reply, requestId, message = 'Internal server error') => problem(reply, requestId, 500, 'INTERNAL_ERROR', message)
};
//# sourceMappingURL=http.js.map
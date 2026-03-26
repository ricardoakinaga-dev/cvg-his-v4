export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  public constructor(
    code: string,
    message: string,
    statusCode = 500,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  public constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  public constructor(message = "Authentication required", details?: unknown) {
    super("AUTHENTICATION_ERROR", message, 401, details);
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends AppError {
  public constructor(message = "Forbidden", details?: unknown) {
    super("FORBIDDEN", message, 403, details);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  public constructor(message = "Resource not found", details?: unknown) {
    super("NOT_FOUND", message, 404, details);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  public constructor(message = "Conflict", details?: unknown) {
    super("CONFLICT", message, 409, details);
    this.name = "ConflictError";
  }
}

export function toErrorResponse(error: unknown, correlationId: string) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        code: error.code,
        message: error.message,
        details: error.details,
        correlationId,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "Unexpected error",
      correlationId,
    },
  };
}

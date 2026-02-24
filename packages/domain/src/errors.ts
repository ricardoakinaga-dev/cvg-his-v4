import { ZodError, type ZodIssue, type ZodType } from 'zod';

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ValidationErrorShape = {
  statusCode: 422;
  error: 'Unprocessable Entity';
  code: 'VALIDATION_ERROR';
  message: 'Validation failed';
  issues: ValidationIssue[];
};

function issuePathToString(issue: ZodIssue): string {
  if (issue.path.length === 0) {
    return '$';
  }

  return issue.path.join('.');
}

export function toValidationIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issuePathToString(issue),
    code: issue.code,
    message: issue.message
  }));
}

export function toValidationErrorShape(error: ZodError): ValidationErrorShape {
  return {
    statusCode: 422,
    error: 'Unprocessable Entity',
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    issues: toValidationIssues(error)
  };
}

export class DomainValidationError extends Error {
  readonly statusCode = 422 as const;
  readonly code = 'VALIDATION_ERROR' as const;
  readonly issues: ValidationIssue[];

  constructor(error: ZodError) {
    super('Validation failed');
    this.name = 'DomainValidationError';
    this.issues = toValidationIssues(error);
  }

  toJSON(): ValidationErrorShape {
    return {
      statusCode: this.statusCode,
      error: 'Unprocessable Entity',
      code: this.code,
      message: 'Validation failed',
      issues: this.issues
    };
  }
}

export function parseOrThrow422<T>(schema: ZodType<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new DomainValidationError(parsed.error);
  }

  return parsed.data;
}

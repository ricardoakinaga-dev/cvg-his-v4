import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  toErrorResponse
} from './index.js';

describe('AppError', () => {
  it('creates error with all properties', () => {
    const error = new AppError('ERR_CODE', 'Error message', 422, { field: 'value' });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('ERR_CODE');
    expect(error.message).toBe('Error message');
    expect(error.statusCode).toBe(422);
    expect(error.details).toEqual({ field: 'value' });
  });

  it('uses default statusCode 500 when not provided', () => {
    const error = new AppError('ERR_CODE', 'Error message');
    expect(error.statusCode).toBe(500);
    expect(error.details).toBeUndefined();
  });

  it('stack trace is present', () => {
    const error = new AppError('ERR_CODE', 'Error message');
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('AppError');
  });
});

describe('ValidationError', () => {
  it('has correct code, statusCode and name', () => {
    const error = new ValidationError('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Invalid input');
  });

  it('passes details through', () => {
    const details = { field: 'email', reason: 'required' };
    const error = new ValidationError('Invalid input', details);
    expect(error.details).toEqual(details);
  });

  it('is instance of AppError', () => {
    const error = new ValidationError('Invalid input');
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('AuthenticationError', () => {
  it('has correct code, statusCode and default message', () => {
    const error = new AuthenticationError();
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Authentication required');
    expect(error.name).toBe('AuthenticationError');
  });

  it('accepts custom message', () => {
    const error = new AuthenticationError('Token expired');
    expect(error.message).toBe('Token expired');
  });

  it('passes details through', () => {
    const error = new AuthenticationError('Invalid', { token: 'expired' });
    expect(error.details).toEqual({ token: 'expired' });
  });

  it('is instance of AppError', () => {
    const error = new AuthenticationError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ForbiddenError', () => {
  it('has correct code, statusCode and default message', () => {
    const error = new ForbiddenError();
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe('Forbidden');
    expect(error.name).toBe('ForbiddenError');
  });

  it('accepts custom message', () => {
    const error = new ForbiddenError('Insufficient permissions');
    expect(error.message).toBe('Insufficient permissions');
  });

  it('is instance of AppError', () => {
    const error = new ForbiddenError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('NotFoundError', () => {
  it('has correct code, statusCode and default message', () => {
    const error = new NotFoundError();
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Resource not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('accepts custom message', () => {
    const error = new NotFoundError('Patient not found');
    expect(error.message).toBe('Patient not found');
  });

  it('is instance of AppError', () => {
    const error = new NotFoundError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('ConflictError', () => {
  it('has correct code, statusCode and default message', () => {
    const error = new ConflictError();
    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe('Conflict');
    expect(error.name).toBe('ConflictError');
  });

  it('accepts custom message', () => {
    const error = new ConflictError('Duplicate patient document');
    expect(error.message).toBe('Duplicate patient document');
  });

  it('is instance of AppError', () => {
    const error = new ConflictError();
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('toErrorResponse', () => {
  const correlationId = 'test-correlation-id-123';

  it('returns correct shape for AppError subclass', () => {
    const error = new NotFoundError('Patient not found');
    const response = toErrorResponse(error, correlationId);

    expect(response).toEqual({
      statusCode: 404,
      body: {
        code: 'NOT_FOUND',
        message: 'Patient not found',
        details: undefined,
        correlationId
      }
    });
  });

  it('returns correct shape for ValidationError with details', () => {
    const details = { field: 'email' };
    const error = new ValidationError('Invalid email', details);
    const response = toErrorResponse(error, correlationId);

    expect(response.statusCode).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.message).toBe('Invalid email');
    expect(response.body.details).toEqual(details);
    expect(response.body.correlationId).toBe(correlationId);
  });

  it('returns 500 INTERNAL_ERROR for plain Error', () => {
    const error = new Error('Something went wrong');
    const response = toErrorResponse(error, correlationId);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected error',
      correlationId
    });
  });

  it('returns 500 INTERNAL_ERROR for non-error value', () => {
    const response = toErrorResponse('not an error', correlationId);

    expect(response.statusCode).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
    expect(response.body.message).toBe('Unexpected error');
    expect(response.body.correlationId).toBe(correlationId);
  });

  it('returns 500 INTERNAL_ERROR for null', () => {
    const response = toErrorResponse(null, correlationId);

    expect(response.statusCode).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 INTERNAL_ERROR for undefined', () => {
    const response = toErrorResponse(undefined, correlationId);

    expect(response.statusCode).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 INTERNAL_ERROR for object without AppError', () => {
    const error = { reason: 'custom' };
    const response = toErrorResponse(error, correlationId);

    expect(response.statusCode).toBe(500);
    expect(response.body.code).toBe('INTERNAL_ERROR');
  });

  it('includes all AppError fields in response', () => {
    const details = { items: ['a', 'b'] };
    const error = new ConflictError('Duplicate entry', details);
    const response = toErrorResponse(error, 'corr-abc');

    expect(response).toEqual({
      statusCode: 409,
      body: {
        code: 'CONFLICT',
        message: 'Duplicate entry',
        details: { items: ['a', 'b'] },
        correlationId: 'corr-abc'
      }
    });
  });
});

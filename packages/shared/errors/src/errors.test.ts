import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  toErrorResponse,
} from './index.js';

describe('errors module', () => {
  describe('AppError', () => {
    it('creates error with all fields', () => {
      const error = new AppError('TEST_ERROR', 'Test message', 422, { foo: 'bar' });
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ foo: 'bar' });
      expect(error.name).toBe('AppError');
    });

    it('defaults to 500 status code', () => {
      const error = new AppError('TEST', 'Test');
      expect(error.statusCode).toBe(500);
    });

    it('is instanceof Error', () => {
      const error = new AppError('TEST', 'Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('creates with code VALIDATION_ERROR', () => {
      const error = new ValidationError('Field is required', { field: 'name' });
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Field is required');
      expect(error.details).toEqual({ field: 'name' });
      expect(error.name).toBe('ValidationError');
    });

    it('is instanceof AppError', () => {
      const error = new ValidationError('bad');
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('creates with default message', () => {
      const error = new AuthenticationError();
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('creates with custom message', () => {
      const error = new AuthenticationError('Token expired');
      expect(error.message).toBe('Token expired');
    });

    it('is instanceof AppError', () => {
      const error = new AuthenticationError();
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    it('creates with default message', () => {
      const error = new ForbiddenError();
      expect(error.code).toBe('FORBIDDEN');
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('is instanceof AppError', () => {
      const error = new ForbiddenError();
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('creates with default message', () => {
      const error = new NotFoundError();
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
    });

    it('is instanceof AppError', () => {
      const error = new NotFoundError();
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('ConflictError', () => {
    it('creates with default message', () => {
      const error = new ConflictError();
      expect(error.code).toBe('CONFLICT');
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Conflict');
    });

    it('is instanceof AppError', () => {
      const error = new ConflictError();
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('toErrorResponse', () => {
    it('formats AppError correctly', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });
      const response = toErrorResponse(error, 'corr-123');
      expect(response.statusCode).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.message).toBe('Invalid input');
      expect(response.body.details).toEqual({ field: 'email' });
      expect(response.body.correlationId).toBe('corr-123');
    });

    it('formats non-AppError as INTERNAL_ERROR', () => {
      const error = new Error('Unexpected');
      const response = toErrorResponse(error, 'corr-456');
      expect(response.statusCode).toBe(500);
      expect(response.body.code).toBe('INTERNAL_ERROR');
      expect(response.body.message).toBe('Unexpected error');
      expect(response.body.correlationId).toBe('corr-456');
    });

    it('handles null as unknown error', () => {
      const response = toErrorResponse(null, 'corr-789');
      expect(response.statusCode).toBe(500);
      expect(response.body.code).toBe('INTERNAL_ERROR');
    });

    it('preserves all error fields in response', () => {
      const error = new ConflictError('Duplicate entry', { entity: 'user', id: '123' });
      const response = toErrorResponse(error, 'corr-abc');
      expect(response.body.details).toEqual({ entity: 'user', id: '123' });
    });
  });
});

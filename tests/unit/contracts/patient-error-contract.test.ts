import { describe, expect, it } from 'vitest';

import { errorResponseSchema, patientsContract } from '../../../packages/contracts/src/index.js';
import {
  toErrorResponse,
  ValidationError
} from '../../../packages/shared/errors/src/index.js';

describe('patient API error boundary contract', () => {
  it('accepts the API serializer output for an invalid pagination request', () => {
    const response = toErrorResponse(
      new ValidationError('page must be a positive safe integer', { field: 'page' }),
      'api_contract_test'
    );

    expect(response.statusCode).toBe(400);
    expect(errorResponseSchema.parse(response.body)).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'page must be a positive safe integer',
      details: { field: 'page' },
      correlationId: 'api_contract_test'
    });
    expect(patientsContract.list.responses[400].parse(response.body)).toEqual(
      errorResponseSchema.parse(response.body)
    );
  });
});

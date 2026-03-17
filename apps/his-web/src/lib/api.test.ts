import { describe, it, expect } from 'vitest';
import { ApiError } from './api';

describe('ApiError', () => {
    it('should store status, message and requestId', () => {
        const error = new ApiError('Not Found', 404, { reqId: '123' }, { requestId: 'req-123' });

        expect(error.status).toBe(404);
        expect(error.message).toBe('Not Found');
        expect(error.requestId).toBe('req-123');
        expect(error.payload).toEqual({ reqId: '123' });
    });
});

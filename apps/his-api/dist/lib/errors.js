import { DomainValidationError } from '@cvg-his/domain';
import { ZodError } from 'zod';
function isMaybeFastifyError(error) {
    return typeof error === 'object' && error !== null && 'message' in error;
}
export function registerErrorHandler(app) {
    app.setErrorHandler((error, request, reply) => {
        const requestId = request.id;
        const isProduction = app.env.NODE_ENV === 'production';
        if (error instanceof ZodError) {
            request.log.warn({ err: error }, 'validation error');
            void reply.status(400).send({
                message: 'Validation error',
                code: 'VALIDATION_ERROR',
                requestId,
                issues: error.issues
            });
            return;
        }
        if (error instanceof DomainValidationError) {
            request.log.warn({ err: error }, 'domain validation error');
            void reply.status(422).send({
                ...error.toJSON(),
                requestId
            });
            return;
        }
        if (isMaybeFastifyError(error) && error.validation) {
            request.log.warn({ err: error }, 'request validation error');
            void reply.status(400).send({
                message: 'Request validation error',
                code: 'REQUEST_VALIDATION_ERROR',
                requestId,
                issues: error.validation
            });
            return;
        }
        const statusCode = isMaybeFastifyError(error) && error.statusCode && error.statusCode >= 400
            ? error.statusCode
            : 500;
        if (statusCode >= 500) {
            request.log.error({ err: error }, 'unhandled error');
        }
        else {
            request.log.warn({ err: error }, 'handled error');
        }
        const safeMessage = statusCode === 500
            ? 'Internal server error'
            : isMaybeFastifyError(error)
                ? error.message
                : 'Request failed';
        const payload = {
            message: safeMessage,
            requestId
        };
        if (isMaybeFastifyError(error) && error.code) {
            payload.code = error.code;
        }
        if (!isProduction && statusCode === 500 && isMaybeFastifyError(error) && error.stack) {
            payload.stack = error.stack;
        }
        void reply.status(statusCode).send({
            ...payload
        });
    });
}
//# sourceMappingURL=errors.js.map
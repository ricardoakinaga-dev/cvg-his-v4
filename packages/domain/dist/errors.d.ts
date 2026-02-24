import { ZodError, type ZodType } from 'zod';
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
export declare function toValidationIssues(error: ZodError): ValidationIssue[];
export declare function toValidationErrorShape(error: ZodError): ValidationErrorShape;
export declare class DomainValidationError extends Error {
    readonly statusCode: 422;
    readonly code: "VALIDATION_ERROR";
    readonly issues: ValidationIssue[];
    constructor(error: ZodError);
    toJSON(): ValidationErrorShape;
}
export declare function parseOrThrow422<T>(schema: ZodType<T>, payload: unknown): T;
//# sourceMappingURL=errors.d.ts.map
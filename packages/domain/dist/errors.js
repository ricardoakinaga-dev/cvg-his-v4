function issuePathToString(issue) {
    if (issue.path.length === 0) {
        return '$';
    }
    return issue.path.join('.');
}
export function toValidationIssues(error) {
    return error.issues.map((issue) => ({
        path: issuePathToString(issue),
        code: issue.code,
        message: issue.message
    }));
}
export function toValidationErrorShape(error) {
    return {
        statusCode: 422,
        error: 'Unprocessable Entity',
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        issues: toValidationIssues(error)
    };
}
export class DomainValidationError extends Error {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    issues;
    constructor(error) {
        super('Validation failed');
        this.name = 'DomainValidationError';
        this.issues = toValidationIssues(error);
    }
    toJSON() {
        return {
            statusCode: this.statusCode,
            error: 'Unprocessable Entity',
            code: this.code,
            message: 'Validation failed',
            issues: this.issues
        };
    }
}
export function parseOrThrow422(schema, payload) {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        throw new DomainValidationError(parsed.error);
    }
    return parsed.data;
}
//# sourceMappingURL=errors.js.map
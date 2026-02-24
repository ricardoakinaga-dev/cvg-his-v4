function resolveLogLevel() {
    const level = process.env.LOG_LEVEL;
    if (level === 'fatal' ||
        level === 'error' ||
        level === 'warn' ||
        level === 'info' ||
        level === 'debug' ||
        level === 'trace' ||
        level === 'silent') {
        return level;
    }
    return 'info';
}
export function buildLoggerOptions() {
    return {
        level: resolveLogLevel(),
        messageKey: 'message',
        base: {
            service: 'his-api'
        },
        redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'headers.authorization', 'headers.cookie'],
            remove: true
        }
    };
}
//# sourceMappingURL=logger.js.map
export function trim(value) {
    return value.trim();
}
export function normalizeEmail(value) {
    return trim(value).toLowerCase();
}
export function normalizePhone(value) {
    return trim(value).replace(/[\s()-]/g, '');
}
export function normalizeStringList(values) {
    return values.map((value) => trim(value)).filter((value) => value.length > 0);
}
//# sourceMappingURL=common.js.map
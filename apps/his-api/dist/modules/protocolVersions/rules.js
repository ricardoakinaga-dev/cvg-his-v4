import { buildJsonDiff } from '../protocolDiff/diff.js';
export function isDraftVersion(status) {
    return status === 'draft';
}
function isCriticalPath(path) {
    if (/^dosingGuidance(\[\d+\])?(\..+)?$/.test(path)) {
        return true;
    }
    if (/^severityLevels\[\d+\]\.contraindications(\[\d+\])?(\..+)?$/.test(path)) {
        return true;
    }
    if (/^severityLevels\[\d+\]\.escalation(\..+)?$/.test(path)) {
        return true;
    }
    return false;
}
export function getCriticalProtocolContentChanges(before, after) {
    const changes = buildJsonDiff(before, after);
    return changes.filter((change) => isCriticalPath(change.path));
}
export function hasCriticalProtocolContentChange(before, after) {
    return getCriticalProtocolContentChanges(before, after).length > 0;
}
export function hasChangeReason(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
//# sourceMappingURL=rules.js.map
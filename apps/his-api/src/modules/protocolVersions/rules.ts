import type { ProtocolContentDto } from '@cvg-his/domain';

import { buildJsonDiff } from '../protocolDiff/diff.js';
import type { ProtocolVersionStatus } from './repo.js';

export function isDraftVersion(status: ProtocolVersionStatus): boolean {
  return status === 'draft';
}

function isCriticalPath(path: string): boolean {
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

export function getCriticalProtocolContentChanges(
  before: ProtocolContentDto | Record<string, unknown>,
  after: ProtocolContentDto
): Array<{
  path: string;
  before: unknown;
  after: unknown;
  kind: 'added' | 'removed' | 'changed';
}> {
  const changes = buildJsonDiff(before, after);
  return changes.filter((change) => isCriticalPath(change.path));
}

export function hasCriticalProtocolContentChange(
  before: ProtocolContentDto | Record<string, unknown>,
  after: ProtocolContentDto
): boolean {
  return getCriticalProtocolContentChanges(before, after).length > 0;
}

export function hasChangeReason(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

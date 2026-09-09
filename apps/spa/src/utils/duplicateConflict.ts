interface ConflictDetails {
  readonly [key: string]: unknown;
}

interface ConflictBody {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly details?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Returns the conflicting record id only for the API's explicit duplicate
 * contract. Other 409s (for example, an inactive tutor) must remain ordinary
 * errors and must not send the operator to an unrelated record.
 */
export function duplicateEntityId(error: unknown, entityKey: string): string | undefined {
  if (!isRecord(error) || error.status !== 409 || !isRecord(error.body)) {
    return undefined;
  }

  const body = error.body as ConflictBody;
  if (body.code !== 'CONFLICT' || !isRecord(body.details)) {
    return undefined;
  }

  const message = [
    typeof body.message === 'string' ? body.message : '',
    error instanceof Error ? error.message : ''
  ].join(' ');
  if (!/duplicate|duplicad/i.test(message)) {
    return undefined;
  }

  const details = body.details as ConflictDetails;
  return typeof details[entityKey] === 'string' && details[entityKey].trim()
    ? details[entityKey].trim()
    : undefined;
}

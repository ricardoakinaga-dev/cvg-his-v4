import { apiRequest } from './api';

export type PixPaymentIntentStatus = 'pending' | 'completed';

export type PixStatusCode =
  | PixPaymentIntentStatus
  | 'confirmed'
  | 'expired'
  | 'cancelled'
  | 'failed'
  | 'timeout'
  | 'reversal';

type PixStatusBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface PixStatusPresentation {
  readonly code: PixStatusCode | 'unknown';
  readonly label: string;
  readonly variant: PixStatusBadgeVariant;
  readonly supported: boolean;
  readonly availabilityLabel: string;
}

export const PIX_STATUS_UNAVAILABLE_MESSAGE = 'não disponível neste contrato';

const PIX_STATUS_CONTRACT_ENTRIES = [
  {
    code: 'pending',
    label: 'Pendente',
    variant: 'warning',
    supported: true,
    availabilityLabel: 'disponível neste contrato'
  },
  {
    code: 'completed',
    label: 'Concluído',
    variant: 'success',
    supported: true,
    availabilityLabel: 'disponível neste contrato'
  },
  {
    code: 'confirmed',
    label: 'Confirmado',
    variant: 'default',
    supported: false,
    availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
  },
  {
    code: 'expired',
    label: 'Expirado',
    variant: 'default',
    supported: false,
    availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
  },
  {
    code: 'cancelled',
    label: 'Cancelado',
    variant: 'default',
    supported: false,
    availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
  },
  {
    code: 'failed',
    label: 'Falhou',
    variant: 'default',
    supported: false,
    availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
  },
  {
    code: 'timeout',
    label: 'Timeout',
    variant: 'default',
    supported: false,
    availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
  },
  {
    code: 'reversal',
    label: 'Reversão',
    variant: 'default',
    supported: false,
    availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
  }
] satisfies readonly PixStatusPresentation[];

export const PIX_STATUS_CONTRACT: readonly PixStatusPresentation[] = Object.freeze(
  PIX_STATUS_CONTRACT_ENTRIES
);

const pixStatusByCode = new Map<string, PixStatusPresentation>(
  PIX_STATUS_CONTRACT.map((status) => [status.code, status])
);

export function getPixStatusPresentation(status: string | null | undefined): PixStatusPresentation {
  const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
  return (
    pixStatusByCode.get(normalizedStatus) ?? {
      code: 'unknown',
      label: 'Status não reconhecido',
      variant: 'default',
      supported: false,
      availabilityLabel: PIX_STATUS_UNAVAILABLE_MESSAGE
    }
  );
}

export interface PixPaymentIntentResponse {
  readonly id: string;
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly provider: string;
  readonly status: PixPaymentIntentStatus;
  readonly qrCodePayload: string;
  readonly qrCodeBase64: string;
  readonly expiresAt: string;
  readonly eventId: string;
  readonly eventCorrelationId: string;
}

export interface CreatePixPaymentIntentPayload {
  readonly amount: number;
  readonly description: string;
  readonly expirationMinutes?: number;
}

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPixPaymentIntentResponse(value: unknown): value is PixPaymentIntentResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const response = value as Record<string, unknown>;
  return (
    isNonEmptyString(response.id) &&
    isNonEmptyString(response.accountId) &&
    (response.billingRecordId === undefined || isNonEmptyString(response.billingRecordId)) &&
    typeof response.amount === 'number' &&
    Number.isFinite(response.amount) &&
    response.amount > 0 &&
    response.currency === 'BRL' &&
    isNonEmptyString(response.provider) &&
    (response.status === 'pending' || response.status === 'completed') &&
    isNonEmptyString(response.qrCodePayload) &&
    isNonEmptyString(response.qrCodeBase64) &&
    BASE64_PATTERN.test(response.qrCodeBase64) &&
    isNonEmptyString(response.expiresAt) &&
    isNonEmptyString(response.eventId) &&
    isNonEmptyString(response.eventCorrelationId)
  );
}

export const pixService = {
  async createIntent(payload: CreatePixPaymentIntentPayload): Promise<PixPaymentIntentResponse> {
    const response = await apiRequest<unknown>('/payments/pix/intents', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!isPixPaymentIntentResponse(response)) {
      throw new Error('Resposta da API PIX incompatível com o contrato atual');
    }

    return response;
  },

  async requestEncounterAttempt(
    encounterId: string,
    idempotencyKey: string
  ): Promise<PixPaymentAttemptResponse> {
    if (!isNonEmptyString(encounterId)) {
      throw new Error('encounterId é obrigatório para solicitar uma tentativa PIX');
    }
    if (!isNonEmptyString(idempotencyKey)) {
      throw new Error('Idempotency-Key é obrigatório para solicitar uma tentativa PIX');
    }

    const response = await apiRequest<unknown>(
      `/encounters/${encodeURIComponent(encounterId)}/payments/pix-attempts`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({})
      }
    );

    return assertPixPaymentAttemptResponse(response);
  },

  async getEncounterAttempt(attemptId: string): Promise<PixPaymentAttemptResponse> {
    if (!isNonEmptyString(attemptId)) {
      throw new Error('attemptId é obrigatório para consultar uma tentativa PIX');
    }

    const response = await apiRequest<unknown>(
      `/payments/pix-attempts/${encodeURIComponent(attemptId)}`
    );
    return assertPixPaymentAttemptResponse(response);
  },

  async getLatestEncounterAttempt(encounterId: string): Promise<PixPaymentAttemptResponse | null> {
    if (!isNonEmptyString(encounterId)) {
      throw new Error('encounterId é obrigatório para consultar a tentativa PIX');
    }

    const response = await apiRequest<unknown>(
      `/encounters/${encodeURIComponent(encounterId)}/payments/pix-attempts`
    );
    if (!isObjectRecord(response) || !hasExactKeys(response, ['attempt'])) {
      throw new Error(
        'Resposta da tentativa PIX por atendimento incompatível com o contrato atual'
      );
    }
    if (response.attempt !== null) return assertPixPaymentAttemptResponse(response.attempt);
    return null;
  }
};

export type PixPaymentAttemptState =
  | 'pending_dispatch'
  | 'awaiting_confirmation'
  | 'confirmed_pending_apply'
  | 'settled'
  | 'expired'
  | 'cancelled'
  | 'dispatch_failed'
  | 'reconciliation_required';

export interface PixPaymentAttemptError {
  readonly code: string;
  readonly message: string;
}

export interface PixPaymentAttemptResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly state: PixPaymentAttemptState;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly qrCodePayload: string | null;
  readonly qrCodeBase64: string | null;
  readonly expiresAt: string | null;
  readonly error: PixPaymentAttemptError | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PixPaymentAttemptByEncounterResponse {
  readonly attempt: PixPaymentAttemptResponse | null;
}

export interface PixPaymentAttemptStatusPresentation {
  readonly code: PixPaymentAttemptState | 'unknown';
  readonly label: string;
  readonly variant: PixStatusBadgeVariant;
  readonly description: string;
}

const PIX_PAYMENT_ATTEMPT_STATUS_ENTRIES = [
  {
    code: 'pending_dispatch',
    label: 'Despacho pendente',
    variant: 'warning',
    description: 'A solicitação foi aceita e aguarda despacho assíncrono.'
  },
  {
    code: 'awaiting_confirmation',
    label: 'Aguardando confirmação',
    variant: 'info',
    description: 'O PIX foi despachado e aguarda confirmação do provider.'
  },
  {
    code: 'confirmed_pending_apply',
    label: 'Confirmação recebida · aplicação pendente',
    variant: 'info',
    description: 'A confirmação foi recebida e ainda aguarda aplicação financeira.'
  },
  {
    code: 'settled',
    label: 'Liquidado',
    variant: 'success',
    description: 'O backend informou que o pagamento está liquidado.'
  },
  {
    code: 'expired',
    label: 'Expirado',
    variant: 'default',
    description: 'A tentativa PIX expirou.'
  },
  {
    code: 'cancelled',
    label: 'Cancelado',
    variant: 'default',
    description: 'A tentativa PIX foi cancelada.'
  },
  {
    code: 'dispatch_failed',
    label: 'Falha no despacho',
    variant: 'danger',
    description: 'O despacho PIX falhou e requer atenção operacional.'
  },
  {
    code: 'reconciliation_required',
    label: 'Reconciliação necessária',
    variant: 'danger',
    description: 'O pagamento requer reconciliação antes de qualquer aplicação.'
  }
] satisfies readonly PixPaymentAttemptStatusPresentation[];

export const PIX_PAYMENT_ATTEMPT_STATUS_CONTRACT: readonly PixPaymentAttemptStatusPresentation[] =
  Object.freeze(PIX_PAYMENT_ATTEMPT_STATUS_ENTRIES);

const pixPaymentAttemptStatusByCode = new Map<string, PixPaymentAttemptStatusPresentation>(
  PIX_PAYMENT_ATTEMPT_STATUS_CONTRACT.map((status) => [status.code, status])
);

const PIX_PAYMENT_ATTEMPT_RESPONSE_KEYS = [
  'id',
  'encounterId',
  'billingRecordId',
  'state',
  'amountCents',
  'currency',
  'qrCodePayload',
  'qrCodeBase64',
  'expiresAt',
  'error',
  'createdAt',
  'updatedAt'
] as const;

const PIX_PAYMENT_ATTEMPT_ERROR_KEYS = ['code', 'message'] as const;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === keys.length && keys.every((key) => actualKeys.includes(key));
}

function isNullableNonEmptyString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

function isPixPaymentAttemptState(value: unknown): value is PixPaymentAttemptState {
  return typeof value === 'string' && pixPaymentAttemptStatusByCode.has(value);
}

function isPixPaymentAttemptError(value: unknown): value is PixPaymentAttemptError | null {
  if (value === null) return true;
  if (!isObjectRecord(value) || !hasExactKeys(value, PIX_PAYMENT_ATTEMPT_ERROR_KEYS)) return false;
  return isNonEmptyString(value.code) && isNonEmptyString(value.message);
}

export function isPixPaymentAttemptResponse(value: unknown): value is PixPaymentAttemptResponse {
  if (!isObjectRecord(value) || !hasExactKeys(value, PIX_PAYMENT_ATTEMPT_RESPONSE_KEYS)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.encounterId) &&
    isNonEmptyString(value.billingRecordId) &&
    isPixPaymentAttemptState(value.state) &&
    typeof value.amountCents === 'number' &&
    Number.isSafeInteger(value.amountCents) &&
    value.amountCents > 0 &&
    value.currency === 'BRL' &&
    isNullableNonEmptyString(value.qrCodePayload) &&
    isNullableNonEmptyString(value.qrCodeBase64) &&
    (value.qrCodeBase64 === null || BASE64_PATTERN.test(value.qrCodeBase64)) &&
    isNullableNonEmptyString(value.expiresAt) &&
    isPixPaymentAttemptError(value.error) &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
  );
}

export function getPixPaymentAttemptStatusPresentation(
  status: string | null | undefined
): PixPaymentAttemptStatusPresentation {
  const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
  return (
    pixPaymentAttemptStatusByCode.get(normalizedStatus) ?? {
      code: 'unknown',
      label: 'Status não reconhecido',
      variant: 'default',
      description: 'Este status não pertence ao contrato atual.'
    }
  );
}

export function isTerminalPixPaymentAttemptState(state: PixPaymentAttemptState): boolean {
  return ['settled', 'expired', 'cancelled', 'dispatch_failed', 'reconciliation_required'].includes(
    state
  );
}

function assertPixPaymentAttemptResponse(value: unknown): PixPaymentAttemptResponse {
  if (!isPixPaymentAttemptResponse(value)) {
    throw new Error('Resposta da tentativa PIX incompatível com o contrato atual');
  }
  return value;
}

export const pixPaymentAttemptService = {
  requestEncounterAttempt: pixService.requestEncounterAttempt,
  getEncounterAttempt: pixService.getEncounterAttempt,
  getLatestEncounterAttempt: pixService.getLatestEncounterAttempt
};

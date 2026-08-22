import {
  getDatabaseTransactionScope,
  getTenantTransactionContext
} from '@cvg-his-v2/shared-database';

import type {
  PixPaymentDispatchClaim,
  PixPaymentDispatchFailure,
  PixPaymentDispatchFailureClass,
  PixPaymentDispatchRepository,
  PixPaymentDispatchSuccess
} from '../pix-payment-dispatch-repository.js';
import { normalizePixPaymentDispatchSuccess } from '../pix-payment-dispatch-repository.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_CODE_PATTERN = /^[A-Z0-9_]{1,64}$/;
const MAX_WORKER_ID_BYTES = 160;
const MAX_LEASE_MS = 60 * 60 * 1_000;
const MAX_RETRY_BASE_MS = 60 * 60 * 1_000;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 15_000;
const MIN_PERSISTENCE_BUDGET_MS = 5_000;
const MIN_LEASE_MS = MIN_PERSISTENCE_BUDGET_MS + 1;

export interface PixPaymentDispatchProviderInput {
  readonly accountId: string;
  readonly attemptId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly providerIdempotencyKey: string;
  readonly attemptCreatedAt: string;
  readonly signal?: AbortSignal;
}

export type PixPaymentDispatchProviderResult = PixPaymentDispatchSuccess;

export interface PixPaymentDispatchProvider {
  readonly key: string;
  readonly mode?: 'external' | 'synthetic';
  createIntent(input: PixPaymentDispatchProviderInput): Promise<PixPaymentDispatchProviderResult>;
}

export type PixPaymentDispatchCheckpoint = 'after_claim_commit' | 'after_provider_success';

export interface PixPaymentDispatcherOptions {
  readonly workerId: string;
  readonly leaseMs: number;
  readonly retryBaseMs: number;
  readonly providerTimeoutMs?: number;
  readonly allowSyntheticProviders?: boolean;
  readonly environment?: string;
  readonly onCheckpoint?: (checkpoint: PixPaymentDispatchCheckpoint) => void | Promise<void>;
}

export type PixPaymentDispatchResult =
  | { readonly status: 'idle' }
  | {
      readonly status:
        | 'dispatch_failed'
        | 'dispatched'
        | 'lease_lost'
        | 'reconciliation_required'
        | 'retry_scheduled';
      readonly attemptId: string;
    };

interface PixPaymentDispatchProviderErrorInput {
  readonly code: string;
  readonly failureClass: PixPaymentDispatchFailureClass;
  readonly publicMessage: string;
}

export class PixPaymentDispatchProviderError extends Error {
  public readonly code: string;
  public readonly failureClass: PixPaymentDispatchFailureClass;
  public readonly publicMessage: string;

  public constructor(input: PixPaymentDispatchProviderErrorInput) {
    const publicMessage = sanitizePublicMessage(input.publicMessage);
    super(publicMessage);
    if (!ERROR_CODE_PATTERN.test(input.code)) throw new Error('PIX provider error code is invalid');
    if (!['ambiguous', 'permanent', 'transient'].includes(input.failureClass)) {
      throw new Error('PIX provider failure class is invalid');
    }
    this.name = 'PixPaymentDispatchProviderError';
    this.code = input.code;
    this.failureClass = input.failureClass;
    this.publicMessage = publicMessage;
  }
}

export class PixPaymentDispatchConfigurationError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'PixPaymentDispatchConfigurationError';
    this.code = code;
  }
}

function assertBoundedString(value: string, label: string, maximumBytes: number): void {
  if (
    value.length === 0 ||
    value.includes('\0') ||
    Buffer.byteLength(value, 'utf8') > maximumBytes
  ) {
    throw new Error(`${label} must contain 1 to ${maximumBytes} UTF-8 bytes`);
  }
}

function assertPositiveInteger(value: number, label: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${label} must be a positive safe integer no greater than ${maximum}`);
  }
}

function assertOptions(options: PixPaymentDispatcherOptions): void {
  assertBoundedString(options.workerId, 'PIX dispatcher worker id', MAX_WORKER_ID_BYTES);
  assertPositiveInteger(options.leaseMs, 'PIX dispatcher lease duration', MAX_LEASE_MS);
  if (options.leaseMs < MIN_LEASE_MS) {
    throw new Error(
      `PIX dispatcher lease duration must reserve at least ${MIN_PERSISTENCE_BUDGET_MS} ms for persistence`
    );
  }
  assertPositiveInteger(options.retryBaseMs, 'PIX dispatcher retry base', MAX_RETRY_BASE_MS);
  if (options.providerTimeoutMs !== undefined) {
    assertPositiveInteger(
      options.providerTimeoutMs,
      'PIX dispatcher provider timeout',
      MAX_LEASE_MS
    );
    if (options.providerTimeoutMs > options.leaseMs - MIN_PERSISTENCE_BUDGET_MS) {
      throw new Error(
        `PIX dispatcher provider timeout must reserve at least ${MIN_PERSISTENCE_BUDGET_MS} ms for persistence`
      );
    }
  }
  if (options.environment !== undefined) {
    assertBoundedString(options.environment, 'PIX dispatcher environment', 32);
  }
}

function sanitizePublicMessage(value: string): string {
  assertBoundedString(value, 'PIX provider public message', 512);
  const sanitized = value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!sanitized) throw new Error('PIX provider public message cannot be blank');
  return sanitized.slice(0, 512);
}

function providerMode(provider: PixPaymentDispatchProvider): 'external' | 'synthetic' {
  if (
    provider.key === 'local-pix' ||
    provider.key === 'mock' ||
    provider.key.startsWith('mock-') ||
    provider.key.startsWith('synthetic-')
  ) {
    return 'synthetic';
  }
  if (provider.mode) return provider.mode;
  throw new PixPaymentDispatchConfigurationError(
    'PIX_PROVIDER_MODE_REQUIRED',
    'PIX providers must explicitly declare whether they are external or synthetic'
  );
}

function providerInput(claim: PixPaymentDispatchClaim): PixPaymentDispatchProviderInput {
  return Object.freeze({
    accountId: claim.accountId,
    attemptId: claim.attemptId,
    encounterId: claim.encounterId,
    billingRecordId: claim.billingRecordId,
    amountCents: claim.amountCents,
    currency: claim.currency,
    providerIdempotencyKey: claim.providerIdempotencyKey,
    attemptCreatedAt: claim.createdAt
  });
}

function retryDelayMs(baseMs: number, dispatchAttempt: number): number {
  const exponent = Math.min(Math.max(dispatchAttempt - 1, 0), 20);
  return Math.min(baseMs * 2 ** exponent, MAX_RETRY_DELAY_MS);
}

function safeProviderErrorCode(error: PixPaymentDispatchProviderError): string {
  if (error.failureClass === 'ambiguous') return 'PIX_PROVIDER_OUTCOME_AMBIGUOUS';
  if (error.failureClass === 'permanent') {
    return error.code === 'SYNTHETIC_REJECTED' ? error.code : 'PIX_PROVIDER_REQUEST_REJECTED';
  }
  return error.code === 'SYNTHETIC_UNAVAILABLE' ? error.code : 'PIX_PROVIDER_TEMPORARY_UNAVAILABLE';
}

function safeFailure(
  error: unknown,
  retryBaseMs: number,
  claim: PixPaymentDispatchClaim
): PixPaymentDispatchFailure {
  if (error instanceof PixPaymentDispatchProviderError) {
    const publicMessage =
      error.failureClass === 'transient'
        ? 'PIX provider is temporarily unavailable'
        : error.failureClass === 'permanent'
          ? 'PIX request was rejected before creation'
          : 'The PIX provider outcome requires reconciliation';
    return Object.freeze({
      code: safeProviderErrorCode(error),
      failureClass: error.failureClass,
      publicMessage,
      retryDelayMs: retryDelayMs(retryBaseMs, claim.dispatchAttempt)
    });
  }
  return Object.freeze({
    code: 'PIX_PROVIDER_OUTCOME_AMBIGUOUS',
    failureClass: 'ambiguous',
    publicMessage: 'The PIX provider outcome requires reconciliation',
    retryDelayMs: 0
  });
}

function assertNoTransactionScope(): void {
  if (getTenantTransactionContext() || getDatabaseTransactionScope()) {
    throw new PixPaymentDispatchConfigurationError(
      'PIX_PROVIDER_CALLED_INSIDE_TRANSACTION',
      'PIX provider calls are forbidden inside database transactions'
    );
  }
}

async function callProviderWithTimeout(
  provider: PixPaymentDispatchProvider,
  input: PixPaymentDispatchProviderInput,
  timeoutMs: number
): Promise<PixPaymentDispatchProviderResult> {
  const controller = new AbortController();
  let timeout: NodeJS.Timeout | undefined;
  let timedOut = false;
  const timeoutResult = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error('PIX provider outcome timed out'));
    }, timeoutMs);
    timeout.unref();
  });
  try {
    const guardedInput = Object.freeze({ ...input, signal: controller.signal });
    const result = await Promise.race([provider.createIntent(guardedInput), timeoutResult]);
    return normalizePixPaymentDispatchSuccess(result);
  } catch (error) {
    if (timedOut) throw new Error('PIX provider outcome timed out');
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class PixPaymentDispatcher {
  readonly #repository: PixPaymentDispatchRepository;
  readonly #provider: PixPaymentDispatchProvider;
  readonly #options: PixPaymentDispatcherOptions;

  public constructor(
    repository: PixPaymentDispatchRepository,
    provider: PixPaymentDispatchProvider,
    options: PixPaymentDispatcherOptions
  ) {
    assertOptions(options);
    assertBoundedString(provider.key, 'PIX provider key', 32);
    this.#repository = repository;
    this.#provider = provider;
    this.#options = Object.freeze({ ...options });
  }

  public async processNext(accountId: string): Promise<PixPaymentDispatchResult> {
    if (!UUID_PATTERN.test(accountId))
      throw new Error('PIX dispatch account id must be a valid UUID');
    this.#assertSyntheticCapability();
    assertNoTransactionScope();
    const claim = await this.#repository.claimNext({
      accountId,
      leaseOwner: this.#options.workerId,
      leaseMs: this.#options.leaseMs,
      providerKey: this.#provider.key
    });
    if (!claim) return Object.freeze({ status: 'idle' });

    await this.#options.onCheckpoint?.('after_claim_commit');
    if (claim.providerKey !== this.#provider.key) {
      return this.#persistFailure(
        claim,
        Object.freeze({
          code: 'PIX_PROVIDER_CONFIGURATION_MISMATCH',
          failureClass: 'permanent',
          publicMessage: 'The PIX provider configuration is unavailable',
          retryDelayMs: 0
        })
      );
    }

    let success: PixPaymentDispatchProviderResult;
    assertNoTransactionScope();
    try {
      success = await callProviderWithTimeout(
        this.#provider,
        providerInput(claim),
        this.#options.providerTimeoutMs ??
          Math.min(DEFAULT_PROVIDER_TIMEOUT_MS, this.#options.leaseMs - MIN_PERSISTENCE_BUDGET_MS)
      );
    } catch (error) {
      return this.#persistFailure(claim, safeFailure(error, this.#options.retryBaseMs, claim));
    }

    await this.#options.onCheckpoint?.('after_provider_success');
    let persisted: boolean;
    try {
      persisted = await this.#repository.completeSuccess(claim, success);
    } catch {
      return this.#persistFailure(
        claim,
        Object.freeze({
          code: 'PIX_PROVIDER_SUCCESS_PERSISTENCE_FAILED',
          failureClass: 'ambiguous',
          publicMessage: 'The PIX provider outcome requires reconciliation',
          retryDelayMs: 0
        })
      );
    }
    return Object.freeze({
      status: persisted ? 'dispatched' : 'lease_lost',
      attemptId: claim.attemptId
    });
  }

  async #persistFailure(
    claim: PixPaymentDispatchClaim,
    failure: PixPaymentDispatchFailure
  ): Promise<PixPaymentDispatchResult> {
    const status = await this.#repository.completeFailure(claim, failure);
    return Object.freeze({
      status: status ?? 'lease_lost',
      attemptId: claim.attemptId
    });
  }

  #assertSyntheticCapability(): void {
    if (providerMode(this.#provider) !== 'synthetic') return;
    const environment = (this.#options.environment ?? 'production').toLowerCase();
    const processEnvironment = (process.env['NODE_ENV'] ?? environment).toLowerCase();
    if (
      this.#options.allowSyntheticProviders !== true ||
      environment === 'production' ||
      environment === 'prod' ||
      processEnvironment === 'production' ||
      processEnvironment === 'prod'
    ) {
      throw new PixPaymentDispatchConfigurationError(
        'SYNTHETIC_PIX_PROVIDER_DISABLED',
        'Synthetic PIX providers require an explicit local capability'
      );
    }
  }
}

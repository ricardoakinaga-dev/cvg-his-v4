/**
 * @cvg-his-v2/module-pix
 *
 * PIX payment integration module.
 *
 * Usage:
 *   import { PixService, type PixProvider } from '@cvg-his-v2/module-pix';
 *   import { PagarMePixAdapter } from './adapters/pagarme.adapter';
 *
 *   const provider = new PagarMePixAdapter({ apiKey: process.env.PAGARME_API_KEY });
 *   const pix = new PixService(provider);
 *
 *   const intent = await pix.createIntent({
 *     billingRecordId: 'bill_123',
 *     accountId: 'acc_456',
 *     amount: 10000, // R$100.00 in cents
 *     description: 'Consulta veterinária'
 *   });
 */

// Re-export everything from types and service
export { PixService } from './pix.service.js';
export type {
  PixProvider,
  PixTransaction,
  PixTransactionId,
  PixTransactionStatus,
  CreatePixIntentInput,
  PixIntentResult,
  PixStatusResult,
  PixCancelResult
} from './pix.service.js';

export type { PixProviderName } from './types.js';
export { PagarMePixAdapter } from './adapters/pagarme.adapter.js';
export type { PagarMePixAdapterOptions } from './adapters/pagarme.adapter.js';

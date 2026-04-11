/**
 * Fiscal Module — CVG-HIS-V2
 *
 * Parametric Brazilian fiscal engine for medical/veterinary clinics.
 * Supports NFS-e emission, tax calculation, and CFOP management.
 */

// CFOP Table
export {
  CFOP_TABLE,
  findCfopByCode,
  filterCfopBySection,
  filterCfopByDocumentType,
  filterCfopByCategory,
  type CfopSection,
  type CfopCategory,
  type CfopEntry
} from './cfop-table.js';

// Tax Calculator
export {
  TaxCalculator,
  DEFAULT_TAX_RATES,
  type TaxRegime,
  type TaxType,
  type TaxRateConfig,
  type TaxCalculationLine,
  type TaxCalculationResult
} from './tax-calculator.js';

// NFS-e Emitter
export {
  NfseEmitter,
  LC116_SERVICE_CODES,
  generateNfseId,
  buildNfseXml,
  type NfseProvider,
  type NfseEmitterConfig,
  type NfseIssuerConfig,
  type NfseIssuer,
  type NfseAddress,
  type NfseServiceLine,
  type NfseCustomer,
  type NfseDocument
} from './nfse-emitter.js';

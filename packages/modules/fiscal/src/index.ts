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

// Fiscal API service
export {
  FiscalService,
  type FiscalCfopFilters,
  type FiscalIcmsTableFilters,
  type FiscalIpiTableFilters,
  type FiscalPisTableFilters,
  type FiscalCofinsTableFilters,
  type FiscalIcmsRuleFilters,
  type FiscalIcmsMatrixFilters,
  type FiscalNcmEntryFilters,
  type FiscalNfseLayoutFilters,
  type FiscalPisCofinsRuleFilters,
  type FiscalNfseRuntimeConfig
} from './service.js';

// Database repository (GAP-08)
export {
  DatabaseFiscalRepository,
  type DbCfopFilters,
  type DbIcmsTableFilters,
  type DbIpiTableFilters,
  type DbPisTableFilters,
  type DbCofinsTableFilters,
  type DbIcmsRuleFilters,
  type DbNcmEntryFilters,
  type DbPisCofinsRuleFilters,
  type DbNfseLayoutFilters,
  type DbNfseDocumentFilters,
  type PersistedNfseDocument
} from './database-fiscal.repository.js';

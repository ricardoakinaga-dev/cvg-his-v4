import type {
  CreateFiscalCfopRequest,
  CreateFiscalIbsCbsTableRequest,
  CreateFiscalIcmsTableRequest,
  CreateFiscalIcmsMatrixRequest,
  CreateFiscalIpiTableRequest,
  CreateFiscalPisTableRequest,
  CreateFiscalCofinsTableRequest,
  CreateFiscalNfseLayoutRequest,
  CreateFiscalNfseDocumentRequest,
  FiscalNfseDocumentFilters,
  FiscalCfopSummary,
  FiscalDashboardSummary,
  FiscalIbsCbsTableSummary,
  FiscalIcmsMatrixRowSummary,
  FiscalIcmsRuleSummary,
  FiscalIcmsTableSummary,
  FiscalIpiTableSummary,
  FiscalPisTableSummary,
  FiscalCofinsTableSummary,
  FiscalNfseDocumentSummary,
  FiscalNcmEntrySummary,
  FiscalNfseLayoutSummary,
  FiscalPisCofinsRuleSummary,
  FiscalTaxPreview,
  CancelFiscalNfseDocumentRequest,
  UpdateFiscalIbsCbsTableRequest,
  UpdateFiscalIcmsTableRequest,
  UpdateFiscalIpiTableRequest,
  UpdateFiscalPisTableRequest,
  UpdateFiscalCofinsTableRequest,
  UpdateFiscalCfopRequest,
  UpdateFiscalNfseLayoutRequest
} from '@cvg-his-v2/shared-contracts';

import { CFOP_TABLE, type CfopSection } from './cfop-table.js';
import { DEFAULT_TAX_RATES, TaxCalculator, type TaxRegime } from './tax-calculator.js';
import {
  DatabaseFiscalRepository,
  type NfseOperationKind,
  type PersistedNfseDocument
} from './database-fiscal.repository.js';
import {
  NfseEmitter,
  type NfseAddress,
  type NfseDocument,
  type NfseIssuer,
  type NfseProvider,
  type NfseServiceLine
} from './nfse-emitter.js';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { randomBytes } from 'node:crypto';

export interface FiscalCfopFilters {
  readonly search?: string;
  readonly section?: CfopSection;
  readonly documentType?: FiscalCfopSummary['applicableTo'][number];
}

const FISCAL_DOCUMENT_TYPES = ['nfe', 'nfce', 'nfse', 'cte'] as const;

export interface FiscalIcmsRuleFilters {
  readonly ufOrigin?: string;
  readonly ufDestination?: string;
  readonly ncm?: string;
  readonly operationType?: FiscalIcmsRuleSummary['operationType'];
}

export interface FiscalIcmsTableFilters {
  readonly search?: string;
}

export interface FiscalIpiTableFilters {
  readonly search?: string;
}

export interface FiscalPisTableFilters {
  readonly search?: string;
}

export interface FiscalCofinsTableFilters {
  readonly search?: string;
}

export interface FiscalIbsCbsTableFilters {
  readonly search?: string;
}

export interface FiscalPisCofinsRuleFilters {
  readonly regime?: TaxRegime;
  readonly appliesTo?: FiscalPisCofinsRuleSummary['appliesTo'];
}

export interface FiscalNcmEntryFilters {
  readonly search?: string;
}

export interface FiscalIcmsMatrixFilters {
  readonly search?: string;
  readonly ufOrigin?: string;
  readonly ufDestination?: string;
  readonly operationType?: FiscalIcmsMatrixRowSummary['operationType'];
}

export interface FiscalNfseLayoutFilters {
  readonly search?: string;
  readonly state?: string;
  readonly active?: boolean;
}

const NCM_ENTRIES: readonly FiscalNcmEntrySummary[] = [
  {
    id: 'ncm-3004',
    ncm: '3004',
    category: 'Medicamentos e produtos farmacêuticos',
    ipiRate: DEFAULT_TAX_RATES.ipi['3004'],
    source: 'catálogo de produtos',
    notes: 'Usado em medicamentos, vacinas e kits terapêuticos.'
  },
  {
    id: 'ncm-9018',
    ncm: '9018',
    category: 'Instrumentos médico-veterinários',
    ipiRate: DEFAULT_TAX_RATES.ipi['9018'],
    source: 'catálogo de produtos',
    notes: 'Aplicável a instrumentos clínicos e materiais de procedimento.'
  },
  {
    id: 'ncm-9022',
    ncm: '9022',
    category: 'Equipamentos de imagem',
    ipiRate: DEFAULT_TAX_RATES.ipi['9022'],
    source: 'catálogo de produtos',
    notes: 'Base usada para ultrassom e imagem diagnóstica.'
  },
  {
    id: 'ncm-9999',
    ncm: '9999',
    category: 'Serviços e itens não tributados por IPI',
    ipiRate: DEFAULT_TAX_RATES.ipi['9999'],
    source: 'cadastro fiscal de serviços',
    notes: 'Usado para serviços e itens sem incidência operacional de IPI.'
  }
] as const;

const ICMS_RULES: readonly FiscalIcmsRuleSummary[] = [
  {
    id: 'icms-sp-sp-3004',
    ufOrigin: 'SP',
    ufDestination: 'SP',
    ncm: '3004',
    rate: DEFAULT_TAX_RATES.icms.SP.SP,
    cst: '000',
    operationType: 'interna'
  },
  {
    id: 'icms-sp-rj-3004',
    ufOrigin: 'SP',
    ufDestination: 'RJ',
    ncm: '3004',
    rate: DEFAULT_TAX_RATES.icms.SP.RJ,
    cst: '010',
    operationType: 'interestadual'
  },
  {
    id: 'icms-sp-mg-9018',
    ufOrigin: 'SP',
    ufDestination: 'MG',
    ncm: '9018',
    rate: DEFAULT_TAX_RATES.icms.SP.MG,
    cst: '010',
    operationType: 'interestadual'
  },
  {
    id: 'icms-sp-pr-9018',
    ufOrigin: 'SP',
    ufDestination: 'PR',
    ncm: '9018',
    rate: DEFAULT_TAX_RATES.icms.SP.PR,
    cst: '010',
    operationType: 'interestadual'
  },
  {
    id: 'icms-sp-rs-9022',
    ufOrigin: 'SP',
    ufDestination: 'RS',
    ncm: '9022',
    rate: DEFAULT_TAX_RATES.icms.SP.RS,
    cst: '020',
    operationType: 'interestadual'
  },
  {
    id: 'icms-sp-sc-9022',
    ufOrigin: 'SP',
    ufDestination: 'SC',
    ncm: '9022',
    rate: DEFAULT_TAX_RATES.icms.SP.SC,
    cst: '020',
    operationType: 'interestadual'
  },
  {
    id: 'icms-mg-sp-3004',
    ufOrigin: 'MG',
    ufDestination: 'SP',
    ncm: '3004',
    rate: 12,
    cst: '010',
    operationType: 'interestadual'
  },
  {
    id: 'icms-rj-sp-9018',
    ufOrigin: 'RJ',
    ufDestination: 'SP',
    ncm: '9018',
    rate: 12,
    cst: '010',
    operationType: 'interestadual'
  },
  {
    id: 'icms-pr-pr-9018',
    ufOrigin: 'PR',
    ufDestination: 'PR',
    ncm: '9018',
    rate: 18,
    cst: '000',
    operationType: 'interna'
  }
] as const;

const inMemoryIcmsRules: FiscalIcmsRuleSummary[] = [...ICMS_RULES];

const ICMS_TABLES: readonly FiscalIcmsTableSummary[] = [
  {
    id: 'icms-table-18',
    code: '18',
    description: 'ICMS 18%',
    percent: 18
  },
  {
    id: 'icms-table-12',
    code: '12',
    description: 'ICMS 12%',
    percent: 12
  },
  {
    id: 'icms-table-7',
    code: '7',
    description: 'ICMS 7%',
    percent: 7
  }
] as const;

const IPI_TABLES: readonly FiscalIpiTableSummary[] = [
  {
    id: 'ipi-table-0',
    code: '0',
    description: 'IPI 0%',
    percent: 0
  },
  {
    id: 'ipi-table-3-25',
    code: '3,25',
    description: 'IPI 3,25%',
    percent: 3.25
  },
  {
    id: 'ipi-table-5',
    code: '5',
    description: 'IPI 5%',
    percent: 5
  }
] as const;

const PIS_TABLES: readonly FiscalPisTableSummary[] = [
  {
    id: 'pis-table-0',
    code: '0',
    description: 'PIS 0%',
    percent: 0
  },
  {
    id: 'pis-table-0-65',
    code: '0,65',
    description: 'PIS 0,65%',
    percent: 0.65
  },
  {
    id: 'pis-table-1-65',
    code: '1,65',
    description: 'PIS 1,65%',
    percent: 1.65
  }
] as const;

const COFINS_TABLES: readonly FiscalCofinsTableSummary[] = [
  {
    id: 'cofins-table-0',
    code: '0',
    description: 'COFINS 0%',
    percent: 0
  },
  {
    id: 'cofins-table-3',
    code: '3',
    description: 'COFINS 3%',
    percent: 3
  },
  {
    id: 'cofins-table-7-6',
    code: '7,6',
    description: 'COFINS 7,6%',
    percent: 7.6
  }
] as const;

const IBS_CBS_TABLES: readonly FiscalIbsCbsTableSummary[] = [] as const;

const PIS_COFINS_RULES: readonly FiscalPisCofinsRuleSummary[] = [
  {
    id: 'pis-cofins-simples-ambos',
    regime: 'simples_nacional',
    appliesTo: 'ambos',
    pisRate: DEFAULT_TAX_RATES.pis.simples_nacional,
    cofinsRate: DEFAULT_TAX_RATES.cofins.simples_nacional,
    notes: 'Base operacional padrão para clínica e backoffice assistido.'
  },
  {
    id: 'pis-cofins-presumido-mercadoria',
    regime: 'lucro_presumido',
    appliesTo: 'mercadoria',
    pisRate: DEFAULT_TAX_RATES.pis.lucro_presumido,
    cofinsRate: DEFAULT_TAX_RATES.cofins.lucro_presumido,
    notes: 'Usar em faturamento de mercadorias com revisão contábil.'
  },
  {
    id: 'pis-cofins-presumido-servico',
    regime: 'lucro_presumido',
    appliesTo: 'servico',
    pisRate: DEFAULT_TAX_RATES.pis.lucro_presumido,
    cofinsRate: DEFAULT_TAX_RATES.cofins.lucro_presumido,
    notes: 'Aplicável a serviços NFS-e em operação municipal.'
  },
  {
    id: 'pis-cofins-real-mercadoria',
    regime: 'lucro_real',
    appliesTo: 'mercadoria',
    pisRate: DEFAULT_TAX_RATES.pis.lucro_real,
    cofinsRate: DEFAULT_TAX_RATES.cofins.lucro_real,
    notes: 'Requer conferência de crédito e débito antes do faturamento.'
  },
  {
    id: 'pis-cofins-real-servico',
    regime: 'lucro_real',
    appliesTo: 'servico',
    pisRate: DEFAULT_TAX_RATES.pis.lucro_real,
    cofinsRate: DEFAULT_TAX_RATES.cofins.lucro_real,
    notes: 'Usado em serviços e laboratórios com apuração dedicada.'
  }
] as const;

const NFSE_LAYOUTS: readonly FiscalNfseLayoutSummary[] = [
  {
    id: 'nfse-sp',
    city: 'São Paulo',
    state: 'SP',
    municipalityCode: '3550308',
    provider: 'ISS SP',
    version: 'v2026.1',
    active: true,
    environment: 'producao',
    serviceCode: '0407',
    serviceFocus: 'Consultas e serviços veterinários'
  },
  {
    id: 'nfse-poa',
    city: 'Porto Alegre',
    state: 'RS',
    municipalityCode: '4314902',
    provider: 'Abrasf/Betha',
    version: '2.04',
    active: true,
    environment: 'producao',
    serviceCode: '0413',
    serviceFocus: 'Laboratório e imagem'
  },
  {
    id: 'nfse-curitiba',
    city: 'Curitiba',
    state: 'PR',
    municipalityCode: '4106902',
    provider: 'ISS Curitiba',
    version: '1.0',
    active: true,
    environment: 'homologacao',
    serviceCode: '0407',
    serviceFocus: 'Expansão multiunidade'
  },
  {
    id: 'nfse-rio',
    city: 'Rio de Janeiro',
    state: 'RJ',
    municipalityCode: '3304557',
    provider: 'Nota Carioca',
    version: 'v3',
    active: false,
    environment: 'homologacao',
    serviceCode: '0407',
    serviceFocus: 'Expansão multiunidade'
  }
] as const;

const inMemoryNfseLayouts: FiscalNfseLayoutSummary[] = NFSE_LAYOUTS.map((layout) => ({ ...layout }));
const inMemoryIcmsTables: FiscalIcmsTableSummary[] = ICMS_TABLES.map((table) => ({ ...table }));
const inMemoryIpiTables: FiscalIpiTableSummary[] = IPI_TABLES.map((table) => ({ ...table }));
const inMemoryPisTables: FiscalPisTableSummary[] = PIS_TABLES.map((table) => ({ ...table }));
const inMemoryCofinsTables: FiscalCofinsTableSummary[] = COFINS_TABLES.map((table) => ({ ...table }));
const inMemoryIbsCbsTables: FiscalIbsCbsTableSummary[] = IBS_CBS_TABLES.map((table) => ({ ...table }));
const inMemoryCfopEntries: FiscalCfopSummary[] = CFOP_TABLE.map((entry) => ({
  ...entry,
  documentTypesLabel: entry.applicableTo.join(', ').toUpperCase()
}));
const inMemoryNfseDocuments: NfseIssuerDocument[] = [];
const inMemoryNfseDocumentsByAccount = new Map<string, NfseIssuerDocument[]>();

type NfseIssuerDocument = PersistedNfseDocument;

function createTaxPreview(): FiscalTaxPreview {
  const calculator = new TaxCalculator(DEFAULT_TAX_RATES, 'SP', 'simples_nacional');

  const mercadoria = calculator.calculate({
    productType: 'mercadoria',
    cfop: '5102',
    baseValue: 150,
    icms: { rate: DEFAULT_TAX_RATES.icms.SP.SP / 100, cst: '000' },
    ipi: { rate: DEFAULT_TAX_RATES.ipi['3004'] / 100, cst: '50' },
    pis: { rate: DEFAULT_TAX_RATES.pis.simples_nacional / 100 },
    cofins: { rate: DEFAULT_TAX_RATES.cofins.simples_nacional / 100 }
  });

  const servico = calculator.calculate({
    productType: 'servico',
    cfop: '2101',
    baseValue: 220,
    pis: { rate: DEFAULT_TAX_RATES.pis.simples_nacional / 100 },
    cofins: { rate: DEFAULT_TAX_RATES.cofins.simples_nacional / 100 },
    iss: { rate: DEFAULT_TAX_RATES.iss.cnae_laboratorio / 100 }
  });

  return {
    mercadoria: {
      baseValue: mercadoria.line.baseValue,
      totalTaxValue: mercadoria.totalTaxValue,
      totalWithTax: mercadoria.totalWithTax
    },
    servico: {
      baseValue: servico.line.baseValue,
      totalTaxValue: servico.totalTaxValue,
      totalWithTax: servico.totalWithTax
    }
  };
}

function normalizeTerm(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

function matchesExact(value: string, expected?: string): boolean {
  return !expected || value.toLowerCase() === expected.trim().toLowerCase();
}

function matchesContains(value: string, expected?: string): boolean {
  return !expected || value.toLowerCase().includes(expected.trim().toLowerCase());
}

function sanitizeLayoutId(city: string, state: string): string {
  const normalizedCity = city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `nfse-${state.toLowerCase()}-${normalizedCity}-${Date.now().toString(36)}`;
}

function sanitizeIcmsTableId(code: string): string {
  const normalized = code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `icms-table-${normalized || Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function toIcmsMatrixId(
  ufOrigin: string,
  ufDestination: string,
  operationType: FiscalIcmsMatrixRowSummary['operationType']
): string {
  return `matrix-${ufOrigin.toLowerCase()}-${ufDestination.toLowerCase()}-${operationType}`;
}

function sanitizeIpiTableId(code: string): string {
  const normalized = code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `ipi-table-${normalized || Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function sanitizePisTableId(code: string): string {
  const normalized = code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `pis-table-${normalized || Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function sanitizeCofinsTableId(code: string): string {
  const normalized = code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `cofins-table-${normalized || Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function sanitizeIbsCbsTableId(code: string): string {
  const normalized = code
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `ibs-cbs-table-${normalized || Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function assertNonEmpty(value: string | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  return normalized;
}

function assertPercent(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${field} must be a number between 0 and 100`);
  }
  return Number(value.toFixed(2));
}

function assertUf(value: string | undefined, field: string): string {
  const normalized = assertNonEmpty(value, field).toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) {
    throw new Error(`${field} must be a valid UF`);
  }
  return normalized;
}

function normalizeIcmsOperationType(
  value: CreateFiscalIcmsMatrixRequest['operationType'],
  ufOrigin: string,
  ufDestination: string
): FiscalIcmsMatrixRowSummary['operationType'] {
  if (value === 'interna' || value === 'interestadual') {
    return value;
  }
  return ufOrigin === ufDestination ? 'interna' : 'interestadual';
}

function normalizeCfopPayload(
  payload: CreateFiscalCfopRequest | UpdateFiscalCfopRequest,
  current?: FiscalCfopSummary
): FiscalCfopSummary {
  const code = payload.code === undefined ? current?.code : assertNonEmpty(payload.code, 'code');
  const description = payload.description === undefined
    ? current?.description
    : assertNonEmpty(payload.description, 'description');
  const section = payload.section ?? current?.section ?? 'saida';
  const category = payload.category === undefined
    ? (current?.category ?? 'geral')
    : assertNonEmpty(payload.category, 'category');
  const applicableTo = payload.applicableTo ?? current?.applicableTo ?? FISCAL_DOCUMENT_TYPES;

  if (!code || !description) {
    throw new Error('code and description are required');
  }

  if (section !== 'entrada' && section !== 'saida') {
    throw new Error('section must be entrada or saida');
  }

  if (
    applicableTo.length === 0
    || applicableTo.some((item: (typeof FISCAL_DOCUMENT_TYPES)[number]) => !FISCAL_DOCUMENT_TYPES.includes(item))
  ) {
    throw new Error('applicableTo must include valid fiscal document types');
  }

  return {
    code,
    description,
    section,
    category,
    applicableTo,
    icmsRelevant: payload.icmsRelevant ?? current?.icmsRelevant ?? false,
    pisCofinsRelevant: payload.pisCofinsRelevant ?? current?.pisCofinsRelevant ?? false,
    ipiRelevant: payload.ipiRelevant ?? current?.ipiRelevant ?? false,
    documentTypesLabel: applicableTo.join(', ').toUpperCase()
  };
}

function assertPositiveInteger(value: number | undefined, field: string, fallback?: number): number {
  if (value === undefined) {
    if (fallback === undefined) {
      throw new Error(`${field} is required`);
    }

    return fallback;
  }

  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    throw new Error(`${field} must be a positive integer`);
  }

  return value;
}

function assertNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be zero or positive`);
  }
  return value;
}

function normalizeServices(
  services: CreateFiscalNfseDocumentRequest['services']
): readonly NfseServiceLine[] {
  if (services.length === 0) {
    throw new Error('services is required');
  }

  return services.map((service) => ({
    description: assertNonEmpty(service.description, 'service.description'),
    codigoServico: assertNonEmpty(service.codigoServico, 'service.codigoServico'),
    cnae: assertNonEmpty(service.cnae, 'service.cnae'),
    quantity: assertNonNegative(service.quantity, 'service.quantity'),
    unitValue: assertNonNegative(service.unitValue, 'service.unitValue'),
    totalValue: assertNonNegative(service.totalValue, 'service.totalValue'),
    issRate: assertNonNegative(service.issRate, 'service.issRate'),
    issValue: assertNonNegative(service.issValue, 'service.issValue'),
    pisValue: assertNonNegative(service.pisValue, 'service.pisValue'),
    cofinsValue: assertNonNegative(service.cofinsValue, 'service.cofinsValue'),
    csllValue: assertNonNegative(service.csllValue, 'service.csllValue'),
    irrfValue: service.irrfValue === undefined ? undefined : assertNonNegative(service.irrfValue, 'service.irrfValue'),
    inssValue: service.inssValue === undefined ? undefined : assertNonNegative(service.inssValue, 'service.inssValue')
  }));
}

function toFiscalDocumentSummary(document: NfseDocument): FiscalNfseDocumentSummary {
  return {
    id: document.id,
    serie: document.serie,
    numero: document.numero,
    competencia: document.competencia,
    provider: document.provider,
    customer: {
      type: document.customer.type,
      document: document.customer.document,
      name: document.customer.name,
      email: document.customer.email,
      phone: document.customer.phone
    },
    services: document.services.map((service) => ({
      description: service.description,
      codigoServico: service.codigoServico,
      cnae: service.cnae,
      quantity: service.quantity,
      unitValue: service.unitValue,
      totalValue: service.totalValue,
      issRate: service.issRate,
      issValue: service.issValue,
      pisValue: service.pisValue,
      cofinsValue: service.cofinsValue,
      csllValue: service.csllValue,
      irrfValue: service.irrfValue,
      inssValue: service.inssValue
    })),
    subtotal: document.subtotal,
    totalIss: document.totalIss,
    totalPis: document.totalPis,
    totalCofins: document.totalCofins,
    totalCsll: document.totalCsll,
    totalIrrf: document.totalIrrf,
    totalInss: document.totalInss,
    totalDocument: document.totalDocument,
    observations: document.observations,
    createdAt: document.createdAt,
    status: document.status,
    authorizationCode: document.authorizationCode,
    verificationUrl: document.verificationUrl
  };
}

function toEmitter(
  provider: NfseIssuerDocument['provider'],
  municipalityCode: string,
  apiUrl: string,
  allowSimulation = false,
  runtime?: FiscalNfseRuntimeConfig
): NfseEmitter {
  const effectiveProvider = runtime?.provider ?? provider;
  const effectiveMunicipalityCode = runtime?.municipalityCode ?? municipalityCode;
  const effectiveApiUrl = runtime?.apiUrl ?? apiUrl;
  return new NfseEmitter({
    provider: {
      provider: effectiveProvider,
      apiUrl: effectiveApiUrl,
      municipalityCode: effectiveMunicipalityCode,
      apiKey: runtime?.apiKey,
      certificate: runtime?.certificate
    },
    issuer: runtime?.issuer ?? defaultNfseIssuer(),
    regime: runtime?.regime ?? 'simples_nacional',
    allowSimulation
  });
}

export interface FiscalNfseRuntimeConfig {
  readonly provider: NfseProvider;
  readonly apiUrl: string;
  readonly municipalityCode: string;
  readonly apiKey?: string;
  readonly certificate?: Buffer;
  readonly issuer?: NfseIssuer;
  readonly regime?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
}

function defaultNfseIssuer(): NfseIssuer {
  const address: NfseAddress = {
    street: 'Avenida Exemplo',
    number: '1000',
    district: 'Centro',
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01000000',
    country: 'BR'
  };
  return {
    cnpj: '99999999000101',
    inscricaoMunicipal: '000001',
    razaoSocial: 'CVG HIS Ltda',
    nomeFantasia: 'CVG HIS',
    address,
    phone: '(11) 4000-0000',
    email: 'fiscal@cvg-his.example.com'
  };
}

function nextDocumentId(): string {
  return `nfse-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

function nextDocumentNumber(): number {
  return (Date.now() % 900000) + Math.floor(randomBytes(1)[0] / 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export class FiscalService {
  private readonly dbRepo?: DatabaseFiscalRepository;
  private readonly accountId?: AccountId;
  private readonly allowNfseSimulation: boolean;
  private readonly nfseRuntime?: FiscalNfseRuntimeConfig;

  constructor(
    dbRepo?: DatabaseFiscalRepository,
    accountId?: AccountId,
    options: {
      readonly allowNfseSimulation?: boolean;
      readonly nfse?: FiscalNfseRuntimeConfig;
    } = {}
  ) {
    this.dbRepo = dbRepo;
    this.accountId = accountId;
    this.allowNfseSimulation = options.allowNfseSimulation ?? false;
    this.nfseRuntime = options.nfse;
  }

  private hasDbRepo(): boolean {
    return this.dbRepo != null && this.accountId != null;
  }

  /**
   * Rebuilds the tenant-scoped service while preserving the runtime NFS-e
   * boundary. API routes use this instead of silently dropping credentials or
   * the explicit simulation policy when switching to the database repository.
   */
  public forAccount(accountId: AccountId): FiscalService {
    return new FiscalService(
      this.dbRepo,
      accountId,
      {
        allowNfseSimulation: this.allowNfseSimulation,
        nfse: this.nfseRuntime
      }
    );
  }

  private inMemoryNfseStore(): NfseIssuerDocument[] {
    if (!this.accountId) {
      return inMemoryNfseDocuments;
    }

    const accountKey = String(this.accountId);
    const existing = inMemoryNfseDocumentsByAccount.get(accountKey);
    if (existing) {
      return existing;
    }

    const created: NfseIssuerDocument[] = [];
    inMemoryNfseDocumentsByAccount.set(accountKey, created);
    return created;
  }

  public async listIcmsRules(filters: FiscalIcmsRuleFilters = {}): Promise<FiscalIcmsRuleSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listIcmsRules({
        accountId: this.accountId!,
        ufOrigin: filters.ufOrigin,
        ufDestination: filters.ufDestination,
        ncm: filters.ncm,
        operationType: filters.operationType
      });
    }
    return inMemoryIcmsRules.filter((rule) =>
      matchesExact(rule.ufOrigin, filters.ufOrigin)
      && matchesExact(rule.ufDestination, filters.ufDestination)
      && matchesExact(rule.ncm, filters.ncm)
      && (!filters.operationType || rule.operationType === filters.operationType)
    );
  }

  public async listIcmsTables(filters: FiscalIcmsTableFilters = {}): Promise<FiscalIcmsTableSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listIcmsTables({
        accountId: this.accountId!,
        search: filters.search
      });
    }

    return inMemoryIcmsTables.filter((table) =>
      matchesContains(`${table.code} ${table.description} ${table.percent}`, filters.search)
    );
  }

  public async createIcmsTable(
    payload: CreateFiscalIcmsTableRequest
  ): Promise<FiscalIcmsTableSummary> {
    const code = assertNonEmpty(payload.code, 'code');
    const percent = assertPercent(payload.percent, 'percent');
    const description = payload.description?.trim() || `ICMS ${percent}%`;

    const existing = await this.listIcmsTables();
    if (existing.some((table) => table.code.toLowerCase() === code.toLowerCase())) {
      throw new Error('code already exists');
    }

    const table: FiscalIcmsTableSummary = {
      id: sanitizeIcmsTableId(code),
      code,
      description,
      percent
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.createIcmsTable(this.accountId!, table);
    }

    inMemoryIcmsTables.unshift(table);
    return table;
  }

  public async updateIcmsTable(
    id: string,
    payload: UpdateFiscalIcmsTableRequest
  ): Promise<FiscalIcmsTableSummary | null> {
    const nextPayload: UpdateFiscalIcmsTableRequest = {
      code: payload.code === undefined ? undefined : assertNonEmpty(payload.code, 'code'),
      description: payload.description?.trim(),
      percent: payload.percent === undefined ? undefined : assertPercent(payload.percent, 'percent')
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.updateIcmsTable(this.accountId!, id, nextPayload);
    }

    const index = inMemoryIcmsTables.findIndex((table) => table.id === id);
    if (index === -1) {
      return null;
    }

    const current = inMemoryIcmsTables[index];
    const code = nextPayload.code ?? current.code;
    const duplicate = inMemoryIcmsTables.some(
      (table) => table.id !== id && table.code.toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      throw new Error('code already exists');
    }

    const next: FiscalIcmsTableSummary = {
      ...current,
      code,
      description: nextPayload.description ?? current.description,
      percent: nextPayload.percent ?? current.percent
    };

    inMemoryIcmsTables[index] = next;
    return next;
  }

  public async listIpiTables(filters: FiscalIpiTableFilters = {}): Promise<FiscalIpiTableSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listIpiTables({
        accountId: this.accountId!,
        search: filters.search
      });
    }

    return inMemoryIpiTables.filter((table) =>
      matchesContains(`${table.code} ${table.description} ${table.percent}`, filters.search)
    );
  }

  public async createIpiTable(
    payload: CreateFiscalIpiTableRequest
  ): Promise<FiscalIpiTableSummary> {
    const code = assertNonEmpty(payload.code, 'code');
    const percent = assertPercent(payload.percent, 'percent');
    const description = payload.description?.trim() || `IPI ${percent}%`;

    const existing = await this.listIpiTables();
    if (existing.some((table) => table.code.toLowerCase() === code.toLowerCase())) {
      throw new Error('code already exists');
    }

    const table: FiscalIpiTableSummary = {
      id: sanitizeIpiTableId(code),
      code,
      description,
      percent
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.createIpiTable(this.accountId!, table);
    }

    inMemoryIpiTables.unshift(table);
    return table;
  }

  public async updateIpiTable(
    id: string,
    payload: UpdateFiscalIpiTableRequest
  ): Promise<FiscalIpiTableSummary | null> {
    const nextPayload: UpdateFiscalIpiTableRequest = {
      code: payload.code === undefined ? undefined : assertNonEmpty(payload.code, 'code'),
      description: payload.description?.trim(),
      percent: payload.percent === undefined ? undefined : assertPercent(payload.percent, 'percent')
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.updateIpiTable(this.accountId!, id, nextPayload);
    }

    const index = inMemoryIpiTables.findIndex((table) => table.id === id);
    if (index === -1) {
      return null;
    }

    const current = inMemoryIpiTables[index];
    const code = nextPayload.code ?? current.code;
    const duplicate = inMemoryIpiTables.some(
      (table) => table.id !== id && table.code.toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      throw new Error('code already exists');
    }

    const next: FiscalIpiTableSummary = {
      ...current,
      code,
      description: nextPayload.description ?? current.description,
      percent: nextPayload.percent ?? current.percent
    };

    inMemoryIpiTables[index] = next;
    return next;
  }

  public async listPisTables(filters: FiscalPisTableFilters = {}): Promise<FiscalPisTableSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listPisTables({
        accountId: this.accountId!,
        search: filters.search
      });
    }

    return inMemoryPisTables.filter((table) =>
      matchesContains(`${table.code} ${table.description} ${table.percent}`, filters.search)
    );
  }

  public async createPisTable(
    payload: CreateFiscalPisTableRequest
  ): Promise<FiscalPisTableSummary> {
    const code = assertNonEmpty(payload.code, 'code');
    const percent = assertPercent(payload.percent, 'percent');
    const description = payload.description?.trim() || `PIS ${percent}%`;

    const existing = await this.listPisTables();
    if (existing.some((table) => table.code.toLowerCase() === code.toLowerCase())) {
      throw new Error('code already exists');
    }

    const table: FiscalPisTableSummary = {
      id: sanitizePisTableId(code),
      code,
      description,
      percent
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.createPisTable(this.accountId!, table);
    }

    inMemoryPisTables.unshift(table);
    return table;
  }

  public async updatePisTable(
    id: string,
    payload: UpdateFiscalPisTableRequest
  ): Promise<FiscalPisTableSummary | null> {
    const nextPayload: UpdateFiscalPisTableRequest = {
      code: payload.code === undefined ? undefined : assertNonEmpty(payload.code, 'code'),
      description: payload.description?.trim(),
      percent: payload.percent === undefined ? undefined : assertPercent(payload.percent, 'percent')
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.updatePisTable(this.accountId!, id, nextPayload);
    }

    const index = inMemoryPisTables.findIndex((table) => table.id === id);
    if (index === -1) {
      return null;
    }

    const current = inMemoryPisTables[index];
    const code = nextPayload.code ?? current.code;
    const duplicate = inMemoryPisTables.some(
      (table) => table.id !== id && table.code.toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      throw new Error('code already exists');
    }

    const next: FiscalPisTableSummary = {
      ...current,
      code,
      description: nextPayload.description ?? current.description,
      percent: nextPayload.percent ?? current.percent
    };

    inMemoryPisTables[index] = next;
    return next;
  }

  public async listCofinsTables(filters: FiscalCofinsTableFilters = {}): Promise<FiscalCofinsTableSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listCofinsTables({
        accountId: this.accountId!,
        search: filters.search
      });
    }

    return inMemoryCofinsTables.filter((table) =>
      matchesContains(`${table.code} ${table.description} ${table.percent}`, filters.search)
    );
  }

  public async createCofinsTable(
    payload: CreateFiscalCofinsTableRequest
  ): Promise<FiscalCofinsTableSummary> {
    const code = assertNonEmpty(payload.code, 'code');
    const percent = assertPercent(payload.percent, 'percent');
    const description = payload.description?.trim() || `COFINS ${percent}%`;

    const existing = await this.listCofinsTables();
    if (existing.some((table) => table.code.toLowerCase() === code.toLowerCase())) {
      throw new Error('code already exists');
    }

    const table: FiscalCofinsTableSummary = {
      id: sanitizeCofinsTableId(code),
      code,
      description,
      percent
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.createCofinsTable(this.accountId!, table);
    }

    inMemoryCofinsTables.unshift(table);
    return table;
  }

  public async updateCofinsTable(
    id: string,
    payload: UpdateFiscalCofinsTableRequest
  ): Promise<FiscalCofinsTableSummary | null> {
    const nextPayload: UpdateFiscalCofinsTableRequest = {
      code: payload.code === undefined ? undefined : assertNonEmpty(payload.code, 'code'),
      description: payload.description?.trim(),
      percent: payload.percent === undefined ? undefined : assertPercent(payload.percent, 'percent')
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.updateCofinsTable(this.accountId!, id, nextPayload);
    }

    const index = inMemoryCofinsTables.findIndex((table) => table.id === id);
    if (index === -1) {
      return null;
    }

    const current = inMemoryCofinsTables[index];
    const code = nextPayload.code ?? current.code;
    const duplicate = inMemoryCofinsTables.some(
      (table) => table.id !== id && table.code.toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      throw new Error('code already exists');
    }

    const next: FiscalCofinsTableSummary = {
      ...current,
      code,
      description: nextPayload.description ?? current.description,
      percent: nextPayload.percent ?? current.percent
    };

    inMemoryCofinsTables[index] = next;
    return next;
  }

  public async listIbsCbsTables(
    filters: FiscalIbsCbsTableFilters = {}
  ): Promise<FiscalIbsCbsTableSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listIbsCbsTables({
        accountId: this.accountId!,
        search: filters.search
      });
    }

    return inMemoryIbsCbsTables.filter((table) =>
      matchesContains(
        `${table.code} ${table.description} ${table.ibsPercent} ${table.cbsPercent}`,
        filters.search
      )
    );
  }

  public async createIbsCbsTable(
    payload: CreateFiscalIbsCbsTableRequest
  ): Promise<FiscalIbsCbsTableSummary> {
    const code = assertNonEmpty(payload.code, 'code');
    const ibsPercent = assertPercent(payload.ibsPercent, 'ibsPercent');
    const cbsPercent = assertPercent(payload.cbsPercent, 'cbsPercent');
    const description = payload.description?.trim() || `IBS/CBS ${code}`;

    const existing = await this.listIbsCbsTables();
    if (existing.some((table) => table.code.toLowerCase() === code.toLowerCase())) {
      throw new Error('code already exists');
    }

    const table: FiscalIbsCbsTableSummary = {
      id: sanitizeIbsCbsTableId(code),
      code,
      description,
      ibsPercent,
      cbsPercent
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.createIbsCbsTable(this.accountId!, table);
    }

    inMemoryIbsCbsTables.unshift(table);
    return table;
  }

  public async updateIbsCbsTable(
    id: string,
    payload: UpdateFiscalIbsCbsTableRequest
  ): Promise<FiscalIbsCbsTableSummary | null> {
    const nextPayload: UpdateFiscalIbsCbsTableRequest = {
      code: payload.code === undefined ? undefined : assertNonEmpty(payload.code, 'code'),
      description: payload.description?.trim(),
      ibsPercent: payload.ibsPercent === undefined ? undefined : assertPercent(payload.ibsPercent, 'ibsPercent'),
      cbsPercent: payload.cbsPercent === undefined ? undefined : assertPercent(payload.cbsPercent, 'cbsPercent')
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.updateIbsCbsTable(this.accountId!, id, nextPayload);
    }

    const index = inMemoryIbsCbsTables.findIndex((table) => table.id === id);
    if (index === -1) {
      return null;
    }

    const current = inMemoryIbsCbsTables[index];
    const code = nextPayload.code ?? current.code;
    const duplicate = inMemoryIbsCbsTables.some(
      (table) => table.id !== id && table.code.toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      throw new Error('code already exists');
    }

    const next: FiscalIbsCbsTableSummary = {
      ...current,
      code,
      description: nextPayload.description ?? current.description,
      ibsPercent: nextPayload.ibsPercent ?? current.ibsPercent,
      cbsPercent: nextPayload.cbsPercent ?? current.cbsPercent
    };

    inMemoryIbsCbsTables[index] = next;
    return next;
  }

  public async listPisCofinsRules(
    filters: FiscalPisCofinsRuleFilters = {}
  ): Promise<FiscalPisCofinsRuleSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listPisCofinsRules({
        accountId: this.accountId!,
        regime: filters.regime,
        appliesTo: filters.appliesTo
      });
    }
    return PIS_COFINS_RULES.filter((rule) =>
      (!filters.regime || rule.regime === filters.regime)
      && (!filters.appliesTo || rule.appliesTo === filters.appliesTo)
    );
  }

  public async listCfop(filters: FiscalCfopFilters = {}): Promise<FiscalCfopSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listCfop({
        accountId: this.accountId!,
        search: filters.search,
        section: filters.section,
        documentType: filters.documentType
      });
    }
    const normalizedSearch = normalizeTerm(filters.search);

    return inMemoryCfopEntries
      .filter((entry) => !filters.section || entry.section === filters.section)
      .filter(
        (entry) => !filters.documentType || entry.applicableTo.includes(filters.documentType)
      )
      .filter((entry) =>
        normalizedSearch.length === 0
          || `${entry.code} ${entry.description} ${entry.category} ${entry.section}`
            .toLowerCase()
            .includes(normalizedSearch)
      );
  }

  public async createCfop(payload: CreateFiscalCfopRequest): Promise<FiscalCfopSummary> {
    const cfop = normalizeCfopPayload(payload);
    const existing = await this.listCfop();

    if (existing.some((entry) => entry.code.toLowerCase() === cfop.code.toLowerCase())) {
      throw new Error('code already exists');
    }

    if (this.hasDbRepo()) {
      return this.dbRepo!.createCfop(this.accountId!, cfop);
    }

    inMemoryCfopEntries.unshift(cfop);
    return cfop;
  }

  public async updateCfop(
    code: string,
    payload: UpdateFiscalCfopRequest
  ): Promise<FiscalCfopSummary | null> {
    const currentCode = assertNonEmpty(code, 'code');
    const existing = await this.listCfop();
    const current = existing.find((entry) => entry.code === currentCode);

    if (!current) {
      return null;
    }

    const next = normalizeCfopPayload(payload, current);
    const duplicate = existing.some(
      (entry) => entry.code !== currentCode && entry.code.toLowerCase() === next.code.toLowerCase()
    );

    if (duplicate) {
      throw new Error('code already exists');
    }

    if (this.hasDbRepo()) {
      return this.dbRepo!.updateCfop(this.accountId!, currentCode, next);
    }

    const index = inMemoryCfopEntries.findIndex((entry) => entry.code === currentCode);
    inMemoryCfopEntries[index] = next;
    return next;
  }

  public async listNcmEntries(filters: FiscalNcmEntryFilters = {}): Promise<FiscalNcmEntrySummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listNcmEntries({
        accountId: this.accountId!,
        search: filters.search
      });
    }
    return NCM_ENTRIES.filter((entry) =>
      matchesContains(
        `${entry.ncm} ${entry.category} ${entry.notes} ${entry.source}`,
        filters.search
      )
    );
  }

  public async listIcmsMatrix(filters: FiscalIcmsMatrixFilters = {}): Promise<FiscalIcmsMatrixRowSummary[]> {
    const rules = await this.listIcmsRules(filters);
    const rows = new Map<string, FiscalIcmsMatrixRowSummary>();

    for (const rule of rules) {
      const id = `${rule.ufOrigin}-${rule.ufDestination}-${rule.operationType}`;
      const current = rows.get(id);

      if (!current || rule.rate > current.rate) {
        rows.set(id, {
          id: toIcmsMatrixId(rule.ufOrigin, rule.ufDestination, rule.operationType),
          ufOrigin: rule.ufOrigin,
          ufDestination: rule.ufDestination,
          rate: rule.rate,
          operationType: rule.operationType
        });
      }
    }

    return Array.from(rows.values()).filter((row) =>
      matchesContains(
        `${row.id} ${row.ufOrigin} ${row.ufDestination} ${row.operationType} ${row.rate}`,
        filters.search
      )
      && matchesExact(row.ufOrigin, filters.ufOrigin)
      && matchesExact(row.ufDestination, filters.ufDestination)
      && (!filters.operationType || row.operationType === filters.operationType)
    );
  }

  public async createIcmsMatrix(
    payload: CreateFiscalIcmsMatrixRequest
  ): Promise<FiscalIcmsMatrixRowSummary> {
    const ufOrigin = assertUf(payload.ufOrigin, 'ufOrigin');
    const ufDestination = assertUf(payload.ufDestination, 'ufDestination');
    const operationType = normalizeIcmsOperationType(payload.operationType, ufOrigin, ufDestination);
    const rate = assertPercent(payload.rate, 'rate');
    const cst = payload.cst === undefined ? '000' : assertNonEmpty(payload.cst, 'cst');

    const existing = await this.listIcmsMatrix({ ufOrigin, ufDestination, operationType });
    if (existing.length > 0) {
      throw new Error('matrix entry already exists');
    }

    const rule: FiscalIcmsRuleSummary = {
      id: `icms-${ufOrigin.toLowerCase()}-${ufDestination.toLowerCase()}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`,
      ufOrigin,
      ufDestination,
      ncm: '',
      rate,
      cst,
      operationType
    };

    if (this.hasDbRepo()) {
      const created = await this.dbRepo!.createIcmsMatrixRule(this.accountId!, {
        ufOrigin,
        ufDestination,
        rate,
        cst,
        operationType
      });
      return {
        id: toIcmsMatrixId(created.ufOrigin, created.ufDestination, created.operationType),
        ufOrigin: created.ufOrigin,
        ufDestination: created.ufDestination,
        rate: created.rate,
        operationType: created.operationType
      };
    }

    inMemoryIcmsRules.unshift(rule);
    return {
      id: toIcmsMatrixId(rule.ufOrigin, rule.ufDestination, rule.operationType),
      ufOrigin: rule.ufOrigin,
      ufDestination: rule.ufDestination,
      rate: rule.rate,
      operationType: rule.operationType
    };
  }

  public async listNfseLayouts(filters: FiscalNfseLayoutFilters = {}): Promise<FiscalNfseLayoutSummary[]> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.listNfseLayouts({
        accountId: this.accountId!,
        search: filters.search,
        state: filters.state,
        active: filters.active
      });
    }
    return inMemoryNfseLayouts.filter((layout) =>
      matchesContains(
        `${layout.id} ${layout.city} ${layout.state} ${layout.municipalityCode} ${layout.provider} ${layout.version} ${layout.serviceCode} ${layout.serviceFocus}`,
        filters.search
      )
      && matchesExact(layout.state, filters.state)
      && (filters.active === undefined || layout.active === filters.active)
    );
  }

  public async createNfseLayout(
    payload: CreateFiscalNfseLayoutRequest
  ): Promise<FiscalNfseLayoutSummary> {
    const city = assertNonEmpty(payload.city, 'city');
    const state = assertNonEmpty(payload.state, 'state').toUpperCase();
    const provider = assertNonEmpty(payload.provider, 'provider');
    const version = assertNonEmpty(payload.version, 'version');

    const layout: FiscalNfseLayoutSummary = {
      id: sanitizeLayoutId(city, state),
      city,
      state,
      municipalityCode: payload.municipalityCode?.trim() ?? '',
      provider,
      version,
      active: payload.active ?? false,
      environment: payload.environment,
      serviceCode: payload.serviceCode?.trim() ?? '',
      serviceFocus: payload.serviceFocus?.trim() ?? ''
    };

    if (this.hasDbRepo()) {
      return this.dbRepo!.createNfseLayout(this.accountId!, layout);
    }

    inMemoryNfseLayouts.unshift(layout);
    return layout;
  }

  public async updateNfseLayout(
    id: string,
    payload: UpdateFiscalNfseLayoutRequest
  ): Promise<FiscalNfseLayoutSummary | null> {
    if (this.hasDbRepo()) {
      return this.dbRepo!.updateNfseLayout(this.accountId!, id, payload);
    }

    const index = inMemoryNfseLayouts.findIndex((layout) => layout.id === id);
    if (index === -1) {
      return null;
    }

    const current = inMemoryNfseLayouts[index];
    const next: FiscalNfseLayoutSummary = {
      ...current,
      city: payload.city?.trim() || current.city,
      state: payload.state?.trim().toUpperCase() || current.state,
      municipalityCode: payload.municipalityCode?.trim() ?? current.municipalityCode,
      provider: payload.provider?.trim() || current.provider,
      version: payload.version?.trim() || current.version,
      active: payload.active ?? current.active,
      environment: payload.environment ?? current.environment,
      serviceCode: payload.serviceCode?.trim() ?? current.serviceCode,
      serviceFocus: payload.serviceFocus?.trim() ?? current.serviceFocus
    };

    inMemoryNfseLayouts[index] = next;
    return next;
  }

  public async listNfseDocuments(
    filters: FiscalNfseDocumentFilters = {}
  ): Promise<FiscalNfseDocumentSummary[]> {
    if (this.hasDbRepo()) {
      const documents = await this.dbRepo!.listNfseDocuments({
        accountId: this.accountId!,
        status: filters.status,
        customerSearch: filters.customerSearch
      });
      return documents.map((document) => toFiscalDocumentSummary(document));
    }

    const normalizedSearch = normalizeTerm(filters.customerSearch);

    return this.inMemoryNfseStore()
      .filter((document) => !filters.status || document.status === filters.status)
      .filter((document) =>
        normalizedSearch.length === 0
        || normalizeTerm(document.customer.name).includes(normalizedSearch)
        || normalizeTerm(document.customer.document).includes(normalizedSearch)
      )
      .map((document) => toFiscalDocumentSummary(document));
  }

  public async getNfseDocument(id: string): Promise<FiscalNfseDocumentSummary | null> {
    if (this.hasDbRepo()) {
      const found = await this.dbRepo!.findNfseDocument(this.accountId!, id);
      return found ? toFiscalDocumentSummary(found) : null;
    }

    const found = this.inMemoryNfseStore().find((document) => document.id === id);
    return found ? toFiscalDocumentSummary(found) : null;
  }

  public async createNfseDocument(
    payload: CreateFiscalNfseDocumentRequest
  ): Promise<FiscalNfseDocumentSummary> {
    const serie = payload.serie?.trim() || '001';
    const customer = {
      type: payload.customer.type,
      document: assertNonEmpty(payload.customer.document, 'customer.document'),
      name: assertNonEmpty(payload.customer.name, 'customer.name'),
      email: payload.customer.email?.trim() || undefined,
      phone: payload.customer.phone?.trim() || undefined
    };
    const services = normalizeServices(payload.services);
    const provider = this.nfseRuntime?.provider ?? payload.provider ?? 'abrasf';
    const documentNumber = assertPositiveInteger(
      payload.numero,
      'numero',
      nextDocumentNumber()
    );
    const competencia = payload.competencia?.trim() || todayDate();
    const municipalityCode =
      this.nfseRuntime?.municipalityCode ?? (payload.municipalityCode?.trim() || '3550308');
    const apiUrl =
      this.nfseRuntime?.apiUrl
      ?? (payload.apiUrl?.trim() || 'https://simulator.example.invalid/nfse');

    const draft = toEmitter(
      provider,
      municipalityCode,
      apiUrl,
      this.allowNfseSimulation,
      this.nfseRuntime
    ).createDraft({
      numero: documentNumber,
      competencia,
      customer,
      services,
      observations: payload.observations?.trim() || undefined
    });

    const document: NfseIssuerDocument = {
      ...draft,
      id: nextDocumentId(),
      serie,
      provider,
      issuer: draft.issuer,
      municipalityCode,
      apiUrl,
      environment: 'homologacao'
    };

    if (this.hasDbRepo()) {
      const persisted = await this.dbRepo!.createNfseDocument(this.accountId!, document);
      return toFiscalDocumentSummary(persisted);
    }

    this.inMemoryNfseStore().unshift(document);
    return toFiscalDocumentSummary(document);
  }

  public async issueNfseDocument(
    id: string,
    operationKey = `nfse:${id}:issue`
  ): Promise<FiscalNfseDocumentSummary | null> {
    if (this.hasDbRepo()) {
      let current = await this.dbRepo!.findNfseDocument(this.accountId!, id);
      if (!current) return null;

      const providerRequestKey = `nfse:${id}:issue`;
      const claimOperation = this.dbRepo!.claimNfseOperation;
      if (typeof claimOperation === 'function') {
        const claim = await claimOperation.call(
          this.dbRepo,
          this.accountId!,
          id,
          'issue' satisfies NfseOperationKind,
          operationKey,
          providerRequestKey
        );
        if (!claim) return null;
        if (claim.state === 'completed') return toFiscalDocumentSummary(claim.document);
        current = claim.document;
      }

      const emitter = toEmitter(
        current.provider,
        current.municipalityCode,
        current.apiUrl,
        this.allowNfseSimulation,
        this.nfseRuntime
      );
      const next: NfseIssuerDocument = {
        ...(await emitter.issue(current, providerRequestKey)),
        municipalityCode: current.municipalityCode,
        apiUrl: current.apiUrl,
        environment: current.environment
      };
      const persisted = await this.dbRepo!.updateNfseDocument(this.accountId!, next);
      return persisted ? toFiscalDocumentSummary(persisted) : null;
    }

    const documents = this.inMemoryNfseStore();
    const index = documents.findIndex((document) => document.id === id);
    if (index === -1) {
      return null;
    }

    const current = documents[index];
    const emitter = toEmitter(
      current.provider,
      current.municipalityCode,
      current.apiUrl,
      this.allowNfseSimulation,
      this.nfseRuntime
    );
    const nextDocument = await emitter.issue(current, operationKey);
    const next: NfseIssuerDocument = {
      ...nextDocument,
      municipalityCode: current.municipalityCode,
      apiUrl: current.apiUrl,
      environment: 'homologacao'
    };

    documents[index] = next;
    return toFiscalDocumentSummary(next);
  }

  public async cancelNfseDocument(
    id: string,
    payload: CancelFiscalNfseDocumentRequest,
    operationKey = `nfse:${id}:cancel`
  ): Promise<FiscalNfseDocumentSummary | null> {
    if (this.hasDbRepo()) {
      let current = await this.dbRepo!.findNfseDocument(this.accountId!, id);
      if (!current) return null;

      const providerRequestKey = `nfse:${id}:cancel`;
      const claimOperation = this.dbRepo!.claimNfseOperation;
      if (typeof claimOperation === 'function') {
        const claim = await claimOperation.call(
          this.dbRepo,
          this.accountId!,
          id,
          'cancel' satisfies NfseOperationKind,
          operationKey,
          providerRequestKey
        );
        if (!claim) return null;
        if (claim.state === 'completed') return toFiscalDocumentSummary(claim.document);
        current = claim.document;
      }

      const emitter = toEmitter(
        current.provider,
        current.municipalityCode,
        current.apiUrl,
        this.allowNfseSimulation,
        this.nfseRuntime
      );
      const next: NfseIssuerDocument = {
        ...(await emitter.cancel(
          current,
          assertNonEmpty(payload.reason, 'reason'),
          providerRequestKey
        )),
        municipalityCode: current.municipalityCode,
        apiUrl: current.apiUrl,
        environment: current.environment
      };
      const persisted = await this.dbRepo!.updateNfseDocument(this.accountId!, next);
      return persisted ? toFiscalDocumentSummary(persisted) : null;
    }

    const documents = this.inMemoryNfseStore();
    const index = documents.findIndex((document) => document.id === id);
    if (index === -1) {
      return null;
    }

    const current = documents[index];
    const emitter = toEmitter(
      current.provider,
      current.municipalityCode,
      current.apiUrl,
      this.allowNfseSimulation,
      this.nfseRuntime
    );
    const nextDocument = await emitter.cancel(
      current,
      assertNonEmpty(payload.reason, 'reason'),
      `nfse:${id}:cancel`
    );
    const next: NfseIssuerDocument = {
      ...nextDocument,
      municipalityCode: current.municipalityCode,
      apiUrl: current.apiUrl,
      environment: 'homologacao'
    };

    documents[index] = next;
    return toFiscalDocumentSummary(next);
  }

  public async getTaxPreview(): Promise<FiscalTaxPreview> {
    return createTaxPreview();
  }

  public async getDashboardSummary(): Promise<FiscalDashboardSummary> {
    const [cfopItems, icmsRules, pisCofinsRules, ncmEntries, nfseLayouts] = await Promise.all([
      this.listCfop(),
      this.listIcmsRules(),
      this.listPisCofinsRules(),
      this.listNcmEntries(),
      this.listNfseLayouts()
    ]);

    return {
      activeTaxes: 5,
      cfopCount: cfopItems.length,
      nfseLayouts: nfseLayouts.length,
      icmsRules: icmsRules.length,
      pisCofinsRules: pisCofinsRules.length,
      ncmEntries: ncmEntries.length,
      readOnly: false,
      backendScope: 'Consulta HTTP real para tabelas fiscais prioritárias com backoffice inicial de layouts NFS-e',
      pendingScopes: [
        'cadastros fiscais persistidos',
        'emissão NFS-e transacional',
        'escrituração e backoffice fiscal avançado'
      ],
      alerts: [
        {
          variant: 'info',
          title: 'Consulta fiscal via backend',
          message:
            'A SPA consome contratos HTTP reais do backend para ICMS, PIS/COFINS, CFOP, NCM, NFS-e e matriz ICMS.'
        },
        {
          variant: 'info',
          title: 'Backoffice inicial de NFS-e publicado',
          message:
            'Layouts municipais de NFS-e agora podem ser cadastrados e ajustados pelo backoffice fiscal com gate dedicado.'
        },
        {
          variant: 'info',
          title: 'Cobertura ampliada de tabelas prioritárias',
          message:
            'As rotas fiscais aceitam filtros operacionais por UF, regime, documento e status sem depender de catálogo local na SPA.'
        },
        {
          variant: 'warning',
          title: 'Ciclo fiscal documental em operação',
          message:
            'Emissão e cancelamento de documentos NFS-e funcionam no fluxo mínimo em memória com trilha auditada; etapa transacional persistente segue em evolução.'
        }
      ]
    };
  }
}

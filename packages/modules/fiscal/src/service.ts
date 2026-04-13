import type {
  FiscalCfopSummary,
  FiscalDashboardSummary,
  FiscalIcmsMatrixRowSummary,
  FiscalIcmsRuleSummary,
  FiscalNcmEntrySummary,
  FiscalNfseLayoutSummary,
  FiscalPisCofinsRuleSummary,
  FiscalTaxPreview
} from '@cvg-his-v2/shared-contracts';

import { CFOP_TABLE, type CfopSection } from './cfop-table.js';
import { DEFAULT_TAX_RATES, TaxCalculator, type TaxRegime } from './tax-calculator.js';

export interface FiscalCfopFilters {
  readonly search?: string;
  readonly section?: CfopSection;
  readonly documentType?: FiscalCfopSummary['applicableTo'][number];
}

export interface FiscalIcmsRuleFilters {
  readonly ufOrigin?: string;
  readonly ufDestination?: string;
  readonly ncm?: string;
  readonly operationType?: FiscalIcmsRuleSummary['operationType'];
}

export interface FiscalPisCofinsRuleFilters {
  readonly regime?: TaxRegime;
  readonly appliesTo?: FiscalPisCofinsRuleSummary['appliesTo'];
}

export interface FiscalNcmEntryFilters {
  readonly search?: string;
}

export interface FiscalIcmsMatrixFilters {
  readonly ufOrigin?: string;
  readonly ufDestination?: string;
  readonly operationType?: FiscalIcmsMatrixRowSummary['operationType'];
}

export interface FiscalNfseLayoutFilters {
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

export class FiscalService {
  public listIcmsRules(filters: FiscalIcmsRuleFilters = {}): FiscalIcmsRuleSummary[] {
    return ICMS_RULES.filter((rule) =>
      matchesExact(rule.ufOrigin, filters.ufOrigin)
      && matchesExact(rule.ufDestination, filters.ufDestination)
      && matchesExact(rule.ncm, filters.ncm)
      && (!filters.operationType || rule.operationType === filters.operationType)
    );
  }

  public listPisCofinsRules(
    filters: FiscalPisCofinsRuleFilters = {}
  ): FiscalPisCofinsRuleSummary[] {
    return PIS_COFINS_RULES.filter((rule) =>
      (!filters.regime || rule.regime === filters.regime)
      && (!filters.appliesTo || rule.appliesTo === filters.appliesTo)
    );
  }

  public listCfop(filters: FiscalCfopFilters = {}): FiscalCfopSummary[] {
    const normalizedSearch = normalizeTerm(filters.search);

    return CFOP_TABLE
      .filter((entry) => !filters.section || entry.section === filters.section)
      .filter(
        (entry) => !filters.documentType || entry.applicableTo.includes(filters.documentType)
      )
      .map((entry) => ({
        ...entry,
        documentTypesLabel: entry.applicableTo.join(', ').toUpperCase()
      }))
      .filter((entry) =>
        normalizedSearch.length === 0
          || `${entry.code} ${entry.description} ${entry.category} ${entry.section}`
            .toLowerCase()
            .includes(normalizedSearch)
      );
  }

  public listNcmEntries(filters: FiscalNcmEntryFilters = {}): FiscalNcmEntrySummary[] {
    return NCM_ENTRIES.filter((entry) =>
      matchesContains(
        `${entry.ncm} ${entry.category} ${entry.notes} ${entry.source}`,
        filters.search
      )
    );
  }

  public listIcmsMatrix(filters: FiscalIcmsMatrixFilters = {}): FiscalIcmsMatrixRowSummary[] {
    const rows = new Map<string, FiscalIcmsMatrixRowSummary>();

    for (const rule of ICMS_RULES) {
      const id = `${rule.ufOrigin}-${rule.ufDestination}-${rule.operationType}`;
      const current = rows.get(id);

      if (!current || rule.rate > current.rate) {
        rows.set(id, {
          id: `matrix-${id.toLowerCase()}`,
          ufOrigin: rule.ufOrigin,
          ufDestination: rule.ufDestination,
          rate: rule.rate,
          operationType: rule.operationType
        });
      }
    }

    return Array.from(rows.values()).filter((row) =>
      matchesExact(row.ufOrigin, filters.ufOrigin)
      && matchesExact(row.ufDestination, filters.ufDestination)
      && (!filters.operationType || row.operationType === filters.operationType)
    );
  }

  public listNfseLayouts(filters: FiscalNfseLayoutFilters = {}): FiscalNfseLayoutSummary[] {
    return NFSE_LAYOUTS.filter((layout) =>
      matchesExact(layout.state, filters.state)
      && (filters.active === undefined || layout.active === filters.active)
    );
  }

  public getTaxPreview(): FiscalTaxPreview {
    return createTaxPreview();
  }

  public getDashboardSummary(): FiscalDashboardSummary {
    const cfopItems = this.listCfop();
    const icmsRules = this.listIcmsRules();
    const pisCofinsRules = this.listPisCofinsRules();
    const ncmEntries = this.listNcmEntries();
    const nfseLayouts = this.listNfseLayouts();

    return {
      activeTaxes: 5,
      cfopCount: cfopItems.length,
      nfseLayouts: nfseLayouts.length,
      icmsRules: icmsRules.length,
      pisCofinsRules: pisCofinsRules.length,
      ncmEntries: ncmEntries.length,
      readOnly: true,
      backendScope: 'Consulta HTTP real para tabelas fiscais prioritárias',
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
          title: 'Cobertura ampliada de tabelas prioritárias',
          message:
            'As rotas fiscais aceitam filtros operacionais por UF, regime, documento e status sem depender de catálogo local na SPA.'
        },
        {
          variant: 'warning',
          title: 'Escopo atual segue read-only',
          message:
            'Cadastro, edição e emissão fiscal ainda não estão publicados porque o backend transacional correspondente não existe.'
        }
      ]
    };
  }
}

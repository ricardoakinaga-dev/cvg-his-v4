/**
 * Fiscal Tax Calculator — CVG-HIS-V2
 *
 * Parametric Brazilian tax engine for:
 * - ICMS (Circulating Goods and Services Tax)
 * - ICMS-ST (ICMS Substituição Tributária)
 * - IPI (Industrialized Products Tax)
 * - PIS (Social Integration Tax)
 * - COFINS (Social Security Financing Contribution)
 * - ISS (Services Tax - for NFS-e)
 *
 * All rates are configurable per product/service category and UF.
 * Calculation is deterministic and auditable.
 */

export type TaxRegime = 'simples_nacional' | 'lucro_presumido' | 'lucro_real';

export type TaxType = 'icms' | 'icms_st' | 'ipi' | 'pis' | 'cofins' | 'iss';

export type TaxBasis = 'gross' | 'net' | 'freight' | 'insurance' | 'other';

export type ProductType = 'mercadoria' | 'produto_industrializado' | 'insumo' | 'embalagem' | 'servico';

export interface TaxRateConfig {
  readonly rate: number;        // Alíquota em decimal (ex: 0.18 para 18%)
  readonly cst?: string;        // Código de Situação Tributária (CST)
  readonly reducaoBase?: number; // Redução de base de cálculo (decimal)
  readonly adicional?: number;  // Alíquota adicional (ex: diferencial de alíquota)
}

export interface TaxCalculationLine {
  readonly productType: ProductType;
  readonly cfop: string;
  readonly baseValue: number;
  readonly icms?: TaxRateConfig;
  readonly icmsSt?: TaxRateConfig;
  readonly ipi?: TaxRateConfig;
  readonly pis?: TaxRateConfig;
  readonly cofins?: TaxRateConfig;
  readonly iss?: TaxRateConfig;
}

export interface TaxCalculationResult {
  readonly line: TaxCalculationLine;
  readonly icmsValue: number;
  readonly icmsStValue: number;
  readonly ipiValue: number;
  readonly pisValue: number;
  readonly cofinsValue: number;
  readonly issValue: number;
  readonly totalTaxValue: number;
  readonly totalWithTax: number;
  readonly taxBreakdown: readonly {
    type: TaxType;
    rate: number;
    baseValue: number;
    taxValue: number;
    cst?: string;
  }[];
}

/**
 * Tax rate configuration by product type and tax regime.
 * Rates for Simples Nacional are illustrative — verify with current PGDAS.
 */
export interface TaxRateTable {
  // ICMS rates by UF origin → UF destination
  readonly icms: Record<string, Record<string, number>>;
  // ICMS-ST rates (substituição tributária)
  readonly icmsSt: Record<string, number>;
  // IPI rates by product chapter (NCM chapter)
  readonly ipi: Record<string, number>;
  // PIS/COFINS rates by regime
  readonly pis: Record<TaxRegime, number>;
  readonly cofins: Record<TaxRegime, number>;
  // ISS rates by service type (LC116/CNAE)
  readonly iss: Record<string, number>;
}

/**
 * Default tax rate table for veterinary/medical commerce (Brazil).
 * Replace with actual rates from accounting system.
 */
export const DEFAULT_TAX_RATES: TaxRateTable = {
  icms: {
    // UF origin → { UF destination → alíquota }
    // SP as default origin
    'SP': {
      'SP': 18,
      'RJ': 12,
      'MG': 18,
      'ES': 17,
      'BA': 17,
      'PR': 12,
      'RS': 12,
      'SC': 17,
      'DF': 18,
      'GO': 17,
      'PE': 18,
      'CE': 18,
      'default': 18
    }
  },
  icmsSt: {
    // MVA (Margem de Valor Agregado) para Substituição Tributária
    'default': 40, // 40% MVA padrão para medicamentos/radioativos
    'medicamentos': 40,
    'material_medico': 40,
    'vacinas': 32
  },
  ipi: {
    // IPI por capítulo NCM — 0 para serviços
    '9999': 0,  // default (serviços/não tributados)
    '3004': 5,  // medicamentos
    '9018': 5,  // instrumentos médicos
    '9022': 8,  // equipamentos médicos
  },
  pis: {
    'simples_nacional': 0.65,
    'lucro_presumido': 1.65,
    'lucro_real': 1.65
  },
  cofins: {
    'simples_nacional': 3.0,
    'lucro_presumido': 7.6,
    'lucro_real': 7.6
  },
  iss: {
    // ISS por CNAE — pode variar por município (São Paulo 5%)
    'cnae_agendamento': 5.0,
    'cnae_veterinario': 5.0,
    'cnae_laboratorio': 5.0,
    'cnae_imagem': 5.0,
    'default': 5.0
  }
};

/**
 * Brazilian Tax Calculator service.
 */
export class TaxCalculator {
  constructor(
    private readonly rates: TaxRateTable = DEFAULT_TAX_RATES,
    private readonly originUf: string = 'SP',
    private readonly regime: TaxRegime = 'simples_nacional'
  ) {}

  /**
   * Calculate all applicable taxes for a single line item.
   */
  calculate(line: TaxCalculationLine): TaxCalculationResult {
    const breakdown: {
      type: TaxType;
      rate: number;
      baseValue: number;
      taxValue: number;
      cst?: string;
    }[] = [];

    // ICMS
    let icmsValue = 0;
    if (line.icms) {
      const base = this.applyReduction(line.icms.reducaoBase ?? 0, line.baseValue);
      icmsValue = this.round(this.percentOf(line.icms.rate, base));
      breakdown.push({
        type: 'icms',
        rate: line.icms.rate,
        baseValue: base,
        taxValue: icmsValue,
        cst: line.icms.cst
      });
    }

    // ICMS-ST
    let icmsStValue = 0;
    if (line.icmsSt) {
      const mva = this.rates.icmsSt['default'] / 100;
      const baseSt = this.round(line.baseValue * (1 + mva));
      const icmsNormal = icmsValue;
      const icmsStCalc = this.round(this.percentOf(line.icmsSt.rate, baseSt));
      icmsStValue = Math.max(0, icmsStCalc - icmsNormal);
      breakdown.push({
        type: 'icms_st',
        rate: line.icmsSt.rate,
        baseValue: baseSt,
        taxValue: icmsStValue,
        cst: line.icmsSt.cst
      });
    }

    // IPI
    let ipiValue = 0;
    if (line.ipi && line.productType !== 'servico') {
      ipiValue = this.round(this.percentOf(line.ipi.rate, line.baseValue));
      breakdown.push({
        type: 'ipi',
        rate: line.ipi.rate,
        baseValue: line.baseValue,
        taxValue: ipiValue,
        cst: line.ipi.cst
      });
    }

    // PIS
    let pisValue = 0;
    if (line.pis) {
      const pisRate = this.rates.pis[this.regime] / 100;
      pisValue = this.round(this.percentOf(pisRate, line.baseValue));
      breakdown.push({
        type: 'pis',
        rate: pisRate,
        baseValue: line.baseValue,
        taxValue: pisValue
      });
    }

    // COFINS
    let cofinsValue = 0;
    if (line.cofins) {
      const cofinsRate = this.rates.cofins[this.regime] / 100;
      cofinsValue = this.round(this.percentOf(cofinsRate, line.baseValue));
      breakdown.push({
        type: 'cofins',
        rate: cofinsRate,
        baseValue: line.baseValue,
        taxValue: cofinsValue
      });
    }

    // ISS (serviços)
    let issValue = 0;
    if (line.iss && line.productType === 'servico') {
      issValue = this.round(this.percentOf(line.iss.rate, line.baseValue));
      breakdown.push({
        type: 'iss',
        rate: line.iss.rate,
        baseValue: line.baseValue,
        taxValue: issValue
      });
    }

    const totalTaxValue = icmsValue + icmsStValue + ipiValue + pisValue + cofinsValue + issValue;

    return {
      line,
      icmsValue,
      icmsStValue,
      ipiValue,
      pisValue,
      cofinsValue,
      issValue,
      totalTaxValue,
      totalWithTax: this.round(line.baseValue + totalTaxValue),
      taxBreakdown: breakdown
    };
  }

  /**
   * Calculate tax for a batch of line items.
   */
  calculateBatch(lines: TaxCalculationLine[]): TaxCalculationResult[] {
    return lines.map(line => this.calculate(line));
  }

  /**
   * Get ICMS rate between origin UF and destination UF.
   */
  getIcmsRate(destinationUf: string): number {
    const origin = this.rates.icms[this.originUf];
    if (!origin) return 18;
    return origin[destinationUf] ?? origin['default'] ?? 18;
  }

  /**
   * Get ISS rate for a service CNAE.
   */
  getIssRate(cnae: string): number {
    return this.rates.iss[cnae] ?? this.rates.iss['default'];
  }

  /**
   * Calculate tax total from a batch result.
   */
  static sumTaxTotals(results: TaxCalculationResult[]): {
    baseValue: number;
    icms: number;
    icmsSt: number;
    ipi: number;
    pis: number;
    cofins: number;
    iss: number;
    totalTax: number;
    totalWithTax: number;
  } {
    return results.reduce(
      (acc, r) => ({
        baseValue: acc.baseValue + r.line.baseValue,
        icms: acc.icms + r.icmsValue,
        icmsSt: acc.icmsSt + r.icmsStValue,
        ipi: acc.ipi + r.ipiValue,
        pis: acc.pis + r.pisValue,
        cofins: acc.cofins + r.cofinsValue,
        iss: acc.iss + r.issValue,
        totalTax: acc.totalTax + r.totalTaxValue,
        totalWithTax: acc.totalWithTax + r.totalWithTax
      }),
      { baseValue: 0, icms: 0, icmsSt: 0, ipi: 0, pis: 0, cofins: 0, iss: 0, totalTax: 0, totalWithTax: 0 }
    );
  }

  private percentOf(rate: number, base: number): number {
    return base * (rate / 100);
  }

  private applyReduction(reducao: number, base: number): number {
    return base * (1 - reducao);
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

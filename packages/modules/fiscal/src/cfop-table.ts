/**
 * CFOP Table — Tabela de CFOP (Código Fiscal de Operações e Prestações)
 *
 * Brazil NFS-e and NFe fiscal operations reference table.
 * Based on UF-Secretaria da Fazenda official tables.
 *
 * CFOP Structure: SSSNNN
 * S = Section (1=Entrada, 5=Saída)
 * SS = Subsection (major category)
 * NNN = Sequential code
 */

export type CfopSection = 'entrada' | 'saida';

export type CfopCategory =
  | 'revenda'
  | 'industrializacao'
  | 'servico'
  | 'transferencia'
  | 'importacao'
  | 'exportacao'
  | 'devolucao'
  | 'ressarcimento'
  | 'operacao_fiscal';

export interface CfopEntry {
  code: string;
  description: string;
  section: CfopSection;
  category: CfopCategory;
  applicableTo: readonly ('nfse' | 'nfe' | 'nfce' | 'cte')[];
  icmsRelevant: boolean;
  pisCofinsRelevant: boolean;
  ipiRelevant: boolean;
}

/**
 * Complete CFOP table for medical/veterinary services commerce.
 * Covers operations typical in CVG-HIS-V2 context (clínicas veterinárias,
 * laboratórios, farms).
 */
export const CFOP_TABLE: readonly CfopEntry[] = [
  // ========== ENTRADA / COMPRAS ==========

  // 1.1 - Compra para revenda
  { code: '1101', description: 'Compra para revenda', section: 'entrada', category: 'revenda', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '1102', description: 'Compra para revenda em operação com ST', section: 'entrada', category: 'revenda', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },

  // 1.2 - Compra para industrialização
  { code: '1201', description: 'Compra para industrialização', section: 'entrada', category: 'industrializacao', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: true },
  { code: '1202', description: 'Compra para industrialização em operação com ST', section: 'entrada', category: 'industrializacao', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: true },
  { code: '1251', description: 'Transferência para industrialização', section: 'entrada', category: 'industrializacao', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: true },

  // 1.3 - Compra de ativo imobilizado
  { code: '1301', description: 'Compra de ativo imobilizado', section: 'entrada', category: 'operacao_fiscal', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },

  // 1.4 - Transferência
  { code: '1401', description: 'Transferência entre estabelecimentos', section: 'entrada', category: 'transferencia', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },

  // 1.5 - Devolução
  { code: '1501', description: 'Devolução de venda de mercadoria', section: 'entrada', category: 'devolucao', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '1503', description: 'Devolução de venda de serviço', section: 'entrada', category: 'devolucao', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },

  // 1.6 - Importação
  { code: '1601', description: 'Importação de mercadoria', section: 'entrada', category: 'importacao', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: true },
  { code: '1604', description: 'Importação de serviço', section: 'entrada', category: 'importacao', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },

  // 1.7 - Ressarcimento
  { code: '1701', description: 'Ressarcimento de ICMS/ST', section: 'entrada', category: 'ressarcimento', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: false, ipiRelevant: false },

  // 1.9 - Outras entradas
  { code: '1901', description: 'Entrada de mercadoria ou bem para uso próprio', section: 'entrada', category: 'operacao_fiscal', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '1910', description: 'Entrada de insumos em demonstração', section: 'entrada', category: 'operacao_fiscal', applicableTo: ['nfe'], icmsRelevant: false, pisCofinsRelevant: false, ipiRelevant: false },

  // ========== SERVIÇOS (NFS-e) ==========

  // 2.1 - Prestação de serviço intra-UF
  { code: '2101', description: 'Prestação de serviço intra-UF a não contribuinte', section: 'saida', category: 'servico', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '2111', description: 'Prestação de serviço intra-UF a contribuinte', section: 'saida', category: 'servico', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },

  // 2.2 - Prestação de serviço inter-UF
  { code: '2201', description: 'Prestação de serviço inter-UF a não contribuinte', section: 'saida', category: 'servico', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '2211', description: 'Prestação de serviço inter-UF a contribuinte', section: 'saida', category: 'servico', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },

  // 2.9 - Demais prestações de serviço
  { code: '2301', description: 'Prestação de serviço resultante de exterior', section: 'saida', category: 'servico', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },

  // ========== SAÍDA / VENDAS ==========

  // 5.1 - Venda de mercadoria
  { code: '5101', description: 'Venda de mercadoria para revenda', section: 'saida', category: 'revenda', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '5102', description: 'Venda de mercadoria para revenda em operação com ST', section: 'saida', category: 'revenda', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '5103', description: 'Venda de mercadoria para revenda - não tributada', section: 'saida', category: 'revenda', applicableTo: ['nfe', 'nfce'], icmsRelevant: false, pisCofinsRelevant: false, ipiRelevant: false },
  { code: '5104', description: 'Venda de mercadoria para revenda - isenta', section: 'saida', category: 'revenda', applicableTo: ['nfe', 'nfce'], icmsRelevant: false, pisCofinsRelevant: false, ipiRelevant: false },

  // 5.2 - Venda de produto industrializado
  { code: '5201', description: 'Venda de produto de fabricação própria', section: 'saida', category: 'industrializacao', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: true },
  { code: '5251', description: 'Transferência de produto industrializado', section: 'saida', category: 'transferencia', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: true },

  // 5.3 - Venda de ativo imobilizado
  { code: '5301', description: 'Venda de ativo imobilizado', section: 'saida', category: 'operacao_fiscal', applicableTo: ['nfe'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },

  // 5.4 - Transferência
  { code: '5401', description: 'Transferência entre estabelecimentos', section: 'saida', category: 'transferencia', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },

  // 5.5 - Devolução
  { code: '5501', description: 'Devolução de compra para revenda', section: 'saida', category: 'devolucao', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
  { code: '5503', description: 'Devolução de compra de serviço', section: 'saida', category: 'devolucao', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: true, ipiRelevant: false },

  // 5.7 - Exportação
  { code: '5601', description: 'Exportação de mercadoria', section: 'saida', category: 'exportacao', applicableTo: ['nfe'], icmsRelevant: false, pisCofinsRelevant: false, ipiRelevant: false },
  { code: '5602', description: 'Exportação de serviço', section: 'saida', category: 'exportacao', applicableTo: ['nfse'], icmsRelevant: false, pisCofinsRelevant: false, ipiRelevant: false },

  // 5.9 - Outras saídas
  { code: '5901', description: 'Saída de mercança ou bem do ativo imobilizado para uso próprio', section: 'saida', category: 'operacao_fiscal', applicableTo: ['nfe', 'nfce'], icmsRelevant: true, pisCofinsRelevant: true, ipiRelevant: false },
] as const;

/**
 * CFOP code lookup by code string.
 */
export function findCfopByCode(code: string): CfopEntry | undefined {
  return CFOP_TABLE.find(entry => entry.code === code);
}

/**
 * Filter CFOP entries by section.
 */
export function filterCfopBySection(section: CfopSection): readonly CfopEntry[] {
  return CFOP_TABLE.filter(entry => entry.section === section);
}

/**
 * Filter CFOP entries by document type.
 */
export function filterCfopByDocumentType(docType: CfopEntry['applicableTo'][number]): readonly CfopEntry[] {
  return CFOP_TABLE.filter(entry => entry.applicableTo.includes(docType));
}

/**
 * Filter CFOP entries by category.
 */
export function filterCfopByCategory(category: CfopCategory): readonly CfopEntry[] {
  return CFOP_TABLE.filter(entry => entry.category === category);
}

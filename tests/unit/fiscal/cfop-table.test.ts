import { describe, it, expect } from 'vitest';
import { CFOP_TABLE, findCfopByCode, filterCfopBySection, filterCfopByDocumentType, filterCfopByCategory } from '@cvg-his-v2/module-fiscal';

describe('module-fiscal / cfop-table', () => {
  describe('CFOP_TABLE', () => {
    it('contains entries for both entrada and saida sections', () => {
      const entrada = CFOP_TABLE.filter(e => e.section === 'entrada');
      const saida = CFOP_TABLE.filter(e => e.section === 'saida');
      expect(entrada.length).toBeGreaterThan(0);
      expect(saida.length).toBeGreaterThan(0);
    });

    it('all entries have valid code format SSSNNN', () => {
      for (const entry of CFOP_TABLE) {
        expect(entry.code).toMatch(/^\d{4}$/);
        // first digit: 1=entrada, 2=servico (NFS-e), 5=saida
        expect(entry.code[0]).toMatch(/^[125]$/);
      }
    });

    it('all entries have applicableTo array with at least one document type', () => {
      for (const entry of CFOP_TABLE) {
        expect(Array.isArray(entry.applicableTo)).toBe(true);
        expect(entry.applicableTo.length).toBeGreaterThan(0);
        entry.applicableTo.forEach(doc => {
          expect(['nfe', 'nfce', 'nfse']).toContain(doc);
        });
      }
    });

    it('all entries have boolean flags for icmsRelevant, pisCofinsRelevant, ipiRelevant', () => {
      for (const entry of CFOP_TABLE) {
        expect(typeof entry.icmsRelevant).toBe('boolean');
        expect(typeof entry.pisCofinsRelevant).toBe('boolean');
        expect(typeof entry.ipiRelevant).toBe('boolean');
      }
    });
  });

  describe('findCfopByCode', () => {
    it('returns entry for valid code 1101', () => {
      const entry = findCfopByCode('1101');
      expect(entry).toBeDefined();
      expect(entry!.code).toBe('1101');
      expect(entry!.section).toBe('entrada');
    });

    it('returns entry for valid code 5101', () => {
      const entry = findCfopByCode('5101');
      expect(entry).toBeDefined();
      expect(entry!.code).toBe('5101');
      expect(entry!.section).toBe('saida');
    });

    it('returns undefined for invalid code', () => {
      const entry = findCfopByCode('9999');
      expect(entry).toBeUndefined();
    });

    it('finds devolucao entries', () => {
      const devolucao = findCfopByCode('1501');
      expect(devolucao).toBeDefined();
      expect(devolucao!.category).toBe('devolucao');
    });
  });

  describe('filterCfopBySection', () => {
    it('returns only entrada entries for section "entrada"', () => {
      const entrada = filterCfopBySection('entrada');
      expect(entrada.length).toBeGreaterThan(0);
      entrada.forEach(e => expect(e.section).toBe('entrada'));
    });

    it('returns only saida entries for section "saida"', () => {
      const saida = filterCfopBySection('saida');
      expect(saida.length).toBeGreaterThan(0);
      saida.forEach(e => expect(e.section).toBe('saida'));
    });

    it('returns empty array for unknown section', () => {
      const result = filterCfopBySection('unknown');
      expect(result).toEqual([]);
    });
  });

  describe('filterCfopByDocumentType', () => {
    it('filters for nfe document type', () => {
      const nfeEntries = filterCfopByDocumentType('nfe');
      expect(nfeEntries.length).toBeGreaterThan(0);
      nfeEntries.forEach(e => {
        expect(e.applicableTo).toContain('nfe');
      });
    });

    it('filters for nfse document type', () => {
      const nfseEntries = filterCfopByDocumentType('nfse');
      expect(nfseEntries.length).toBeGreaterThan(0);
      nfseEntries.forEach(e => {
        expect(e.applicableTo).toContain('nfse');
      });
    });

    it('nfse entries have icmsRelevant false', () => {
      const nfseEntries = filterCfopByDocumentType('nfse');
      nfseEntries.forEach(e => {
        expect(e.icmsRelevant).toBe(false);
      });
    });
  });

  describe('filterCfopByCategory', () => {
    it('filters for revenda category', () => {
      const revenda = filterCfopByCategory('revenda');
      expect(revenda.length).toBeGreaterThan(0);
      revenda.forEach(e => expect(e.category).toBe('revenda'));
    });

    it('filters for servico category', () => {
      const servico = filterCfopByCategory('servico');
      expect(servico.length).toBeGreaterThan(0);
      servico.forEach(e => expect(e.category).toBe('servico'));
    });

    it('returns empty for unknown category', () => {
      const result = filterCfopByCategory('nao_existe');
      expect(result).toEqual([]);
    });
  });
});
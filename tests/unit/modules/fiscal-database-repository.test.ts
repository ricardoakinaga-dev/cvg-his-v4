import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: () => ({
    query: queryMock
  })
}));

import { DatabaseFiscalRepository } from '../../../packages/modules/fiscal/src/database-fiscal.repository.js';

describe('DatabaseFiscalRepository coverage guard', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('maps CFOP rows and filters by document type after SQL fetch', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          code: '5102',
          description: 'Venda de mercadoria',
          section: 'saida',
          category: 'mercadoria',
          applicable_to: JSON.stringify(['nfe', 'nfce']),
          icms_relevant: true,
          pis_cofins_relevant: true,
          ipi_relevant: false
        },
        {
          code: '5933',
          description: 'Prestacao de servico',
          section: 'saida',
          category: 'servico',
          applicable_to: JSON.stringify(['nfse']),
          icms_relevant: false,
          pis_cofins_relevant: true,
          ipi_relevant: false
        }
      ]
    });

    const repository = new DatabaseFiscalRepository();
    const items = await repository.listCfop({
      accountId: 'acc-1' as never,
      search: 'Venda',
      section: 'saida',
      documentType: 'nfe'
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.code).toBe('5102');
    expect(items[0]?.documentTypesLabel).toBe('NFE, NFCE');
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM cfop_entries'),
      ['%Venda%', 'saida']
    );
  });

  it('finds a CFOP by code and returns null when nothing is found', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            code: '1101',
            description: 'Compra para industrializacao',
            section: 'entrada',
            category: 'mercadoria',
            applicable_to: JSON.stringify(['nfe']),
            icms_relevant: true,
            pis_cofins_relevant: true,
            ipi_relevant: false
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const repository = new DatabaseFiscalRepository();
    const found = await repository.findCfopByCode('1101');
    const missing = await repository.findCfopByCode('9999');

    expect(found?.code).toBe('1101');
    expect(missing).toBeNull();
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM cfop_entries WHERE code = $1 LIMIT 1',
      ['1101']
    );
  });

  it('builds filtered ICMS, NCM and PIS/COFINS queries with mapped numeric rows', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'icms-1',
            uf_origin: 'SP',
            uf_destination: 'RJ',
            ncm: '3004',
            rate: '12',
            cst: '010',
            operation_type: 'interestadual'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'ncm-1',
            ncm: '3004',
            category: 'Medicamentos',
            ipi_rate: '5',
            source: 'db',
            notes: null
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'pis-1',
            regime: 'lucro_real',
            applies_to: 'servico',
            pis_rate: '1.65',
            cofins_rate: '7.60',
            notes: null
          }
        ]
      });

    const repository = new DatabaseFiscalRepository();
    const icms = await repository.listIcmsRules({
      accountId: 'acc-1' as never,
      ufOrigin: 'SP',
      ufDestination: 'RJ',
      ncm: '3004',
      operationType: 'interestadual'
    });
    const ncm = await repository.listNcmEntries({
      accountId: 'acc-1' as never,
      search: 'medic'
    });
    const pis = await repository.listPisCofinsRules({
      accountId: 'acc-1' as never,
      regime: 'lucro_real',
      appliesTo: 'servico'
    });

    expect(icms[0]?.rate).toBe(12);
    expect(ncm[0]?.notes).toBe('');
    expect(pis[0]?.pisRate).toBe(1.65);
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT * FROM icms_rules'),
      ['SP', 'RJ', '3004', 'interestadual']
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SELECT * FROM ncm_entries'),
      ['%medic%']
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT * FROM pis_cofins_rules'),
      ['lucro_real', 'servico']
    );
  });

  it('lists, creates and updates NFS-e layouts through the database branch', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'layout-1',
            city: 'Sao Paulo',
            state: 'SP',
            municipality_code: '3550308',
            provider: 'ISS SP',
            version: 'v1',
            active: true,
            environment: 'producao',
            service_code: '0407',
            service_focus: 'Consultas'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'layout-2',
            city: 'Campinas',
            state: 'SP',
            municipality_code: '3509502',
            provider: 'ISS Campinas',
            version: 'v2',
            active: false,
            environment: 'homologacao',
            service_code: '0407',
            service_focus: 'Interior'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'layout-2',
            city: 'Campinas',
            state: 'SP',
            municipality_code: '3509502',
            provider: 'ISS Campinas',
            version: 'v2',
            active: false,
            environment: 'homologacao',
            service_code: '0407',
            service_focus: 'Interior'
          }
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'layout-2',
            city: 'Campinas',
            state: 'SP',
            municipality_code: '3509502',
            provider: 'ISS Campinas',
            version: 'v3',
            active: true,
            environment: 'producao',
            service_code: '0413',
            service_focus: 'Laboratorio'
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const repository = new DatabaseFiscalRepository();
    const listed = await repository.listNfseLayouts({
      accountId: 'acc-1' as never,
      state: 'SP',
      active: true
    });
    const created = await repository.createNfseLayout('acc-1' as never, {
      id: 'layout-2',
      city: 'Campinas',
      state: 'SP',
      municipalityCode: '3509502',
      provider: 'ISS Campinas',
      version: 'v2',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Interior'
    });
    const updated = await repository.updateNfseLayout('acc-1' as never, 'layout-2', {
      active: true,
      version: 'v3',
      environment: 'producao',
      serviceCode: '0413',
      serviceFocus: 'Laboratorio'
    });
    const missing = await repository.updateNfseLayout('acc-1' as never, 'missing', {
      active: true
    });

    expect(listed[0]?.city).toBe('Sao Paulo');
    expect(created.id).toBe('layout-2');
    expect(updated?.version).toBe('v3');
    expect(updated?.active).toBe(true);
    expect(missing).toBeNull();
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT * FROM nfse_layouts'),
      ['SP', true]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO nfse_layouts'),
      [
        'layout-2',
        'Campinas',
        'SP',
        '3509502',
        'ISS Campinas',
        'v2',
        false,
        'homologacao',
        '0407',
        'Interior'
      ]
    );
  });
});

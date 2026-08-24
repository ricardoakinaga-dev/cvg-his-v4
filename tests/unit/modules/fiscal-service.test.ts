import { describe, expect, it, vi } from 'vitest';

import { FiscalService } from '../../../packages/modules/fiscal/src/service.js';
import type { DatabaseFiscalRepository } from '../../../packages/modules/fiscal/src/database-fiscal.repository.js';

describe('FiscalService coverage guard', () => {
  it('filters NCM catalog and consolidates ICMS matrix rows', async () => {
    const service = new FiscalService();

    const ncmRows = await service.listNcmEntries({ search: 'imagem' });
    const matrixRows = await service.listIcmsMatrix({
      ufOrigin: 'SP',
      operationType: 'interestadual'
    });

    expect(ncmRows).toHaveLength(1);
    expect(ncmRows[0]?.ncm).toBe('9022');
    expect(matrixRows.length).toBeGreaterThan(0);
    expect(matrixRows.every((row) => row.ufOrigin === 'SP')).toBe(true);
    expect(matrixRows.some((row) => row.ufDestination === 'RJ' && row.rate === 12)).toBe(true);
  });

  it('creates draft NFS-e documents with defaults and sanitization', async () => {
    const service = new FiscalService();

    const created = await service.createNfseDocument({
      provider: 'iss_net',
      customer: {
        type: 'cpf',
        document: ' 123.456.789-09 ',
        name: '  Ana Fiscal ',
        email: '  ana@example.com ',
        phone: '  +5511911110000 '
      },
      services: [
        {
          description: ' Painel laboratorial ',
          codigoServico: '0403',
          cnae: '8640-2/02',
          quantity: 1,
          unitValue: 240,
          totalValue: 240,
          issRate: 0.05,
          issValue: 12,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0,
          irrfValue: 0,
          inssValue: 0
        }
      ],
      observations: '  janela de coleta  '
    });

    expect(created.status).toBe('draft');
    expect(created.serie).toBe('001');
    expect(created.provider).toBe('iss_net');
    expect(created.customer.document).toBe('123.456.789-09');
    expect(created.customer.name).toBe('Ana Fiscal');
    expect(created.customer.email).toBe('ana@example.com');
    expect(created.customer.phone).toBe('+5511911110000');
    expect(created.observations).toBe('janela de coleta');
    expect(created.competencia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(created.numero).toBeGreaterThan(0);
  });

  it('fails closed by default and persists a safe provider failure', async () => {
    const stored: Record<string, unknown>[] = [];
    const repository = {
      listNfseDocuments: async () => stored.map((document) => ({ ...document })),
      findNfseDocument: async (_accountId: unknown, id: string) =>
        (stored.find((document) => document.id === id) as never) ?? null,
      createNfseDocument: async (_accountId: unknown, document: Record<string, unknown>) => {
        stored.unshift({ ...document });
        return { ...document };
      },
      updateNfseDocument: async (_accountId: unknown, document: Record<string, unknown>) => {
        const index = stored.findIndex((current) => current.id === document.id);
        if (index < 0) return null;
        stored[index] = { ...document };
        return { ...document };
      }
    } as unknown as DatabaseFiscalRepository;

    const service = new FiscalService(repository, 'acc-fiscal-error' as never);
    const created = await service.createNfseDocument({
      provider: 'abrasf',
      customer: { type: 'cpf', document: '12345678909', name: 'Cliente Fiscal' },
      services: [{
        description: 'Consulta',
        codigoServico: '0407',
        cnae: '7500-1/00',
        quantity: 1,
        unitValue: 100,
        totalValue: 100,
        issRate: 0.05,
        issValue: 5,
        pisValue: 0,
        cofinsValue: 0,
        csllValue: 0
      }]
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'private-provider-secret',
      headers: new Headers()
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const issued = await service.issueNfseDocument(created.id);
      expect(issued?.status).toBe('error');
      expect(issued?.observations).toContain('provider endpoint');
      expect(issued?.observations).not.toContain('private-provider-secret');
      expect((await service.getNfseDocument(created.id))?.status).toBe('error');
      expect((stored[0]?.status as string | undefined)).toBe('error');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects invalid draft payloads and invalid NFS-e transitions', async () => {
    const service = new FiscalService(undefined, undefined, { allowNfseSimulation: true });

    await expect(
      service.createNfseDocument({
        customer: {
          type: 'cnpj',
          document: '12.345.678/0001-90',
          name: 'Hospital Invalido'
        },
        services: [
          {
            description: 'Consulta',
            codigoServico: '0407',
            cnae: '7500-1/00',
            quantity: -1,
            unitValue: 100,
            totalValue: 100,
            issRate: 0.05,
            issValue: 5,
            pisValue: 0,
            cofinsValue: 0,
            csllValue: 0,
            irrfValue: 0,
            inssValue: 0
          }
        ]
      })
    ).rejects.toThrow(/service\.quantity must be zero or positive/);

    const created = await service.createNfseDocument({
      serie: '001',
      numero: 2010,
      customer: {
        type: 'cnpj',
        document: '98.765.432/0001-10',
        name: 'Clinica Beta'
      },
      services: [
        {
          description: 'Consulta retorno',
          codigoServico: '0407',
          cnae: '7500-1/00',
          quantity: 1,
          unitValue: 120,
          totalValue: 120,
          issRate: 0.05,
          issValue: 6,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0,
          irrfValue: 0,
          inssValue: 0
        }
      ]
    });

    await expect(service.cancelNfseDocument(created.id, { reason: 'nao pode ainda' })).rejects.toThrow(
      /Cannot cancel document in status: draft/
    );

    const issued = await service.issueNfseDocument(created.id);
    expect(issued?.status).toBe('issued');

    await expect(service.issueNfseDocument(created.id)).rejects.toThrow(
      /Cannot issue document in status: issued/
    );

    await expect(service.cancelNfseDocument(created.id, { reason: '   ' })).rejects.toThrow(
      /reason is required/
    );
  });

  it('creates and updates NFS-e layouts in memory backoffice mode', async () => {
    const service = new FiscalService();

    const created = await service.createNfseLayout({
      city: 'Campinas',
      state: 'SP',
      municipalityCode: '3509502',
      provider: 'ISS Campinas',
      version: 'v1',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Expansao interior'
    });

    const updated = await service.updateNfseLayout(created.id, {
      active: true,
      environment: 'producao'
    });

    expect(updated?.active).toBe(true);
    expect(updated?.environment).toBe('producao');

    const filtered = await service.listNfseLayouts({ state: 'SP', active: true });
    expect(filtered.some((layout) => layout.id === created.id)).toBe(true);
  });

  it('delegates fiscal catalog and layout operations to the database repository when scoped', async () => {
    const repo = {
      listIcmsRules: vi.fn().mockResolvedValue([
        {
          id: 'icms-db-1',
          ufOrigin: 'SP',
          ufDestination: 'RJ',
          ncm: '3004',
          rate: 12,
          cst: '010',
          operationType: 'interestadual'
        }
      ]),
      listPisCofinsRules: vi.fn().mockResolvedValue([
        {
          id: 'pis-db-1',
          regime: 'lucro_real',
          appliesTo: 'servico',
          pisRate: 1.65,
          cofinsRate: 7.6,
          notes: 'db'
        }
      ]),
      listCfop: vi.fn().mockResolvedValue([
        {
          code: '5102',
          description: 'Venda de mercadoria',
          section: 'saida',
          category: 'mercadoria',
          applicableTo: ['nfe'],
          icmsRelevant: true,
          pisCofinsRelevant: true,
          ipiRelevant: false,
          documentTypesLabel: 'NFE'
        }
      ]),
      listNcmEntries: vi.fn().mockResolvedValue([
        {
          id: 'ncm-db-1',
          ncm: '3004',
          category: 'Medicamentos',
          ipiRate: 5,
          source: 'db',
          notes: 'catalogo'
        }
      ]),
      listNfseLayouts: vi.fn().mockResolvedValue([
        {
          id: 'nfse-db-1',
          city: 'Sao Paulo',
          state: 'SP',
          municipalityCode: '3550308',
          provider: 'ISS SP',
          version: 'v1',
          active: true,
          environment: 'producao',
          serviceCode: '0407',
          serviceFocus: 'Consultas'
        }
      ]),
      createNfseLayout: vi.fn().mockImplementation(async (_accountId, layout) => layout),
      updateNfseLayout: vi.fn().mockImplementation(async (_accountId, id, payload) => ({
        id,
        city: payload.city ?? 'Campinas',
        state: payload.state ?? 'SP',
        municipalityCode: payload.municipalityCode ?? '3509502',
        provider: payload.provider ?? 'ISS Campinas',
        version: payload.version ?? 'v1',
        active: payload.active ?? true,
        environment: payload.environment ?? 'producao',
        serviceCode: payload.serviceCode ?? '0407',
        serviceFocus: payload.serviceFocus ?? 'Expansao'
      }))
    } as unknown as DatabaseFiscalRepository;

    const service = new FiscalService(repo, 'acc-db-1' as never);

    const [icmsRows, matrixRows, pisRows, cfopRows, ncmRows, nfseRows] = await Promise.all([
      service.listIcmsRules({ ufDestination: 'RJ' }),
      service.listIcmsMatrix({ ufOrigin: 'SP', operationType: 'interestadual' }),
      service.listPisCofinsRules({ regime: 'lucro_real' }),
      service.listCfop({ search: 'venda', documentType: 'nfe' }),
      service.listNcmEntries({ search: 'medic' }),
      service.listNfseLayouts({ state: 'SP', active: true })
    ]);

    expect(icmsRows).toHaveLength(1);
    expect(matrixRows).toHaveLength(1);
    expect(matrixRows[0]?.ufDestination).toBe('RJ');
    expect(pisRows[0]?.regime).toBe('lucro_real');
    expect(cfopRows[0]?.code).toBe('5102');
    expect(ncmRows[0]?.ncm).toBe('3004');
    expect(nfseRows[0]?.id).toBe('nfse-db-1');
    expect((repo.listIcmsRules as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      accountId: 'acc-db-1',
      ufOrigin: 'SP',
      ufDestination: undefined,
      ncm: undefined,
      operationType: 'interestadual'
    });

    const createdLayout = await service.createNfseLayout({
      city: '  Campinas  ',
      state: ' sp ',
      municipalityCode: '3509502',
      provider: ' ISS Campinas ',
      version: ' v2 ',
      active: true,
      environment: 'homologacao',
      serviceCode: ' 0407 ',
      serviceFocus: ' Interior '
    });
    const updatedLayout = await service.updateNfseLayout(createdLayout.id, {
      active: false,
      environment: 'producao'
    });

    expect(createdLayout.city).toBe('Campinas');
    expect(createdLayout.state).toBe('SP');
    expect(createdLayout.provider).toBe('ISS Campinas');
    expect(createdLayout.version).toBe('v2');
    expect(updatedLayout?.active).toBe(false);
    expect(updatedLayout?.environment).toBe('producao');
  });

  it('filters, fetches and handles missing NFS-e documents in memory mode', async () => {
    const service = new FiscalService();

    const created = await service.createNfseDocument({
      serie: '002',
      numero: 3201,
      customer: {
        type: 'cnpj',
        document: '11.222.333/0001-44',
        name: 'Laboratorio Prisma'
      },
      services: [
        {
          description: 'Painel hematologico',
          codigoServico: '0403',
          cnae: '8640-2/02',
          quantity: 1,
          unitValue: 180,
          totalValue: 180,
          issRate: 0.05,
          issValue: 9,
          pisValue: 0,
          cofinsValue: 0,
          csllValue: 0,
          irrfValue: 0,
          inssValue: 0
        }
      ]
    });

    const filtered = await service.listNfseDocuments({
      status: 'draft',
      customerSearch: 'prisma'
    });
    const fetched = await service.getNfseDocument(created.id);

    expect(filtered.some((item) => item.id === created.id)).toBe(true);
    expect(fetched?.customer.name).toBe('Laboratorio Prisma');
    await expect(service.getNfseDocument('nfse-missing')).resolves.toBeNull();
    await expect(service.issueNfseDocument('nfse-missing')).resolves.toBeNull();
    await expect(
      service.cancelNfseDocument('nfse-missing', { reason: 'nao encontrado' })
    ).resolves.toBeNull();
    await expect(service.updateNfseLayout('layout-missing', { active: true })).resolves.toBeNull();
  });

  it('reflects created layouts in dashboard summary alerts and counters', async () => {
    const service = new FiscalService();

    const baseline = await service.getDashboardSummary();
    await service.createNfseLayout({
      city: 'Belo Horizonte',
      state: 'MG',
      municipalityCode: '3106200',
      provider: 'ISS BH',
      version: 'v1',
      active: true,
      environment: 'homologacao',
      serviceCode: '0413',
      serviceFocus: 'Laboratorio'
    });
    const next = await service.getDashboardSummary();

    expect(next.nfseLayouts).toBe(baseline.nfseLayouts + 1);
    expect(next.alerts.some((alert) => alert.title.includes('Ciclo fiscal documental'))).toBe(true);
    expect(next.pendingScopes).toContain('emissão NFS-e transacional');
  });
});

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseFiscalRepository } from '../../../packages/modules/fiscal/src/database-fiscal.repository.ts';
import {
  closeDatabaseClient,
  createDatabaseClient
} from '../../../packages/shared/database/src/index.ts';
import type { AccountId } from '../../../packages/shared/types/src/index.ts';
import { TEST_DB_URL } from '../../setup/env.ts';

const accountId = randomUUID() as AccountId;

describe('fiscal PostgreSQL repository contract', () => {
  beforeAll(async () => {
    await closeDatabaseClient();
    createDatabaseClient(TEST_DB_URL);
  });

  afterAll(async () => {
    await closeDatabaseClient();
  });

  it('persists and filters every writable fiscal catalog', async () => {
    const repository = new DatabaseFiscalRepository();
    const suffix = `${process.pid}-${randomUUID().slice(0, 8)}`;

    const cfopCode = `9${String(process.pid).slice(-3)}`;
    const cfop = await repository.createCfop(accountId, {
      code: cfopCode,
      description: `Enterprise CFOP ${suffix}`,
      section: 'saida',
      category: 'enterprise',
      applicableTo: ['nfe', 'nfce'],
      icmsRelevant: true,
      pisCofinsRelevant: true,
      ipiRelevant: false,
      documentTypesLabel: 'NFE, NFCE'
    });
    expect(await repository.findCfopByCode(cfopCode)).toMatchObject({ code: cfopCode });
    expect(await repository.findCfopByCode('0000')).toBeNull();
    expect(
      await repository.listCfop({
        accountId,
        search: suffix,
        section: 'saida',
        documentType: 'nfe'
      })
    ).toEqual([expect.objectContaining({ code: cfopCode })]);
    expect(
      await repository.updateCfop(accountId, cfopCode, {
        ...cfop,
        description: `Enterprise CFOP updated ${suffix}`,
        applicableTo: ['nfse'],
        documentTypesLabel: 'NFSE'
      })
    ).toMatchObject({ applicableTo: ['nfse'] });
    expect(await repository.updateCfop(accountId, '0000', cfop)).toBeNull();

    const icmsId = `icms-enterprise-${suffix}`;
    await repository.createIcmsTable(accountId, {
      id: icmsId,
      code: `ICMS-${suffix}`,
      description: 'Enterprise ICMS',
      percent: 18
    });
    expect(await repository.listIcmsTables({ accountId, search: suffix })).toHaveLength(1);
    expect(
      await repository.updateIcmsTable(accountId, icmsId, {
        description: 'Enterprise ICMS updated',
        percent: 17
      })
    ).toMatchObject({ percent: 17 });
    expect(await repository.updateIcmsTable(accountId, 'missing-icms', { percent: 1 })).toBeNull();

    const ipiId = `ipi-enterprise-${suffix}`;
    await repository.createIpiTable(accountId, {
      id: ipiId,
      code: `IPI-${suffix}`,
      description: 'Enterprise IPI',
      percent: 5
    });
    expect(await repository.listIpiTables({ accountId, search: suffix })).toHaveLength(1);
    expect(await repository.updateIpiTable(accountId, ipiId, { percent: 4 })).toMatchObject({
      percent: 4
    });
    expect(await repository.updateIpiTable(accountId, 'missing-ipi', { percent: 1 })).toBeNull();

    const pisId = `pis-enterprise-${suffix}`;
    await repository.createPisTable(accountId, {
      id: pisId,
      code: `PIS-${suffix}`,
      description: 'Enterprise PIS',
      percent: 1.65
    });
    expect(await repository.listPisTables({ accountId, search: suffix })).toHaveLength(1);
    expect(await repository.updatePisTable(accountId, pisId, { percent: 2 })).toMatchObject({
      percent: 2
    });
    expect(await repository.updatePisTable(accountId, 'missing-pis', { percent: 1 })).toBeNull();

    const cofinsId = `cofins-enterprise-${suffix}`;
    await repository.createCofinsTable(accountId, {
      id: cofinsId,
      code: `COFINS-${suffix}`,
      description: 'Enterprise COFINS',
      percent: 7.6
    });
    expect(await repository.listCofinsTables({ accountId, search: suffix })).toHaveLength(1);
    expect(await repository.updateCofinsTable(accountId, cofinsId, { percent: 8 })).toMatchObject({
      percent: 8
    });
    expect(
      await repository.updateCofinsTable(accountId, 'missing-cofins', { percent: 1 })
    ).toBeNull();

    const ibsCbsId = `ibs-cbs-enterprise-${suffix}`;
    await repository.createIbsCbsTable(accountId, {
      id: ibsCbsId,
      code: `IBSCBS-${suffix}`,
      description: 'Enterprise IBS/CBS',
      ibsPercent: 8.8,
      cbsPercent: 3.2
    });
    expect(await repository.listIbsCbsTables({ accountId, search: suffix })).toHaveLength(1);
    expect(
      await repository.updateIbsCbsTable(accountId, ibsCbsId, {
        ibsPercent: 9,
        cbsPercent: 3
      })
    ).toMatchObject({ ibsPercent: 9, cbsPercent: 3 });
    expect(
      await repository.updateIbsCbsTable(accountId, 'missing-ibs-cbs', { ibsPercent: 1 })
    ).toBeNull();

    const matrix = await repository.createIcmsMatrixRule(accountId, {
      ufOrigin: 'AC',
      ufDestination: 'AL',
      rate: 12,
      cst: '010',
      operationType: 'interestadual'
    });
    expect(matrix).toMatchObject({ ncm: '', rate: 12 });
    expect(
      await repository.listIcmsRules({
        accountId,
        ufOrigin: 'AC',
        ufDestination: 'AL',
        operationType: 'interestadual'
      })
    ).toEqual([expect.objectContaining({ id: matrix.id })]);
    expect((await repository.listNcmEntries({ accountId })).length).toBeGreaterThan(0);
    expect((await repository.listNcmEntries({ accountId, search: 'medic' })).length).toBeGreaterThan(0);
    expect((await repository.listPisCofinsRules({ accountId })).length).toBeGreaterThan(0);
    expect(
      (
        await repository.listPisCofinsRules({
          accountId,
          regime: 'lucro_real',
          appliesTo: 'servico'
        })
      ).length
    ).toBeGreaterThan(0);

    const layoutId = `nfse-enterprise-${suffix}`;
    await repository.createNfseLayout(accountId, {
      id: layoutId,
      city: 'Rio Branco',
      state: 'AC',
      municipalityCode: '1200401',
      provider: 'Enterprise NFS-e',
      version: 'v1',
      active: false,
      environment: 'homologacao',
      serviceCode: '0407',
      serviceFocus: 'Enterprise veterinary care'
    });
    expect(
      await repository.listNfseLayouts({
        accountId,
        state: 'AC',
        search: 'Enterprise',
        active: false
      })
    ).toEqual([expect.objectContaining({ id: layoutId })]);
    expect(
      await repository.updateNfseLayout(accountId, layoutId, {
        active: true,
        environment: 'producao',
        version: 'v2'
      })
    ).toMatchObject({ active: true, environment: 'producao', version: 'v2' });
    expect(await repository.updateNfseLayout(accountId, 'missing-layout', { active: true })).toBeNull();
  });
});

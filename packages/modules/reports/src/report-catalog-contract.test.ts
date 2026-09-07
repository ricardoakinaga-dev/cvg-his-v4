import assert from 'node:assert/strict';
import { test } from 'vitest';

import { ReportsService } from './index.js';
import {
  getReportCatalogContract,
  reportCatalogContracts,
  type ReportCatalogImplementationStatus
} from './report-catalog-contract.js';

const ACCOUNT = 'acc-report-contract' as never;

test('R05-018 catalog covers every exposed report exactly once', () => {
  const definitionIds = new ReportsService()
    .listDefinitions(ACCOUNT)
    .map((definition) => definition.id);
  const contractIds = reportCatalogContracts.map((contract) => contract.reportId);

  assert.equal(new Set(definitionIds).size, definitionIds.length);
  assert.equal(new Set(contractIds).size, contractIds.length);
  assert.deepEqual([...contractIds].sort(), [...definitionIds].sort());
  for (const reportId of definitionIds) {
    const contract = getReportCatalogContract(reportId);
    assert.ok(contract, `missing R05-018 contract for ${reportId}`);
    assert.equal(contract?.maxRows, 10_000);
    assert.ok(contract?.source.length);
    assert.ok(contract?.temporalField.length);
    assert.ok(contract?.totalDefinition.length);
    assert.ok(contract?.expectedSample.length);
  }
});

test('R05-018 keeps unresolved business and external gates explicit', () => {
  const statuses = new Map(
    reportCatalogContracts.map((contract) => [contract.reportId, contract.status])
  );
  const partialReports = [...statuses.entries()]
    .filter(([, status]) => status === ('partial' satisfies ReportCatalogImplementationStatus))
    .map(([reportId]) => reportId);

  assert.deepEqual(partialReports.sort(), [
    'administrative-executive',
    'commission-calculations',
    'fiscal-service-invoices',
    'inventory-stock',
    'registration-suppliers',
    'scheduling-professional-care'
  ]);
  for (const reportId of partialReports) {
    assert.ok(getReportCatalogContract(reportId)?.gap);
  }
});

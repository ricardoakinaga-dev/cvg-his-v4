import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const targetScore = Number(process.env.VETUS_PARITY_TARGET ?? 88);

const exists = (path) => existsSync(join(root, path));
const readText = (path) => readFileSync(join(root, path), 'utf8');
const contains = (path, pattern) => exists(path) && pattern.test(readText(path));

const file = (path, label = path) => ({
  label,
  pass: exists(path),
  evidence: path,
});

const text = (path, pattern, label = `${path} matches ${pattern}`) => ({
  label,
  pass: contains(path, pattern),
  evidence: path,
});

const areas = [
  {
    name: 'Shell, layout global e navegacao',
    target: 88,
    checks: [
      file('apps/spa/src/navigation.ts', 'menu global versionado'),
      file('apps/spa/src/router/routes.ts', 'rotas SPA versionadas'),
      text('apps/spa/src/navigation.ts', /reports\/engine/, 'atalho para Motor Enterprise'),
      text('apps/spa/src/navigation.ts', /master-search|Busca Mestre/i, 'navegacao de busca/cockpit'),
      file('apps/spa/src/navigation.test.ts', 'testes de navegacao'),
    ],
  },
  {
    name: 'Dashboard inicial Premium',
    target: 90,
    checks: [
      file('apps/spa/src/pages/DashboardPage.vue'),
      file('apps/spa/src/pages/__tests__/DashboardPage.test.ts'),
      text('apps/spa/src/pages/DashboardPage.vue', /Central executiva Premium|Lentes executivas/),
      text('apps/spa/src/pages/DashboardPage.vue', /Status SLO|Auditoria|Alertas resolvidos/),
      file('e2e/spa/enterprise-surfaces-gate.spec.ts', 'gate visual dashboard/reports'),
    ],
  },
  {
    name: 'Agenda',
    target: 94,
    checks: [
      file('packages/modules/scheduling/src/index.ts'),
      file('apps/api/src/routes/scheduling-routes.ts'),
      file('apps/spa/src/pages/scheduling/SchedulingListPage.vue'),
      file('apps/spa/src/pages/scheduling/QueuePage.vue'),
      file('apps/spa/src/pages/scheduling/__tests__/SchedulingListPage.test.ts'),
      text('apps/spa/src/router/routes.ts', /scheduling\/new|scheduling\/legacy/),
    ],
  },
  {
    name: 'Comandas e ponto de venda',
    target: 94,
    checks: [
      file('packages/modules/counter-sales/src/index.ts'),
      file('apps/api/src/routes/counter-sales-routes.ts'),
      file('apps/spa/src/pages/sales/CounterSalesPage.vue'),
      file('apps/spa/src/pages/sales/__tests__/CounterSalesPage.test.ts'),
      text('apps/spa/src/navigation.ts', /Comandas/),
    ],
  },
  {
    name: 'Clientes e animais',
    target: 95,
    checks: [
      file('packages/modules/owners/src/index.ts'),
      file('packages/modules/patients/src/index.ts'),
      file('apps/api/src/routes/owners-routes.ts'),
      file('apps/api/src/routes/patients-routes.ts'),
      file('apps/spa/src/pages/owners/OwnerDetailPage.vue'),
      file('apps/spa/src/pages/patients/PatientDetailPage.vue'),
      text('apps/spa/src/pages/patients/PatientDetailPage.vue', /Cockpit 360|Timeline 360/),
    ],
  },
  {
    name: 'Servicos',
    target: 92,
    checks: [
      file('packages/modules/services/src/index.ts'),
      text(
        'apps/api/src/routes/products-services-routes.ts',
        /pathname === '\/services'/,
        'rotas API de servicos extraidas e versionadas'
      ),
      file('apps/spa/src/pages/services/ServicesListPage.vue'),
      file('apps/spa/src/pages/services/ServiceFormPage.vue'),
      file('apps/spa/src/pages/services/__tests__/ServicesListPage.test.ts'),
    ],
  },
  {
    name: 'Vendas',
    target: 90,
    checks: [
      file('apps/spa/src/pages/sales/SalesPage.vue'),
      file('apps/spa/src/pages/sales/__tests__/SalesPage.test.ts'),
      file('packages/modules/counter-sales/src/counter-sales.test.ts'),
      text('apps/spa/src/navigation.ts', /vendas|pdv|balcao/i),
      text('apps/spa/src/router/routes.ts', /counter-sales/),
    ],
  },
  {
    name: 'Pacotes',
    target: 91,
    checks: [
      file('packages/modules/packages/src/index.ts'),
      file('packages/db/migrations/0046_customer_packages.sql'),
      file('apps/spa/src/services/packages.ts'),
      file('apps/spa/src/pages/sales/PackagesPage.vue'),
      file('apps/spa/src/pages/sales/__tests__/PackagesPage.test.ts'),
    ],
  },
  {
    name: 'Orcamentos',
    target: 90,
    checks: [
      file('packages/modules/quotes/src/index.ts'),
      file('packages/modules/quotes/src/quotes.test.ts'),
      file('apps/spa/src/services/quotes.ts'),
      text('apps/spa/src/navigation.ts', /Orcamentos|orçamentos|orcamentos/i),
    ],
  },
  {
    name: 'Esteira de atendimento',
    target: 90,
    checks: [
      file('apps/spa/src/pages/scheduling/QueuePage.vue'),
      file('apps/spa/src/pages/scheduling/__tests__/QueuePage.test.ts'),
      text(
        'apps/api/src/routes/encounters-routes.ts',
        /attachEncounter/,
        'atendimento vincula entrada da esteira'
      ),
      text(
        'apps/api/src/routes/encounter-queue-sync.ts',
        /transitionQueueForEncounter/,
        'transicao clinica sincroniza a esteira'
      ),
      text(
        'packages/modules/scheduling/src/scheduling.test.ts',
        /attachEncounter[\s\S]*transitionQueueForEncounter/,
        'contrato atendimento-esteira coberto por testes de dominio'
      ),
      file('packages/db/migrations/0045_clinical_handoffs.sql'),
      file('e2e/spa/master-search-360-reception.spec.ts'),
    ],
  },
  {
    name: 'Esteira de exames',
    target: 91,
    checks: [
      file('apps/api/src/routes/laboratory-routes.ts'),
      file('apps/api/src/routes/laboratory-integration-routes.ts'),
      file('apps/spa/src/pages/laboratory/LaboratoryOrdersPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryResultsPage.vue'),
      file('packages/db/migrations/0053_laboratory_result_release_signature.sql'),
      text('e2e/spa/master-search-360-reception.spec.ts', /Exames pendentes/),
    ],
  },
  {
    name: 'Vacinas e vermifugos',
    target: 90,
    checks: [
      file('apps/spa/src/pages/preventive/VaccinesDewormersPage.vue'),
      file('apps/spa/src/pages/preventive/__tests__/VaccinesDewormersPage.test.ts'),
      file('packages/db/migrations/0028_preventive_events.sql'),
      file('packages/db/migrations/0042_preventive_events_patient_owner.sql'),
      text('apps/spa/src/pages/reception/ReceptionGatewayPage.vue', /preventivo|vacina|vermifugo/i),
    ],
  },
  {
    name: 'Resgate de pontos e fidelidade',
    target: 88,
    checks: [
      file('apps/spa/src/pages/loyalty/LoyaltyPage.vue'),
      file('apps/spa/src/pages/loyalty/LoyaltyPage.test.ts'),
      file('packages/db/migrations/0021_commercial_loyalty_price_pdv.sql'),
      text('apps/spa/src/navigation.ts', /Resgate de Pontos|fidelidade/i),
    ],
  },
  {
    name: 'Produtos, fornecedores, fabricantes e estoques',
    target: 93,
    checks: [
      file('packages/modules/inventory/src/index.ts'),
      file('apps/api/src/routes/inventory-routes.ts'),
      file('apps/api/src/routes/inventory-manufacturers-routes.ts'),
      file('apps/api/src/routes/inventory-warehouses-routes.ts'),
      file('apps/spa/src/pages/inventory/SuppliersPage.vue'),
      file('apps/spa/src/pages/inventory/ManufacturersPage.vue'),
      file('apps/spa/src/pages/inventory/WarehousesPage.vue'),
    ],
  },
  {
    name: 'Controles de estoque avancados',
    target: 90,
    checks: [
      file('apps/spa/src/pages/inventory/InventoryInvoicesPage.vue'),
      file('apps/spa/src/pages/inventory/InventoryStockTransactionPage.vue'),
      file('apps/spa/src/pages/inventory/InventoryTransfersPage.vue'),
      file('apps/spa/src/pages/inventory/InventoryValidityPage.vue'),
      file('apps/spa/src/pages/inventory/InventoryPurchasesPage.vue'),
      file('packages/db/migrations/0052_inventory_stock_movements.sql'),
    ],
  },
  {
    name: 'Fiscal',
    target: 95,
    checks: [
      file('packages/modules/fiscal/src/index.ts'),
      file('apps/api/src/routes/fiscal-routes.ts'),
      file('apps/spa/src/pages/fiscal/FiscalICMSPage.vue'),
      file('apps/spa/src/pages/fiscal/FiscalIPIPage.vue'),
      file('apps/spa/src/pages/fiscal/FiscalPISPage.vue'),
      file('apps/spa/src/pages/fiscal/FiscalCOFINSPage.vue'),
      file('apps/spa/src/pages/fiscal/FiscalIBSCBSPage.vue'),
      file('packages/db/migrations/0043_fiscal_ibs_cbs_tables.sql'),
    ],
  },
  {
    name: 'Financeiro dashboard e core',
    target: 92,
    checks: [
      file('apps/spa/src/pages/finance/FinancialDashboardPage.vue'),
      file('apps/spa/src/pages/finance/CashFlowPage.vue'),
      file('apps/spa/src/services/financialStatements.ts'),
      file('apps/api/src/routes/financial-routes.ts'),
      file('tests/unit/modules/financial.test.ts'),
    ],
  },
  {
    name: 'Financeiro legado profundo',
    target: 89,
    checks: [
      file('apps/spa/src/pages/finance/AccountsPayablePage.vue'),
      file('apps/spa/src/pages/finance/FinancialReconciliationPage.vue'),
      file('apps/spa/src/services/financialPayables.ts'),
      file('apps/spa/src/services/financialReconciliation.ts'),
      file('apps/api/src/routes/financial-routes-payables.test.ts'),
      file('packages/db/migrations/0049_financial_payables.sql'),
    ],
  },
  {
    name: 'Laboratorio',
    target: 92,
    checks: [
      file('apps/spa/src/pages/laboratory/LaboratoryHubPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryHemogramsPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryUrinalysisPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryBiochemistryPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryEquipmentPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryReportTypesPage.vue'),
      file('apps/spa/src/pages/laboratory/LaboratoryReferenceValuesPage.vue'),
    ],
  },
  {
    name: 'Internacao e boxes',
    target: 90,
    checks: [
      file('packages/modules/inpatient/src/index.ts'),
      file('apps/api/src/routes/inpatient-routes.ts'),
      file('apps/spa/src/pages/inpatient/InpatientListPage.vue'),
      file('apps/spa/src/pages/inpatient/InpatientDetailPage.vue'),
      file('apps/spa/src/pages/inpatient/InpatientDailyChargesPage.vue'),
      file('apps/spa/src/pages/inpatient/BedBoardPage.vue'),
      file('packages/db/migrations/0050_inpatient_occurrences_daily_charges.sql'),
    ],
  },
  {
    name: 'RH, usuarios e acesso',
    target: 89,
    checks: [
      file('packages/modules/users/src/index.ts'),
      file('packages/modules/staff/src/index.ts'),
      file('packages/modules/access-control/src/index.ts'),
      file('apps/api/src/routes/access-control-routes.ts'),
      file('apps/spa/src/pages/access-control/AccessControlPage.vue'),
      file('apps/spa/src/pages/access-control/__tests__/AccessControlPage.test.ts'),
    ],
  },
  {
    name: 'Comissoes',
    target: 91,
    checks: [
      file('packages/modules/commissions/src/index.ts'),
      file('packages/modules/commissions/src/commissions.test.ts'),
      file('apps/api/src/routes/commission-routes.ts'),
      file('apps/spa/src/services/commissions.ts'),
      file('apps/spa/src/pages/rh/CommissionRulesPage.vue'),
      file('apps/spa/src/pages/rh/CommissionCalculationsPage.vue'),
      file('packages/db/migrations/0047_commissions.sql'),
    ],
  },
  {
    name: 'Marketing',
    target: 89,
    checks: [
      file('packages/modules/marketing/src/index.ts'),
      file('apps/api/src/routes/marketing-routes.ts'),
      file('apps/spa/src/services/marketing.ts'),
      file('apps/spa/src/pages/marketing/MarketingCampaignsPage.vue'),
      file('apps/spa/src/pages/marketing/__tests__/MarketingCampaignsPage.test.ts'),
      file('packages/db/migrations/0051_marketing_campaigns.sql'),
    ],
  },
  {
    name: 'Relatorios',
    target: 92,
    checks: [
      file('packages/modules/reports/src/index.ts'),
      file('packages/modules/reports/src/reports.test.ts'),
      file('apps/api/src/routes/reports-routes.ts'),
      file('apps/spa/src/services/reports.ts'),
      file('apps/spa/src/pages/reports/ReportsEnginePage.vue'),
      file('apps/spa/src/pages/reports/__tests__/ReportsEnginePage.test.ts'),
      file('packages/db/migrations/0048_report_engine.sql'),
      text('e2e/spa/enterprise-surfaces-gate.spec.ts', /Motor Enterprise de Relatorios|Motor Enterprise de Relatórios/),
    ],
  },
  {
    name: 'Integracoes e governanca',
    target: 94,
    checks: [
      file('packages/modules/api-keys/src/index.ts'),
      file('packages/modules/webhooks/src/index.ts'),
      file('packages/modules/lgpd/src/service.ts'),
      file('packages/modules/mfa/src/index.ts'),
      file('apps/api/src/routes/lgpd-routes.ts'),
      file('apps/spa/src/pages/webhooks/__tests__/WebhooksListPage.test.ts'),
      file('scripts/validate-rls-coverage.ts'),
      file('packages/db/migrations/0054_enterprise_rls_gap_closure.sql'),
    ],
  },
];

const evaluatedAreas = areas.map((area) => {
  const passed = area.checks.filter((check) => check.pass).length;
  const total = area.checks.length;
  const ratio = total === 0 ? 0 : passed / total;
  const score = Math.round(40 + ratio * (area.target - 40));
  return { ...area, passed, total, ratio, score };
});

const overall = Math.round(
  evaluatedAreas.reduce((sum, area) => sum + area.score, 0) / evaluatedAreas.length,
);

console.log('# Vetus Parity Matrix');
console.log('');
console.log(`Target: ${targetScore}/100`);
console.log(`Score: ${overall}/100`);
console.log('');
console.log('| Area Vetus | Score | Evidence | Missing |');
console.log('| --- | ---: | --- | --- |');

for (const area of evaluatedAreas) {
  const evidence = area.checks
    .filter((check) => check.pass)
    .map((check) => check.label)
    .join('; ');
  const missing = area.checks
    .filter((check) => !check.pass)
    .map((check) => check.label)
    .join('; ');
  console.log(`| ${area.name} | ${area.score} | ${evidence || '-'} | ${missing || '-'} |`);
}

console.log('');
console.log('## Areas below target');
console.log('');
const belowTarget = evaluatedAreas.filter((area) => area.score < targetScore);
if (belowTarget.length === 0) {
  console.log('- Nenhuma area abaixo da meta configurada.');
} else {
  for (const area of belowTarget) {
    console.log(`- ${area.name}: ${area.score}/100`);
  }
}

if (overall < targetScore) {
  process.exit(1);
}

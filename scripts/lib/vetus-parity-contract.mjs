export const vetusParityContract = Object.freeze([
  {
    id: 'care',
    name: 'Atendimento, agenda, comanda e internacao',
    sources: [
      'docs/vetus/guides/20-anexo-atendimento.md',
      'docs/vetus/guides/2026-04-24-relatorio-esteira-de-atendimento.md'
    ],
    evidence: {
      ui: [
        'apps/spa/src/pages/scheduling/QueuePage.vue',
        'apps/spa/src/pages/sales/CounterSalesPage.vue'
      ],
      api: [
        'apps/api/src/routes/scheduling-routes.ts',
        'apps/api/src/routes/counter-sales-routes.ts'
      ],
      persistence: [
        'packages/db/migrations/0055_scheduling_queue_operational_fields.sql',
        'packages/db/migrations/0128_scheduling_queue_transfer_receipts.sql',
        'packages/db/migrations/0129_counter_sale_clinical_context_receipts.sql',
        'packages/db/migrations/0133_counter_sales_authority.sql'
      ],
      tests: [
        'apps/spa/src/pages/scheduling/__tests__/QueuePage.test.ts',
        'tests/integration/database/inpatient-clinical-financial-close-receipt-http-postgres.test.ts'
      ],
      e2e: [
        'e2e/spa/operational-walkthrough.spec.ts',
        'e2e/tests/fluxos-criticos.spec.ts',
        'e2e/tests/fluxo-transferencia-comanda-recebimento.spec.ts'
      ]
    },
    blockers: []
  },
  {
    id: 'registrations',
    name: 'Cadastros de clientes, animais e auxiliares',
    sources: ['docs/vetus/guides/12-modulo-cadastros-animais-clientes.md'],
    evidence: {
      ui: [
        'apps/spa/src/pages/owners/OwnersListPage.vue',
        'apps/spa/src/pages/patients/PatientsListPage.vue'
      ],
      api: ['apps/api/src/routes/owners-routes.ts', 'apps/api/src/routes/patients-routes.ts'],
      persistence: [
        'packages/db/migrations/0000_vengeful_pet_avengers.sql',
        'packages/db/migrations/0065_tenant_isolation_auth_webhook_clinical_links.sql'
      ],
      tests: [
        'apps/api/src/routes/owners-routes.test.ts',
        'apps/api/src/routes/patients-routes.test.ts',
        'tests/integration/database/patient-registration-lifecycle.test.ts'
      ],
      e2e: ['e2e/spa/login-owner-patient-ui.spec.ts']
    },
    blockers: []
  },
  {
    id: 'laboratory',
    name: 'Laboratorio e esteira de exames',
    sources: [
      'docs/vetus/guides/24-anexo-laboratorio.md',
      'docs/vetus/guides/2026-04-24-relatorio-esteira-de-exames.md'
    ],
    evidence: {
      ui: ['apps/spa/src/pages/laboratory/LaboratoryOrdersPage.vue'],
      api: ['apps/api/src/routes/laboratory-routes.ts'],
      persistence: [
        'packages/db/migrations/0053_laboratory_result_release_signature.sql',
        'packages/db/migrations/0132_laboratory_order_workflow.sql',
        'packages/db/migrations/0145_laboratory_structured_result_values.sql'
      ],
      tests: [
        'apps/api/src/routes/laboratory-routes.test.ts',
        'packages/modules/diagnostics/src/laboratory-postgres.integration.test.ts',
        'apps/spa/src/pages/laboratory/__tests__/LaboratoryOrdersPage.test.ts',
        'tests/integration/process/public-laboratory-structured-results.test.ts'
      ],
      e2e: [
        'e2e/tests/fluxo-exames.spec.ts',
        'e2e/tests/fluxos-comissao-laboratorio-canonicos.spec.ts'
      ]
    },
    blockers: [
      'Provider externo e homologacao laboratorial continuam pendentes; a prova local agora cobre o fluxo publico de resultado analitico estruturado, mas nao substitui conectores Live Lab nem a homologacao externa.'
    ]
  },
  {
    id: 'inventory',
    name: 'Estoque, compras e movimentacoes',
    sources: ['docs/vetus/guides/14-modulo-estoque-fiscal.md'],
    evidence: {
      ui: [
        'apps/spa/src/pages/inventory/InventoryMovementsPage.vue',
        'apps/spa/src/pages/inventory/InventoryInvoicesPage.vue'
      ],
      api: ['apps/api/src/routes/inventory-routes.ts'],
      persistence: [
        'packages/db/migrations/0052_inventory_stock_movements.sql',
        'packages/db/migrations/0085_inventory_procurement.sql'
      ],
      tests: [
        'apps/api/src/routes/inventory-routes.test.ts',
        'apps/spa/src/pages/inventory/__tests__/InventoryInvoicesPage.test.ts',
        'tests/integration/database/inventory-procurement-postgres.test.ts'
      ],
      e2e: ['e2e/tests/fluxos-criticos.spec.ts', 'e2e/spa/vetus-commercial-flow.spec.ts']
    },
    blockers: []
  },
  {
    id: 'fiscal',
    name: 'Fiscal e emissao de documentos',
    sources: ['docs/vetus/guides/14-modulo-estoque-fiscal.md'],
    evidence: {
      ui: ['apps/spa/src/pages/fiscal/FiscalNFSELayoutPage.vue'],
      api: ['apps/api/src/routes/fiscal-routes.ts'],
      persistence: [
        'packages/db/migrations/0043_fiscal_ibs_cbs_tables.sql',
        'packages/db/migrations/0097_fiscal_nfse_tenant_persistence.sql'
      ],
      tests: [
        'apps/api/src/routes/fiscal-routes.test.ts',
        'packages/modules/fiscal/src/fiscal.test.ts',
        'tests/integration/database/fiscal-nfse-provider-postgres.test.ts',
        'tests/unit/fiscal/nfse-emitter.test.ts'
      ],
      e2e: ['e2e/spa/service-invoices-report-flow.spec.ts']
    },
    blockers: [
      'Homologacao com sandbox/provedor municipal real, certificados e ciclo de rejeicao permanece pendente.',
      'O adapter de producao precisa receber credenciais/certificado por secret manager e provar XML/PDF com um municipio alvo.'
    ]
  },
  {
    id: 'financial',
    name: 'Financeiro, pagamentos, caixa e split',
    sources: ['docs/vetus/guides/21-anexo-financeiro.md'],
    evidence: {
      ui: ['apps/spa/src/pages/finance/AccountsPayablePage.vue'],
      api: ['apps/api/src/routes/financial-routes.ts'],
      persistence: [
        'packages/db/migrations/0049_financial_payables.sql',
        'packages/db/migrations/0101_cash_deposit_movement.sql',
        'packages/db/migrations/0108_encounter_cash_receipts.sql'
      ],
      tests: [
        'apps/api/src/routes/financial-routes-payables.test.ts',
        'tests/integration/database/cash-register-lifecycle-postgres.test.ts'
      ],
      e2e: ['e2e/spa/billing-flow.spec.ts', 'e2e/tests/fluxo-caixa-operacional.spec.ts']
    },
    blockers: [
      'Bancos, formas de pagamento, maquininhas, split e habilitacao usam dados estaticos.',
      'Ainda falta E2E de estorno e conciliacao de pagamentos nao-caixa.',
      'PIX opera com adapter mock e captura/repasse de cartao nao esta habilitada.'
    ]
  },
  {
    id: 'marketing',
    name: 'Marketing e comunicacao preventiva',
    sources: ['docs/vetus/guides/2026-04-24-relatorio-entidade-marketing.md'],
    evidence: {
      ui: ['apps/spa/src/pages/marketing/MarketingCampaignsPage.vue'],
      api: ['apps/api/src/routes/marketing-routes.ts'],
      persistence: [
        'packages/db/migrations/0051_marketing_campaigns.sql',
        'packages/db/migrations/0099_marketing_settings.sql',
        'packages/db/migrations/0135_marketing_delivery_guarantees.sql',
        'packages/db/migrations/0136_marketing_permission_catalog.sql'
      ],
      tests: [
        'apps/spa/src/pages/marketing/__tests__/MarketingCampaignsPage.test.ts',
        'apps/api/src/routes/marketing-routes.test.ts',
        'packages/modules/marketing/src/marketing.test.ts',
        'tests/integration/database/marketing-delivery-guarantees-postgres.test.ts'
      ],
      e2e: ['e2e/tests/fluxo-marketing-relatorios.spec.ts']
    },
    blockers: [
      'Provider externo homologado e bounce real continuam pendentes; o sandbox deterministico esta coberto.',
      'A auditoria de campanhas existe na API, mas ainda falta prova E2E contra provider externo.'
    ]
  },
  {
    id: 'workforce',
    name: 'Profissionais, folgas e comissoes',
    sources: [
      'docs/vetus/guides/22-anexo-comissoes.md',
      'docs/vetus/guides/2026-04-24-relatorio-modulo-rh-usuarios-comissoes-profissionais.md'
    ],
    evidence: {
      ui: [
        'apps/spa/src/pages/rh/RhProfessionsPage.vue',
        'apps/spa/src/pages/staff/StaffFormPage.vue',
        'apps/spa/src/pages/rh/CommissionCalculationsPage.vue'
      ],
      api: [
        'apps/api/src/routes/users-staff-quotes-routes.ts',
        'apps/api/src/routes/commission-routes.ts'
      ],
      persistence: [
        'packages/db/migrations/0047_commissions.sql',
        'packages/db/migrations/0130_staff_professions.sql',
        'packages/db/migrations/0131_commissions_staff_authority.sql'
      ],
      tests: [
        'packages/modules/staff/src/staff.test.ts',
        'packages/modules/commissions/src/commissions.test.ts',
        'apps/api/src/routes/users-staff-quotes-routes.test.ts',
        'apps/spa/src/pages/rh/__tests__/RhOperationalPages.test.ts',
        'tests/integration/database/staff-professions-postgres.test.ts',
        'tests/integration/database/commissions-staff-authority-postgres.test.ts'
      ],
      e2e: ['e2e/tests/fluxos-comissao-laboratorio-canonicos.spec.ts']
    },
    blockers: []
  },
  {
    id: 'reports',
    name: 'Relatorios operacionais e gerenciais',
    sources: ['docs/vetus/guides/2026-04-24-relatorio-consolidado-modulo-relatorios.md'],
    evidence: {
      ui: [
        'apps/spa/src/pages/reports/ReportsEnginePage.vue',
        'apps/spa/src/pages/reports/ReportWorkbenchPage.vue',
        'apps/spa/src/utils/report-export.ts'
      ],
      api: ['apps/api/src/routes/reports-routes.ts'],
      persistence: [
        'packages/db/migrations/0048_report_engine.sql',
        'packages/db/migrations/0134_reports_delivery_tenant_integrity.sql',
        'packages/db/migrations/0143_reports_delivery_leases.sql',
        'packages/db/migrations/0146_finance_catalogs.sql'
      ],
      tests: [
        'packages/modules/reports/src/reports.test.ts',
        'apps/api/src/routes/reports-routes.test.ts',
        'tests/integration/database/reports-delivery-postgres.test.ts',
        'tests/integration/database/counter-sales-payment-authority-postgres.test.ts',
        'tests/integration/process/worker-run-once-reports.test.ts',
        'tests/integration/rls/finance-catalog-isolation.test.ts',
        'apps/spa/src/pages/reports/__tests__/ReportWorkbenchPage.test.ts',
        'apps/spa/src/utils/report-export.test.ts'
      ],
      e2e: [
        'e2e/spa/enterprise-surfaces-gate.spec.ts',
        'e2e/tests/fluxo-marketing-relatorios.spec.ts',
        'e2e/spa/deleted-sales-report-flow.spec.ts',
        'e2e/spa/service-invoices-report-flow.spec.ts'
      ]
    },
    blockers: [
      'O relatorio de vendas/comandas excluidas agora possui apenas um snapshot bounded de comandas atualmente canceladas, filtrado por data de abertura e exportavel server-side; isso nao fecha o historico de cancelamento nem a paridade Vetus. Relatorios Vetus de cheques, pagamento antecipado e personalizados ainda nao possuem exportacao operacional completa; o cadastro de fornecedores foi fechado apenas como exportacao bounded do catalogo persistido, nao como fornecedor master completo.',
      'O workbench exporta CSV do recorte carregado para auditoria, financeiro, atendimento e estoque, incluindo contas a pagar, contas pagas, contas a receber e contas recebidas respaldadas pelos subledgers; ainda falta cobertura completa das trilhas Vetus restantes e do worker de entregas agendadas.'
    ]
  },
  {
    id: 'access',
    name: 'Usuarios, acesso, auditoria e LGPD',
    sources: [
      'docs/vetus/guides/2026-04-24-relatorio-usuarios-grupos-acesso-governanca-seguranca.md',
      'docs/vetus/guides/2026-04-24-relatorio-lgpd-retencao-mascaramento-consentimento.md'
    ],
    evidence: {
      ui: ['apps/spa/src/pages/access-control/AccessControlPage.vue'],
      api: ['apps/api/src/routes/access-control-routes.ts', 'apps/api/src/routes/lgpd-routes.ts'],
      persistence: [
        'packages/db/migrations/0054_enterprise_rls_gap_closure.sql',
        'packages/db/migrations/0136_marketing_permission_catalog.sql'
      ],
      tests: [
        'apps/api/src/routes/access-control-audit-events.test.ts',
        'apps/api/src/routes/lgpd-routes.test.ts',
        'apps/spa/src/pages/access-control/__tests__/AccessControlPage.test.ts'
      ],
      e2e: [
        'e2e/tests/fluxos-criticos.spec.ts',
        'e2e/spa/tenant-isolation-db.spec.ts',
        'e2e/spa/access-role-matrix-db.spec.ts'
      ]
    },
    blockers: [
      'A rodada PostgreSQL/SPA agora prova os sete perfis, MFA, endpoints sensiveis, flags, DSR, governanca e isolamento entre tenants; o aceite operacional externo de LGPD e governanca continua pendente.',
      'O gate local nao substitui homologacao de politicas, evidencias de retencao e mascaramento em um tenant-alvo nem a aprovacao operacional de acesso privilegiado.'
    ]
  },
  {
    id: 'integrations',
    name: 'Integracoes, webhooks e migracao Vetus',
    sources: [
      'docs/vetus/guides/2026-04-24-relatorio-integracoes-webhooks-api-keys-api-client.md',
      'docs/vetus/guides/13-arquitetura-rotas-e-api.md'
    ],
    evidence: {
      ui: ['apps/spa/src/pages/webhooks/WebhooksListPage.vue'],
      api: ['apps/api/src/routes/webhooks-routes.ts'],
      persistence: [
        'packages/db/migrations/0009_webhook_tables.sql',
        'packages/db/migrations/0098_vetus_import_logs.sql',
        'packages/db/migrations/0102_vetus_import_batches.sql',
        'packages/db/migrations/0149_vetus_import_request_fingerprints.sql'
      ],
      tests: [
        'packages/modules/webhooks/src/webhooks.test.ts',
        'tests/integration/process/public-api-worker-event-chain.test.ts',
        'apps/api/src/routes/vetus-import-routes.test.ts',
        'tests/integration/database/vetus-import-http-postgres.test.ts'
      ],
      e2e: ['e2e/spa/webhook-flow.spec.ts', 'e2e/spa/vetus-import-flow.spec.ts']
    },
    blockers: [
      'Live Pet e Live Lab nao possuem conectores equivalentes comprovados.',
      'Os consumidores locais de pagamentos, faturamento e webhooks estao registrados e existe prova local da cadeia publica em um processo descartavel; ainda falta E2E de processamento e observabilidade do worker em ambiente distribuido.',
      'A importacao Vetus agora possui prova bounded HTTP -> PostgreSQL em duas instancias para fingerprint normalizado, idempotencia, conflito 409, rejeitados, retomada, rollback, concorrencia e isolamento entre tenants, alem de E2E browser -> API -> PostgreSQL no runner local seedado; ainda falta homologacao do importador contra a operacao/provedor Vetus alvo e observabilidade distribuida.'
    ]
  }
]);

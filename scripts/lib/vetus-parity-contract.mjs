export const vetusParityContract = Object.freeze([
  {
    id: 'care',
    name: 'Atendimento, agenda, comanda e internacao',
    sources: [
      'docs/vetus/guides/20-anexo-atendimento.md',
      'docs/vetus/guides/2026-04-24-relatorio-esteira-de-atendimento.md'
    ],
    evidence: {
      ui: ['apps/spa/src/pages/scheduling/QueuePage.vue', 'apps/spa/src/pages/sales/CounterSalesPage.vue'],
      api: ['apps/api/src/routes/scheduling-routes.ts', 'apps/api/src/routes/counter-sales-routes.ts'],
      persistence: ['packages/db/migrations/0055_scheduling_queue_operational_fields.sql'],
      tests: ['apps/spa/src/pages/scheduling/__tests__/QueuePage.test.ts'],
      e2e: ['e2e/spa/operational-walkthrough.spec.ts', 'e2e/tests/fluxos-criticos.spec.ts']
    },
    blockers: [
      'Ainda falta uma prova E2E autocontida do fluxo completo de transferencia entre setores ate recebimento e fechamento da comanda.'
    ]
  },
  {
    id: 'registrations',
    name: 'Cadastros de clientes, animais e auxiliares',
    sources: ['docs/vetus/guides/12-modulo-cadastros-animais-clientes.md'],
    evidence: {
      ui: ['apps/spa/src/pages/owners/OwnersListPage.vue', 'apps/spa/src/pages/patients/PatientsListPage.vue'],
      api: ['apps/api/src/routes/owners-routes.ts', 'apps/api/src/routes/patients-routes.ts'],
    persistence: [
      'packages/db/migrations/0000_vengeful_pet_avengers.sql',
      'packages/db/migrations/0065_tenant_isolation_auth_webhook_clinical_links.sql'
    ],
      tests: ['apps/api/src/routes/owners-routes.test.ts', 'apps/api/src/routes/patients-routes.test.ts'],
      e2e: ['e2e/spa/login-owner-patient-ui.spec.ts']
    },
    blockers: [
      'Faltam provas de merge, troca de tutor, autorizados e inativacao com dependencias.'
    ]
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
      persistence: ['packages/db/migrations/0053_laboratory_result_release_signature.sql'],
      tests: ['apps/api/src/routes/laboratory-routes.test.ts'],
      e2e: ['e2e/tests/fluxo-exames.spec.ts']
    },
    blockers: [
      'O E2E atual prova solicitacao, coleta, resultado e liberacao sem skips, mas ainda nao cobre Laudado/Entregue com assinatura, recoleta e provider externo.',
      'Resultado analitico especializado ainda possui superficie sem integracao de servico.'
    ]
  },
  {
    id: 'inventory',
    name: 'Estoque, compras e movimentacoes',
    sources: ['docs/vetus/guides/14-modulo-estoque-fiscal.md'],
    evidence: {
      ui: ['apps/spa/src/pages/inventory/InventoryMovementsPage.vue'],
      api: ['apps/api/src/routes/inventory-routes.ts'],
      persistence: ['packages/db/migrations/0052_inventory_stock_movements.sql'],
      tests: ['apps/api/src/routes/inventory-routes.test.ts'],
      e2e: ['e2e/tests/fluxos-criticos.spec.ts', 'e2e/spa/vetus-commercial-flow.spec.ts']
    },
    blockers: [
      'Compras e transferencias preparam linhas locais, sem documento transacional persistido ponta a ponta.',
      'Entrada de NF nao possui jornada documental completa com lote, validade, saldo e auditoria.'
    ]
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
      tests: ['apps/api/src/routes/fiscal-routes.test.ts', 'packages/modules/fiscal/src/fiscal.test.ts'],
      e2e: []
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
      persistence: ['packages/db/migrations/0049_financial_payables.sql'],
      tests: ['apps/api/src/routes/financial-routes-payables.test.ts'],
      e2e: ['e2e/spa/billing-flow.spec.ts']
    },
    blockers: [
      'Bancos, formas de pagamento, maquininhas, split e habilitacao usam dados estaticos.',
      'Nao existe E2E de caixa, sangria, deposito, fechamento, estorno e conciliacao.',
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
        'packages/db/migrations/0099_marketing_settings.sql'
      ],
      tests: ['apps/spa/src/pages/marketing/__tests__/MarketingCampaignsPage.test.ts'],
      e2e: []
    },
    blockers: [
      'Ainda faltam envio sandbox homologado, opt-out operacional, retry com backoff e idempotencia ponta a ponta das entregas.',
      'A auditoria de campanhas existe na API, mas ainda falta E2E de consentimento, bounce, retry e provider externo.'
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
      ui: ['apps/spa/src/pages/rh/CommissionCalculationsPage.vue'],
      api: ['apps/api/src/routes/commission-routes.ts'],
      persistence: ['packages/db/migrations/0047_commissions.sql'],
      tests: ['packages/modules/commissions/src/commissions.test.ts'],
      e2e: []
    },
    blockers: [
      'Folgas possuem CRUD PostgreSQL com RLS, cancelamento e bloqueio de agenda; o cadastro persistente completo de profissoes ainda precisa ser fechado.',
      'Nao ha E2E de elegibilidade, calculo, revisao, fechamento e pagamento de comissao.'
    ]
  },
  {
    id: 'reports',
    name: 'Relatorios operacionais e gerenciais',
    sources: ['docs/vetus/guides/2026-04-24-relatorio-consolidado-modulo-relatorios.md'],
    evidence: {
      ui: ['apps/spa/src/pages/reports/ReportsEnginePage.vue'],
      api: ['apps/api/src/routes/reports-routes.ts'],
      persistence: ['packages/db/migrations/0048_report_engine.sql'],
      tests: ['packages/modules/reports/src/reports.test.ts'],
      e2e: ['e2e/spa/enterprise-surfaces-gate.spec.ts']
    },
    blockers: [
      'Diversos relatorios Vetus ainda usam workbench somente leitura e sem exportacao operacional completa.',
      'O E2E enterprise prova execucao e exportacao de superficies, mas ainda nao cobre worker, arquivo, entrega, falha e reprocessamento.'
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
      persistence: ['packages/db/migrations/0054_enterprise_rls_gap_closure.sql'],
      tests: ['apps/api/src/routes/access-control-audit-events.test.ts', 'apps/api/src/routes/lgpd-routes.test.ts'],
      e2e: ['e2e/tests/fluxos-criticos.spec.ts', 'e2e/spa/tenant-isolation-db.spec.ts']
    },
    blockers: [
      'Ainda falta uma matriz E2E completa de autorizacao por papel, tenant e operacoes administrativas sensiveis.',
      'O gate em PostgreSQL real prova isolamento de tenant e os fluxos criticos cobrem login, autorizacao e auditoria, mas falta aceite operacional completo de LGPD e governanca.',
      'Configuracoes administrativas ainda apontam para uma pagina placeholder.'
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
        'packages/db/migrations/0098_vetus_import_logs.sql'
      ],
      tests: ['packages/modules/webhooks/src/webhooks.test.ts'],
      e2e: ['e2e/spa/webhook-flow.spec.ts']
    },
    blockers: [
      'Live Pet e Live Lab nao possuem conectores equivalentes comprovados.',
      'Os consumidores locais de pagamentos, faturamento e webhooks estao registrados; ainda falta E2E de processamento e observabilidade do worker em ambiente distribuido.',
      'Importacao Vetus nao tem E2E de idempotencia, reconciliacao, rejeitados e rollback.'
    ]
  }
]);

import type { RouteRecordRaw } from 'vue-router';

function placeholderRoute(
  path: string,
  name: string,
  title: string,
  breadcrumbParent: string,
  icon = '🧩'
): RouteRecordRaw {
  return {
    path,
    name,
    component: () => import('@/pages/PlaceholderPage.vue'),
    meta: {
      title,
      breadcrumb: title,
      breadcrumbParent,
      icon
    }
  };
}

const placeholderRoutes: RouteRecordRaw[] = [
  placeholderRoute(
    'administration/settings',
    'AdministrationSettings',
    'Configurações',
    'Administração',
    '⚙️'
  )
];

function reportWorkbenchRoute(
  path: string,
  name: string,
  title: string,
  breadcrumbParent: string,
  reportKey: string,
  icon = '📈',
  alias: string[] = []
): RouteRecordRaw {
  return {
    path,
    name,
    ...(alias.length ? { alias } : {}),
    component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
    props: { reportKey },
    meta: {
      title,
      breadcrumb: title,
      breadcrumbParent,
      icon
    }
  };
}

const reportWorkbenchRoutes: RouteRecordRaw[] = [
  reportWorkbenchRoute(
    'reports/audit/appointments',
    'ReportsAuditAppointments',
    'Auditoria de Agendamentos',
    'Relatórios',
    'audit-appointments',
    '🧾',
    ['/relatorios/auditoria/agendamentos']
  ),
  reportWorkbenchRoute(
    'reports/cash-drawer',
    'ReportsCashDrawer',
    'Gaveta',
    'Relatórios Financeiros',
    'cash-drawer',
    '🧾',
    ['/relatorios/financeiros/gaveta']
  ),
  reportWorkbenchRoute(
    'reports/packages',
    'ReportsPackages',
    'Pacotes',
    'Relatórios Financeiros',
    'packages',
    '📦',
    ['/relatorios/financeiros/pacotes']
  ),
  reportWorkbenchRoute(
    'reports/accounts-receivable',
    'ReportsAccountsReceivable',
    'Contas a Receber',
    'Relatórios Financeiros',
    'accounts-receivable',
    '💵',
    ['/relatorios/financeiros/contas-a-receber']
  ),
  reportWorkbenchRoute(
    'reports/received-accounts',
    'ReportsReceivedAccounts',
    'Contas Recebidas',
    'Relatórios Financeiros',
    'received-accounts',
    '✅',
    ['/relatorios/financeiros/contas-recebidas']
  ),
  reportWorkbenchRoute(
    'reports/accounts-payable',
    'ReportsAccountsPayable',
    'Contas a Pagar',
    'Relatórios Financeiros',
    'accounts-payable',
    '💸',
    ['/relatorios/financeiros/contas-a-pagar']
  ),
  reportWorkbenchRoute(
    'reports/paid-accounts',
    'ReportsPaidAccounts',
    'Contas Pagas',
    'Relatórios Financeiros',
    'paid-accounts',
    '✅',
    ['/relatorios/financeiros/contas-pagas']
  ),
  reportWorkbenchRoute(
    'reports/cheques',
    'ReportsCheques',
    'Cheques',
    'Relatórios Financeiros',
    'cheques',
    '📄',
    ['/relatorios/financeiros/cheques']
  ),
  reportWorkbenchRoute(
    'reports/advance-payments',
    'ReportsAdvancePayments',
    'Pagamento Antecipado',
    'Relatórios Financeiros',
    'advance-payments',
    '⏩',
    ['/relatorios/financeiros/pagamento-antecipado']
  ),
  reportWorkbenchRoute(
    'reports/produced-items',
    'ReportsProducedItems',
    'Produtos/Serviços Produzidos',
    'Relatórios de Atendimentos',
    'produced-items',
    '🛠️',
    ['/relatorios/atendimentos/produtos-servicos-produzidos']
  ),
  reportWorkbenchRoute(
    'reports/professional-care',
    'ReportsProfessionalCare',
    'Atendimento por Profissional',
    'Relatórios de Atendimentos',
    'professional-care',
    '🩺',
    ['/relatorios/atendimentos/atendimento-por-profissional']
  ),
  reportWorkbenchRoute(
    'reports/nf',
    'ReportsServiceInvoices',
    'Relatório de NF de Serviços Prestados',
    'Relatórios Personalizados',
    'service-invoices',
    '🧾',
    ['/relatorios/personalizados/relatorio-de-nf-de-servicos-prestados']
  ),
  reportWorkbenchRoute(
    'reports/registers/services',
    'ReportsRegisterServices',
    'Serviços',
    'Relatórios de Cadastros',
    'register-services',
    '🛠️',
    ['/relatorios/cadastros/servicos']
  ),
  reportWorkbenchRoute(
    'reports/registers/owners',
    'ReportsRegisterOwners',
    'Clientes',
    'Relatórios de Cadastros',
    'register-owners',
    '👤',
    ['/relatorios/cadastros/clientes']
  ),
  reportWorkbenchRoute(
    'reports/registers/patients',
    'ReportsRegisterPatients',
    'Animais',
    'Relatórios de Cadastros',
    'register-patients',
    '🐾',
    ['/relatorios/cadastros/animais']
  ),
  reportWorkbenchRoute(
    'reports/registers/suppliers',
    'ReportsRegisterSuppliers',
    'Fornecedores',
    'Relatórios de Cadastros',
    'register-suppliers',
    '🚚',
    ['/relatorios/cadastros/fornecedores']
  ),
  reportWorkbenchRoute(
    'reports/deleted-sales-counter-sales',
    'ReportsDeletedSalesCounterSales',
    'Exclusão de Vendas e Comandas',
    'Relatórios de Cadastros',
    'deleted-sales-counter-sales',
    '🧾',
    ['/relatorios/cadastros/exclusao-de-vendas-e-comandas']
  ),
  reportWorkbenchRoute(
    'reports/inventory-movements',
    'ReportsInventoryMovements',
    'Movimentações no Estoque',
    'Relatórios de Estoque',
    'inventory-movements',
    '📥',
    ['/relatorios/estoque/movimentacoes-no-estoque']
  ),
  reportWorkbenchRoute(
    'reports/inventory-invoices',
    'ReportsInventoryInvoices',
    'Entrada de NF',
    'Relatórios de Estoque',
    'inventory-invoices',
    '🧾',
    ['/relatorios/estoque/entrada-de-nf']
  ),
  reportWorkbenchRoute(
    'reports/inventory-products',
    'ReportsInventoryProducts',
    'Relatório de Produtos',
    'Relatórios de Estoque',
    'inventory-products',
    '🏷️',
    ['/relatorios/estoque/relatorio-de-produtos']
  )
];

export const routes: RouteRecordRaw[] = [
  {
    path: '/auth/mfa',
    name: 'Mfa',
    component: () => import('@/pages/auth/MfaPage.vue'),
    meta: { requiresAuth: false, title: 'MFA', breadcrumb: 'MFA' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { requiresAuth: false, title: 'Login', breadcrumb: 'Login' }
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/pages/setup/SetupPage.vue'),
    meta: { requiresAuth: false, title: 'Configuração inicial', breadcrumb: 'Configuração inicial' }
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { title: 'Início', breadcrumb: 'Início', icon: '🏠' }
      },
      {
        path: 'dashboards/financial',
        name: 'DashboardFinancial',
        component: () => import('@/pages/finance/FinancialDashboardPage.vue'),
        alias: ['/financeiro/controles/dashboard-financeiro', '/dashboard-financeiro'],
        meta: {
          title: 'Dashboard Financeiro',
          breadcrumb: 'Dashboard Financeiro',
          breadcrumbParent: 'Financeiro',
          icon: '💰'
        }
      },
      {
        path: 'dashboards/curve-abc',
        name: 'DashboardCurveAbc',
        component: () => import('@/pages/finance/CurveAbcProductsPage.vue'),
        alias: ['/financeiro/controles/curva-abc-produtos', '/curva-abc-produtos'],
        meta: {
          title: 'Curva ABC Produtos',
          breadcrumb: 'Curva ABC Produtos',
          breadcrumbParent: 'Financeiro',
          icon: '📈'
        }
      },
      {
        path: 'dashboards/curve-abc-clients',
        name: 'DashboardCurveAbcClients',
        component: () => import('@/pages/finance/CurveAbcClientsPage.vue'),
        alias: ['/financeiro/controles/curva-abc-clientes', '/curva-abc-clientes'],
        meta: {
          title: 'Curva ABC Clientes',
          breadcrumb: 'Curva ABC Clientes',
          breadcrumbParent: 'Financeiro',
          icon: '📊'
        }
      },
      {
        path: 'dashboards/multifilial',
        name: 'DashboardMultibranch',
        component: () => import('@/pages/finance/MultibranchDashboardPage.vue'),
        alias: [
          '/financeiro/controles/dashboard-multifilial',
          '/dashboard-multifilial',
          '/multifilial'
        ],
        meta: {
          title: 'DashBoard do Multifilial',
          breadcrumb: 'DashBoard do Multifilial',
          breadcrumbParent: 'Financeiro',
          icon: '🏢'
        }
      },
      {
        path: 'finance/timeline',
        name: 'FinanceTimeline',
        component: () => import('@/pages/finance/FinanceTimelinePage.vue'),
        alias: ['/financeiro/controles/linha-do-tempo', '/linha-do-tempo'],
        meta: {
          title: 'Linha do Tempo',
          breadcrumb: 'Linha do Tempo',
          breadcrumbParent: 'Financeiro',
          icon: '🕒'
        }
      },
      {
        path: 'finance/split',
        name: 'FinanceSplit',
        component: () => import('@/pages/finance/SplitConfigurationPage.vue'),
        alias: [
          '/financeiro/maquininha/configuracao-do-split',
          '/financeiro/maquininha-de-cartao/configuracao-do-split',
          '/configuracao-do-split'
        ],
        meta: {
          title: 'Configuração do Split',
          breadcrumb: 'Configuração do Split',
          breadcrumbParent: 'Financeiro',
          icon: '🧩'
        }
      },
      {
        path: 'finance/card-machines',
        name: 'FinanceCardMachines',
        component: () => import('@/pages/finance/CardMachinesPage.vue'),
        alias: [
          '/financeiro/maquininha/maquininhas',
          '/financeiro/maquininha-de-cartao/maquininhas',
          '/maquininhas'
        ],
        meta: {
          title: 'Maquininhas',
          breadcrumb: 'Maquininhas',
          breadcrumbParent: 'Financeiro',
          icon: '💳'
        }
      },
      {
        path: 'finance/split/simulator',
        name: 'FinanceSplitSimulator',
        component: () => import('@/pages/finance/SplitSimulatorPage.vue'),
        alias: [
          '/financeiro/maquininha/simulador-de-split',
          '/financeiro/maquininha-de-cartao/simulador-de-split',
          '/simulador-de-split'
        ],
        meta: {
          title: 'Simulador de Split',
          breadcrumb: 'Simulador de Split',
          breadcrumbParent: 'Financeiro',
          icon: '🧮'
        }
      },
      {
        path: 'finance/card-transactions',
        name: 'FinanceCardTransactions',
        component: () => import('@/pages/finance/CardTransactionsPage.vue'),
        alias: [
          '/financeiro/maquininha/transacoes-de-cartao',
          '/financeiro/maquininha-de-cartao/transacoes-de-cartao',
          '/transacoes-de-cartao'
        ],
        meta: {
          title: 'Transações de Cartão',
          breadcrumb: 'Transações de Cartão',
          breadcrumbParent: 'Financeiro',
          icon: '💳'
        }
      },
      {
        path: 'finance/split/export',
        name: 'FinanceSplitExport',
        component: () => import('@/pages/finance/SplitExporterPage.vue'),
        alias: [
          '/financeiro/maquininha/exportador-de-split',
          '/financeiro/maquininha-de-cartao/exportador-de-split',
          '/exportador-de-split'
        ],
        meta: {
          title: 'Exportador de Split',
          breadcrumb: 'Exportador de Split',
          breadcrumbParent: 'Financeiro',
          icon: '📤'
        }
      },
      {
        path: 'finance/payment-enablement',
        name: 'FinancePaymentEnablement',
        component: () => import('@/pages/finance/PaymentEnablementPage.vue'),
        alias: [
          '/financeiro/maquininha/habilitar-pagamento',
          '/financeiro/maquininha-de-cartao/habilitar-pagamento',
          '/habilitar-pagamento'
        ],
        meta: {
          title: 'Habilitar Pagamento',
          breadcrumb: 'Habilitar Pagamento',
          breadcrumbParent: 'Financeiro',
          icon: '✅'
        }
      },
      {
        path: 'finance/payments-dashboard',
        name: 'FinancePaymentsDashboard',
        component: () => import('@/pages/finance/PaymentsDashboardPage.vue'),
        alias: [
          '/financeiro/maquininha/pagamento-dashboard',
          '/financeiro/maquininha-de-cartao/pagamento-dashboard',
          '/pagamento-dashboard'
        ],
        meta: {
          title: 'Pagamento Dashboard',
          breadcrumb: 'Pagamento Dashboard',
          breadcrumbParent: 'Financeiro',
          icon: '📊'
        }
      },
      {
        path: 'owners',
        name: 'Owners',
        component: () => import('@/pages/owners/OwnersListPage.vue'),
        meta: {
          title: 'Clientes',
          breadcrumb: 'Clientes',
          breadcrumbParent: 'Cadastros',
          icon: '👤'
        }
      },
      {
        path: 'owners/new',
        name: 'OwnerNew',
        component: () => import('@/pages/owners/OwnerFormPage.vue'),
        meta: {
          title: 'Novo Cliente',
          breadcrumb: 'Novo Cliente',
          breadcrumbParent: 'Clientes',
          icon: '👤'
        }
      },
      {
        path: 'owners/:id',
        name: 'OwnerDetail',
        component: () => import('@/pages/owners/OwnerDetailPage.vue'),
        meta: {
          title: 'Detalhes do Cliente',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Clientes',
          icon: '👤'
        }
      },
      {
        path: 'owners/:id/edit',
        name: 'OwnerEdit',
        component: () => import('@/pages/owners/OwnerFormPage.vue'),
        meta: {
          title: 'Editar Cliente',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Clientes',
          icon: '👤'
        }
      },
      {
        path: 'patients',
        name: 'Patients',
        component: () => import('@/pages/patients/PatientsListPage.vue'),
        meta: {
          title: 'Animais',
          breadcrumb: 'Animais',
          breadcrumbParent: 'Cadastros',
          icon: '🐾'
        }
      },
      {
        path: 'patients/new',
        name: 'PatientNew',
        component: () => import('@/pages/patients/PatientFormPage.vue'),
        meta: {
          title: 'Novo Animal',
          breadcrumb: 'Novo Animal',
          breadcrumbParent: 'Animais',
          icon: '🐾'
        }
      },
      {
        path: 'patients/:id',
        name: 'PatientDetail',
        component: () => import('@/pages/patients/PatientDetailPage.vue'),
        meta: {
          title: 'Detalhes do Animal',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Animais',
          icon: '🐾'
        }
      },
      {
        path: 'patients/:id/edit',
        name: 'PatientEdit',
        component: () => import('@/pages/patients/PatientFormPage.vue'),
        meta: {
          title: 'Editar Animal',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Animais',
          icon: '🐾'
        }
      },
      {
        path: 'breeds',
        name: 'Breeds',
        alias: [
          '/racas',
          '/raças',
          '/cadastros/racas',
          '/cadastros/raças',
          '/cadastro/racas',
          '/cadastro/raças'
        ],
        component: () => import('@/pages/breeds/BreedsListPage.vue'),
        meta: { title: 'Raças', breadcrumb: 'Raças', breadcrumbParent: 'Cadastros', icon: '🧬' }
      },
      {
        path: 'breeds/new',
        name: 'BreedNew',
        component: () => import('@/pages/breeds/BreedFormPage.vue'),
        meta: {
          title: 'Nova Raça',
          breadcrumb: 'Nova Raça',
          breadcrumbParent: 'Raças',
          icon: '🧬'
        }
      },
      {
        path: 'breeds/:id',
        name: 'BreedDetail',
        component: () => import('@/pages/breeds/BreedDetailPage.vue'),
        meta: {
          title: 'Detalhes da Raça',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Raças',
          icon: '🧬'
        }
      },
      {
        path: 'breeds/:id/edit',
        name: 'BreedEdit',
        component: () => import('@/pages/breeds/BreedFormPage.vue'),
        meta: {
          title: 'Editar Raça',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Raças',
          icon: '🧬'
        }
      },
      {
        path: 'species',
        name: 'Species',
        alias: [
          '/especies',
          '/espécies',
          '/cadastros/especies',
          '/cadastros/espécies',
          '/cadastro/especies',
          '/cadastro/espécies'
        ],
        component: () => import('@/pages/species/SpeciesListPage.vue'),
        meta: {
          title: 'Espécies',
          breadcrumb: 'Espécies',
          breadcrumbParent: 'Cadastros',
          icon: '🦴'
        }
      },
      {
        path: 'species/new',
        name: 'SpeciesNew',
        component: () => import('@/pages/species/SpeciesFormPage.vue'),
        meta: {
          title: 'Nova Espécie',
          breadcrumb: 'Nova Espécie',
          breadcrumbParent: 'Espécies',
          icon: '🦴'
        }
      },
      {
        path: 'species/:id',
        name: 'SpeciesDetail',
        component: () => import('@/pages/species/SpeciesDetailPage.vue'),
        meta: {
          title: 'Detalhes da Espécie',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Espécies',
          icon: '🦴'
        }
      },
      {
        path: 'species/:id/edit',
        name: 'SpeciesEdit',
        component: () => import('@/pages/species/SpeciesFormPage.vue'),
        meta: {
          title: 'Editar Espécie',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Espécies',
          icon: '🦴'
        }
      },
      {
        path: 'coat-colors',
        name: 'CoatColors',
        alias: ['/cores', '/pelagens', '/cadastros/cores', '/cadastro/cores'],
        component: () => import('@/pages/coat-colors/CoatColorsListPage.vue'),
        meta: {
          title: 'Cores/Pelagens',
          breadcrumb: 'Cores/Pelagens',
          breadcrumbParent: 'Cadastros',
          icon: '🎨'
        }
      },
      {
        path: 'coat-colors/new',
        name: 'CoatColorNew',
        component: () => import('@/pages/coat-colors/CoatColorFormPage.vue'),
        meta: {
          title: 'Nova Cor/Pelagem',
          breadcrumb: 'Nova Cor/Pelagem',
          breadcrumbParent: 'Cores/Pelagens',
          icon: '🎨'
        }
      },
      {
        path: 'coat-colors/:id',
        name: 'CoatColorDetail',
        component: () => import('@/pages/coat-colors/CoatColorDetailPage.vue'),
        meta: {
          title: 'Detalhes da Cor/Pelagem',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Cores/Pelagens',
          icon: '🎨'
        }
      },
      {
        path: 'coat-colors/:id/edit',
        name: 'CoatColorEdit',
        component: () => import('@/pages/coat-colors/CoatColorFormPage.vue'),
        meta: {
          title: 'Editar Cor/Pelagem',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Cores/Pelagens',
          icon: '🎨'
        }
      },
      {
        path: 'customer-groups',
        name: 'CustomerGroups',
        alias: [
          '/grupos-de-clientes',
          '/cadastros/grupos-de-clientes',
          '/cadastro/grupos-de-clientes'
        ],
        component: () => import('@/pages/customer-groups/CustomerGroupsListPage.vue'),
        meta: {
          title: 'Grupos de Clientes',
          breadcrumb: 'Grupos de Clientes',
          breadcrumbParent: 'Cadastros',
          icon: '👥'
        }
      },
      {
        path: 'customer-groups/new',
        name: 'CustomerGroupNew',
        component: () => import('@/pages/customer-groups/CustomerGroupFormPage.vue'),
        meta: {
          title: 'Novo Grupo de Clientes',
          breadcrumb: 'Novo Grupo de Clientes',
          breadcrumbParent: 'Grupos de Clientes',
          icon: '👥'
        }
      },
      {
        path: 'customer-groups/:id',
        name: 'CustomerGroupDetail',
        component: () => import('@/pages/customer-groups/CustomerGroupDetailPage.vue'),
        meta: {
          title: 'Detalhes do Grupo de Clientes',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Grupos de Clientes',
          icon: '👥'
        }
      },
      {
        path: 'customer-groups/:id/edit',
        name: 'CustomerGroupEdit',
        component: () => import('@/pages/customer-groups/CustomerGroupFormPage.vue'),
        meta: {
          title: 'Editar Grupo de Clientes',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Grupos de Clientes',
          icon: '👥'
        }
      },
      { path: 'cadastros/racas', redirect: '/breeds' },
      { path: 'cadastros/raças', redirect: '/breeds' },
      { path: 'cadastro/racas', redirect: '/breeds' },
      { path: 'cadastro/raças', redirect: '/breeds' },
      { path: 'cadastros/especies', redirect: '/species' },
      { path: 'cadastros/espécies', redirect: '/species' },
      { path: 'cadastro/especies', redirect: '/species' },
      { path: 'cadastro/espécies', redirect: '/species' },
      { path: 'cadastros/species', redirect: '/species' },
      { path: 'cadastro/species', redirect: '/species' },
      { path: 'cadastros/cores', redirect: '/coat-colors' },
      { path: 'cadastro/cores', redirect: '/coat-colors' },
      { path: 'cadastros/coat-colors', redirect: '/coat-colors' },
      { path: 'cadastro/coat-colors', redirect: '/coat-colors' },
      { path: 'cadastros/pelagens', redirect: '/coat-colors' },
      { path: 'cadastro/pelagens', redirect: '/coat-colors' },
      { path: 'cadastros/grupos-de-clientes', redirect: '/customer-groups' },
      { path: 'cadastro/grupos-de-clientes', redirect: '/customer-groups' },
      {
        path: 'encounters',
        name: 'Encounters',
        component: () => import('@/pages/encounters/EncountersListPage.vue'),
        meta: {
          title: 'Atendimentos',
          breadcrumb: 'Atendimentos',
          breadcrumbParent: 'Atendimento',
          icon: '🏥'
        }
      },
      {
        path: 'encounters/new',
        name: 'EncounterNew',
        component: () => import('@/pages/encounters/EncounterFormPage.vue'),
        meta: {
          title: 'Abrir Atendimento',
          breadcrumb: 'Novo Atendimento',
          breadcrumbParent: 'Atendimentos',
          icon: '🏥'
        }
      },
      {
        path: 'encounters/:id',
        name: 'EncounterDetail',
        component: () => import('@/pages/encounters/EncounterDetailPage.vue'),
        meta: {
          title: 'Detalhes do Atendimento',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Atendimentos',
          icon: '🏥'
        }
      },
      {
        path: 'reception',
        name: 'ReceptionGateway',
        component: () => import('@/pages/reception/ReceptionGatewayPage.vue'),
        meta: {
          title: 'Recepção',
          breadcrumb: 'Recepção',
          breadcrumbParent: 'Atendimento',
          icon: 'RC'
        }
      },
      {
        path: 'appointments',
        name: 'Appointments',
        component: () => import('@/pages/appointments/AppointmentsListPage.vue'),
        alias: [
          '/agenda',
          '/agendamentos',
          '/atendimento/agenda',
          '/atendimento/atendimentos/agenda'
        ],
        meta: { title: 'Agenda', breadcrumb: 'Agenda', breadcrumbParent: 'Atendimento', icon: '📅' }
      },
      {
        path: 'appointments/availability',
        name: 'AppointmentAvailability',
        component: () => import('@/pages/appointments/AvailabilityPage.vue'),
        meta: {
          title: 'Disponibilidade',
          breadcrumb: 'Disponibilidade',
          breadcrumbParent: 'Agenda',
          icon: '🕒'
        }
      },
      {
        path: 'appointments/types',
        name: 'AppointmentTypes',
        component: () => import('@/pages/appointments/AppointmentTypesPage.vue'),
        meta: {
          title: 'Tipos de Agendamento',
          breadcrumb: 'Tipos',
          breadcrumbParent: 'Agenda',
          icon: '🧷'
        }
      },
      {
        path: 'appointments/new',
        name: 'AppointmentNew',
        component: () => import('@/pages/appointments/AppointmentFormPage.vue'),
        alias: ['/agenda/novo', '/agendamentos/novo', '/atendimento/atendimentos/agenda/novo'],
        meta: {
          title: 'Novo Agendamento',
          breadcrumb: 'Novo Agendamento',
          breadcrumbParent: 'Agenda',
          icon: '📅'
        }
      },
      {
        path: 'appointments/:id',
        name: 'AppointmentDetail',
        component: () => import('@/pages/appointments/AppointmentDetailPage.vue'),
        meta: {
          title: 'Detalhes do Agendamento',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Agenda',
          icon: '📅'
        }
      },
      {
        path: 'medical-records',
        name: 'MedicalRecords',
        component: () => import('@/pages/medical-records/MedicalRecordsListPage.vue'),
        meta: {
          title: 'Prontuário',
          breadcrumb: 'Prontuário',
          breadcrumbParent: 'Atendimento',
          icon: '📋'
        }
      },
      {
        path: 'medical-records/:id',
        name: 'MedicalRecordDetail',
        component: () => import('@/pages/medical-records/MedicalRecordsDetailPage.vue'),
        meta: {
          title: 'Detalhes do Prontuário',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Prontuário',
          icon: '📋'
        }
      },
      {
        path: 'diagnostics',
        name: 'Diagnostics',
        component: () => import('@/pages/clinical/DiagnosticsPage.vue'),
        meta: {
          title: 'Central Diagnóstica',
          breadcrumb: 'Central Diagnóstica',
          breadcrumbParent: 'Laboratório',
          icon: '🧪'
        }
      },
      {
        path: 'exam-orders',
        name: 'ExamOrdersApi',
        alias: [
          '/esteira-de-exames',
          '/atendimento/esteira-de-exames',
          '/atendimento/atendimentos/esteira-de-exames'
        ],
        component: () => import('@/pages/laboratory/ExamOrdersApiPage.vue'),
        meta: {
          title: 'Esteira de Exames',
          breadcrumb: 'Esteira de Exames',
          breadcrumbParent: 'Atendimento',
          icon: '🧪'
        }
      },
      {
        path: 'exam-results',
        name: 'ExamResultsApi',
        component: () => import('@/pages/laboratory/ExamResultsApiPage.vue'),
        meta: {
          title: 'Resultados API',
          breadcrumb: 'Resultados API',
          breadcrumbParent: 'Laboratório',
          icon: '🧪'
        }
      },
      {
        path: 'laboratory',
        name: 'Laboratory',
        component: () => import('@/pages/laboratory/LaboratoryHubPage.vue'),
        meta: {
          title: 'Laboratório',
          breadcrumb: 'Laboratório',
          breadcrumbParent: 'Laboratório',
          icon: '🔬'
        }
      },
      {
        path: 'laboratory/orders',
        name: 'LaboratoryOrders',
        alias: [
          '/laboratorio/exames',
          '/laboratorio/atendimentos/exames',
          '/laboratorio/pedidos-de-exame',
          '/laboratorio/atendimentos/pedidos-de-exame'
        ],
        component: () => import('@/pages/laboratory/LaboratoryOrdersPage.vue'),
        meta: {
          title: 'Exames',
          breadcrumb: 'Exames',
          breadcrumbParent: 'Laboratório',
          icon: '🧪'
        }
      },
      {
        path: 'laboratory/results',
        name: 'LaboratoryResults',
        alias: ['/laboratorio/laudos', '/laboratorio/atendimentos/laudos'],
        component: () => import('@/pages/laboratory/LaboratoryResultsPage.vue'),
        meta: {
          title: 'Laudos',
          breadcrumb: 'Laudos',
          breadcrumbParent: 'Laboratório',
          icon: '📋'
        }
      },
      {
        path: 'laboratory/hemograms',
        name: 'LaboratoryHemograms',
        alias: [
          '/hemogramas',
          '/laboratorio/hemogramas',
          '/laboratorio/atendimentos/hemogramas',
          '/laboratorio/exames/hemogramas'
        ],
        component: () => import('@/pages/laboratory/LaboratoryHemogramsPage.vue'),
        meta: {
          title: 'Hemogramas',
          breadcrumb: 'Hemogramas',
          breadcrumbParent: 'Laboratório',
          icon: '🩸'
        }
      },
      {
        path: 'laboratory/urinalysis',
        name: 'LaboratoryUrinalysis',
        alias: [
          '/urina',
          '/urinanalise',
          '/urinálise',
          '/laboratorio/urina',
          '/laboratorio/atendimentos/urina',
          '/laboratorio/exames/urina'
        ],
        component: () => import('@/pages/laboratory/LaboratoryUrinalysisPage.vue'),
        meta: {
          title: 'Urina',
          breadcrumb: 'Urina',
          breadcrumbParent: 'Laboratório',
          icon: '💧'
        }
      },
      {
        path: 'laboratory/biochemistry',
        name: 'LaboratoryBiochemistry',
        alias: [
          '/bioquimico',
          '/bioquímico',
          '/laboratorio/bioquimico',
          '/laboratorio/bioquímico',
          '/laboratorio/atendimentos/bioquimico',
          '/laboratorio/exames/bioquimico'
        ],
        component: () => import('@/pages/laboratory/LaboratoryBiochemistryPage.vue'),
        meta: {
          title: 'Bioquímico',
          breadcrumb: 'Bioquímico',
          breadcrumbParent: 'Laboratório',
          icon: '⚗️'
        }
      },
      {
        path: 'laboratory/equipment',
        name: 'LaboratoryEquipment',
        alias: [
          '/equipamentos',
          '/laboratorio/equipamentos',
          '/laboratorio/cadastros/equipamentos'
        ],
        component: () => import('@/pages/laboratory/LaboratoryEquipmentPage.vue'),
        meta: {
          title: 'Equipamentos',
          breadcrumb: 'Equipamentos',
          breadcrumbParent: 'Laboratório',
          icon: '🔧'
        }
      },
      {
        path: 'laboratory/equipment/new',
        name: 'LaboratoryEquipmentNew',
        component: () => import('@/pages/laboratory/LaboratoryEquipmentFormPage.vue'),
        meta: {
          title: 'Incluir Equipamento',
          breadcrumb: 'Incluir',
          breadcrumbParent: 'Equipamentos',
          icon: '🔧'
        }
      },
      {
        path: 'laboratory/equipment/:id',
        name: 'LaboratoryEquipmentDetail',
        component: () => import('@/pages/laboratory/LaboratoryEquipmentDetailPage.vue'),
        meta: {
          title: 'Detalhes do Equipamento',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Equipamentos',
          icon: '🔧'
        }
      },
      {
        path: 'laboratory/equipment/:id/edit',
        name: 'LaboratoryEquipmentEdit',
        component: () => import('@/pages/laboratory/LaboratoryEquipmentFormPage.vue'),
        meta: {
          title: 'Editar Equipamento',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Equipamentos',
          icon: '🔧'
        }
      },
      {
        path: 'laboratory/report-types',
        name: 'LaboratoryReportTypes',
        alias: [
          '/tipos-de-laudo',
          '/laboratorio/tipos-de-laudo',
          '/laboratorio/cadastros/tipos-de-laudo'
        ],
        component: () => import('@/pages/laboratory/LaboratoryReportTypesPage.vue'),
        meta: {
          title: 'Tipos de Laudo',
          breadcrumb: 'Tipos de Laudo',
          breadcrumbParent: 'Laboratório',
          icon: '📄'
        }
      },
      {
        path: 'laboratory/report-types/new',
        name: 'LaboratoryReportTypeNew',
        component: () => import('@/pages/laboratory/LaboratoryReportTypeFormPage.vue'),
        meta: {
          title: 'Incluir Tipo de Laudo',
          breadcrumb: 'Incluir',
          breadcrumbParent: 'Tipos de Laudo',
          icon: '📄'
        }
      },
      {
        path: 'laboratory/report-types/:id',
        name: 'LaboratoryReportTypeDetail',
        component: () => import('@/pages/laboratory/LaboratoryReportTypeDetailPage.vue'),
        meta: {
          title: 'Detalhes do Tipo de Laudo',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Tipos de Laudo',
          icon: '📄'
        }
      },
      {
        path: 'laboratory/report-types/:id/edit',
        name: 'LaboratoryReportTypeEdit',
        component: () => import('@/pages/laboratory/LaboratoryReportTypeFormPage.vue'),
        meta: {
          title: 'Editar Tipo de Laudo',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Tipos de Laudo',
          icon: '📄'
        }
      },
      {
        path: 'laboratory/reference-values',
        name: 'LaboratoryReferenceValues',
        component: () => import('@/pages/laboratory/LaboratoryReferenceValuesPage.vue'),
        meta: {
          title: 'Valores de Referência',
          breadcrumb: 'Valores de Referência',
          breadcrumbParent: 'Laboratório',
          icon: '📈'
        }
      },
      {
        path: 'laboratory/hemogram-reference-values',
        name: 'LaboratoryHemogramReferenceValues',
        alias: [
          '/vlr-ref-hemograma',
          '/laboratorio/vlr-ref-hemograma',
          '/laboratorio/cadastros/vlr-ref-hemograma'
        ],
        component: () => import('@/pages/laboratory/LaboratoryHemogramReferenceValuesPage.vue'),
        meta: {
          title: 'Vlr. Ref. Hemograma',
          breadcrumb: 'Vlr. Ref. Hemograma',
          breadcrumbParent: 'Laboratório',
          icon: '📈'
        }
      },
      {
        path: 'laboratory/hemogram-reference-values/new',
        name: 'LaboratoryHemogramReferenceValueNew',
        component: () => import('@/pages/laboratory/LaboratoryHemogramReferenceValueFormPage.vue'),
        meta: {
          title: 'Incluir Valor de Referência',
          breadcrumb: 'Incluir',
          breadcrumbParent: 'Vlr. Ref. Hemograma',
          icon: '📈'
        }
      },
      {
        path: 'laboratory/hemogram-reference-values/:id',
        name: 'LaboratoryHemogramReferenceValueDetail',
        component: () =>
          import('@/pages/laboratory/LaboratoryHemogramReferenceValueDetailPage.vue'),
        meta: {
          title: 'Detalhes do Valor de Referência',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Vlr. Ref. Hemograma',
          icon: '📈'
        }
      },
      {
        path: 'laboratory/hemogram-reference-values/:id/edit',
        name: 'LaboratoryHemogramReferenceValueEdit',
        component: () => import('@/pages/laboratory/LaboratoryHemogramReferenceValueFormPage.vue'),
        meta: {
          title: 'Editar Valor de Referência',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Vlr. Ref. Hemograma',
          icon: '📈'
        }
      },
      {
        path: 'laboratory/biochemistry-reference-values',
        name: 'LaboratoryBiochemistryReferenceValues',
        alias: [
          '/vlr-ref-bioquimico',
          '/laboratorio/vlr-ref-bioquimico',
          '/laboratorio/cadastros/vlr-ref-bioquimico'
        ],
        component: () => import('@/pages/laboratory/LaboratoryBiochemistryReferenceValuesPage.vue'),
        meta: {
          title: 'Vlr. Ref. Bioquímico',
          breadcrumb: 'Vlr. Ref. Bioquímico',
          breadcrumbParent: 'Laboratório',
          icon: '⚗️'
        }
      },
      {
        path: 'laboratory/biochemistry-reference-values/new',
        name: 'LaboratoryBiochemistryReferenceValueNew',
        component: () =>
          import('@/pages/laboratory/LaboratoryBiochemistryReferenceValueFormPage.vue'),
        meta: {
          title: 'Incluir Valor Bioquímico',
          breadcrumb: 'Incluir',
          breadcrumbParent: 'Vlr. Ref. Bioquímico',
          icon: '⚗️'
        }
      },
      {
        path: 'laboratory/biochemistry-reference-values/:id',
        name: 'LaboratoryBiochemistryReferenceValueDetail',
        component: () =>
          import('@/pages/laboratory/LaboratoryBiochemistryReferenceValueDetailPage.vue'),
        meta: {
          title: 'Detalhes do Valor Bioquímico',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Vlr. Ref. Bioquímico',
          icon: '⚗️'
        }
      },
      {
        path: 'laboratory/biochemistry-reference-values/:id/edit',
        name: 'LaboratoryBiochemistryReferenceValueEdit',
        component: () =>
          import('@/pages/laboratory/LaboratoryBiochemistryReferenceValueFormPage.vue'),
        meta: {
          title: 'Editar Valor Bioquímico',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Vlr. Ref. Bioquímico',
          icon: '⚗️'
        }
      },
      {
        path: 'prescriptions',
        name: 'Prescriptions',
        component: () => import('@/pages/clinical/PrescriptionsPage.vue'),
        meta: {
          title: 'Prescrições',
          breadcrumb: 'Prescrições',
          breadcrumbParent: 'Atendimento',
          icon: '💊'
        }
      },
      {
        path: 'prescription-executions',
        name: 'PrescriptionExecutions',
        component: () => import('@/pages/clinical/PrescriptionExecutionsPage.vue'),
        meta: {
          title: 'Execuções de Prescrição',
          breadcrumb: 'Execuções',
          breadcrumbParent: 'Atendimento',
          icon: '🩺'
        }
      },
      {
        path: 'discharges',
        name: 'Discharges',
        component: () => import('@/pages/clinical/DischargesPage.vue'),
        meta: {
          title: 'Altas',
          breadcrumb: 'Altas',
          breadcrumbParent: 'Internação',
          icon: '🏠'
        }
      },
      {
        path: 'surgery',
        name: 'Surgery',
        alias: ['/surgeries'],
        component: () => import('@/pages/clinical/SurgeryPage.vue'),
        meta: {
          title: 'Cirurgias',
          breadcrumb: 'Cirurgias',
          breadcrumbParent: 'Atendimento',
          icon: '🔪'
        }
      },
      {
        path: 'inpatient',
        name: 'Inpatient',
        component: () => import('@/pages/inpatient/InpatientListPage.vue'),
        meta: {
          title: 'Internação',
          breadcrumb: 'Internação',
          breadcrumbParent: 'Atendimento',
          icon: '🛏️'
        }
      },
      {
        path: 'inpatient/board',
        name: 'BedBoard',
        alias: ['/bed-map'],
        component: () => import('@/pages/inpatient/BedBoardPage.vue'),
        meta: {
          title: 'Mapa de Leitos',
          breadcrumb: 'Mapa de Leitos',
          breadcrumbParent: 'Internação',
          icon: '🗺️'
        }
      },
      {
        path: 'inpatient/daily-charges',
        name: 'InpatientDailyCharges',
        alias: ['/internacao/diarias', '/internação/diárias'],
        component: () => import('@/pages/inpatient/InpatientDailyChargesPage.vue'),
        meta: {
          title: 'Diárias de Internação',
          breadcrumb: 'Diárias',
          breadcrumbParent: 'Internação',
          icon: '💵'
        }
      },
      {
        path: 'inpatient/admit',
        name: 'InpatientAdmission',
        component: () => import('@/pages/inpatient/InpatientAdmissionPage.vue'),
        meta: {
          title: 'Admitir paciente',
          breadcrumb: 'Admitir',
          breadcrumbParent: 'Internação',
          icon: '🛏️'
        }
      },
      {
        path: 'inpatient/:id',
        name: 'InpatientDetail',
        component: () => import('@/pages/inpatient/InpatientDetailPage.vue'),
        meta: {
          title: 'Detalhes da Internação',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Internação',
          icon: '🛏️'
        }
      },
      {
        path: 'sectors',
        name: 'Sectors',
        component: () => import('@/pages/inpatient/SectorsPage.vue'),
        meta: {
          title: 'Setores',
          breadcrumb: 'Setores',
          breadcrumbParent: 'Internação',
          icon: '🏢'
        }
      },
      {
        path: 'beds',
        name: 'Beds',
        alias: [
          '/boxes-de-internacao',
          '/cadastros/boxes-de-internacao',
          '/cadastro/boxes-de-internacao'
        ],
        component: () => import('@/pages/inpatient/BedsPage.vue'),
        meta: {
          title: 'Boxes de Internação',
          breadcrumb: 'Boxes de Internação',
          breadcrumbParent: 'Cadastros',
          icon: '🛏️'
        }
      },
      {
        path: 'beds/new',
        name: 'BedNew',
        component: () => import('@/pages/inpatient/BedFormPage.vue'),
        meta: {
          title: 'Incluir Box de Internação',
          breadcrumb: 'Incluir',
          breadcrumbParent: 'Boxes de Internação',
          icon: '🛏️'
        }
      },
      {
        path: 'beds/:id',
        name: 'BedDetail',
        component: () => import('@/pages/inpatient/BedDetailPage.vue'),
        meta: {
          title: 'Box de Internação',
          breadcrumb: 'Abrir',
          breadcrumbParent: 'Boxes de Internação',
          icon: '🛏️'
        }
      },
      {
        path: 'beds/:id/edit',
        name: 'BedEdit',
        component: () => import('@/pages/inpatient/BedFormPage.vue'),
        meta: {
          title: 'Editar Box de Internação',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Boxes de Internação',
          icon: '🛏️'
        }
      },
      {
        path: 'billing',
        name: 'Billing',
        component: () => import('@/pages/billing/BillingListPage.vue'),
        alias: [
          '/finance/accounts-receivable',
          '/financeiro/controles/contas-a-receber',
          '/contas-a-receber'
        ],
        meta: {
          title: 'Contas a Receber',
          breadcrumb: 'Contas a Receber',
          breadcrumbParent: 'Financeiro',
          icon: '💰'
        }
      },
      {
        path: 'billing/:id',
        name: 'BillingDetail',
        component: () => import('@/pages/billing/BillingDetailPage.vue'),
        meta: {
          title: 'Detalhes da Conta a Receber',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Contas a Receber',
          icon: '💰'
        }
      },
      {
        path: 'finance/accounts-payable',
        name: 'AccountsPayable',
        component: () => import('@/pages/finance/AccountsPayablePage.vue'),
        alias: ['/financeiro/controles/contas-a-pagar', '/contas-a-pagar'],
        meta: {
          title: 'Contas a Pagar',
          breadcrumb: 'Contas a Pagar',
          breadcrumbParent: 'Financeiro',
          icon: '💸'
        }
      },
      {
        path: 'finance/reconciliation',
        name: 'FinancialReconciliation',
        component: () => import('@/pages/finance/FinancialReconciliationPage.vue'),
        alias: [
          '/financeiro/controles/conciliacao-financeira',
          '/financeiro/controles/conciliação-financeira',
          '/conciliacao-financeira',
          '/conciliação-financeira'
        ],
        meta: {
          title: 'Conciliação Financeira',
          breadcrumb: 'Conciliação Financeira',
          breadcrumbParent: 'Financeiro',
          icon: '🧾'
        }
      },
      {
        path: 'finance/advance-payments',
        name: 'FinanceAdvancePayments',
        component: () => import('@/pages/finance/AdvancePaymentsPage.vue'),
        alias: ['/financeiro/controles/pagamento-antecipado', '/pagamento-antecipado'],
        meta: {
          title: 'Pagamento Antecipado',
          breadcrumb: 'Pagamento Antecipado',
          breadcrumbParent: 'Financeiro',
          icon: '⏩'
        }
      },
      {
        path: 'finance/card-accounts',
        name: 'FinanceCardAccounts',
        component: () => import('@/pages/finance/CardAccountsPage.vue'),
        alias: [
          '/financeiro/controles/contas-adm-cartao',
          '/financeiro/controles/contas-adm-cartão',
          '/contas-adm-cartao',
          '/contas-adm-cartão'
        ],
        meta: {
          title: 'Contas Adm. Cartão',
          breadcrumb: 'Contas Adm. Cartão',
          breadcrumbParent: 'Financeiro',
          icon: '💳'
        }
      },
      {
        path: 'finance/cheques',
        name: 'FinanceCheques',
        component: () => import('@/pages/finance/ChequesPage.vue'),
        alias: ['/financeiro/controles/cheques', '/cheques'],
        meta: {
          title: 'Cheques',
          breadcrumb: 'Cheques',
          breadcrumbParent: 'Financeiro',
          icon: '📄'
        }
      },
      {
        path: 'finance/cash-flow',
        name: 'FinanceCashFlow',
        component: () => import('@/pages/finance/CashFlowPage.vue'),
        alias: ['/financeiro/controles/fluxo-de-caixa', '/fluxo-de-caixa'],
        meta: {
          title: 'Fluxo de Caixa',
          breadcrumb: 'Fluxo de Caixa',
          breadcrumbParent: 'Financeiro',
          icon: '📈'
        }
      },
      {
        path: 'triage',
        name: 'Triage',
        component: () => import('@/pages/triage/TriageListPage.vue'),
        meta: {
          title: 'Triagem',
          breadcrumb: 'Triagem',
          breadcrumbParent: 'Atendimento',
          icon: '🏷️'
        }
      },
      {
        path: 'triage/new',
        name: 'TriageNew',
        component: () => import('@/pages/triage/TriageFormPage.vue'),
        meta: {
          title: 'Nova Triagem',
          breadcrumb: 'Nova Triagem',
          breadcrumbParent: 'Triagem',
          icon: '🏷️'
        }
      },
      {
        path: 'triage/:id',
        name: 'TriageDetail',
        component: () => import('@/pages/triage/TriageDetailPage.vue'),
        meta: {
          title: 'Detalhes da Triagem',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Triagem',
          icon: '🏷️'
        }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/pages/users/UsersListPage.vue'),
        meta: {
          title: 'Usuários',
          breadcrumb: 'Usuários',
          breadcrumbParent: 'RH',
          icon: '👤'
        }
      },
      {
        path: 'users/new',
        name: 'UserNew',
        component: () => import('@/pages/users/UserFormPage.vue'),
        meta: {
          title: 'Novo Usuário',
          breadcrumb: 'Novo Usuário',
          breadcrumbParent: 'Usuários',
          icon: '👤'
        }
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/pages/users/UserDetailPage.vue'),
        meta: {
          title: 'Detalhes do Usuário',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Usuários',
          icon: '👤'
        }
      },
      {
        path: 'users/:id/edit',
        name: 'UserEdit',
        component: () => import('@/pages/users/UserFormPage.vue'),
        meta: {
          title: 'Editar Usuário',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Usuários',
          icon: '👤'
        }
      },
      {
        path: 'access-control',
        name: 'AccessControl',
        component: () => import('@/pages/access-control/AccessControlPage.vue'),
        meta: {
          title: 'Grupos de Acesso',
          breadcrumb: 'Grupos de Acesso',
          breadcrumbParent: 'RH',
          icon: '🔐'
        }
      },
      {
        path: 'audit',
        name: 'Audit',
        component: () => import('@/pages/audit/AuditPage.vue'),
        meta: {
          title: 'Auditoria',
          breadcrumb: 'Auditoria',
          breadcrumbParent: 'Governança',
          icon: '🧾'
        }
      },
      {
        path: 'lgpd',
        name: 'Lgpd',
        component: () => import('@/pages/lgpd/LgpdHubPage.vue'),
        meta: {
          title: 'LGPD',
          breadcrumb: 'LGPD',
          breadcrumbParent: 'Governança',
          icon: '🔒'
        }
      },
      {
        path: 'master-search',
        name: 'MasterSearch',
        component: () => import('@/pages/master-search/MasterSearchPage.vue'),
        meta: {
          title: 'Busca mestre',
          breadcrumb: 'Busca mestre',
          breadcrumbParent: 'Utilidades',
          icon: '🔎'
        }
      },
      {
        path: 'administrative-reports',
        alias: ['/commercial-reports'],
        name: 'CommercialReports',
        component: () => import('@/pages/commercial-reports/CommercialReportsPage.vue'),
        meta: {
          title: 'Hubs Administrativos',
          breadcrumb: 'Hubs Administrativos',
          breadcrumbParent: 'Relatórios',
          icon: '📊'
        }
      },
      {
        path: 'reports',
        name: 'ReportsDomainHub',
        component: () => import('@/pages/reports/ReportsDomainHubPage.vue'),
        meta: {
          title: 'Relatórios por Domínio',
          breadcrumb: 'Visão por Domínio',
          breadcrumbParent: 'Relatórios',
          icon: '📈'
        }
      },
      {
        path: 'reports/engine',
        name: 'ReportsEngine',
        component: () => import('@/pages/reports/ReportsEnginePage.vue'),
        meta: {
          title: 'Motor Enterprise de Relatórios',
          breadcrumb: 'Motor Enterprise',
          breadcrumbParent: 'Relatórios',
          icon: '📊'
        }
      },
      {
        path: 'reports/financial',
        name: 'FinancialReports',
        alias: ['/relatorios/financeiros/fluxo-de-caixa'],
        component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
        props: { reportKey: 'cash-flow' },
        meta: {
          title: 'Fluxo de Caixa',
          breadcrumb: 'Fluxo de Caixa',
          breadcrumbParent: 'Relatórios Financeiros',
          icon: '📈'
        }
      },
      {
        path: 'reports/dre',
        name: 'DreReports',
        alias: ['/relatorios/financeiros/dre'],
        component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
        props: { reportKey: 'dre' },
        meta: {
          title: 'DRE - Demonstrativo de Resultados',
          breadcrumb: 'DRE - Demonstrativo de Resultados',
          breadcrumbParent: 'Relatórios Financeiros',
          icon: '💰'
        }
      },
      {
        path: 'reports/accounts',
        name: 'AccountsReports',
        component: () => import('@/pages/reports/FinancialReportsPage.vue'),
        meta: {
          title: 'Contas',
          breadcrumb: 'Contas',
          breadcrumbParent: 'Relatórios',
          icon: '🧾'
        }
      },
      {
        path: 'reports/sales',
        name: 'SalesReports',
        alias: ['/relatorios/atendimentos/comandas-vendas'],
        component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
        props: { reportKey: 'sales-counter-sales' },
        meta: {
          title: 'Comandas/Vendas',
          breadcrumb: 'Comandas/Vendas',
          breadcrumbParent: 'Relatórios de Atendimentos',
          icon: '💸'
        }
      },
      {
        path: 'reports/appointments',
        name: 'AppointmentReports',
        alias: ['/relatorios/atendimentos/agenda'],
        component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
        props: { reportKey: 'appointments' },
        meta: {
          title: 'Agenda',
          breadcrumb: 'Agenda',
          breadcrumbParent: 'Relatórios de Atendimentos',
          icon: '📅'
        }
      },
      {
        path: 'reports/encounters',
        name: 'EncounterReports',
        component: () => import('@/pages/reports/EncounterReportsPage.vue'),
        meta: {
          title: 'Relatórios de Atendimento',
          breadcrumb: 'Relatórios de Atendimento',
          breadcrumbParent: 'Atendimento',
          icon: '🩺'
        }
      },
      {
        path: 'reports/registers',
        name: 'RegisterReports',
        component: () => import('@/pages/reports/RegisterReportsPage.vue'),
        meta: {
          title: 'Relatórios de Cadastros',
          breadcrumb: 'Relatórios de Cadastros',
          breadcrumbParent: 'Cadastros',
          icon: '📋'
        }
      },
      {
        path: 'reports/inventory',
        name: 'InventoryReports',
        alias: ['/relatorios/estoque/estoque'],
        component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
        props: { reportKey: 'inventory-stock' },
        meta: {
          title: 'Estoque',
          breadcrumb: 'Estoque',
          breadcrumbParent: 'Relatórios de Estoque',
          icon: '📦'
        }
      },
      {
        path: 'reports/production',
        name: 'ProductionReports',
        alias: ['/relatorios/atendimentos/producao'],
        component: () => import('@/pages/reports/ReportWorkbenchPage.vue'),
        props: { reportKey: 'production' },
        meta: {
          title: 'Produção',
          breadcrumb: 'Produção',
          breadcrumbParent: 'Relatórios de Atendimentos',
          icon: '🏭'
        }
      },
      {
        path: 'api-client',
        name: 'ApiClient',
        component: () => import('@/pages/api-client/ApiClientPage.vue'),
        meta: {
          title: 'Cliente API',
          breadcrumb: 'Cliente API',
          breadcrumbParent: 'Integrações',
          icon: '🛠️'
        }
      },
      {
        path: 'api-keys',
        name: 'ApiKeys',
        component: () => import('@/pages/api-keys/ApiKeysPage.vue'),
        meta: {
          title: 'Chaves de API',
          breadcrumb: 'Chaves de API',
          breadcrumbParent: 'Integrações',
          icon: '🔐'
        }
      },
      {
        path: 'marketing/sms',
        name: 'MarketingSms',
        component: () => import('@/pages/marketing/MarketingSmsPage.vue'),
        meta: {
          title: 'Envio de SMS Simples',
          breadcrumb: 'Envio de SMS Simples',
          breadcrumbParent: 'Marketing',
          icon: '📱'
        }
      },
      {
        path: 'marketing/campaigns',
        name: 'MarketingCampaigns',
        alias: ['/marketing/campanhas', '/campanhas-de-marketing'],
        component: () => import('@/pages/marketing/MarketingCampaignsPage.vue'),
        meta: {
          title: 'Campanhas de Marketing',
          breadcrumb: 'Campanhas',
          breadcrumbParent: 'Marketing',
          icon: '📣'
        }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/pages/notifications/NotificationsPage.vue'),
        meta: {
          title: 'Campanhas de SMS Marketing',
          breadcrumb: 'Campanhas de SMS Marketing',
          breadcrumbParent: 'Marketing',
          icon: '🔔'
        }
      },
      {
        path: 'marketing/vaccine-email',
        name: 'MarketingVaccineEmail',
        component: () => import('@/pages/marketing/VaccineEmailLayoutPage.vue'),
        meta: {
          title: 'Layout de Email de Vacina',
          breadcrumb: 'Layout de Email de Vacina',
          breadcrumbParent: 'Marketing',
          icon: '📧'
        }
      },
      {
        path: 'marketing/sms-settings',
        name: 'MarketingSmsSettings',
        component: () => import('@/pages/marketing/MarketingSmsSettingsPage.vue'),
        meta: {
          title: 'Configurações de SMS',
          breadcrumb: 'Configurações de SMS',
          breadcrumbParent: 'Marketing',
          icon: '⚙️'
        }
      },
      {
        path: 'notifications/whatsapp',
        name: 'WhatsAppNotifications',
        component: () => import('@/pages/notifications/WhatsAppPage.vue'),
        meta: {
          title: 'WhatsApp Operacional',
          breadcrumb: 'WhatsApp',
          breadcrumbParent: 'Marketing',
          icon: '💬'
        }
      },
      {
        path: 'pix',
        name: 'Pix',
        component: () => import('@/pages/finance/PixPage.vue'),
        meta: {
          title: 'PIX',
          breadcrumb: 'PIX',
          breadcrumbParent: 'Financeiro',
          icon: '💸'
        }
      },
      {
        path: 'cash',
        name: 'Cash',
        alias: ['/cash-register', '/financeiro/gaveta', '/finance/gaveta'],
        component: () => import('@/pages/finance/CashPage.vue'),
        meta: {
          title: 'Gaveta',
          breadcrumb: 'Gaveta',
          breadcrumbParent: 'Financeiro',
          icon: '🧾'
        }
      },
      {
        path: 'payment-methods',
        name: 'PaymentMethods',
        alias: [
          '/financeiro/cadastros/formas-de-pagamento',
          '/financeiro/cadastros/formas-pagamento',
          '/formas-de-pagamento'
        ],
        component: () => import('@/pages/finance/PaymentMethodsPage.vue'),
        meta: {
          title: 'Formas de Pagamento',
          breadcrumb: 'Formas de Pagamento',
          breadcrumbParent: 'Financeiro',
          icon: '💳'
        }
      },
      {
        path: 'banks',
        name: 'Banks',
        alias: ['/financeiro/cadastros/bancos', '/financeiro/bancos', '/bancos'],
        component: () => import('@/pages/finance/BanksPage.vue'),
        meta: {
          title: 'Bancos',
          breadcrumb: 'Bancos',
          breadcrumbParent: 'Financeiro',
          icon: '🏦'
        }
      },
      {
        path: 'cost-centers',
        name: 'CostCenters',
        alias: [
          '/financeiro/cadastros/centros-de-custo',
          '/financeiro/cadastros/centros-custo',
          '/centros-de-custo'
        ],
        component: () => import('@/pages/finance/CostCentersPage.vue'),
        meta: {
          title: 'Centros de Custo',
          breadcrumb: 'Centros de Custo',
          breadcrumbParent: 'Financeiro',
          icon: '📊'
        }
      },
      {
        path: 'cards',
        name: 'Cards',
        alias: [
          '/financeiro/cadastros/cartoes-debito-credito',
          '/financeiro/cadastros/cartoes-debito-e-credito',
          '/cartoes-debito-credito'
        ],
        component: () => import('@/pages/finance/CardsPage.vue'),
        meta: {
          title: 'Cartões Débito/Crédito',
          breadcrumb: 'Cartões Débito/Crédito',
          breadcrumbParent: 'Financeiro',
          icon: '💳'
        }
      },
      {
        path: 'expenses',
        name: 'Expenses',
        alias: [
          '/financeiro/cadastros/custos-e-despesas',
          '/financeiro/cadastros/custos-despesas',
          '/custos-e-despesas'
        ],
        component: () => import('@/pages/finance/ExpensesPage.vue'),
        meta: {
          title: 'Custos e Despesas',
          breadcrumb: 'Custos e Despesas',
          breadcrumbParent: 'Financeiro',
          icon: '🧾'
        }
      },
      {
        path: 'sales',
        name: 'Sales',
        alias: ['/vendas', '/atendimento/vendas', '/atendimento/atendimentos/vendas'],
        component: () => import('@/pages/sales/SalesPage.vue'),
        meta: {
          title: 'Vendas',
          breadcrumb: 'Vendas',
          breadcrumbParent: 'Atendimento',
          icon: '💸'
        }
      },
      { path: 'sales/beta', redirect: '/sales' },
      {
        path: 'counter-sales',
        name: 'CounterSales',
        alias: ['/comandas'],
        component: () => import('@/pages/sales/CounterSalesPage.vue'),
        meta: {
          title: 'Comandas',
          breadcrumb: 'Comandas',
          breadcrumbParent: 'Atendimento',
          icon: '🧾'
        }
      },
      {
        path: 'quotes',
        name: 'Quotes',
        alias: ['/sales/quotes'],
        component: () => import('@/pages/sales/QuotesPage.vue'),
        meta: {
          title: 'Orçamentos',
          breadcrumb: 'Orçamentos',
          breadcrumbParent: 'Atendimento',
          icon: '📝'
        }
      },
      {
        path: 'packages',
        name: 'Packages',
        alias: ['/pacotes', '/atendimento/pacotes', '/atendimento/atendimentos/pacotes'],
        component: () => import('@/pages/sales/PackagesPage.vue'),
        meta: {
          title: 'Pacotes',
          breadcrumb: 'Pacotes',
          breadcrumbParent: 'Atendimento',
          icon: '📦'
        }
      },
      {
        path: 'scheduling',
        redirect: '/appointments'
      },
      {
        path: 'scheduling/legacy',
        name: 'Scheduling',
        component: () => import('@/pages/scheduling/SchedulingListPage.vue'),
        meta: {
          title: 'Agenda Operacional (Legado)',
          breadcrumb: 'Agenda Operacional',
          breadcrumbParent: 'Agenda',
          icon: '📅'
        }
      },
      {
        path: 'scheduling/new',
        redirect: '/appointments/new'
      },
      {
        path: 'scheduling/legacy/new',
        name: 'SchedulingNew',
        component: () => import('@/pages/scheduling/SchedulingFormPage.vue'),
        meta: {
          title: 'Novo Agendamento (Legado)',
          breadcrumb: 'Novo Agendamento',
          breadcrumbParent: 'Agenda Operacional',
          icon: '📅'
        }
      },
      {
        path: 'queue',
        name: 'Queue',
        alias: ['/esteira', '/atendimento/esteira', '/atendimento/atendimentos/esteira'],
        component: () => import('@/pages/scheduling/QueuePage.vue'),
        meta: {
          title: 'Esteira',
          breadcrumb: 'Esteira',
          breadcrumbParent: 'Atendimento',
          icon: '🏥'
        }
      },
      {
        path: 'vaccines-dewormers',
        name: 'VaccinesDewormers',
        component: () => import('@/pages/preventive/VaccinesDewormersPage.vue'),
        meta: {
          title: 'Vacinas e Vermífugos',
          breadcrumb: 'Vacinas e Vermífugos',
          breadcrumbParent: 'Atendimento',
          icon: '💉'
        }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/pages/inventory/InventoryListPage.vue'),
        meta: {
          title: 'Estoque',
          breadcrumb: 'Estoque',
          breadcrumbParent: 'Estoque',
          icon: '📦'
        }
      },
      {
        path: 'inventory/new',
        name: 'InventoryNew',
        component: () => import('@/pages/inventory/InventoryFormPage.vue'),
        meta: {
          title: 'Novo Item',
          breadcrumb: 'Novo Item',
          breadcrumbParent: 'Estoque',
          icon: '📦'
        }
      },
      {
        path: 'inventory/:id',
        name: 'InventoryDetail',
        component: () => import('@/pages/inventory/InventoryDetailPage.vue'),
        meta: {
          title: 'Detalhes do Item',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Estoque',
          icon: '📦'
        }
      },
      {
        path: 'inventory/:id/edit',
        name: 'InventoryEdit',
        component: () => import('@/pages/inventory/InventoryFormPage.vue'),
        meta: {
          title: 'Editar Item',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Estoque',
          icon: '📦'
        }
      },
      {
        path: 'inventory/price-consultation',
        name: 'InventoryPriceConsultation',
        alias: [
          '/consulta-de-precos',
          '/estoque/consulta-de-precos',
          '/estoque/controles/consulta-de-precos'
        ],
        component: () => import('@/pages/inventory/InventoryPriceConsultationPage.vue'),
        meta: {
          title: 'Consulta de Preços',
          breadcrumb: 'Consulta de Preços',
          breadcrumbParent: 'Estoque',
          icon: '🔎'
        }
      },
      {
        path: 'inventory/movements',
        name: 'InventoryMovements',
        alias: [
          '/transacao-no-estoque',
          '/transação-no-estoque',
          '/estoque/transacao-no-estoque',
          '/estoque/controles/transacao-no-estoque'
        ],
        component: () => import('@/pages/inventory/InventoryStockTransactionPage.vue'),
        meta: {
          title: 'Transação no Estoque',
          breadcrumb: 'Transação no Estoque',
          breadcrumbParent: 'Estoque',
          icon: '📥'
        }
      },
      {
        path: 'inventory/pharmacy',
        name: 'InventoryPharmacy',
        alias: [
          '/requisicao-farmacia',
          '/requisicao-a-farmacia',
          '/requisição-à-farmácia',
          '/estoque/requisicao-farmacia',
          '/estoque/controles/requisicao-farmacia'
        ],
        component: () => import('@/pages/inventory/InventoryPharmacyRequestPage.vue'),
        meta: {
          title: 'Requisição à Farmácia',
          breadcrumb: 'Requisição à Farmácia',
          breadcrumbParent: 'Estoque',
          icon: '💊'
        }
      },
      {
        path: 'inventory/audit',
        name: 'InventoryAudit',
        alias: [
          '/auditoria-de-estoque',
          '/auditoria-estoque',
          '/estoque/auditoria-de-estoque',
          '/estoque/controles/auditoria-de-estoque'
        ],
        component: () => import('@/pages/inventory/InventoryAuditPage.vue'),
        meta: {
          title: 'Auditoria de Estoque',
          breadcrumb: 'Auditoria de Estoque',
          breadcrumbParent: 'Estoque',
          icon: '🧾'
        }
      },
      {
        path: 'inventory/price-audit',
        name: 'InventoryPriceAudit',
        alias: [
          '/auditoria-de-precos',
          '/auditoria-de-preços',
          '/auditoria-precos',
          '/estoque/auditoria-de-precos',
          '/estoque/controles/auditoria-de-precos'
        ],
        component: () => import('@/pages/inventory/InventoryPriceAuditPage.vue'),
        meta: {
          title: 'Auditoria de Preços',
          breadcrumb: 'Auditoria de Preços',
          breadcrumbParent: 'Estoque',
          icon: '🏷️'
        }
      },
      {
        path: 'inventory/purchases',
        name: 'InventoryPurchases',
        alias: [
          '/compras',
          '/estoque/compras',
          '/estoque/controles/compras',
          '/compras-estoque',
          '/compras-de-estoque'
        ],
        component: () => import('@/pages/inventory/InventoryPurchasesPage.vue'),
        meta: {
          title: 'Compras',
          breadcrumb: 'Compras',
          breadcrumbParent: 'Estoque',
          icon: '🛒'
        }
      },
      {
        path: 'inventory/purchases/:purchaseId',
        name: 'InventoryPurchaseDetail',
        component: () => import('@/pages/inventory/InventoryPurchaseDetailPage.vue'),
        meta: {
          title: 'Detalhe da compra',
          breadcrumb: 'Detalhe da compra',
          breadcrumbParent: 'Compras',
          icon: '🛒'
        }
      },
      {
        path: 'inventory/price-adjustments',
        name: 'InventoryPriceAdjustments',
        alias: [
          '/reajuste-de-precos',
          '/reajuste-de-preços',
          '/reajuste-precos',
          '/estoque/reajuste-de-precos',
          '/estoque/controles/reajuste-de-precos'
        ],
        component: () => import('@/pages/inventory/InventoryPriceAdjustmentsPage.vue'),
        meta: {
          title: 'Reajuste de Preços',
          breadcrumb: 'Reajuste de Preços',
          breadcrumbParent: 'Estoque',
          icon: '📈'
        }
      },
      {
        path: 'inventory/data-collectors',
        name: 'InventoryDataCollectors',
        alias: [
          '/coletores-de-dados',
          '/coletores',
          '/coletor-de-dados',
          '/estoque/coletores-de-dados',
          '/estoque/controles/coletores-de-dados'
        ],
        component: () => import('@/pages/inventory/InventoryDataCollectorsPage.vue'),
        meta: {
          title: 'Coletores de Dados',
          breadcrumb: 'Coletores de Dados',
          breadcrumbParent: 'Estoque',
          icon: '📟'
        }
      },
      {
        path: 'inventory/transfers',
        name: 'InventoryTransfers',
        alias: [
          '/transferencia-entre-estoques',
          '/transferência-entre-estoques',
          '/transferencia-estoques',
          '/estoque/transferencia-entre-estoques',
          '/estoque/controles/transferencia-entre-estoques'
        ],
        component: () => import('@/pages/inventory/InventoryTransfersPage.vue'),
        meta: {
          title: 'Transferência entre Estoques',
          breadcrumb: 'Transferência entre Estoques',
          breadcrumbParent: 'Estoque',
          icon: '🔄'
        }
      },
      {
        path: 'inventory/nf',
        name: 'InventoryInvoices',
        alias: [
          '/entrada-nota-fiscal',
          '/entrada-de-nota-fiscal',
          '/estoque/entrada-nota-fiscal',
          '/estoque/controles/entrada-nota-fiscal'
        ],
        component: () => import('@/pages/inventory/InventoryInvoicesPage.vue'),
        meta: {
          title: 'Entrada de Nota Fiscal',
          breadcrumb: 'Entrada de Nota Fiscal',
          breadcrumbParent: 'Estoque',
          icon: '🧾'
        }
      },
      {
        path: 'inventory/validity',
        name: 'InventoryValidity',
        alias: [
          '/validade-de-produtos',
          '/validade-produtos',
          '/estoque/validade-de-produtos',
          '/estoque/controles/validade-de-produtos'
        ],
        component: () => import('@/pages/inventory/InventoryValidityPage.vue'),
        meta: {
          title: 'Validade de Produtos',
          breadcrumb: 'Validade de Produtos',
          breadcrumbParent: 'Estoque',
          icon: '📅'
        }
      },
      {
        path: 'tabelas-de-preco',
        name: 'PriceTables',
        alias: [
          '/price-tables',
          '/tabelas-de-preços',
          '/estoque/tabelas-de-preco',
          '/estoque/tabelas-de-preços',
          '/estoque/cadastros/tabelas-de-preco',
          '/estoque/cadastros/tabelas-de-preços'
        ],
        component: () => import('@/pages/inventory/PriceTablesPage.vue'),
        meta: {
          title: 'Tabelas de Preço',
          breadcrumb: 'Tabelas de Preço',
          breadcrumbParent: 'Estoque',
          icon: '🏷️'
        }
      },
      {
        path: 'pontos-de-venda',
        name: 'PointOfSaleSync',
        component: () => import('@/pages/inventory/PointOfSaleSyncPage.vue'),
        meta: {
          title: 'Pontos de venda',
          breadcrumb: 'Pontos de venda',
          breadcrumbParent: 'Estoque',
          icon: '🧾'
        }
      },
      {
        path: 'fiscal',
        name: 'Fiscal',
        component: () => import('@/pages/fiscal/FiscalConfigPage.vue'),
        meta: {
          title: 'Configuração Fiscal',
          breadcrumb: 'Fiscal',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📋'
        }
      },
      {
        path: 'fiscal/icms',
        name: 'FiscalICMS',
        alias: [
          '/icms',
          '/estoque/configuracoes-fiscais/icms',
          '/estoque/configuracoes-fiscais/tabela-icms'
        ],
        component: () => import('@/pages/fiscal/FiscalICMSPage.vue'),
        meta: {
          title: 'Tabela ICMS',
          breadcrumb: 'Tabela ICMS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📊'
        }
      },
      {
        path: 'fiscal/ipi',
        name: 'FiscalIpi',
        alias: [
          '/ipi',
          '/estoque/configuracoes-fiscais/ipi',
          '/estoque/configuracoes-fiscais/tabela-ipi'
        ],
        component: () => import('@/pages/fiscal/FiscalIPIPage.vue'),
        meta: {
          title: 'Tabela IPI',
          breadcrumb: 'Tabela IPI',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🏷️'
        }
      },
      {
        path: 'fiscal/ipi-operacional',
        name: 'FiscalIpiOperacional',
        component: () => import('@/pages/fiscal/FiscalTaxOperationPage.vue'),
        props: { mode: 'ipi' },
        meta: {
          title: 'IPI Operacional',
          breadcrumb: 'IPI Operacional',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🏷️'
        }
      },
      {
        path: 'fiscal/ibs-cbs',
        name: 'FiscalIbsCbs',
        component: () => import('@/pages/fiscal/FiscalIBSCBSPage.vue'),
        alias: [
          '/pacote-ibs-cbs',
          '/ibs-cbs',
          '/estoque/configuracoes-fiscais/ibs-cbs',
          '/estoque/configuracoes-fiscais/tabela-ibs-cbs',
          '/estoque/cadastros/tabelas-ibs-cbs'
        ],
        meta: {
          title: 'Tabela IBS/CBS',
          breadcrumb: 'Tabela IBS/CBS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🧮'
        }
      },
      {
        path: 'fiscal/pis-cofins',
        name: 'FiscalPisCofins',
        component: () => import('@/pages/fiscal/FiscalPisCofinsPage.vue'),
        meta: {
          title: 'PIS / COFINS',
          breadcrumb: 'PIS / COFINS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📈'
        }
      },
      {
        path: 'fiscal/pis',
        name: 'FiscalPis',
        alias: [
          '/pis',
          '/estoque/configuracoes-fiscais/pis',
          '/estoque/configuracoes-fiscais/tabela-pis'
        ],
        component: () => import('@/pages/fiscal/FiscalPISPage.vue'),
        meta: {
          title: 'Tabela PIS',
          breadcrumb: 'Tabela PIS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📈'
        }
      },
      {
        path: 'fiscal/cofins',
        name: 'FiscalCofins',
        alias: [
          '/cofins',
          '/estoque/configuracoes-fiscais/cofins',
          '/estoque/configuracoes-fiscais/tabela-cofins'
        ],
        component: () => import('@/pages/fiscal/FiscalCOFINSPage.vue'),
        meta: {
          title: 'Tabela COFINS',
          breadcrumb: 'Tabela COFINS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📉'
        }
      },
      {
        path: 'fiscal/cfop',
        name: 'FiscalCfop',
        alias: [
          '/cfop',
          '/estoque/configuracoes-fiscais/cfop',
          '/estoque/configuracoes-fiscais/tabela-cfop'
        ],
        component: () => import('@/pages/fiscal/FiscalCfopPage.vue'),
        meta: {
          title: 'Tabela CFOP',
          breadcrumb: 'Tabela CFOP',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🔢'
        }
      },
      {
        path: 'fiscal/nfse',
        name: 'FiscalNFSELayout',
        alias: [
          '/nfse',
          '/estoque/configuracoes-fiscais/nfse',
          '/estoque/configuracoes-fiscais/tabela-nfse'
        ],
        component: () => import('@/pages/fiscal/FiscalNFSELayoutPage.vue'),
        meta: {
          title: 'Tabela NFS-e',
          breadcrumb: 'Tabela NFS-e',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📄'
        }
      },
      {
        path: 'fiscal/ncm',
        name: 'FiscalNcm',
        component: () => import('@/pages/fiscal/FiscalNcmPage.vue'),
        meta: {
          title: 'IBPT / NCM',
          breadcrumb: 'IBPT / NCM',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🏷️'
        }
      },
      {
        path: 'fiscal/icms-matrix',
        name: 'FiscalICMSMatrix',
        alias: [
          '/matriz-icms',
          '/estoque/configuracoes-fiscais/matriz-icms',
          '/estoque/configuracoes-fiscais/matriz-estado-icms'
        ],
        component: () => import('@/pages/fiscal/FiscalICMSMatrixPage.vue'),
        meta: {
          title: 'Matriz Estado ICMS',
          breadcrumb: 'Matriz Estado ICMS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📊'
        }
      },
      {
        path: 'webhooks',
        name: 'Webhooks',
        component: () => import('@/pages/webhooks/WebhooksListPage.vue'),
        alias: ['/webhook', '/cadastro/webhooks', '/cadastros/webhooks'],
        meta: {
          title: 'Webhooks',
          breadcrumb: 'Webhooks',
          breadcrumbParent: 'Cadastros',
          icon: '🔗'
        }
      },
      {
        path: 'webhooks/new',
        name: 'WebhookNew',
        component: () => import('@/pages/webhooks/WebhookFormPage.vue'),
        meta: {
          title: 'Incluir Webhook',
          breadcrumb: 'Incluir Webhook',
          breadcrumbParent: 'Webhooks',
          icon: '🔗'
        }
      },
      {
        path: 'webhooks/:id',
        name: 'WebhookDetail',
        component: () => import('@/pages/webhooks/WebhookDetailPage.vue'),
        meta: {
          title: 'Detalhes do Webhook',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Webhooks',
          icon: '🔗'
        }
      },
      {
        path: 'webhooks/:id/edit',
        name: 'WebhookEdit',
        component: () => import('@/pages/webhooks/WebhookFormPage.vue'),
        meta: {
          title: 'Editar Webhook',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Webhooks',
          icon: '🔗'
        }
      },
      {
        path: 'products',
        name: 'Products',
        alias: [
          '/produtos',
          '/estoque/produtos',
          '/estoque/cadastros/produtos',
          '/cadastros/produtos'
        ],
        component: () => import('@/pages/products/ProductsListPage.vue'),
        meta: {
          title: 'Produtos',
          breadcrumb: 'Produtos',
          breadcrumbParent: 'Cadastros',
          icon: '📦'
        }
      },
      {
        path: 'suppliers',
        name: 'Suppliers',
        alias: [
          '/fornecedores-e-despesas',
          '/fornecedores',
          '/estoque/fornecedores-e-despesas',
          '/estoque/cadastros/fornecedores-e-despesas'
        ],
        component: () => import('@/pages/inventory/SuppliersPage.vue'),
        meta: {
          title: 'Fornecedores e Despesas',
          breadcrumb: 'Fornecedores e Despesas',
          breadcrumbParent: 'Cadastros',
          icon: '🚚'
        }
      },
      {
        path: 'manufacturers',
        name: 'Manufacturers',
        alias: ['/fabricantes', '/estoque/fabricantes', '/estoque/cadastros/fabricantes'],
        component: () => import('@/pages/inventory/ManufacturersPage.vue'),
        meta: {
          title: 'Fabricantes',
          breadcrumb: 'Fabricantes',
          breadcrumbParent: 'Cadastros',
          icon: '🏭'
        }
      },
      {
        path: 'product-groups',
        name: 'ProductGroups',
        alias: [
          '/grupos-de-produto',
          '/grupos-de-produtos',
          '/grupos-produto',
          '/grupos-produtos',
          '/estoque/grupos-de-produto',
          '/estoque/grupos-de-produtos',
          '/estoque/cadastros/grupos-de-produto',
          '/estoque/cadastros/grupos-de-produtos'
        ],
        component: () => import('@/pages/inventory/ProductGroupsPage.vue'),
        meta: {
          title: 'Grupos de Produto',
          breadcrumb: 'Grupos de Produto',
          breadcrumbParent: 'Cadastros',
          icon: '🗂️'
        }
      },
      {
        path: 'company-sectors',
        name: 'CompanySectors',
        alias: [
          '/setores',
          '/setores-da-empresa',
          '/estoque/setores',
          '/estoque/setores-da-empresa',
          '/estoque/cadastros/setores',
          '/estoque/cadastros/setores-da-empresa'
        ],
        component: () => import('@/pages/inventory/CompanySectorsPage.vue'),
        meta: {
          title: 'Setores da Empresa',
          breadcrumb: 'Setores da Empresa',
          breadcrumbParent: 'Cadastros',
          icon: '🏢'
        }
      },
      {
        path: 'measurement-units',
        name: 'MeasurementUnits',
        alias: [
          '/unidades-de-medida',
          '/unidades-medida',
          '/estoque/unidades-de-medida',
          '/estoque/unidades-medida',
          '/estoque/cadastros/unidades-de-medida',
          '/estoque/cadastros/unidades-medida'
        ],
        component: () => import('@/pages/inventory/MeasurementUnitsPage.vue'),
        meta: {
          title: 'Unidades de Medida',
          breadcrumb: 'Unidades de Medida',
          breadcrumbParent: 'Cadastros',
          icon: '📏'
        }
      },
      {
        path: 'warehouses',
        name: 'Warehouses',
        alias: ['/estoques', '/estoque/estoques', '/estoque/cadastros/estoques'],
        component: () => import('@/pages/inventory/WarehousesPage.vue'),
        meta: {
          title: 'Estoques',
          breadcrumb: 'Estoques',
          breadcrumbParent: 'Cadastros',
          icon: '🏬'
        }
      },
      {
        path: 'products/import',
        name: 'ProductsImport',
        alias: [
          '/produtos/importar',
          '/estoque/produtos/importar',
          '/estoque/cadastros/importar-dados-produtos'
        ],
        component: () => import('@/pages/products/ProductsImportPage.vue'),
        meta: {
          title: 'Importar Dados Produtos',
          breadcrumb: 'Importar Dados Produtos',
          breadcrumbParent: 'Produtos',
          icon: '⬆️'
        }
      },
      {
        path: 'products/new',
        name: 'ProductNew',
        alias: ['/produtos/novo', '/estoque/cadastros/produtos/novo'],
        component: () => import('@/pages/products/ProductFormPage.vue'),
        meta: {
          title: 'Novo Produto',
          breadcrumb: 'Novo Produto',
          breadcrumbParent: 'Produtos',
          icon: '📦'
        }
      },
      {
        path: 'products/:id',
        name: 'ProductDetail',
        alias: ['/produtos/:id'],
        component: () => import('@/pages/products/ProductDetailPage.vue'),
        meta: {
          title: 'Detalhes do Produto',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Produtos',
          icon: '📦'
        }
      },
      {
        path: 'products/:id/edit',
        name: 'ProductEdit',
        alias: ['/produtos/:id/editar'],
        component: () => import('@/pages/products/ProductFormPage.vue'),
        meta: {
          title: 'Editar Produto',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Produtos',
          icon: '📦'
        }
      },
      {
        path: 'services',
        name: 'Services',
        component: () => import('@/pages/services/ServicesListPage.vue'),
        meta: {
          title: 'Serviços',
          breadcrumb: 'Serviços',
          breadcrumbParent: 'Cadastros',
          icon: '🛠️'
        }
      },
      {
        path: 'services/new',
        name: 'ServiceNew',
        component: () => import('@/pages/services/ServiceFormPage.vue'),
        meta: {
          title: 'Novo Serviço',
          breadcrumb: 'Novo Serviço',
          breadcrumbParent: 'Serviços',
          icon: '🛠️'
        }
      },
      {
        path: 'services/import',
        name: 'ServicesImport',
        component: () => import('@/pages/services/ServicesImportPage.vue'),
        meta: {
          title: 'Importar Dados Serviços',
          breadcrumb: 'Importar Dados Serviços',
          breadcrumbParent: 'Serviços',
          icon: '⬆️'
        }
      },
      {
        path: 'vetus-imports',
        name: 'VetusAssistedImport',
        alias: [
          '/vetus/importacao-assistida',
          '/importacao-vetus',
          '/atendimento/importacao-vetus'
        ],
        component: () => import('@/pages/imports/VetusAssistedImportPage.vue'),
        meta: {
          title: 'Importação Assistida Vetus',
          breadcrumb: 'Importação Assistida Vetus',
          breadcrumbParent: 'Cadastros',
          icon: '⬆️'
        }
      },
      {
        path: 'responsibility-terms',
        name: 'ResponsibilityTerms',
        alias: ['/termos-de-responsabilidade', '/cadastros/termos-de-responsabilidade'],
        component: () => import('@/pages/responsibility-terms/ResponsibilityTermsListPage.vue'),
        meta: {
          title: 'Termos de Responsabilidade',
          breadcrumb: 'Termos de Responsabilidade',
          breadcrumbParent: 'Cadastros',
          icon: '📄'
        }
      },
      {
        path: 'responsibility-terms/new',
        name: 'ResponsibilityTermNew',
        component: () => import('@/pages/responsibility-terms/ResponsibilityTermFormPage.vue'),
        meta: {
          title: 'Incluir Termo de Responsabilidade',
          breadcrumb: 'Incluir',
          breadcrumbParent: 'Termos de Responsabilidade',
          icon: '📄'
        }
      },
      {
        path: 'responsibility-terms/:id',
        name: 'ResponsibilityTermDetail',
        component: () => import('@/pages/responsibility-terms/ResponsibilityTermDetailPage.vue'),
        meta: {
          title: 'Detalhes do Termo',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Termos de Responsabilidade',
          icon: '📄'
        }
      },
      {
        path: 'responsibility-terms/:id/edit',
        name: 'ResponsibilityTermEdit',
        component: () => import('@/pages/responsibility-terms/ResponsibilityTermFormPage.vue'),
        meta: {
          title: 'Editar Termo de Responsabilidade',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Termos de Responsabilidade',
          icon: '📄'
        }
      },
      {
        path: 'services/:id',
        name: 'ServiceDetail',
        component: () => import('@/pages/services/ServiceDetailPage.vue'),
        meta: {
          title: 'Detalhes do Serviço',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Serviços',
          icon: '🛠️'
        }
      },
      {
        path: 'services/:id/edit',
        name: 'ServiceEdit',
        component: () => import('@/pages/services/ServiceFormPage.vue'),
        meta: {
          title: 'Editar Serviço',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Serviços',
          icon: '🛠️'
        }
      },
      {
        path: 'loyalty',
        name: 'Loyalty',
        alias: ['/fidelidade', '/atendimento/fidelidade'],
        component: () => import('@/pages/loyalty/LoyaltyPage.vue'),
        meta: {
          title: 'Resgate de Pontos',
          breadcrumb: 'Fidelidade',
          breadcrumbParent: 'Atendimento',
          icon: '🎯'
        }
      },
      {
        path: 'staff',
        name: 'Staff',
        component: () => import('@/pages/staff/StaffListPage.vue'),
        meta: {
          title: 'Profissionais',
          breadcrumb: 'Profissionais',
          breadcrumbParent: 'RH',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'staff/new',
        name: 'StaffNew',
        component: () => import('@/pages/staff/StaffFormPage.vue'),
        meta: {
          title: 'Novo Profissional',
          breadcrumb: 'Novo Profissional',
          breadcrumbParent: 'Profissionais',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'staff/:id',
        name: 'StaffDetail',
        component: () => import('@/pages/staff/StaffDetailPage.vue'),
        meta: {
          title: 'Detalhes do Profissional',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Profissionais',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'staff/:id/edit',
        name: 'StaffEdit',
        component: () => import('@/pages/staff/StaffFormPage.vue'),
        meta: {
          title: 'Editar Profissional',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Profissionais',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'commission-rules',
        name: 'CommissionRules',
        component: () => import('@/pages/rh/CommissionRulesPage.vue'),
        meta: {
          title: 'Regras de Comissão',
          breadcrumb: 'Regras de Comissão',
          breadcrumbParent: 'Comissões',
          icon: '📐'
        }
      },
      {
        path: 'commission-calculations',
        name: 'CommissionCalculations',
        component: () => import('@/pages/rh/CommissionCalculationsPage.vue'),
        meta: {
          title: 'Cálculo de Comissões',
          breadcrumb: 'Cálculo de Comissões',
          breadcrumbParent: 'Comissões',
          icon: '🧮'
        }
      },
      {
        path: 'time-off',
        name: 'TimeOff',
        component: () => import('@/pages/rh/TimeOffPage.vue'),
        meta: {
          title: 'Folgas',
          breadcrumb: 'Folgas',
          breadcrumbParent: 'RH',
          icon: '🌴'
        }
      },
      {
        path: 'rh/professions',
        name: 'RhProfessions',
        component: () => import('@/pages/rh/RhProfessionsPage.vue'),
        meta: {
          title: 'Profissões',
          breadcrumb: 'Profissões',
          breadcrumbParent: 'RH',
          icon: '🪪'
        }
      },
      ...reportWorkbenchRoutes,
      ...placeholderRoutes
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: 'Página não encontrada', requiresAuth: false }
  }
];

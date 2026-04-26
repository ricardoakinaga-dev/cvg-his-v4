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
  placeholderRoute('inventory/price-adjustments', 'InventoryPriceAdjustments', 'Reajuste de Preços', 'Estoque', '📈'),
  placeholderRoute('inventory/data-collectors', 'InventoryDataCollectors', 'Coletores de Dados', 'Estoque', '📟'),
  placeholderRoute('finance/split', 'FinanceSplit', 'Split', 'Financeiro', '🧩'),
  placeholderRoute('finance/advance-payments', 'FinanceAdvancePayments', 'Pagamento Antecipado', 'Financeiro', '⏩'),
  placeholderRoute('finance/card-accounts', 'FinanceCardAccounts', 'Contas Adm. Cartão', 'Financeiro', '💳'),
  placeholderRoute('finance/timeline', 'FinanceTimeline', 'Linha do Tempo', 'Financeiro', '🕒'),
  placeholderRoute('finance/card-machines', 'FinanceCardMachines', 'Maquininhas', 'Financeiro', '💳'),
  placeholderRoute('finance/split/simulator', 'FinanceSplitSimulator', 'Simulador de Split', 'Financeiro', '🧮'),
  placeholderRoute('finance/card-transactions', 'FinanceCardTransactions', 'Transações de Cartão', 'Financeiro', '💳'),
  placeholderRoute('finance/split/export', 'FinanceSplitExport', 'Exportador de Split', 'Financeiro', '📤'),
  placeholderRoute('finance/payment-enablement', 'FinancePaymentEnablement', 'Habilitar Pagamento', 'Financeiro', '✅'),
  placeholderRoute('finance/payments-dashboard', 'FinancePaymentsDashboard', 'Pagamento Dashboard', 'Financeiro', '📊'),
  placeholderRoute('marketing/sms', 'MarketingSms', 'SMS', 'Marketing', '📱'),
  placeholderRoute('marketing/vaccine-email', 'MarketingVaccineEmail', 'Email de Vacina', 'Marketing', '📧'),
  placeholderRoute('marketing/sms-settings', 'MarketingSmsSettings', 'Configurações de SMS', 'Marketing', '⚙️'),
  placeholderRoute('rh/professions', 'RhProfessions', 'Profissões', 'RH', '🪪'),
  placeholderRoute('administration/settings', 'AdministrationSettings', 'Configurações', 'Administração', '⚙️'),
  placeholderRoute('dashboards/multifilial', 'DashboardMultibranch', 'Dashboard Multifilial', 'Financeiro', '🏢'),
  placeholderRoute('dashboards/curve-abc-clients', 'DashboardCurveAbcClients', 'Curva ABC Clientes', 'Financeiro', '📊'),
  placeholderRoute('products/import', 'ProductsImport', 'Importar Dados Produtos', 'Estoque', '⬆️'),
  placeholderRoute('company-sectors', 'CompanySectors', 'Setores da Empresa', 'Estoque', '🏢'),
  placeholderRoute('measurement-units', 'MeasurementUnits', 'Unidades de Medida', 'Estoque', '📏'),
  placeholderRoute('reports/audit/appointments', 'ReportsAuditAppointments', 'Auditoria de Agendamentos', 'Relatórios', '🧾'),
  placeholderRoute('reports/cash-drawer', 'ReportsCashDrawer', 'Gaveta', 'Relatórios Financeiros', '🧾'),
  placeholderRoute('reports/packages', 'ReportsPackages', 'Pacotes', 'Relatórios Financeiros', '📦'),
  placeholderRoute('reports/accounts-receivable', 'ReportsAccountsReceivable', 'Contas a Receber', 'Relatórios Financeiros', '💵'),
  placeholderRoute('reports/received-accounts', 'ReportsReceivedAccounts', 'Contas Recebidas', 'Relatórios Financeiros', '✅'),
  placeholderRoute('reports/accounts-payable', 'ReportsAccountsPayable', 'Contas a Pagar', 'Relatórios Financeiros', '💸'),
  placeholderRoute('reports/paid-accounts', 'ReportsPaidAccounts', 'Contas Pagas', 'Relatórios Financeiros', '✅'),
  placeholderRoute('reports/cheques', 'ReportsCheques', 'Cheques', 'Relatórios Financeiros', '📄'),
  placeholderRoute('reports/advance-payments', 'ReportsAdvancePayments', 'Pagamento Antecipado', 'Relatórios Financeiros', '⏩'),
  placeholderRoute('reports/produced-items', 'ReportsProducedItems', 'Produtos/Serviços Produzidos', 'Relatórios de Atendimentos', '🛠️'),
  placeholderRoute('reports/professional-care', 'ReportsProfessionalCare', 'Atendimento por Profissional', 'Relatórios de Atendimentos', '🩺'),
  placeholderRoute('reports/registers/services', 'ReportsRegisterServices', 'Serviços', 'Relatórios de Cadastros', '🛠️'),
  placeholderRoute('reports/registers/owners', 'ReportsRegisterOwners', 'Clientes', 'Relatórios de Cadastros', '👤'),
  placeholderRoute('reports/registers/patients', 'ReportsRegisterPatients', 'Animais', 'Relatórios de Cadastros', '🐾'),
  placeholderRoute('reports/registers/suppliers', 'ReportsRegisterSuppliers', 'Fornecedores', 'Relatórios de Cadastros', '🚚'),
  placeholderRoute('reports/deleted-sales-counter-sales', 'ReportsDeletedSalesCounterSales', 'Exclusão de Vendas e Comandas', 'Relatórios de Cadastros', '🧾'),
  placeholderRoute('reports/inventory-movements', 'ReportsInventoryMovements', 'Movimentações no Estoque', 'Relatórios de Estoque', '📥'),
  placeholderRoute('reports/inventory-invoices', 'ReportsInventoryInvoices', 'Entrada de NF', 'Relatórios de Estoque', '🧾'),
  placeholderRoute('reports/inventory-products', 'ReportsInventoryProducts', 'Relatório de Produtos', 'Relatórios de Estoque', '🏷️')
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
        component: () => import('@/pages/reports/FinancialReportsPage.vue'),
        meta: {
          title: 'Dashboard Financeiro',
          breadcrumb: 'Financeiro',
          breadcrumbParent: 'Financeiro',
          icon: '💰'
        }
      },
      {
        path: 'dashboards/curve-abc',
        name: 'DashboardCurveAbc',
        component: () => import('@/pages/commercial-reports/CommercialReportsPage.vue'),
        meta: {
          title: 'Curva ABC',
          breadcrumb: 'Curva ABC',
          breadcrumbParent: 'Financeiro',
          icon: '📈'
        }
      },
      {
        path: 'owners',
        name: 'Owners',
        component: () => import('@/pages/owners/OwnersListPage.vue'),
        meta: { title: 'Clientes', breadcrumb: 'Clientes', breadcrumbParent: 'Cadastros', icon: '👤' }
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
        alias: ['/racas', '/raças', '/cadastros/racas', '/cadastros/raças', '/cadastro/racas', '/cadastro/raças'],
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
        alias: ['/especies', '/espécies', '/cadastros/especies', '/cadastros/espécies', '/cadastro/especies', '/cadastro/espécies'],
        component: () => import('@/pages/species/SpeciesListPage.vue'),
        meta: { title: 'Espécies', breadcrumb: 'Espécies', breadcrumbParent: 'Cadastros', icon: '🦴' }
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
        meta: { title: 'Cores/Pelagens', breadcrumb: 'Cores/Pelagens', breadcrumbParent: 'Cadastros', icon: '🎨' }
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
        alias: ['/grupos-de-clientes', '/cadastros/grupos-de-clientes', '/cadastro/grupos-de-clientes'],
        component: () => import('@/pages/customer-groups/CustomerGroupsListPage.vue'),
        meta: { title: 'Grupos de Clientes', breadcrumb: 'Grupos de Clientes', breadcrumbParent: 'Cadastros', icon: '👥' }
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
        path: 'appointments',
        name: 'Appointments',
        component: () => import('@/pages/appointments/AppointmentsListPage.vue'),
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
        alias: ['/hemogramas', '/laboratorio/hemogramas', '/laboratorio/atendimentos/hemogramas', '/laboratorio/exames/hemogramas'],
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
        alias: ['/urina', '/urinanalise', '/urinálise', '/laboratorio/urina', '/laboratorio/atendimentos/urina', '/laboratorio/exames/urina'],
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
        alias: ['/bioquimico', '/bioquímico', '/laboratorio/bioquimico', '/laboratorio/bioquímico', '/laboratorio/atendimentos/bioquimico', '/laboratorio/exames/bioquimico'],
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
        alias: ['/equipamentos', '/laboratorio/equipamentos', '/laboratorio/cadastros/equipamentos'],
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
        alias: ['/tipos-de-laudo', '/laboratorio/tipos-de-laudo', '/laboratorio/cadastros/tipos-de-laudo'],
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
        alias: ['/vlr-ref-hemograma', '/laboratorio/vlr-ref-hemograma', '/laboratorio/cadastros/vlr-ref-hemograma'],
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
        component: () => import('@/pages/laboratory/LaboratoryHemogramReferenceValueDetailPage.vue'),
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
        alias: ['/vlr-ref-bioquimico', '/laboratorio/vlr-ref-bioquimico', '/laboratorio/cadastros/vlr-ref-bioquimico'],
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
        component: () => import('@/pages/laboratory/LaboratoryBiochemistryReferenceValueFormPage.vue'),
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
        component: () => import('@/pages/laboratory/LaboratoryBiochemistryReferenceValueDetailPage.vue'),
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
        component: () => import('@/pages/laboratory/LaboratoryBiochemistryReferenceValueFormPage.vue'),
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
        alias: ['/boxes-de-internacao', '/cadastros/boxes-de-internacao', '/cadastro/boxes-de-internacao'],
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
        component: () => import('@/pages/finance/FinanceOperationPage.vue'),
        props: { mode: 'accounts-payable' },
        meta: {
          title: 'Contas a Pagar',
          breadcrumb: 'Contas a Pagar',
          breadcrumbParent: 'Financeiro',
          icon: '💸'
        }
      },
      {
        path: 'finance/cash-flow',
        name: 'FinanceCashFlow',
        component: () => import('@/pages/finance/FinanceOperationPage.vue'),
        props: { mode: 'cash-flow' },
        meta: {
          title: 'Fluxo de Caixa',
          breadcrumb: 'Fluxo de Caixa',
          breadcrumbParent: 'Financeiro',
          icon: '📈'
        }
      },
      {
        path: 'finance/cheques',
        name: 'FinanceCheques',
        component: () => import('@/pages/finance/FinanceOperationPage.vue'),
        props: { mode: 'cheques' },
        meta: {
          title: 'Cheques',
          breadcrumb: 'Cheques',
          breadcrumbParent: 'Financeiro',
          icon: '📄'
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
        path: 'reports/financial',
        name: 'FinancialReports',
        component: () => import('@/pages/reports/FinancialReportsPage.vue'),
        meta: {
          title: 'Relatórios Financeiros',
          breadcrumb: 'Relatórios Financeiros',
          breadcrumbParent: 'Financeiro',
          icon: '💰'
        }
      },
      {
        path: 'reports/dre',
        name: 'DreReports',
        component: () => import('@/pages/reports/FinancialReportsPage.vue'),
        meta: {
          title: 'DRE',
          breadcrumb: 'DRE',
          breadcrumbParent: 'Relatórios',
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
        component: () => import('@/pages/commercial-reports/CommercialReportsPage.vue'),
        meta: {
          title: 'Vendas',
          breadcrumb: 'Vendas',
          breadcrumbParent: 'Relatórios',
          icon: '💸'
        }
      },
      {
        path: 'reports/appointments',
        name: 'AppointmentReports',
        component: () => import('@/pages/reports/AppointmentReportsPage.vue'),
        meta: {
          title: 'Relatórios de Agenda',
          breadcrumb: 'Relatórios de Agenda',
          breadcrumbParent: 'Agenda',
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
        component: () => import('@/pages/reports/InventoryReportsPage.vue'),
        meta: {
          title: 'Relatórios de Estoque',
          breadcrumb: 'Relatórios de Estoque',
          breadcrumbParent: 'Estoque',
          icon: '📦'
        }
      },
      {
        path: 'reports/nf',
        name: 'ReportInvoices',
        component: () => import('@/pages/reports/InvoiceReportsPage.vue'),
        meta: {
          title: 'NF',
          breadcrumb: 'NF',
          breadcrumbParent: 'Relatórios',
          icon: '🧾'
        }
      },
      {
        path: 'reports/production',
        name: 'ProductionReports',
        component: () => import('@/pages/reports/ProductionReportsPage.vue'),
        meta: {
          title: 'Relatórios de Produção',
          breadcrumb: 'Relatórios de Produção',
          breadcrumbParent: 'Produção',
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
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/pages/notifications/NotificationsPage.vue'),
        meta: {
          title: 'Campanhas',
          breadcrumb: 'Campanhas',
          breadcrumbParent: 'Marketing',
          icon: '🔔'
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
        alias: ['/cash-register'],
        component: () => import('@/pages/finance/CashPage.vue'),
        meta: {
          title: 'Caixa',
          breadcrumb: 'Caixa',
          breadcrumbParent: 'Financeiro',
          icon: '🧾'
        }
      },
      {
        path: 'payment-methods',
        name: 'PaymentMethods',
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
        component: () => import('@/pages/finance/CardsPage.vue'),
        meta: {
          title: 'Cartões',
          breadcrumb: 'Cartões',
          breadcrumbParent: 'Financeiro',
          icon: '💳'
        }
      },
      {
        path: 'expenses',
        name: 'Expenses',
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
        alias: ['/vendas', '/atendimento/vendas'],
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
        alias: ['/pacotes', '/atendimento/pacotes'],
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
        alias: ['/consulta-de-precos', '/estoque/consulta-de-precos', '/estoque/controles/consulta-de-precos'],
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
        component: () => import('@/pages/fiscal/FiscalICMSPage.vue'),
        meta: {
          title: 'ICMS',
          breadcrumb: 'ICMS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📊'
        }
      },
      {
        path: 'fiscal/ipi',
        name: 'FiscalIpi',
        component: () => import('@/pages/fiscal/FiscalTaxOperationPage.vue'),
        props: { mode: 'ipi' },
        meta: {
          title: 'IPI',
          breadcrumb: 'IPI',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🏷️'
        }
      },
      {
        path: 'fiscal/ibs-cbs',
        name: 'FiscalIbsCbs',
        component: () => import('@/pages/fiscal/FiscalTaxOperationPage.vue'),
        props: { mode: 'ibs-cbs' },
        meta: {
          title: 'IBS/CBS',
          breadcrumb: 'IBS/CBS',
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
        component: () => import('@/pages/fiscal/FiscalPisCofinsPage.vue'),
        meta: {
          title: 'PIS',
          breadcrumb: 'PIS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📈'
        }
      },
      {
        path: 'fiscal/cofins',
        name: 'FiscalCofins',
        component: () => import('@/pages/fiscal/FiscalPisCofinsPage.vue'),
        meta: {
          title: 'COFINS',
          breadcrumb: 'COFINS',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '📉'
        }
      },
      {
        path: 'fiscal/cfop',
        name: 'FiscalCfop',
        component: () => import('@/pages/fiscal/FiscalCfopPage.vue'),
        meta: {
          title: 'CFOP',
          breadcrumb: 'CFOP',
          breadcrumbParent: 'Configurações Fiscais',
          icon: '🔢'
        }
      },
      {
        path: 'fiscal/nfse',
        name: 'FiscalNFSELayout',
        component: () => import('@/pages/fiscal/FiscalNFSELayoutPage.vue'),
        meta: {
          title: 'NFS-e',
          breadcrumb: 'NFS-e',
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
        component: () => import('@/pages/fiscal/FiscalICMSMatrixPage.vue'),
        meta: {
          title: 'Matriz ICMS',
          breadcrumb: 'Matriz ICMS',
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
        component: () => import('@/pages/products/ProductsListPage.vue'),
        meta: {
          title: 'Produtos',
          breadcrumb: 'Produtos',
          breadcrumbParent: 'Estoque',
          icon: '📦'
        }
      },
      {
        path: 'suppliers',
        name: 'Suppliers',
        component: () => import('@/pages/inventory/SuppliersPage.vue'),
        meta: {
          title: 'Fornecedores',
          breadcrumb: 'Fornecedores',
          breadcrumbParent: 'Cadastros',
          icon: '🚚'
        }
      },
      {
        path: 'manufacturers',
        name: 'Manufacturers',
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
        component: () => import('@/pages/inventory/ProductGroupsPage.vue'),
        meta: {
          title: 'Grupos de Produto',
          breadcrumb: 'Grupos de Produto',
          breadcrumbParent: 'Cadastros',
          icon: '🗂️'
        }
      },
      {
        path: 'warehouses',
        name: 'Warehouses',
        component: () => import('@/pages/inventory/WarehousesPage.vue'),
        meta: {
          title: 'Estoques',
          breadcrumb: 'Estoques',
          breadcrumbParent: 'Cadastros',
          icon: '🏬'
        }
      },
      {
        path: 'products/new',
        name: 'ProductNew',
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

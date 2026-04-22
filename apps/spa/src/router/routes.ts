import type { RouteRecordRaw } from 'vue-router';

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
        meta: { title: 'Dashboard', breadcrumb: 'Dashboard', icon: '📊' }
      },
      {
        path: 'owners',
        name: 'Owners',
        component: () => import('@/pages/owners/OwnersListPage.vue'),
        meta: { title: 'Tutores', breadcrumb: 'Tutores', breadcrumbParent: 'Cadastros', icon: '👤' }
      },
      {
        path: 'owners/new',
        name: 'OwnerNew',
        component: () => import('@/pages/owners/OwnerFormPage.vue'),
        meta: {
          title: 'Novo Tutor',
          breadcrumb: 'Novo Tutor',
          breadcrumbParent: 'Tutores',
          icon: '👤'
        }
      },
      {
        path: 'owners/:id',
        name: 'OwnerDetail',
        component: () => import('@/pages/owners/OwnerDetailPage.vue'),
        meta: {
          title: 'Detalhes do Tutor',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Tutores',
          icon: '👤'
        }
      },
      {
        path: 'owners/:id/edit',
        name: 'OwnerEdit',
        component: () => import('@/pages/owners/OwnerFormPage.vue'),
        meta: {
          title: 'Editar Tutor',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Tutores',
          icon: '👤'
        }
      },
      {
        path: 'patients',
        name: 'Patients',
        component: () => import('@/pages/patients/PatientsListPage.vue'),
        meta: {
          title: 'Pacientes',
          breadcrumb: 'Pacientes',
          breadcrumbParent: 'Cadastros',
          icon: '🐾'
        }
      },
      {
        path: 'patients/new',
        name: 'PatientNew',
        component: () => import('@/pages/patients/PatientFormPage.vue'),
        meta: {
          title: 'Novo Paciente',
          breadcrumb: 'Novo Paciente',
          breadcrumbParent: 'Pacientes',
          icon: '🐾'
        }
      },
      {
        path: 'patients/:id',
        name: 'PatientDetail',
        component: () => import('@/pages/patients/PatientDetailPage.vue'),
        meta: {
          title: 'Detalhes do Paciente',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Pacientes',
          icon: '🐾'
        }
      },
      {
        path: 'patients/:id/edit',
        name: 'PatientEdit',
        component: () => import('@/pages/patients/PatientFormPage.vue'),
        meta: {
          title: 'Editar Paciente',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Pacientes',
          icon: '🐾'
        }
      },
      {
        path: 'encounters',
        name: 'Encounters',
        component: () => import('@/pages/encounters/EncountersListPage.vue'),
        meta: {
          title: 'Atendimentos',
          breadcrumb: 'Atendimentos',
          breadcrumbParent: 'Atendimentos',
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
        meta: { title: 'Agenda', breadcrumb: 'Agenda', breadcrumbParent: 'Atendimentos', icon: '📅' }
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
          breadcrumbParent: 'Atendimentos',
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
        component: () => import('@/pages/laboratory/LaboratoryOrdersPage.vue'),
        meta: {
          title: 'Pedidos de Exame',
          breadcrumb: 'Pedidos de Exame',
          breadcrumbParent: 'Laboratório',
          icon: '🧪'
        }
      },
      {
        path: 'laboratory/results',
        name: 'LaboratoryResults',
        component: () => import('@/pages/laboratory/LaboratoryResultsPage.vue'),
        meta: {
          title: 'Resultados',
          breadcrumb: 'Resultados',
          breadcrumbParent: 'Laboratório',
          icon: '📋'
        }
      },
      {
        path: 'laboratory/equipment',
        name: 'LaboratoryEquipment',
        component: () => import('@/pages/laboratory/LaboratoryEquipmentPage.vue'),
        meta: {
          title: 'Equipamentos',
          breadcrumb: 'Equipamentos',
          breadcrumbParent: 'Laboratório',
          icon: '🔧'
        }
      },
      {
        path: 'laboratory/report-types',
        name: 'LaboratoryReportTypes',
        component: () => import('@/pages/laboratory/LaboratoryReportTypesPage.vue'),
        meta: {
          title: 'Tipos de Laudo',
          breadcrumb: 'Tipos de Laudo',
          breadcrumbParent: 'Laboratório',
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
        path: 'prescriptions',
        name: 'Prescriptions',
        component: () => import('@/pages/clinical/PrescriptionsPage.vue'),
        meta: {
          title: 'Prescrições',
          breadcrumb: 'Prescrições',
          breadcrumbParent: 'Atendimentos',
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
          breadcrumbParent: 'Atendimentos',
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
          breadcrumbParent: 'Atendimentos',
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
        component: () => import('@/pages/inpatient/BedsPage.vue'),
        meta: {
          title: 'Leitos',
          breadcrumb: 'Leitos',
          breadcrumbParent: 'Internação',
          icon: '🛏️'
        }
      },
      {
        path: 'billing',
        name: 'Billing',
        component: () => import('@/pages/billing/BillingListPage.vue'),
        meta: {
          title: 'Faturamento',
          breadcrumb: 'Faturamento',
          breadcrumbParent: 'Controles',
          icon: '💰'
        }
      },
      {
        path: 'billing/:id',
        name: 'BillingDetail',
        component: () => import('@/pages/billing/BillingDetailPage.vue'),
        meta: {
          title: 'Detalhes do Faturamento',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Faturamento',
          icon: '💰'
        }
      },
      {
        path: 'triage',
        name: 'Triage',
        component: () => import('@/pages/triage/TriageListPage.vue'),
        meta: {
          title: 'Triagem',
          breadcrumb: 'Triagem',
          breadcrumbParent: 'Atendimentos',
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
          breadcrumbParent: 'Usuários',
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
          title: 'Governança de Acesso',
          breadcrumb: 'Governança de Acesso',
          breadcrumbParent: 'Governança',
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
          title: 'Central de Notificações',
          breadcrumb: 'Central de Notificações',
          breadcrumbParent: 'Comunicação',
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
          breadcrumbParent: 'Notificações',
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
          breadcrumbParent: 'Maquininha de Cartão',
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
          breadcrumbParent: 'Gaveta',
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
          breadcrumbParent: 'Cadastros',
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
          breadcrumbParent: 'Cadastros',
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
          breadcrumbParent: 'Cadastros',
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
          breadcrumbParent: 'Cadastros',
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
          breadcrumbParent: 'Cadastros',
          icon: '🧾'
        }
      },
      {
        path: 'counter-sales',
        name: 'CounterSales',
        alias: ['/comandas'],
        component: () => import('@/pages/sales/CounterSalesPage.vue'),
        meta: {
          title: 'Comandas',
          breadcrumb: 'Comandas',
          breadcrumbParent: 'Atendimentos',
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
          breadcrumbParent: 'Controles',
          icon: '📝'
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
          title: 'Fila Operacional',
          breadcrumb: 'Fila Operacional',
          breadcrumbParent: 'Atendimentos',
          icon: '🏥'
        }
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/pages/inventory/InventoryListPage.vue'),
        meta: {
          title: 'Estoque',
          breadcrumb: 'Estoque',
          breadcrumbParent: 'Controles',
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
          breadcrumbParent: 'Controles',
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
          breadcrumbParent: 'Controles',
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
          breadcrumbParent: 'Controles',
          icon: '📦'
        }
      },
      {
        path: 'inventory/movements',
        name: 'InventoryMovements',
        component: () => import('@/pages/inventory/InventoryMovementsPage.vue'),
        meta: {
          title: 'Movimentações',
          breadcrumb: 'Movimentações',
          breadcrumbParent: 'Controles',
          icon: '📥'
        }
      },
      {
        path: 'inventory/validity',
        name: 'InventoryValidity',
        component: () => import('@/pages/inventory/InventoryValidityPage.vue'),
        meta: {
          title: 'Validade e Lotes',
          breadcrumb: 'Validade de Produtos',
          breadcrumbParent: 'Controles',
          icon: '📅'
        }
      },
      {
        path: 'fiscal',
        name: 'Fiscal',
        component: () => import('@/pages/fiscal/FiscalConfigPage.vue'),
        meta: {
          title: 'Fiscal',
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
        meta: {
          title: 'Webhooks',
          breadcrumb: 'Webhooks',
          breadcrumbParent: 'Dashboard',
          icon: '🔗'
        }
      },
      {
        path: 'webhooks/new',
        name: 'WebhookNew',
        component: () => import('@/pages/webhooks/WebhookFormPage.vue'),
        meta: {
          title: 'Novo Webhook',
          breadcrumb: 'Novo Webhook',
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
          breadcrumbParent: 'Cadastrados',
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
          breadcrumbParent: 'Cadastrados',
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
          breadcrumbParent: 'Cadastrados',
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
          breadcrumbParent: 'Cadastrados',
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
          breadcrumbParent: 'Cadastrados',
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
        path: 'staff',
        name: 'Staff',
        component: () => import('@/pages/staff/StaffListPage.vue'),
        meta: {
          title: 'Equipe',
          breadcrumb: 'Equipe',
          breadcrumbParent: 'Usuários',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'staff/new',
        name: 'StaffNew',
        component: () => import('@/pages/staff/StaffFormPage.vue'),
        meta: {
          title: 'Novo Membro',
          breadcrumb: 'Novo Membro',
          breadcrumbParent: 'Equipe',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'staff/:id',
        name: 'StaffDetail',
        component: () => import('@/pages/staff/StaffDetailPage.vue'),
        meta: {
          title: 'Detalhes do Membro',
          breadcrumb: 'Detalhes',
          breadcrumbParent: 'Equipe',
          icon: '👨‍⚕️'
        }
      },
      {
        path: 'staff/:id/edit',
        name: 'StaffEdit',
        component: () => import('@/pages/staff/StaffFormPage.vue'),
        meta: {
          title: 'Editar Membro',
          breadcrumb: 'Editar',
          breadcrumbParent: 'Equipe',
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
          breadcrumbParent: 'Cadastros',
          icon: '🌴'
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: 'Página não encontrada', requiresAuth: false }
  }
];

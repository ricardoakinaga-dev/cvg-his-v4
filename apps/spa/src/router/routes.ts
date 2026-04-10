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
        meta: { title: 'Tutores', breadcrumb: 'Tutores', breadcrumbParent: 'Dashboard', icon: '👤' }
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
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
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
        meta: { title: 'Agenda', breadcrumb: 'Agenda', breadcrumbParent: 'Dashboard', icon: '📅' }
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
          breadcrumbParent: 'Dashboard',
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
          title: 'Diagnósticos',
          breadcrumb: 'Diagnósticos',
          breadcrumbParent: 'Dashboard',
          icon: '🧪'
        }
      },
      {
        path: 'prescriptions',
        name: 'Prescriptions',
        component: () => import('@/pages/clinical/PrescriptionsPage.vue'),
        meta: {
          title: 'Prescrições',
          breadcrumb: 'Prescrições',
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
          icon: '🏠'
        }
      },
      {
        path: 'surgery',
        name: 'Surgery',
        component: () => import('@/pages/clinical/SurgeryPage.vue'),
        meta: {
          title: 'Cirurgias',
          breadcrumb: 'Cirurgias',
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
          icon: '🛏️'
        }
      },
      {
        path: 'inpatient/board',
        name: 'BedBoard',
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
        path: 'billing',
        name: 'Billing',
        component: () => import('@/pages/billing/BillingListPage.vue'),
        meta: {
          title: 'Faturamento',
          breadcrumb: 'Faturamento',
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
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
        path: 'api-keys',
        name: 'ApiKeys',
        component: () => import('@/pages/api-keys/ApiKeysPage.vue'),
        meta: {
          title: 'Chaves de API',
          breadcrumb: 'Chaves de API',
          breadcrumbParent: 'Dashboard',
          icon: '🔐'
        }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/pages/notifications/NotificationsPage.vue'),
        meta: {
          title: 'Notificações',
          breadcrumb: 'Notificações',
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
          icon: '💸'
        }
      },
      {
        path: 'cash',
        name: 'Cash',
        component: () => import('@/pages/finance/CashPage.vue'),
        meta: {
          title: 'Caixa',
          breadcrumb: 'Caixa',
          breadcrumbParent: 'Dashboard',
          icon: '🧾'
        }
      },
      {
        path: 'counter-sales',
        name: 'CounterSales',
        component: () => import('@/pages/sales/CounterSalesPage.vue'),
        meta: {
          title: 'Vendas Assistidas',
          breadcrumb: 'Vendas',
          breadcrumbParent: 'Dashboard',
          icon: '🛒'
        }
      },
      {
        path: 'quotes',
        name: 'Quotes',
        component: () => import('@/pages/sales/QuotesPage.vue'),
        meta: {
          title: 'Orçamentos',
          breadcrumb: 'Orçamentos',
          breadcrumbParent: 'Dashboard',
          icon: '📝'
        }
      },
      {
        path: 'scheduling',
        name: 'Scheduling',
        component: () => import('@/pages/scheduling/SchedulingListPage.vue'),
        meta: {
          title: 'Agenda Operacional',
          breadcrumb: 'Agenda Operacional',
          breadcrumbParent: 'Dashboard',
          icon: '📅'
        }
      },
      {
        path: 'scheduling/new',
        name: 'SchedulingNew',
        component: () => import('@/pages/scheduling/SchedulingFormPage.vue'),
        meta: {
          title: 'Novo Agendamento',
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
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
          icon: '📦'
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
          breadcrumbParent: 'Dashboard',
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
          breadcrumbParent: 'Dashboard',
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

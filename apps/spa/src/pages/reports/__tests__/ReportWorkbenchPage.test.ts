import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReportWorkbenchPage from '../ReportWorkbenchPage.vue';
import { auditService } from '@/services/audit';
import { administrativeReportsService } from '@/services/administrativeReports';
import { appointmentService } from '@/services/appointment';
import {
  financialPayablesService,
  type FinancialPayableRecord
} from '@/services/financialPayables';
import { financialReceivablesService } from '@/services/financialReceivables';
import { inventoryService } from '@/services/inventory';
import { ownerService } from '@/services/owner';
import { packagesService, type CustomerPackageDetail } from '@/services/packages';
import { patientService } from '@/services/patient';
import { reportsService, type ReportExecutionDetail } from '@/services/reports';
import { servicesService, type ServiceSummary } from '@/services/services';
import type { AdministrativeReportsResponse } from '@/services/administrativeReports';
import type { AppointmentSummary } from '@/types/appointment';
import type {
  InventoryConsumptionSummary,
  InventoryItemSummary,
  InventoryLotSummary
} from '@/types/inventory';
import type { OwnerSummary } from '@/types/owner';
import type { PatientSummary } from '@/types/patient';
import type { FinancialReceivableListItem } from '@/types/financialReceivables';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';

vi.mock('@/services/administrativeReports', () => ({
  administrativeReportsService: {
    getHubs: vi.fn()
  }
}));

vi.mock('@/services/audit', () => ({
  auditService: {
    listEvents: vi.fn()
  }
}));

vi.mock('@/services/appointment', () => ({
  appointmentService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/financialPayables', () => ({
  financialPayablesService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/financialReceivables', () => ({
  financialReceivablesService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/inventory', () => ({
  inventoryService: {
    list: vi.fn(),
    listConsumptions: vi.fn(),
    listLots: vi.fn()
  }
}));

vi.mock('@/services/services', () => ({
  servicesService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/owner', () => ({
  ownerService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/patient', () => ({
  patientService: {
    list: vi.fn()
  }
}));

vi.mock('@/services/packages', () => ({ packagesService: { list: vi.fn() } }));

vi.mock('@/services/reports', () => ({
  reportsService: {
    execute: vi.fn(),
    exportExecution: vi.fn()
  }
}));

const customerPackage: CustomerPackageDetail = {
  id: 'package-1', accountId: 'account-1', ownerId: 'owner-1', patientId: null,
  number: 'PKG-0042', status: 'active', startsAt: '2026-04-28T12:00:00Z', expiresAt: null,
  notes: null, createdByUserId: 'user-1', renewedFromPackageId: null,
  createdAt: '2026-04-28T12:00:00Z', updatedAt: '2026-04-28T12:00:00Z',
  activatedAt: '2026-04-28T12:00:00Z', cancelledAt: null, completedAt: null,
  items: [{ id: 'item-1', accountId: 'account-1', packageId: 'package-1', itemKind: 'service',
    catalogItemId: null, nameSnapshot: 'Consulta', quantityPurchased: 5, quantityConsumed: 2,
    unitPrice: 100, validFrom: null, validUntil: null, createdAt: '2026-04-28T12:00:00Z', updatedAt: '2026-04-28T12:00:00Z' }],
  consumptions: [], balance: [{ packageItemId: 'item-1', itemKind: 'service', nameSnapshot: 'Consulta',
    quantityPurchased: 5, quantityConsumed: 2, quantityAvailable: 3, validUntil: null }]
};

const report = {
  generatedAt: '2026-04-28T00:00:00.000Z',
  filters: { dateFrom: null, dateTo: null },
  executive: {
    outstandingReceivables: 250,
    pixAttentionCount: 1,
    quotePipelineAmount: 300,
    commercialRevenue: 1200,
    openCashBalance: 500,
    fiscalCoverageScore: 80
  },
  domains: {
    financial: {
      billing: {
        totalRecords: 2,
        draftCount: 0,
        estimatedCount: 0,
        openCount: 1,
        settledCount: 1,
        grossAmount: 1200
      },
      receivables: {
        openCount: 1,
        currentCount: 1,
        overdueCount: 0,
        totalOutstanding: 250,
        currentAmount: 250,
        overdueAmount: 0,
        topOpenReceivables: [
          {
            receivableId: 'rec-1',
            encounterId: 'enc-1',
            installmentLabel: '1/1',
            patientName: 'Paciente Teste',
            ownerName: 'Tutor Teste',
            dueAt: '2026-04-30T00:00:00.000Z',
            amountOutstanding: 250
          }
        ]
      },
      pix: {
        totalTransactions: 1,
        completedCount: 1,
        pendingCount: 0,
        expiredCount: 0,
        cancelledCount: 0,
        reconciledCount: 0,
        attentionRequiredCount: 1,
        completedAmount: 250,
        byProvider: []
      }
    },
    commercial: {
      quotes: {
        issuedCount: 1,
        approvedCount: 0,
        convertedCount: 0,
        rejectedCount: 0,
        pipelineAmount: 300,
        convertedAmount: 0,
        recent: []
      },
      counterSales: {
        totalSales: 2,
        openCount: 0,
        closedCount: 2,
        cancelledCount: 0,
        grossRevenue: 1200,
        netRevenue: 1200,
        avgTicket: 600,
        byPaymentMethod: [],
        topProducts: [{ name: 'Produto Teste', quantity: 1, revenue: 400 }],
        topServices: [{ name: 'Consulta Teste', quantity: 2, revenue: 800 }]
      }
    },
    cash: {
      hasOpenRegister: true,
      openRegister: null,
      registerCount: 1,
      recentRegisters: [
        {
          id: 'cash-1',
          status: 'open',
          openedAt: '2026-04-28T00:00:00.000Z',
          closedAt: null,
          openingAmount: 100,
          closingAmount: null,
          difference: null,
          runningBalance: 500
        }
      ],
      recentMovements: [],
      inflowAmount: 500
    },
    fiscal: {
      activeTaxes: 4,
      cfopCount: 10,
      nfseLayouts: 1,
      icmsRules: 0,
      pisCofinsRules: 0,
      ncmEntries: 6,
      readOnly: false,
      backendScope: 'Fiscal',
      pendingScopes: [],
      alerts: []
    }
  },
  highlights: []
} as unknown as AdministrativeReportsResponse;

const auditEvents = [
  {
    eventId: 'evt-apt-1',
    occurredAt: '2026-04-28T12:00:00.000Z',
    actorId: 'user-agenda',
    accountId: 'acc-1',
    module: 'scheduling',
    action: 'appointment.updated',
    entityType: 'appointment',
    entityId: 'apt-1',
    correlationId: 'corr-apt-1',
    payloadSummary: 'Cliente Maria teve horário do agendamento alterado',
    riskLevel: 'medium'
  },
  {
    eventId: 'evt-apt-2',
    occurredAt: '2026-04-28T13:00:00.000Z',
    actorId: 'user-sync',
    accountId: 'acc-1',
    module: 'google-calendar',
    action: 'appointment.sync.failed',
    entityType: 'appointment-sync',
    entityId: 'apt-2',
    correlationId: 'corr-apt-2',
    payloadSummary: 'Sincronização do agendamento com calendário falhou',
    riskLevel: 'low'
  }
] as unknown as AuditEventSummary[];

const appointments = [
  {
    id: 'apt-1',
    accountId: 'acc-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    scheduledAt: '2026-04-30T12:00:00.000Z',
    durationMinutes: 30,
    visitType: 'scheduled',
    reason: 'Consulta de rotina',
    practitionerStaffId: 'staff-1',
    serviceId: 'service-1',
    unit: 'Clínica Centro',
    status: 'completed',
    createdAt: '2026-04-29T12:00:00.000Z',
    updatedAt: '2026-04-30T12:30:00.000Z'
  },
  {
    id: 'apt-2',
    accountId: 'acc-1',
    patientId: 'patient-2',
    ownerId: 'owner-2',
    scheduledAt: '2026-04-30T13:00:00.000Z',
    durationMinutes: 30,
    visitType: 'return',
    reason: 'Retorno cirúrgico',
    status: 'cancelled',
    createdAt: '2026-04-29T13:00:00.000Z',
    updatedAt: '2026-04-30T10:00:00.000Z'
  },
  {
    id: 'apt-3',
    accountId: 'acc-1',
    patientId: 'patient-3',
    ownerId: 'owner-3',
    scheduledAt: '2026-04-30T14:00:00.000Z',
    durationMinutes: 30,
    visitType: 'scheduled',
    reason: 'Vacina anual',
    practitionerStaffId: 'staff-1',
    serviceId: 'service-2',
    unit: 'Clínica Centro',
    status: 'checked_in',
    createdAt: '2026-04-29T14:00:00.000Z',
    updatedAt: '2026-04-30T14:00:00.000Z'
  }
] as AppointmentSummary[];

const appointmentReportExecution = {
  id: 'rep-exec-appointments',
  rowCount: 3,
  rows: appointments.map((appointment) => ({
    appointmentId: appointment.id,
    scheduledAt: appointment.scheduledAt,
    status: appointment.status,
    reason: appointment.reason,
    patientId: appointment.patientId,
    ownerId: appointment.ownerId,
    practitionerStaffId: appointment.practitionerStaffId ?? null,
    serviceId: appointment.serviceId ?? null,
    unit: appointment.unit ?? null,
    specialty: null,
    resourceLabel: null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  }))
} as never;

const professionalCareReportExecution = {
  id: 'rep-exec-professional-care',
  rowCount: 2,
  rows: [
    {
      professional: 'staff-1',
      scheduled: 2,
      completed: 1,
      checkedIn: 1,
      cancelled: 0,
      services: 2
    },
    {
      professional: 'Sem profissional',
      scheduled: 1,
      completed: 0,
      checkedIn: 0,
      cancelled: 1,
      services: 0
    }
  ]
} as never;

const services = [
  {
    id: 'service-1',
    accountId: 'acc-1',
    name: 'Consulta Teste',
    code: 'CONS',
    description: 'Consulta clínica geral',
    basePrice: 180,
    active: true,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z'
  },
  {
    id: 'service-2',
    accountId: 'acc-1',
    name: 'Vacina Teste',
    code: null,
    description: null,
    basePrice: 120,
    active: false,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z'
  }
] as ServiceSummary[];

const servicesReportExecution = {
  id: 'rep-exec-services',
  rowCount: 2,
  rows: [
    {
      code: 'CONS',
      name: 'Consulta Teste',
      description: 'Consulta clínica geral',
      basePrice: 180,
      status: 'active',
      createdAt: '2026-04-01T00:00:00.000Z'
    },
    {
      code: '',
      name: 'Vacina Teste',
      description: '',
      basePrice: 120,
      status: 'inactive',
      createdAt: '2026-04-02T00:00:00.000Z'
    }
  ]
} as never;

const owners = [
  {
    id: 'owner-1',
    accountId: 'acc-1',
    fullName: 'Maria Cliente',
    documentId: '123.456.789-00',
    contacts: [{ label: 'Celular', value: '(11) 99999-0000', type: 'whatsapp', primary: true }],
    address: { city: 'Campinas', state: 'SP' },
    financialResponsible: true,
    status: 'active',
    createdAt: '2026-04-03T00:00:00.000Z',
    updatedAt: '2026-04-03T00:00:00.000Z'
  },
  {
    id: 'owner-2',
    accountId: 'acc-1',
    fullName: 'João Sem Contato',
    contacts: [],
    financialResponsible: false,
    status: 'inactive',
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z'
  }
] as OwnerSummary[];

const patients = [
  {
    id: 'patient-1',
    accountId: 'acc-1',
    name: 'Bolota',
    species: 'canine',
    breed: 'SRD',
    sex: 'female',
    microchip: '985141000000001',
    legacyVetusId: 'A-100',
    primaryOwnerId: 'owner-1',
    status: 'active',
    createdAt: '2026-04-05T00:00:00.000Z',
    updatedAt: '2026-04-05T00:00:00.000Z'
  },
  {
    id: 'patient-2',
    accountId: 'acc-1',
    name: 'Thor',
    species: 'feline',
    sex: 'male',
    primaryOwnerId: 'owner-2',
    status: 'deceased',
    createdAt: '2026-04-06T00:00:00.000Z',
    updatedAt: '2026-04-06T00:00:00.000Z'
  }
] as PatientSummary[];

const ownersReportExecution = {
  id: 'rep-exec-owners',
  rowCount: 2,
  rows: [
    {
      documentId: '123.456.789-00',
      fullName: 'Maria Cliente',
      primaryContact: 'Celular: (11) 99999-0000',
      city: 'Campinas',
      financialResponsible: 'Sim',
      status: 'active',
      createdAt: '2026-04-03T00:00:00.000Z'
    },
    {
      documentId: '',
      fullName: 'João Sem Contato',
      primaryContact: 'Sem contato',
      city: '',
      financialResponsible: 'Não',
      status: 'inactive',
      createdAt: '2026-04-04T00:00:00.000Z'
    }
  ]
} as never;

const patientsReportExecution = {
  id: 'rep-exec-patients',
  rowCount: 2,
  rows: [
    {
      code: 'A-100',
      name: 'Bolota',
      species: 'canine',
      breed: 'SRD',
      sex: 'female',
      microchip: '985141000000001',
      status: 'active',
      createdAt: '2026-04-05T00:00:00.000Z'
    },
    {
      code: 'patient-2',
      name: 'Thor',
      species: 'feline',
      breed: '',
      sex: 'male',
      microchip: '',
      status: 'deceased',
      createdAt: '2026-04-06T00:00:00.000Z'
    }
  ]
} as never;

const suppliers = [
  {
    code: 'sup-1',
    name: 'Fornecedor CVG',
    kind: 'Operacional',
    category: 'FORNECEDOR',
    costCenterCode: 'ESTOQUE',
    costCenterName: 'Estoque',
    description: 'compras@cvg.test',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z'
  },
  {
    code: 'sup-2',
    name: 'Despesa Energia',
    kind: 'Fixo',
    category: 'DESPESA',
    costCenterCode: 'ADM',
    costCenterName: '',
    description: '',
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z'
  }
];

const chequeExecution = {
  id: 'rep-exec-cheques',
  rowCount: 1,
  rows: [
    {
      paymentId: 'payment-check-1',
      counterSaleId: 'sale-1',
      saleNumber: 'CV-100',
      saleStatus: 'cancelled',
      reference: 'CHQ-0001',
      amount: 225,
      installments: 1,
      recordedAt: '2026-04-07T12:00:00.000Z',
      notes: 'Banco Vetus, bom para 30/04'
    }
  ]
} as never;

const advancePaymentExecution = {
  id: 'rep-exec-advance-payments',
  rowCount: 1,
  rows: [
    {
      paymentId: 'advance-1',
      ownerName: 'Maria Persistida',
      documentId: '111.111.111-11',
      issuedAt: '2026-05-10T12:00:00.000Z',
      originalAmount: 250,
      compensatedAmount: 100,
      balance: 150,
      origin: 'cash_receipt',
      status: 'partially_compensated',
      notes: 'Recebimento persistido'
    }
  ]
} as never;

const cancellationHistoryExecution: ReportExecutionDetail = {
  id: 'rep-exec-cancellation-history',
  accountId: 'account-1',
  reportId: 'commercial-cancellation-history',
  requestedByUserId: 'user-1',
  status: 'completed',
  filters: {},
  rowCount: 1,
  generatedAt: '2026-09-04T12:00:00.000Z',
  expiresAt: '2026-09-05T12:00:00.000Z',
  columns: [],
  rows: [
    {
      eventId: 'event-cancellation-1',
      counterSaleId: 'sale-100',
      number: 'CV-100',
      ownerId: null,
      cancelledAt: '2026-09-04T00:05:00.000Z',
      cancelledByUserId: 'user-gerente',
      reason: 'Lançamento em duplicidade',
      correlationId: 'correlation-cancellation-1',
      total: 225,
      discountAmount: 25,
      paidAmount: 50,
      balanceDue: 175
    }
  ]
};

const deletedSalesExecution = {
  id: 'rep-exec-deleted-sales',
  rowCount: 1,
  rows: [
    {
      number: 'CV-100',
      status: 'cancelled',
      ownerId: 'owner-1',
      openedByUserId: 'user-caixa',
      createdAt: '2026-04-07T10:00:00.000Z',
      updatedAt: '2026-04-07T10:30:00.000Z',
      total: 225,
      discountAmount: 25,
      paidAmount: 0,
      balanceDue: 225,
      notes: 'Cancelada por duplicidade'
    }
  ]
} as never;

const inventoryProductExecution = {
  id: 'rep-exec-inventory-products',
  rowCount: 2,
  rows: [
    {
      sku: 'MED-001',
      name: 'Dipirona Gotas',
      unit: 'un',
      onHandQuantity: 4,
      reorderLevel: 5,
      unitCostAmount: 12.5,
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    },
    {
      sku: 'VAC-010',
      name: 'Vacina V10',
      unit: 'dose',
      onHandQuantity: 20,
      reorderLevel: 3,
      unitCostAmount: 40,
      createdAt: '2026-04-09T00:00:00.000Z',
      updatedAt: '2026-04-09T10:00:00.000Z'
    }
  ]
} as never;

const inventoryStockExecution = {
  id: 'rep-exec-inventory-stock',
  rowCount: 2,
  rows: [
    {
      sku: 'MED-001',
      name: 'Dipirona Gotas',
      unit: 'un',
      onHandQuantity: 4,
      reorderLevel: 5,
      unitCostAmount: 12.5,
      stockValue: 50,
      reorderStatus: 'below_reorder_level',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T10:00:00.000Z'
    },
    {
      sku: 'VAC-010',
      name: 'Vacina V10',
      unit: 'dose',
      onHandQuantity: 20,
      reorderLevel: 3,
      unitCostAmount: 40,
      stockValue: 800,
      reorderStatus: 'adequate',
      createdAt: '2026-04-09T00:00:00.000Z',
      updatedAt: '2026-04-09T10:00:00.000Z'
    }
  ]
} as never;

const inventoryMovementExecution = {
  id: 'rep-exec-inventory-movements',
  rowCount: 2,
  rows: [
    {
      movementId: 'movement-consumption',
      occurredAt: '2026-04-08T10:00:00.000Z',
      movementType: 'consumption',
      sku: 'MED-001',
      name: 'Dipirona Gotas',
      unit: 'un',
      quantityDelta: -2,
      balanceBefore: 6,
      balanceAfter: 4,
      unitCostAmount: 12.5,
      reason: 'Consumo assistencial',
      reference: 'encounter-1',
      recordedByUserId: 'user-estoque'
    },
    {
      movementId: 'movement-inbound',
      occurredAt: '2026-04-07T10:00:00.000Z',
      movementType: 'inbound',
      sku: 'VAC-010',
      name: 'Vacina V10',
      unit: 'dose',
      quantityDelta: 10,
      balanceBefore: 10,
      balanceAfter: 20,
      unitCostAmount: 40,
      reason: 'Entrada de compra',
      reference: 'NF-2026-010',
      recordedByUserId: 'user-compras'
    }
  ]
} as never;

const inventoryInvoiceExecution = {
  id: 'rep-exec-inventory-invoices',
  rowCount: 1,
  rows: [
    {
      purchaseId: 'purchase-report-1',
      invoiceNumber: 'NF-2026-001',
      supplierName: 'Fornecedor Persistente',
      status: 'approved',
      totalAmount: 125,
      receivedAmount: 0,
      payableId: 'payable-1',
      createdByUserId: 'buyer-1',
      approvedByUserId: 'manager-1',
      createdAt: '2026-05-10T10:00:00.000Z',
      updatedAt: '2026-05-10T11:00:00.000Z',
      receivedAt: null
    }
  ]
} as never;

const serviceInvoiceExecution = {
  id: 'rep-exec-service-invoices',
  rowCount: 1,
  rows: [
    {
      documentId: 'nfse-report-1',
      serie: '001',
      numero: 42,
      competencia: '2026-05-15',
      status: 'issued',
      customerName: 'Cliente NFS-e',
      customerDocument: '11122233344',
      provider: 'abrasf',
      serviceDescriptions: 'Consulta clínica',
      serviceCodes: '0407',
      serviceQuantity: 2,
      serviceSubtotal: 200,
      totalIss: 10,
      totalPis: 0,
      totalCofins: 0,
      totalCsll: 0,
      totalIrrf: 0,
      totalInss: 0,
      totalDocument: 210,
      observations: 'Documento persistido',
      createdAt: '2026-05-15T12:00:00.000Z',
      authorizationCode: 'AUTH-42'
    }
  ]
} as never;

const inventoryItems = [
  {
    id: 'inv-1',
    accountId: 'acc-1',
    sku: 'MED-001',
    name: 'Dipirona Gotas',
    unit: 'un',
    onHandQuantity: 4,
    reorderLevel: 5,
    unitCostAmount: 12.5,
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T10:00:00.000Z'
  },
  {
    id: 'inv-2',
    accountId: 'acc-1',
    sku: 'VAC-010',
    name: 'Vacina V10',
    unit: 'dose',
    onHandQuantity: 20,
    reorderLevel: 3,
    unitCostAmount: 40,
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T10:00:00.000Z'
  }
] as InventoryItemSummary[];

const inventoryLots = [
  {
    id: 'lot-1',
    accountId: 'acc-1',
    inventoryItemId: 'inv-1',
    sku: 'MED-001',
    itemName: 'Dipirona Gotas',
    lotNumber: 'L-001',
    quantity: 4,
    unit: 'un',
    location: 'Farmácia',
    supplier: 'Fornecedor CVG',
    expiryDate: '2026-05-15T00:00:00.000Z',
    status: 'expiring',
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T10:00:00.000Z'
  },
  {
    id: 'lot-2',
    accountId: 'acc-1',
    inventoryItemId: 'inv-2',
    sku: 'VAC-010',
    itemName: 'Vacina V10',
    lotNumber: 'L-010',
    quantity: 20,
    unit: 'dose',
    location: 'Geladeira',
    supplier: 'Fornecedor CVG',
    expiryDate: '2026-10-01T00:00:00.000Z',
    status: 'active',
    createdAt: '2026-04-09T00:00:00.000Z',
    updatedAt: '2026-04-09T10:00:00.000Z'
  }
] as InventoryLotSummary[];

const inventoryConsumptions = [
  {
    id: 'cons-1',
    accountId: 'acc-1',
    inventoryItemId: 'inv-1',
    encounterId: 'enc-1',
    patientId: 'patient-1',
    quantity: 2,
    unit: 'un',
    costAmount: 25,
    sourceEntityType: 'encounter',
    sourceEntityId: 'enc-1',
    recordedByUserId: 'user-estoque',
    createdAt: '2026-04-10T09:00:00.000Z'
  },
  {
    id: 'cons-2',
    accountId: 'acc-1',
    inventoryItemId: 'inv-2',
    encounterId: 'enc-2',
    patientId: 'patient-2',
    quantity: 1,
    unit: 'dose',
    costAmount: 40,
    sourceEntityType: 'prescription',
    sourceEntityId: 'rx-1',
    recordedByUserId: 'user-farmacia',
    createdAt: '2026-04-11T09:00:00.000Z'
  }
] as InventoryConsumptionSummary[];

const financialPayables = [
  {
    id: 'payable-1',
    accountId: 'acc-1',
    supplierName: 'Fornecedor de medicamentos',
    description: 'NF 123',
    category: 'Compras',
    costCenterCode: 'EST',
    costCenterName: 'Estoque',
    issuedAt: '2026-05-01',
    dueAt: '2026-05-20',
    totalAmount: 600,
    paidAmount: 0,
    outstandingAmount: 600,
    status: 'open',
    sourceExpenseId: 'expense-1',
    notes: null,
    paymentMethod: null,
    paymentReference: null,
    reconciliationStatus: 'not_required',
    reconciliationReference: null,
    createdByUserId: 'user-1',
    paidByUserId: null,
    cancelledByUserId: null,
    reconciledByUserId: null,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    paidAt: null,
    cancelledAt: null,
    reconciledAt: null
  },
  {
    id: 'payable-2',
    accountId: 'acc-1',
    supplierName: 'Laboratório parceiro',
    description: 'Serviços de análise',
    category: 'Serviços',
    costCenterCode: 'LAB',
    costCenterName: 'Laboratório',
    issuedAt: '2026-05-02',
    dueAt: '2026-05-10',
    totalAmount: 400,
    paidAmount: 400,
    outstandingAmount: 0,
    status: 'paid',
    sourceExpenseId: null,
    notes: null,
    paymentMethod: 'bank_transfer',
    paymentReference: 'extrato-400',
    reconciliationStatus: 'pending',
    reconciliationReference: null,
    createdByUserId: 'user-1',
    paidByUserId: 'user-1',
    cancelledByUserId: null,
    reconciledByUserId: null,
    createdAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
    paidAt: '2026-05-10T10:00:00.000Z',
    cancelledAt: null,
    reconciledAt: null
  }
] as FinancialPayableRecord[];

const financialReceivables = [
  {
    id: 'receivable-open-1',
    encounterId: 'encounter-open-1',
    financialAccountId: 'financial-account-open-1',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/1',
    dueAt: '2026-05-20',
    status: 'open',
    amountOriginal: 300,
    amountPaid: 0,
    amountOutstanding: 300,
    issuedAt: '2026-05-01',
    settledAt: null,
    notes: null,
    payments: [],
    encounterStatus: 'open',
    patientId: 'patient-1',
    patientName: 'Paciente Teste',
    patientSpecies: 'Canino',
    ownerId: 'owner-1',
    ownerName: 'Tutor Teste',
    ownerPhoneMain: null,
    financialStatus: 'pending',
    totalAmount: 300,
    lastClosedAt: null
  },
  {
    id: 'receivable-settled-1',
    encounterId: 'encounter-settled-1',
    financialAccountId: 'financial-account-settled-1',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/1',
    dueAt: '2026-05-15',
    status: 'settled',
    amountOriginal: 420,
    amountPaid: 420,
    amountOutstanding: 0,
    issuedAt: '2026-05-01',
    settledAt: '2026-05-20T14:30:00.000Z',
    notes: null,
    payments: [],
    encounterStatus: 'closed',
    patientId: 'patient-received-1',
    patientName: 'Paciente Recebido',
    patientSpecies: 'Canino',
    ownerId: 'owner-received-1',
    ownerName: 'Tutor Recebido',
    ownerPhoneMain: null,
    financialStatus: 'paid',
    totalAmount: 420,
    lastClosedAt: '2026-05-20T14:00:00.000Z'
  }
] as FinancialReceivableListItem[];

describe('ReportWorkbenchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packagesService.list).mockResolvedValue([customerPackage]);
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue(report);
    vi.mocked(auditService.listEvents).mockResolvedValue(auditEvents);
    vi.mocked(appointmentService.list).mockResolvedValue(appointments);
    vi.mocked(servicesService.list).mockResolvedValue(services);
    vi.mocked(ownerService.list).mockResolvedValue(owners);
    vi.mocked(patientService.list).mockResolvedValue(patients);
    vi.mocked(inventoryService.list).mockResolvedValue(inventoryItems);
    vi.mocked(inventoryService.listConsumptions).mockResolvedValue(inventoryConsumptions);
    vi.mocked(inventoryService.listLots).mockResolvedValue(inventoryLots);
    vi.mocked(financialPayablesService.list).mockResolvedValue({
      data: financialPayables,
      page: 1,
      pageSize: 100,
      total: financialPayables.length,
      openCount: 1,
      paidCount: 1,
      cancelledCount: 0,
      totalAmount: 1000,
      totalPaid: 400,
      totalOutstanding: 600
    });
    vi.mocked(financialReceivablesService.list).mockImplementation(async (filters = {}) => {
      const data = financialReceivables.filter((item) =>
        filters.status ? item.status === filters.status : true
      );
      return {
        data,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 100,
        total: data.length,
        openCount: data.filter((item) => item.status === 'open').length,
        settledCount: data.filter((item) => item.status === 'settled').length,
        totalOutstanding: data.reduce((total, item) => total + item.amountOutstanding, 0),
        totalSettled: data.reduce((total, item) => total + item.amountPaid, 0)
      };
    });
    vi.mocked(reportsService.execute).mockImplementation(async (payload) => {
      if (payload.reportId === 'registration-services') return servicesReportExecution;
      if (payload.reportId === 'registration-owners') return ownersReportExecution;
      if (payload.reportId === 'registration-patients') return patientsReportExecution;
      if (payload.reportId === 'registration-suppliers') {
        return { id: 'rep-exec-suppliers', rowCount: suppliers.length, rows: suppliers } as never;
      }
      if (payload.reportId === 'financial-advance-payments') return advancePaymentExecution;
      if (payload.reportId === 'scheduling-appointments') return appointmentReportExecution;
      if (payload.reportId === 'scheduling-professional-care')
        return professionalCareReportExecution;
      if (payload.reportId === 'fiscal-service-invoices') return serviceInvoiceExecution;
      if (payload.reportId === 'inventory-stock') return inventoryStockExecution;
      if (payload.reportId === 'inventory-movements') return inventoryMovementExecution;
      if (payload.reportId === 'commercial-cancellation-history')
        return cancellationHistoryExecution;
      if (payload.reportId === 'commercial-deleted-sales') return deletedSalesExecution;
      return { id: 'rep-exec-payables', rowCount: 1, rows: [] } as never;
    });
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-payables',
      accountId: 'account-1',
      executionId: 'rep-exec-payables',
      format: 'csv',
      filename: 'financial-payables-rep-exec-payables.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Fornecedor;Descrição\nLaboratório parceiro;NF 123',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });
  });

  it('renders accounts receivable financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'accounts-receivable' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas a Receber');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ContasAReceberRelatorio.htm');
    expect(wrapper.text()).toContain('Maiores recebíveis em aberto');
    expect(wrapper.text()).toContain('Paciente Teste');
    expect(wrapper.text()).toContain('Tutor Teste');
    expect(wrapper.text()).toContain('1/1');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(financialReceivablesService.list).toHaveBeenCalledWith({
      status: 'open',
      page: 1,
      pageSize: 100
    });
  });

  it('renders received accounts financial report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'received-accounts' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas Recebidas');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ContasRecebidasRelatorio.htm');
    expect(wrapper.text()).toContain('Recebimentos no período');
    expect(wrapper.text()).toContain('Paciente Recebido');
    expect(wrapper.text()).toContain('Tutor Recebido');
    expect(wrapper.text()).toContain('Parcela 1/1');
    expect(wrapper.text()).toContain('Recebido');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(financialReceivablesService.list).toHaveBeenCalledWith({
      status: 'settled',
      page: 1,
      pageSize: 100
    });
  });

  it('exports received accounts through the persisted server-side report artifact', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'received-accounts' }
    });
    await flushPromises();

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Exportar CSV');
    await exportButton?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'financial-receivables',
      filters: { status: 'settled' }
    });
    expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-payables', 'csv');
  });

  it('renders accounts payable financial report from the authoritative payables subledger', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'accounts-payable' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas a Pagar');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Financeiro/ContasAPagar.htm');
    expect(wrapper.text()).toContain('Obrigações a pagar');
    expect(wrapper.text()).toContain('Fornecedor de medicamentos');
    expect(wrapper.text()).toContain('Laboratório parceiro');
    expect(wrapper.text()).toContain('NF 123');
    expect(wrapper.text()).toContain('A Pagar');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(financialPayablesService.list).toHaveBeenCalledWith({
      status: '',
      page: 1,
      pageSize: 100
    });
  });

  it('renders paid accounts financial report from the paid payables subledger', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'paid-accounts' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Contas Pagas');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ContasPagasRelatorio.htm');
    expect(wrapper.text()).toContain('Pagamentos no período');
    expect(wrapper.text()).toContain('Laboratório parceiro');
    expect(wrapper.text()).not.toContain('Fornecedor de medicamentos');
    expect(wrapper.text()).toContain('Pago');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(financialPayablesService.list).toHaveBeenCalledWith({
      status: 'paid',
      page: 1,
      pageSize: 100
    });
  });

  it('exports accounts payable through the persisted server-side report artifact', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:server-report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'accounts-payable' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenCalledWith({
        reportId: 'financial-payables',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-payables', 'csv');
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 1 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('exports paid accounts with the authoritative paid filter', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:paid-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'paid-accounts' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenCalledWith({
        reportId: 'financial-payables',
        filters: { status: 'paid' }
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders cheques financial report as a read-only legacy report', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(chequeExecution);

    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cheques' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Cheques');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ChequesRelatorio.htm');
    expect(wrapper.text()).toContain('Cheques no período');
    expect(wrapper.find('caption').text()).toBe('Cheques');
    expect(wrapper.text()).toContain('CHQ-0001');
    expect(wrapper.text()).toContain('CV-100');
    expect(wrapper.text()).toContain('Cancelado');
    expect(wrapper.text()).toContain('Banco Vetus, bom para 30/04');
    expect(wrapper.text()).toContain('R$\u00A0225,00');
    expect(wrapper.text()).not.toContain('CARD-0001');
    expect(wrapper.text()).not.toContain('A Depositar');
    expect(wrapper.text()).not.toContain('Devolvidos');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'financial-cheques',
      filters: {}
    });
  });

  it('exports only persisted cheque payments from the report workbench', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(chequeExecution);
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:cheques-report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'cheques' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      expect(exportButton).toBeDefined();

      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenCalledWith({
        reportId: 'financial-cheques',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-cheques', 'csv');
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 1 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('passes the report period to the server-side cheque payment-date filter', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cheques' }
    });
    await flushPromises();

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-05-01');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).not.toContain('CHQ-0001');
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'financial-cheques',
      filters: { dateFrom: '2026-05-01' }
    });
  });

  it('clears previous cheque rows when a server-side refresh fails', async () => {
    vi.mocked(reportsService.execute)
      .mockResolvedValueOnce(chequeExecution)
      .mockRejectedValueOnce(new Error('Falha ao executar relatório de cheques'));

    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cheques' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('CHQ-0001');

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Falha ao executar relatório de cheques');
    expect(wrapper.text()).not.toContain('CHQ-0001');
  });

  it('surfaces malformed server-side cheque rows instead of silently dropping them', async () => {
    vi.mocked(reportsService.execute).mockResolvedValueOnce({
      id: 'rep-exec-invalid-cheques',
      rowCount: 1,
      rows: [{ paymentId: 'missing-required-fields' }]
    } as never);

    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cheques' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Resposta inválida do relatório de cheques');
    expect(wrapper.text()).not.toContain('missing-required-fields');
  });

  it('renders advance payments from the audited server-side report source', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'advance-payments' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Pagamento Antecipado');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Financeiro/PagamentoAntecipado.htm');
    expect(wrapper.text()).toContain('Pagamentos antecipados no período');
    expect(wrapper.text()).toContain('Maria Persistida');
    expect(wrapper.text()).toContain('cash_receipt');
    expect(wrapper.text()).toContain('R$\u00A0250,00');
    expect(wrapper.text()).toContain('R$\u00A0150,00');
    expect(wrapper.text()).not.toContain('Abrir financeiro');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'financial-advance-payments',
      filters: {}
    });
  });

  it('forwards advance-payment owner search and compensation status filters', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'advance-payments' }
    });
    await flushPromises();

    await wrapper.find('input[placeholder="Nome ou documento do cliente"]').setValue('Maria');
    await wrapper.get('#advance-payment-status').setValue('partially_compensated');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'financial-advance-payments',
      filters: {
        search: 'Maria',
        status: 'partially_compensated'
      }
    });
  });

  it('exports advance payments through the audited server-side report artifact', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:advance-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'advance-payments' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      expect(exportButton).toBeDefined();
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenLastCalledWith({
        reportId: 'financial-advance-payments',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith(
        'rep-exec-advance-payments',
        'csv'
      );
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 1 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('exports the persisted owner registry through the audited server-side report', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:owner-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'register-owners' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      expect(exportButton).toBeDefined();
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenCalledWith({
        reportId: 'registration-owners',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-owners', 'csv');
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 2 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders counter sales and sales attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'sales-counter-sales' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Comandas/Vendas');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ComandasVendasRelatorio.htm');
    expect(wrapper.text()).toContain('Comandas e vendas no período');
    expect(wrapper.text()).toContain('Receita bruta');
    expect(wrapper.text()).toContain('Ticket médio');
    expect(wrapper.text()).toContain('Volume transacional consolidado');
    expect(wrapper.text()).toContain('Comandas e vendas fechadas');
    expect(wrapper.text()).not.toContain('Hubs Administrativos');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders produced items attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'produced-items' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Produtos/Serviços Produzidos');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ProdutosEServicosProduzidos.htm');
    expect(wrapper.text()).toContain('Produtos e serviços em destaque');
    expect(wrapper.text()).toContain('Vendas fechadas');
    expect(wrapper.text()).toContain('Receita comercial');
    expect(wrapper.text()).toContain('Tipos de itens listados');
    expect(wrapper.text()).toContain('Consulta Teste');
    expect(wrapper.text()).toContain('Produto Teste');
    expect(wrapper.text()).not.toContain('Abrir vendas');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders production attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'production' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Produção');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ProducaoRelatorio.htm');
    expect(wrapper.text()).toContain('Produção no período');
    expect(wrapper.text()).toContain('Vendas fechadas');
    expect(wrapper.text()).toContain('Recebido em vendas fechadas');
    expect(wrapper.text()).toContain('Valor das vendas fechadas');
    expect(wrapper.text()).toContain('Serviços em destaque');
    expect(wrapper.text()).toContain('Produtos em destaque');
    expect(wrapper.text()).not.toContain('Abrir hub executivo');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('separates closed-sale totals from the limited production highlights', async () => {
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue({
      ...report,
      domains: {
        ...report.domains,
        commercial: {
          ...report.domains.commercial,
          counterSales: {
            ...report.domains.commercial.counterSales,
            totalSales: 99,
            closedCount: 3,
            grossRevenue: 9000,
            netRevenue: 7500
          }
        }
      }
    });
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'production' } });
    await flushPromises();

    const rowCells = (label: string) => wrapper.findAll('tbody tr')
      .find(row => row.find('td').text() === label)!.findAll('td').map(cell => cell.text());
    expect(rowCells('Valor das vendas fechadas')).toEqual([
      'Valor das vendas fechadas', expect.stringMatching(/R\$\s*9\.000,00/), '3', 'Vendas fechadas'
    ]);
    expect(rowCells('Recebido em vendas fechadas')).toEqual([
      'Recebido em vendas fechadas', expect.stringMatching(/R\$\s*7\.500,00/), '3', 'Comandas/Vendas fechadas'
    ]);
    expect(rowCells('Serviços em destaque')).toEqual([
      'Serviços em destaque', expect.stringMatching(/R\$\s*800,00/), '2', 'Serviços listados: 1'
    ]);
    expect(rowCells('Produtos em destaque')).toEqual([
      'Produtos em destaque', expect.stringMatching(/R\$\s*400,00/), '1', 'Produtos listados: 1'
    ]);
    expect(wrapper.text()).toContain('até 5 de cada tipo');
    const closedSummary = wrapper.findAll('.report-summary dl > div')
      .find(item => item.find('dt').text() === 'Vendas fechadas')!;
    expect(closedSummary.find('dd').text()).toBe('3');
  });

  it('identifies produced items as a limited list alongside complete commercial totals', async () => {
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValue({
      ...report,
      executive: { ...report.executive, commercialRevenue: 9000 }
    });
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'produced-items' } });
    await flushPromises();

    expect(wrapper.text()).toContain('Lista limitada a até 5 produtos e 5 serviços em destaque');
    expect(wrapper.text()).toContain('os indicadores comerciais abrangem as vendas fechadas');
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
    expect(wrapper.find('tbody').text()).toMatch(/R\$\s*800,00/);
    expect(wrapper.find('tbody').text()).toMatch(/R\$\s*400,00/);
    expect(wrapper.find('.report-summary').text()).toMatch(/R\$\s*9\.000,00/);
    const listedSummary = wrapper.findAll('.report-summary dl > div')
      .find(item => item.find('dt').text() === 'Tipos de itens listados')!;
    expect(listedSummary.find('dd').text()).toBe('2');
  });

  it('renders appointments attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'appointments' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Agenda');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/AgendaRelatorio.htm');
    expect(wrapper.text()).toContain('Agendamentos no período');
    expect(wrapper.text()).toContain('Agendamentos');
    expect(wrapper.text()).toContain('Comparecimentos');
    expect(wrapper.text()).toContain('Cancelamentos');
    expect(wrapper.text()).toContain('Consulta de rotina');
    expect(wrapper.text()).toContain('Retorno cirúrgico');
    expect(wrapper.text()).toContain('Executado');
    expect(wrapper.text()).toContain('Cancelado');
    expect(wrapper.text()).not.toContain('Abrir hub executivo');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'scheduling-appointments',
      filters: {}
    });
    expect(appointmentService.list).not.toHaveBeenCalled();
  });

  it('renders professional care attendance report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'professional-care' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Atendimento por Profissional');
    expect(wrapper.text()).toContain('Relatórios de Atendimentos');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/AtendimentoPorProfissional.htm');
    expect(wrapper.text()).toContain('Atendimentos por profissional');
    expect(wrapper.text()).toContain('Profissionais atendendo');
    expect(wrapper.text()).toContain('Atendimentos executados');
    expect(wrapper.text()).toContain('Agendamentos no período');
    expect(wrapper.text()).toContain('staff-1');
    expect(wrapper.text()).toContain('Sem profissional');
    expect(wrapper.text()).not.toContain('Abrir profissionais');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'scheduling-professional-care',
      filters: {}
    });
    expect(appointmentService.list).not.toHaveBeenCalled();
  });

  it('exports professional care through the audited server artifact', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:professional-care');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-professional-care',
      accountId: 'account-1',
      executionId: 'rep-exec-professional-care',
      format: 'csv',
      filename: 'scheduling-professional-care-rep-exec-professional-care.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Profissional;Agendamentos\nstaff-1;2',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'professional-care' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      expect(exportButton).toBeDefined();

      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenLastCalledWith({
        reportId: 'scheduling-professional-care',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith(
        'rep-exec-professional-care',
        'csv'
      );
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 2 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('forwards the professional care UTC period filters to the server', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'professional-care' }
    });
    await flushPromises();

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-04-01');
    await dateInputs[1]?.setValue('2026-04-30');
    const applyButton = wrapper.findAll('button').find((button) => button.text() === 'Aplicar');
    await applyButton?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'scheduling-professional-care',
      filters: {
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30'
      }
    });
    expect(appointmentService.list).not.toHaveBeenCalled();
  });

  it('forwards appointments report search, status and UTC period filters to the server', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'appointments' }
    });
    await flushPromises();

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-04-01');
    await dateInputs[1]?.setValue('2026-04-30');
    await wrapper
      .find('input[placeholder="ID, motivo, unidade ou especialidade"]')
      .setValue(' rotina ');
    await wrapper.find('#appointment-report-status').setValue('completed');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'scheduling-appointments',
      filters: {
        search: 'rotina',
        status: 'completed',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30'
      }
    });
    expect(appointmentService.list).not.toHaveBeenCalled();
  });

  it('renders service invoices custom report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'service-invoices' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Relatório de NF de Serviços Prestados');
    expect(wrapper.text()).toContain('Relatórios Personalizados');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/RelatoriosDinamicosExecutor.htm?id=1');
    expect(wrapper.text()).toContain('Documentos NFS-e persistidos');
    expect(wrapper.text()).toContain('Cliente NFS-e');
    expect(wrapper.text()).toContain('Consulta clínica');
    expect(wrapper.text()).toContain('Emitida');
    expect(wrapper.text()).toContain('Documento persistido');
    expect(wrapper.text()).not.toContain('Atualizar relatório de NF');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'fiscal-service-invoices',
      filters: {}
    });
  });

  it('exports service invoices through the audited server-side report artifact', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(serviceInvoiceExecution);
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-service-invoices',
      accountId: 'account-1',
      executionId: 'rep-exec-service-invoices',
      format: 'csv',
      filename: 'fiscal-service-invoices-rep-exec-service-invoices.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Documento,Cliente\n42,Cliente NFS-e',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:service-invoices-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'service-invoices' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenCalledWith({
        reportId: 'fiscal-service-invoices',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith(
        'rep-exec-service-invoices',
        'csv'
      );
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 1 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders services register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-services' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Serviços');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ServicosRelatorio.htm');
    expect(wrapper.text()).toContain('Serviços cadastrados');
    expect(wrapper.text()).toContain('Serviços ativos');
    expect(wrapper.text()).toContain('Preço médio');
    expect(wrapper.text()).toContain('Consulta Teste');
    expect(wrapper.text()).toContain('CONS');
    expect(wrapper.text()).toContain('Vacina Teste');
    expect(wrapper.text()).toContain('Sem código');
    expect(wrapper.text()).toContain('Inativo');
    expect(wrapper.text()).not.toContain('Abrir serviços');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(servicesService.list).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-services',
      filters: {}
    });

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-04-01');
    await dateInputs[1]?.setValue('2026-04-30');
    const applyButton = wrapper.findAll('button').find((button) => button.text() === 'Aplicar');
    await applyButton?.trigger('click');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'registration-services',
      filters: { dateFrom: '2026-04-01', dateTo: '2026-04-30' }
    });

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Exportar CSV');
    await exportButton?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-services',
      filters: { dateFrom: '2026-04-01', dateTo: '2026-04-30' }
    });
    expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-services', 'csv');
  });

  it('rejects malformed server services rows instead of falling back to the local list', async () => {
    vi.mocked(reportsService.execute).mockResolvedValueOnce({
      id: 'rep-exec-services-invalid',
      rowCount: 1,
      rows: [
        {
          code: 'BAD',
          name: 'Serviço inválido',
          description: '',
          basePrice: 'not-a-number',
          status: 'active',
          createdAt: '2026-04-01T00:00:00.000Z'
        }
      ]
    } as never);

    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-services' }
    });
    await flushPromises();

    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-services',
      filters: {}
    });
    expect(servicesService.list).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Resposta inválida do relatório de serviços');
    expect(wrapper.text()).not.toContain('Serviço inválido');
  });

  it('renders owners register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-owners' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Clientes');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ClientesRelatorio.htm');
    expect(wrapper.text()).toContain('Clientes cadastrados');
    expect(wrapper.text()).toContain('Clientes ativos');
    expect(wrapper.text()).toContain('Responsáveis financeiros');
    expect(wrapper.text()).toContain('Com contato');
    expect(wrapper.text()).toContain('Maria Cliente');
    expect(wrapper.text()).toContain('123.456.789-00');
    expect(wrapper.text()).toContain('Celular: (11) 99999-0000');
    expect(wrapper.text()).toContain('Campinas');
    expect(wrapper.text()).toContain('João Sem Contato');
    expect(wrapper.text()).toContain('Sem documento');
    expect(wrapper.text()).toContain('Sem contato');
    expect(wrapper.text()).toContain('Inativo');
    expect(wrapper.text()).not.toContain('Abrir clientes');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(ownerService.list).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-owners',
      filters: {}
    });

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-04-01');
    await dateInputs[1]?.setValue('2026-04-30');
    const applyButton = wrapper.findAll('button').find((button) => button.text() === 'Aplicar');
    await applyButton?.trigger('click');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'registration-owners',
      filters: { dateFrom: '2026-04-01', dateTo: '2026-04-30' }
    });

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Exportar CSV');
    await exportButton?.trigger('click');
    await flushPromises();
    expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-owners', 'csv');
  });

  it('renders patients register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-patients' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Animais');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/AnimaisRelatorio.htm');
    expect(wrapper.text()).toContain('Animais cadastrados');
    expect(wrapper.text()).toContain('Animais ativos');
    expect(wrapper.text()).toContain('Falecidos');
    expect(wrapper.text()).toContain('Com microchip');
    expect(wrapper.text()).toContain('Bolota');
    expect(wrapper.text()).toContain('A-100');
    expect(wrapper.text()).toContain('Canina');
    expect(wrapper.text()).toContain('SRD');
    expect(wrapper.text()).toContain('Fêmea');
    expect(wrapper.text()).toContain('985141000000001');
    expect(wrapper.text()).toContain('Thor');
    expect(wrapper.text()).toContain('Felina');
    expect(wrapper.text()).toContain('Sem raça');
    expect(wrapper.text()).toContain('Sem chip');
    expect(wrapper.text()).not.toContain('Abrir animais');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(patientService.list).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-patients',
      filters: {}
    });

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-04-01');
    await dateInputs[1]?.setValue('2026-04-30');
    const applyButton = wrapper.findAll('button').find((button) => button.text() === 'Aplicar');
    await applyButton?.trigger('click');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'registration-patients',
      filters: { dateFrom: '2026-04-01', dateTo: '2026-04-30' }
    });

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Exportar CSV');
    await exportButton?.trigger('click');
    await flushPromises();
    expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-patients', 'csv');
  });

  it('rejects malformed server owner rows without falling back to the local list', async () => {
    vi.mocked(reportsService.execute).mockResolvedValueOnce({
      id: 'rep-exec-owners-invalid',
      rowCount: 1,
      rows: [
        {
          documentId: '',
          fullName: 'Cliente inválido',
          primaryContact: 42,
          city: '',
          financialResponsible: 'Sim',
          status: 'active',
          createdAt: '2026-04-03T00:00:00.000Z'
        }
      ]
    } as never);

    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-owners' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Resposta inválida do relatório de clientes');
    expect(wrapper.text()).not.toContain('Cliente inválido');
    expect(ownerService.list).not.toHaveBeenCalled();
  });

  it('rejects malformed server patient rows without falling back to the local list', async () => {
    vi.mocked(reportsService.execute).mockResolvedValueOnce({
      id: 'rep-exec-patients-invalid',
      rowCount: 1,
      rows: [
        {
          code: 'BAD',
          name: 'Animal inválido',
          species: 'canine',
          breed: '',
          sex: 'male',
          microchip: '',
          status: 'unknown',
          createdAt: '2026-04-05T00:00:00.000Z'
        }
      ]
    } as never);

    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-patients' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Resposta inválida do relatório de animais');
    expect(wrapper.text()).not.toContain('Animal inválido');
    expect(patientService.list).not.toHaveBeenCalled();
  });

  it('renders suppliers register report as a read-only legacy report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-suppliers' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Fornecedores');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/FornecedoresRelatorio.htm');
    expect(wrapper.text()).toContain('Registros cadastrados');
    expect(wrapper.text()).toContain('Despesas');
    expect(wrapper.text()).toContain('Com descrição');
    expect(wrapper.text()).toContain('Fornecedor CVG');
    expect(wrapper.text()).toContain('sup-1');
    expect(wrapper.text()).toContain('FORNECEDOR');
    expect(wrapper.text()).toContain('Operacional');
    expect(wrapper.text()).toContain('Estoque · ESTOQUE');
    expect(wrapper.text()).toContain('compras@cvg.test');
    expect(wrapper.text()).toContain('Despesa Energia');
    expect(wrapper.text()).toContain('DESPESA');
    expect(wrapper.text()).toContain('ADM');
    expect(wrapper.text()).toContain('Sem descrição');
    expect(wrapper.text()).not.toContain('Abrir fornecedores');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-suppliers',
      filters: {}
    });
  });

  it('exports the supplier register through the audited server report path', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'register-suppliers' }
    });
    await flushPromises();

    const exportButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Exportar CSV');
    await exportButton?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'registration-suppliers',
      filters: {}
    });
    expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-suppliers', 'csv');
  });

  it('opens cancellation history by default with UTC dates, actor, reason and event-time amounts', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'deleted-sales-counter-sales' }
    });
    await flushPromises();

    expect(wrapper.get('label[for="cancellation-report-view"]').text()).toBe('Consultar');
    expect(wrapper.get<HTMLSelectElement>('#cancellation-report-view').element.value).toBe(
      'history'
    );
    expect(wrapper.text()).toContain('Histórico por data de cancelamento');
    expect(wrapper.text()).toContain('Canceladas por data de abertura');
    expect(wrapper.text()).toContain('Cancelamentos de (UTC)');
    expect(wrapper.text()).toContain('Cancelamentos até (UTC)');
    expect(wrapper.text()).toContain('Os valores correspondem ao momento do cancelamento.');
    expect(wrapper.text()).not.toContain('Vetus');
    expect(wrapper.text()).not.toContain('server-side');
    const cells = wrapper.get('tbody tr').findAll('td');
    expect(cells[0]?.text()).toBe('CV-100');
    expect(cells[1]?.text()).toContain('04/09/2026');
    expect(cells[1]?.text()).toContain('00:05');
    expect(cells[2]?.text()).toBe('user-gerente');
    expect(cells[3]?.text()).toBe('Lançamento em duplicidade');
    expect(cells.slice(4).map((cell) => cell.text())).toEqual([
      'R$\u00A0225,00',
      'R$\u00A025,00',
      'R$\u00A050,00',
      'R$\u00A0175,00'
    ]);
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'commercial-cancellation-history',
      filters: {}
    });
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(auditService.listEvents).not.toHaveBeenCalled();
  });

  it('executes cancellation-date and search filters and clears them without leaving history', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'deleted-sales-counter-sales' }
    });
    await flushPromises();

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-09-04');
    await dateInputs[1]?.setValue('2026-09-04');
    await wrapper
      .get('input[placeholder="Número da comanda, motivo ou ID do responsável"]')
      .setValue('  duplicidade  ');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'commercial-cancellation-history',
      filters: { dateFrom: '2026-09-04', dateTo: '2026-09-04', search: 'duplicidade' }
    });

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Limpar')
      ?.trigger('click');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'commercial-cancellation-history',
      filters: {}
    });
    expect(wrapper.get<HTMLSelectElement>('#cancellation-report-view').element.value).toBe(
      'history'
    );
  });

  it('shows cancellation history loading and an actionable empty state', async () => {
    let resolveExecution!: (execution: ReportExecutionDetail) => void;
    vi.mocked(reportsService.execute).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveExecution = resolve;
        })
    );
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'deleted-sales-counter-sales' }
    });
    await flushPromises();

    expect(wrapper.find('[aria-label="Carregando dados da tabela"]').exists()).toBe(true);
    expect(wrapper.get('#cancellation-report-view').attributes('disabled')).toBeDefined();
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV')
        ?.attributes('disabled')
    ).toBeDefined();
    resolveExecution({ ...cancellationHistoryExecution, rowCount: 0, rows: [] });
    await flushPromises();

    expect(wrapper.text()).toContain('Nenhum cancelamento encontrado');
    expect(wrapper.text()).toContain('Ajuste as datas de cancelamento ou limpe os filtros');
    expect(wrapper.find('[aria-label="Carregando dados da tabela"]').exists()).toBe(false);
    expect(wrapper.get('#cancellation-report-view').attributes('disabled')).toBeUndefined();
  });

  it('clears stale history after an error and retries the same cancellation period', async () => {
    vi.mocked(reportsService.execute)
      .mockResolvedValueOnce(cancellationHistoryExecution)
      .mockRejectedValueOnce(new Error('Não foi possível consultar os cancelamentos'))
      .mockResolvedValueOnce(cancellationHistoryExecution);
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'deleted-sales-counter-sales' }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('CV-100');
    await wrapper.findAll('input[type="date"]')[0]?.setValue('2026-09-04');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('Não foi possível consultar os cancelamentos');
    expect(wrapper.text()).toContain('Não foi possível carregar o relatório');
    expect(wrapper.text()).not.toContain('CV-100');
    expect(wrapper.text()).not.toContain('Nenhum cancelamento encontrado');
    expect(wrapper.find('.report-kpis').exists()).toBe(false);
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Tentar novamente')
      ?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'commercial-cancellation-history',
      filters: { dateFrom: '2026-09-04' }
    });
    expect(wrapper.text()).toContain('CV-100');
    expect(wrapper.text()).not.toContain('Não foi possível consultar os cancelamentos');
  });

  it.each([
    { reason: '' },
    { cancelledAt: 'data inválida' },
    { total: Number.NaN },
    { correlationId: undefined }
  ])(
    'rejects malformed cancellation facts without showing partial history: %j',
    async (invalid) => {
      vi.mocked(reportsService.execute).mockResolvedValueOnce({
        ...cancellationHistoryExecution,
        rowCount: 2,
        rows: [
          cancellationHistoryExecution.rows[0]!,
          { ...cancellationHistoryExecution.rows[0], ...invalid }
        ]
      });
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'deleted-sales-counter-sales' }
      });
      await flushPromises();

      expect(wrapper.text()).toContain('Resposta inválida do histórico de cancelamentos');
      expect(wrapper.find('tbody').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('CV-100');
      expect(wrapper.text()).not.toContain('Nenhum cancelamento encontrado');
    }
  );

  it('exports cancellation history with current filters using the server-generated CSV content', async () => {
    const content =
      'Evento;Cancelamento;Responsável;Motivo;Total;Correlação\nevent-cancellation-1;2026-09-04T00:05:00.000Z;user-gerente;Lançamento em duplicidade;225;correlation-cancellation-1';
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-cancellation-history',
      accountId: 'account-1',
      executionId: 'rep-exec-cancellation-history',
      format: 'csv',
      filename: 'commercial-cancellation-history-rep-exec-cancellation-history.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content,
      exportedByUserId: 'user-1',
      exportedAt: '2026-09-04T12:00:00.000Z'
    });
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:cancellation-history-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });
    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'deleted-sales-counter-sales' }
      });
      await flushPromises();
      await wrapper.findAll('input[type="date"]')[0]?.setValue('2026-09-04');
      await wrapper
        .get('input[placeholder="Número da comanda, motivo ou ID do responsável"]')
        .setValue('user-gerente');
      expect(wrapper.get('.report-query-note').text()).toContain('A tabela mostra a última consulta; o CSV será gerado com os filtros atuais.');
      await wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV')
        ?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenLastCalledWith({
        reportId: 'commercial-cancellation-history',
        filters: { dateFrom: '2026-09-04', search: 'user-gerente' }
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith(
        'rep-exec-cancellation-history',
        'csv'
      );
      expect(createObjectURL).toHaveBeenCalledOnce();
      const downloaded = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(createObjectURL.mock.calls[0]![0]);
      });
      expect(downloaded).toBe(content);
      expect(wrapper.text()).toContain('CSV gerado com 1 cancelamento(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('switches to the existing opening-date snapshot with its original source and columns', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'deleted-sales-counter-sales' }
    });
    await flushPromises();
    await wrapper.get('#cancellation-report-view').setValue('opening-date');
    await flushPromises();

    expect(wrapper.text()).toContain('Exclusão de Vendas e Comandas');
    expect(wrapper.text()).toContain('Relatórios de Cadastros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/ExclusaoVendaComandaRelatorio.htm');
    expect(wrapper.text()).toContain('Aberturas de (UTC)');
    expect(wrapper.text()).toContain('Aberturas até (UTC)');
    expect(wrapper.text()).toContain('período pela data de abertura');
    expect(wrapper.findAll('th').map((cell) => cell.text())).toContain('Usuário de abertura (ID)');
    expect(wrapper.findAll('th').map((cell) => cell.text())).not.toContain('Cancelado por (ID)');
    expect(wrapper.text()).toContain('Exclusões registradas');
    expect(wrapper.text()).toContain('Valor cancelado');
    expect(wrapper.text()).toContain('Descontos cancelados');
    expect(wrapper.text()).toContain('Com saldo aberto');
    expect(wrapper.text()).toContain('CV-100');
    expect(wrapper.text()).toContain('owner-1');
    expect(wrapper.text()).toContain('user-caixa');
    expect(wrapper.text()).toContain('Cancelada por duplicidade');
    expect(wrapper.text()).not.toContain('CV-101');
    expect(wrapper.text()).not.toContain('Abrir auditoria');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'commercial-deleted-sales',
      filters: {}
    });

    await wrapper.findAll('input[type="date"]')[0]?.setValue('2026-04-07');
    await wrapper
      .get('input[placeholder="Número da comanda ou texto da observação"]')
      .setValue('CV-100');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'commercial-deleted-sales',
      filters: { dateFrom: '2026-04-07', search: 'CV-100' }
    });
    await wrapper.get('#cancellation-report-view').setValue('history');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'commercial-cancellation-history',
      filters: { dateFrom: '2026-04-07', search: 'CV-100' }
    });
    expect(wrapper.text()).toContain('Cancelamentos de (UTC)');
    expect(wrapper.text()).toContain('user-gerente');
    expect(wrapper.text()).not.toContain('user-caixa');
  });

  it('exports deleted sales through the audited server-side report artifact', async () => {
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-deleted-sales',
      accountId: 'account-1',
      executionId: 'rep-exec-deleted-sales',
      format: 'csv',
      filename: 'commercial-deleted-sales-rep-exec-deleted-sales.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Número;Tutor;Usuário de abertura\nCV-100;owner-1;user-caixa',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:deleted-sales-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'deleted-sales-counter-sales' }
      });
      await flushPromises();

      await wrapper.get('#cancellation-report-view').setValue('opening-date');
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenCalledWith({
        reportId: 'commercial-deleted-sales',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-deleted-sales', 'csv');
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 1 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders inventory stock from the audited server report without loading local inventory state', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-stock' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Estoque');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/EstoqueRelatorio.htm');
    expect(wrapper.text()).toContain('Itens em estoque');
    expect(wrapper.text()).toContain('Valor em estoque');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('MED-001');
    expect(wrapper.text()).toContain('Dipirona Gotas');
    expect(wrapper.text()).toContain('un');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('VAC-010');
    expect(wrapper.text()).toContain('Adequado');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'inventory-stock',
      filters: {}
    });
    expect(inventoryService.list).not.toHaveBeenCalled();
    expect(inventoryService.listLots).not.toHaveBeenCalled();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
  });

  it('exports inventory stock through the audited server-side report artifact', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(inventoryStockExecution);
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-inventory-stock',
      accountId: 'account-1',
      executionId: 'rep-exec-inventory-stock',
      format: 'csv',
      filename: 'inventory-stock-rep-exec-inventory-stock.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Código;Produto;Valor estoque\nMED-001;Dipirona Gotas;50,00',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:inventory-stock-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'inventory-stock' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenLastCalledWith({
        reportId: 'inventory-stock',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith(
        'rep-exec-inventory-stock',
        'csv'
      );
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 2 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders inventory movements from the audited server ledger and avoids local projections', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-movements' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Movimentações no Estoque');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/MovimentacaoEstoqueRelatorio.htm');
    expect(wrapper.text()).toContain('Movimentações registradas');
    expect(wrapper.text()).toContain('Entradas');
    expect(wrapper.text()).toContain('Saídas/consumos');
    expect(wrapper.text()).toContain('Valor movimentado');
    expect(wrapper.text()).toContain('Saída');
    expect(wrapper.text()).toContain('Consumo assistencial');
    expect(wrapper.text()).toContain('user-estoque');
    expect(wrapper.text()).toContain('Entrada');
    expect(wrapper.text()).toContain('NF-2026-010');
    expect(wrapper.text()).toContain('user-compras');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'inventory-movements',
      filters: {}
    });
    expect(inventoryService.list).not.toHaveBeenCalled();
    expect(inventoryService.listLots).not.toHaveBeenCalled();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
  });

  it('renders inventory invoices from the audited persisted purchase-entry report', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(inventoryInvoiceExecution);
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-invoices' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Entrada de NF');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/EntradaNotaFiscalRelatorio.htm');
    expect(wrapper.text()).toContain('Compras com referência de NF');
    expect(wrapper.text()).toContain('Fornecedores');
    expect(wrapper.text()).toContain('Valor comprado');
    expect(wrapper.text()).toContain('Valor recebido');
    expect(wrapper.text()).toContain('NF-2026-001');
    expect(wrapper.text()).toContain('Fornecedor Persistente');
    expect(wrapper.text()).toContain('purchase-report-1');
    expect(wrapper.text()).toContain('Aprovada');
    expect(wrapper.text()).toContain('não é documento fiscal');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'inventory-invoices',
      filters: {}
    });
    expect(inventoryService.list).not.toHaveBeenCalled();
    expect(inventoryService.listLots).not.toHaveBeenCalled();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
  });

  it.each([
    [null, '—'],
    ['2026-05-11T00:30:00.000Z', '11/05/2026'],
    ['2026-05-10T23:30:00-03:00', '11/05/2026']
  ])('formats invoice receipt date %s as a UTC calendar date', async (receivedAt, expected) => {
    const execution = inventoryInvoiceExecution as unknown as ReportExecutionDetail;
    vi.mocked(reportsService.execute).mockResolvedValue({
      ...execution,
      rows: [{ ...execution.rows[0], receivedAt }]
    });
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'inventory-invoices' } });
    await flushPromises();

    const receiptColumn = wrapper.findAll('th').findIndex(cell => cell.text() === 'Recebido em');
    expect(receiptColumn).toBeGreaterThanOrEqual(0);
    expect(wrapper.find('tbody tr').findAll('td')[receiptColumn]!.text()).toBe(expected);
  });

  it.each([
    ['inventory-stock', 'Cadastros', 'Data de cadastro dos produtos. Os saldos mostrados são atuais.', inventoryStockExecution],
    ['inventory-products', 'Cadastros', 'Data de cadastro dos produtos. Os saldos mostrados são atuais.', inventoryProductExecution],
    ['inventory-invoices', 'Compras', 'Data de criação da compra, independentemente do recebimento.', inventoryInvoiceExecution],
    ['inventory-movements', 'Movimentações', 'Data de registro da movimentação.', inventoryMovementExecution]
  ] as const)('labels %s periods by their persisted date without changing the API filters', async (reportKey, subject, hint, execution) => {
    vi.mocked(reportsService.execute).mockResolvedValue(execution);
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey } });
    await flushPromises();

    const labels = wrapper.findAll('label').map(label => label.text());
    expect(labels).toContain(`${subject} de`);
    expect(labels).toContain(`${subject} até`);
    expect(wrapper.find('.report-period-hint').text()).toBe(hint);
    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]!.setValue('2026-04-01');
    await dateInputs[1]!.setValue('2026-04-30');
    await wrapper.findAll('button').find(button => button.text() === 'Aplicar')!.trigger('click');
    await flushPromises();
    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: reportKey,
      filters: { dateFrom: '2026-04-01', dateTo: '2026-04-30' }
    });
    expect(inventoryService.list).not.toHaveBeenCalled();
    expect(inventoryService.listLots).not.toHaveBeenCalled();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('renders inventory products from the audited server report and does not load local lots', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(inventoryProductExecution);
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-products' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Relatório de Produtos');
    expect(wrapper.text()).toContain('Relatórios de Estoque');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).toContain('Produtos cadastrados e seus saldos atuais.');
    expect(wrapper.text()).toContain('Produtos cadastrados');
    expect(wrapper.text()).toContain('Com saldo');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('MED-001');
    expect(wrapper.text()).toContain('Dipirona Gotas');
    expect(wrapper.text()).toContain('Abaixo do mínimo');
    expect(wrapper.text()).toContain('VAC-010');
    expect(wrapper.text()).toContain('Vacina V10');
    expect(wrapper.text()).toContain('Com saldo');
    expect(wrapper.text()).not.toContain('Com lote');
    expect(wrapper.text()).not.toContain('Valor em estoque');
    expect(wrapper.text()).not.toContain('Abrir estoque');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).toHaveBeenCalledWith({
      reportId: 'inventory-products',
      filters: {}
    });
    expect(inventoryService.list).not.toHaveBeenCalled();
    expect(inventoryService.listLots).not.toHaveBeenCalled();
    expect(inventoryService.listConsumptions).not.toHaveBeenCalled();
  });

  it('renders persisted report dates as UTC calendar dates', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(inventoryProductExecution);
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-products' }
    });
    await flushPromises();

    const cells = wrapper.find('tbody tr').findAll('td');
    expect(cells[6]?.text()).toBe('08/04/2026');
    expect(cells[7]?.text()).toBe('08/04/2026');
  });

  it('forwards inventory product search and createdAt period filters to the server', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(inventoryProductExecution);
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'inventory-products' }
    });
    await flushPromises();

    const dateInputs = wrapper.findAll('input[type="date"]');
    await dateInputs[0]?.setValue('2026-04-01');
    await dateInputs[1]?.setValue('2026-04-30');
    await wrapper.find('input[placeholder="SKU ou nome do produto"]').setValue('MED-001');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Aplicar')
      ?.trigger('click');
    await flushPromises();

    expect(reportsService.execute).toHaveBeenLastCalledWith({
      reportId: 'inventory-products',
      filters: {
        search: 'MED-001',
        dateFrom: '2026-04-01',
        dateTo: '2026-04-30'
      }
    });
    expect(inventoryService.list).not.toHaveBeenCalled();
    expect(inventoryService.listLots).not.toHaveBeenCalled();
  });

  it('exports inventory products through the audited server-side report artifact', async () => {
    vi.mocked(reportsService.execute).mockResolvedValue(inventoryProductExecution);
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-inventory-products',
      accountId: 'account-1',
      executionId: 'rep-exec-inventory-products',
      format: 'csv',
      filename: 'inventory-products-rep-exec-inventory-products.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Código;Produto\nMED-001;Dipirona Gotas\nVAC-010;Vacina V10',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:inventory-products-report');
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'inventory-products' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenLastCalledWith({
        reportId: 'inventory-products',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith(
        'rep-exec-inventory-products',
        'csv'
      );
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 2 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders cash drawer financial report as read-only Vetus report', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cash-drawer' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Gaveta');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/GavetaRelatorio.htm');
    expect(wrapper.text()).toContain('Gavetas no período');
    expect(wrapper.text()).toContain('Saldo aberto');
    expect(wrapper.text()).toMatch(/R\$\s*500,00/);
    expect(wrapper.text()).not.toContain('Abrir caixa');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('renders cash flow financial report without using the operational cash-flow page', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'cash-flow' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Fluxo de Caixa');
    expect(wrapper.text()).toContain('Relatórios Financeiros');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Sistema/Relatorio/FluxoDeCaixaRelatorio.htm');
    expect(wrapper.text()).toContain('Receita comercial');
    expect(wrapper.text()).toContain('Recebíveis abertos');
    expect(wrapper.text()).toContain('Saldo aberto');
    expect(wrapper.text()).toContain('Receita comercial consolidada');
    expect(wrapper.text()).not.toContain('Gerar Fluxo');
    expect(administrativeReportsService.getHubs).toHaveBeenCalled();
  });

  it('keeps DRE unavailable without substituting commercial indicators or offering export', async () => {
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'dre' } });
    await flushPromises();
    expect(wrapper.text()).toContain('DRE - Demonstrativo de Resultados');
    expect(wrapper.text()).toContain('DRE indisponível');
    expect(wrapper.text()).not.toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Receita comercial');
    expect(wrapper.text()).not.toContain('Pipeline comercial');
    expect(wrapper.find('table').exists()).toBe(false);
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(reportsService.execute).not.toHaveBeenCalled();
    expect(packagesService.list).not.toHaveBeenCalled();
  });

  it('renders package records and their actual quantities instead of commercial totals', async () => {
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'packages' } });
    await flushPromises();
    expect(wrapper.text()).toContain('PKG-0042');
    expect(wrapper.text()).toContain('Ativo');
    const cells = wrapper.findAll('tbody tr')[0]!.findAll('td').map(cell => cell.text());
    expect(cells.slice(-2)).toEqual(['1', '3']);
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).not.toContain('Receita comercial relacionada');
    expect(wrapper.text()).not.toContain('Pipeline comercial relacionado');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(packagesService.list).toHaveBeenCalledOnce();
    await wrapper.findAll('input[type="date"]')[0]!.setValue('2026-04-29');
    expect(wrapper.text()).not.toContain('PKG-0042');
    await wrapper.findAll('input[type="date"]')[0]!.setValue('2026-04-28');
    expect(wrapper.text()).toContain('PKG-0042');
  });

  it('renders appointment audit report with Vetus filters and audit events only', async () => {
    const wrapper = mount(ReportWorkbenchPage, {
      props: { reportKey: 'audit-appointments' }
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Auditoria de Agendamentos');
    expect(wrapper.text()).toContain('Data início');
    expect(wrapper.text()).toContain('Data fim');
    expect(wrapper.text()).toContain('Cliente');
    expect(wrapper.text()).toContain('Usuário');
    expect(wrapper.text()).toContain('Ação');
    expect(wrapper.text()).toContain('Tipo');
    expect(wrapper.text()).toContain('Exportar CSV');
    expect(wrapper.text()).toContain('Cliente Maria teve horário do agendamento alterado');
    expect(wrapper.text()).toContain('appointment.updated');
    expect(wrapper.text()).not.toContain('PIX auditáveis');
    expect(wrapper.text()).not.toContain('Caixas recentes');
    expect(administrativeReportsService.getHubs).not.toHaveBeenCalled();
    expect(auditService.listEvents).toHaveBeenCalledWith({
      entityTypes: ['appointment', 'appointment-recommendation', 'appointment-sync'],
      limit: 200
    });
  });

  it('exports the loaded appointments report through the audited server artifact', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.mocked(reportsService.exportExecution).mockResolvedValue({
      id: 'rep-export-appointments',
      accountId: 'account-1',
      executionId: 'rep-exec-appointments',
      format: 'csv',
      filename: 'scheduling-appointments-rep-exec-appointments.csv',
      contentType: 'text/csv;charset=utf-8',
      contentEncoding: 'utf8',
      content: 'Agendamento;Status\napt-1;Concluído',
      exportedByUserId: 'user-1',
      exportedAt: '2026-05-20T00:00:00.000Z'
    });

    try {
      const wrapper = mount(ReportWorkbenchPage, {
        props: { reportKey: 'appointments' }
      });
      await flushPromises();

      const exportButton = wrapper
        .findAll('button')
        .find((button) => button.text() === 'Exportar CSV');
      expect(exportButton).toBeDefined();

      await exportButton?.trigger('click');
      await flushPromises();

      expect(reportsService.execute).toHaveBeenLastCalledWith({
        reportId: 'scheduling-appointments',
        filters: {}
      });
      expect(reportsService.exportExecution).toHaveBeenCalledWith('rep-exec-appointments', 'csv');
      expect(createObjectURL).toHaveBeenCalledOnce();
      expect(createObjectURL.mock.calls[0]?.[0]).toBeInstanceOf(Blob);
      expect(wrapper.text()).toContain('Exportação server-side auditada gerada com 3 linha(s).');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('keeps hub failure distinct from empty after dismissing the alert and supports retry', async () => {
    vi.mocked(administrativeReportsService.getHubs).mockRejectedValueOnce(new Error('Network unavailable'));
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'cash-flow' }, global: { stubs: { DsAlert: false } } });
    await flushPromises();
    expect(wrapper.text()).toContain('Não foi possível carregar o relatório');
    expect(wrapper.find('.report-summary').exists()).toBe(false);
    await wrapper.get('button[aria-label="Fechar alerta"]').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Não foi possível carregar o relatório');
    expect(wrapper.text()).not.toContain('Sem fluxo consolidado');
    expect(wrapper.findAll('button').find(b => b.text() === 'Exportar CSV')!.attributes('disabled')).toBeDefined();
    await wrapper.findAll('button').find(b => b.text() === 'Tentar novamente')!.trigger('click');
    await flushPromises();
    expect(administrativeReportsService.getHubs).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Receita comercial consolidada');
    expect(wrapper.find('.report-summary').exists()).toBe(true);
  });

  it('does not show zero indicators during hub loading but preserves an actual zero result', async () => {
    let resolve!: (value: AdministrativeReportsResponse) => void;
    vi.mocked(administrativeReportsService.getHubs).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'cash-flow' } });
    expect(wrapper.find('.report-summary').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Carregando dados da tabela"]').exists()).toBe(true);
    expect(wrapper.findAll('tbody tr').filter(row => row.text().includes('Receita comercial consolidada'))).toHaveLength(0);
    resolve({ ...report, executive: { ...report.executive, commercialRevenue: 0, outstandingReceivables: 0, openCashBalance: 0 } });
    await flushPromises();
    expect(wrapper.find('.report-summary').exists()).toBe(true);
    expect(wrapper.find('.report-summary').text()).toMatch(/R\$\s*0,00/);
  });

  it('ignores a late hub response after a newer query has completed', async () => {
    let resolve!: (value: AdministrativeReportsResponse) => void;
    vi.mocked(administrativeReportsService.getHubs).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'cash-flow' } });
    await wrapper.findAll('button').find(b => b.text() === 'Limpar')!.trigger('click');
    await flushPromises();
    expect(administrativeReportsService.getHubs).toHaveBeenCalledTimes(2);
    const current = wrapper.find('.report-summary').text();
    resolve({ ...report, executive: { ...report.executive, commercialRevenue: 987654 } });
    await flushPromises();
    expect(wrapper.find('.report-summary').text()).toBe(current);
    expect(wrapper.text()).not.toContain('987.654');
  });

  it('ignores a pending hub failure when the component switches to packages', async () => {
    let reject!: (error: Error) => void;
    vi.mocked(administrativeReportsService.getHubs).mockReturnValueOnce(new Promise((_done, fail) => { reject = fail; }));
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'cash-flow' } });
    await wrapper.setProps({ reportKey: 'packages' });
    await flushPromises();
    expect(wrapper.text()).toContain('PKG-0042');
    reject(new Error('Late unrelated failure'));
    await flushPromises();
    expect(wrapper.text()).toContain('PKG-0042');
    expect(wrapper.text()).not.toContain('Não foi possível carregar');
    expect(wrapper.findAll('button').find(b => b.text() === 'Exportar CSV')!.attributes('disabled')).toBeUndefined();
  });

  it('shows an unknown open cash balance as a dash after a successful hub response', async () => {
    vi.mocked(administrativeReportsService.getHubs).mockResolvedValueOnce({
      ...report, executive: { ...report.executive, openCashBalance: null }
    } as unknown as AdministrativeReportsResponse);
    const wrapper = mount(ReportWorkbenchPage, { props: { reportKey: 'cash-flow' } });
    await flushPromises();
    const balance = wrapper.findAll('.report-summary dl > div').find(item => item.text().includes('Saldo aberto'))!;
    expect(balance.get('dd').text()).toBe('—');
    const row = wrapper.findAll('tbody tr').find(item => item.text().includes('Saldo da gaveta aberta'));
    expect(row).toBeDefined();
    expect(row!.text()).toContain('—');
    expect(row!.text()).not.toMatch(/R\$\s*0,00/);
  });

  it('does not invent monetary totals for open or cancelled sales', async () => {
    const wrapper = mount(ReportWorkbenchPage, {props:{reportKey:'sales-counter-sales'}});
    await flushPromises();
    for (const label of ['Comandas em aberto','Vendas canceladas']) {
      const row = wrapper.findAll('tbody tr').find(row => row.text().includes(label));
      expect(row).toBeDefined();
      expect(row!.findAll('td')[1]!.text()).toBe('—');
    }
  });

  it('formats received and outstanding amounts as money in receivable records', async () => {
    const wrapper = mount(ReportWorkbenchPage, {props:{reportKey:'accounts-receivable'}});
    await flushPromises();
    const headers = wrapper.findAll('th').map(h => h.text());
    const row = wrapper.findAll('tbody tr')[0]!;
    for (const label of ['Recebido','Saldo']) {
      const index = headers.findIndex(h => h === label);
      expect(index).toBeGreaterThan(-1);
      expect(row.findAll('td')[index]!.text()).toContain('R$');
    }
  });

  it.each(['accounts-payable','accounts-receivable'] as const)('explains live filtering of loaded records in %s before exporting', async (reportKey) => {
    const wrapper = mount(ReportWorkbenchPage, {props:{reportKey}});
    await flushPromises();
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0);
    await wrapper.findAll('input[type="date"]')[0]!.setValue('2099-01-01');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.get('.report-query-note').text()).toContain('A tabela filtra os registros carregados;');
    expect(wrapper.get('.report-query-note').text()).not.toContain('mostra a última consulta');
    expect(reportsService.execute).not.toHaveBeenCalled();
  });

});

import { fork } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createServer as createNetServer } from 'node:net';

// Bounded visual evidence for selected frontend routes. The harness uses the
// real SPA and synthetic API responses; it does not mutate product code or
// promote snapshots.
const here = dirname(fileURLToPath(import.meta.url));
const root = process.cwd(); // Run from the repository root; archived relative roots are stale.
const app = join(root, 'apps/spa');
const local = createRequire(join(root, 'package.json'));
const spa = createRequire(join(app, 'package.json'));
const { chromium } = local('@playwright/test');
const { AxeBuilder } = local('@axe-core/playwright');
const { createServer } = await import(pathToFileURL(spa.resolve('vite')));
const vue = spa('@vitejs/plugin-vue').default;

async function assertLaboratoryA11y(page, target, state) {
  const axeResult = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze();
  assert.deepEqual(
    axeResult.violations,
    [],
    `Violacoes Axe em ${target}/${state}: ${JSON.stringify(axeResult.violations)}`
  );
  return {
    test: `laboratory-axe-${state}`,
    passed: true,
    axeViolations: 0,
    state
  };
}

async function assertAccessControlA11y(page, target, state) {
  const axeResult = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .analyze();
  assert.deepEqual(
    axeResult.violations,
    [],
    `Violacoes Axe em ${target}/${state}: ${JSON.stringify(axeResult.violations)}`
  );
  return {
    test: `access-control-axe-${state}`,
    passed: true,
    axeViolations: 0,
    state
  };
}

const childMode = process.argv[2] === '--serve';
const agendaContext = process.env.AGENDA_CONTEXT === '1';
const agendaPriority = process.env.AGENDA_PRIORITY === '1';
const agendaBaseline = process.env.AGENDA_BASELINE === '1';
const navigationContinuity = process.env.NAVIGATION_CONTINUITY === '1';
const patientContinuity = process.env.PATIENT_CONTINUITY === '1';
const successRedirectContinuity = process.env.SUCCESS_REDIRECT_CONTINUITY === '1';
const reducedMotionContinuity = process.env.REDUCED_MOTION_CONTINUITY === '1';
const receptionPopulated = process.env.RECEPTION_POPULATED === '1';
const duplicateContinuity = process.env.DUPLICATE_CONTINUITY === '1';
const laboratoryFeedback = process.env.LABORATORY_FEEDBACK === '1';
const laboratoryAnalyticalContinuity = process.env.LABORATORY_ANALYTICAL_CONTINUITY === '1';
const laboratoryAccessibility = process.env.LABORATORY_ACCESSIBILITY === '1';
const ownerFormProgressive = process.env.OWNER_FORM_PROGRESSIVE === '1';
const formZoomProxy = process.env.FORM_ZOOM_PROXY === '1';
const masterSearchContinuity = process.env.MASTER_SEARCH_CONTINUITY === '1';
const inpatientContinuity = process.env.INPATIENT_CONTINUITY === '1';
const cashContinuity = process.env.CASH_CONTINUITY === '1';
const inventoryContinuity = process.env.INVENTORY_CONTINUITY === '1';
const reportContinuity = process.env.REPORT_CONTINUITY === '1';
const usersContinuity = process.env.USERS_CONTINUITY === '1';
const accessibilityContinuity = process.env.ACCESSIBILITY_CONTINUITY === '1';
const accessControlContinuity = process.env.ACCESS_CONTROL_CONTINUITY === '1';
const dashboardContinuity = process.env.DASHBOARD_CONTINUITY === '1';
const medicalRecordContinuity = process.env.MEDICAL_RECORD_CONTINUITY === '1';
const patientDetailContinuity = process.env.PATIENT_DETAIL_CONTINUITY === '1';
const pixAttemptContinuity = process.env.PIX_ATTEMPT_CONTINUITY === '1';
const cashReceiptReversalContinuity = process.env.CASH_RECEIPT_REVERSAL_CONTINUITY === '1';
const patientBrowserContinuity = patientContinuity || successRedirectContinuity;
const agendaTargets = [
  '/appointments',
  '/agenda',
  '/agendamentos',
  '/atendimento/agenda',
  '/atendimento/atendimentos/agenda'
];
const laboratoryAnalyticalTargets = [
  '/laboratory/hemograms',
  '/laboratory/urinalysis',
  '/laboratory/biochemistry'
];
const evidenceRoot = join(here, 'evidence');
if (!childMode) mkdirSync(evidenceRoot, { recursive: true });
const out = childMode ? process.argv[3] : mkdtempSync(join(evidenceRoot, 'continuity-'));
if (successRedirectContinuity) mkdirSync(join(out, 'video'), { recursive: true });
const sha = (value) => createHash('sha256').update(value).digest('hex');
const inputs = [
  'apps/spa/src/pages/owners/OwnerFormPage.vue',
  'apps/spa/src/pages/reception/ReceptionGatewayPage.vue',
  'apps/spa/src/pages/sales/QuotesPage.vue',
  'apps/spa/src/composables/useListData.ts',
  'apps/spa/src/composables/useUnsavedChanges.ts',
  'apps/spa/src/composables/unsavedChangesCoordinator.ts',
  'packages/design-system/src/vue/DsButton.vue',
  'packages/design-system/src/vue/DsCard.vue',
  'packages/design-system/src/vue/DsInput.vue',
  'apps/spa/src/pages/appointments/AppointmentsListPage.vue',
  'apps/spa/src/pages/appointments/agendaContext.ts',
  'apps/spa/src/pages/appointments/__tests__/AppointmentsListPage.test.ts',
  'apps/spa/src/pages/appointments/__tests__/agendaContext.test.ts',
  'apps/spa/src/components/appointments/AppointmentDetailsDrawer.vue',
  'apps/spa/src/pages/patients/PatientFormPage.vue',
  'apps/spa/src/pages/patients/__tests__/PatientFormPage.test.ts',
  'apps/spa/src/pages/patients/PatientDetailPage.vue',
  'apps/spa/src/pages/patients/__tests__/PatientDetailPage.test.ts',
  'apps/spa/src/pages/patients/PatientsListPage.vue',
  'apps/spa/src/pages/patients/__tests__/PatientsListPage.test.ts',
  'apps/spa/src/pages/patients/usePatientCards.ts',
  'apps/spa/src/pages/patients/usePatientRelationship.ts',
  'apps/spa/src/pages/patients/usePatientWeightHistory.ts',
  'apps/spa/src/pages/owners/__tests__/OwnerFormPage.test.ts',
  'apps/spa/src/utils/duplicateConflict.ts',
  'apps/spa/src/pages/master-search/MasterSearchPage.vue',
  'apps/spa/src/pages/master-search/__tests__/MasterSearchPage.test.ts',
  'apps/spa/src/pages/inpatient/InpatientListPage.vue',
  'apps/spa/src/pages/inpatient/__tests__/InpatientListPage.test.ts',
  'apps/spa/src/pages/inpatient/BedBoardPage.vue',
  'apps/spa/src/pages/inpatient/__tests__/BedBoardPage.test.ts',
  'apps/spa/src/pages/inpatient/InpatientDetailPage.vue',
  'apps/spa/src/pages/inpatient/__tests__/InpatientDetailPage.test.ts',
  'apps/spa/src/components/AppDetailSection.vue',
  'apps/spa/src/services/inpatient.ts',
  'apps/spa/src/pages/finance/CashPage.vue',
  'apps/spa/src/pages/finance/__tests__/CashPage.test.ts',
  'apps/spa/src/services/cash.ts',
  'apps/spa/src/services/api.ts',
  'apps/spa/src/pages/inventory/InventoryListPage.vue',
  'apps/spa/src/pages/inventory/__tests__/InventoryListPage.test.ts',
  'apps/spa/src/pages/inventory/InventoryPurchasesPage.vue',
  'apps/spa/src/pages/inventory/__tests__/InventoryPurchasesPage.test.ts',
  'apps/spa/src/services/inventory.ts',
  'apps/spa/src/pages/reports/ReportWorkbenchPage.vue',
  'apps/spa/src/pages/reports/reportWorkbenchModels.ts',
  'apps/spa/src/pages/reports/reportWorkbenchSpecs.ts',
  'apps/spa/src/pages/reports/__tests__/ReportWorkbenchPage.test.ts',
  'apps/spa/src/services/reports.ts',
  'apps/spa/src/services/download.ts',
  'apps/spa/src/utils/report-export.ts',
  'apps/spa/src/components/DataTable.vue',
  'apps/spa/src/components/__tests__/DataTable.test.ts',
  'apps/spa/src/pages/users/UsersListPage.vue',
  'apps/spa/src/pages/users/__tests__/UsersListPage.test.ts',
  'apps/spa/src/services/user.ts',
  'apps/spa/src/pages/access-control/AccessControlPage.vue',
  'apps/spa/src/pages/access-control/__tests__/AccessControlPage.test.ts',
  'apps/spa/src/services/accessControl.ts',
  'apps/api/src/routes/access-control-routes.ts',
  'apps/api/src/routes/reports-routes.ts',
  'apps/api/src/server.ts',
  'apps/api/src/request-boundaries.ts',
  'packages/modules/reports/src/index.ts',
  'packages/modules/financial/src/advance-payments-report.ts',
  'apps/api/src/repositories/database-advance-payments-report.repository.ts',
  'apps/spa/src/router/setup-guard.test.ts',
  'packages/design-system/src/vue/DsModal.vue',
  'packages/design-system/src/vue/__tests__/DsModal.test.ts',
  'apps/spa/src/pages/DashboardPage.vue',
  'apps/spa/src/pages/__tests__/DashboardPage.test.ts',
  'apps/spa/src/navigation.ts',
  'apps/spa/src/navigation-permissions.ts',
  'apps/spa/src/pages/medical-records/MedicalRecordsDetailPage.vue',
  'apps/spa/src/pages/medical-records/__tests__/MedicalRecordsDetailPage.test.ts',
  'apps/spa/src/services/medicalRecords.ts',
  'apps/spa/src/services/attachments.ts',
  'apps/spa/src/services/appointment.ts',
  'apps/spa/src/services/billing.ts',
  'apps/spa/src/services/encounter.ts',
  'apps/spa/src/pages/encounters/EncounterDetailPage.vue',
  'apps/spa/src/components/finance/EncounterPixPaymentPanel.vue',
  'apps/spa/src/components/finance/__tests__/EncounterPixPaymentPanel.test.ts',
  'apps/spa/src/services/pix.ts',
  'apps/spa/src/services/prescriptions.ts',
  'apps/spa/src/services/quotes.ts',
  'apps/spa/src/services/triage.ts',
  'apps/spa/src/services/vaccinesDewormers.ts',
  'apps/spa/src/services/diagnostics.ts',
  'apps/spa/src/pages/laboratory/LaboratoryOrdersPage.vue',
  'apps/spa/src/pages/laboratory/__tests__/LaboratoryOrdersPage.test.ts',
  'apps/spa/src/pages/laboratory/LaboratoryResultsPage.vue',
  'apps/spa/src/pages/laboratory/__tests__/LaboratoryResultsPage.test.ts',
  'apps/spa/src/components/laboratory/LaboratoryAnalyticalWorkbench.vue',
  'apps/spa/src/services/laboratory.ts',
  'apps/api/src/routes/laboratory-routes.ts',
  'apps/api/src/routes/laboratory-routes.test.ts',
  'packages/modules/diagnostics/src/laboratory.ts',
  'packages/modules/diagnostics/src/diagnostics.test.ts',
  'apps/spa/src/services/ml.ts',
  'apps/spa/src/components/AppPageHeader.vue',
  'apps/spa/src/components/EmptyState.vue',
  'apps/spa/src/composables/successRedirect.ts',
  'apps/spa/src/composables/useFormValidation.ts',
  'apps/spa/src/services/scheduling.ts',
  'apps/spa/src/services/services.ts',
  'apps/spa/src/services/owner.ts',
  'apps/spa/src/services/patient.ts',
  'apps/spa/src/router/routes.ts',
  'apps/spa/src/router/index.ts',
  'apps/spa/src/router/scroll-behavior.ts',
  'apps/spa/src/composables/useRouteFocus.ts',
  'apps/spa/src/layouts/AppLayout.vue',
  'apps/spa/src/stores/theme.ts',
  'apps/spa/src/navigation-permission-catalog.ts',
  'apps/spa/src/styles/main.css',
  'packages/design-system/src/tokens/variables.css'
];
const pin = () =>
  Object.fromEntries(
    inputs
      .filter(
        (path) =>
          !navigationContinuity || path !== 'apps/spa/src/pages/reception/ReceptionGatewayPage.vue'
      )
      .map((path) => [path, sha(readFileSync(join(root, path)))])
  );
const before = pin();

const alias = {
  '@': join(app, 'src'),
  '@cvg-his-v2/design-system/vue': join(root, 'packages/design-system/src/vue'),
  '@cvg-his-v2/design-system/src/vue': join(root, 'packages/design-system/src/vue'),
  '@cvg-his-v2/design-system/src/tokens': join(root, 'packages/design-system/src/tokens'),
  '@cvg-his-v2/shared-auth-sdk': join(root, 'packages/shared/auth-sdk/src/index.ts'),
  '@cvg-his-v2/shared-config': join(root, 'packages/shared/config/src/index.ts'),
  'virtual:pwa-register/vue': join(app, 'src/test-support/pwa-register-disabled.ts')
};

function addDays(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function makeOverview(referenceDate) {
  const nextDate = addDays(referenceDate);
  return {
    viewMode: 'day',
    windowStart: `${referenceDate}T00:00:00.000Z`,
    windowEnd: `${nextDate}T00:00:00.000Z`,
    stats: {
      total: 2,
      scheduled: 1,
      checkedIn: 1,
      completed: 0,
      cancelled: 0,
      conflicts: 1,
      unassigned: 0
    },
    professionals: [
      {
        id: 'staff-vet',
        fullName: 'Veterinário Responsável',
        department: 'Clínica',
        jobTitle: 'Médico Veterinário',
        specialty: 'Clínico geral',
        unit: 'Clínica',
        status: 'active'
      }
    ],
    blocks: [
      {
        id: 'block-1',
        accountId: 'synthetic-account',
        title: 'Intervalo operacional',
        kind: 'lunch_break',
        startsAt: `${referenceDate}T12:00:00.000Z`,
        endsAt: `${referenceDate}T13:00:00.000Z`,
        practitionerStaffId: 'staff-vet',
        unit: 'Clínica'
      }
    ],
    filterOptions: {
      units: ['Clínica'],
      specialties: ['Clínico geral'],
      statuses: ['scheduled', 'checked_in', 'completed', 'cancelled']
    },
    items: [
      {
        id: 'synthetic-appt-1',
        accountId: 'synthetic-account',
        patientId: 'synthetic-patient-1',
        ownerId: 'synthetic-owner-1',
        scheduledAt: `${referenceDate}T09:00:00.000Z`,
        endsAt: `${referenceDate}T09:30:00.000Z`,
        durationMinutes: 30,
        visitType: 'scheduled',
        reason: 'Consulta de rotina',
        practitionerStaffId: 'staff-vet',
        practitionerName: 'Veterinário Responsável',
        unit: 'Clínica',
        specialty: 'Clínico geral',
        status: 'scheduled',
        conflicts: [],
        operational: {
          stage: 'scheduled',
          label: 'Agendado',
          source: 'appointment',
          updatedAt: `${referenceDate}T08:00:00.000Z`
        },
        createdAt: `${referenceDate}T08:00:00.000Z`,
        updatedAt: `${referenceDate}T08:00:00.000Z`
      },
      {
        id: 'synthetic-appt-2',
        accountId: 'synthetic-account',
        patientId: 'synthetic-patient-2',
        ownerId: 'synthetic-owner-2',
        scheduledAt: `${referenceDate}T10:00:00.000Z`,
        endsAt: `${referenceDate}T10:30:00.000Z`,
        durationMinutes: 30,
        visitType: 'return',
        reason: 'Retorno',
        practitionerStaffId: 'staff-vet',
        practitionerName: 'Veterinário Responsável',
        unit: 'Clínica',
        specialty: 'Clínico geral',
        status: 'checked_in',
        conflicts: [
          {
            type: 'staff_overlap',
            severity: 'critical',
            message: 'Conflito operacional',
            startsAt: `${referenceDate}T10:00:00.000Z`,
            endsAt: `${referenceDate}T10:30:00.000Z`,
            appointmentId: 'synthetic-appt-2'
          }
        ],
        operational: {
          stage: 'in_triage',
          label: 'Em triagem',
          source: 'queue',
          queueEntryId: 'queue-1',
          queueStatus: 'in_triage',
          encounterId: 'enc-2',
          updatedAt: `${referenceDate}T10:05:00.000Z`
        },
        createdAt: `${referenceDate}T09:00:00.000Z`,
        updatedAt: `${referenceDate}T09:00:00.000Z`
      }
    ]
  };
}

const dashboardProfiles = {
  reception: {
    roleCodes: ['reception'],
    permissionCodes: ['owners.read', 'patients.read', 'scheduling.read']
  },
  nurse: {
    roleCodes: ['nurse'],
    permissionCodes: ['triage.read', 'inpatient.read', 'diagnostics.read', 'medical-records.read']
  },
  veterinarian: {
    roleCodes: ['veterinarian'],
    permissionCodes: ['medical-records.read', 'encounters.read', 'diagnostics.read']
  },
  finance: {
    roleCodes: ['finance'],
    permissionCodes: ['billing.read', 'billing.manage', 'counter_sale.read']
  },
  admin: {
    roleCodes: ['admin'],
    permissionCodes: [
      'audit.read',
      'access.read',
      'users.manage',
      'integrations.read',
      'owners.read',
      'patients.read',
      'scheduling.read',
      'scheduling.manage',
      'encounters.read',
      'medical-records.read',
      'triage.read',
      'inpatient.read',
      'diagnostics.read',
      'inventory.read',
      'product.read',
      'counter_sale.read',
      'billing.read',
      'billing.manage'
    ]
  }
};

function dashboardProfileForTarget(target) {
  if (!dashboardContinuity || !target.startsWith('/?profile=')) return null;
  const profile = new URL(`http://dashboard.local${target}`).searchParams.get('profile');
  return dashboardProfiles[profile] ? { key: profile, ...dashboardProfiles[profile] } : null;
}

if (childMode) {
  const reservation = createNetServer();
  await new Promise((resolveListen) => reservation.listen(0, '127.0.0.1', resolveListen));
  const ownedPort = reservation.address().port;
  await new Promise((resolveClose) => reservation.close(resolveClose));
  const server = await createServer({
    configFile: false,
    envFile: false,
    root: app,
    cacheDir: join(out, 'vite-cache'),
    plugins: [vue()],
    resolve: { alias },
    define: {
      'import.meta.env.VITE_DISABLE_PWA': '"true"',
      'import.meta.env.VITE_API_BASE_URL': '""'
    },
    server: { host: '127.0.0.1', port: ownedPort, strictPort: true, fs: { allow: [root] } },
    logLevel: 'warn'
  });
  await server.listen();
  const port = server.httpServer.address().port;
  const origin = `http://127.0.0.1:${port}`;

  process.send({ origin, port });
  process.on('message', async (message) => {
    if (message === 'close') {
      await server.close();
      process.exit(0);
    }
  });
} else {
  const child = fork(fileURLToPath(import.meta.url), ['--serve', out], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
  let serverLog = '';
  child.stdout.on('data', (chunk) => {
    serverLog += chunk;
  });
  child.stderr.on('data', (chunk) => {
    serverLog += chunk;
  });
  const { origin, port } = await new Promise((resolveReady, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Owned Vite launch timed out'));
    }, 30000);
    child.once('message', (message) => {
      clearTimeout(timeout);
      resolveReady(message);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Owned Vite exited ${code}: ${serverLog}`));
    });
  });
  writeFileSync(
    join(out, 'launch.json'),
    JSON.stringify(
      {
        origin,
        port,
        pid: child.pid,
        scope: 'Current SPA; synthetic API/auth; owned Vite subprocess; no backend claim'
      },
      null,
      2
    )
  );
  let browser;
  const rows = [];
  const failures = [];
  const recordedVideos = [];
  try {
    browser = await chromium.launch({ headless: true });
    const accessibilityWidths = [320, 375, 390, 768, 1024, 1280, 1440];
    const targetWidths = accessibilityContinuity
      ? accessibilityWidths
      : formZoomProxy && (patientBrowserContinuity || ownerFormProgressive)
        ? [1440, 390, 195]
      : agendaContext
        ? [1440, 768, 390]
        : [1440, 390];
    for (const target of dashboardContinuity
      ? [
          '/?profile=reception',
          '/?profile=nurse',
          '/?profile=veterinarian',
          '/?profile=finance',
          '/?profile=admin'
        ]
                          : cashReceiptReversalContinuity
                            ? ['/encounters/synthetic-encounter']
                            : pixAttemptContinuity
                            ? ['/encounters/synthetic-encounter']
                            : medicalRecordContinuity
        ? ['/medical-records/synthetic-encounter']
        : patientDetailContinuity
          ? ['/patients/synthetic-patient-1']
                        : accessControlContinuity
                          ? ['/access-control']
                          : usersContinuity
                            ? navigationContinuity
                              ? ['/owners/new', '/users']
                              : ['/users']
                          : accessibilityContinuity
              ? ['/owners', '/appointments', '/reports/inventory', '/access-control']
              : masterSearchContinuity
                ? ['/master-search']
                : inpatientContinuity
                  ? [
                      '/inpatient',
                      '/inpatient/board',
                      '/inpatient/synthetic-inpatient-stay',
                      '/beds/synthetic-bed-occupied'
                    ]
                  : cashContinuity
                    ? ['/cash']
                    : inventoryContinuity
                      ? ['/inventory', '/inventory/purchases']
                      : reportContinuity
                        ? [
                            '/reports/inventory',
                            '/reports/accounts-payable',
                            '/reports/accounts-receivable',
                            '/reports/advance-payments'
                          ]
                        : laboratoryFeedback || laboratoryAnalyticalContinuity
                          ? [
                              '/laboratory/orders',
                              '/laboratory/results',
                              ...(laboratoryAnalyticalContinuity ? laboratoryAnalyticalTargets : [])
                            ]
                          : agendaContext
                            ? agendaTargets
                            : agendaPriority || agendaBaseline
                              ? ['/appointments']
                            : duplicateContinuity
                              ? ['/owners/new', '/patients/new']
                            : patientBrowserContinuity
                              ? ['/patients/new']
                              : ownerFormProgressive
                                ? ['/owners/new']
                                : navigationContinuity
                                  ? ['/owners/new', '/users']
                                : receptionPopulated
                                  ? ['/reception']
                                  : ['/owners/new', '/reception', '/appointments', '/quotes'])
      for (const theme of ['light', 'dark'])
        for (const width of targetWidths) {
          if (target === '/quotes' && (width !== 1440 || theme !== 'light')) continue;
          const height = width === 195 ? 422 : width === 390 ? 844 : 900;
          const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 1,
            locale: 'pt-BR',
            timezoneId: 'America/Sao_Paulo',
            colorScheme: theme,
            reducedMotion:
              accessibilityContinuity || reducedMotionContinuity ? 'reduce' : 'no-preference',
            ...(successRedirectContinuity
              ? { recordVideo: { dir: join(out, 'video') } }
              : {})
          });
          await context.addInitScript(
            (theme) => localStorage.setItem('cvg-his-v2:theme', theme),
            theme
          );
          if (dashboardContinuity) {
            const dashboardProfile = dashboardProfileForTarget(target);
            await context.addInitScript((profile) => {
              localStorage.setItem(
                'cvg-his-v2:spa:recent-routes',
                JSON.stringify([
                  { path: '/audit', label: 'Auditoria persistida', icon: 'shield' },
                  { path: '/appointments', label: 'Agenda persistida', icon: 'calendar' },
                  { path: '/medical-records', label: 'Prontuário persistido', icon: 'clipboard' }
                ])
              );
              localStorage.setItem(
                'cvg-his-v2:spa:favorite-routes',
                JSON.stringify(['/audit', '/appointments', '/medical-records'])
              );
            }, dashboardProfile?.key ?? 'unknown');
          }
          if (successRedirectContinuity) {
            await context.addInitScript(() => {
              const trace = {
                raf: [],
                routePushes: [],
                pendingObserved: null,
                pendingObserver: null
              };
              Object.defineProperty(window, '__cvgMotionTrace', {
                configurable: true,
                value: trace
              });
              const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
              window.requestAnimationFrame = (callback) => {
                const scheduledAt = performance.now();
                return nativeRequestAnimationFrame((timestamp) => {
                  trace.raf.push({
                    scheduledAt,
                    executedAt: performance.now(),
                    timestamp
                  });
                  callback(timestamp);
                });
              };
              const nativePushState = history.pushState.bind(history);
              history.pushState = (state, title, url) => {
                trace.routePushes.push({ at: performance.now(), url: String(url ?? '') });
                return nativePushState(state, title, url);
              };
            });
          }
          const page = await context.newPage();
          if (
            laboratoryFeedback ||
            laboratoryAnalyticalContinuity ||
            inpatientContinuity ||
            cashContinuity ||
            inventoryContinuity ||
            reportContinuity ||
            accessibilityContinuity ||
            accessControlContinuity ||
            usersContinuity ||
            medicalRecordContinuity ||
            patientDetailContinuity ||
            pixAttemptContinuity ||
            cashReceiptReversalContinuity ||
            duplicateContinuity ||
            successRedirectContinuity
          ) {
            page.setDefaultTimeout(5000);
            page.setDefaultNavigationTimeout(10000);
          }
          const errors = [];
          const requests = [];
          let releaseOldQuote;
          let releaseOldReception;
          let patientSaveAttempts = 0;
          let duplicateOwnerSaveAttempts = 0;
          let duplicatePatientSaveAttempts = 0;
          let laboratoryOrdersAttempts = 0;
          let laboratoryResultsAttempts = 0;
          let inpatientListAttempts = 0;
          let inpatientListInitialFailureAttempts = 0;
          let inpatientListResetApplied = false;
          let bedMapAttempts = 0;
          let bedMapInitialFailureAttempts = 0;
          let bedMapResetApplied = false;
          let inpatientDetailAttempts = 0;
          let inpatientDetailInitialFailureAttempts = 0;
          let inpatientDetailResetApplied = false;
          let inpatientModalFixtureActive = false;
          let cashDashboardAttempts = 0;
          let cashMovementAttempts = 0;
          let cashCloseAttempts = 0;
          let cashClosed = false;
          let cashReceiptReversed = false;
          let inventoryItemsAttempts = 0;
          let inventoryLotsAttempts = 0;
          let inventoryPurchasesAttempts = 0;
          let reportExecutionAttempts = 0;
          let reportExportAttempts = 0;
          let lastReportExportExecutionId = null;
          let reportFailureInjected = false;
          let accessCatalogAttempts = 0;
          let usersAttempts = 0;
          let refreshAttempts = 0;
          let permissionRevoked = false;
          let laboratoryReferenceAttempts = 0;
          let medicalEntrySaveAttempts = 0;
          let attachmentOpenAttempts = 0;
          let pixAttemptGetAttempts = 0;
          const quote = (number) => ({
            id: number,
            accountId: 'synthetic-account',
            number,
            ownerId: null,
            status: 'draft',
            validUntil: null,
            subtotal: 10,
            discountAmount: 0,
            total: 10,
            notes: null,
            createdByUserId: 'synthetic-operator',
            convertedToSaleId: null,
            convertedAt: null,
            createdAt: '2026-09-06T12:00:00Z',
            updatedAt: '2026-09-06T12:00:00Z'
          });
          const cashDashboard = (phase = 'initial') => {
            const closed = phase === 'closed';
            const total = closed ? 0 : phase === 'updated' ? 250 : 200;
            return {
              generatedAt: '2026-09-07T09:00:00Z',
              openRegister: closed
                ? null
                : {
                    id: 'synthetic-cash-register',
                    status: 'open',
                    openedAt: '2026-09-07T08:00:00Z',
                    openingAmount: 120,
                    runningBalance: total,
                    notes: 'Abertura sintética'
                  },
              lastClosedRegister: closed
                ? {
                    id: 'synthetic-closed-register',
                    openedAt: '2026-09-06T08:00:00Z',
                    closedAt: '2026-09-06T18:00:00Z',
                    closingAmount: 180,
                    expectedClosingAmount: 180,
                    difference: 0
                  }
                : null,
              totals: { totalEntradas: total, totalSaidas: 0, totalEmGaveta: total },
              byPaymentMethod: closed
                ? []
                : [{ method: 'Dinheiro', amount: total, count: phase === 'updated' ? 3 : 2 }],
              movements: closed
                ? []
                : [
                    {
                      id: 'synthetic-cash-movement',
                      cashRegisterId: 'synthetic-cash-register',
                      movementType: 'supply',
                      movementTypeLabel: 'Entrada',
                      amount: total,
                      runningBalance: total,
                      reference: 'Caixa sintético',
                      notes: 'Movimento confirmado',
                      paymentMethod: 'Dinheiro',
                      createdAt: '2026-09-07T08:30:00Z'
                    }
                  ],
              recentRegisters: []
            };
          };
          const inventoryItems = (query = '') => {
            const items = [
              {
                id: 'synthetic-inventory-low',
                accountId: 'synthetic-account',
                sku: 'MED-001',
                name: 'Dipirona Injetável',
                unit: 'ampola',
                onHandQuantity: 4,
                reorderLevel: 8,
                unitCostAmount: 12.5,
                createdAt: '2026-09-01T00:00:00Z',
                updatedAt: '2026-09-07T00:00:00Z'
              },
              {
                id: 'synthetic-inventory-normal',
                accountId: 'synthetic-account',
                sku: 'MAT-014',
                name: 'Gaze Estéril',
                unit: 'pacote',
                onHandQuantity: 60,
                reorderLevel: 10,
                unitCostAmount: 4.2,
                createdAt: '2026-09-01T00:00:00Z',
                updatedAt: '2026-09-07T00:00:00Z'
              },
              {
                id: 'synthetic-inventory-liquid',
                accountId: 'synthetic-account',
                sku: 'SAN-250',
                name: 'Solução de limpeza',
                unit: 'frasco 250 mL',
                onHandQuantity: 2,
                reorderLevel: 5,
                unitCostAmount: 18.75,
                createdAt: '2026-09-01T00:00:00Z',
                updatedAt: '2026-09-07T00:00:00Z'
              }
            ];
            const normalized = query
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toLowerCase();
            return normalized
              ? items.filter((item) =>
                  `${item.sku} ${item.name} ${item.unit}`
                    .normalize('NFD')
                    .replace(/\p{Diacritic}/gu, '')
                    .toLowerCase()
                    .includes(normalized)
                )
              : items;
          };
          const inventoryLots = [
            {
              id: 'synthetic-lot-active',
              accountId: 'synthetic-account',
              inventoryItemId: 'synthetic-inventory-low',
              sku: 'MED-001',
              itemName: 'Dipirona Injetável',
              lotNumber: 'DIP-260901',
              quantity: 4,
              unit: 'ampola',
              location: 'Farmácia A2',
              supplier: 'PharmaVet',
              manufactureDate: '2026-08-01T00:00:00Z',
              expiryDate: '2027-07-30T00:00:00Z',
              status: 'active',
              createdAt: '2026-09-01T00:00:00Z',
              updatedAt: '2026-09-07T00:00:00Z'
            },
            {
              id: 'synthetic-lot-expired',
              accountId: 'synthetic-account',
              inventoryItemId: 'synthetic-inventory-normal',
              sku: 'MAT-014',
              itemName: 'Gaze Estéril',
              lotNumber: 'GAZ-OLD',
              quantity: 1,
              unit: 'pacote',
              location: 'Ajuste',
              supplier: 'VetSurgical',
              manufactureDate: '2025-12-20T00:00:00Z',
              expiryDate: '2026-08-01T00:00:00Z',
              status: 'expired',
              createdAt: '2026-09-01T00:00:00Z',
              updatedAt: '2026-09-07T00:00:00Z'
            }
          ];
          const inventoryPurchases = [
            {
              id: 'synthetic-purchase',
              accountId: 'synthetic-account',
              supplierName: 'Distribuidora CVG',
              invoiceNumber: 'NF-2026-0042',
              status: 'draft',
              totalAmount: 25,
              receivedAmount: 0,
              payableId: null,
              lines: [
                {
                  id: 'synthetic-purchase-line',
                  purchaseId: 'synthetic-purchase',
                  inventoryItemId: 'synthetic-inventory-low',
                  sku: 'MED-001',
                  itemName: 'Dipirona Injetável',
                  orderedQuantity: 2,
                  receivedQuantity: 0,
                  unit: 'ampola',
                  unitCostAmount: 12.5,
                  lotNumber: 'DIP-NEW',
                  expiryDate: null,
                  manufactureDate: null,
                  location: null,
                  supplier: 'Distribuidora CVG'
                }
              ],
              createdByUserId: 'synthetic-operator',
              approvedByUserId: null,
              createdAt: '2026-09-02T00:00:00Z',
              updatedAt: '2026-09-02T00:00:00Z',
              receivedAt: null
            }
          ];
          const reportStockRows = (search = '') => {
            const normalized = search
              .normalize('NFD')
              .replace(/\p{Diacritic}/gu, '')
              .toLowerCase();
            if (normalized.includes('ausente')) return [];
            return [
              {
                sku: 'MED-001',
                name: 'Dipirona Injetável',
                unit: 'ampola',
                onHandQuantity: 4,
                reorderLevel: 8,
                unitCostAmount: 12.5,
                stockValue: 50,
                reorderStatus: 'below_reorder_level',
                createdAt: '2026-09-01T23:30:00Z',
                updatedAt: '2026-09-07T03:00:00Z'
              }
            ];
          };
          const reportExecution = (filters = {}) => {
            const rows = reportStockRows(typeof filters.search === 'string' ? filters.search : '');
            return {
              id: `synthetic-report-execution-${reportExecutionAttempts}`,
              accountId: 'synthetic-account',
              reportId: 'inventory-stock',
              requestedByUserId: 'synthetic-operator',
              status: 'completed',
              filters,
              rowCount: rows.length,
              generatedAt: '2026-09-07T09:00:00Z',
              expiresAt: '2026-09-08T09:00:00Z',
              columns: [
                { key: 'sku', label: 'Código', type: 'string' },
                { key: 'name', label: 'Produto', type: 'string' },
                { key: 'onHandQuantity', label: 'Saldo', type: 'number' },
                { key: 'unit', label: 'Unidade', type: 'string' },
                { key: 'reorderLevel', label: 'Mínimo', type: 'number' },
                { key: 'unitCostAmount', label: 'Custo unit.', type: 'currency' },
                { key: 'stockValue', label: 'Valor estoque', type: 'currency' },
                { key: 'reorderStatus', label: 'Situação reposição', type: 'status' },
                { key: 'createdAt', label: 'Cadastro', type: 'date' },
                { key: 'updatedAt', label: 'Atualização', type: 'date' }
              ],
              rows
            };
          };
          const reportFinancialRows = (reportId, filters = {}) => {
            const rows = reportId === 'financial-payables'
              ? [
                  {
                    supplierName: 'Distribuidora CVG',
                    description: 'NF-2026-0042',
                    category: 'Compras',
                    issuedAt: '2026-09-01',
                    dueAt: '2026-09-07',
                    totalAmount: 1250,
                    paidAmount: 250,
                    outstandingAmount: 1000,
                    status: 'open',
                    paymentMethod: null,
                    reconciliationStatus: 'not_required'
                  },
                  {
                    supplierName: 'Laboratório parceiro',
                    description: 'Serviços de análise',
                    category: 'Serviços',
                    issuedAt: '2026-09-02',
                    dueAt: '2026-09-10',
                    totalAmount: 400,
                    paidAmount: 400,
                    outstandingAmount: 0,
                    status: 'paid',
                    paymentMethod: 'bank_transfer',
                    reconciliationStatus: 'pending'
                  }
                ]
              : reportId === 'financial-advance-payments'
                ? [
                    {
                      paymentId: 'advance-1',
                      ownerName: 'Tutor Financeiro',
                      documentId: '123.456.789-00',
                      issuedAt: '2026-09-01T09:00:00.000Z',
                      originalAmount: 300,
                      compensatedAmount: 100,
                      balance: 200,
                      origin: 'cash_receipt',
                      status: 'partially_compensated',
                      notes: 'Crédito sintético parcialmente compensado'
                    },
                    {
                      paymentId: 'advance-2',
                      ownerName: 'Tutor Disponível',
                      documentId: '987.654.321-00',
                      issuedAt: '2026-09-02T10:30:00.000Z',
                      originalAmount: 150,
                      compensatedAmount: 0,
                      balance: 150,
                      origin: 'pix',
                      status: 'available',
                      notes: 'Crédito sintético disponível'
                    }
                  ]
                : [
                  {
                    patientName: 'Paciente Financeiro',
                    ownerName: 'Tutor Financeiro',
                    patientSpecies: 'Canino',
                    encounterId: 'synthetic-encounter-financial',
                    installmentNumber: 1,
                    installmentLabel: 'Parcela 1/1',
                    issuedAt: '2026-09-01',
                    dueAt: '2026-09-07',
                    settledAt: null,
                    amountOriginal: 650,
                    amountPaid: 150,
                    amountOutstanding: 500,
                    status: 'open',
                    financialStatus: 'partial',
                    encounterStatus: 'open',
                    paymentCount: 1
                  },
                  {
                    patientName: 'Paciente Liquidado',
                    ownerName: 'Tutor Liquidado',
                    patientSpecies: 'Felino',
                    encounterId: 'synthetic-encounter-settled',
                    installmentNumber: 1,
                    installmentLabel: 'Parcela 1/1',
                    issuedAt: '2026-09-02',
                    dueAt: '2026-09-08',
                    settledAt: '2026-09-05T14:30:00Z',
                    amountOriginal: 420,
                    amountPaid: 420,
                    amountOutstanding: 0,
                    status: 'settled',
                    financialStatus: 'paid',
                    encounterStatus: 'closed',
                    paymentCount: 1
                  }
                ];
            if (reportId === 'financial-payables' && filters.status) {
              return rows.filter((row) => row.status === filters.status);
            }
            if (reportId === 'financial-receivables' && filters.status) {
              return rows.filter((row) => row.status === filters.status);
            }
            if (reportId === 'financial-advance-payments' && filters.status) {
              return rows.filter((row) => row.status === filters.status);
            }
            if (reportId === 'financial-advance-payments' && filters.search) {
              const search = String(filters.search).toLowerCase();
              return rows.filter(
                (row) =>
                  row.ownerName.toLowerCase().includes(search) ||
                  row.documentId.toLowerCase().includes(search)
              );
            }
            return rows;
          };
          const reportIdForTarget = (target) =>
            target === '/reports/accounts-payable'
              ? 'financial-payables'
              : target === '/reports/accounts-receivable'
                ? 'financial-receivables'
                : 'financial-advance-payments';
          const reportFinancialColumns = (reportId) => {
            const columns = {
              'financial-payables': [
                { key: 'supplierName', label: 'Fornecedor', type: 'string' },
                { key: 'description', label: 'Descrição', type: 'string' },
                { key: 'category', label: 'Categoria', type: 'string' },
                { key: 'issuedAt', label: 'Emissão', type: 'date' },
                { key: 'dueAt', label: 'Vencimento', type: 'date' },
                { key: 'totalAmount', label: 'Total', type: 'currency' },
                { key: 'paidAmount', label: 'Pago', type: 'currency' },
                { key: 'outstandingAmount', label: 'A Pagar', type: 'currency' },
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'paymentMethod', label: 'Método', type: 'string' },
                { key: 'reconciliationStatus', label: 'Reconciliação', type: 'status' }
              ],
              'financial-receivables': [
                { key: 'patientName', label: 'Paciente', type: 'string' },
                { key: 'ownerName', label: 'Nome do tutor', type: 'string' },
                { key: 'patientSpecies', label: 'Espécie', type: 'string' },
                { key: 'encounterId', label: 'Atendimento', type: 'string' },
                { key: 'installmentNumber', label: 'Parcela', type: 'number' },
                { key: 'installmentLabel', label: 'Descrição da parcela', type: 'string' },
                { key: 'issuedAt', label: 'Emissão', type: 'date' },
                { key: 'dueAt', label: 'Vencimento', type: 'date' },
                { key: 'settledAt', label: 'Liquidação', type: 'datetime' },
                { key: 'amountOriginal', label: 'Original', type: 'currency' },
                { key: 'amountPaid', label: 'Recebido', type: 'currency' },
                { key: 'amountOutstanding', label: 'Saldo', type: 'currency' },
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'financialStatus', label: 'Status financeiro', type: 'status' },
                { key: 'encounterStatus', label: 'Atendimento', type: 'status' },
                { key: 'paymentCount', label: 'Pagamentos', type: 'number' }
              ],
              'financial-advance-payments': [
                { key: 'paymentId', label: 'Pagamento', type: 'string' },
                { key: 'ownerName', label: 'Tutor', type: 'string' },
                { key: 'documentId', label: 'Documento', type: 'string' },
                { key: 'issuedAt', label: 'Emitido em', type: 'datetime' },
                { key: 'originalAmount', label: 'Original', type: 'currency' },
                { key: 'compensatedAmount', label: 'Compensado', type: 'currency' },
                { key: 'balance', label: 'Saldo', type: 'currency' },
                { key: 'origin', label: 'Origem', type: 'string' },
                { key: 'status', label: 'Status', type: 'status' },
                { key: 'notes', label: 'Observações', type: 'string' }
              ]
            };
            return columns[reportId] ?? columns['financial-receivables'];
          };
          const reportFinancialExecution = (reportId, filters = {}) => {
            const rows = reportFinancialRows(reportId, filters);
            return {
              id: `synthetic-report-execution-${reportExecutionAttempts}`,
              accountId: 'synthetic-account',
              reportId,
              requestedByUserId: 'synthetic-operator',
              status: 'completed',
              filters,
              rowCount: rows.length,
              generatedAt: '2026-09-07T09:00:00Z',
              expiresAt: '2026-09-08T09:00:00Z',
              columns: reportFinancialColumns(reportId),
              rows
            };
          };
          const renderSyntheticReportCsv = (target) => {
            const inventoryColumns = [
              ['sku', 'Código'],
              ['name', 'Produto'],
              ['onHandQuantity', 'Saldo'],
              ['unit', 'Unidade'],
              ['reorderLevel', 'Mínimo'],
              ['unitCostAmount', 'Custo unit.'],
              ['stockValue', 'Valor estoque'],
              ['reorderStatus', 'Situação reposição'],
              ['createdAt', 'Cadastro'],
              ['updatedAt', 'Atualização']
            ];
            const payableColumns = [
              ['supplierName', 'Fornecedor'],
              ['description', 'Descrição'],
              ['category', 'Categoria'],
              ['issuedAt', 'Emissão'],
              ['dueAt', 'Vencimento'],
              ['totalAmount', 'Total'],
              ['paidAmount', 'Pago'],
              ['outstandingAmount', 'A Pagar'],
              ['status', 'Status'],
              ['paymentMethod', 'Método'],
              ['reconciliationStatus', 'Reconciliação']
            ];
            const receivableColumns = [
              ['patientName', 'Paciente'],
              ['ownerName', 'Nome do tutor'],
              ['patientSpecies', 'Espécie'],
              ['encounterId', 'Atendimento'],
              ['installmentNumber', 'Parcela'],
              ['installmentLabel', 'Descrição da parcela'],
              ['issuedAt', 'Emissão'],
              ['dueAt', 'Vencimento'],
              ['settledAt', 'Liquidação'],
              ['amountOriginal', 'Original'],
              ['amountPaid', 'Recebido'],
              ['amountOutstanding', 'Saldo'],
              ['status', 'Status'],
              ['financialStatus', 'Status financeiro'],
              ['encounterStatus', 'Atendimento'],
              ['paymentCount', 'Pagamentos']
            ];
            const reportId = reportIdForTarget(target);
            const columns = target === '/reports/inventory'
              ? inventoryColumns
              : reportFinancialColumns(reportId).map(({ key, label }) => [key, label]);
            const rows = target === '/reports/inventory'
              ? reportStockRows('Dipirona')
              : reportFinancialRows(
                  reportId,
                  target === '/reports/accounts-receivable' ? { status: 'open' } : {}
                );
            const cell = (value) => {
              const raw = value == null ? '' : String(value);
              return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
            };
            return `\uFEFF${[
              columns.map(([, label]) => label).join(','),
              ...rows.map((row) => columns.map(([key]) => cell(row[key])).join(','))
            ].join('\n')}`;
          };
          const accessCatalog = {
            roles: [
              {
                id: 'synthetic-access-role',
                code: 'admin',
                name: 'Administrador',
                description: 'Acesso operacional administrável',
                permissionCodes: ['patients.read', 'patients.write']
              }
            ],
            permissions: [
              { code: 'patients.read', module: 'patients', description: 'Visualizar pacientes' },
              { code: 'patients.write', module: 'patients', description: 'Editar pacientes' }
            ],
            teams: [
              {
                id: 'synthetic-access-team',
                code: 'clinical',
                name: 'Equipe Clínica',
                description: 'Acesso da rotina clínica',
                status: 'active'
              }
            ],
            sectors: [
              {
                id: 'synthetic-access-sector',
                code: 'clinic',
                name: 'Clínica',
                description: 'Setor assistencial',
                status: 'active'
              }
            ],
            users: [
              {
                id: 'synthetic-access-user',
                accountId: 'synthetic-account',
                username: 'operador',
                displayName: 'Operador de demonstração',
                email: 'operator@example.test',
                roleCode: 'admin',
                status: 'active',
                createdAt: '2026-09-07T00:00:00Z',
                updatedAt: '2026-09-07T00:00:00Z'
              }
            ],
            assignments: {
              userPermissions: [],
              teamPermissions: [
                {
                  subjectId: 'synthetic-access-team',
                  permissionCode: 'patients.read',
                  effect: 'allow'
                }
              ],
              sectorPermissions: []
            },
            memberships: {
              userTeams: [{ userId: 'synthetic-access-user', teamId: 'synthetic-access-team' }],
              userSectors: [
                { userId: 'synthetic-access-user', sectorId: 'synthetic-access-sector' }
              ]
            },
            legacyRoles: [{ userId: 'synthetic-access-user', roleCodes: ['admin'] }]
          };
          const usersFixture = [
            {
              id: 'synthetic-user-admin',
              accountId: 'synthetic-account',
              username: 'admin.sintetico',
              displayName: 'Administradora Sintética',
              email: 'admin@example.test',
              roleCode: 'admin',
              status: 'active',
              createdAt: '2026-09-07T00:00:00Z',
              updatedAt: '2026-09-07T00:00:00Z'
            },
            {
              id: 'synthetic-user-nurse',
              accountId: 'synthetic-account',
              username: 'enfermagem.sintetica',
              displayName: 'Enfermagem Sintética',
              email: 'nurse@example.test',
              roleCode: 'nurse',
              status: 'inactive',
              createdAt: '2026-09-06T00:00:00Z',
              updatedAt: '2026-09-07T00:00:00Z'
            }
          ];
          const accessMatrix = {
            generatedAt: '2026-09-07T09:00:00Z',
            accountId: 'synthetic-account',
            items: [
              {
                module: 'patients',
                permissionCodes: ['patients.read', 'patients.write'],
                actions: {
                  consult: true,
                  insert: true,
                  update: true,
                  delete: false,
                  execute: false,
                  admin: false
                },
                rolesAllowed: ['admin'],
                teamOverrideCount: 1,
                sectorOverrideCount: 0,
                userOverrideCount: 0,
                coverageStatus: 'partial'
              }
            ]
          };
          const accessEffective = {
            user: accessCatalog.users[0],
            memberships: { teams: [accessCatalog.teams[0]], sectors: [accessCatalog.sectors[0]] },
            effectivePermissions: [
              {
                permissionCode: 'patients.read',
                description: 'Visualizar pacientes',
                effective: true,
                direct: false,
                sources: [
                  {
                    kind: 'team',
                    sourceId: 'synthetic-access-team',
                    sourceCode: 'clinical',
                    effect: 'allow'
                  }
                ]
              }
            ]
          };
          const clinicalRecord = {
            id: 'synthetic-medical-record',
            accountId: 'synthetic-account',
            encounterId: 'synthetic-encounter',
            patientId: 'synthetic-patient-1',
            status: 'open',
            createdAt: '2026-09-07T08:00:00Z',
            updatedAt: '2026-09-07T09:00:00Z'
          };
          const clinicalEntries = [
            {
              id: 'synthetic-clinical-entry',
              accountId: 'synthetic-account',
              medicalRecordId: clinicalRecord.id,
              encounterId: clinicalRecord.encounterId,
              patientId: clinicalRecord.patientId,
              entryType: 'anamnesis',
              title: 'Relato inicial',
              content:
                'Apetite preservado; episódios de vômito nas últimas 24 horas; sem alteração de comportamento relatada.',
              authoredByUserId: 'synthetic-operator',
              version: 1,
              createdAt: '2026-09-07T08:30:00Z',
              updatedAt: '2026-09-07T08:30:00Z'
            }
          ];
          let savedClinicalEntry = {
            id: 'synthetic-clinical-entry-saved',
            accountId: 'synthetic-account',
            medicalRecordId: clinicalRecord.id,
            encounterId: clinicalRecord.encounterId,
            patientId: clinicalRecord.patientId,
            entryType: 'anamnesis',
            title: 'Anamnese',
            content: 'Rascunho confirmado no prontuário após retorno do servidor.',
            authoredByUserId: 'synthetic-operator',
            version: 1,
            createdAt: '2026-09-07T09:10:00Z',
            updatedAt: '2026-09-07T09:10:00Z'
          };
          const clinicalEncounter = {
            id: clinicalRecord.encounterId,
            accountId: 'synthetic-account',
            patientId: clinicalRecord.patientId,
            ownerId: 'synthetic-owner-1',
            visitType: 'scheduled',
            status: 'in_care',
            origin: 'schedule',
            reason: 'Vômito e inapetência',
            openedAt: '2026-09-07T08:00:00Z',
            createdByUserId: 'synthetic-operator',
            updatedAt: '2026-09-07T09:00:00Z'
          };
          const clinicalPatient = {
            id: clinicalRecord.patientId,
            accountId: 'synthetic-account',
            name: 'Luna Clínica',
            species: 'dog',
            breed: 'SRD',
            sex: 'female',
            primaryOwnerId: 'synthetic-owner-1',
            birthDateApproximate: '2021-04-12',
            baseWeightKg: 18.4,
            allergy: null,
            chronicDisease: null,
            temperament: 'Dócil',
            status: 'active',
            createdAt: '2021-04-12T00:00:00Z',
            updatedAt: '2026-09-07T09:00:00Z'
          };
          const clinicalOwner = {
            id: 'synthetic-owner-1',
            accountId: 'synthetic-account',
            fullName: 'Maria Clínica',
            contacts: [{ type: 'phone', value: '11999990000', primary: true }],
            status: 'active'
          };
          const clinicalBilling = {
            id: 'synthetic-billing',
            accountId: 'synthetic-account',
            encounterId: clinicalRecord.encounterId,
            patientId: clinicalRecord.patientId,
            ownerId: clinicalOwner.id,
            status: 'draft',
            subtotalAmount: 180,
            currency: 'BRL',
            createdAt: '2026-09-07T08:00:00Z',
            updatedAt: '2026-09-07T09:00:00Z'
          };
          const clinicalBillingItem = {
            id: 'synthetic-billing-item',
            billingRecordId: clinicalBilling.id,
            accountId: 'synthetic-account',
            encounterId: clinicalRecord.encounterId,
            itemType: 'service',
            description: 'Consulta clínica',
            quantity: 1,
            unitPriceAmount: 180,
            totalAmount: 180,
            createdByUserId: 'synthetic-operator',
            createdAt: '2026-09-07T08:05:00Z'
          };
          const clinicalAttachmentRecord = {
            id: 'attachment-record-1',
            accountId: 'synthetic-account',
            linkedEntityType: 'medical_record',
            linkedEntityId: clinicalRecord.id,
            category: 'image',
            fileName: 'radiografia-torax-luna.jpg',
            storageKey: 'synthetic/radiografia-torax-luna.jpg',
            mimeType: 'image/jpeg',
            checksum: 'sha256-synthetic-record',
            sizeBytes: 245760,
            source: 'upload',
            scanStatus: 'available',
            uploadedByUserId: 'synthetic-operator',
            createdAt: '2026-09-07T08:45:00Z'
          };
          const clinicalAttachmentEncounter = {
            id: 'attachment-encounter-1',
            accountId: 'synthetic-account',
            linkedEntityType: 'encounter',
            linkedEntityId: clinicalRecord.encounterId,
            category: 'document',
            fileName: 'termo-atendimento.pdf',
            storageKey: 'synthetic/termo-atendimento.pdf',
            mimeType: 'application/pdf',
            checksum: 'sha256-synthetic-encounter',
            sizeBytes: 98304,
            source: 'upload',
            scanStatus: 'quarantined',
            scanReason: 'Aguardando análise antivírus',
            uploadedByUserId: 'synthetic-operator',
            createdAt: '2026-09-07T08:50:00Z'
          };
          const clinicalTimeline = [
            {
              id: 'synthetic-timeline-1',
              accountId: 'synthetic-account',
              encounterId: clinicalRecord.encounterId,
              medicalRecordId: clinicalRecord.id,
              eventType: 'record_created',
              summary: 'Prontuário criado para o atendimento.',
              actorUserId: 'synthetic-operator',
              occurredAt: '2026-09-07T08:00:00Z'
            },
            {
              id: 'synthetic-timeline-2',
              accountId: 'synthetic-account',
              encounterId: clinicalRecord.encounterId,
              medicalRecordId: clinicalRecord.id,
              clinicalEntryId: clinicalEntries[0].id,
              eventType: 'entry_added',
              summary: 'Anamnese inicial registrada.',
              actorUserId: 'synthetic-operator',
              occurredAt: '2026-09-07T08:30:00Z'
            }
          ];
          const patientDetailPatients = {
            'synthetic-patient-1': {
              id: 'synthetic-patient-1',
              accountId: 'synthetic-account',
              name: 'Luna Contexto',
              species: 'canine',
              breed: 'SRD',
              sex: 'female',
              size: 'medium',
              baseWeightKg: 18.4,
              birthDateApproximate: '2021-04-12',
              isNeutered: true,
              microchip: '900000000001',
              pedigreeNumber: null,
              color: 'Caramelo',
              chronicDisease: 'Doença renal crônica',
              allergy: 'Alergia a dipirona',
              temperament: 'Dócil',
              generalNotes: 'Paciente com plano de acompanhamento renal.',
              legacyVetusId: 'CTX-001',
              primaryOwnerId: 'synthetic-owner-context-1',
              status: 'active',
              createdAt: '2021-04-12T00:00:00Z',
              updatedAt: '2026-09-07T09:00:00Z'
            },
            'synthetic-patient-2': {
              id: 'synthetic-patient-2',
              accountId: 'synthetic-account',
              name: 'Milo Contexto',
              species: 'feline',
              breed: null,
              sex: 'male',
              size: null,
              baseWeightKg: null,
              birthDateApproximate: null,
              isNeutered: null,
              microchip: null,
              pedigreeNumber: null,
              color: null,
              chronicDisease: null,
              allergy: null,
              temperament: null,
              generalNotes: null,
              legacyVetusId: null,
              primaryOwnerId: 'synthetic-owner-context-2',
              status: 'inactive',
              createdAt: '2024-06-01T00:00:00Z',
              updatedAt: '2026-09-07T09:05:00Z'
            }
          };
          const patientDetailOwners = {
            'synthetic-owner-context-1': {
              id: 'synthetic-owner-context-1',
              accountId: 'synthetic-account',
              fullName: 'Maria Contexto',
              documentId: '11111111111',
              contacts: [{ type: 'whatsapp', value: '11988880001', primary: true }],
              financialResponsible: true,
              status: 'active',
              createdAt: '2021-04-12T00:00:00Z',
              updatedAt: '2026-09-07T09:00:00Z'
            },
            'synthetic-owner-context-2': {
              id: 'synthetic-owner-context-2',
              accountId: 'synthetic-account',
              fullName: 'João Contexto',
              documentId: '22222222222',
              contacts: [{ type: 'phone', value: '11988880002', primary: true }],
              financialResponsible: true,
              status: 'active',
              createdAt: '2024-06-01T00:00:00Z',
              updatedAt: '2026-09-07T09:05:00Z'
            }
          };
          const patientDetailEncounter = {
            id: 'synthetic-context-encounter-1',
            accountId: 'synthetic-account',
            patientId: 'synthetic-patient-1',
            ownerId: 'synthetic-owner-context-1',
            visitType: 'scheduled',
            origin: 'schedule',
            reason: 'Acompanhamento renal',
            status: 'in_care',
            openedAt: '2026-09-07T08:00:00Z',
            createdByUserId: 'synthetic-operator',
            createdAt: '2026-09-07T08:00:00Z',
            updatedAt: '2026-09-07T09:00:00Z'
          };
          const patientDetailRecord = {
            id: 'synthetic-context-medical-record',
            accountId: 'synthetic-account',
            encounterId: patientDetailEncounter.id,
            patientId: patientDetailEncounter.patientId,
            status: 'open',
            createdAt: '2026-09-07T08:00:00Z',
            updatedAt: '2026-09-07T09:00:00Z'
          };
          const patientDetailEntries = [
            {
              id: 'synthetic-context-entry-1',
              accountId: 'synthetic-account',
              medicalRecordId: patientDetailRecord.id,
              encounterId: patientDetailEncounter.id,
              patientId: patientDetailEncounter.patientId,
              entryType: 'anamnesis',
              title: 'Anamnese renal',
              content: 'Acompanhamento de ingestão hídrica e apetite.',
              authoredByUserId: 'synthetic-operator',
              version: 1,
              createdAt: '2026-09-07T08:20:00Z',
              updatedAt: '2026-09-07T08:20:00Z'
            },
            {
              id: 'synthetic-context-entry-2',
              accountId: 'synthetic-account',
              medicalRecordId: patientDetailRecord.id,
              encounterId: patientDetailEncounter.id,
              patientId: patientDetailEncounter.patientId,
              entryType: 'progress_note',
              title: 'Histórico clínico longitudinal',
              content: 'Manter acompanhamento renal trimestral.',
              authoredByUserId: 'synthetic-operator',
              version: 1,
              createdAt: '2026-09-07T08:30:00Z',
              updatedAt: '2026-09-07T08:30:00Z'
            }
          ];
          const patientDetailAppointments = [
            {
              id: 'synthetic-context-appointment-1',
              accountId: 'synthetic-account',
              patientId: 'synthetic-patient-1',
              ownerId: 'synthetic-owner-context-1',
              scheduledAt: '2026-09-20T10:00:00Z',
              visitType: 'return',
              reason: 'Retorno renal',
              status: 'scheduled',
              createdAt: '2026-09-07T08:00:00Z',
              updatedAt: '2026-09-07T08:00:00Z'
            }
          ];
          const patientDetailEncounterTimeline = [
            {
              id: 'synthetic-context-encounter-event',
              accountId: 'synthetic-account',
              encounterId: patientDetailEncounter.id,
              eventType: 'queue_called',
              summary: 'Luna Contexto chamada para atendimento',
              actorUserId: 'synthetic-operator',
              occurredAt: '2026-09-07T08:05:00Z'
            }
          ];
          const patientDetailClinicalTimeline = [
            {
              id: 'synthetic-context-clinical-event',
              accountId: 'synthetic-account',
              encounterId: patientDetailEncounter.id,
              medicalRecordId: patientDetailRecord.id,
              eventType: 'entry_added',
              summary: 'Plano renal atualizado',
              actorUserId: 'synthetic-operator',
              occurredAt: '2026-09-07T08:30:00Z'
            }
          ];
          const patientDetailTriage = [
            {
              id: 'synthetic-context-triage',
              accountId: 'synthetic-account',
              encounterId: patientDetailEncounter.id,
              patientId: patientDetailEncounter.patientId,
              priority: 'medium',
              chiefComplaint: 'Acompanhamento renal',
              initialNotes: 'Monitorar hidratação.',
              alerts: ['Alergia a dipirona'],
              destination: 'in_care',
              triagedByUserId: 'synthetic-operator',
              createdAt: '2026-09-07T08:05:00Z',
              updatedAt: '2026-09-07T08:05:00Z'
            }
          ];
          const patientDetailBilling = [
            {
              id: 'synthetic-context-billing',
              accountId: 'synthetic-account',
              encounterId: patientDetailEncounter.id,
              patientId: patientDetailEncounter.patientId,
              ownerId: 'synthetic-owner-context-1',
              status: 'open',
              subtotalAmount: 180,
              currency: 'BRL',
              administrativeNotes: 'Aguardando confirmação do tutor',
              createdAt: '2026-09-07T08:00:00Z',
              updatedAt: '2026-09-07T09:00:00Z'
            }
          ];
          const patientDetailBillingItems = [
            {
              id: 'synthetic-context-billing-item',
              billingRecordId: patientDetailBilling[0].id,
              accountId: 'synthetic-account',
              encounterId: patientDetailEncounter.id,
              itemType: 'service',
              description: 'Consulta de acompanhamento',
              quantity: 1,
              unitPriceAmount: 180,
              totalAmount: 180,
              createdByUserId: 'synthetic-operator',
              createdAt: '2026-09-07T08:10:00Z'
            }
          ];
          const patientDetailDiagnosticOrders = [
            {
              id: 'synthetic-context-diagnostic',
              accountId: 'synthetic-account',
              encounterId: patientDetailEncounter.id,
              patientId: patientDetailEncounter.patientId,
              examType: 'Urina',
              reason: 'Acompanhamento renal',
              status: 'resulted',
              resultSummary: 'Sem alteração relevante.',
              createdAt: '2026-09-07T08:15:00Z',
              updatedAt: '2026-09-07T08:45:00Z'
            }
          ];
          const patientDetailPreventiveEvents = [
            {
              id: 'synthetic-context-preventive',
              accountId: 'synthetic-account',
              patientId: 'synthetic-patient-1',
              ownerId: 'synthetic-owner-context-1',
              clientName: 'Maria Contexto',
              animalName: 'Luna Contexto',
              eventDate: '2026-10-01',
              itemType: 'vaccine',
              description: 'Reforço anual',
              status: 'scheduled',
              observation: null,
              executedAt: null,
              executedObservation: null,
              nextDoseDate: null,
              rescheduledFromId: null,
              reminderEmailPreparedAt: null,
              createdAt: '2026-09-07T08:00:00Z',
              updatedAt: '2026-09-07T08:00:00Z'
            }
          ];
          const patientDetailPrescriptions = [
            {
              id: 'synthetic-context-prescription',
              accountId: 'synthetic-account',
              medicalRecordId: patientDetailRecord.id,
              encounterId: patientDetailEncounter.id,
              patientId: patientDetailEncounter.patientId,
              entryType: 'prescription',
              title: 'Suplemento renal',
              medicationName: 'Suplemento renal',
              content: 'Frequência: 1x ao dia',
              authoredByUserId: 'synthetic-operator',
              version: 1,
              dosage: '1 medida',
              frequency: '1x ao dia',
              createdAt: '2026-09-07T08:35:00Z',
              updatedAt: '2026-09-07T08:35:00Z'
            }
          ];
          const patientDetailAttachments = [
            {
              id: 'synthetic-context-attachment',
              accountId: 'synthetic-account',
              linkedEntityType: 'medical_record',
              linkedEntityId: patientDetailRecord.id,
              category: 'image',
              fileName: 'ultrassom-luna.jpg',
              storageKey: 'synthetic/ultrassom-luna.jpg',
              mimeType: 'image/jpeg',
              checksum: 'sha256:context',
              source: 'upload',
              uploadedByUserId: 'synthetic-operator',
              sizeBytes: 120000,
              scanStatus: 'available',
              createdAt: '2026-09-07T08:40:00Z'
            }
          ];
          const patientDetailQuotes = [
            {
              id: 'synthetic-context-quote',
              accountId: 'synthetic-account',
              number: 'CTX-001',
              ownerId: 'synthetic-owner-context-1',
              status: 'draft',
              validUntil: null,
              subtotal: 180,
              discountAmount: 0,
              total: 180,
              notes: 'Plano de acompanhamento',
              createdByUserId: 'synthetic-operator',
              convertedToSaleId: null,
              convertedAt: null,
              createdAt: '2026-09-07T08:00:00Z',
              updatedAt: '2026-09-07T08:00:00Z'
            }
          ];
          const patientDetailRecords = [
            { record: patientDetailRecord, entryCount: patientDetailEntries.length }
          ];
          const patientDetailSummary = (fixture) => ({
            patient: fixture,
            owner: {
              id: fixture.primaryOwnerId,
              fullName: patientDetailOwners[fixture.primaryOwnerId].fullName,
              phoneMain: patientDetailOwners[fixture.primaryOwnerId].contacts[0]?.value ?? null,
              email: null
            },
            stats: {
              totalEncounters: fixture.id === 'synthetic-patient-1' ? 1 : 0,
              openEncounters: fixture.id === 'synthetic-patient-1' ? 1 : 0
            },
            recentEncounters:
              fixture.id === 'synthetic-patient-1'
                ? [
                    {
                      id: patientDetailEncounter.id,
                      openedAt: patientDetailEncounter.openedAt,
                      status: 'open'
                    }
                  ]
                : []
          });
          const currentClinicalEntries = () =>
            medicalEntrySaveAttempts >= 2
              ? [...clinicalEntries, savedClinicalEntry]
              : clinicalEntries;
          page.on('pageerror', (error) => errors.push(error.message));
          await page.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) {
              requests.push({ path: `${url.origin}${url.pathname}`, blocked: true });
              await route.abort();
              return;
            }
            if (!url.pathname.startsWith('/api/')) {
              if (
                navigationContinuity &&
                target === '/owners/new' &&
                url.pathname === '/owners/new' &&
                url.searchParams.get('permission') === 'revoked'
              ) {
                permissionRevoked = true;
              }
              await route.continue();
              return;
            }
            requests.push({
              path: url.pathname,
              query: url.search,
              method: route.request().method(),
              idempotencyKey: route.request().headers()['idempotency-key'] ?? null
            });
            const fulfill = (data) =>
              route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(data)
              });
            const fulfillStatus = (status, data, headers = {}) =>
              route.fulfill({
                status,
                headers: { 'content-type': 'application/json', ...headers },
                body: JSON.stringify(data)
              });
            if (url.pathname === '/api/auth/refresh' && target === '/login') {
              await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Synthetic unauthenticated' })
              });
              return;
            }
            if (url.pathname === '/api/auth/refresh') {
              refreshAttempts += 1;
              const payload = Buffer.from(
                JSON.stringify({
                  sub: 'synthetic-operator',
                  accountId: 'synthetic-account',
                  name: 'Operador de demonstração',
                  roles: ['admin'],
                  exp: 4102444800,
                  sessionVersion: refreshAttempts
                })
              ).toString('base64url');
              await fulfill({ accessToken: `${payload}.synthetic-ui-only` });
              return;
            }
            if (url.pathname === '/api/auth/session') {
              const dashboardProfile = dashboardProfileForTarget(target);
              const sessionPermissionCodes = [
                'scheduling.read',
                'scheduling.manage',
                'owners.read',
                'owners.manage',
                'patients.read',
                'patients.manage',
                'inpatient.read',
                'inpatient.manage',
                'encounters.read',
                'encounters.manage',
                'billing.read',
                'triage.read',
                'diagnostics.read',
                'medical-records.read',
                'inventory.read',
                'counter_sale.read',
                'beds.read',
                'access.read',
                'access.manage',
                ...(usersContinuity || navigationContinuity ? ['users.read', 'users.manage'] : [])
              ];
              await fulfill({
                access: dashboardProfile
                  ? {
                      permissionCodes: dashboardProfile.permissionCodes,
                      roleCodes: dashboardProfile.roleCodes
                    }
                  : {
                      permissionCodes: permissionRevoked
                        ? sessionPermissionCodes.filter((code) => !code.startsWith('owners.'))
                        : sessionPermissionCodes
                    }
              });
              return;
            }
            if (dashboardContinuity && dashboardProfileForTarget(target)) {
              const dashboardProfile = dashboardProfileForTarget(target);
              if (url.pathname === '/api/slos') {
                await fulfill({
                  generatedAt: '2026-09-07T09:00:00Z',
                  snapshot: {
                    requestCount5m: 12,
                    requestCount1h: 120,
                    p95LatencyMs: 180,
                    p99LatencyMs: 320,
                    availabilityPercent: 99.95,
                    errorRatePercent: 0.2
                  },
                  report: { overallStatus: 'healthy', errorBudgetExhausted: false, slos: [] },
                  runbook: { metrics: '/metrics', readiness: '/ready', liveness: '/health' }
                });
                return;
              }
              if (url.pathname === '/api/audit/operational-coverage') {
                await fulfill({
                  generatedAt: '2026-09-07T09:00:00Z',
                  accountId: 'synthetic-account',
                  totalEvents: 4,
                  eventsByModule: { dashboard: 4 },
                  eventsByRiskLevel: { low: 4, medium: 0, high: 0 },
                  requirements: [],
                  coveredRequirements: 0,
                  missingRequirements: 0,
                  coveragePercent: 100
                });
                return;
              }
              if (url.pathname === '/api/audit/events') {
                await fulfill({ items: [] });
                return;
              }
              if (url.pathname === '/api/admin/commercial-dashboard') {
                await fulfill({
                  openSales: 1,
                  closedToday: 2,
                  grossRevenueToday: 320,
                  netRevenueToday: 300,
                  avgTicket: 150,
                  salesByPaymentMethod: [],
                  topProducts: [],
                  topServices: [],
                  quotesIssued: 0,
                  quotesConverted: 0,
                  lowStockAlerts: []
                });
                return;
              }
              if (dashboardProfile.key === 'reception' && url.pathname === '/api/appointments') {
                await fulfill({ items: [{ id: 'synthetic-dashboard-appointment' }], total: 1 });
                return;
              }
            }
            if (cashReceiptReversalContinuity && target === '/encounters/synthetic-encounter') {
              const cashEncounter = {
                ...clinicalEncounter,
                status: 'closed',
                closedAt: '2026-09-07T08:55:00Z',
                closeReason: 'Alta clínica confirmada'
              };
              const cashFinancial = () => ({
                encounterId: clinicalRecord.encounterId,
                accountId: 'synthetic-account',
                encounterStatus: 'closed',
                financialStatus: cashReceiptReversed ? 'pending' : 'paid',
                financialClosed: false,
                subtotal: 180,
                discountTotal: 0,
                total: 180,
                paidAmount: cashReceiptReversed ? 0 : 180,
                balanceDue: cashReceiptReversed ? 180 : 0,
                closedAt: null,
                closedByUserId: null,
                notes: null,
                receivables: [
                  {
                    id: 'synthetic-receivable',
                    installmentLabel: 'À vista',
                    status: cashReceiptReversed ? 'open' : 'settled',
                    amountOriginal: 180,
                    amountPaid: cashReceiptReversed ? 0 : 180,
                    amountOutstanding: cashReceiptReversed ? 180 : 0,
                    dueAt: null
                  }
                ]
              });
              const cashBilling = { ...clinicalBilling, status: cashReceiptReversed ? 'open' : 'settled' };
              const cashReceipt = {
                id: 'synthetic-cash-receipt',
                accountId: 'synthetic-account',
                encounterId: clinicalRecord.encounterId,
                billingRecordId: clinicalBilling.id,
                financialAccountId: 'synthetic-financial-account',
                receivableId: 'synthetic-receivable',
                receivablePaymentId: 'synthetic-receivable-payment',
                cashRegisterId: 'synthetic-cash-register',
                cashMovementId: 'synthetic-cash-movement-receipt',
                journalEntryId: 'synthetic-journal-entry-receipt',
                amount: 180,
                currency: 'BRL',
                receivedAt: '2026-09-07T09:01:00Z',
                receivedByUserId: 'synthetic-operator'
              };
              const cashReversal = {
                id: 'synthetic-cash-reversal',
                accountId: 'synthetic-account',
                receiptId: cashReceipt.id,
                encounterId: clinicalRecord.encounterId,
                billingRecordId: clinicalBilling.id,
                financialAccountId: cashReceipt.financialAccountId,
                receivableId: cashReceipt.receivableId,
                receivablePaymentId: cashReceipt.receivablePaymentId,
                originalCashRegisterId: cashReceipt.cashRegisterId,
                reversalCashRegisterId: cashReceipt.cashRegisterId,
                originalCashMovementId: cashReceipt.cashMovementId,
                reversalCashMovementId: 'synthetic-cash-movement-reversal',
                originalJournalEntryId: cashReceipt.journalEntryId,
                reversalJournalEntryId: 'synthetic-journal-entry-reversal',
                amount: 180,
                currency: 'BRL',
                reason: 'Correção operacional no caixa',
                reversedByUserId: 'synthetic-operator',
                reversedAt: '2026-09-07T09:05:00Z'
              };
              const reversedCashReceipt = {
                ...cashReceipt,
                reversalId: cashReversal.id,
                reversalCashMovementId: cashReversal.reversalCashMovementId,
                reversalJournalEntryId: cashReversal.reversalJournalEntryId,
                reversalReason: cashReversal.reason,
                reversedByUserId: cashReversal.reversedByUserId,
                reversedAt: cashReversal.reversedAt
              };
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}`) {
                await fulfill(cashEncounter);
                return;
              }
              if (url.pathname === `/api/patients/${clinicalPatient.id}`) {
                await fulfill(clinicalPatient);
                return;
              }
              if (url.pathname === `/api/owners/${clinicalOwner.id}`) {
                await fulfill(clinicalOwner);
                return;
              }
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}/timeline`) {
                await fulfill({ items: clinicalTimeline });
                return;
              }
              if (
                url.pathname === '/api/attachments' &&
                url.searchParams.get('linkedEntityType') === 'encounter' &&
                url.searchParams.get('linkedEntityId') === clinicalRecord.encounterId
              ) {
                await fulfill({ items: [] });
                return;
              }
              if (url.pathname === '/api/clinical-handoffs') {
                await fulfill({ items: [] });
                return;
              }
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}/summary`) {
                await fulfill({
                  encounter: cashEncounter,
                  timeline: clinicalTimeline,
                  diagnostics: {
                    totalOrders: 0,
                    pendingOrders: 0,
                    releasedResults: 0,
                    latestOrders: []
                  },
                  financial: cashFinancial()
                });
                return;
              }
              if (url.pathname === `/api/billing/${clinicalRecord.encounterId}`) {
                await fulfill(cashBilling);
                return;
              }
              if (url.pathname === `/api/billing/${clinicalRecord.encounterId}/items`) {
                await fulfill({ items: [clinicalBillingItem] });
                return;
              }
              if (
                url.pathname === `/api/encounters/${clinicalRecord.encounterId}/cash-receipts` &&
                route.request().method() === 'GET'
              ) {
                if (cashReceiptReversed) {
                  if (url.searchParams.get('includeReversed') === 'true') {
                    await fulfill(reversedCashReceipt);
                  } else {
                    await route.fulfill({
                      status: 404,
                      contentType: 'application/json',
                      body: JSON.stringify({ code: 'CASH_RECEIPT_NOT_FOUND', message: 'Cash receipt not found' })
                    });
                  }
                } else {
                  await fulfill(cashReceipt);
                }
                return;
              }
              if (
                url.pathname ===
                  `/api/encounters/${clinicalRecord.encounterId}/cash-receipts/${cashReceipt.id}/reverse` &&
                route.request().method() === 'POST'
              ) {
                const body = route.request().postDataJSON();
                assert.equal(body.reason, cashReversal.reason);
                cashReceiptReversed = true;
                await fulfillStatus(201, cashReversal, {
                  location: `/encounters/${clinicalRecord.encounterId}/cash-receipts/${cashReceipt.id}`
                });
                return;
              }
              if (
                url.pathname ===
                  `/api/encounters/${clinicalRecord.encounterId}/payments/pix-attempts` &&
                route.request().method() === 'GET'
              ) {
                await fulfill({ attempt: null });
                return;
              }
            }
            if (pixAttemptContinuity && target === '/encounters/synthetic-encounter') {
              const pixEncounter = {
                ...clinicalEncounter,
                status: 'closed',
                closedAt: '2026-09-07T08:55:00Z',
                closeReason: 'Alta clínica confirmada'
              };
              const pixFinancial = {
                encounterId: clinicalRecord.encounterId,
                accountId: 'synthetic-account',
                encounterStatus: 'closed',
                financialStatus: 'pending',
                financialClosed: false,
                subtotal: 180,
                discountTotal: 0,
                total: 180,
                paidAmount: 0,
                balanceDue: 180,
                closedAt: null,
                closedByUserId: null,
                notes: null,
                receivables: [
                  {
                    id: 'synthetic-receivable',
                    installmentLabel: 'À vista',
                    status: 'open',
                    amountOriginal: 180,
                    amountPaid: 0,
                    amountOutstanding: 180,
                    dueAt: null
                  }
                ]
              };
              const pixBilling = { ...clinicalBilling, status: 'open' };
              const pixAttempt = {
                id: 'synthetic-pix-attempt',
                encounterId: clinicalRecord.encounterId,
                billingRecordId: clinicalBilling.id,
                state: 'pending_dispatch',
                amountCents: 18000,
                currency: 'BRL',
                qrCodePayload: null,
                qrCodeBase64: null,
                expiresAt: null,
                error: null,
                createdAt: '2026-09-07T09:00:00Z',
                updatedAt: '2026-09-07T09:00:00Z'
              };
              const settledPixAttempt = {
                ...pixAttempt,
                state: 'settled',
                qrCodePayload: '000201synthetic-pix-copy-paste',
                qrCodeBase64:
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
                updatedAt: '2026-09-07T09:01:00Z'
              };
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}`) {
                await fulfill(pixEncounter);
                return;
              }
              if (url.pathname === `/api/patients/${clinicalPatient.id}`) {
                await fulfill(clinicalPatient);
                return;
              }
              if (url.pathname === `/api/owners/${clinicalOwner.id}`) {
                await fulfill(clinicalOwner);
                return;
              }
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}/timeline`) {
                await fulfill({ items: clinicalTimeline });
                return;
              }
              if (
                url.pathname === '/api/attachments' &&
                url.searchParams.get('linkedEntityType') === 'encounter' &&
                url.searchParams.get('linkedEntityId') === clinicalRecord.encounterId
              ) {
                await fulfill({ items: [] });
                return;
              }
              if (url.pathname === '/api/clinical-handoffs') {
                await fulfill({ items: [] });
                return;
              }
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}/summary`) {
                await fulfill({
                  encounter: pixEncounter,
                  timeline: clinicalTimeline,
                  diagnostics: {
                    totalOrders: 0,
                    pendingOrders: 0,
                    releasedResults: 0,
                    latestOrders: []
                  },
                  financial: pixFinancial
                });
                return;
              }
              if (url.pathname === `/api/billing/${clinicalRecord.encounterId}`) {
                await fulfill(pixBilling);
                return;
              }
              if (url.pathname === `/api/billing/${clinicalRecord.encounterId}/items`) {
                await fulfill({ items: [clinicalBillingItem] });
                return;
              }
              if (
                url.pathname ===
                  `/api/encounters/${clinicalRecord.encounterId}/payments/pix-attempts` &&
                route.request().method() === 'GET'
              ) {
                await fulfill({ attempt: null });
                return;
              }
              if (
                url.pathname ===
                  `/api/encounters/${clinicalRecord.encounterId}/payments/pix-attempts` &&
                route.request().method() === 'POST'
              ) {
                await fulfillStatus(202, pixAttempt, {
                  location: `/payments/pix-attempts/${pixAttempt.id}`
                });
                return;
              }
              if (url.pathname === `/api/payments/pix-attempts/${pixAttempt.id}`) {
                pixAttemptGetAttempts += 1;
                await fulfill(pixAttemptGetAttempts === 1 ? settledPixAttempt : settledPixAttempt);
                return;
              }
            }
            if (medicalRecordContinuity && target === '/medical-records/synthetic-encounter') {
              if (
                url.pathname === '/api/medical-records' &&
                url.searchParams.get('encounterId') === clinicalRecord.encounterId
              ) {
                await fulfill({ record: clinicalRecord, entries: currentClinicalEntries() });
                return;
              }
              if (
                url.pathname === '/api/medical-records/entries' &&
                url.searchParams.get('encounterId') === clinicalRecord.encounterId
              ) {
                await fulfill({ items: currentClinicalEntries() });
                return;
              }
              if (
                url.pathname === '/api/medical-records/timeline' &&
                url.searchParams.get('encounterId') === clinicalRecord.encounterId
              ) {
                await fulfill({
                  items:
                    medicalEntrySaveAttempts >= 2
                      ? [
                          ...clinicalTimeline,
                          {
                            ...clinicalTimeline[1],
                            id: 'synthetic-timeline-saved',
                            clinicalEntryId: savedClinicalEntry.id,
                            summary: 'Anamnese confirmada no prontuário.',
                            occurredAt: savedClinicalEntry.createdAt
                          }
                        ]
                      : clinicalTimeline
                });
                return;
              }
              if (url.pathname === `/api/encounters/${clinicalRecord.encounterId}`) {
                await fulfill(clinicalEncounter);
                return;
              }
              if (url.pathname === `/api/patients/${clinicalRecord.patientId}`) {
                await fulfill(clinicalPatient);
                return;
              }
              if (url.pathname === `/api/owners/${clinicalOwner.id}`) {
                await fulfill(clinicalOwner);
                return;
              }
              if (url.pathname === `/api/billing/${clinicalRecord.encounterId}`) {
                await fulfill(clinicalBilling);
                return;
              }
              if (url.pathname === `/api/billing/${clinicalRecord.encounterId}/items`) {
                await fulfill({ items: [clinicalBillingItem] });
                return;
              }
              if (
                url.pathname === '/api/prescriptions' &&
                url.searchParams.get('patientId') === clinicalPatient.id
              ) {
                await fulfill({ items: [] });
                return;
              }
              if (
                url.pathname === '/api/attachments' &&
                url.searchParams.get('linkedEntityType') === 'medical_record' &&
                url.searchParams.get('linkedEntityId') === clinicalRecord.id
              ) {
                await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
                await fulfill({ items: [clinicalAttachmentRecord] });
                return;
              }
              if (
                url.pathname === '/api/attachments' &&
                url.searchParams.get('linkedEntityType') === 'encounter' &&
                url.searchParams.get('linkedEntityId') === clinicalRecord.encounterId
              ) {
                await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
                await fulfill({ items: [clinicalAttachmentEncounter] });
                return;
              }
              if (
                url.pathname === '/api/medical-records/entries' &&
                route.request().method() === 'POST'
              ) {
                medicalEntrySaveAttempts += 1;
                if (medicalEntrySaveAttempts === 1) {
                  await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Falha sintética ao persistir a anamnese.' })
                  });
                  return;
                }
                const submittedEntry = route.request().postDataJSON();
                if (submittedEntry && typeof submittedEntry === 'object') {
                  savedClinicalEntry = {
                    ...savedClinicalEntry,
                    encounterId:
                      typeof submittedEntry.encounterId === 'string'
                        ? submittedEntry.encounterId
                        : savedClinicalEntry.encounterId,
                    patientId:
                      typeof submittedEntry.patientId === 'string'
                        ? submittedEntry.patientId
                        : savedClinicalEntry.patientId,
                    entryType:
                      typeof submittedEntry.entryType === 'string'
                        ? submittedEntry.entryType
                        : savedClinicalEntry.entryType,
                    title:
                      typeof submittedEntry.title === 'string'
                        ? submittedEntry.title
                        : savedClinicalEntry.title,
                    content:
                      typeof submittedEntry.content === 'string'
                        ? submittedEntry.content
                        : savedClinicalEntry.content,
                    updatedAt: new Date().toISOString()
                  };
                }
                await route.fulfill({
                  status: 201,
                  contentType: 'application/json',
                  body: JSON.stringify(savedClinicalEntry)
                });
                return;
              }
              if (
                url.pathname === '/api/attachments/attachment-record-1/download-url' &&
                route.request().method() === 'POST'
              ) {
                attachmentOpenAttempts += 1;
                await fulfill(
                  attachmentOpenAttempts === 1
                    ? {
                        url: 'https://files.invalid/not-confirmed',
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                      }
                    : {
                        url: '/attachments/attachment-record-1/content?token=synthetic-token',
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                      }
                );
                return;
              }
            }
            if (
              duplicateContinuity &&
              target === '/owners/new' &&
              url.pathname === '/api/owners' &&
              route.request().method() === 'POST'
            ) {
              duplicateOwnerSaveAttempts += 1;
              await route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                  code: 'CONFLICT',
                  message: 'Possible duplicate owner detected',
                  details: { ownerId: 'synthetic-owner-duplicate' }
                })
              });
              return;
            }
            if (
              duplicateContinuity &&
              target === '/owners/new' &&
              url.pathname === '/api/owners/synthetic-owner-duplicate'
            ) {
              await fulfill({
                id: 'synthetic-owner-duplicate',
                accountId: 'synthetic-account',
                fullName: 'Maria Duplicada',
                documentId: '111.111.111-11',
                contacts: [
                  { label: 'Celular', value: '11999991111', type: 'whatsapp', primary: true }
                ],
                financialResponsible: true,
                administrativeNotes: 'Cadastro existente para revisão.',
                status: 'active',
                createdAt: '2026-09-07T08:00:00Z',
                updatedAt: '2026-09-07T08:00:00Z'
              });
              return;
            }
            if (
              duplicateContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/owners' &&
              route.request().method() === 'GET'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-owner-1',
                    accountId: 'synthetic-account',
                    fullName: 'Maria Duplicada',
                    documentId: '111.111.111-11',
                    contacts: [
                      { label: 'Celular', value: '11999991111', type: 'whatsapp', primary: true }
                    ],
                    financialResponsible: true,
                    status: 'active',
                    createdAt: '2026-09-07T08:00:00Z',
                    updatedAt: '2026-09-07T08:00:00Z'
                  }
                ],
                total: 1
              });
              return;
            }
            if (
              duplicateContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/species'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-species-canine',
                    accountId: 'synthetic-account',
                    name: 'Canina',
                    code: 'CANINE',
                    systemCode: 'canine',
                    description: null,
                    active: true,
                    createdAt: '2026-09-07T00:00:00Z',
                    updatedAt: '2026-09-07T00:00:00Z'
                  }
                ]
              });
              return;
            }
            if (
              duplicateContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/breeds'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              duplicateContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/patients' &&
              route.request().method() === 'POST'
            ) {
              duplicatePatientSaveAttempts += 1;
              await route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                  code: 'CONFLICT',
                  message: 'Possible duplicate patient detected',
                  details: { patientId: 'synthetic-patient-duplicate' }
                })
              });
              return;
            }
            if (
              duplicateContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/patients/synthetic-patient-duplicate'
            ) {
              await fulfill({
                id: 'synthetic-patient-duplicate',
                accountId: 'synthetic-account',
                name: 'Rex Duplicado',
                species: 'canine',
                breed: null,
                sex: 'male',
                size: null,
                baseWeightKg: null,
                birthDateApproximate: null,
                isNeutered: null,
                microchip: null,
                pedigreeNumber: null,
                color: null,
                chronicDisease: null,
                allergy: null,
                temperament: null,
                generalNotes: null,
                legacyVetusId: null,
                originalCreatedAt: null,
                primaryOwnerId: 'synthetic-owner-1',
                status: 'active',
                createdAt: '2026-09-07T08:00:00Z',
                updatedAt: '2026-09-07T08:00:00Z'
              });
              return;
            }
            if (
              patientBrowserContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/species'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-species-canine',
                    accountId: 'synthetic-account',
                    name: 'Canina',
                    code: 'CANINE',
                    systemCode: 'canine',
                    description: null,
                    active: true,
                    createdAt: '2026-09-07T00:00:00Z',
                    updatedAt: '2026-09-07T00:00:00Z'
                  }
                ]
              });
              return;
            }
            if (
              patientBrowserContinuity &&
              target === '/patients/new' &&
              url.pathname === '/api/patients' &&
              route.request().method() === 'POST'
            ) {
              patientSaveAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 220));
              if (patientSaveAttempts === 1) {
                await route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Falha sintética ao salvar paciente' })
                });
                return;
              }
              await fulfill({
                id: 'synthetic-patient-created',
                accountId: 'synthetic-account',
                name: 'Paciente salvo',
                species: 'canine',
                breed: null,
                sex: 'male',
                size: null,
                baseWeightKg: null,
                birthDateApproximate: null,
                isNeutered: null,
                microchip: null,
                pedigreeNumber: null,
                color: null,
                chronicDisease: null,
                allergy: null,
                temperament: null,
                generalNotes: null,
                legacyVetusId: null,
                originalCreatedAt: null,
                primaryOwnerId: 'synthetic-owner-2',
                status: 'active',
                createdAt: '2026-09-07T00:00:00Z',
                updatedAt: '2026-09-07T00:00:00Z'
              });
              return;
            }
            if (
              laboratoryFeedback &&
              target === '/laboratory/orders' &&
              url.pathname === '/api/laboratory/orders'
            ) {
              laboratoryOrdersAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
              if (laboratoryOrdersAttempts === 1) {
                await route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Falha sintética de disponibilidade dos exames' })
                });
                return;
              }
              if (laboratoryOrdersAttempts === 4) {
                await route.fulfill({
                  status: 403,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Permissão diagnostics.read ausente' })
                });
                return;
              }
              const items =
                laboratoryOrdersAttempts === 2
                  ? []
                  : [
                      {
                        id: 'synthetic-lab-order-1',
                        accountId: 'synthetic-account',
                        encounterId: 'synthetic-encounter-1',
                        patientId: 'synthetic-lab-patient-1',
                        examType: 'Hemograma',
                        examCatalogId: 'synthetic-catalog-1',
                        reason: 'Consulta de rotina',
                        status: 'collected',
                        collectedAt: '2026-09-07T09:20:00Z',
                        collectedByUserId: 'synthetic-technician',
                        createdAt: '2026-09-07T09:00:00Z',
                        updatedAt: '2026-09-07T09:00:00Z'
                      }
                    ];
              await fulfill({ items, total: items.length });
              return;
            }
            if (
              laboratoryFeedback &&
              target === '/laboratory/results' &&
              url.pathname === '/api/laboratory/results'
            ) {
              laboratoryResultsAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
              if (laboratoryResultsAttempts === 1) {
                await route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Falha sintética de disponibilidade dos laudos' })
                });
                return;
              }
              if (laboratoryResultsAttempts === 5) {
                await route.fulfill({
                  status: 403,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Permissão diagnostics.read ausente' })
                });
                return;
              }
              const items =
                laboratoryResultsAttempts === 2 || laboratoryResultsAttempts === 4
                  ? []
                  : [
                      {
                        id: 'synthetic-lab-report-1',
                        accountId: 'synthetic-account',
                        encounterId: 'synthetic-encounter-1',
                        patientId: 'synthetic-lab-patient-1',
                        examType: 'Hemograma',
                        examCatalogId: 'synthetic-catalog-1',
                        reason: 'Consulta de rotina',
                        status: 'resulted',
                        resultSummary: 'Sem alterações relevantes.',
                        resultValues: [
                          {
                            parameter: 'Hemácias',
                            value: '5,9',
                            unit: 'milhões/µL',
                            reference: '5,5–8,5'
                          }
                        ],
                        resultAttachmentId: 'synthetic-lab-attachment-1',
                        createdAt: '2026-09-06T09:00:00Z',
                        updatedAt: '2026-09-07T09:00:00Z'
                      }
                    ];
              await fulfill({ items, total: items.length });
              return;
            }
            if (
              laboratoryFeedback &&
              target === '/laboratory/results' &&
              url.pathname === '/api/attachments/synthetic-lab-attachment-1/download-url' &&
              route.request().method() === 'POST'
            ) {
              await fulfill({
                url: '/attachments/synthetic-lab-attachment-1/content?token=synthetic-lab-token',
                expiresAt: '2099-01-01T00:00:00.000Z'
              });
              return;
            }
            if (
              laboratoryAnalyticalContinuity &&
              laboratoryAnalyticalTargets.includes(target) &&
              url.pathname === `/api${target}`
            ) {
              const examType = target === '/laboratory/hemograms'
                ? 'HEM'
                : target === '/laboratory/urinalysis' ? 'URIN' : 'BIO';
              if (url.searchParams.get('code') === 'forbidden') {
                await route.fulfill({
                  status: 403,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Permissão diagnostics.read ausente' })
                });
                return;
              }
              const openView = url.searchParams.get('closed') === 'false';
              const noMatchingExam = url.searchParams.get('code') === 'ausente';
              const analyticalRecord = {
                id: `synthetic-lab-${examType.toLowerCase()}-1`,
                accountId: 'synthetic-account',
                encounterId: 'synthetic-encounter-1',
                patientId: 'synthetic-lab-patient-1',
                examType,
                examCatalogId: `synthetic-${examType.toLowerCase()}-catalog`,
                reason: openView ? 'Aguardando resultado' : 'Painel de demonstração',
                status: openView ? 'collected' : 'resulted',
                resultSummary: openView ? undefined : 'Resultado estruturado da amostra sintética.',
                resultValues: openView ? [] : [{
                  parameter: examType === 'URIN' ? 'pH urinário' : examType === 'BIO' ? 'ALT' : 'Hemácias',
                  value: examType === 'URIN' ? '6,0' : examType === 'BIO' ? '92' : '5,9',
                  unit: examType === 'URIN' ? 'escala' : examType === 'BIO' ? 'U/L' : 'milhões/µL',
                  reference: examType === 'URIN' ? '5,5–7,0' : examType === 'BIO' ? '10–125 U/L' : '5,5–8,5',
                  outOfRange: false
                }],
                createdAt: '2026-09-06T09:00:00Z',
                updatedAt: '2026-09-07T09:00:00Z'
              };
              const analyticalRequestedRecord = {
                ...analyticalRecord,
                id: `${analyticalRecord.id}-requested`,
                reason: 'Aguardando coleta',
                status: 'requested'
              };
              const analyticalCollectedRecord = {
                ...analyticalRecord,
                id: `${analyticalRecord.id}-collected`,
                reason: 'Aguardando resultado',
                status: 'collected'
              };
              await fulfill({
                items: noMatchingExam
                  ? []
                  : openView
                    ? [analyticalRequestedRecord, analyticalCollectedRecord]
                    : [analyticalRecord],
                total: noMatchingExam ? 0 : openView ? 2 : 1
              });
              return;
            }
            if (
              laboratoryAnalyticalContinuity &&
              laboratoryAnalyticalTargets.includes(target) &&
              url.pathname === '/api/laboratory/reference-values'
            ) {
              laboratoryReferenceAttempts += 1;
              if (laboratoryReferenceAttempts <= 2) {
                await route.fulfill({
                  status: 503,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Catálogo sintético temporariamente indisponível' })
                });
                return;
              }
              await fulfill({
                items: [
                  {
                    id: `synthetic-reference-${target.split('/').at(-1)}`,
                    parameter: target === '/laboratory/urinalysis'
                      ? 'pH urinário'
                      : target === '/laboratory/biochemistry' ? 'ALT' : 'Hemácias',
                    examType: target === '/laboratory/hemograms' ? 'HEM' : target === '/laboratory/urinalysis' ? 'URIN' : 'BIO',
                    minValue: target === '/laboratory/biochemistry' ? 10 : 5.5,
                    maxValue: target === '/laboratory/biochemistry' ? 125 : target === '/laboratory/urinalysis' ? 7 : 8.5,
                    unit: target === '/laboratory/urinalysis'
                      ? 'escala'
                      : target === '/laboratory/biochemistry' ? 'U/L' : 'milhões/µL'
                  }
                ]
              });
              return;
            }
            if (
              laboratoryFeedback &&
              (target === '/laboratory/orders' || target === '/laboratory/results') &&
              url.pathname === '/api/patients'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-lab-patient-1',
                    accountId: 'synthetic-account',
                    name: 'Luna Sintética',
                    species: 'dog',
                    primaryOwnerId: 'synthetic-lab-owner-1',
                    status: 'active'
                  }
                ]
              });
              return;
            }
            if (
              laboratoryAnalyticalContinuity &&
              laboratoryAnalyticalTargets.includes(target) &&
              url.pathname === '/api/patients'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-lab-patient-1',
                    accountId: 'synthetic-account',
                    name: 'Luna Analítica',
                    species: 'dog',
                    primaryOwnerId: 'synthetic-lab-owner-1',
                    status: 'active'
                  }
                ]
              });
              return;
            }
            if (
              laboratoryFeedback &&
              (target === '/laboratory/orders' || target === '/laboratory/results') &&
              url.pathname === '/api/owners'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-lab-owner-1',
                    accountId: 'synthetic-account',
                    fullName: 'Maria Sintética',
                    contacts: [],
                    status: 'active'
                  }
                ]
              });
              return;
            }
            if (
              laboratoryAnalyticalContinuity &&
              laboratoryAnalyticalTargets.includes(target) &&
              url.pathname === '/api/owners'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-lab-owner-1',
                    accountId: 'synthetic-account',
                    fullName: 'Maria Analítica',
                    contacts: [],
                    status: 'active'
                  }
                ]
              });
              return;
            }
            if (
              laboratoryFeedback &&
              target === '/laboratory/results' &&
              url.pathname === '/api/ml/anomalies/laboratory-results'
            ) {
              await fulfill({
                generatedAt: '2026-09-07T09:00:00Z',
                totalAnalyzed: 1,
                flaggedOrders: 0,
                flags: []
              });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/owners'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-search-owner',
                    accountId: 'synthetic-account',
                    fullName: 'Maria Sintética',
                    documentId: '12345678900',
                    contacts: [{ type: 'phone', value: '1100000000', primary: true }],
                    financialResponsible: true,
                    status: 'active'
                  }
                ]
              });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/patients'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-search-patient',
                    accountId: 'synthetic-account',
                    name: 'Luna Sintética',
                    species: 'dog',
                    sex: 'female',
                    primaryOwnerId: 'synthetic-search-owner',
                    status: 'active',
                    createdAt: '2026-09-07T09:00:00Z',
                    updatedAt: '2026-09-07T09:00:00Z'
                  }
                ]
              });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/products'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/counter-sales'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/laboratory/orders'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/vaccines-dewormers'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              masterSearchContinuity &&
              target === '/master-search' &&
              url.pathname === '/api/billing'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/beds/synthetic-bed-occupied' &&
              url.pathname.startsWith('/api/beds/') &&
              route.request().method() === 'GET'
            ) {
              const bedId = url.pathname.split('/').at(-1);
              const statusById = {
                'synthetic-bed-occupied': ['occupied', 'A-01', 'Leito A-01'],
                'synthetic-bed-maintenance': ['maintenance', 'A-02', 'Leito A-02'],
                'synthetic-bed-blocked': ['blocked', 'A-03', 'Leito A-03'],
                'synthetic-bed-available': ['available', 'A-04', 'Leito A-04']
              }[bedId];
              if (!statusById) {
                await route.fulfill({
                  status: 404,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Box sintético não encontrado.' })
                });
                return;
              }
              const [status, code, name] = statusById;
              await fulfill({
                id: bedId,
                accountId: 'synthetic-account',
                sectorId: 'synthetic-sector',
                code,
                name,
                status,
                active: status !== 'blocked',
                supportsSpecies: status === 'occupied' ? 'canine' : null,
                createdAt: '2026-09-07T08:00:00Z',
                updatedAt: '2026-09-07T09:00:00Z'
              });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/beds/synthetic-bed-occupied' &&
              url.pathname === '/api/sectors'
            ) {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-sector',
                    accountId: 'synthetic-account',
                    code: 'CLIN',
                    name: 'Internação Clínica',
                    kind: 'clinical',
                    active: true,
                    createdAt: '2026-09-07T08:00:00Z',
                    updatedAt: '2026-09-07T09:00:00Z'
                  }
                ]
              });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/inpatient/synthetic-inpatient-stay' &&
              url.pathname === '/api/inpatient'
            ) {
              const detailFixture = new URL(page.url()).searchParams.get('fixture');
              if (detailFixture === 'modal' || inpatientModalFixtureActive) {
                inpatientModalFixtureActive = true;
                const requestedDetailId =
                  new URL(page.url()).pathname.split('/').at(-1) === 'synthetic-inpatient-stay-2'
                    ? 'synthetic-inpatient-stay-2'
                    : 'synthetic-inpatient-stay';
                const moved = requestedDetailId === 'synthetic-inpatient-stay-2';
                await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
                await fulfill({
                  items: [
                    {
                      id: requestedDetailId,
                      accountId: 'synthetic-account',
                      encounterId: moved ? 'synthetic-encounter-2' : 'synthetic-encounter',
                      patientId: 'synthetic-patient-1',
                      ownerId: 'synthetic-owner-1',
                      admittedByUserId: 'synthetic-operator',
                      unit: 'Clínica',
                      ward: moved ? 'Ala Sul' : 'Ala Norte',
                      bed: moved ? 'B-01' : 'A-01',
                      status: 'admitted',
                      admittedAt: '2026-09-07T08:00:00Z',
                      updatedAt: '2026-09-07T09:00:00Z'
                    }
                  ]
                });
                return;
              }
              if (detailFixture === 'reset' && !inpatientDetailResetApplied) {
                inpatientDetailAttempts = 0;
                inpatientDetailResetApplied = true;
              }
              if (detailFixture === 'initial-failure') {
                inpatientDetailInitialFailureAttempts += 1;
                await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
                if (inpatientDetailInitialFailureAttempts === 1) {
                  inpatientDetailAttempts = 0;
                  await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                      message: 'Falha sintética no carregamento inicial da internação.'
                    })
                  });
                } else {
                  await fulfill({
                    items: [
                      {
                        id: 'synthetic-inpatient-stay',
                        accountId: 'synthetic-account',
                        encounterId: 'synthetic-encounter',
                        patientId: 'synthetic-patient-1',
                        ownerId: 'synthetic-owner-1',
                        admittedByUserId: 'synthetic-operator',
                        unit: 'Clínica',
                        ward: 'Ala Norte',
                        bed: 'A-01',
                        status: 'admitted',
                        admittedAt: '2026-09-07T08:00:00Z',
                        updatedAt: '2026-09-07T09:00:00Z'
                      }
                    ]
                  });
                }
                return;
              }
              inpatientDetailAttempts += 1;
              const requestedDetailId =
                new URL(page.url()).pathname.split('/').at(-1) === 'synthetic-inpatient-stay-2'
                  ? 'synthetic-inpatient-stay-2'
                  : 'synthetic-inpatient-stay';
              await new Promise((resolveDelay) =>
                setTimeout(resolveDelay, inpatientDetailAttempts === 2 ? 450 : 180)
              );
              if (inpatientDetailAttempts === 6) {
                await route.fulfill({
                  status: 403,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Acesso negado aos detalhes da internação.' })
                });
                return;
              }
              if (inpatientDetailAttempts === 5) {
                await route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: JSON.stringify({
                    message: 'Falha sintética ao atualizar o detalhe da internação.'
                  })
                });
                return;
              }
              const moved = requestedDetailId === 'synthetic-inpatient-stay-2';
              const refreshed = moved ? inpatientDetailAttempts >= 4 : inpatientDetailAttempts >= 2;
              await fulfill({
                items: [
                  {
                    id: requestedDetailId,
                    accountId: 'synthetic-account',
                    encounterId: moved ? 'synthetic-encounter-2' : 'synthetic-encounter',
                    patientId: 'synthetic-patient-1',
                    ownerId: 'synthetic-owner-1',
                    admittedByUserId: 'synthetic-operator',
                    unit: 'Clínica',
                    ward: moved ? 'Ala Sul' : 'Ala Norte',
                    bed: moved ? (refreshed ? 'B-02' : 'B-01') : refreshed ? 'A-02' : 'A-01',
                    status: moved || refreshed ? 'stable' : 'admitted',
                    admittedAt: '2026-09-07T08:00:00Z',
                    updatedAt: refreshed ? '2026-09-07T10:00:00Z' : '2026-09-07T09:00:00Z'
                  }
                ]
              });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/inpatient/synthetic-inpatient-stay' &&
              url.pathname === '/api/inpatient/synthetic-inpatient-stay/progress'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/inpatient/synthetic-inpatient-stay' &&
              url.pathname === '/api/inpatient/synthetic-inpatient-stay/occurrences'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/inpatient/synthetic-inpatient-stay' &&
              url.pathname === '/api/inpatient/synthetic-inpatient-stay/daily-charges'
            ) {
              await fulfill({ items: [] });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/inpatient' &&
              url.pathname === '/api/inpatient'
            ) {
              const patientId = url.searchParams.get('patientId');
              if (patientId === 'synthetic-initial-failure') {
                inpatientListInitialFailureAttempts += 1;
                await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
                if (inpatientListInitialFailureAttempts === 1) {
                  await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                      message: 'Falha sintética no carregamento inicial da lista.'
                    })
                  });
                } else {
                  await fulfill({ items: [] });
                }
                return;
              }
              if (patientId === 'synthetic-empty') {
                await fulfill({ items: [] });
                return;
              }
              if (
                new URL(page.url()).searchParams.get('fixture') === 'reset' &&
                !inpatientListResetApplied
              ) {
                inpatientListAttempts = 0;
                inpatientListResetApplied = true;
              }
              inpatientListAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
              if (inpatientListAttempts === 3) {
                await route.fulfill({
                  status: 403,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Acesso negado para a lista de internações.' })
                });
                return;
              }
              const stayStatus = inpatientListAttempts === 1 ? 'admitted' : 'stable';
              await fulfill({
                items: [
                  {
                    id: 'synthetic-inpatient-stay',
                    accountId: 'synthetic-account',
                    encounterId: 'synthetic-encounter',
                    patientId: 'synthetic-patient-1',
                    ownerId: 'synthetic-owner-1',
                    admittedByUserId: 'synthetic-operator',
                    unit: 'Clínica',
                    ward: 'Ala Norte',
                    bed: 'A-01',
                    status: stayStatus,
                    admittedAt: '2026-09-07T08:00:00Z',
                    updatedAt: '2026-09-07T09:00:00Z'
                  }
                ]
              });
              return;
            }
            if (inpatientContinuity && target === '/inpatient' && url.pathname === '/api/beds') {
              await fulfill({
                items: [
                  {
                    id: 'synthetic-bed-1',
                    accountId: 'synthetic-account',
                    sectorId: 'synthetic-sector',
                    code: 'A-01',
                    name: 'Leito A-01',
                    status: 'occupied',
                    active: true
                  },
                  {
                    id: 'synthetic-bed-2',
                    accountId: 'synthetic-account',
                    sectorId: 'synthetic-sector',
                    code: 'A-02',
                    name: 'Leito A-02',
                    status: 'available',
                    active: true
                  },
                  {
                    id: 'synthetic-bed-3',
                    accountId: 'synthetic-account',
                    sectorId: 'synthetic-sector',
                    code: 'A-03',
                    name: 'Leito A-03',
                    status: 'maintenance',
                    active: true
                  }
                ]
              });
              return;
            }
            if (
              inpatientContinuity &&
              target === '/inpatient/board' &&
              url.pathname === '/api/bed-map'
            ) {
              const fixture = new URL(page.url()).searchParams.get('fixture');
              if (fixture === 'initial-failure') {
                bedMapInitialFailureAttempts += 1;
                await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
                if (bedMapInitialFailureAttempts === 1) {
                  await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                      message: 'Falha sintética no carregamento inicial do mapa.'
                    })
                  });
                } else {
                  await fulfill({ items: [], totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });
                }
                return;
              }
              if (fixture === 'empty') {
                await fulfill({ items: [], totalBeds: 0, occupiedBeds: 0, availableBeds: 0 });
                return;
              }
              if (fixture === 'reset' && !bedMapResetApplied) {
                bedMapAttempts = 0;
                bedMapResetApplied = true;
              }
              bedMapAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
              if (bedMapAttempts === 3) {
                await route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: JSON.stringify({
                    message: 'Falha sintética ao atualizar o mapa de leitos.'
                  })
                });
                return;
              }
              if (bedMapAttempts === 4) {
                await route.fulfill({
                  status: 403,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Acesso negado ao mapa de leitos.' })
                });
                return;
              }
              const updated = bedMapAttempts === 2;
              await fulfill({
                items: [
                  {
                    sectorId: 'synthetic-sector',
                    sectorCode: 'CLIN',
                    sectorName: 'Internação Clínica',
                    kind: 'clinical',
                    beds: [
                      {
                        id: 'synthetic-bed-1',
                        code: 'A-01',
                        name: 'Leito A-01',
                        status: 'occupied',
                        patientId: 'synthetic-patient-1',
                        stayId: 'synthetic-inpatient-stay',
                        encounterId: 'synthetic-encounter',
                        occupiedSince: '2026-09-07T08:00:00Z'
                      },
                      {
                        id: 'synthetic-bed-2',
                        code: 'A-02',
                        name: 'Leito A-02',
                        status: updated ? 'occupied' : 'available',
                        patientId: updated ? 'synthetic-patient-2' : undefined,
                        stayId: updated ? 'synthetic-inpatient-stay-2' : undefined,
                        encounterId: updated ? 'synthetic-encounter-2' : undefined
                      },
                      {
                        id: 'synthetic-bed-3',
                        code: 'A-03',
                        name: 'Leito A-03',
                        status: 'maintenance'
                      },
                      { id: 'synthetic-bed-4', code: 'A-04', name: 'Leito A-04', status: 'blocked' }
                    ],
                    totalBeds: 4,
                    occupiedBeds: updated ? 2 : 1,
                    availableBeds: updated ? 0 : 1
                  }
                ],
                totalBeds: 4,
                occupiedBeds: updated ? 2 : 1,
                availableBeds: updated ? 0 : 1
              });
              return;
            }
            if (
              cashContinuity &&
              target === '/cash' &&
              url.pathname === '/api/cash-register/dashboard'
            ) {
              cashDashboardAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
              await fulfill(
                cashDashboard(
                  cashClosed ? 'closed' : cashDashboardAttempts === 1 ? 'initial' : 'updated'
                )
              );
              return;
            }
            if (
              cashContinuity &&
              target === '/cash' &&
              url.pathname === '/api/cash-register/movements' &&
              route.request().method() === 'POST'
            ) {
              cashMovementAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 220));
              if (cashMovementAttempts === 1) {
                await route.fulfill({
                  status: 500,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Falha sintética ao registrar entrada.' })
                });
                return;
              }
              if (cashMovementAttempts === 3) {
                await route.fulfill({
                  status: 504,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Timeout sintético da operação de caixa.' })
                });
                return;
              }
              await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                  id: 'synthetic-cash-movement-created',
                  cashRegisterId: 'synthetic-cash-register',
                  movementType: 'supply',
                  amount: 50,
                  runningBalance: 250,
                  reference: 'Reforço sintético',
                  notes: null,
                  paymentMethod: 'Dinheiro',
                  createdAt: '2026-09-07T09:05:00Z'
                })
              });
              return;
            }
            if (
              cashContinuity &&
              target === '/cash' &&
              url.pathname === '/api/cash-register/close' &&
              route.request().method() === 'POST'
            ) {
              cashCloseAttempts += 1;
              cashClosed = true;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 220));
              await fulfill({
                register: {
                  id: 'synthetic-cash-register',
                  status: 'closed',
                  openedAt: '2026-09-07T08:00:00Z',
                  openingAmount: 120,
                  runningBalance: 0,
                  notes: 'Abertura sintética'
                },
                movement: {
                  id: 'synthetic-closing-movement',
                  movementType: 'closing',
                  amount: 250,
                  runningBalance: 0
                },
                difference: 0
              });
              return;
            }
            if (
              inventoryContinuity &&
              (target === '/inventory' || target === '/inventory/purchases') &&
              url.pathname === '/api/inventory'
            ) {
              inventoryItemsAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
              await fulfill({
                items: inventoryItems(url.searchParams.get('q') ?? ''),
                total: inventoryItems(url.searchParams.get('q') ?? '').length
              });
              return;
            }
            if (
              inventoryContinuity &&
              target === '/inventory/purchases' &&
              url.pathname === '/api/inventory/lots'
            ) {
              inventoryLotsAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
              await fulfill({ items: inventoryLots });
              return;
            }
            if (
              inventoryContinuity &&
              target === '/inventory/purchases' &&
              url.pathname === '/api/inventory/purchases'
            ) {
              inventoryPurchasesAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
              await fulfill({ items: inventoryPurchases });
              return;
            }
            if (
              (reportContinuity || accessibilityContinuity) &&
              (target === '/reports/inventory' ||
                (reportContinuity &&
                  [
                    '/reports/accounts-payable',
                    '/reports/accounts-receivable',
                    '/reports/advance-payments'
                  ].includes(target))) &&
              url.pathname === '/api/reports/executions' &&
              route.request().method() === 'POST'
            ) {
              reportExecutionAttempts += 1;
              const payload = JSON.parse(route.request().postData() ?? '{}');
              const filters = payload.filters ?? {};
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
              if (
                target === '/reports/inventory' &&
                String(filters.search ?? '').toLowerCase() === 'falha' &&
                !reportFailureInjected
              ) {
                reportFailureInjected = true;
                await route.fulfill({
                  status: 503,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Falha sintética na fonte do relatório.' })
                });
                return;
              }
              await fulfill(
                target === '/reports/inventory'
                  ? reportExecution(filters)
                  : reportFinancialExecution(reportIdForTarget(target), filters)
              );
              return;
            }
            if (
              (reportContinuity || accessibilityContinuity) &&
              (target === '/reports/inventory' ||
                (reportContinuity &&
                  [
                    '/reports/accounts-payable',
                    '/reports/accounts-receivable',
                    '/reports/advance-payments'
                  ].includes(target))) &&
              url.pathname.match(/^\/api\/reports\/executions\/[^/]+\/export$/) &&
              route.request().method() === 'POST'
            ) {
              reportExportAttempts += 1;
              lastReportExportExecutionId = url.pathname.split('/').at(-2);
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 180));
              if (target === '/reports/inventory' && reportExportAttempts === 2) {
                await route.fulfill({
                  status: 503,
                  contentType: 'application/json',
                  body: JSON.stringify({ message: 'Falha sintética ao gerar o arquivo.' })
                });
                return;
              }
              await fulfill({
                id: `synthetic-report-export-${reportExportAttempts}`,
                accountId: 'synthetic-account',
                executionId: url.pathname.split('/').at(-2),
                format: 'csv',
                filename:
                  target === '/reports/inventory'
                    ? 'posicao-atual-de-estoque-2026-09-07.csv'
                    : target === '/reports/accounts-payable'
                      ? 'contas-a-pagar-2026-09-07.csv'
                      : target === '/reports/accounts-receivable'
                        ? 'contas-a-receber-2026-09-07.csv'
                        : 'pagamentos-antecipados-2026-09-07.csv',
                contentType: 'text/csv;charset=utf-8',
                contentEncoding: 'utf8',
                content: renderSyntheticReportCsv(target),
                exportedByUserId: 'synthetic-operator',
                exportedAt: '2026-09-07T09:01:00Z'
              });
              return;
            }
            if (
              (accessibilityContinuity || accessControlContinuity) &&
              target === '/access-control'
            ) {
              if (url.pathname === '/api/access-control' && route.request().method() === 'GET') {
                accessCatalogAttempts += 1;
                if (accessControlContinuity && accessCatalogAttempts === 1) {
                  await route.fulfill({
                    status: 403,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Acesso negado ao catálogo de governança.' })
                  });
                  return;
                }
                await fulfill(accessCatalog);
                return;
              }
              if (
                url.pathname === '/api/access-control/module-permission-matrix' &&
                route.request().method() === 'GET'
              ) {
                await fulfill(accessMatrix);
                return;
              }
              if (
                url.pathname === '/api/access-control/users/synthetic-access-user/effective' &&
                route.request().method() === 'GET'
              ) {
                await fulfill(accessEffective);
                return;
              }
            }
            if (
              (usersContinuity || navigationContinuity) &&
              target === '/users' &&
              url.pathname === '/api/users' &&
              route.request().method() === 'GET'
            ) {
              if (navigationContinuity && !usersContinuity) {
                await fulfill({ items: usersFixture, total: usersFixture.length });
                return;
              }
              usersAttempts += 1;
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 140));
              if (usersAttempts === 2) {
                await fulfillStatus(503, {
                  message: 'Synthetic users backend detail must never reach the UI.'
                });
                return;
              }
              if (usersAttempts === 4) {
                await fulfillStatus(403, {
                  message: 'Synthetic permission detail must never reach the UI.'
                });
                return;
              }
              await fulfill({ items: usersFixture, total: usersFixture.length });
              return;
            }
            if (
              navigationContinuity &&
              target === '/users' &&
              url.pathname === '/api/users/synthetic-user-admin' &&
              route.request().method() === 'GET'
            ) {
              await fulfill(usersFixture[0]);
              return;
            }
            if (url.pathname === '/api/scheduling/overview') {
              await fulfill(
                makeOverview(
                  url.searchParams.get('referenceDate')?.slice(0, 10) ??
                    new Date().toISOString().slice(0, 10)
                )
              );
              return;
            }
            if (patientDetailContinuity && target === '/patients/synthetic-patient-1') {
              const patientPathMatch = url.pathname.match(/^\/api\/patients\/([^/]+)$/);
              if (patientPathMatch) {
                const requestedPatient = patientDetailPatients[patientPathMatch[1]];
                if (!requestedPatient) {
                  await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Paciente sintético não encontrado.' })
                  });
                  return;
                }
                await new Promise((resolveDelay) =>
                  setTimeout(
                    resolveDelay,
                    patientPathMatch[1] === 'synthetic-patient-2' ? 360 : 120
                  )
                );
                await fulfill(requestedPatient);
                return;
              }
              if (url.pathname === '/api/patients' && route.request().method() === 'GET') {
                await fulfill({
                  items: Object.values(patientDetailPatients),
                  total: Object.values(patientDetailPatients).length
                });
                return;
              }
              const ownerPathMatch = url.pathname.match(/^\/api\/owners\/([^/]+)$/);
              if (ownerPathMatch) {
                const requestedOwner = patientDetailOwners[ownerPathMatch[1]];
                if (!requestedOwner) {
                  await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Tutor sintético não encontrado.' })
                  });
                  return;
                }
                await fulfill(requestedOwner);
                return;
              }
              if (url.pathname === '/api/owners' && route.request().method() === 'GET') {
                await fulfill({
                  items: Object.values(patientDetailOwners),
                  total: Object.values(patientDetailOwners).length
                });
                return;
              }
              if (url.pathname.match(/^\/api\/patients\/[^/]+\/summary$/)) {
                const requestedPatientId = url.pathname.split('/').at(-2);
                const requestedPatient = patientDetailPatients[requestedPatientId];
                if (!requestedPatient) {
                  await route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: 'Resumo sintético não encontrado.' })
                  });
                  return;
                }
                await fulfill(patientDetailSummary(requestedPatient));
                return;
              }
              if (url.pathname === '/api/encounters') {
                await fulfill({ items: [patientDetailEncounter] });
                return;
              }
              if (url.pathname.match(/^\/api\/encounters\/[^/]+\/timeline$/)) {
                await fulfill({ items: patientDetailEncounterTimeline });
                return;
              }
              if (url.pathname === '/api/appointments') {
                const requestedPatientId = url.searchParams.get('patientId');
                const items =
                  requestedPatientId === 'synthetic-patient-1' ? patientDetailAppointments : [];
                await fulfill({ items, total: items.length });
                return;
              }
              if (url.pathname === '/api/medical-records' && route.request().method() === 'GET') {
                await fulfill({ items: patientDetailRecords });
                return;
              }
              if (
                url.pathname === '/api/medical-records/entries' &&
                route.request().method() === 'GET'
              ) {
                const requestedEncounterId = url.searchParams.get('encounterId');
                await fulfill({
                  items:
                    requestedEncounterId === patientDetailEncounter.id ? patientDetailEntries : []
                });
                return;
              }
              if (url.pathname === '/api/medical-records/timeline') {
                const requestedEncounterId = url.searchParams.get('encounterId');
                await fulfill({
                  items:
                    requestedEncounterId === patientDetailEncounter.id
                      ? patientDetailClinicalTimeline
                      : []
                });
                return;
              }
              if (url.pathname === '/api/triage') {
                const requestedEncounterId = url.searchParams.get('encounterId');
                await fulfill({
                  records:
                    requestedEncounterId === patientDetailEncounter.id ? patientDetailTriage : []
                });
                return;
              }
              if (url.pathname === '/api/billing') {
                const requestedOwnerId = url.searchParams.get('ownerId');
                const requestedEncounterId = url.searchParams.get('encounterId');
                const items =
                  requestedOwnerId === 'synthetic-owner-context-1' ||
                  requestedEncounterId === patientDetailEncounter.id
                    ? patientDetailBilling
                    : [];
                await fulfill({ items, total: items.length });
                return;
              }
              if (url.pathname === `/api/billing/${patientDetailEncounter.id}/items`) {
                await fulfill({ items: patientDetailBillingItems });
                return;
              }
              if (url.pathname === '/api/laboratory/orders') {
                const requestedPatientId = url.searchParams.get('patientId');
                const items =
                  requestedPatientId === 'synthetic-patient-1' ? patientDetailDiagnosticOrders : [];
                await fulfill({ items, total: items.length });
                return;
              }
              if (url.pathname === '/api/prescriptions') {
                const requestedPatientId = url.searchParams.get('patientId');
                const items =
                  requestedPatientId === 'synthetic-patient-1' ? patientDetailPrescriptions : [];
                await fulfill({ items, total: items.length });
                return;
              }
              if (url.pathname === '/api/vaccines-dewormers') {
                const requestedPatientId = url.searchParams.get('patientId');
                const items =
                  requestedPatientId === 'synthetic-patient-1' ? patientDetailPreventiveEvents : [];
                await fulfill({ items, total: items.length });
                return;
              }
              if (url.pathname === '/api/inpatient') {
                await fulfill({ items: [] });
                return;
              }
              if (url.pathname === '/api/attachments') {
                const linkedEntityId = url.searchParams.get('linkedEntityId');
                const items =
                  linkedEntityId === patientDetailRecord.id ? patientDetailAttachments : [];
                await fulfill({ items, total: items.length });
                return;
              }
              if (url.pathname === '/api/quotes') {
                await fulfill({ items: patientDetailQuotes, total: patientDetailQuotes.length });
                return;
              }
            }
            if (receptionPopulated && target === '/reception') {
              if (url.pathname === '/api/queue') {
                const fixtureDate = new Date().toISOString().slice(0, 10);
                await fulfill({
                  items: [
                    {
                      id: 'synthetic-queue',
                      accountId: 'synthetic-account',
                      ownerId: 'synthetic-owner-1',
                      patientId: 'synthetic-patient-1',
                      appointmentId: null,
                      encounterId: null,
                      status: 'waiting',
                      priority: 'high',
                      reason: 'Consulta sintética',
                      checkedInAt: `${fixtureDate}T09:00:00Z`,
                      calledAt: null,
                      createdAt: `${fixtureDate}T09:00:00Z`,
                      updatedAt: `${fixtureDate}T09:00:00Z`
                    }
                  ]
                });
                return;
              }
              if (url.pathname === '/api/owners') {
                if (url.searchParams.get('q') === 'old-reception') {
                  await new Promise((resolveOld) => {
                    releaseOldReception = resolveOld;
                  });
                  await fulfill({
                    items: [
                      {
                        id: 'obsolete-owner',
                        fullName: 'Obsoleto Sintético',
                        contacts: [],
                        status: 'active'
                      }
                    ]
                  });
                  return;
                }
                await fulfill({
                  items: [
                    {
                      id: 'synthetic-owner-1',
                      fullName: 'Maria Sintética',
                      contacts: [{ type: 'phone', value: '1100000000', primary: true }],
                      status: 'active'
                    }
                  ]
                });
                return;
              }
              if (url.pathname === '/api/patients') {
                await fulfill({
                  items: [
                    {
                      id: 'synthetic-patient-1',
                      name: 'Luna Sintética',
                      species: 'cat',
                      primaryOwnerId: 'synthetic-owner-1',
                      status: 'active'
                    }
                  ]
                });
                return;
              }
            }
            if (url.pathname === '/api/quotes') {
              const search = url.searchParams.get('search');
              if (search === 'old')
                await new Promise((resolveOld) => {
                  releaseOldQuote = resolveOld;
                });
              await fulfill({
                items: search ? [quote(search === 'old' ? 'OLD-RESULT' : 'CURRENT-RESULT')] : []
              });
              return;
            }
            if (url.pathname.startsWith('/api/quotes/')) {
              await fulfill({ ...quote(url.pathname.split('/').at(-1)), items: [] });
              return;
            }
            if (url.pathname === '/api/services') {
              await fulfill({ items: [] });
              return;
            }
            if (
              url.pathname === '/api/owners/synthetic-owner-1' ||
              url.pathname === '/api/owners/synthetic-owner-2'
            ) {
              const ownerId = url.pathname.split('/').at(-1);
              await fulfill({
                id: ownerId,
                fullName:
                  patientBrowserContinuity && ownerId === 'synthetic-owner-2'
                    ? 'João Visual'
                    : 'Maria Visual',
                contacts: []
              });
              return;
            }
            if (
              url.pathname === '/api/patients/synthetic-patient-1' ||
              url.pathname === '/api/patients/synthetic-patient-2'
            ) {
              await fulfill({
                id: url.pathname.split('/').at(-1),
                name: 'Luna Visual',
                species: 'dog'
              });
              return;
            }
            await fulfill({ items: [], total: 0, setupRequired: false });
          });

          const interactions = [];
          const laboratoryScreenshotEvidence = [];
          const captureLaboratoryScreenshot = async (file, fullPage) => {
            const isLaboratory = laboratoryFeedback || laboratoryAnalyticalContinuity;
            if (isLaboratory) {
              await page.evaluate(() => {
                window.scrollTo(0, 0);
                document.querySelectorAll('.table-wrapper, .matrix-wrapper').forEach((element) => {
                  element.scrollLeft = 0;
                });
              });
            }
            const scrollY = await page.evaluate(() => window.scrollY);
            if (isLaboratory) assert.equal(scrollY, 0, `Captura laboratorial fora do topo: ${file}`);
            await page.screenshot({ path: join(out, file), fullPage });
            if (isLaboratory) laboratoryScreenshotEvidence.push({ file, fullPage, scrollY });
          };
          try {
            await page.goto(`${origin}${target}`, { waitUntil: 'networkidle' });
            await page.locator(target === '/login' ? '#email' : '#main-content').waitFor();
            await page.evaluate(() => document.fonts.ready);
            const measure = await page.evaluate(() => {
              const box = (el) => {
                const r = el.getBoundingClientRect();
                return {
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                  right: r.right,
                  bottom: r.bottom
                };
              };
              return {
                viewport: { width: innerWidth, height: innerHeight },
                route: location.pathname,
                title: document.title,
                documentWidth: document.documentElement.scrollWidth,
                documentHeight: document.documentElement.scrollHeight,
                headings: [...document.querySelectorAll('h1,h2,h3')].map((el) => ({
                  text: el.textContent.trim(),
                  ...box(el)
                })),
                mainCount: document.querySelectorAll('main,[role="main"]').length,
                firstData: [
                  ...document.querySelectorAll(
                    'tbody tr,.timeline-item,.agenda-appointment-row,.owner-card,.bed-card'
                  )
                ]
                  .slice(0, 3)
                  .map((el) => ({ text: el.textContent.trim().slice(0, 80), ...box(el) })),
                fonts: {
                  body: getComputedStyle(document.body).fontFamily,
                  heading: document.querySelector('h1')
                    ? getComputedStyle(document.querySelector('h1')).fontFamily
                    : null
                },
                scrollContainers: [...document.querySelectorAll('*')]
                  .filter(
                    (el) =>
                      el.clientWidth > 0 &&
                      el.scrollWidth > el.clientWidth + 2 &&
                      ['auto', 'scroll'].includes(getComputedStyle(el).overflowX)
                  )
                  .map((el) => ({
                    class: el.className,
                    clientWidth: el.clientWidth,
                    scrollWidth: el.scrollWidth,
                    ...box(el)
                  }))
              };
            });
            if (dashboardContinuity) {
              const dashboardProfile = dashboardProfileForTarget(target);
              assert.ok(dashboardProfile, `Perfil de dashboard ausente para ${target}`);
              const expectedPriority = {
                reception: { label: 'Recepção', action: '/appointments' },
                nurse: { label: 'Enfermagem', action: '/triage' },
                veterinarian: { label: 'Médico-veterinário', action: '/medical-records' },
                finance: { label: 'Financeiro', action: '/dashboards/financial' },
                admin: { label: 'Administração', action: '/audit' }
              }[dashboardProfile.key];
              const priority = page.getByTestId('session-priority');
              await priority.waitFor();
              assert.equal(
                await priority.getByText(expectedPriority.label, { exact: true }).count(),
                1
              );
              assert.equal(
                new URL(
                  await page.getByTestId('session-priority-action').getAttribute('href'),
                  origin
                ).pathname,
                expectedPriority.action
              );
              const persistedLinks = await page
                .locator('.link-list__item')
                .evaluateAll((elements) =>
                  elements.map((element) => ({
                    href: element.getAttribute('href'),
                    text: element.textContent?.trim()
                  }))
                );
              const allowedPaths = new Set(
                {
                  reception: ['/', '/appointments'],
                  nurse: ['/', '/medical-records'],
                  veterinarian: ['/', '/medical-records'],
                  finance: ['/'],
                  admin: ['/', '/audit', '/appointments', '/medical-records']
                }[dashboardProfile.key]
              );
              for (const item of persistedLinks) {
                assert.ok(
                  allowedPaths.has(new URL(item.href, origin).pathname),
                  `Rota persistida sem gate: ${JSON.stringify(item)}`
                );
              }
              const shellPersistedLinks = await page
                .locator('.sidebar__quick-link, .sidebar__recent-link')
                .evaluateAll((elements) =>
                  elements.map((element) => ({
                    href: element.getAttribute('href'),
                    text: element.textContent?.trim()
                  }))
                );
              for (const item of shellPersistedLinks) {
                assert.ok(
                  allowedPaths.has(new URL(item.href, origin).pathname),
                  `Atalho persistido do shell sem gate: ${JSON.stringify(item)}`
                );
              }
              const expectedPanels =
                dashboardProfile.key === 'admin'
                  ? ['Comandas abertas', 'Agenda e lembretes', 'Aniversariantes do dia']
                  : dashboardProfile.key === 'finance'
                    ? ['Comandas abertas']
                    : dashboardProfile.key === 'reception'
                      ? ['Agenda e lembretes', 'Aniversariantes do dia']
                      : [];
              for (const panel of [
                'Comandas abertas',
                'Agenda e lembretes',
                'Aniversariantes do dia'
              ]) {
                const count = await page.getByRole('heading', { name: panel, exact: true }).count();
                assert.equal(
                  count,
                  expectedPanels.includes(panel) ? 1 : 0,
                  `Painel não autorizado exposto: ${panel}`
                );
              }
              await page.waitForFunction(
                () => document.querySelectorAll('.sidebar__link').length > 0
              );
              const shellLinks = await page.locator('.sidebar__link').evaluateAll((elements) =>
                elements.map((element) => ({
                  href: element.getAttribute('href'),
                  text: element.textContent?.trim()
                }))
              );
              const visibleShellPaths = shellLinks.map(
                (item) => new URL(item.href, origin).pathname
              );
              const expectedVisiblePaths = {
                reception: ['/reception', '/appointments'],
                nurse: ['/triage', '/inpatient', '/medical-records', '/diagnostics'],
                veterinarian: ['/medical-records', '/encounters', '/diagnostics'],
                finance: ['/cash', '/billing', '/counter-sales'],
                admin: ['/appointments', '/audit', '/access-control']
              }[dashboardProfile.key];
              for (const expectedPath of expectedVisiblePaths) {
                assert.ok(
                  visibleShellPaths.includes(expectedPath),
                  `Menu esperado não exposto para ${dashboardProfile.key}: ${expectedPath}`
                );
              }
              const forbiddenPrefixes = {
                reception: [
                  '/triage',
                  '/inpatient',
                  '/medical-records',
                  '/encounters',
                  '/laboratory',
                  '/diagnostics',
                  '/inventory',
                  '/finance',
                  '/cash',
                  '/billing',
                  '/counter-sales',
                  '/access-control',
                  '/audit',
                  '/api-keys',
                  '/api-client',
                  '/users'
                ],
                nurse: [
                  '/reception',
                  '/appointments',
                  '/owners',
                  '/patients',
                  '/counter-sales',
                  '/sales',
                  '/cash',
                  '/billing',
                  '/finance',
                  '/inventory',
                  '/access-control',
                  '/audit',
                  '/api-keys',
                  '/api-client',
                  '/users'
                ],
                veterinarian: [
                  '/reception',
                  '/appointments',
                  '/owners',
                  '/patients',
                  '/counter-sales',
                  '/sales',
                  '/cash',
                  '/billing',
                  '/finance',
                  '/inventory',
                  '/access-control',
                  '/audit',
                  '/api-keys',
                  '/api-client',
                  '/users'
                ],
                finance: [
                  '/reception',
                  '/appointments',
                  '/owners',
                  '/patients',
                  '/encounters',
                  '/medical-records',
                  '/triage',
                  '/inpatient',
                  '/laboratory',
                  '/diagnostics',
                  '/inventory',
                  '/access-control',
                  '/audit',
                  '/api-keys',
                  '/api-client',
                  '/users'
                ],
                admin: []
              }[dashboardProfile.key];
              for (const path of visibleShellPaths) {
                assert.equal(
                  forbiddenPrefixes.some(
                    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
                  ),
                  false,
                  `Menu não autorizado exposto para ${dashboardProfile.key}: ${path}`
                );
              }
              await page
                .getByRole('button', { name: 'Buscar módulo, rotina ou relatório (Ctrl+K)' })
                .click();
              const paletteInput = page.locator('#command-palette-input');
              await paletteInput.fill('Agenda');
              const agendaPaletteItems = await page
                .locator('.command-palette__item')
                .evaluateAll((elements) =>
                  elements.map((element) => ({
                    text: element.textContent?.trim(),
                    id: element.id
                  }))
                );
              const schedulingPaletteItems = agendaPaletteItems.filter((item) =>
                [
                  'command-palette-action-create-appointment',
                  'command-palette-route-appointments',
                  'command-palette-route-reports-audit-appointments',
                  'command-palette-route-reports-appointments'
                ].includes(item.id)
              );
              if (dashboardProfile.key === 'finance') {
                assert.equal(
                  schedulingPaletteItems.length,
                  0,
                  'Agenda não autorizada exposta na command palette para finance'
                );
              } else if (dashboardProfile.key === 'reception' || dashboardProfile.key === 'admin') {
                assert.ok(
                  schedulingPaletteItems.length > 0,
                  `Agenda esperada ausente na command palette para ${dashboardProfile.key}`
                );
              }
              await paletteInput.fill('Novo agendamento');
              const createAppointmentActionCount = await page
                .getByRole('option', { name: /Novo agendamento/i })
                .count();
              assert.equal(createAppointmentActionCount > 0, dashboardProfile.key === 'admin');
              await page.keyboard.press('Escape');
              interactions.push({
                test: 'dashboard-role-priority-permission-gate-persisted-routes-shell-and-palette',
                passed: true,
                profile: dashboardProfile.key,
                priority: expectedPriority,
                persistedLinks,
                shellPersistedLinks,
                shellLinks,
                visiblePanels: expectedPanels,
                paletteAgendaItems: agendaPaletteItems,
                schedulingPaletteItems,
                createAppointmentActionCount
              });
            }
            if (medicalRecordContinuity && target === '/medical-records/synthetic-encounter') {
              await page
                .getByRole('heading', { name: 'Prontuário clínico', exact: true })
                .waitFor();
              await page
                .locator('.patient-summary-card')
                .getByText('Luna Clínica', { exact: true })
                .waitFor();
              assert.match(await page.locator('.patient-summary-card').innerText(), /SRD/);

              const secondaryDisclosure = page.locator('.secondary-disclosure').first();
              await secondaryDisclosure.locator('summary').click();
              const attachmentsCard = page.getByTestId('clinical-attachments');
              await attachmentsCard.waitFor();
              await page.getByTestId('clinical-attachment-attachment-record-1').waitFor();
              assert.match(await attachmentsCard.innerText(), /radiografia-torax-luna\.jpg/);
              assert.match(await attachmentsCard.innerText(), /image\/jpeg/);
              assert.match(await attachmentsCard.innerText(), /240 KB/);
              assert.match(await attachmentsCard.innerText(), /termo-atendimento\.pdf/);
              assert.match(
                await attachmentsCard.innerText(),
                /Aguardando verificação de segurança/
              );
              assert.equal(
                await page.getByTestId('clinical-attachment-open-attachment-encounter-1').count(),
                0
              );

              await page.evaluate(() => {
                window.__syntheticAttachmentOpen = null;
                window.open = (...args) => {
                  window.__syntheticAttachmentOpen = args;
                  return { closed: false };
                };
              });
              const openAttachment = page.getByTestId(
                'clinical-attachment-open-attachment-record-1'
              );
              const invalidDownloadUrl = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname ===
                    '/api/attachments/attachment-record-1/download-url' && response.status() === 200
              );
              await openAttachment.click();
              await invalidDownloadUrl;
              await page.getByTestId('clinical-attachment-action-error').waitFor();
              assert.equal(await page.evaluate(() => window.__syntheticAttachmentOpen), null);

              const validDownloadUrl = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname ===
                    '/api/attachments/attachment-record-1/download-url' && response.status() === 200
              );
              await openAttachment.click();
              await validDownloadUrl;
              await page.waitForFunction(() => Array.isArray(window.__syntheticAttachmentOpen));
              const openedAttachment = await page.evaluate(() => {
                const args = window.__syntheticAttachmentOpen;
                return args ? { url: args[0], target: args[1], features: args[2] } : null;
              });
              assert.ok(openedAttachment);
              assert.equal(
                new URL(openedAttachment.url, origin).pathname,
                '/api/attachments/attachment-record-1/content'
              );
              assert.equal(openedAttachment.target, '_blank');
              assert.match(openedAttachment.features, /noopener/);

              const draft = page.getByTestId('clinical-anamnesis');
              await draft.fill(
                'Rascunho clínico longo preservado durante a confirmação da persistência.'
              );
              assert.equal(
                await page.getByTestId('clinical-draft-state').innerText(),
                'Rascunho local não salvo'
              );
              const failedSave = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/medical-records/entries' &&
                  response.request().method() === 'POST' &&
                  response.status() === 500
              );
              await page
                .getByRole('button', { name: 'Salvar ficha de atendimento', exact: true })
                .click();
              await failedSave;
              await page
                .getByText('Falha sintética ao persistir a anamnese.', { exact: true })
                .waitFor();
              assert.equal(
                await page.getByTestId('clinical-draft-state').innerText(),
                'Persistência não confirmada'
              );
              assert.equal(
                await draft.inputValue(),
                'Rascunho clínico longo preservado durante a confirmação da persistência.'
              );
              await page.screenshot({
                path: join(out, `medical-record-draft-failed-${width}-${theme}.png`),
                fullPage: false
              });

              const successfulSave = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/medical-records/entries' &&
                  response.request().method() === 'POST' &&
                  response.status() === 201
              );
              await page
                .getByRole('button', { name: 'Salvar ficha de atendimento', exact: true })
                .click();
              await successfulSave;
              await page
                .getByText('Ficha de atendimento salva no prontuário.', { exact: true })
                .waitFor();
              assert.equal(
                await page.getByTestId('clinical-draft-state').innerText(),
                'Salvo no prontuário'
              );
              assert.equal(await draft.inputValue(), '');
              interactions.push({
                test: 'medical-record-context-attachments-download-confirmation-and-draft-recovery',
                passed: true,
                patient: 'Luna Clínica',
                attachmentMetadata: true,
                quarantinedAttachmentNotActionable: true,
                invalidDownloadRejected: true,
                validDownloadConfirmed: true,
                draftState: ['local', 'persistência não confirmada', 'salvo no prontuário'],
                failedSavePreservedDraft: true,
                savedAfterServerConfirmation: true
              });
            }
            if (patientDetailContinuity && target === '/patients/synthetic-patient-1') {
              const headerContext = page.getByTestId('patient-header-context');
              await headerContext.getByText('Luna Contexto', { exact: true }).waitFor();
              assert.match(await headerContext.innerText(), /Maria Contexto/);
              assert.match(await headerContext.innerText(), /Alergia a dipirona/);
              assert.match(await headerContext.innerText(), /Doença renal crônica/);
              assert.equal(
                (await page.getByText('Luna Contexto', { exact: true }).count()) >= 2,
                true
              );
              assert.equal(
                await page.locator('a[href="/owners/synthetic-owner-context-1"]').count(),
                1
              );
              assert.ok(
                (await page.locator('a[href="/patients/synthetic-patient-1/edit"]').count()) >= 1
              );
              assert.ok(
                (await page
                  .locator('a[href="/appointments/synthetic-context-appointment-1"]')
                  .count()) >= 1
              );
              assert.match(
                await page.locator('.patient-360-timeline').innerText(),
                /Plano renal atualizado/
              );
              assert.match(
                await page.locator('.patient-360-timeline').innerText(),
                /Retorno renal/
              );
              await page.screenshot({
                path: join(out, `patient-detail-rich-${width}-${theme}.png`),
                fullPage: false
              });

              await page.evaluate(() => {
                window.history.pushState(
                  { ...window.history.state },
                  '',
                  '/patients/synthetic-patient-2'
                );
                window.dispatchEvent(new PopStateEvent('popstate'));
              });
              await page.waitForURL('**/patients/synthetic-patient-2');
              await page
                .getByTestId('patient-header-context')
                .getByText('Milo Contexto', { exact: true })
                .waitFor();
              const sparseHeader = page.getByTestId('patient-header-context');
              assert.match(await sparseHeader.innerText(), /João Contexto/);
              assert.match(await sparseHeader.innerText(), /Inativo/);
              assert.equal(await page.getByText('Luna Contexto', { exact: true }).count(), 0);
              assert.equal(await page.getByText('Maria Contexto', { exact: true }).count(), 0);
              assert.equal(
                await page.locator('a[href="/owners/synthetic-owner-context-1"]').count(),
                0
              );
              assert.match(
                await page.locator('.patient-360-cockpit').innerText(),
                /Sem episódio assistencial aberto/
              );
              const agendaCard = page.getByRole('button', { name: 'Agenda', exact: true });
              await agendaCard.click();
              await page
                .getByText('Nenhum agendamento cadastrado para Milo Contexto.', { exact: true })
                .waitFor();
              assert.equal(await page.getByText('Retorno renal', { exact: true }).count(), 0);
              await page.screenshot({
                path: join(out, `patient-detail-sparse-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'patient-detail-route-change-clears-stale-context',
                passed: true,
                initialPatient: 'Luna Contexto',
                switchedPatient: 'Milo Contexto',
                ownerContextChanged: true,
                clinicalRiskChanged: true,
                staleIdentityRemoved: true,
                sparseStateActionable: true
              });

              await page.goto(`${origin}/patients?ownerId=synthetic-owner-context-2`, {
                waitUntil: 'networkidle'
              });
              await page.locator('.patient-card').first().waitFor();
              assert.equal(await page.locator('.patient-card').count(), 1);
              assert.equal(await page.locator('.patient-card__name').innerText(), 'Milo Contexto');
              assert.equal(
                new URL(page.url()).searchParams.get('ownerId'),
                'synthetic-owner-context-2'
              );
              await page.getByRole('link', { name: 'Abrir cadastro', exact: true }).click();
              await page.waitForURL('**/patients/synthetic-patient-2');
              await page
                .getByTestId('patient-header-context')
                .getByText('Milo Contexto', { exact: true })
                .waitFor();
              await page.goBack({ waitUntil: 'networkidle' });
              await page.waitForURL('**/patients?ownerId=synthetic-owner-context-2');
              await page.locator('.patient-card').first().waitFor();
              assert.equal(await page.locator('.patient-card').count(), 1);
              assert.equal(await page.locator('.patient-card__name').innerText(), 'Milo Contexto');
              assert.equal(
                new URL(page.url()).searchParams.get('ownerId'),
                'synthetic-owner-context-2'
              );
              await page.getByRole('link', { name: 'Abrir cadastro', exact: true }).click();
              await page.waitForURL('**/patients/synthetic-patient-2');
              await page
                .getByTestId('patient-header-context')
                .getByText('Milo Contexto', { exact: true })
                .waitFor();
              interactions.push({
                test: 'patient-list-detail-back-preserves-owner-context',
                passed: true,
                filter: 'ownerId=synthetic-owner-context-2',
                returnedPatient: 'Milo Contexto',
                listScopeStayedBounded: true
              });
            }
            if (accessibilityContinuity) {
              const main = page.locator('main#main-content');
              assert.equal(
                await main.count(),
                1,
                'A página deve expor exatamente um conteúdo principal'
              );
              const skipLink = page.getByRole('link', {
                name: 'Pular para o conteudo principal',
                exact: true
              });
              await skipLink.waitFor({ state: 'attached' });
              await page.evaluate(() => {
                document.body.setAttribute('tabindex', '-1');
                document.body.focus();
                document.body.removeAttribute('tabindex');
              });
              await page.keyboard.press('Tab');
              assert.equal(
                await skipLink.evaluate((element) => document.activeElement === element),
                true,
                'O skip link deve ser o primeiro foco por teclado'
              );
              await skipLink.press('Enter');
              await page.waitForFunction(() => document.activeElement?.id === 'main-content');
              const reducedMotion = await page.evaluate(
                () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
              );
              assert.equal(
                reducedMotion,
                true,
                'A matriz deve executar com prefers-reduced-motion'
              );
              const axeResult = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
                .analyze();
              assert.deepEqual(
                axeResult.violations,
                [],
                `Violacoes Axe em ${target}/${width}/${theme}: ${JSON.stringify(axeResult.violations)}`
              );
              assert.ok(
                measure.documentWidth <= width + 2,
                `Reflow horizontal inesperado em ${target}/${width}/${theme}: ${measure.documentWidth}px`
              );
              interactions.push({
                test: 'a11y-axe-skiplink-focus-reflow-reduced-motion',
                passed: true,
                axeViolations: 0,
                reducedMotion: true,
                viewport: width
              });
            }
            if (
              laboratoryAccessibility &&
              (laboratoryFeedback || laboratoryAnalyticalContinuity) &&
              (target === '/laboratory/orders' ||
                target === '/laboratory/results' ||
                laboratoryAnalyticalTargets.includes(target))
            ) {
              interactions.push(await assertLaboratoryA11y(page, target, 'current-render'));
            }
            const stem = `${target.replaceAll('/', '_')}-${width}-${theme}`;
            await captureLaboratoryScreenshot(stem + '-viewport.png', false);
            await captureLaboratoryScreenshot(stem + '-full.png', true);
            if (laboratoryFeedback && target === '/laboratory/orders') {
              assert.equal(await page.locator('[data-testid="data-table-feedback"]').count(), 1);
              assert.equal(
                await page
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Não foi possível carregar os exames'
              );
              assert.equal(await page.locator('[role="alert"]').count(), 1);
              assert.equal(await page.locator('.ds-alert').count(), 0);
              const retryRequest = page.waitForRequest(
                (request) => new URL(request.url()).pathname === '/api/laboratory/orders'
              );
              const loadingState = page
                .locator('.data-table-loading')
                .waitFor({ state: 'visible' });
              const retryResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/laboratory/orders' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await Promise.all([retryRequest, loadingState]);
              await captureLaboratoryScreenshot(
                `laboratory-orders-loading-${width}-${theme}.png`,
                false
              );
              await retryResponse;
              await page
                .locator('[data-testid="data-table-feedback"] .empty-state__title')
                .waitFor();
              assert.equal(
                await page
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Nenhum exame encontrado'
              );
              assert.equal(await page.locator('[role="alert"]').count(), 0);
              await captureLaboratoryScreenshot(
                `laboratory-orders-empty-${width}-${theme}.png`,
                true
              );
              const populateRequest = page.waitForRequest(
                (request) => new URL(request.url()).pathname === '/api/laboratory/orders'
              );
              const populateLoading = page
                .locator('.data-table-loading')
                .waitFor({ state: 'visible' });
              const populateResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/laboratory/orders' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await Promise.all([populateRequest, populateLoading]);
              await captureLaboratoryScreenshot(
                `laboratory-orders-refresh-loading-${width}-${theme}.png`,
                false
              );
              await populateResponse;
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.getByText('Maria Sintética', { exact: true }).count(), 1);
              await captureLaboratoryScreenshot(
                `laboratory-orders-populated-${width}-${theme}.png`,
                true
              );
              interactions.push(await assertLaboratoryA11y(page, target, 'orders-populated'));
              const releaseButton = page.getByRole('button', { name: 'Liberar resultado', exact: true });
              await releaseButton.click();
              const resultDialog = page.getByRole('dialog');
              await resultDialog.waitFor();
              assert.equal(
                await resultDialog.evaluate((element) => element.contains(document.activeElement)),
                true,
                'O modal de resultado deve receber foco ao abrir'
              );
              interactions.push(await assertLaboratoryA11y(page, target, 'orders-modal'));
              await page.keyboard.press('Tab');
              assert.equal(
                await resultDialog.evaluate((element) => element.contains(document.activeElement)),
                true,
                'O foco deve permanecer preso no modal ao navegar por Tab'
              );
              await page.keyboard.press('Escape');
              await resultDialog.waitFor({ state: 'hidden' });
              assert.equal(
                await releaseButton.evaluate((element) => document.activeElement === element),
                true,
                'O foco deve retornar à ação que abriu o modal'
              );
              const ordersTableRegion = page.locator('.table-wrapper').first();
              let ordersKeyboardScroll = false;
              if (width <= 390) {
                assert.equal(
                  await ordersTableRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
                  true,
                  'A tabela laboratorial móvel deve expor rolagem horizontal local'
                );
                await ordersTableRegion.focus();
                await ordersTableRegion.evaluate((element) => { element.scrollLeft = 0; });
                const scrollBeforeKey = await ordersTableRegion.evaluate((element) => element.scrollLeft);
                await ordersTableRegion.press('ArrowRight');
                const scrollAfterKey = await ordersTableRegion.evaluate((element) => element.scrollLeft);
                assert.ok(scrollAfterKey > scrollBeforeKey, 'A região da tabela deve responder às setas');
                ordersKeyboardScroll = true;
              }
              await page
                .getByRole('searchbox', { name: 'Cliente', exact: true })
                .fill('Maria Sintética');
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              await page
                .getByRole('searchbox', { name: 'Cliente', exact: true })
                .fill('Cliente ausente');
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              await page
                .locator('[data-testid="data-table-feedback"] .empty-state__title')
                .waitFor();
              assert.equal(
                await page
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Nenhum exame corresponde aos filtros'
              );
              assert.equal(await page.locator('[role="alert"]').count(), 0);
              interactions.push(await assertLaboratoryA11y(page, target, 'orders-no-results'));
              await captureLaboratoryScreenshot(
                `laboratory-orders-feedback-${width}-${theme}.png`,
                true
              );
              const forbiddenRequest = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/laboratory/orders' &&
                  response.status() === 403
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await forbiddenRequest;
              await page
                .getByRole('heading', { name: 'Acesso aos exames negado', exact: true })
                .waitFor();
              assert.equal(await page.locator('[role="alert"]').count(), 1);
              assert.equal(await page.locator('.ds-alert').count(), 0);
              interactions.push(await assertLaboratoryA11y(page, target, 'orders-forbidden'));
              interactions.push({
                test: 'laboratory-orders-feedback-matrix',
                passed: true,
                loadingObserved: true,
                errorAnnouncements: 1,
                retry: true,
                intrinsicEmpty: true,
                populated: true,
                noResults: true,
                forbidden403: true,
                modalFocusTrapAndRestore: true,
                tableKeyboardScroll: ordersKeyboardScroll
              });
            }
            if (laboratoryFeedback && target === '/laboratory/results') {
              assert.equal(await page.locator('[data-testid="data-table-feedback"]').count(), 1);
              assert.equal(
                await page
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Não foi possível carregar os laudos'
              );
              assert.equal(await page.locator('[role="alert"]').count(), 1);
              assert.equal(await page.locator('.ds-alert').count(), 0);
              const retryRequest = page.waitForRequest(
                (request) => new URL(request.url()).pathname === '/api/laboratory/results'
              );
              const loadingState = page
                .locator('.data-table-loading')
                .waitFor({ state: 'visible' });
              const retryResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/laboratory/results' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await Promise.all([retryRequest, loadingState]);
              await captureLaboratoryScreenshot(
                `laboratory-results-loading-${width}-${theme}.png`,
                false
              );
              await retryResponse;
              await page
                .locator('[data-testid="data-table-feedback"] .empty-state__title')
                .waitFor();
              assert.equal(
                await page
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Nenhum laudo encontrado'
              );
              assert.equal(await page.locator('[role="alert"]').count(), 0);
              await captureLaboratoryScreenshot(
                `laboratory-results-empty-${width}-${theme}.png`,
                true
              );
              await page.locator('input[name="code"]').fill('synthetic-lab-report');
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.locator('tbody tr').count(), 1);
              const populatedResultText = await page.locator('tbody tr').first().innerText();
              assert.match(populatedResultText, /Maria Sintética/);
              assert.match(populatedResultText, /Hemácias/);
              assert.match(populatedResultText, /5,9/);
              assert.match(populatedResultText, /milhões\/µL/);
              assert.match(populatedResultText, /5,5–8,5/);
              await captureLaboratoryScreenshot(
                `laboratory-results-populated-${width}-${theme}.png`,
                true
              );
              interactions.push(await assertLaboratoryA11y(page, target, 'results-populated'));
              const attachmentResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname ===
                    '/api/attachments/synthetic-lab-attachment-1/download-url' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: /Abrir anexo do laudo/ }).click();
              await attachmentResponse;
              interactions.push(await assertLaboratoryA11y(page, target, 'results-attachment'));
              let resultsKeyboardScroll = false;
              const resultsTableRegion = page.locator('.table-wrapper').first();
              if (width <= 390) {
                assert.equal(
                  await resultsTableRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
                  true,
                  'A tabela de laudos móvel deve expor rolagem horizontal local'
                );
                await resultsTableRegion.focus();
                await resultsTableRegion.evaluate((element) => { element.scrollLeft = 0; });
                const scrollBeforeKey = await resultsTableRegion.evaluate((element) => element.scrollLeft);
                await resultsTableRegion.press('ArrowRight');
                const scrollAfterKey = await resultsTableRegion.evaluate((element) => element.scrollLeft);
                assert.ok(scrollAfterKey > scrollBeforeKey, 'A região de laudos deve responder às setas');
                resultsKeyboardScroll = true;
              }
              await page.locator('input[name="code"]').fill('laudo ausente');
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              await page
                .locator('[data-testid="data-table-feedback"] .empty-state__title')
                .waitFor();
              assert.equal(
                await page
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Nenhum laudo corresponde aos filtros'
              );
              assert.equal(await page.locator('[role="alert"]').count(), 0);
              interactions.push(await assertLaboratoryA11y(page, target, 'results-no-results'));
              await captureLaboratoryScreenshot(
                `laboratory-results-feedback-${width}-${theme}.png`,
                true
              );
              const forbiddenRequest = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/laboratory/results' &&
                  response.status() === 403
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await forbiddenRequest;
              await page
                .getByRole('heading', { name: 'Acesso aos laudos negado', exact: true })
                .waitFor();
              assert.equal(await page.locator('[role="alert"]').count(), 1);
              assert.equal(await page.locator('.ds-alert').count(), 0);
              interactions.push(await assertLaboratoryA11y(page, target, 'results-forbidden'));
              interactions.push({
                test: 'laboratory-results-feedback-matrix',
                passed: true,
                loadingObserved: true,
                errorAnnouncements: 1,
                retry: true,
                intrinsicEmpty: true,
                populated: true,
                noResults: true,
                structuredValuesUnitsReferences: true,
                attachmentAction: true,
                forbidden403: true,
                tableKeyboardScroll: resultsKeyboardScroll
              });
            }
            if (laboratoryAnalyticalContinuity && laboratoryAnalyticalTargets.includes(target)) {
              const analyticalRow = page.locator('.lab-records tbody tr').first();
              await analyticalRow.waitFor();
              const analyticalRowText = await analyticalRow.innerText();
              assert.match(analyticalRowText, /Luna Analítica/);

              const patientResultButton = page
                .getByRole('button', { name: /Ver resultado de Luna Analítica/ })
                .first();
              await patientResultButton.focus();
              const activeBeforeTab = await page.evaluate(() => document.activeElement?.outerHTML);
              await page.keyboard.press('Tab');
              const activeAfterTab = await page.evaluate(() => document.activeElement?.outerHTML);
              assert.notEqual(activeAfterTab, activeBeforeTab, 'Tab deve avançar entre controles do resultado');
              await patientResultButton.focus();
              await page.keyboard.press('Enter');
              const selectedResult = page.locator('.lab-selected');
              await selectedResult.waitFor();
              assert.equal(
                await selectedResult.evaluate((element) => document.activeElement === element),
                true,
                'Enter no paciente deve focar o resultado selecionado'
              );
              const selectedResultText = await selectedResult.innerText();
              assert.match(selectedResultText, /Resultado estruturado/);
              assert.match(selectedResultText, /Referência do exame/i);
              assert.match(selectedResultText, /Dentro da faixa/);
              assert.match(selectedResultText, /5,9|6,0|92/);
              assert.match(selectedResultText, /milhões\/µL|escala|U\/L/);
              assert.match(selectedResultText, /5,5–8,5|5,5–7,0|10–125/);
              interactions.push(await assertLaboratoryA11y(page, target, 'analytical-selected'));

              const analyticalFilters = page.locator('.lab-filters');
              await analyticalFilters.locator('summary').click();
              await page.getByRole('searchbox', { name: 'Corpo do resultado', exact: true }).fill('estruturado');
              const analyticalSearch = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === `/api${target}` &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              await analyticalSearch;
              await selectedResult.waitFor();
              assert.equal(await page.locator('.lab-selected').count(), 1);

              const referencesDisclosure = page.locator('.lab-references');
              await referencesDisclosure.locator('summary').click();
              await referencesDisclosure
                .locator('[data-testid="data-table-feedback"] .empty-state__title')
                .waitFor();
              assert.equal(
                await referencesDisclosure
                  .locator('[data-testid="data-table-feedback"] .empty-state__title')
                  .innerText(),
                'Referências indisponíveis'
              );
              const referenceRetryResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/laboratory/reference-values' &&
                  response.status() === 200
              );
              const referenceRetry = referencesDisclosure.getByRole('button', {
                name: 'Tentar novamente',
                exact: true
              });
              assert.equal(await referenceRetry.count(), 1);
              interactions.push(await assertLaboratoryA11y(page, target, 'analytical-reference-unavailable'));
              await captureLaboratoryScreenshot(
                `laboratory-${target.split('/').at(-1)}-reference-unavailable-${width}-${theme}.png`,
                true
              );
              await referenceRetry.click();
              await referenceRetryResponse;
              await referencesDisclosure.locator('tbody tr').first().waitFor();
              assert.match(await referencesDisclosure.innerText(), /ALT|Hemácias|pH urinário/);

              const analyticalTableRegion = page.locator('.lab-records .table-wrapper').first();
              let analyticalKeyboardScroll = false;
              if (width <= 390) {
                assert.equal(
                  await analyticalTableRegion.evaluate((element) => element.scrollWidth > element.clientWidth),
                  true,
                  'A tabela analítica móvel deve expor rolagem horizontal local'
                );
                await analyticalTableRegion.focus();
                await analyticalTableRegion.evaluate((element) => { element.scrollLeft = 0; });
                const scrollBeforeKey = await analyticalTableRegion.evaluate((element) => element.scrollLeft);
                await analyticalTableRegion.press('ArrowRight');
                const scrollAfterKey = await analyticalTableRegion.evaluate((element) => element.scrollLeft);
                assert.ok(scrollAfterKey > scrollBeforeKey, 'A tabela analítica deve responder às setas');
                analyticalKeyboardScroll = true;
              }

              const analyticalRefresh = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === `/api${target}` &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await analyticalRefresh;
              await page.locator('.lab-selected').waitFor();
              assert.equal(await page.locator('.lab-selected').count(), 1);
              const analyticalCode = page.getByRole('searchbox', { name: /Código do exame|Código do hemograma/i }).first();
              const analyticalBody = page.getByRole('searchbox', { name: 'Corpo do resultado', exact: true });
              const analyticalStatus = page.getByRole('combobox', { name: 'Situação', exact: true });
              await analyticalStatus.selectOption('open');
              await analyticalCode.fill('');
              await analyticalBody.fill('');
              const pendingRequest = page.waitForRequest(
                (request) => {
                  const requestUrl = new URL(request.url());
                  return requestUrl.pathname === `/api${target}` &&
                    requestUrl.searchParams.get('closed') === 'false';
                }
              );
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              const pendingRequestValue = await pendingRequest;
              const pendingUrl = new URL(pendingRequestValue.url());
              await page.locator('.lab-records tbody tr').first().waitFor();
              const pendingRows = page.locator('.lab-records tbody tr');
              assert.equal(await pendingRows.count(), 2);
              assert.match(await pendingRows.nth(0).innerText(), /Solicitado/);
              assert.match(await pendingRows.nth(1).innerText(), /Coletado/);
              const pendingText = await page.locator('.lab-records tbody tr').first().innerText();
              assert.match(pendingText, /Solicitado/);
              assert.match(await page.locator('.lab-selected').innerText(), /Sem valores estruturados/);
              assert.equal(pendingUrl.searchParams.get('closed'), 'false');
              interactions.push(await assertLaboratoryA11y(page, target, 'analytical-pending'));
              await captureLaboratoryScreenshot(
                `laboratory-${target.split('/').at(-1)}-pending-${width}-${theme}.png`,
                true
              );

              await analyticalCode.fill('ausente');
              const absentRequest = page.waitForRequest(
                (request) => {
                  const requestUrl = new URL(request.url());
                  return requestUrl.pathname === `/api${target}` &&
                    requestUrl.searchParams.get('code') === 'ausente';
                }
              );
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              const absentRequestValue = await absentRequest;
              const absentUrl = new URL(absentRequestValue.url());
              await page
                .locator('[data-testid="data-table-feedback"] .empty-state__title')
                .waitFor();
              assert.equal(
                await page.locator('[data-testid="data-table-feedback"] .empty-state__title').innerText(),
                'Nenhum exame corresponde aos filtros'
              );
              assert.equal(absentUrl.searchParams.get('code'), 'ausente');
              assert.equal(await page.locator('.lab-selected').count(), 0);
              interactions.push(await assertLaboratoryA11y(page, target, 'analytical-no-results'));
              await captureLaboratoryScreenshot(
                `laboratory-${target.split('/').at(-1)}-no-results-${width}-${theme}.png`,
                true
              );

              await analyticalCode.fill('forbidden');
              const analyticalForbidden = page.waitForResponse(
                (response) => new URL(response.url()).pathname === `/api${target}` && response.status() === 403
              );
              await page.getByRole('button', { name: 'Pesquisar', exact: true }).click();
              await analyticalForbidden;
              await page
                .getByRole('heading', { name: 'Acesso aos exames negado', exact: true })
                .waitFor();
              assert.equal(await page.locator('[role="alert"]').count(), 1);
              assert.equal(await page.locator('.ds-alert').count(), 0);
              interactions.push(await assertLaboratoryA11y(page, target, 'analytical-forbidden'));
              interactions.push({
                test: 'laboratory-analytical-structured-values-focus-and-reload',
                passed: true,
                route: target,
                structuredValuesUnitsReferences: true,
                tabsKeyboard: true,
                enterSelectionFocus: true,
                selectionAfterRefresh: true,
                tableKeyboardScroll: analyticalKeyboardScroll,
                referenceCatalogVisible: true,
                referenceUnavailableAndRetry: true,
                requestedStatus: true,
                collectedStatus: true,
                pendingStatus: true,
                filteredAbsence: true,
                forbidden403: true,
                interactiveAxeStates: [
                  'selected',
                  'reference-unavailable',
                  'pending',
                  'no-results',
                  'forbidden'
                ],
                mobileScreenshotsTop: laboratoryScreenshotEvidence.every(
                  (screenshot) => screenshot.scrollY === 0
                ),
                screenshotEvidence: laboratoryScreenshotEvidence
              });
            }
            if (agendaContext && agendaTargets.includes(target)) {
              assert.equal(
                await page.locator('h1').count(),
                1,
                'Agenda must expose one page heading'
              );
              assert.equal(
                await page.locator('.workspace__title').count(),
                0,
                'Agenda page header owns the visible title'
              );
              assert.equal(
                await page.locator('.workspace__context').count(),
                0,
                'Agenda page header owns the visible shell context'
              );
              assert.equal(
                await page.locator('.app-page-header__breadcrumbs').count(),
                1,
                'Agenda must expose one page breadcrumb'
              );
              assert.equal(
                await page.locator('.app-page-header__context').count(),
                0,
                'Agenda must expose one operational KPI group below the header'
              );
              assert.equal(
                await page.locator('.agenda-grid-summary').count(),
                1,
                'Agenda must expose one operational KPI group'
              );
              const chosenDate = '2026-09-15';
              const assertAgendaUrl = (expectedFreeText = null) => {
                const url = new URL(page.url());
                assert.equal(url.searchParams.get('agendaDate'), chosenDate);
                assert.equal(url.searchParams.get('agendaView'), 'list');
                assert.equal(url.searchParams.get('agendaProfessional'), 'staff-vet');
                assert.equal(url.searchParams.get('search'), expectedFreeText);
              };
              await page.goto(
                `${origin}${target}?agendaDate=${chosenDate}&agendaView=list&agendaProfessional=staff-vet`,
                { waitUntil: 'networkidle' }
              );
              await page.locator('.agenda-appointment-row').first().waitFor();
              assertAgendaUrl();
              if (width <= 390) {
                const firstAppointmentBox = await page.locator('.agenda-appointment-row').first().boundingBox();
                const firstAppointmentViewport = await page.evaluate(() => ({
                  scrollY: window.scrollY,
                  height: window.innerHeight
                }));
                assert.ok(
                  firstAppointmentBox &&
                    firstAppointmentBox.y < firstAppointmentViewport.height &&
                    firstAppointmentBox.y + firstAppointmentBox.height > 0,
                  `First relevant Agenda appointment must intersect the initial viewport at ${target}/${theme}: ${JSON.stringify({
                    box: firstAppointmentBox,
                    viewport: firstAppointmentViewport
                  })}`
                );
                assert.equal(
                  await page.locator('.app-page-header__primary').count(),
                  1,
                  'Agenda mobile must keep one dominant create action'
                );
                interactions.push({
                  test: 'agenda-mobile-first-appointment-priority',
                  passed: true,
                  firstAppointmentTop: firstAppointmentBox.y,
                  firstAppointmentBottom: firstAppointmentBox.y + firstAppointmentBox.height,
                  viewportHeight: firstAppointmentViewport.height,
                  singlePrimaryCreateAction: true
                });
              }
              if (target === '/appointments' && width === 390 && theme === 'light') {
                const secondaryActionsDetails = page.locator(
                  'details.app-page-header__secondary-actions--collapsible'
                );
                const secondaryActionsSummary = secondaryActionsDetails.locator('> summary');
                await secondaryActionsSummary.waitFor();
                assert.equal(
                  await secondaryActionsDetails.getAttribute('open'),
                  null,
                  'Agenda mobile secondary actions must start collapsed'
                );
                await secondaryActionsSummary.focus();
                await page.keyboard.press('Enter');
                assert.equal(
                  await secondaryActionsDetails.getAttribute('open'),
                  '',
                  'Agenda mobile secondary actions must open with the keyboard'
                );
                const fullFormLink = secondaryActionsDetails.getByRole('link', {
                  name: 'Abrir formulário completo',
                  exact: true
                });
                assert.equal(await fullFormLink.isVisible(), true);
                await Promise.all([
                  page.waitForURL('**/appointments/new'),
                  fullFormLink.click()
                ]);
                await page.getByRole('heading', { name: /Novo Agendamento/ }).waitFor();
                await page.goBack();
                await page.waitForURL(`**${target}?**`);
                await page.locator('.agenda-appointment-row').first().waitFor();
                const returnedSecondaryActionsDetails = page.locator(
                  'details.app-page-header__secondary-actions--collapsible'
                );
                const returnedSecondaryActionsSummary = returnedSecondaryActionsDetails.locator('> summary');
                await returnedSecondaryActionsSummary.waitFor();
                await returnedSecondaryActionsSummary.focus();
                if ((await returnedSecondaryActionsDetails.getAttribute('open')) === null) {
                  await page.keyboard.press('Enter');
                }
                assert.equal(
                  await returnedSecondaryActionsDetails.getAttribute('open'),
                  '',
                  'Agenda mobile secondary actions must be open before keyboard close'
                );
                await page.keyboard.press('Enter');
                assert.equal(
                  await returnedSecondaryActionsDetails.getAttribute('open'),
                  null,
                  'Agenda mobile secondary actions must close with the keyboard'
                );
                interactions.push({
                  test: 'agenda-mobile-secondary-actions-keyboard-and-form',
                  passed: true,
                  startsCollapsed: true,
                  openedWithKeyboard: true,
                  closedWithKeyboard: true,
                  fullFormNavigation: '/appointments/new',
                  returnedToAgenda: true
                });
              }
              assert.equal(await page.locator('.view-toggle__button--active').innerText(), 'Lista');
              assert.ok(
                await page
                  .locator('.board-toolbar')
                  .innerText()
                  .then((text) => text.includes('15 de setembro'))
              );
              await page.getByRole('button', { name: 'Filtrar agenda', exact: true }).click();
              assert.equal(await page.locator('#practitionerFilter').inputValue(), 'staff-vet');
              await page.locator('#clientFilter').fill('Maria');
              await page.getByRole('button', { name: 'Ocultar filtros', exact: true }).click();
              assert.equal(new URL(page.url()).search.includes('Maria'), false);
              const queueNavigation = page
                .getByRole('link', { name: /Acompanhar check-ins|Esteira/ })
                .first();
              if (!(await queueNavigation.isVisible())) {
                const secondaryActionsDisclosure = page.locator(
                  'details.app-page-header__secondary-actions--collapsible > summary'
                );
                if (await secondaryActionsDisclosure.isVisible()) {
                  await secondaryActionsDisclosure.click();
                }
              }
              assert.equal(
                await queueNavigation.isVisible(),
                true,
                `Agenda must expose a queue navigation action at ${target}/${theme}/${width}`
              );
              await queueNavigation.click();
              await page.waitForURL('**/queue');
              await page.goBack();
              await page.waitForURL(`**${target}?**`);
              await page.locator('.agenda-appointment-row').first().waitFor();
              assertAgendaUrl();
              await page.getByRole('button', { name: 'Filtrar agenda', exact: true }).click();
              assert.equal(await page.locator('#clientFilter').inputValue(), 'Maria');
              assert.equal(await page.locator('#practitionerFilter').inputValue(), 'staff-vet');
              await page.reload({ waitUntil: 'networkidle' });
              await page.locator('.agenda-appointment-row').first().waitFor();
              await page.getByRole('button', { name: 'Filtrar agenda', exact: true }).click();
              assert.equal(await page.locator('#practitionerFilter').inputValue(), 'staff-vet');
              assert.equal(await page.locator('#clientFilter').inputValue(), '');
              assertAgendaUrl();
              interactions.push({
                test: 'agenda-deep-link-return-and-reload-context',
                passed: true,
                route: target,
                date: chosenDate,
                view: 'list',
                professional: 'staff-vet',
                freeText: 'memory only; cleared on reload',
                contextRestoredBeforeReload: true,
                freeTextClearedAfterReload: true
              });
              await page.getByRole('button', { name: 'Ocultar filtros', exact: true }).click();
              await page.getByRole('button', { name: 'Semana', exact: true }).click();
              await page.locator('.timeline-item__surface').first().waitFor();
              const weekSurface = page.locator('.timeline-item__surface').first();
              await weekSurface.focus();
              assert.equal(
                await weekSurface.evaluate((el) => document.activeElement === el),
                true
              );
              await page.keyboard.press('Enter');
              await page.getByRole('dialog').waitFor();
              const weekDrawerScreenshot = `agenda-drawer-week-${width}-${theme}.png`;
              await page.screenshot({
                path: join(out, weekDrawerScreenshot),
                fullPage: true
              });
              await page.keyboard.press('Escape');
              await page.getByRole('dialog').waitFor({ state: 'hidden' });
              assert.equal(
                await weekSurface.evaluate((el) => document.activeElement === el),
                true
              );
              const measureAgendaLayout = (mode) =>
                page.evaluate((currentMode) => {
                  const matrix = document.querySelector('.time-matrix');
                  return {
                    mode: currentMode,
                    documentWidth: document.documentElement.scrollWidth,
                    viewportWidth: innerWidth,
                    matrix: matrix
                      ? {
                          clientWidth: matrix.clientWidth,
                          scrollWidth: matrix.scrollWidth,
                          overflowX: getComputedStyle(matrix).overflowX
                        }
                      : null
                  };
                }, mode);
              const weekLayout = await measureAgendaLayout('week');
              assert.ok(
                weekLayout.documentWidth <= width + 2,
                `Agenda semanal excedeu a viewport em ${target}/${width}/${theme}: ${JSON.stringify(weekLayout)}`
              );
              assert.equal(weekLayout.matrix?.overflowX, 'auto');
              if (width <= 768) {
                assert.ok(
                  weekLayout.matrix.scrollWidth > weekLayout.matrix.clientWidth,
                  `Agenda semanal deve oferecer rolagem local em ${target}/${width}/${theme}: ${JSON.stringify(weekLayout)}`
                );
              }
              interactions.push({
                test: 'agenda-week-native-surface-drawer-focus',
                passed: true,
                keyboardActivation: 'Enter',
                nativeCardSurface: true,
                drawerVisualEvidence: [weekDrawerScreenshot],
                focusRestoredAfterDrawer: true
              });
              await page.getByRole('button', { name: 'Dia', exact: true }).click();
              await page.locator('.timeline-item__surface').first().waitFor();
              const daySurface = page.locator('.timeline-item__surface').first();
              await daySurface.focus();
              await page.keyboard.press('Space');
              await page.getByRole('dialog').waitFor();
              const dayDrawerScreenshot = `agenda-drawer-day-${width}-${theme}.png`;
              await page.screenshot({
                path: join(out, dayDrawerScreenshot),
                fullPage: true
              });
              await page.keyboard.press('Escape');
              await page.getByRole('dialog').waitFor({ state: 'hidden' });
              const dayLayout = await measureAgendaLayout('day');
              assert.ok(
                dayLayout.documentWidth <= width + 2,
                `Agenda diária excedeu a viewport em ${target}/${width}/${theme}: ${JSON.stringify(dayLayout)}`
              );
              assert.equal(dayLayout.matrix?.overflowX, 'auto');
              if (width <= 390) {
                assert.ok(
                  dayLayout.matrix.scrollWidth > dayLayout.matrix.clientWidth,
                  `Agenda diária deve oferecer rolagem local em ${target}/${width}/${theme}: ${JSON.stringify(dayLayout)}`
                );
              }
              interactions.push({
                test: 'agenda-day-native-surface-drawer-focus',
                passed: true,
                keyboardActivation: 'Space',
                nativeCardSurface: true,
                drawerVisualEvidence: [dayDrawerScreenshot],
                focusRestoredAfterDrawer: true
              });
              interactions.push({
                test: 'agenda-week-day-layout-no-overflow',
                passed: true,
                documentWidths: { week: weekLayout.documentWidth, day: dayLayout.documentWidth },
                matrixWidths: {
                  week: weekLayout.matrix,
                  day: dayLayout.matrix
                },
                localScrollVerifiedAt: width <= 768 ? width : null
              });
              await page.getByRole('button', { name: 'Lista', exact: true }).click();
              await page.locator('.agenda-appointment-row').first().waitFor();
              assertAgendaUrl();
              await page.evaluate(() => window.scrollTo(0, 0));
            }
            if (pixAttemptContinuity && target === '/encounters/synthetic-encounter') {
              assert.equal(await page.locator('h1').count(), 1, 'Encounter must expose one heading');
              await page
                .locator('.workflow-tab')
                .filter({ hasText: 'Serviços / Cobrança' })
                .click();
              await page.getByRole('button', { name: 'Solicitar despacho PIX', exact: true }).waitFor();
              const createResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname ===
                    '/api/encounters/synthetic-encounter/payments/pix-attempts' &&
                  response.status() === 202
              );
              await page.getByRole('button', { name: 'Solicitar despacho PIX', exact: true }).click();
              await createResponse;
              await page.getByText('Solicitação aceita (202)', { exact: false }).waitFor();
              assert.equal(
                await page.locator('.attempt__state').getByText('Despacho pendente', { exact: true }).count(),
                1
              );
              assert.equal(
                requests.filter(
                  (request) =>
                    request.path ===
                      '/api/encounters/synthetic-encounter/payments/pix-attempts' &&
                    request.method === 'POST' &&
                    Boolean(request.idempotencyKey)
                ).length,
                1
              );
              const statusResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname ===
                    '/api/payments/pix-attempts/synthetic-pix-attempt' &&
                  response.status() === 200
              );
              await page
                .getByRole('button', { name: 'Atualizar status da tentativa PIX' })
                .click();
              await statusResponse;
              await page.locator('.attempt__state').getByText('Liquidado', { exact: true }).waitFor();
              assert.equal(await page.locator('img[alt^="QR Code PIX"]').count(), 1);
              assert.equal(await page.getByText('000201synthetic-pix-copy-paste', { exact: true }).count(), 1);
              assert.equal(
                requests.filter(
                  (request) => request.path === '/api/payments/pix-attempts/synthetic-pix-attempt'
                ).length,
                1
              );
              await page.screenshot({ path: join(out, `pix-attempt-settled-${width}-${theme}.png`), fullPage: true });
              interactions.push({
                test: 'encounter-pix-202-refresh-and-settlement',
                passed: true,
                requestStatus: 202,
                initialState: 'pending_dispatch',
                refreshedState: 'settled',
                idempotencyKeyCaptured: true,
                qrRendered: true
              });
            }
            if (cashReceiptReversalContinuity && target === '/encounters/synthetic-encounter') {
              assert.equal(await page.locator('h1').count(), 1, 'Encounter must expose one heading');
              await page
                .locator('.workflow-tab')
                .filter({ hasText: 'Fechamento' })
                .click();
              await page.getByText('Recebimento confirmado', { exact: true }).waitFor();
              assert.equal(
                await page.getByRole('button', { name: 'Solicitar estorno', exact: true }).count(),
                1
              );
              await page.getByRole('button', { name: 'Solicitar estorno', exact: true }).click();
              const reversalDialog = page.getByRole('dialog', {
                name: 'Solicitar estorno do recebimento'
              });
              await reversalDialog.waitFor();
              const reversalReason = reversalDialog.locator('#cashReversalReason');
              assert.equal(await reversalReason.getAttribute('required'), '');
              assert.equal(await reversalReason.getAttribute('aria-required'), 'true');
              const confirmReversal = reversalDialog.getByRole('button', {
                name: 'Confirmar estorno',
                exact: true
              });
              assert.equal(await confirmReversal.isDisabled(), true);
              await page.locator('#cashReversalReason').fill('Correção operacional no caixa');
              const reversalRequest = page.waitForRequest(
                (request) =>
                  new URL(request.url()).pathname ===
                    '/api/encounters/synthetic-encounter/cash-receipts/synthetic-cash-receipt/reverse' &&
                  request.method() === 'POST'
              );
              const reversalResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname ===
                    '/api/encounters/synthetic-encounter/cash-receipts/synthetic-cash-receipt/reverse' &&
                  response.status() === 201
              );
              await confirmReversal.click();
              const [request, response] = await Promise.all([reversalRequest, reversalResponse]);
              assert.ok(request.headers()['idempotency-key']);
              assert.deepEqual(request.postDataJSON(), {
                reason: 'Correção operacional no caixa'
              });
              assert.equal(response.status(), 201);
              await page.getByText('Estorno confirmado.', { exact: true }).waitFor();
              assert.equal(
                await page.locator('.cash-receipt-review').evaluate(
                  (element) => document.activeElement === element
                ),
                true,
                'Focus must return to the stable receipt review after the trigger is removed'
              );
              assert.equal(
                await page.getByRole('button', { name: 'Solicitar estorno', exact: true }).count(),
                0
              );
              const activeReceiptGone = page.waitForRequest(
                (request) =>
                  new URL(request.url()).pathname ===
                    '/api/encounters/synthetic-encounter/cash-receipts' &&
                  request.method() === 'GET'
              );
              await page.getByRole('button', { name: 'Atualizar recebimento', exact: true }).click();
              await activeReceiptGone;
              await page.getByText('Estorno confirmado.', { exact: true }).waitFor();
              await page.reload({ waitUntil: 'networkidle' });
              await page.locator('#main-content').waitFor();
              await page
                .locator('.workflow-tab')
                .filter({ hasText: 'Fechamento' })
                .click();
              await page.getByText('Estornado', { exact: true }).waitFor();
              await page.screenshot({
                path: join(out, `cash-receipt-reversed-${width}-${theme}.png`),
                fullPage: true
              });
              interactions.push({
                test: 'encounter-cash-receipt-explicit-idempotent-reversal',
                passed: true,
                requestStatus: 201,
                originalState: 'confirmed',
                finalState: 'reversed',
                reasonRequiredBeforeSubmit: true,
                idempotencyKeyCaptured: true,
                summaryRefreshAfterCommit: true,
                activeReceiptRefreshDoesNotEraseReversal: true,
                reversalVisibleAfterPageReload: true,
                visualEvidence: [`cash-receipt-reversed-${width}-${theme}.png`]
              });
            }
            if (target === '/appointments' && agendaPriority) {
              const appointments = page.locator('.agenda-appointment-row');
              assert.equal(await appointments.count(), 2);
              const firstBox = await appointments.first().boundingBox();
              const inViewport = async (locator, label) => {
                const box = await locator.boundingBox();
                assert.ok(
                  box && box.y >= 0 && box.y + box.height <= height,
                  `${label} must be fully visible in first viewport: ${JSON.stringify(box)}`
                );
                return box;
              };
              assert.ok(
                firstBox && firstBox.y >= 0 && firstBox.y + firstBox.height <= height,
                `Appointment must be fully visible in first viewport: ${JSON.stringify(firstBox)}`
              );
              await inViewport(
                appointments.first().getByText('Luna Visual', { exact: true }),
                'Appointment patient'
              );
              await inViewport(
                appointments.first().getByText('Agendado', { exact: true }),
                'Appointment operational status'
              );
              await inViewport(
                appointments.first().locator('.agenda-appointment-row__details'),
                'Appointment details action'
              );
              await appointments.first().focus();
              await page.keyboard.press('Enter');
              await page.getByRole('dialog').waitFor();
              await page.keyboard.press('Escape');
              await page.getByRole('dialog').waitFor({ state: 'hidden' });
              assert.equal(
                await appointments.first().evaluate((el) => document.activeElement === el),
                true
              );
              await page.getByRole('button', { name: 'Filtrar agenda', exact: true }).click();
              await page.locator('#clientFilter').fill('inexistente');
              assert.equal(await appointments.count(), 0);
              await page.locator('#clientFilter').fill('');
              assert.equal(await appointments.count(), 2);
              const statusButton = page.locator('.status-chip').first();
              assert.equal(await statusButton.getAttribute('aria-pressed'), 'false');
              await statusButton.click();
              await page.waitForFunction(
                () =>
                  document.querySelector('.status-chip')?.getAttribute('aria-pressed') === 'true'
              );
              assert.equal(
                await page.locator('.mini-calendar__day--selected').getAttribute('aria-current'),
                'date'
              );
              await page.getByRole('button', { name: 'Ocultar filtros', exact: true }).click();
              await page.getByRole('button', { name: 'Dia', exact: true }).click();
              await page.locator('.time-matrix').waitFor();
              assert.equal(await page.locator('.view-toggle__button--active').innerText(), 'Dia');
              await page.getByRole('button', { name: 'Lista', exact: true }).click();
              await appointments.first().waitFor();
              assert.equal(await page.locator('.view-toggle__button--active').innerText(), 'Lista');
              await page.getByRole('button', { name: 'Mês', exact: true }).click();
              await page.locator('.month-board').waitFor();
              assert.equal(
                await page
                  .locator('.month-cell--selected .month-cell__header')
                  .getAttribute('aria-current'),
                'date'
              );
              await page.getByRole('button', { name: 'Lista', exact: true }).click();
              await appointments.first().waitFor();
              interactions.push({
                test: 'agenda-priority-list-keyboard-filter-and-grid',
                passed: true,
                firstItem: { y: firstBox.y, height: firstBox.height },
                count: 2,
                restoredFocus: true,
                selectedStatusSemantic: true,
                selectedDateSemantic: true,
                selectedMonthDateSemantic: true
              });
            }
            if (duplicateContinuity && target === '/owners/new') {
              await page.locator('#fullName').fill('Maria Duplicada');
              await page.locator('details.owner-section').nth(2).locator('summary').click();
              await page.locator('#documentId').fill('111.111.111-11');
              await page.locator('#mobile').fill('11999991111');
              const firstOwnerConflict = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/owners' &&
                  response.request().method() === 'POST'
              );
              await page.getByRole('button', { name: 'Cadastrar tutor', exact: true }).click();
              await firstOwnerConflict;
              await page.locator('.duplicate-feedback-region').waitFor();
              await page.waitForFunction(() => document.activeElement?.classList.contains('duplicate-feedback-region'));
              assert.equal(await page.locator('.form-feedback-region').count(), 0);
              assert.equal(await page.locator('#fullName').inputValue(), 'Maria Duplicada');
              assert.equal(await page.locator('#documentId').inputValue(), '111.111.111-11');
              await page.getByRole('button', { name: 'Manter este rascunho', exact: true }).click();
              assert.equal(await page.locator('.duplicate-feedback-region').count(), 0);
              assert.equal(await page.locator('#documentId').inputValue(), '111.111.111-11');
              const secondOwnerConflict = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/owners' &&
                  response.request().method() === 'POST'
              );
              await page.getByRole('button', { name: 'Cadastrar tutor', exact: true }).click();
              await secondOwnerConflict;
              await page.locator('.duplicate-feedback-region').waitFor();
              await page.getByRole('button', { name: 'Abrir tutor existente', exact: true }).click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              assert.equal(new URL(page.url()).pathname, '/owners/new');
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/owners/synthetic-owner-duplicate');
              interactions.push({
                test: 'owner-duplicate-conflict-preserves-draft-and-opens-existing',
                passed: true,
                conflictResponses: duplicateOwnerSaveAttempts,
                draftPreserved: true,
                keepDraftAction: true,
                navigationRequiresDiscard: true
              });
            }
            if (duplicateContinuity && target === '/patients/new') {
              await page.goto(`${origin}/patients/new?ownerId=synthetic-owner-1`, {
                waitUntil: 'networkidle'
              });
              await page.locator('.linked-owner').waitFor();
              await page.locator('#name').fill('Rex Duplicado');
              await page.locator('#species').selectOption('canine');
              await page.locator('#sex').selectOption('male');
              const firstPatientConflict = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/patients' &&
                  response.request().method() === 'POST'
              );
              await page.getByRole('button', { name: 'Salvar animal', exact: true }).click();
              await firstPatientConflict;
              await page.locator('.duplicate-feedback-region').waitFor();
              await page.waitForFunction(() => document.activeElement?.classList.contains('duplicate-feedback-region'));
              assert.equal(await page.locator('.form-feedback-region').count(), 0);
              assert.equal(await page.locator('#name').inputValue(), 'Rex Duplicado');
              await page.getByRole('button', { name: 'Manter este rascunho', exact: true }).click();
              assert.equal(await page.locator('.duplicate-feedback-region').count(), 0);
              const secondPatientConflict = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/patients' &&
                  response.request().method() === 'POST'
              );
              await page.getByRole('button', { name: 'Salvar animal', exact: true }).click();
              await secondPatientConflict;
              await page.locator('.duplicate-feedback-region').waitFor();
              await page.getByRole('button', { name: 'Abrir animal existente', exact: true }).click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              assert.equal(new URL(page.url()).pathname, '/patients/new');
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/patients/synthetic-patient-duplicate');
              interactions.push({
                test: 'patient-duplicate-conflict-preserves-draft-and-opens-existing',
                passed: true,
                conflictResponses: duplicatePatientSaveAttempts,
                draftPreserved: true,
                keepDraftAction: true,
                navigationRequiresDiscard: true
              });
            }
            if (target === '/patients/new' && patientBrowserContinuity) {
              const moveByPopstate = async (nextPath) => {
                await page.evaluate((path) => {
                  window.history.pushState({ ...window.history.state }, '', path);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }, nextPath);
              };
              await page.goto(`${origin}/patients/new?ownerId=synthetic-owner-1`, {
                waitUntil: 'networkidle'
              });
              await page.locator('.linked-owner').waitFor();
              if (width <= 260) {
                assert.equal(
                  await page.locator('.workspace__breadcrumbs').isVisible(),
                  false,
                  'the compact shell must hide optional breadcrumbs at extreme zoom widths'
                );
                assert.equal(
                  await page.locator('.workspace__overline').isVisible(),
                  true,
                  'the compact shell must retain its overline context at extreme zoom widths'
                );
                interactions.push({
                  test: 'patient-compact-shell-context-reflow',
                  passed: true,
                  breadcrumbRow: 'hidden',
                  overlineContext: 'visible'
                });
              }
              assert.equal(
                await page
                  .locator('.linked-owner')
                  .innerText()
                  .then((text) => text.includes('Maria Visual')),
                true
              );
              await page.getByRole('button', { name: 'Trocar tutor', exact: true }).click();
              await page.locator('#ownerSearch').waitFor();
              assert.equal(await page.locator('#ownerSearch').getAttribute('required'), '');
              assert.match(
                await page.locator('label[for="ownerSearch"]').innerText(),
                /Tutor responsável/
              );
              await page.getByRole('button', { name: 'Manter tutor atual', exact: true }).click();
              await page.locator('#species').selectOption('canine');
              await page.locator('#sex').selectOption('male');
              await page.getByRole('button', { name: 'Salvar animal', exact: true }).click();
              await page.locator('#patient-form-error-summary').waitFor();
              assert.equal(await page.locator('#patient-form-error-summary a').count(), 1);
              assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
              assert.equal(
                await page.locator('form').getAttribute('aria-describedby'),
                'patient-form-error-summary'
              );
              assert.equal(await page.evaluate(() => document.activeElement?.id), 'name');
              const invalidLayout = await page.evaluate(() => {
                const field = document.querySelector('#name')?.getBoundingClientRect();
                const actions = document.querySelector('.form-actions')?.getBoundingClientRect();
                return field && actions
                  ? {
                      field: { top: field.top, bottom: field.bottom },
                      actions: { top: actions.top, bottom: actions.bottom }
                    }
                  : null;
              });
              assert.ok(
                invalidLayout &&
                  !(
                    invalidLayout.field.bottom > invalidLayout.actions.top &&
                    invalidLayout.field.top < invalidLayout.actions.bottom
                  ),
                'Sticky actions must not cover the first invalid field'
              );
              assert.equal(
                await page
                  .locator('.form-actions')
                  .evaluate((element) => getComputedStyle(element).position),
                'sticky'
              );
              await page.screenshot({
                path: join(out, `patient-form-invalid-${width}-${theme}.png`),
                fullPage: true
              });
              interactions.push({
                test: 'patient-invalid-validation-summary-and-focus',
                passed: true,
                firstInvalidField: 'name',
                errorCount: 1
              });
              await page.locator('#name').fill('Rascunho de paciente antes de trocar o tutor');
              await moveByPopstate('/patients/new?ownerId=synthetic-owner-2');
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              assert.equal(
                await page.locator('#name').inputValue(),
                'Rascunho de paciente antes de trocar o tutor'
              );
              await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
              await page.waitForFunction(
                () => new URL(location.href).searchParams.get('ownerId') === 'synthetic-owner-1'
              );
              assert.equal(
                await page.locator('#name').inputValue(),
                'Rascunho de paciente antes de trocar o tutor'
              );
              await moveByPopstate('/patients/new?ownerId=synthetic-owner-2');
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/patients/new?ownerId=synthetic-owner-2');
              await page
                .locator('.linked-owner')
                .getByText('João Visual', { exact: true })
                .waitFor();
              assert.equal(await page.locator('#name').inputValue(), '');
              interactions.push({
                test: 'patient-dirty-owner-query-continue-discard',
                passed: true,
                preservedDraft: true,
                hydratedOwner: 'synthetic-owner-2'
              });

              await page.locator('#name').fill('Paciente com falha recuperável');
              await page.locator('#species').selectOption('canine');
              await page.locator('#sex').selectOption('male');
              const saveRequest = page.waitForRequest(
                (request) =>
                  new URL(request.url()).pathname === '/api/patients' && request.method() === 'POST'
              );
              await page.getByRole('button', { name: 'Salvar animal', exact: true }).click();
              await saveRequest;
              await page.locator('button[aria-busy="true"]').waitFor();
              assert.equal(await page.locator('fieldset[disabled]').count(), 1);
              await page.screenshot({
                path: join(out, `patient-form-saving-${width}-${theme}.png`),
                fullPage: false
              });
              await page.getByText('Falha sintética ao salvar paciente', { exact: true }).waitFor();
              const failureRegion = page.locator('.form-feedback-region');
              await page.waitForFunction(() => {
                const region = document.querySelector('.form-feedback-region');
                if (!region) return false;
                const box = region.getBoundingClientRect();
                return (
                  document.activeElement === region &&
                  box.top >= 96 &&
                  box.bottom <= window.innerHeight
                );
              });
              await page.screenshot({
                path: join(out, `patient-form-failed-${width}-${theme}.png`),
                fullPage: false
              });
              await page.getByRole('link', { name: 'Voltar aos pacientes', exact: true }).click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
              assert.equal(new URL(page.url()).pathname, '/patients/new');
              assert.equal(
                await page.locator('#name').inputValue(),
                'Paciente com falha recuperável'
              );
              interactions.push({
                test: 'patient-failed-save-remains-dirty',
                passed: true,
                preservedFields: ['name', 'species', 'sex'],
                loadingObserved: true,
                failureScreenshot: true,
                failureFeedbackFocused: true,
                failureFeedbackVisible: true
              });

              let successRedirectEvidence;
              if (successRedirectContinuity) {
                await page.evaluate(() => {
                  const trace = window.__cvgMotionTrace;
                  if (!trace) throw new Error('Missing success redirect motion trace');
                  trace.pendingObserved = null;
                  trace.pendingObserver?.disconnect();
                  trace.pendingObserver = new MutationObserver(() => {
                    const saveButton = [...document.querySelectorAll('button')].find((element) =>
                      element.textContent?.includes('Salvar animal')
                    );
                    if (saveButton && saveButton.disabled && !trace.pendingObserved) {
                      trace.pendingObserved = {
                        at: performance.now(),
                        disabled: saveButton.disabled,
                        ariaBusy: saveButton.getAttribute('aria-busy'),
                        successVisible: false
                      };
                    }
                  });
                  trace.pendingObserver.observe(document.body, {
                    subtree: true,
                    childList: true,
                    attributes: true,
                    attributeFilter: ['disabled', 'aria-busy']
                  });
                });
              }
              const successResponse = successRedirectContinuity
                ? page.waitForResponse(
                    (response) =>
                      new URL(response.url()).pathname === '/api/patients' &&
                      response.request().method() === 'POST' &&
                      response.status() === 200
                  )
                : null;
              await page.getByRole('button', { name: 'Salvar animal', exact: true }).click();
              if (successRedirectContinuity) {
                await successResponse;
                const responseObservedAt = await page.evaluate(() => performance.now());
                await page.getByText('Animal cadastrado com sucesso!', { exact: true }).waitFor();
                await page.waitForFunction(
                  () => Boolean(window.__cvgMotionTrace?.pendingObserved),
                  undefined,
                  { timeout: 5000 }
                );
                await page.waitForURL('**/patients/synthetic-patient-created');
                await page.waitForFunction(() =>
                  document.activeElement?.matches(
                    '.workspace__body h1, .workspace__body[tabindex="-1"]'
                  )
                );
                successRedirectEvidence = await page.evaluate((responseAt) => {
                  const trace = window.__cvgMotionTrace;
                  trace.pendingObserver?.disconnect();
                  const visibleSuccessAlerts = [...document.querySelectorAll('.ds-alert')].filter((element) => {
                    const box = element.getBoundingClientRect();
                    const styles = getComputedStyle(element);
                    return (
                      element.textContent?.includes('Animal cadastrado com sucesso!') &&
                      box.width > 0 &&
                      box.height > 0 &&
                      styles.display !== 'none' &&
                      styles.visibility !== 'hidden'
                    );
                  });
                  const success = visibleSuccessAlerts.find((element) =>
                    element.textContent?.includes('Animal cadastrado com sucesso!')
                  );
                  const visibleLocalSuccessAlerts = visibleSuccessAlerts.filter((element) =>
                    element.closest('.workspace__body')
                  );
                  const visibleShellSuccessAlerts = visibleSuccessAlerts.filter(
                    (element) => !element.closest('.workspace__body')
                  );
                  if (trace.pendingObserved) trace.pendingObserved.successVisible = Boolean(success);
                  const redirect = [...trace.routePushes]
                    .reverse()
                    .find((entry) => entry.url.includes('/patients/synthetic-patient-created'));
                  const rafBetween = trace.raf.filter(
                    (entry) =>
                      entry.executedAt >= responseAt &&
                      redirect &&
                      entry.executedAt <= redirect.at
                  );
                  return {
                    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                    pending: trace.pendingObserved,
                    redirectAt: redirect?.at ?? null,
                    responseObservedAt: responseAt,
                    redirectDelayMs:
                      redirect && Number.isFinite(responseAt) ? redirect.at - responseAt : null,
                    rafBetweenResponseAndRedirect: rafBetween.length,
                    visibleSuccessAlertCount: visibleSuccessAlerts.length,
                    visibleShellSuccessAlertCount: visibleShellSuccessAlerts.length,
                    visibleLocalSuccessAlertCount: visibleLocalSuccessAlerts.length,
                    focusAfterRedirect: document.activeElement?.textContent?.trim() || null
                  };
                }, responseObservedAt);
                assert.equal(successRedirectEvidence.pending.disabled, true);
                assert.equal(successRedirectEvidence.pending.successVisible, true);
                assert.equal(successRedirectEvidence.visibleSuccessAlertCount, 1);
                assert.equal(successRedirectEvidence.visibleShellSuccessAlertCount, 1);
                assert.equal(successRedirectEvidence.visibleLocalSuccessAlertCount, 0);
                assert.equal(successRedirectEvidence.reducedMotion, reducedMotionContinuity);
                if (successRedirectEvidence.reducedMotion) {
                  assert.equal(successRedirectEvidence.rafBetweenResponseAndRedirect, 0);
                } else {
                  assert.ok(
                    successRedirectEvidence.rafBetweenResponseAndRedirect >= 1 &&
                      successRedirectEvidence.rafBetweenResponseAndRedirect <= 3,
                    `Success redirect must use a bounded frame boundary: ${JSON.stringify(successRedirectEvidence)}`
                  );
                }
                interactions.push({
                  test: 'patient-success-redirect-next-frame-pending-lock-and-focus',
                  passed: true,
                  ...successRedirectEvidence
                });
                await page.goto(`${origin}/patients`, { waitUntil: 'networkidle' });
              } else {
                await page.getByText('Animal cadastrado com sucesso!', { exact: true }).waitFor();
                await page.getByRole('link', { name: 'Voltar aos pacientes', exact: true }).click();
                await page.waitForURL('**/patients');
              }
              assert.equal(
                await page.getByRole('dialog', { name: 'Alterações não salvas' }).count(),
                0
              );
              interactions.push({
                test: 'patient-successful-save-clears-dirty',
                passed: true,
                noConfirmationOnExit: true
              });

              await page.locator('a[href="/patients/new"]:visible').first().click();
              await page.waitForURL('**/patients/new');
              await page.locator('#name').waitFor();
              await page.locator('#name').fill('Rascunho antes de desmontar o formulário');
              await page.getByRole('link', { name: 'Voltar aos pacientes', exact: true }).click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/patients');
              interactions.push({
                test: 'patient-unmount-unregisters-coordinator',
                passed: true,
                routeAfterUnmount: '/patients',
                coordinatorProbe: 'new mounted form completed logout flow'
              });

              await page.locator('a[href="/patients/new"]:visible').first().click();
              await page.waitForURL('**/patients/new');
              await page.locator('#name').waitFor();
              await page.locator('#name').fill('Rascunho antes do logout');
              const sessionLabel = await page.locator('.topbar__profile').innerText();
              await page.getByRole('button', { name: 'Sair do sistema', exact: true }).click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
              assert.equal(new URL(page.url()).pathname, '/patients/new');
              assert.equal(await page.locator('#name').inputValue(), 'Rascunho antes do logout');
              assert.equal(await page.locator('.topbar__profile').innerText(), sessionLabel);
              await page.getByRole('button', { name: 'Sair do sistema', exact: true }).click();
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/login');
              await page.locator('#email').waitFor();
              assert.equal(await page.locator('#name').count(), 0);
              interactions.push({
                test: 'patient-logout-keeps-draft-until-consent',
                passed: true,
                sessionPreserved: true
              });
            }
            if (target === '/reception' && receptionPopulated) {
              const queueItem = page.locator('.queue-preview-row').first();
              await queueItem.waitFor();
              const firstQueueBox = await queueItem.boundingBox();
              assert.ok(
                firstQueueBox && firstQueueBox.y < 844,
                'First queue item must start in the first viewport'
              );
              await page.locator('#reception-query').fill('Maria');
              await page.getByRole('button', { name: 'Buscar', exact: true }).click();
              const result = page
                .locator('.result-row')
                .filter({ hasText: 'Maria Sintética' })
                .first();
              await result.waitFor();
              const resultBox = await result.boundingBox();
              assert.ok(
                resultBox && resultBox.y < 844,
                'First search result must start in the first viewport'
              );
              const href = await result
                .getByRole('link', { name: 'Criar agendamento', exact: true })
                .getAttribute('href');
              assert.equal(new URL(href, origin).searchParams.get('ownerId'), 'synthetic-owner-1');
              await page.screenshot({
                path: join(out, `reception-populated-${width}-${theme}.png`),
                fullPage: true
              });
              interactions.push({
                test: 'reception-populated-search-and-queue',
                passed: true,
                firstQueueY: firstQueueBox.y,
                resultY: resultBox.y,
                schedulingHref: href
              });
              const oldSearchRequest = page.waitForRequest(
                (request) =>
                  new URL(request.url()).pathname === '/api/owners' &&
                  new URL(request.url()).searchParams.get('q') === 'old-reception'
              );
              await page.locator('#reception-query').fill('old-reception');
              await page.getByRole('button', { name: 'Buscar', exact: true }).click();
              await oldSearchRequest;
              await page.locator('#reception-query').fill('Maria');
              await page.getByRole('button', { name: 'Buscar', exact: true }).click();
              await result.waitFor();
              assert.equal(typeof releaseOldReception, 'function');
              const obsoleteResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/owners' &&
                  new URL(response.url()).searchParams.get('q') === 'old-reception'
              );
              releaseOldReception();
              await (await obsoleteResponse).finished();
              await page.waitForLoadState('networkidle');
              assert.equal(await page.getByText('Obsoleto Sintético', { exact: true }).count(), 0);
              assert.equal(await result.count(), 1);
              await page.getByRole('button', { name: 'Limpar', exact: true }).click();
              assert.equal(await page.locator('#reception-query').inputValue(), '');
              assert.equal(await result.count(), 0);
              interactions.push({ test: 'reception-latest-search-and-clear', passed: true });
            }
            if (masterSearchContinuity && target === '/master-search') {
              const searchInput = page.getByRole('searchbox', {
                name: 'Buscar registros',
                exact: true
              });
              await searchInput.fill('Maria');
              await searchInput.press('Enter');
              await page.waitForFunction(
                () => new URL(location.href).searchParams.get('q') === 'Maria'
              );
              const ownerResult = page
                .getByRole('link', { name: 'Maria Sintética', exact: true })
                .first();
              await ownerResult.waitFor();
              assert.ok(
                (await page.getByRole('link', { name: 'Luna Sintética', exact: true }).count()) >= 1
              );
              await page.screenshot({
                path: join(out, `master-search-results-${width}-${theme}.png`),
                fullPage: false
              });
              await page.getByRole('link', { name: 'Luna Sintética', exact: true }).first().click();
              await page.waitForURL('**/patients/synthetic-search-patient');
              assert.equal(new URL(page.url()).search, '');
              await page.goBack();
              await page.waitForURL('**/master-search?q=Maria');
              await searchInput.waitFor();
              await page
                .getByRole('link', { name: 'Maria Sintética', exact: true })
                .first()
                .waitFor();
              assert.equal(await searchInput.inputValue(), 'Maria');
              const historyLength = await page.evaluate(() => history.length);
              assert.equal(await page.evaluate(() => history.length), historyLength);
              await page.getByRole('button', { name: 'Limpar', exact: true }).click();
              await page.waitForURL('**/master-search');
              assert.equal(await page.evaluate(() => history.length), historyLength);
              assert.equal(
                await page.getByRole('link', { name: 'Maria Sintética', exact: true }).count(),
                0
              );
              interactions.push({
                test: 'master-search-keyboard-context-return-and-clear',
                passed: true,
                query: 'Maria',
                returnedContext: true,
                historyPreservedOnQueryChanges: true,
                clearedWithoutRecordMutation: true
              });
            }
            if (inpatientContinuity && target === '/inpatient') {
              await page.goto(`${origin}/inpatient?patientId=synthetic-initial-failure`, {
                waitUntil: 'networkidle'
              });
              await page
                .getByText('Não foi possível carregar as internações', { exact: true })
                .waitFor();
              const initialListRetry = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await page.locator('.data-table-loading').waitFor();
              await initialListRetry;
              await page.getByText('Nenhuma internação ativa', { exact: true }).waitFor();
              interactions.push({
                test: 'inpatient-list-initial-failure-empty-and-retry',
                passed: true,
                initialFailure: true,
                retryConfirmed: true,
                emptyState: true
              });
              await page.goto(`${origin}/inpatient?fixture=reset`, { waitUntil: 'networkidle' });
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.getByText('Internado', { exact: true }).count(), 1);
              assert.equal(await page.getByText('Clínica', { exact: true }).count(), 1);
              assert.equal(await page.getByText('A-01', { exact: true }).count(), 1);
              assert.equal(await page.getByText('33%', { exact: true }).count(), 1);
              await page
                .getByRole('link', {
                  name: 'Ver internação de Luna Visual, leito A-01',
                  exact: true
                })
                .waitFor();
              const updateResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 200
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await page.locator('.inpatient-refresh-status').waitFor();
              assert.equal(await page.getByText('A-01', { exact: true }).count(), 1);
              await updateResponse;
              await page.getByText('Estável', { exact: true }).waitFor();
              assert.equal(await page.locator('.data-table-loading').count(), 0);
              if (width <= 640) {
                const mobileTable = await page.locator('.data-table').evaluate((element) => {
                  const box = element.getBoundingClientRect();
                  return {
                    width: box.width,
                    minWidth: getComputedStyle(element).minWidth,
                    viewportWidth: window.innerWidth
                  };
                });
                assert.ok(mobileTable.width <= mobileTable.viewportWidth + 2);
                assert.equal(mobileTable.minWidth, '0px');
                assert.equal(await page.getByText('Luna Visual', { exact: true }).count(), 1);
              }
              const forbiddenResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 403
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await forbiddenResponse;
              await page
                .getByText('Acesso negado para a lista de internações.', { exact: false })
                .waitFor();
              assert.equal(await page.locator('[role="alert"]').count(), 1);
              assert.equal(await page.getByText('A-01', { exact: true }).count(), 0);
              assert.equal(await page.getByText('50%', { exact: true }).count(), 0);
              await page.screenshot({
                path: join(out, `inpatient-list-forbidden-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'inpatient-list-status-refresh-and-forbidden',
                passed: true,
                initialStatus: 'Internado',
                refreshedStatus: 'Estável',
                forbiddenFeedback: true,
                noStaleRows: true
              });
            }
            if (inpatientContinuity && target === '/inpatient/board') {
              await page.goto(`${origin}/inpatient/board?fixture=initial-failure`, {
                waitUntil: 'networkidle'
              });
              await page.getByText('Mapa indisponível', { exact: true }).waitFor();
              const initialBoardRetry = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/bed-map' && response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await initialBoardRetry;
              await page.getByText('Nenhum setor configurado', { exact: true }).waitFor();
              interactions.push({
                test: 'bed-board-initial-failure-empty-and-retry',
                passed: true,
                initialFailure: true,
                retryConfirmed: true,
                emptyState: true
              });
              await page.goto(`${origin}/inpatient/board?fixture=reset`, { waitUntil: 'networkidle' });
              await page.locator('.bed-card').first().waitFor();
              assert.equal(await page.locator('.bed-card').count(), 4);
              for (const label of ['Ocupado', 'Disponível', 'Manutenção', 'Bloqueado'])
                assert.ok(
                  (await page.getByText(label, { exact: true }).count()) >= 1,
                  `Missing bed status ${label}`
                );
              assert.equal(await page.getByText('1/4 ocupados', { exact: true }).count(), 1);
              const updateResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/bed-map' && response.status() === 200
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await page.locator('.board-refresh-status').waitFor();
              assert.equal(await page.locator('.bed-card').count(), 4);
              assert.equal(await page.locator('.board[aria-busy="true"]').count(), 1);
              await updateResponse;
              await page.getByText('2/4 ocupados', { exact: true }).waitFor();
              assert.equal(await page.locator('.bed-card').count(), 4);
              const transientFailureResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/bed-map' && response.status() === 500
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await transientFailureResponse;
              await page
                .getByText('último mapa confirmado permanece em tela', { exact: false })
                .waitFor();
              assert.equal(await page.locator('.bed-card').count(), 4);
              assert.equal(await page.getByText('2/4 ocupados', { exact: true }).count(), 1);
              await page.screenshot({
                path: join(out, `inpatient-board-refresh-failed-${width}-${theme}.png`),
                fullPage: false
              });
              const forbiddenResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/bed-map' && response.status() === 403
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await forbiddenResponse;
              await page.getByText('Acesso restrito', { exact: true }).waitFor();
              assert.equal(await page.getByText('não tem permissão', { exact: false }).count(), 1);
              assert.equal(
                await page.getByRole('link', { name: 'Voltar à internação', exact: true }).count(),
                1
              );
              await page.screenshot({
                path: join(out, `inpatient-board-forbidden-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'bed-board-status-refresh-and-forbidden',
                passed: true,
                statusLabels: ['Ocupado', 'Disponível', 'Manutenção', 'Bloqueado'],
                preservesCardsWhileRefreshing: true,
                preservesCardsAfterTransientFailure: true,
                forbiddenFeedback: true
              });
            }
            if (inpatientContinuity && target === '/beds/synthetic-bed-occupied') {
              await page.locator('#bed-identity').getByText('A-01 · Leito A-01', { exact: true }).waitFor();
              assert.equal(await page.locator('.detail-list .ds-badge--danger').count(), 1);
              const bedStatusRoutes = [
                { id: 'synthetic-bed-maintenance', code: 'A-02', status: 'Manutenção', variant: 'warning' },
                { id: 'synthetic-bed-blocked', code: 'A-03', status: 'Bloqueado', variant: 'danger' },
                { id: 'synthetic-bed-available', code: 'A-04', status: 'Disponível', variant: 'success' }
              ];
              for (const fixture of bedStatusRoutes) {
                await page.evaluate((id) => {
                  window.history.pushState({ ...window.history.state }, '', `/beds/${id}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }, fixture.id);
                await page.waitForURL(`**/beds/${fixture.id}`);
                await page.locator('#bed-identity').getByText(new RegExp(`${fixture.code} ·`)).waitFor();
                assert.equal(await page.getByText(fixture.status, { exact: true }).count(), 1);
                assert.equal(await page.locator(`.detail-list .ds-badge--${fixture.variant}`).count(), 1);
              }
              await page.screenshot({
                path: join(out, `inpatient-bed-statuses-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'bed-detail-route-status-variants-and-context',
                passed: true,
                statuses: ['Ocupado', 'Manutenção', 'Bloqueado', 'Disponível'],
                variants: ['danger', 'warning', 'danger', 'success'],
                routeChangesDiscardedPreviousIdentity: true
              });
            }
            if (inpatientContinuity && target === '/inpatient/synthetic-inpatient-stay') {
              await page.goto(`${origin}/inpatient/synthetic-inpatient-stay?fixture=initial-failure`, {
                waitUntil: 'networkidle'
              });
              await page.getByText('Internação indisponível', { exact: true }).waitFor();
              const initialDetailRetry = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await page.locator('.detail-grid').waitFor();
              await initialDetailRetry;
              await page.locator('.detail-grid').getByText('Luna Visual', { exact: true }).waitFor();
              interactions.push({
                test: 'inpatient-detail-initial-failure-and-retry',
                passed: true,
                initialFailure: true,
                retryConfirmed: true
              });
              await page.goto(`${origin}/inpatient/synthetic-inpatient-stay`, {
                waitUntil: 'networkidle'
              });
              const detailGrid = page.locator('.detail-grid');
              const locationSummary = page
                .locator('.summary-card')
                .filter({ hasText: 'Localização' })
                .locator('.summary-card__value');
              await detailGrid.waitFor();
              await detailGrid.getByText('Luna Visual', { exact: true }).waitFor();
              assert.equal(await locationSummary.innerText(), 'Clínica / Ala Norte / A-01');
              assert.equal(await page.getByText('Internado', { exact: true }).count(), 1);
              assert.equal(await page.getByText('Última atualização', { exact: true }).count(), 1);
              const refreshButton = page.getByRole('button', {
                name: 'Atualizar dados da internação',
                exact: true
              });
              const updateResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 200
              );
              await refreshButton.click();
              await page.locator('.refresh-status').waitFor();
              assert.equal(await page.locator('.detail-content[aria-busy="true"]').count(), 1);
              assert.equal(await locationSummary.innerText(), 'Clínica / Ala Norte / A-01');
              await updateResponse;
              await page.getByText('Clínica / Ala Norte / A-02', { exact: true }).waitFor();
              await page.getByText('Estável', { exact: true }).waitFor();
              assert.equal(await page.getByText('Clínica / Ala Norte / A-01', { exact: true }).count(), 0);
              assert.equal(await page.locator('.detail-content[aria-busy="true"]').count(), 0);
              const routeFrom = page.url();
              await page.evaluate(() => {
                window.history.pushState(
                  { ...window.history.state },
                  '',
                  '/inpatient/synthetic-inpatient-stay-2'
                );
                window.dispatchEvent(new PopStateEvent('popstate'));
              });
              await page.waitForURL('**/inpatient/synthetic-inpatient-stay-2');
              await page.getByText('Clínica / Ala Sul / B-01', { exact: true }).waitFor();
              assert.equal(await page.getByText('Clínica / Ala Norte / A-02', { exact: true }).count(), 0);
              assert.equal(
                await page
                  .getByRole('button', { name: 'Atualizar dados da internação', exact: true })
                  .isDisabled(),
                false
              );
              interactions.push({
                test: 'inpatient-detail-route-change-invalidates-previous-request',
                passed: true,
                routeFrom,
                routeTo: page.url(),
                newBed: 'B-01',
                previousContextDiscarded: true,
                refreshActionAvailable: true
              });
              const movedRefreshResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 200
              );
              await refreshButton.click();
              await page.locator('.refresh-status').waitFor();
              await movedRefreshResponse;
              await page.getByText('Clínica / Ala Sul / B-02', { exact: true }).waitFor();
              await page.getByText('Estável', { exact: true }).waitFor();
              const transientFailureResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 500
              );
              await refreshButton.click();
              await transientFailureResponse;
              const detailRefreshError = page
                .getByRole('alert')
                .filter({ hasText: 'Atualização da internação interrompida' });
              await detailRefreshError.waitFor();
              assert.match(await detailRefreshError.innerText(), /contexto atual/);
              assert.equal(await page.getByText('Clínica / Ala Sul / B-02', { exact: true }).count(), 1);
              const forbiddenResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inpatient' && response.status() === 403
              );
              await refreshButton.click();
              await forbiddenResponse;
              const detailAlert = page
                .getByRole('alert')
                .filter({ hasText: 'Atualização da internação interrompida' });
              await detailAlert.waitFor();
              assert.match(await detailAlert.innerText(), /permissão/);
              assert.equal(await page.getByText('Clínica / Ala Sul / B-02', { exact: true }).count(), 1);
              assert.equal(await detailGrid.getByText('Luna Visual', { exact: true }).count(), 1);
              assert.equal(
                await page.getByRole('button', { name: 'Tentar novamente', exact: true }).count(),
                1
              );
              await page.screenshot({
                path: join(out, `inpatient-detail-forbidden-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'inpatient-detail-context-refresh-and-forbidden',
                passed: true,
                initialBed: 'A-01',
                refreshedBed: 'A-02',
                routeChangedTo: 'B-01',
                routeRefreshedBed: 'B-02',
                refreshedStatus: 'Estável',
                preservesContextAfterTransientFailure: true,
                preservesContextOnForbidden: true,
                retryAvailable: true
              });
              await page.goto(`${origin}/inpatient/synthetic-inpatient-stay?fixture=modal`, {
                waitUntil: 'networkidle'
              });
              await page.getByText('Clínica / Ala Norte / A-01', { exact: true }).waitFor();
              await page.getByRole('button', { name: 'Dar Alta', exact: true }).click();
              const dischargeReason = page.locator('#dischargeReason');
              await dischargeReason.waitFor();
              await dischargeReason.fill('Rascunho de alta que não pode atravessar a internação.');
              await page.evaluate(() => {
                window.history.pushState(
                  { ...window.history.state },
                  '',
                  '/inpatient/synthetic-inpatient-stay-2'
                );
                window.dispatchEvent(new PopStateEvent('popstate'));
              });
              await page.waitForURL('**/inpatient/synthetic-inpatient-stay-2');
              await page.getByText('Clínica / Ala Sul / B-01', { exact: true }).waitFor();
              assert.equal(await page.locator('#dischargeReason').count(), 0);
              assert.equal(
                await page.getByText('Rascunho de alta que não pode atravessar a internação.', { exact: true }).count(),
                0
              );
              assert.equal(await page.getByRole('button', { name: 'Confirmar Alta', exact: true }).count(), 0);
              interactions.push({
                test: 'inpatient-detail-route-change-clears-destructive-discharge-draft',
                passed: true,
                draftOpened: true,
                routeChangedTo: 'synthetic-inpatient-stay-2',
                draftCleared: true,
                modalClosed: true
              });
            }
            if (cashContinuity && target === '/cash') {
              const summary = page.locator('section.cash-kpis');
              await summary.getByText('R$\u00a0200,00', { exact: true }).first().waitFor();
              const entryForm = page.locator('.cash-actions form').first();
              const amount = entryForm.locator('input[type="number"]');
              await amount.fill('50');

              const failedMovement = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/cash-register/movements' &&
                  response.status() === 500
              );
              await entryForm.getByRole('button', { name: 'Entrada', exact: true }).click();
              await page
                .locator('.cash-status')
                .filter({ hasText: 'Entrada em andamento' })
                .waitFor();
              assert.equal(await entryForm.getAttribute('aria-busy'), 'true');
              assert.equal(await amount.isDisabled(), true);
              await failedMovement;
              await page
                .getByText('Falha sintética ao registrar entrada.', { exact: true })
                .waitFor();
              assert.equal(await amount.inputValue(), '50');
              assert.equal(
                await page.getByText('Entrada de gaveta registrada.', { exact: true }).count(),
                0
              );
              await page.screenshot({
                path: join(out, `cash-movement-failed-${width}-${theme}.png`),
                fullPage: false
              });

              const successfulMovement = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/cash-register/movements' &&
                  response.status() === 201
              );
              await entryForm.getByRole('button', { name: 'Entrada', exact: true }).click();
              await entryForm.evaluate((form) =>
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
              );
              await page
                .locator('.cash-status')
                .filter({ hasText: 'Entrada em andamento' })
                .waitFor();
              await successfulMovement;
              await page.getByText('R$\u00a0250,00', { exact: true }).first().waitFor();
              await page.getByText('Entrada de gaveta registrada.', { exact: true }).waitFor();
              assert.equal(await amount.inputValue(), '0');
              const withdrawalForm = page.locator('.cash-actions form').nth(1);
              const withdrawalAmount = withdrawalForm.locator('input[type="number"]');
              await withdrawalAmount.fill('10');
              const timedOutMovement = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/cash-register/movements' &&
                  response.status() === 504
              );
              await withdrawalForm.getByRole('button', { name: 'Saída', exact: true }).click();
              await timedOutMovement;
              await page.getByRole('alert').filter({ hasText: 'Tempo limite excedido' }).waitFor();
              assert.equal(await withdrawalAmount.inputValue(), '10');
              assert.equal(
                await page.getByText('Saída de gaveta registrada.', { exact: true }).count(),
                0
              );
              await page.screenshot({
                path: join(out, `cash-movement-timeout-${width}-${theme}.png`),
                fullPage: false
              });
              const movementRequests = requests.filter(
                (request) =>
                  request.path === '/api/cash-register/movements' && request.method === 'POST'
              );
              assert.equal(movementRequests.length, 3);
              const uncertainRetry = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/cash-register/movements' &&
                  response.status() === 201
              );
              await page.getByRole('button', { name: 'Reconsultar operação', exact: true }).click();
              await uncertainRetry;
              await page.getByText('Saída de gaveta registrada.', { exact: true }).waitFor();
              assert.equal(
                await page
                  .getByRole('button', { name: 'Reconsultar operação', exact: true })
                  .count(),
                0
              );
              const retriedMovementRequests = requests.filter(
                (request) =>
                  request.path === '/api/cash-register/movements' && request.method === 'POST'
              );
              assert.equal(retriedMovementRequests.length, 4);
              assert.ok(retriedMovementRequests[2].idempotencyKey);
              assert.equal(
                retriedMovementRequests[2].idempotencyKey,
                retriedMovementRequests[3].idempotencyKey
              );
              interactions.push({
                test: 'cash-failed-action-preserves-form-and-double-submit-guard',
                passed: true,
                failedDraftPreserved: true,
                pendingState: true,
                timeoutState: true,
                uncertainRetry: true,
                sameIdempotencyKey: true,
                duplicateCommands: 0,
                movementRequests: 4,
                confirmedTotal: 'R$\u00a0250,00'
              });

              const closeForm = page.locator('.cash-actions form').nth(3);
              await closeForm.getByRole('button', { name: 'Fechar Gaveta', exact: true }).click();
              const confirmation = page.getByRole('dialog', {
                name: 'Confirmar fechamento da gaveta',
                exact: true
              });
              await confirmation.waitFor();
              assert.equal(cashCloseAttempts, 0);
              await confirmation.getByRole('button', { name: 'Cancelar', exact: true }).click();
              await confirmation.waitFor({ state: 'hidden' });
              await closeForm.getByRole('button', { name: 'Fechar Gaveta', exact: true }).click();
              await confirmation.waitFor();
              const closed = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/cash-register/close' &&
                  response.status() === 200
              );
              await confirmation
                .getByRole('button', { name: 'Confirmar fechamento', exact: true })
                .click();
              await closed;
              await page.getByText('Gaveta fechada.', { exact: true }).waitFor();
              await page.getByRole('button', { name: 'Abrir Gaveta', exact: true }).waitFor();
              assert.equal(
                await summary
                  .locator('.ds-stat-card')
                  .nth(3)
                  .getByText('R$\u00a00,00', { exact: true })
                  .count(),
                1
              );
              await page.screenshot({
                path: join(out, `cash-closed-confirmed-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'cash-close-confirmation-and-confirmed-state',
                passed: true,
                confirmationRequired: true,
                closeRequestsBeforeConfirm: 0,
                confirmedAfterDashboardReload: true,
                closedStateVisible: true
              });
            }
            if (reportContinuity && target === '/reports/inventory') {
              const filtersDisclosure = page.locator('.report-filter-disclosure');
              await filtersDisclosure.locator('summary').click();
              const dateFrom = page.locator('input[type="date"]').nth(0);
              const dateTo = page.locator('input[type="date"]').nth(1);
              const search = page.getByRole('textbox', { name: 'Código ou produto', exact: true });
              await dateFrom.fill('2026-09-01');
              await dateTo.fill('2026-09-07');
              await search.fill('Dipirona');
              const contextResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/reports/executions' &&
                  response.status() === 200
              );
              await filtersDisclosure.getByRole('button', { name: 'Aplicar', exact: true }).click();
              await contextResponse;
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await dateFrom.inputValue(), '2026-09-01');
              assert.equal(await dateTo.inputValue(), '2026-09-07');
              assert.match(await page.locator('tbody tr').first().innerText(), /01\/09\/2026/);
              assert.equal(
                await page.locator('table caption').innerText(),
                'Posição atual de estoque'
              );
              assert.ok(
                width === 1440 || measure.scrollContainers.length >= 1,
                'A tabela larga deve oferecer rolagem local no mobile'
              );
              if (width === 390) {
                const tableRegion = page.locator('.table-wrapper');
                await tableRegion.focus();
                const scrollBeforeKey = await tableRegion.evaluate((element) => element.scrollLeft);
                await page.keyboard.press('ArrowRight');
                const scrollAfterKey = await tableRegion.evaluate((element) => element.scrollLeft);
                assert.ok(
                  scrollAfterKey > scrollBeforeKey,
                  'A região da tabela deve responder às setas quando focada'
                );
              }
              const contextUrl = new URL(page.url());
              assert.equal(contextUrl.searchParams.get('search'), 'Dipirona');
              await page.goto(`${origin}/inventory`, { waitUntil: 'networkidle' });
              await page.goBack({ waitUntil: 'networkidle' });
              await page.locator('tbody tr').first().waitFor();
              if ((await filtersDisclosure.getAttribute('open')) === null) {
                await filtersDisclosure.locator('summary').click();
              }
              assert.equal(new URL(page.url()).searchParams.get('dateFrom'), '2026-09-01');
              assert.equal(
                await page.locator('input[type="date"]').nth(0).inputValue(),
                '2026-09-01'
              );
              assert.equal(
                await page
                  .getByRole('textbox', { name: 'Código ou produto', exact: true })
                  .inputValue(),
                'Dipirona'
              );
              interactions.push({
                test: 'report-filter-context-survives-return',
                passed: true,
                queryKeys: ['dateFrom', 'dateTo', 'search'],
                returnRoute: '/reports/inventory'
              });

              const downloadPromise = page.waitForEvent('download');
              const displayedExecutionId = await page
                .locator('.report-results')
                .getAttribute('data-execution-id');
              assert.ok(displayedExecutionId, 'A tabela deve identificar a execução exibida');
              const executionPostsBeforeExport = reportExecutionAttempts;
              const exportResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname.endsWith('/export') && response.status() === 200
              );
              await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
              const download = await downloadPromise;
              await exportResponse;
              assert.equal(lastReportExportExecutionId, displayedExecutionId);
              assert.equal(
                reportExecutionAttempts,
                executionPostsBeforeExport,
                'Exportar não deve executar o relatório novamente'
              );
              assert.match(download.suggestedFilename(), /estoque/);
              const downloadedCsvPath = await download.path();
              assert.ok(downloadedCsvPath, 'O navegador deve materializar o arquivo exportado');
              const downloadedCsv = readFileSync(downloadedCsvPath, 'utf8');
              assert.match(downloadedCsv, /Código,Produto,Saldo,Unidade/);
              assert.match(downloadedCsv, /MED-001,Dipirona Injetável,4,ampola/);
              await page
                .getByText(/Exportação server-side auditada gerada com 1 linha/, { exact: false })
                .waitFor();
              const failedExport = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname.endsWith('/export') && response.status() === 503
              );
              await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
              await failedExport;
              await page
                .getByRole('alert')
                .filter({ hasText: 'Falha sintética ao gerar o arquivo' })
                .waitFor();
              assert.equal(
                await page.getByRole('button', { name: 'Exportar CSV', exact: true }).isDisabled(),
                false
              );
              interactions.push({
                test: 'report-export-success-and-failure',
                passed: true,
                format: 'csv',
                timezone: 'UTC',
                filename: download.suggestedFilename(),
                failureRecoverable: true,
                displayedExecutionId,
                exportedExecutionId: lastReportExportExecutionId,
                executionPostsBeforeExport,
                executionPostsAfterExport: reportExecutionAttempts
              });

              await search.fill('Ausente');
              const emptyResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/reports/executions' &&
                  response.status() === 200
              );
              await filtersDisclosure.getByRole('button', { name: 'Aplicar', exact: true }).click();
              await emptyResponse;
              await page
                .getByRole('heading', { name: 'Sem resultados para os filtros', exact: true })
                .waitFor();
              assert.equal(
                await page.getByRole('button', { name: 'Exportar CSV', exact: true }).isDisabled(),
                false
              );
              await page.screenshot({
                path: join(out, `report-inventory-empty-${width}-${theme}.png`),
                fullPage: true
              });
              const clearFiltersButton = page.getByRole('button', {
                name: 'Limpar filtros',
                exact: true
              });
              assert.equal(await clearFiltersButton.count(), 1);
              const clearedResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/reports/executions' &&
                  response.status() === 200
              );
              await clearFiltersButton.click();
              await clearedResponse;
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.locator('input[placeholder="SKU ou nome do produto"]').inputValue(), '');

              await search.fill('Falha');
              const failedLoad = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/reports/executions' &&
                  response.status() === 503
              );
              await filtersDisclosure.getByRole('button', { name: 'Aplicar', exact: true }).click();
              await failedLoad;
              await page
                .getByRole('heading', {
                  name: 'Não foi possível carregar o relatório',
                  exact: true
                })
                .waitFor();
              assert.equal(
                await page.getByRole('button', { name: 'Exportar CSV', exact: true }).isDisabled(),
                true
              );
              const retryLoad = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/reports/executions' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await retryLoad;
              await page.locator('tbody tr').first().waitFor();
              interactions.push({
                test: 'report-filled-empty-failed-and-retry',
                passed: true,
                filled: true,
                empty: true,
                failed: true,
                retry: true,
                source: 'server-execution'
              });
            }
            if (
              reportContinuity &&
              [
                '/reports/accounts-payable',
                '/reports/accounts-receivable',
                '/reports/advance-payments'
              ].includes(target)
            ) {
              const filtersDisclosure = page.locator('.report-filter-disclosure');
              await filtersDisclosure.locator('summary').click();
              const dateFrom = page.locator('input[type="date"]').nth(0);
              const dateTo = page.locator('input[type="date"]').nth(1);
              const initialRows = await page.locator('tbody tr').allTextContents();
              const initialExecutionId = await page
                .locator('.report-results')
                .getAttribute('data-execution-id');
              assert.ok(initialExecutionId, 'O relatório financeiro deve identificar a execução inicial');
              await dateFrom.fill('2026-09-01');
              await dateTo.fill('2026-09-07');
              const executionPostsBeforeApply = reportExecutionAttempts;
              const financialResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/reports/executions' &&
                  response.request().method() === 'POST' &&
                  response.status() === 200
              );
              await filtersDisclosure.getByRole('button', { name: 'Aplicar', exact: true }).click();
              const executionResponse = await financialResponse;
              const executionPayload = await executionResponse.json();
              const reportId = reportIdForTarget(target);
              assert.deepEqual(
                executionPayload.columns,
                reportFinancialColumns(reportId),
                'A execução financeira deve carregar o catálogo de colunas usado pela exportação'
              );
              await page.locator('tbody tr').first().waitFor();
              assert.equal(reportExecutionAttempts, executionPostsBeforeApply + 1);
              assert.equal(await dateFrom.inputValue(), '2026-09-01');
              assert.equal(await dateTo.inputValue(), '2026-09-07');
              const filteredRows = await page.locator('tbody tr').allTextContents();
              assert.deepEqual(filteredRows, initialRows);
              const displayedExecutionId = await page
                .locator('.report-results')
                .getAttribute('data-execution-id');
              assert.ok(displayedExecutionId);
              assert.notEqual(displayedExecutionId, initialExecutionId);
              const executionPostsBeforeExport = reportExecutionAttempts;
              const downloadPromise = page.waitForEvent('download');
              const exportResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname.endsWith('/export') &&
                  response.request().method() === 'POST' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
              const download = await downloadPromise;
              await exportResponse;
              assert.equal(lastReportExportExecutionId, displayedExecutionId);
              assert.equal(
                reportExecutionAttempts,
                executionPostsBeforeExport,
                'A exportação financeira não deve abrir uma segunda execução'
              );
              const downloadedCsvPath = await download.path();
              assert.ok(downloadedCsvPath);
              const downloadedCsvBuffer = readFileSync(downloadedCsvPath);
              const downloadedCsv = downloadedCsvBuffer.toString('utf8');
              const expectedCsv = renderSyntheticReportCsv(target);
              const csvHeader = reportFinancialColumns(reportId).map(({ label }) => label).join(',');
              assert.deepEqual(
                downloadedCsvBuffer,
                Buffer.from(expectedCsv, 'utf8'),
                'O download browser deve preservar todos os bytes do artefato server-side'
              );
              assert.equal(downloadedCsv.split('\n')[0], `\uFEFF${csvHeader}`);
              assert.equal(downloadedCsv.startsWith('\uFEFF'), true);
              assert.equal(downloadedCsv.includes('\r'), false);
              assert.equal(downloadedCsv.endsWith('\n'), false);
              if (target === '/reports/accounts-payable') {
                assert.match(downloadedCsv, /Distribuidora CVG,NF-2026-0042,Compras/);
                assert.match(await page.locator('tbody').innerText(), /Laboratório parceiro/);
              } else if (target === '/reports/accounts-receivable') {
                assert.match(downloadedCsv, /Paciente Financeiro,Tutor Financeiro,Canino/);
                assert.match(await page.locator('tbody').innerText(), /Tutor Financeiro/);
              } else {
                assert.match(downloadedCsv, /advance-1,Tutor Financeiro,123\.456\.789-00/);
                assert.match(await page.locator('tbody').innerText(), /Tutor Financeiro/);
              }
              const metrics = await page.evaluate(() => ({
                scrollY: window.scrollY,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth
              }));
              assert.equal(metrics.scrollY, 0);
              assert.ok(metrics.documentWidth <= metrics.viewportWidth + 2);
              await page.screenshot({
                path: join(
                  out,
                  `${target === '/reports/accounts-payable'
                    ? 'report-accounts-payable'
                    : target === '/reports/accounts-receivable'
                      ? 'report-accounts-receivable'
                      : 'report-advance-payments'}-${width}-${theme}.png`
                ),
                fullPage: true
              });
              interactions.push({
                test: 'financial-report-server-snapshot-and-export',
                passed: true,
                route: target,
                serverExecutionAfterFilter: displayedExecutionId,
                executionPostsBeforeExport,
                executionPostsAfterExport: reportExecutionAttempts,
                displayedRowsEqualServerSnapshot: true,
                exportUsesDisplayedExecution: true,
                csvDelimiter: 'comma',
                csvHeader,
                csvBytes: downloadedCsvBuffer.byteLength,
                utf8Bom: downloadedCsv.startsWith('\uFEFF'),
                noCarriageReturn: !downloadedCsv.includes('\r'),
                noFinalLineFeed: !downloadedCsv.endsWith('\n'),
                exactBytesMatch: true,
                serverColumns: executionPayload.columns,
                documentWidth: metrics.documentWidth,
                viewportWidth: metrics.viewportWidth
              });
            }
            if (accessControlContinuity && target === '/access-control') {
              const forbiddenAlert = page
                .getByRole('alert')
                .filter({ hasText: 'Sem permissão para governança de acesso' });
              await forbiddenAlert.waitFor();
              assert.equal(
                await page
                  .getByRole('button', {
                    name: 'Tentar novamente o carregamento de governança de acesso',
                    exact: true
                  })
                  .count(),
                1
              );
              assert.equal(
                await forbiddenAlert.evaluate((element) => document.activeElement === element),
                true
              );
              assert.equal(
                await page.getByText('Nenhum dado disponível.', { exact: true }).count(),
                0,
                'O estado 403 não deve apresentar um vazio contraditório'
              );
              const forbiddenMetrics = await page.evaluate(() => ({
                scrollY: window.scrollY,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth
              }));
              assert.equal(forbiddenMetrics.scrollY, 0);
              assert.ok(forbiddenMetrics.documentWidth <= forbiddenMetrics.viewportWidth + 2);
              const forbiddenScreenshot = `access-control-forbidden-${width}-${theme}.png`;
              await page.screenshot({ path: join(out, forbiddenScreenshot), fullPage: false });
              const accessControlA11yStates = [
                {
                  ...(await assertAccessControlA11y(page, target, 'forbidden')),
                  screenshot: forbiddenScreenshot,
                  ...forbiddenMetrics
                }
              ];
              await page
                .getByRole('button', {
                  name: 'Tentar novamente o carregamento de governança de acesso',
                  exact: true
                })
                .click();
              await page.getByRole('heading', { name: 'Mapa Vetus IAM', exact: true }).waitFor();
              const tabs = page.getByRole('tab');
              assert.equal(await tabs.count(), 5);
              const assertRovingTabs = async () => {
                const tabState = await tabs.evaluateAll((elements) =>
                  elements.map((element) => ({
                    selected: element.getAttribute('aria-selected') === 'true',
                    tabindex: element.getAttribute('tabindex')
                  }))
                );
                assert.equal(tabState.filter((tab) => tab.tabindex === '0').length, 1);
                assert.equal(tabState.filter((tab) => tab.selected && tab.tabindex === '0').length, 1);
                assert.equal(tabState.filter((tab) => !tab.selected && tab.tabindex === '-1').length, 4);
              };
              const captureAccessControlState = async (state) => {
                await page.evaluate(() => window.scrollTo(0, 0));
                const metrics = await page.evaluate(() => ({
                  scrollY: window.scrollY,
                  documentWidth: document.documentElement.scrollWidth,
                  viewportWidth: window.innerWidth,
                  selectedTab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? null
                }));
                assert.equal(metrics.scrollY, 0);
                assert.ok(
                  metrics.documentWidth <= metrics.viewportWidth + 2,
                  `Reflow horizontal inesperado em ${target}/${state}: ${metrics.documentWidth}px`
                );
                await assertRovingTabs();
                const screenshot = `access-control-${state}-${width}-${theme}.png`;
                await page.screenshot({ path: join(out, screenshot), fullPage: false });
                accessControlA11yStates.push({
                  ...(await assertAccessControlA11y(page, target, state)),
                  screenshot,
                  ...metrics
                });
              };
              await assertRovingTabs();
              await captureAccessControlState('summary');
              await tabs.first().focus();
              await page.keyboard.press('End');
              assert.equal(
                await page
                  .getByRole('tab', { name: 'Matriz', exact: true })
                  .evaluate((element) => document.activeElement === element),
                true
              );
              await assertRovingTabs();
              assert.equal(await page.locator('#access-panel-matrix').count(), 1);
              await page.getByRole('tab', { name: 'Usuários', exact: true }).click();
              await page.locator('#access-panel-users').waitFor();
              await captureAccessControlState('users');
              assert.equal(await page.locator('#access-user-select').count(), 1);
              assert.equal(await page.locator('fieldset').count(), 3);
              assert.equal(
                await page
                  .getByRole('button', { name: 'Salvar vínculos do usuário', exact: true })
                  .count(),
                1
              );
              await page.getByRole('tab', { name: 'Grupos', exact: true }).click();
              await page.locator('#access-panel-teams').waitFor();
              await captureAccessControlState('groups');
              assert.equal(
                await page
                  .getByRole('button', { name: 'Criar grupo de acesso', exact: true })
                  .count(),
                1
              );
              assert.equal(
                await page
                  .getByRole('button', { name: 'Editar Equipe Clínica', exact: true })
                  .count(),
                1
              );
              await page
                .getByRole('button', { name: 'Editar Equipe Clínica', exact: true })
                .click();
              await page.locator('#access-team-name').waitFor();
              assert.equal(
                await page.evaluate(() => document.activeElement?.id),
                'access-team-name'
              );
              await page
                .getByRole('button', { name: 'Cancelar edição do grupo de acesso', exact: true })
                .click();
              await page.getByRole('tab', { name: 'Setores', exact: true }).click();
              await page.locator('#access-panel-sectors').waitFor();
              await captureAccessControlState('sectors');
              assert.equal(
                await page.getByRole('button', { name: 'Criar setor', exact: true }).count(),
                1
              );
              assert.equal(
                await page.getByRole('button', { name: 'Editar Clínica', exact: true }).count(),
                1
              );
              await page.getByRole('tab', { name: 'Matriz', exact: true }).click();
              await page.locator('#access-panel-matrix').waitFor();
              await captureAccessControlState('matrix');
              assert.equal(await page.locator('#access-matrix-subject-type').count(), 1);
              assert.equal(await page.locator('select[aria-label^="Estado de"]').count(), 2);
              await page.getByRole('tab', { name: 'Resumo', exact: true }).click();
              await page.locator('#access-panel-summary').waitFor();
              assert.equal(await page.locator('.action-chip strong').count(), 6);
              assert.equal(await page.locator('.action-chip strong').filter({ hasText: 'Sim' }).count(), 3);
              assert.equal(await page.locator('.action-chip strong').filter({ hasText: 'Não' }).count(), 3);
              interactions.push({
                test: 'access-control-403-retry-tabs-forms-and-matrix',
                passed: true,
                forbiddenFocused: true,
                retry: true,
                tabsKeyboard: true,
                userMembershipFieldsets: 3,
                editFocus: true,
                matrixControls: 2,
                visibleMatrixActionStatuses: true,
                rovingTabindex: true,
                scrollYNormalized: accessControlA11yStates.every((state) => state.scrollY === 0),
                axeStates: accessControlA11yStates
              });
            }
            if (usersContinuity && target === '/users') {
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.locator('tbody tr').count(), usersFixture.length);
              assert.equal(await page.getByRole('heading', { name: 'Usuários', exact: true }).count(), 1);
              const search = page.getByRole('textbox', { name: 'Buscar usuário', exact: true });
              await search.fill('não-existe');
              await page
                .getByRole('heading', { name: 'Nenhum usuário corresponde aos filtros', exact: true })
                .waitFor();
              assert.equal(await page.getByRole('alert').count(), 0);
              assert.equal(await page.locator('[aria-live]').count(), 0);
              await page.screenshot({ path: join(out, `users-no-results-${width}-${theme}.png`), fullPage: false });

              await search.fill('');
              await page.locator('tbody tr').first().waitFor();
              const unavailableResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/users' &&
                  response.status() === 503
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await unavailableResponse;
              await page
                .getByRole('heading', { name: 'Serviço de usuários indisponível', exact: true })
                .waitFor();
              assert.equal(await page.locator('tbody tr').count(), usersFixture.length);
              assert.equal(await page.getByRole('alert').count(), 1);
              assert.equal(
                await page.getByRole('alert').getByText('Synthetic users backend detail', { exact: false }).count(),
                0
              );
              const retryResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/users' &&
                  response.status() === 200
              );
              await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
              await retryResponse;
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.locator('tbody tr').count(), usersFixture.length);

              const forbiddenResponse = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/users' &&
                  response.status() === 403
              );
              await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
              await forbiddenResponse;
              await page
                .getByRole('heading', { name: 'Acesso aos usuários negado', exact: true })
                .waitFor();
              assert.equal(await page.locator('tbody tr').count(), 0);
              assert.equal(await page.getByRole('alert').count(), 1);
              assert.equal(await page.getByRole('button', { name: 'Tentar novamente', exact: true }).count(), 0);
              assert.deepEqual(
                await page.locator('.overview-metric__value').allTextContents(),
                ['0', '0', '0', '0', '0']
              );
              assert.equal(
                await page.getByRole('alert').getByText('Synthetic permission detail', { exact: false }).count(),
                0
              );
              const metrics = await page.evaluate(() => ({
                scrollY: window.scrollY,
                documentWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth
              }));
              assert.equal(metrics.scrollY, 0);
              assert.ok(metrics.documentWidth <= metrics.viewportWidth + 2);
              await page.screenshot({ path: join(out, `users-forbidden-${width}-${theme}.png`), fullPage: false });
              interactions.push({
                test: 'users-data-table-state-matrix',
                passed: true,
                populated: true,
                noResults: true,
                unavailableKeepsRows: true,
                retry: true,
                forbiddenClearsRows: true,
                forbiddenNoRetry: true,
                serverDetailsHidden: true,
                scrollY: metrics.scrollY,
                documentWidth: metrics.documentWidth,
                viewportWidth: metrics.viewportWidth
              });
            }
            if (
              navigationContinuity &&
              target === '/users' &&
              width === 390 &&
              theme === 'light'
            ) {
              const table = page.locator('.table-wrapper[data-scroll-container="local"]');
              await table.waitFor();
              assert.equal(await table.getAttribute('aria-label'), 'Lista de usuários do sistema');
              assert.equal(await page.locator('tbody tr').count(), usersFixture.length);
              const tableDocumentRequests = [];
              page.on('request', (request) => {
                if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                  tableDocumentRequests.push(request.url());
                }
              });
              const initialLocalScroll = await table.evaluate((element) => {
                element.scrollLeft = 0;
                return element.scrollLeft;
              });
              assert.equal(initialLocalScroll, 0);
              await table.focus();
              assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-scroll-container')), 'local');
              await page.keyboard.press('ArrowRight');
              const keyboardArrowRightScroll = await table.evaluate((element) => element.scrollLeft);
              assert.ok(
                keyboardArrowRightScroll > 0,
                `Real DataTable ArrowRight must expose horizontal local scroll: ${keyboardArrowRightScroll}`
              );
              await page.keyboard.press('ArrowLeft');
              const keyboardArrowLeftScroll = await table.evaluate((element) => element.scrollLeft);
              assert.equal(keyboardArrowLeftScroll, 0);
              await page.keyboard.press('ArrowRight');
              const detailsLink = page
                .locator('a[href="/users/synthetic-user-admin"]')
                .first();
              await detailsLink.focus();
              assert.equal(
                await page.evaluate(() => document.activeElement?.getAttribute('href')),
                '/users/synthetic-user-admin'
              );
              const departureLocalScroll = await table.evaluate((element) => element.scrollLeft);
              assert.ok(departureLocalScroll > 0, 'Real DataTable must expose horizontal local scroll');
              await page.keyboard.press('Enter');
              await page.waitForURL('**/users/synthetic-user-admin');
              await page.getByRole('heading', { name: /Administradora Sintética/ }).waitFor();
              await page.goBack();
              await page.waitForURL('**/users');
              await table.waitFor();
              await page.locator('tbody tr').first().waitFor();
              await page.waitForTimeout(250);
              const returnedLocalScroll = await table.evaluate((element) => element.scrollLeft);
              const returnedFocus = await page.evaluate(() => ({
                connected: !!document.activeElement?.isConnected,
                href: document.activeElement?.getAttribute('href'),
                text: document.activeElement?.textContent?.trim()
              }));
              assert.equal(returnedFocus.connected, true);
              assert.equal(returnedFocus.href, '/users/synthetic-user-admin');
              assert.ok(
                Math.abs(returnedLocalScroll - departureLocalScroll) < 2,
                `Real DataTable history restoration mismatch: expected=${departureLocalScroll} returned=${JSON.stringify(await page.evaluate(() => ({
                  scrollLeft: document.querySelector('.table-wrapper[data-scroll-container="local"]')?.scrollLeft,
                  scrollWidth: document.querySelector('.table-wrapper[data-scroll-container="local"]')?.scrollWidth,
                  clientWidth: document.querySelector('.table-wrapper[data-scroll-container="local"]')?.clientWidth,
                  historyState: history.state,
                  activeElement: document.activeElement?.textContent?.trim()
                })))}`
              );
              assert.equal(tableDocumentRequests.length, 0);
              interactions.push({
                test: 'real-data-table-history-scroll-and-keyboard',
                passed: true,
                tableCaption: 'Lista de usuários do sistema',
                departureLocalScroll,
                returnedLocalScroll,
                keyboardArrowRightScroll,
                keyboardArrowLeftScroll,
                returnedFocus,
                clientNavigationFromRealTable: true,
                documentRequests: [...tableDocumentRequests]
              });
            }
            if (inventoryContinuity && target === '/inventory') {
              await page.locator('tbody tr').first().waitFor();
              assert.equal(await page.locator('tbody tr').count(), 3);
              assert.ok((await page.getByText('frasco 250 mL', { exact: false }).count()) >= 1);
              const selectAll = page.locator('[data-testid="inventory-select-all"]');
              assert.match(
                await selectAll.getAttribute('aria-label'),
                /consulta atual.*página atual/i
              );
              assert.equal(await selectAll.getAttribute('aria-checked'), 'false');
              const firstSelection = page.locator(
                '[data-testid="inventory-select-synthetic-inventory-low"]'
              );
              await firstSelection.check();
              assert.equal(
                await page.getByTestId('selected-count').innerText(),
                '1 item selecionado'
              );
              assert.equal(await selectAll.getAttribute('aria-checked'), 'mixed');
              await selectAll.check();
              assert.equal(
                await page.getByTestId('selected-count').innerText(),
                '3 itens selecionados'
              );
              assert.equal(await selectAll.getAttribute('aria-checked'), 'true');
              await selectAll.uncheck();
              assert.equal(
                await page.getByTestId('selected-count').innerText(),
                '0 itens selecionados'
              );

              await firstSelection.check();
              const filtered = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inventory' &&
                  response.status() === 200 &&
                  new URL(response.url()).searchParams.get('q') === 'Gaze'
              );
              await page.getByRole('searchbox', { name: 'Buscar item', exact: true }).fill('Gaze');
              await page.getByRole('button', { name: 'Buscar', exact: true }).click();
              await filtered;
              await page
                .getByTestId('selection-scope')
                .getByText('Gaze', { exact: false })
                .waitFor();
              assert.equal(
                await page.getByTestId('selected-count').innerText(),
                '0 itens selecionados'
              );
              assert.equal(
                await page.locator('input[data-testid^="inventory-select-"]:checked').count(),
                0
              );
              await page.screenshot({
                path: join(out, `inventory-selection-filtered-${width}-${theme}.png`),
                fullPage: false
              });
              interactions.push({
                test: 'inventory-page-selection-scope-and-filter-reset',
                passed: true,
                selectedCurrentPage: true,
                mixedState: true,
                selectionClearedOnFilter: true,
                hiddenRowsActionable: false,
                criticalUnitsVisible: ['ampola', 'frasco 250 mL']
              });
            }
            if (inventoryContinuity && target === '/inventory/purchases') {
              await page.getByText('Dipirona Injetável', { exact: true }).first().waitFor();
              assert.ok((await page.getByText('Rascunho', { exact: true }).count()) >= 1);
              assert.ok((await page.getByText('ampola', { exact: false }).count()) >= 1);
              assert.ok((await page.getByText('frasco 250 mL', { exact: false }).count()) >= 1);
              const preparation = page.locator('.preparation-panel');
              await preparation.locator('summary').click();
              await page
                .locator('[data-testid="purchase-product"]')
                .selectOption('synthetic-inventory-low');
              await page.locator('[data-testid="purchase-supplier"]').fill('Fornecedor Sintético');
              await page
                .locator('[data-testid="purchase-notes"]')
                .fill('Conferir lote antes de receber');
              await preparation
                .locator('form')
                .getByRole('button', { name: 'Preparar rascunho', exact: true })
                .click();
              await page.getByText('Rascunho temporário de compra:', { exact: false }).waitFor();
              assert.equal(
                await page
                  .getByText('Será perdido ao sair ou recarregar. Estoque não alterado.', {
                    exact: true
                  })
                  .count(),
                1
              );
              await page.screenshot({
                path: join(out, `inventory-purchases-draft-${width}-${theme}.png`),
                fullPage: false
              });

              const filterPanel = page.locator('.filter-panel');
              await filterPanel.locator('summary').click();
              await filterPanel.locator('input').nth(1).fill('Gaze');
              const filteredInventory = page.waitForResponse(
                (response) =>
                  new URL(response.url()).pathname === '/api/inventory' && response.status() === 200
              );
              await filterPanel
                .locator('form')
                .getByRole('button', { name: 'Pesquisar', exact: true })
                .click();
              await filteredInventory;
              await page.getByText('Gaze Estéril', { exact: true }).first().waitFor();
              assert.equal(
                await page
                  .locator('tbody')
                  .getByText('Dipirona Injetável', { exact: true })
                  .count(),
                0
              );
              assert.ok((await page.getByText('pacote', { exact: false }).count()) >= 1);
              interactions.push({
                test: 'inventory-purchases-draft-filter-unit',
                passed: true,
                draftIsExplicitlyTemporary: true,
                stockMutation: false,
                filterScope: 'product',
                unitsVisible: ['ampola', 'frasco 250 mL', 'pacote']
              });
            }
            if ((navigationContinuity || ownerFormProgressive) && target === '/owners/new') {
              assert.equal(await page.locator('details.owner-section[open]').count(), 2);
              const contactGroup = page.locator('.contact-fields');
              assert.equal(await contactGroup.getAttribute('role'), 'group');
              assert.equal(await contactGroup.getAttribute('aria-required'), 'true');
              assert.equal(
                await contactGroup.getAttribute('aria-describedby'),
                'owner-contact-hint'
              );
              await page.getByRole('button', { name: 'Cadastrar tutor', exact: true }).click();
              await page.locator('#owner-form-error-summary').waitFor();
              assert.equal(await page.locator('#owner-form-error-summary a').count(), 2);
              assert.equal(await page.locator('#fullName').getAttribute('aria-invalid'), 'true');
              assert.equal(await page.locator('#phone1').getAttribute('aria-invalid'), 'true');
              assert.equal(
                await contactGroup.getAttribute('aria-describedby'),
                'owner-contact-hint owner-contact-error'
              );
              assert.equal(
                await page.locator('#phone1').getAttribute('aria-describedby'),
                'owner-contact-hint owner-contact-error'
              );
              assert.equal(
                await page.locator('#owner-contact-error').getAttribute('role'),
                'alert'
              );
              assert.equal(await page.evaluate(() => document.activeElement?.id), 'fullName');
              const contactSection = page.locator('details.owner-section').nth(1);
              await contactSection.locator('summary').click();
              assert.equal(await contactSection.getAttribute('open'), null);
              await page.locator('#owner-form-error-summary a[href="#phone1"]').click();
              await page.waitForFunction(() => {
                const sections = document.querySelectorAll('details.owner-section');
                return sections[1]?.open === true && document.activeElement?.id === 'phone1';
              });
              await page.screenshot({
                path: join(out, `owner-form-invalid-${width}-${theme}.png`),
                fullPage: true
              });
              interactions.push({
                test: 'owner-progressive-invalid-summary-and-focus',
                passed: true,
                openSections: 2,
                errorCount: 2,
                collapsedContactValidationReopened: true,
                focusedFieldAfterReopen: 'phone1'
              });
              await page.locator('#fullName').fill('Pessoa progressiva');
              await page.locator('#phone1').fill('1100000000');
              await page.locator('details.owner-section').nth(2).locator('summary').click();
              assert.equal(await page.locator('#fullName').inputValue(), 'Pessoa progressiva');
              assert.equal(await page.locator('#phone1').inputValue(), '1100000000');
              assert.equal(
                await page
                  .locator('.form-actions')
                  .evaluate((element) => getComputedStyle(element).position),
                'sticky'
              );
              interactions.push({
                test: 'owner-progressive-sections-preserve-input-and-sticky-actions',
                passed: true,
                preserved: ['fullName', 'phone1']
              });
                if (navigationContinuity) {
                  await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
                  await page.locator('#fullName').waitFor();
                  const documents = [];
                page.on('request', (request) => {
                  if (request.isNavigationRequest() && request.frame() === page.mainFrame())
                    documents.push(request.url());
                });
                const cancel = page.getByRole('link', { name: 'Cancelar', exact: true }).last();
                await cancel.scrollIntoViewIfNeeded();
                const departureY = await page.evaluate(() => scrollY);
                assert.ok(departureY > 100, 'History test must exercise a scrolled page');
                const departureHistoryState = await page.evaluate(() => history.state);
                await cancel.press('Enter');
                await page.waitForURL('**/owners');
                await page.waitForFunction(() =>
                  document.activeElement?.matches(
                    '.workspace__body h1, .workspace__body[tabindex="-1"]'
                  )
                );
                assert.equal(await page.evaluate(() => scrollY), 0);
                await page.goBack();
                await page.waitForURL('**/owners/new');
                await page.locator('#fullName').waitFor();
                await page.waitForFunction(
                  () =>
                    document.activeElement?.matches('.workspace__body a') &&
                    document.activeElement.textContent.trim() === 'Cancelar'
                );
                const returnedScrollState = await page.evaluate(() => ({
                  scrollY,
                  documentScrollTop: document.documentElement.scrollTop,
                  bodyScrollTop: document.body.scrollTop,
                  scrollHeight: document.documentElement.scrollHeight,
                  innerHeight,
                  historyState: history.state
                }));
                assert.ok(
                  Math.abs(returnedScrollState.scrollY - departureY) < 2,
                  `Router history restoration must preserve the departure coordinate: departure=${departureY} returned=${JSON.stringify(returnedScrollState)} before=${JSON.stringify(departureHistoryState)}`
                );
                assert.equal(returnedScrollState.historyState?.scroll?.top, departureY);
                const restoredFocusBox = await page.evaluate(() => {
                  const r = document.activeElement.getBoundingClientRect();
                  return { top: r.top, bottom: r.bottom };
                });
                assert.ok(
                  restoredFocusBox.top >= 0 && restoredFocusBox.bottom <= height,
                  'Restored focus must remain visible at restored scroll'
                );
                assert.equal(documents.length, 0);
                interactions.push({
                  test: 'native-history-scroll-and-route-focus',
                  passed: true,
                  departureY,
                  returnedY: returnedScrollState.scrollY,
                  routerSavedScrollTop: returnedScrollState.historyState?.scroll?.top,
                  returnedFocus: await page.evaluate(() =>
                    document.activeElement?.textContent.trim()
                  ),
                  keyboardActivated: true,
                  documentRequests: [...documents]
                });
              }
            }
            if (
              navigationContinuity &&
              target === '/owners/new' &&
              width === 1440 &&
              theme === 'light'
            ) {
              await page.locator('#fullName').fill('Pessoa Sintética Continuidade');
              await page.locator('#phone1').fill('1100000000');
              const documentRequests = [];
              page.on('request', (request) => {
                if (request.isNavigationRequest() && request.frame() === page.mainFrame())
                  documentRequests.push(request.url());
              });
              const agendaLink = page
                .locator('.sidebar__link')
                .filter({ hasText: 'Agenda' })
                .first();
              const titleBeforeLeave = await page.title();
              await agendaLink.click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              assert.equal(new URL(page.url()).pathname, '/owners/new');
              await page.screenshot({ path: join(out, 'owner-dirty-modal.png') });
              await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
              assert.equal(await page.title(), titleBeforeLeave);
              assert.equal(
                await page.locator('#fullName').inputValue(),
                'Pessoa Sintética Continuidade'
              );
              assert.equal(await page.locator('#phone1').inputValue(), '1100000000');
              assert.equal(
                await page.evaluate(() => document.activeElement?.getAttribute('href')),
                '/appointments'
              );
              interactions.push({
                test: 'dirty-sidebar-continue',
                passed: true,
                preserved: ['fullName', 'phone1'],
                dialogFocusRestored: true
              });
              await agendaLink.click();
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/appointments');
              assert.equal(documentRequests.length, 0);
              interactions.push({
                test: 'dirty-sidebar-discard',
                passed: true,
                documentRequests: [...documentRequests]
              });
              await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
              assert.equal(await page.locator('#fullName').inputValue(), '');
              documentRequests.length = 0;
              await page.getByRole('link', { name: 'Cancelar', exact: true }).first().click();
              await page.waitForURL('**/owners');
              await page.waitForLoadState('networkidle');
              assert.equal(documentRequests.length, 0);
              interactions.push({
                test: 'clean-cancel-client-navigation',
                passed: true,
                documentRequests: [...documentRequests]
              });

              await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
              const terminalReturnControl = page.getByRole('link', { name: 'Cancelar', exact: true }).last();
              await terminalReturnControl.focus();
              await terminalReturnControl.click();
              await page.waitForURL('**/owners');
              await page.evaluate(() => new Promise((resolve, reject) => {
                const timeout = window.setTimeout(() => {
                  observer.disconnect();
                  reject(new Error('Timed out waiting for the terminal return state fixture'));
                }, 5000);
                const observer = new MutationObserver(() => {
                  const body = document.querySelector('.workspace__body');
                  const target = [...(body?.querySelectorAll('a') ?? [])]
                    .find((element) => element.textContent?.trim() === 'Cancelar');
                  if (!body || !target) return;
                  target.remove();
                  const state = document.createElement('p');
                  state.className = 'state-message';
                  state.textContent = 'Nenhum resultado encontrado.';
                  body.append(state);
                  observer.disconnect();
                  window.clearTimeout(timeout);
                  resolve();
                });
                observer.observe(document.body, { subtree: true, childList: true });
                history.back();
              }));
              await page.waitForURL('**/owners/new');
              await page.waitForFunction(() =>
                document.activeElement?.matches('.workspace__body h1, .workspace__body[tabindex="-1"]')
              );
              assert.equal(await page.locator('.workspace__body .state-message').count(), 1);
              interactions.push({
                test: 'missing-return-control-terminal-state-fallback',
                passed: true,
                terminalState: 'empty',
                focusedFallback: await page.evaluate(() => document.activeElement?.textContent?.trim()),
                targetRemoved: true
              });

              await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
              const loadingReturnControl = page.getByRole('link', { name: 'Cancelar', exact: true }).last();
              await loadingReturnControl.focus();
              await loadingReturnControl.click();
              await page.waitForURL('**/owners');
              const loadingStartedAt = Date.now();
              await page.evaluate(() => new Promise((resolve, reject) => {
                const timeout = window.setTimeout(() => {
                  observer.disconnect();
                  reject(new Error('Timed out waiting for the loading return state fixture'));
                }, 5000);
                const observer = new MutationObserver(() => {
                  const body = document.querySelector('.workspace__body');
                  const target = [...(body?.querySelectorAll('a') ?? [])]
                    .find((element) => element.textContent?.trim() === 'Cancelar');
                  if (!body || !target) return;
                  target.remove();
                  body.setAttribute('aria-busy', 'true');
                  observer.disconnect();
                  window.clearTimeout(timeout);
                  resolve();
                });
                observer.observe(document.body, { subtree: true, childList: true });
                history.back();
              }));
              await page.waitForURL('**/owners/new');
              await page.waitForFunction(() =>
                document.activeElement?.matches('.workspace__body h1, .workspace__body[tabindex="-1"]')
              );
              const fallbackAfterMs = Date.now() - loadingStartedAt;
              assert.ok(
                fallbackAfterMs >= 1000 && fallbackAfterMs <= 1800,
                `Loading fallback must resolve within the 1 s bounded window plus one frame (observed ${fallbackAfterMs} ms)`
              );
              interactions.push({
                test: 'stuck-loading-return-control-bounded-fallback',
                passed: true,
                fallbackAfterMs,
                bodyRemainsBusy: await page.locator('.workspace__body').getAttribute('aria-busy') === 'true'
              });
            }
            if (navigationContinuity && target === '/owners/new') {
              await page.goto(`${origin}/owners/new`, { waitUntil: 'networkidle' });
              await page.locator('#fullName').fill('Rascunho antes de sair');
              const sessionLabel = await page.locator('.topbar__profile').innerText();
              await page.getByRole('button', { name: 'Sair do sistema', exact: true }).click();
              await page.getByRole('dialog', { name: 'Alterações não salvas' }).waitFor();
              await page.getByRole('button', { name: 'Continuar editando', exact: true }).click();
              assert.equal(new URL(page.url()).pathname, '/owners/new');
              assert.equal(await page.locator('#fullName').inputValue(), 'Rascunho antes de sair');
              assert.equal(await page.locator('.topbar__profile').innerText(), sessionLabel);
              await page.getByRole('button', { name: 'Sair do sistema', exact: true }).click();
              await page.getByRole('button', { name: 'Descartar e sair', exact: true }).click();
              await page.waitForURL('**/login');
              await page.locator('#email').waitFor();
              assert.equal(await page.locator('#fullName').count(), 0);
              assert.equal(
                await page.getByRole('dialog', { name: 'Alterações não salvas' }).count(),
                0
              );
              interactions.push({
                test: 'logout-keeps-session-until-consent',
                passed: true,
                width,
                theme
              });
              const shareableDeepLink = `${origin}/owners/new?continuity=shareable`;
              await page.goto(shareableDeepLink, { waitUntil: 'networkidle' });
              await page.reload({ waitUntil: 'networkidle' });
              await page.locator('#fullName').waitFor();
              assert.equal(new URL(page.url()).pathname, '/owners/new');
              assert.equal(new URL(page.url()).searchParams.get('continuity'), 'shareable');
              assert.equal(await page.getByRole('heading', { name: 'Cadastrar Novo Tutor', exact: true }).count(), 1);
              interactions.push({
                test: 'shareable-deep-link-reload',
                passed: true,
                path: '/owners/new',
                queryPreserved: true,
                headingCount: 1
              });

              const permissionDocumentRequests = [];
              page.on('request', (request) => {
                if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                  permissionDocumentRequests.push(request.url());
                }
              });
              await page.goto(`${origin}/owners/new?permission=revoked`, { waitUntil: 'networkidle' });
              await page.waitForURL((url) => url.pathname === '/');
              assert.equal(await page.getByRole('link', { name: 'Cancelar', exact: true }).count(), 0);
              assert.ok(permissionDocumentRequests.length >= 1);
              interactions.push({
                test: 'permission-change-does-not-restore-access',
                passed: true,
                redirectedPath: new URL(page.url()).pathname,
                staleControlCount: 0,
                documentRequests: [...permissionDocumentRequests]
              });
            }
            if (target === '/quotes') {
              const searchInput = page.getByPlaceholder(
                'Buscar por ID, cliente, data, número ou observação'
              );
              const oldRequest = page.waitForRequest(
                (request) => new URL(request.url()).searchParams.get('search') === 'old'
              );
              await searchInput.fill('old');
              await oldRequest;
              assert.equal(await searchInput.inputValue(), 'old');
              await searchInput.fill('current');
              await page.locator('tbody').getByText('CURRENT-RESULT', { exact: true }).waitFor();
              assert.equal(typeof releaseOldQuote, 'function');
              const oldResponse = page.waitForResponse(
                (response) => new URL(response.url()).searchParams.get('search') === 'old'
              );
              releaseOldQuote();
              await oldResponse;
              await page.waitForLoadState('networkidle');
              await page.evaluate(
                () =>
                  new Promise((resolveFrame) =>
                    requestAnimationFrame(() => requestAnimationFrame(resolveFrame))
                  )
              );
              assert.equal(
                await page.locator('tbody').getByText('OLD-RESULT', { exact: true }).count(),
                0
              );
              assert.equal(
                await page.locator('tbody').getByText('CURRENT-RESULT', { exact: true }).count(),
                1
              );
              assert.equal(await searchInput.inputValue(), 'current');
              interactions.push({
                test: 'quotes-filter-old-after-current',
                passed: true,
                current: 'CURRENT-RESULT',
                discarded: 'OLD-RESULT'
              });
              await page.screenshot({
                path: join(out, 'quotes-latest-response.png'),
                fullPage: true
              });
            }
            assert.deepEqual(errors, [], 'Unexpected browser page errors');
            rows.push({ target, theme, ...measure, stem, errors, requests, interactions });
          } catch (error) {
            failures.push({
              target,
              theme,
              width,
              interactions,
              errors,
              requests,
              error: String(error.stack ?? error)
            });
            await page
              .screenshot({
                path: join(out, `${target.replaceAll('/', '_')}-${width}-${theme}-failure.png`),
                fullPage: true
              })
              .catch(() => {});
          }
          await context.close();
          if (successRedirectContinuity && page.video()) {
            recordedVideos.push(await page.video().path());
          }
        }
  } finally {
    await browser?.close();
    child.send('close');
    await new Promise((resolveExit) => {
      const timeout = setTimeout(() => child.kill('SIGTERM'), 10000);
      child.once('exit', () => {
        clearTimeout(timeout);
        resolveExit();
      });
    });
    writeFileSync(join(out, 'server.log'), serverLog);
  }

  const after = pin();
  const interactionIds = [
    ...new Set(rows.flatMap((row) => row.interactions.map((interaction) => interaction.test)))
  ].sort();
  const viewportLimitation = successRedirectContinuity
    ? `DPR1 em 1440x900, 390x844 e viewport CSS equivalente a 200% (195x422), claro/escuro, com ${reducedMotionContinuity ? 'prefers-reduced-motion' : 'movimento padrão'}; vídeos WebM gravados por contexto e trace de requestAnimationFrame/route push. O viewport reduzido é proxy de reflow, não prova de zoom nativo, teclado virtual ou dispositivo físico.`
    : accessibilityContinuity
    ? 'DPR1 nos viewports 320, 375, 390, 768, 1024, 1280 e 1440, claro/escuro, com prefers-reduced-motion.'
    : formZoomProxy && (patientBrowserContinuity || ownerFormProgressive)
      ? 'DPR1 em 1440x900, 390x844 e viewport CSS equivalente a 200% (195x422), claro/escuro, com movimento padrão; o viewport reduzido é um proxy de reflow e não uma prova de zoom nativo, teclado virtual ou dispositivo físico.'
    : agendaContext
      ? 'DPR1 em 1440x900, 768x900 e 390x844, claro/escuro, com movimento padrão.'
      : 'DPR1 em 1440x900 e 390x844, claro/escuro, com movimento padrão.';
  const report = {
    scope: 'Read-only current frontend visual audit, synthetic responses and no backend claim',
    generatedAt: new Date().toISOString(),
    before,
    after,
    inputsStable: JSON.stringify(before) === JSON.stringify(after),
    rows,
    failures,
    recordedVideos,
    interactionIds,
    harnessPath: 'docs/frontend/implementation/browser-continuity.mjs',
    harnessSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
    limitations: [
      'Real SPA routes with synthetic auth, scheduling, quotes, owner, patient, laboratory, inpatient, cash, inventory, report, medical-record/attachment and PIX-attempt responses; no backend, RLS, persistence or UAT claim.',
      'Read-only source inspection; no CSS injection, code mutation, baseline update or snapshot promotion; all API responses are synthetic fixtures, including the populated agenda/species/laboratory cases, the controlled quotes race, the attachment URL confirmation, the PIX 202/polling sequence and the cash-receipt reversal sequence.',
      `${viewportLimitation} Somente os IDs de interação registrados neste relatório foram executados; esta invocação não cobre todas as rotas.`,
      'Vite development server, synthetic data, Chromium, desktop host and current date; not a production performance baseline or field INP evidence.',
      'No participant study: five priority-task completion rates, elapsed times, errors and shift-work observations remain unmeasured.',
      `Executed interaction IDs: ${interactionIds.join(', ') || 'none'}.`
    ]
  };
  writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        out,
        failures: failures.length,
        inputsStable: report.inputsStable,
        rows: rows.map(
          ({ target, theme, viewport, documentWidth, documentHeight, errors, interactions }) => ({
            target,
            theme,
            viewport,
            documentWidth,
            documentHeight,
            errors,
            interactions
          })
        )
      },
      null,
      2
    )
  );
  if (failures.length || !report.inputsStable) process.exitCode = 1;
}

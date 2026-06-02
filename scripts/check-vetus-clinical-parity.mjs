import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function file(path) {
  const absolutePath = resolve(root, path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

function has(path, pattern) {
  const contents = file(path);
  return typeof pattern === 'string' ? contents.includes(pattern) : pattern.test(contents);
}

const checks = [
  {
    area: 'Fluxo de atendimento',
    target: 95,
    items: [
      ['Campos operacionais persistidos na fila', has('packages/shared/types/src/index.ts', 'currentResponsibleStaffId')],
      ['Historico de transferencias da esteira', has('packages/db/migrations/0055_scheduling_queue_operational_fields.sql', 'scheduling_queue_transfers')],
      ['API de encaminhar esteira', has('apps/api/src/routes/scheduling-routes.ts', '/transfer')],
      ['Handoff com pendencias estruturadas', has('packages/modules/encounters/src/index.ts', 'markPending')],
      ['Bloqueio de financeiro por pendencia', has('packages/modules/encounters/src/index.ts', 'blockingIssues')],
      ['Envio ao financeiro auditavel', has('packages/modules/encounters/src/index.ts', 'handoff_sent_to_finance')],
      ['Inbox/SPA reconhece estados completos', has('apps/spa/src/types/clinicalHandoff.ts', 'sent_to_finance')]
    ]
  },
  {
    area: 'Prontuario',
    target: 95,
    items: [
      ['Cockpit do animal como superficie primaria', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'Cockpit 360 do paciente')],
      ['Drawers/acoes de anamnese no animal', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'Adicionar anamnese')],
      ['Timeline longitudinal unificada', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'Timeline 360 unificada')],
      ['Entradas clinicas reais via medicalRecordsService', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'medicalRecordsService.createEntry')],
      ['Alertas clinicos persistidos visiveis', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'patient-risk-strip')],
      ['Historico clinico editavel no cockpit', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'saveClinicalHistory')]
    ]
  },
  {
    area: 'Receituario',
    target: 95,
    items: [
      ['Modelo documental de receita', has('packages/modules/prescriptions/src/index.ts', 'PrescriptionDocument')],
      ['Renderizacao imprimivel', has('packages/modules/prescriptions/src/index.ts', 'renderDocument')],
      ['Acao Ver Receita no cockpit', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'Ver Receita')],
      ['Acao Imprimir no cockpit', has('apps/spa/src/pages/patients/PatientDetailPage.vue', 'printPrescriptionDocument')],
      ['Edicao versionada com motivo', has('packages/modules/prescriptions/src/index.ts', "requireNonEmptyString(payload.reason, 'reason')")],
      ['Arquivamento/cancelamento auditavel', has('packages/modules/prescriptions/src/index.ts', 'deleteReason')],
      ['API de documento de receita', has('apps/api/src/routes/prescription-routes.ts', '/document')]
    ]
  }
];

let failed = false;
console.log('# Vetus Clinical Parity Matrix');
console.log('| Indicador | Score | Evidencias | Faltantes |');
console.log('| --- | ---: | --- | --- |');

for (const check of checks) {
  const passed = check.items.filter(([, ok]) => ok);
  const missing = check.items.filter(([, ok]) => !ok).map(([label]) => label);
  const score = Math.round((passed.length / check.items.length) * 100);
  if (score < check.target) failed = true;
  console.log(
    `| ${check.area} | ${score}/100 | ${passed.map(([label]) => label).join('; ')} | ${missing.join('; ') || '-'} |`
  );
}

if (failed) {
  console.error('Clinical parity abaixo de 95/100 em pelo menos um indicador.');
  process.exit(1);
}

console.log('Clinical parity >= 95/100 em atendimento, prontuario e receituario.');

import { expect, it } from 'vitest';
import { AccessReviewControlService, DisasterRecoveryControlService, IncidentResponseControlService, MfaControlService, VulnerabilityControlService, calculateSecurityScore } from './controls.service.js';
import { collectEvidence } from './evidence-collector.js';

it('does not convert simulated scanner and unexecuted DR into operational assurance', async () => {
  const mfa = new MfaControlService();
  const vulnerability = new VulnerabilityControlService();
  const access = new AccessReviewControlService();
  const dr = new DisasterRecoveryControlService();
  const incident = new IncidentResponseControlService();
  const before = await calculateSecurityScore(mfa, vulnerability, access, dr);
  const scan = await vulnerability.runScan(['database']);
  const failover = await dr.conductFailoverTest();
  const recovery = await dr.conductRecoveryTest();
  expect(failover.status).toBe('not_verified');
  expect(recovery.status).toBe('not_verified');
  expect(failover.duration).toBeNull();
  expect(failover.conductedAt).toBeNull();
  expect(scan.every(item => item.provenance === 'simulated')).toBe(true);
  expect(dr.isTestOverdue()).toBe(true);
  expect(vulnerability.isScanOverdue()).toBe(true);
  const after = await calculateSecurityScore(mfa, vulnerability, access, dr);
  expect(after).toEqual(before);
  expect(after.overall).toBe(0);
  const evidence = await collectEvidence('2026-01-01', '2026-12-31', { mfa, vulnerability, access, dr, incident });
  expect(evidence.summary.controlsPassing).toBe(0);
  expect(evidence.summary.coveragePercent).toBe(0);
  expect(evidence.summary.lastDrTest).toBeNull();
  expect(evidence.summary.lastVulnerabilityScan).toBeNull();
  expect(evidence.trustServiceCriteria.every(item => item.overallStatus !== 'pass')).toBe(true);
});

it('preserves adverse local records without manufacturing passing controls', async () => {
  const controls = { mfa: new MfaControlService(), vulnerability: new VulnerabilityControlService(), access: new AccessReviewControlService(), dr: new DisasterRecoveryControlService(), incident: new IncidentResponseControlService() };
  await controls.access.createReview('pending-user', 'user@example.com', ['admin'], null);
  const incident = await controls.incident.createIncident({ severity: 'critical', title: 'Reported outage', description: 'Operator report' });
  const evidence = await collectEvidence('2026-01-01', '2026-12-31', controls);
  const cc72 = evidence.trustServiceCriteria.find(item => item.criterion === 'CC7.2')!;
  expect(cc72.overallStatus).toBe('fail');
  expect(cc72.controls[2].provenance).toBe('local_record');
  expect(cc72.controls[2].findings.join(' ')).toContain(incident.id);
  expect(evidence.summary.controlsAtRisk).toBe(1);
  expect(evidence.summary.openIncidents).toBe(1);
  expect(evidence.summary.controlsPassing).toBe(0);
  expect(evidence.summary.controlsNotTested + evidence.summary.controlsAtRisk + evidence.summary.controlsFailing).toBe(evidence.summary.totalControls);
});

it('does not expose mutable DR history that could promote an unexecuted request', async () => {
  const dr = new DisasterRecoveryControlService();
  const result = await dr.conductFailoverTest();
  result.status = 'passed';
  dr.getTestHistory()[0].status = 'passed';
  expect((await dr.getLastTest())?.status).toBe('not_verified');
});

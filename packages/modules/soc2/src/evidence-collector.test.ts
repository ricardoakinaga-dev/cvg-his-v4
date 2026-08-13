import { describe, expect, it } from 'vitest';

import {
  AccessReviewControlService,
  DisasterRecoveryControlService,
  IncidentResponseControlService,
  MfaControlService,
  VulnerabilityControlService
} from './controls.service.js';
import { collectEvidence } from './evidence-collector.js';

function createControls(mfaConfig: ConstructorParameters<typeof MfaControlService>[0] = {}) {
  return {
    mfa: new MfaControlService(mfaConfig),
    vulnerability: new VulnerabilityControlService(),
    access: new AccessReviewControlService(),
    dr: new DisasterRecoveryControlService(),
    incident: new IncidentResponseControlService()
  };
}

function criterion(
  evidence: Awaited<ReturnType<typeof collectEvidence>>,
  id: string
) {
  const result = evidence.trustServiceCriteria.find((item) => item.criterion === id);
  if (!result) throw new Error(`Missing criterion ${id}`);
  return result;
}

describe('SOC2 evidence collector', () => {
  it('reports missing scans and disaster-recovery exercises as risk instead of passing them', async () => {
    const controls = createControls({ failedLoginLockoutAttempts: 0 });
    const evidence = await collectEvidence('2026-07-01', '2026-07-31', controls);

    expect(evidence.periodStart).toBe('2026-07-01');
    expect(evidence.periodEnd).toBe('2026-07-31');
    expect(evidence.trustServiceCriteria).toHaveLength(6);
    expect(criterion(evidence, 'CC6.2').controls).toContainEqual(
      expect.objectContaining({ id: 'CC6.2-03', status: 'fail' })
    );
    expect(criterion(evidence, 'CC3.1')).toMatchObject({ overallStatus: 'at_risk' });
    expect(criterion(evidence, 'CC7.1')).toMatchObject({ overallStatus: 'at_risk' });
    expect(evidence.summary).toMatchObject({
      totalControls: 18,
      evidenceItems: 18,
      lastVulnerabilityScan: null,
      lastDrTest: null,
      openIncidents: 0,
      staleAccessUsers: 0
    });
    expect(evidence.securityScore.criticalGaps).toEqual(
      expect.arrayContaining(['Vulnerability scan overdue', 'DR test overdue'])
    );
  });

  it('propagates critical vulnerabilities, stale access and critical incidents into findings', async () => {
    const controls = createControls();
    const vulnerabilities = await controls.vulnerability.runScan(['database']);
    expect(vulnerabilities.some((item) => item.severity === 'critical')).toBe(true);

    const staleLogin = new Date();
    staleLogin.setUTCDate(staleLogin.getUTCDate() - 120);
    await controls.access.createReview(
      'stale-user',
      'stale@example.com',
      ['admin'],
      staleLogin.toISOString()
    );
    await controls.access.approveAccess('stale-user', 'security-reviewer');
    await controls.access.createReview(
      'pending-user',
      'pending@example.com',
      ['auditor'],
      new Date().toISOString()
    );
    await controls.incident.createIncident({
      severity: 'critical',
      title: 'Critical integration incident',
      description: 'Evidence collector critical path'
    });

    const evidence = await collectEvidence('2026-08-01', '2026-08-12', controls);

    expect(criterion(evidence, 'CC3.1')).toMatchObject({ overallStatus: 'fail' });
    expect(criterion(evidence, 'CC5.1')).toMatchObject({ overallStatus: 'at_risk' });
    expect(criterion(evidence, 'CC7.2')).toMatchObject({ overallStatus: 'fail' });
    expect(evidence.summary.lastVulnerabilityScan).toEqual(expect.any(String));
    expect(evidence.summary.openIncidents).toBe(1);
    expect(evidence.summary.staleAccessUsers).toBe(1);
    expect(evidence.summary.controlsFailing).toBeGreaterThan(0);
    expect(evidence.securityScore.criticalGaps).toContain('1 critical vulnerabilities open');
  });

  it('distinguishes high risk from critical failure after current scan and DR evidence', async () => {
    const controls = createControls();
    await controls.vulnerability.runScan(['api']);
    const drTest = await controls.dr.conductRecoveryTest();
    await controls.incident.createIncident({
      severity: 'high',
      title: 'High integration incident',
      description: 'Evidence collector at-risk path'
    });

    const evidence = await collectEvidence('2026-08-01', '2026-08-12', controls);

    expect(criterion(evidence, 'CC3.1')).toMatchObject({ overallStatus: 'at_risk' });
    expect(criterion(evidence, 'CC7.1')).toMatchObject({ overallStatus: 'pass' });
    expect(criterion(evidence, 'CC7.1').controls).toContainEqual(
      expect.objectContaining({ id: 'CC7.1-02', status: 'pass' })
    );
    expect(criterion(evidence, 'CC7.2')).toMatchObject({ overallStatus: 'at_risk' });
    expect(criterion(evidence, 'CC8.1')).toMatchObject({ overallStatus: 'pass' });
    expect(evidence.summary.lastDrTest).toBe(drTest.conductedAt);
    expect(evidence.summary.coveragePercent).toBeGreaterThan(0);
  });
});

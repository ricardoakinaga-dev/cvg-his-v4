/** SOC2 inventory. Local observations are not proof of operational effectiveness. */
import {
  MfaControlService, VulnerabilityControlService, AccessReviewControlService,
  DisasterRecoveryControlService, IncidentResponseControlService,
  calculateSecurityScore, type SecurityScore
} from './controls.service.js';

export interface EvidencePackage {
  readonly collectedAt: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: 'not_verified';
  readonly operationalApproval: false;
  readonly scope: 'current_local_inventory';
  readonly trustServiceCriteria: EvidenceForTrustCriterion[];
  readonly securityScore: SecurityScore;
  readonly summary: EvidenceSummary;
}
export interface EvidenceSummary {
  readonly totalControls: number;
  readonly controlsPassing: number;
  readonly controlsFailing: number;
  readonly controlsAtRisk: number;
  readonly controlsNotTested: number;
  readonly evidenceItems: number;
  readonly lastVulnerabilityScan: string | null;
  readonly lastDrTest: string | null;
  readonly openIncidents: number;
  readonly staleAccessUsers: number;
  readonly coveragePercent: number;
}
export interface EvidenceForTrustCriterion {
  readonly criterion: string;
  readonly description: string;
  readonly controls: EvidenceControl[];
  readonly overallStatus: 'pass' | 'fail' | 'at_risk' | 'not_tested';
}
export interface EvidenceControl {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: 'pass' | 'fail' | 'at_risk' | 'not_tested';
  readonly lastTested: string | null;
  readonly findings: readonly string[];
  readonly evidenceType: 'automatizado' | 'manual' | 'hybrid';
  readonly provenance: 'configuration' | 'local_record' | 'simulated' | 'not_executed' | 'missing';
  readonly operationallyVerified: false;
}

export async function collectEvidence(
  periodStart: string,
  periodEnd: string,
  controls: {
    mfa: MfaControlService;
    vulnerability: VulnerabilityControlService;
    access: AccessReviewControlService;
    dr: DisasterRecoveryControlService;
    incident: IncidentResponseControlService;
  }
): Promise<EvidencePackage> {
  if (!Number.isFinite(Date.parse(periodStart)) || !Number.isFinite(Date.parse(periodEnd))
    || Date.parse(periodStart) > Date.parse(periodEnd)) {
    throw new RangeError('Invalid SOC2 evidence period');
  }
  const pending = await controls.access.getPendingReviews();
  const stale = controls.access.getUsersWithStaleAccess();
  const incidents = await controls.incident.getOpenIncidents();
  const simulated = await controls.vulnerability.getOpenVulnerabilities();
  const lastDr = await controls.dr.getLastTest();
  const control = (
    id: string, name: string, provenance: EvidenceControl['provenance'],
    findings: string[] = [], status: EvidenceControl['status'] = 'not_tested'
  ): EvidenceControl => ({
    id, name, description: name, provenance, status,
    operationallyVerified: false, lastTested: null,
    findings: [...findings, 'Operational effectiveness has not been verified.'],
    evidenceType: provenance === 'configuration' || provenance === 'simulated' ? 'automatizado' : 'hybrid'
  });
  const criterion = (id: string, description: string, items: EvidenceControl[]): EvidenceForTrustCriterion => ({
    criterion: id, description, controls: items,
    overallStatus: items.some(item => item.status === 'fail') ? 'fail'
      : items.some(item => item.status === 'at_risk') ? 'at_risk' : 'not_tested'
  });
  const trustServiceCriteria = [
    criterion('CC6.2', 'Access controls', [
      control('CC6.2-01', 'MFA Enforcement', 'configuration', [
        `Admin MFA configured: ${controls.mfa.isMfaRequired('admin')}`,
        `API key MFA configured: ${controls.mfa.isApiKeyMfaRequired()}`
      ]),
      control('CC6.2-02', 'Session Timeout', 'configuration', [`Configured timeout: ${controls.mfa.getSessionTimeout()} ms`]),
      control('CC6.2-03', 'Failed Login Lockout', 'configuration')
    ]),
    criterion('CC3.1', 'Vulnerability assessment', [
      control('CC3.1-01', 'Vulnerability Scanning', 'simulated', ['Scanner uses built-in fixtures; no operational scan was executed.']),
      control('CC3.1-02', 'Critical Vulnerabilities', 'simulated', [`${simulated.length} open simulated findings; excluded from operational conclusions.`]),
      control('CC3.1-03', 'Risk Register', 'missing')
    ]),
    criterion('CC5.1', 'Access review records', [
      control('CC5.1-01', 'Quarterly Access Review', stale.length ? 'local_record' : 'missing', [`${stale.length} users with stale login in local approved reviews.`], stale.length ? 'at_risk' : 'not_tested'),
      control('CC5.1-02', 'Access Revocation', pending.length ? 'local_record' : 'missing', [`${pending.length} pending local reviews; revocation enforcement is not established.`], pending.length ? 'at_risk' : 'not_tested'),
      control('CC5.1-03', 'Principle of Least Privilege', 'missing')
    ]),
    criterion('CC7.1', 'Disaster recovery', [
      control('CC7.1-01', 'DR Testing', 'not_executed', lastDr ? [...lastDr.findings] : ['No DR test executed.']),
      control('CC7.1-02', 'Backup Verification', 'not_executed', ['No restore or recoverability verification executed.']),
      control('CC7.1-03', 'Uptime Monitoring', 'missing')
    ]),
    criterion('CC7.2', 'Incident management records', [
      control('CC7.2-01', 'Incident Response Plan', 'missing'),
      control('CC7.2-02', 'MTTR Target', 'local_record', [`Local recorded MTTR: ${controls.incident.getMTTR()} minutes; completeness and SLA compliance not verified.`]),
      control('CC7.2-03', 'Open Incidents', incidents.length ? 'local_record' : 'missing', incidents.map(item => `Local incident ${item.id}: ${item.severity}, ${item.status}, ${item.title}`), incidents.some(item => item.severity === 'critical') ? 'fail' : incidents.length ? 'at_risk' : 'not_tested')
    ]),
    criterion('CC8.1', 'Change management', [
      control('CC8.1-01', 'Change Approval', 'missing'),
      control('CC8.1-02', 'Change Log', 'missing'),
      control('CC8.1-03', 'CI/CD Pipeline', 'missing')
    ])
  ];
  const all = trustServiceCriteria.flatMap(item => item.controls);
  return {
    collectedAt: new Date().toISOString(), periodStart, periodEnd,
    status: 'not_verified', operationalApproval: false,
    // The period is requested scope, not a claim that local records cover it.
    scope: 'current_local_inventory', trustServiceCriteria,
    securityScore: await calculateSecurityScore(controls.mfa, controls.vulnerability, controls.access, controls.dr),
    summary: {
      totalControls: all.length, controlsPassing: 0,
      controlsFailing: all.filter(item => item.status === 'fail').length,
      controlsAtRisk: all.filter(item => item.status === 'at_risk').length,
      controlsNotTested: all.filter(item => item.status === 'not_tested').length,
      evidenceItems: 0, lastVulnerabilityScan: null, lastDrTest: null,
      openIncidents: incidents.length, staleAccessUsers: stale.length, coveragePercent: 0
    }
  };
}

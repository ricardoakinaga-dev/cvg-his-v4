/**
 * SOC2 Controls Implementation
 * F4-03: SOC2 Gap Analysis - Critical Controls Implementation
 *
 * Implements the critical controls identified in GAP-ANALYSIS.md
 * Priority: MFA Universal, Vulnerability Scanning, Access Reviews
 */

import { randomBytes } from 'node:crypto';

// Control CC6.2 - MFA Enforcement
export interface MfaEnforcementConfig {
  requiredForRoles: string[];
  requiredForApiKeys: boolean;
  sessionTimeoutMinutes: number;
  failedLoginLockoutAttempts: number;
  lockoutDurationMinutes: number;
}

export const DEFAULT_MFA_CONFIG: MfaEnforcementConfig = {
  requiredForRoles: ['admin', 'manager', 'veterinarian', 'accountant'],
  requiredForApiKeys: true,
  sessionTimeoutMinutes: 30,
  failedLoginLockoutAttempts: 5,
  lockoutDurationMinutes: 15
};

export class MfaControlService {
  private config: MfaEnforcementConfig;
  private failedAttempts: Map<string, { count: number; lockedUntil?: Date }> = new Map();

  constructor(config: Partial<MfaEnforcementConfig> = {}) {
    this.config = { ...DEFAULT_MFA_CONFIG, ...config };
  }

  isMfaRequired(role: string): boolean {
    return this.config.requiredForRoles.includes(role);
  }

  isApiKeyMfaRequired(): boolean {
    return this.config.requiredForApiKeys;
  }

  getSessionTimeout(): number {
    return this.config.sessionTimeoutMinutes * 60 * 1000;
  }

  isAccountLocked(userId: string): boolean {
    const failed = this.failedAttempts.get(userId);
    if (!failed) return false;
    if (failed.lockedUntil && failed.lockedUntil > new Date()) {
      return true;
    }
    // Lock expired, reset
    this.failedAttempts.delete(userId);
    return false;
  }

  recordFailedAttempt(userId: string): void {
    const current = this.failedAttempts.get(userId) ?? { count: 0 };
    current.count += 1;

    if (current.count >= this.config.failedLoginLockoutAttempts) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + this.config.lockoutDurationMinutes);
      current.lockedUntil = lockedUntil;
    }

    this.failedAttempts.set(userId, current);
  }

  recordSuccessfulLogin(userId: string): void {
    this.failedAttempts.delete(userId);
  }

  getRemainingAttempts(userId: string): number {
    const failed = this.failedAttempts.get(userId);
    if (!failed) return this.config.failedLoginLockoutAttempts;
    return Math.max(0, this.config.failedLoginLockoutAttempts - failed.count);
  }
}

// Control CC3.1 - Vulnerability Scanning
export interface VulnerabilityScanResult {
  readonly provenance: 'simulated';
  readonly operationallyVerified: false;
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  affectedComponent: string;
  detectedAt: string;
  status: 'open' | 'mitigated' | 'accepted' | 'false-positive';
  remediation?: string;
}

export class VulnerabilityControlService {
  private scans: VulnerabilityScanResult[] = [];
  private scanScheduleDays = 7; // Weekly by default

  async runScan(components: string[]): Promise<VulnerabilityScanResult[]> {
    const results: VulnerabilityScanResult[] = [];
    const scanId = this.generateId();

    for (const component of components) {
      // Simulate vulnerability detection
      const vulns = this.detectVulnerabilities(component);
      results.push(...vulns.map(v => ({
        ...v,
        id: `${scanId}_${v.affectedComponent}`,
        detectedAt: new Date().toISOString(),
        status: 'open' as const,
        provenance: 'simulated' as const,
        operationallyVerified: false as const
      })));
    }

    this.scans.push(...results);
    return results;
  }

  async getOpenVulnerabilities(): Promise<VulnerabilityScanResult[]> {
    return this.scans.filter(s => s.status === 'open');
  }

  async getVulnerabilitiesBySeverity(severity: VulnerabilityScanResult['severity']): Promise<VulnerabilityScanResult[]> {
    return this.scans.filter(s => s.severity === severity && s.status === 'open');
  }

  async getCriticalVulnerabilities(): Promise<VulnerabilityScanResult[]> {
    return this.getVulnerabilitiesBySeverity('critical');
  }

  async mitigateVulnerability(vulnerabilityId: string): Promise<void> {
    const vuln = this.scans.find(s => s.id === vulnerabilityId);
    if (vuln) {
      vuln.status = 'mitigated';
    }
  }

  async acceptVulnerability(vulnerabilityId: string, justification: string): Promise<void> {
    const vuln = this.scans.find(s => s.id === vulnerabilityId);
    if (vuln) {
      vuln.status = 'accepted';
    }
  }

  getDaysSinceLastScan(): number {
    // This service has no scanner adapter. Fixtures never satisfy the schedule.
    return Infinity;
  }

  isScanOverdue(): boolean {
    return this.getDaysSinceLastScan() > this.scanScheduleDays;
  }

  private detectVulnerabilities(component: string): Omit<VulnerabilityScanResult, 'id' | 'detectedAt' | 'status' | 'provenance' | 'operationallyVerified'>[] {
    // Simulated vulnerability detection based on component
    const knownPatterns: Record<string, Omit<VulnerabilityScanResult, 'id' | 'detectedAt' | 'status' | 'provenance' | 'operationallyVerified'>[]> = {
      'api': [
        { severity: 'high', title: 'SQL Injection Risk', description: 'Parameterized queries should be verified', affectedComponent: 'api', remediation: 'Use parameterized queries exclusively' },
        { severity: 'medium', title: 'Rate Limiting Gap', description: 'Some endpoints lack rate limiting', affectedComponent: 'api', remediation: 'Add rate limiting to all public endpoints' }
      ],
      'database': [
        { severity: 'critical', title: 'Default Credentials', description: 'Database has default credentials configured', affectedComponent: 'database', remediation: 'Change all default credentials immediately' },
        { severity: 'medium', title: 'Connection Pool Exhaustion', description: 'Connection pool may be exhausted under load', affectedComponent: 'database', remediation: 'Implement connection pool monitoring and limits' }
      ],
      'worker': [
        { severity: 'low', title: 'Job Timeout Not Set', description: 'Some background jobs lack timeout', affectedComponent: 'worker', remediation: 'Set explicit timeouts for all jobs' }
      ]
    };

    return knownPatterns[component] ?? [];
  }

  private generateId(): string {
    return `vuln_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
  }
}

// Control CC5.1 - Access Reviews
export interface UserAccessReview {
  userId: string;
  userEmail: string;
  roles: string[];
  lastLogin: string | null;
  accessReviewedAt: string;
  status: 'approved' | 'revoked' | 'pending';
  reviewedBy?: string;
}

export class AccessReviewControlService {
  private reviews: UserAccessReview[] = [];
  private reviewCycleDays = 90; // Quarterly

  async createReview(userId: string, userEmail: string, roles: string[], lastLogin: string | null): Promise<UserAccessReview> {
    const review: UserAccessReview = {
      userId,
      userEmail,
      roles,
      lastLogin,
      accessReviewedAt: new Date().toISOString(),
      status: 'pending'
    };
    this.reviews.push(review);
    return review;
  }

  async approveAccess(userId: string, reviewedBy: string): Promise<void> {
    const review = this.reviews.find(r => r.userId === userId && r.status === 'pending');
    if (review) {
      review.status = 'approved';
      review.reviewedBy = reviewedBy;
    }
  }

  async revokeAccess(userId: string, reviewedBy: string): Promise<void> {
    const review = this.reviews.find(r => r.userId === userId && r.status === 'pending');
    if (review) {
      review.status = 'revoked';
      review.reviewedBy = reviewedBy;
    }
  }

  async getPendingReviews(): Promise<UserAccessReview[]> {
    return this.reviews.filter(r => r.status === 'pending');
  }

  async getReviewsByUser(userId: string): Promise<UserAccessReview[]> {
    return this.reviews.filter(r => r.userId === userId);
  }

  isReviewCycleOverdue(lastReviewDate: string): boolean {
    const lastDate = new Date(lastReviewDate);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > this.reviewCycleDays;
  }

  getUsersWithStaleAccess(): string[] {
    const staleUsers: string[] = [];
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - this.reviewCycleDays);

    for (const review of this.reviews) {
      if (review.status === 'approved' && review.lastLogin) {
        const lastLogin = new Date(review.lastLogin);
        if (lastLogin < ninetyDaysAgo) {
          staleUsers.push(review.userId);
        }
      }
    }
    return staleUsers;
  }
}

// Control CC7.1 - Disaster Recovery Testing
export interface DrTestResult {
  id: string;
  testType: 'failover' | 'recovery' | 'backup-restore';
  readonly provenance: 'not_executed';
  readonly operationallyVerified: false;
  requestedAt: string;
  conductedAt: string | null;
  duration: number | null; // seconds, null when no execution occurred
  status: 'passed' | 'failed' | 'partial' | 'not_verified';
  findings: string[];
  nextScheduledAt: string;
}

export class DisasterRecoveryControlService {
  private tests: DrTestResult[] = [];
  private testScheduleDays = 180; // Semi-annually

  async conductFailoverTest(): Promise<DrTestResult> {
    return this.recordUnexecutedTest('failover');
  }

  async conductRecoveryTest(): Promise<DrTestResult> {
    return this.recordUnexecutedTest('recovery');
  }

  private recordUnexecutedTest(testType: DrTestResult['testType']): DrTestResult {
    const test: DrTestResult = {
      id: `dr_${randomBytes(12).toString('hex')}`,
      testType,
      provenance: 'not_executed',
      operationallyVerified: false,
      requestedAt: new Date().toISOString(),
      conductedAt: null,
      duration: null,
      status: 'not_verified',
      findings: ['No DR executor is configured; recovery, failover and data integrity were not verified.'],
      nextScheduledAt: this.getNextTestDate()
    };
    this.tests.push(test);
    return structuredClone(test);
  }

  async getLastTest(): Promise<DrTestResult | null> {
    if (this.tests.length === 0) return null;
    return structuredClone(this.tests[this.tests.length - 1]);
  }

  isTestOverdue(): boolean {
    // Requests without an executor are not completed tests.
    return true;
  }

  getTestHistory(): DrTestResult[] {
    return structuredClone(this.tests);
  }

  private getNextTestDate(): string {
    const next = new Date();
    next.setDate(next.getDate() + this.testScheduleDays);
    return next.toISOString();
  }
}

// Control CC7.2 - Incident Response
export interface IncidentRecord {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'mitigated' | 'resolved' | 'post-mortem';
  createdAt: string;
  resolvedAt?: string;
  postMortem?: {
    rootCause: string;
    impact: string;
    lessonsLearned: string;
    actionItems: string[];
  };
}

export class IncidentResponseControlService {
  private incidents: IncidentRecord[] = [];

  async createIncident(data: {
    severity: IncidentRecord['severity'];
    title: string;
    description: string;
  }): Promise<IncidentRecord> {
    const incident: IncidentRecord = {
      id: `inc_${Date.now().toString(36)}`,
      ...data,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    this.incidents.push(incident);
    return incident;
  }

  async updateStatus(incidentId: string, status: IncidentRecord['status']): Promise<void> {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.status = status;
      if (status === 'resolved') {
        incident.resolvedAt = new Date().toISOString();
      }
    }
  }

  async addPostMortem(incidentId: string, postMortem: IncidentRecord['postMortem']): Promise<void> {
    const incident = this.incidents.find(i => i.id === incidentId);
    if (incident) {
      incident.postMortem = postMortem;
      incident.status = 'post-mortem';
    }
  }

  async getOpenIncidents(): Promise<IncidentRecord[]> {
    return this.incidents.filter(i => ['open', 'investigating', 'mitigated'].includes(i.status));
  }

  async getIncidentById(incidentId: string): Promise<IncidentRecord | null> {
    return this.incidents.find(i => i.id === incidentId) ?? null;
  }

  getMTTR(): number {
    const resolved = this.incidents.filter(i => i.resolvedAt);
    if (resolved.length === 0) return 0;

    let totalTime = 0;
    for (const incident of resolved) {
      const created = new Date(incident.createdAt);
      const resolved = new Date(incident.resolvedAt!);
      totalTime += (resolved.getTime() - created.getTime()) / (1000 * 60); // minutes
    }
    return Math.round(totalTime / resolved.length);
  }
}

// Security Score Calculator
export interface SecurityScore {
  readonly status: 'not_verified';
  readonly operationalApproval: false;
  readonly provenance: 'unverified';
  overall: number;
  security: number;
  availability: number;
  confidentiality: number;
  processingIntegrity: number;
  privacy: number;
  criticalGaps: string[];
  recommendations: string[];
}

export async function calculateSecurityScore(mfa: MfaControlService, vuln: VulnerabilityControlService, access: AccessReviewControlService, dr: DisasterRecoveryControlService): Promise<SecurityScore> {
  // Configuration, fixtures and local registers cannot establish deployment-wide
  // effectiveness. Zero denotes no verified credit, not a measured security rating.
  const criticalGaps = ['Operational control effectiveness has not been verified'];
  const staleAccess = access.getUsersWithStaleAccess();
  if (staleAccess.length > 0) criticalGaps.push(`${staleAccess.length} users with stale access in local records`);
  return {
    status: 'not_verified',
    operationalApproval: false,
    provenance: 'unverified',
    overall: 0,
    security: 0,
    availability: 0,
    confidentiality: 0,
    processingIntegrity: 0,
    privacy: 0,
    criticalGaps,
    recommendations: ['Collect attributable operational evidence before assigning security score credit']
  };
}

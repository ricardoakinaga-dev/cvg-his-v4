/**
 * SOC2 Controls Module - CVG-HIS-V2 Enterprise Compliance
 * F4-03: SOC2 Gap Analysis - Critical Controls Implementation
 */

// Controls services
export {
  MfaControlService,
  VulnerabilityControlService,
  AccessReviewControlService,
  DisasterRecoveryControlService,
  IncidentResponseControlService,
  calculateSecurityScore,
  type MfaEnforcementConfig,
  type VulnerabilityScanResult,
  type UserAccessReview,
  type DrTestResult,
  type IncidentRecord,
  type SecurityScore
} from './controls.service.js';
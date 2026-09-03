const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PLACEHOLDER_PATTERN =
  /^(?:pending|pendente|todo|tbd|n\/?a|none|unknown|desconhecido|a preencher|placeholder|replace|<.*>)$/i;

export const REQUIRED_VISUAL_SNAPSHOTS = Object.freeze([
  'appointments-kanban-page-dark.png',
  'appointments-kanban-page-mobile-dark.png',
  'appointments-kanban-page-mobile.png',
  'appointments-kanban-page.png',
  'billing-detail-page.png',
  'billing-list-page.png',
  'dashboard-page-dark.png',
  'encounter-detail-page-dark.png',
  'encounter-detail-page.png',
  'medical-record-detail-page-dark.png',
  'owner-detail-page.png',
  'patient-detail-page-dark.png',
  'patient-detail-page.png',
  'queue-page-dark.png',
  'reception-gateway-page-dark.png'
]);

export const REQUIRED_UAT_SCENARIOS = Object.freeze({
  reception: Object.freeze([
    'register-owner',
    'register-patient',
    'schedule-consultation',
    'schedule-exam',
    'manage-queue',
    'launch-exam',
    'launch-consultation',
    'open-command',
    'close-command'
  ]),
  'clinical-veterinarian': Object.freeze([
    'open-medical-record',
    'verify-owner',
    'record-anamnesis',
    'prescribe-medication',
    'print-medical-record',
    'print-exam',
    'view-exams',
    'view-consultation-history',
    'view-anamnesis-history',
    'register-care',
    'create-quote'
  ]),
  'veterinary-pathologist': Object.freeze([
    'enter-exam-result',
    'register-equipment',
    'register-enzyme',
    'configure-reference-values',
    'issue-laboratory-report'
  ]),
  'veterinary-ultrasonographer': Object.freeze(['issue-ultrasound-report']),
  'hospital-administrator': Object.freeze([
    'register-veterinarian-user',
    'register-user-profile',
    'register-hospital-sector',
    'manage-custom-permissions'
  ])
});

const VALID_VISUAL_CLASSIFICATIONS = new Set(['defect-corrected', 'intentional-change']);
const VALID_VISUAL_DECISIONS = new Set(['approved', 'rejected', 'pending']);
const VALID_RESULTS = new Set(['accepted', 'accepted-with-reservation', 'blocked', 'rejected']);
const VALID_RISK_SEVERITIES = new Set(['p0', 'p1', 'p2', 'p3']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function addError(errors, condition, message) {
  if (!condition) errors.push(message);
}

function meaningfulString(value, minimumLength = 2) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return (
    normalized.length >= minimumLength &&
    !PLACEHOLDER_PATTERN.test(normalized) &&
    !/[\0\r\n]/.test(normalized)
  );
}

function validTimestamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function validateIdentity(errors, identity, path) {
  addError(errors, isObject(identity), `${path} must be an object`);
  if (!isObject(identity)) return;
  addError(
    errors,
    meaningfulString(identity.name, 3),
    `${path}.name must identify a real approver`
  );
  addError(
    errors,
    meaningfulString(identity.corporateId, 3),
    `${path}.corporateId must contain a corporate identifier`
  );
}

function validateReference(errors, value, path) {
  addError(errors, meaningfulString(value, 8), `${path} must contain a stable evidence reference`);
}

function compareExactSet(errors, actualValues, expectedValues, path) {
  const actual = new Set(actualValues);
  const expected = new Set(expectedValues);
  const missing = expectedValues.filter((value) => !actual.has(value));
  const unexpected = actualValues.filter((value) => !expected.has(value));
  const duplicates = actualValues.filter((value, index) => actualValues.indexOf(value) !== index);
  if (missing.length) errors.push(`${path} is missing: ${missing.join(', ')}`);
  if (unexpected.length)
    errors.push(`${path} contains unexpected values: ${unexpected.join(', ')}`);
  if (duplicates.length)
    errors.push(`${path} contains duplicates: ${[...new Set(duplicates)].join(', ')}`);
}

export function validateUsabilityManualEvidence(evidence, { expectedSha, expectedDecision } = {}) {
  const errors = [];
  addError(errors, isObject(evidence), 'manual evidence must be a JSON object');
  if (!isObject(evidence)) return { valid: false, errors };

  addError(errors, evidence.schemaVersion === 1, 'schemaVersion must be 1');
  addError(
    errors,
    typeof evidence.candidateSha === 'string' && SHA_PATTERN.test(evidence.candidateSha),
    'candidateSha must be a lowercase 40-character Git SHA'
  );
  if (expectedSha) {
    addError(
      errors,
      evidence.candidateSha === expectedSha,
      `candidateSha must equal the dispatched SHA ${expectedSha}`
    );
  }

  const visual = evidence.visualReview;
  addError(errors, isObject(visual), 'visualReview must be an object');
  if (isObject(visual)) {
    addError(
      errors,
      ['approved', 'rejected', 'pending'].includes(visual.result),
      'visualReview.result must be approved, rejected or pending'
    );
    addError(errors, validTimestamp(visual.reviewedAt), 'visualReview.reviewedAt must be ISO-8601');
    validateReference(errors, visual.evidenceReference, 'visualReview.evidenceReference');
    if (visual.result === 'approved') {
      validateIdentity(errors, visual.productApprover, 'visualReview.productApprover');
      validateIdentity(errors, visual.uxApprover, 'visualReview.uxApprover');
    }
    addError(errors, Array.isArray(visual.decisions), 'visualReview.decisions must be an array');
    if (Array.isArray(visual.decisions)) {
      compareExactSet(
        errors,
        visual.decisions.map((item) => item?.snapshot),
        REQUIRED_VISUAL_SNAPSHOTS,
        'visualReview.decisions'
      );
      visual.decisions.forEach((item, index) => {
        const path = `visualReview.decisions[${index}]`;
        addError(errors, isObject(item), `${path} must be an object`);
        if (!isObject(item)) return;
        addError(
          errors,
          VALID_VISUAL_CLASSIFICATIONS.has(item.classification),
          `${path}.classification must be defect-corrected or intentional-change`
        );
        addError(
          errors,
          VALID_VISUAL_DECISIONS.has(item.decision),
          `${path}.decision must be approved, rejected or pending`
        );
        validateReference(errors, item.evidenceReference, `${path}.evidenceReference`);
      });
    }
  }

  addError(errors, Array.isArray(evidence.uat), 'uat must be an array');
  if (Array.isArray(evidence.uat)) {
    const requiredRoles = Object.keys(REQUIRED_UAT_SCENARIOS);
    compareExactSet(
      errors,
      evidence.uat.map((item) => item?.role),
      requiredRoles,
      'uat roles'
    );
    evidence.uat.forEach((entry, index) => {
      const path = `uat[${index}]`;
      addError(errors, isObject(entry), `${path} must be an object`);
      if (!isObject(entry)) return;
      addError(errors, VALID_RESULTS.has(entry.result), `${path}.result is invalid`);
      addError(errors, validTimestamp(entry.executedAt), `${path}.executedAt must be ISO-8601`);
      addError(errors, meaningfulString(entry.environment, 3), `${path}.environment is required`);
      validateReference(errors, entry.evidenceReference, `${path}.evidenceReference`);
      if (entry.result === 'accepted' || entry.result === 'accepted-with-reservation') {
        validateIdentity(errors, entry.approver, `${path}.approver`);
      }
      addError(errors, Array.isArray(entry.scenarios), `${path}.scenarios must be an array`);
      const requiredScenarios = REQUIRED_UAT_SCENARIOS[entry.role];
      if (Array.isArray(entry.scenarios) && requiredScenarios) {
        compareExactSet(
          errors,
          entry.scenarios.map((scenario) => scenario?.id),
          requiredScenarios,
          `${path}.scenarios`
        );
        entry.scenarios.forEach((scenario, scenarioIndex) => {
          const scenarioPath = `${path}.scenarios[${scenarioIndex}]`;
          addError(errors, isObject(scenario), `${scenarioPath} must be an object`);
          if (!isObject(scenario)) return;
          addError(errors, VALID_RESULTS.has(scenario.result), `${scenarioPath}.result is invalid`);
          validateReference(
            errors,
            scenario.evidenceReference,
            `${scenarioPath}.evidenceReference`
          );
        });
      }
    });
  }

  const accessibility = evidence.accessibilityReview;
  addError(errors, isObject(accessibility), 'accessibilityReview must be an object');
  if (isObject(accessibility)) {
    addError(
      errors,
      VALID_RESULTS.has(accessibility.result),
      'accessibilityReview.result is invalid'
    );
    addError(
      errors,
      validTimestamp(accessibility.executedAt),
      'accessibilityReview.executedAt must be ISO-8601'
    );
    addError(
      errors,
      meaningfulString(accessibility.technology, 5),
      'accessibilityReview.technology must identify the assistive technology and browser'
    );
    validateReference(
      errors,
      accessibility.evidenceReference,
      'accessibilityReview.evidenceReference'
    );
    if (
      accessibility.result === 'accepted' ||
      accessibility.result === 'accepted-with-reservation'
    ) {
      validateIdentity(errors, accessibility.approver, 'accessibilityReview.approver');
    }
  }

  addError(errors, Array.isArray(evidence.residualRisks), 'residualRisks must be an array');
  if (Array.isArray(evidence.residualRisks)) {
    evidence.residualRisks.forEach((risk, index) => {
      const path = `residualRisks[${index}]`;
      addError(errors, isObject(risk), `${path} must be an object`);
      if (!isObject(risk)) return;
      addError(errors, meaningfulString(risk.id, 3), `${path}.id is required`);
      addError(
        errors,
        VALID_RISK_SEVERITIES.has(risk.severity),
        `${path}.severity must be p0, p1, p2 or p3`
      );
      addError(errors, meaningfulString(risk.description, 8), `${path}.description is required`);
      addError(errors, meaningfulString(risk.owner, 3), `${path}.owner is required`);
      addError(
        errors,
        typeof risk.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(risk.dueDate),
        `${path}.dueDate must use YYYY-MM-DD`
      );
      validateIdentity(errors, risk.acceptedBy, `${path}.acceptedBy`);
    });
  }

  const goNoGo = evidence.goNoGo;
  addError(errors, isObject(goNoGo), 'goNoGo must be an object');
  if (isObject(goNoGo)) {
    addError(errors, ['go', 'no-go'].includes(goNoGo.decision), 'goNoGo.decision is invalid');
    if (expectedDecision) {
      addError(
        errors,
        goNoGo.decision === expectedDecision,
        `goNoGo.decision must equal the dispatched decision ${expectedDecision}`
      );
    }
    addError(errors, validTimestamp(goNoGo.decidedAt), 'goNoGo.decidedAt must be ISO-8601');
    validateReference(errors, goNoGo.evidenceReference, 'goNoGo.evidenceReference');
    addError(errors, isObject(goNoGo.approvers), 'goNoGo.approvers must be an object');
    if (isObject(goNoGo.approvers)) {
      for (const discipline of ['product', 'qa', 'engineering']) {
        validateIdentity(errors, goNoGo.approvers[discipline], `goNoGo.approvers.${discipline}`);
      }
    }
  }

  if (goNoGo?.decision === 'go') {
    addError(errors, visual?.result === 'approved', 'GO requires visualReview.result=approved');
    if (Array.isArray(visual?.decisions)) {
      addError(
        errors,
        visual.decisions.every((item) => item?.decision === 'approved'),
        'GO requires every visual decision to be approved'
      );
    }
    if (Array.isArray(evidence.uat)) {
      addError(
        errors,
        evidence.uat.every(
          (entry) =>
            entry?.result === 'accepted' &&
            Array.isArray(entry.scenarios) &&
            entry.scenarios.every((scenario) => scenario?.result === 'accepted')
        ),
        'GO requires all five UAT roles and every scenario to be accepted'
      );
    }
    addError(
      errors,
      accessibility?.result === 'accepted',
      'GO requires accessibilityReview.result=accepted'
    );
    if (Array.isArray(evidence.residualRisks)) {
      addError(
        errors,
        evidence.residualRisks.every((risk) => !['p0', 'p1'].includes(risk?.severity)),
        'GO cannot contain residual P0 or P1 risks'
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

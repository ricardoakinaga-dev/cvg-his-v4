# Patient Safety Checklist - MAR Hardening

## Overview
This checklist documents the safety hardening implemented for the Medication Administration Record (MAR) system to ensure patient safety during medication administration workflows.

---

## 1. UUID Entry Removal

### ✅ Requirement: Remove manual UUID entry in clinical flow

| Item | Status | Implementation |
|------|--------|----------------|
| Patient selection via stayId from context | ✅ Done | `MarWithPatientContext.tsx` uses `stayId` from URL params |
| Patient ID derived from order context | ✅ Done | `patientId` comes from `MedicationOrderRef.patientId` |
| No manual UUID input fields | ✅ Done | Patient confirmation uses name/species, not UUID |
| UUID validation only in API layer | ✅ Done | Zod schemas validate UUIDs server-side |

---

## 2. Patient Selection Display

### ✅ Requirement: Show name, species, weight, bed, ward, alerts

| Field | Status | Location |
|-------|--------|----------|
| Patient Name | ✅ Done | `PatientContextInfoSchema.name` |
| Species | ✅ Done | `PatientContextInfoSchema.species` |
| Weight (kg) | ✅ Done | `PatientContextInfoSchema.weightKg` |
| Bed Name | ✅ Done | `PatientContextInfoSchema.bedName` |
| Ward Name | ✅ Done | `PatientContextInfoSchema.wardName` |
| Stay Status | ✅ Done | `PatientContextInfoSchema.stayStatus` |
| Allergy Alerts | ✅ Done | `PatientAlertsSchema.allergies` |
| High Risk Status | ✅ Done | `PatientAlertsSchema.anesthesia_risk`, `aggressive` |

---

## 3. Visual Patient Confirmation

### ✅ Requirement: Actions require visual confirmation of patient

| Action | Confirmation Required | Implementation |
|--------|----------------------|----------------|
| Administer | ✅ Yes | `patientConfirmation` required in request |
| Refuse | ✅ Yes | `patientConfirmation` required in request |
| Delay | ✅ Yes | `patientConfirmation` required in request |
| Held | ❌ No | Reason-only, no confirmation needed |

#### Confirmation Fields:
- `patientId`: UUID of the patient being confirmed
- `confirmedByName`: Clinician-entered patient name (verified against actual)
- `confirmedBySpecies`: Clinician-entered species (verified against actual)

#### Error Handling:
- `PATIENT_CONFIRMATION_REQUIRED`: 422 error when confirmation missing
- `PATIENT_MISMATCH`: 422 error when confirmation doesn't match

---

## 4. Dose Due/Overdue Logic Standardization

### ✅ Requirement: Single shared function for API + Worker

| Component | Status | Implementation |
|-----------|--------|----------------|
| Shared Module | ✅ Done | `packages/domain/src/doseDueLogic.ts` |
| API Integration | ✅ Done | Import from `@cvg-his/domain` |
| Worker Integration | ✅ Done | Import from `@cvg-his/domain` |
| Default Grace Period | ✅ Done | 30 minutes (`DEFAULT_GRACE_MINUTES`) |

#### Functions Available:
- `calculateDoseStatus()`: Main function for dose status determination
- `calculateDelaySeverity()`: Returns 'low' | 'medium' | 'high'
- `shouldTriggerOverdueAlert()`: Boolean for alert triggering
- `categorizeDoses()`: Batch categorization of doses

#### Dose Statuses:
- `administered`: Already given
- `due`: Within grace period
- `overdue`: Past grace period
- `upcoming`: Future scheduled
- `delayed`: Explicitly delayed
- `refused`: Patient refused
- `held`: Held for clinical reason

---

## 5. Alert Lifecycle

### ✅ Requirement: active/acknowledged/resolved lifecycle

| Status | Description | Transitions |
|--------|-------------|-------------|
| `active` | New alert, needs attention | → acknowledged, → resolved |
| `acknowledged` | Clinician has seen alert | → resolved |
| `resolved` | Issue addressed | Terminal state |

#### API Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/alerts/:alertId/acknowledge` | POST | Acknowledge single alert |
| `/alerts/:alertId/resolve` | POST | Resolve single alert |
| `/alerts/batch/acknowledge` | POST | Acknowledge multiple alerts |
| `/alerts/batch/resolve` | POST | Resolve multiple alerts |

#### Request Schema:
```typescript
{
  notes?: string; // Optional notes for the action
}
```

#### Response Schema:
```typescript
{
  acknowledged: string[];  // Successfully acknowledged IDs
  notFound: string[];      // Alerts not found
  alreadyAcknowledged: string[]; // Already in target state
}
```

---

## 6. Regression Tests

### ✅ Test Coverage for Dose Due Logic

| Test ID | Description | Status |
|---------|-------------|--------|
| REG-001 | DST transition handling | ✅ Done |
| REG-002 | Very long delays (8+ hours) | ✅ Done |
| REG-003 | Multiple delays handling | ✅ Done |
| REG-004 | Zero grace period | ✅ Done |
| REG-005 | Exact scheduled time | ✅ Done |
| REG-006 | Refused dose that was overdue | ✅ Done |
| REG-007 | Delayed dose with past delayedUntil | ✅ Done |
| REG-008 | Severity escalation boundaries | ✅ Done |

---

## 7. Security Considerations

### Account Isolation
- All queries filtered by `accountId` from request context
- No cross-tenant data access possible

### Audit Trail
- All medication administrations logged via `appendAudit()`
- Alert lifecycle changes tracked with user ID and timestamp

### Input Validation
- Zod schemas validate all inputs
- UUID format validation on all ID fields
- Enum validation for status fields

---

## 8. Frontend Integration

### Patient Context Provider
- `PatientContextProvider` wraps MAR components
- Patient info loaded via `stayId` from URL
- Allergy warnings displayed prominently

### MAR Integration
- `MarWithPatientContext` component provides context
- `MedDueList` receives `stayId` automatically
- No manual patient ID entry required

---

## Verification Steps

### Pre-Deployment Checklist
- [ ] Run all regression tests
- [ ] Verify alert lifecycle transitions
- [ ] Test patient confirmation flow
- [ ] Validate dose status calculations
- [ ] Check audit log entries

### Post-Deployment Monitoring
- [ ] Monitor alert creation rate
- [ ] Track patient confirmation failures
- [ ] Review dose overdue alerts
- [ ] Verify acknowledgment timestamps

---

## Related Files

### Domain Layer
- `packages/domain/src/doseDueLogic.ts` - Shared dose logic
- `packages/domain/src/doseDueLogic.test.ts` - Regression tests

### API Layer
- `apps/his-api/src/modules/alerts/routes.ts` - Alert endpoints
- `apps/his-api/src/modules/alerts/service.ts` - Alert service
- `apps/his-api/src/modules/alerts/repo.ts` - Alert repository
- `apps/his-api/src/modules/medicationAdministrations/routes.ts` - MAR endpoints
- `apps/his-api/src/modules/medicationAdministrations/service.ts` - MAR service
- `apps/his-api/src/modules/patientContext/types.ts` - Patient context types

### Frontend Layer
- `apps/his-web/src/features/patientContext/integrations/MarWithPatientContext.tsx` - MAR integration

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-20 | Initial patient safety hardening implementation |

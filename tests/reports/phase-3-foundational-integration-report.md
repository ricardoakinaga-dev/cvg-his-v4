# Phase 3 — Foundational Integration Report

**Date:** 2026-03-31
**Status:** PASS — 11/11 foundational integration tests passing
**Environment:** In-memory module services (no DB persistence for billing/inventory/scheduling/users)

---

## Summary

| Suite                                           | Tests  | Passed | Failed | Blocked |
| ----------------------------------------------- | ------ | ------ | ------ | ------- |
| ICT-001: User → Role → Permission               | 1      | 1      | 0      | 0       |
| ICT-002: User Without Permission Blocked        | 1      | 1      | 0      | 0       |
| ICT-003: User With Permission Can Execute       | 1      | 1      | 0      | 0       |
| ICT-004: Veterinarian → Scheduling Eligibility  | 1      | 1      | 0      | 0       |
| ICT-005: Inactive Professional → Not Eligible   | 1      | 1      | 0      | 0       |
| ICT-006: Owner + Patient → Scheduling Selection | 1      | 1      | 0      | 0       |
| ICT-007: Appointment → Correct Linkage          | 1      | 1      | 0      | 0       |
| ICT-008: Scheduling → Encounter Chain           | 1      | 1      | 0      | 0       |
| ICT-009: Clinical Action → Auditable Record     | 1      | 1      | 0      | 0       |
| ICT-010: Billable/Consumption → Module Reflex   | 2      | 2      | 0      | 0       |
| **Total**                                       | **11** | **11** | **0**  | **0**   |

---

## Tests Implemented

All 10 mandatory foundational tests from docs/780 have been implemented (ICT-001 through ICT-010), with ICT-010 split into two sub-tests (billing + inventory).

### ICT-001 — User → Role → Effective Permission

- Creates user with `reception` role via UsersService
- Verifies role exists in AccessControlService catalog
- Verifies permission codes are effectively assigned (owners.read, patients.read, scheduling.manage)
- **Status:** ✅ PASS

### ICT-002 — User Without Permission Is Blocked

- Creates profile with `auditor` role (no scheduling.manage)
- Verifies ForbiddenError thrown when attempting scheduling.manage
- **Status:** ✅ PASS

### ICT-003 — User With Permission Can Execute

- Creates profile with `reception` role
- Verifies no error for scheduling.manage and owners.manage
- **Status:** ✅ PASS

### ICT-004 — Veterinarian → Scheduling Eligibility

- Verifies StaffService seed data exists
- Verifies staff can be found by userId and by ID
- **Status:** ✅ PASS

### ICT-005 — Inactive Professional → Not Eligible

- Verifies inactive user with admin role is blocked by assertAuthorized
- **Status:** ✅ PASS

### ICT-006 — Owner + Patient → Scheduling Selection

- Creates owner via OwnersService (real API: `create(accountId, payload)`)
- Creates patient linked to owner via PatientsService
- Verifies patient and owner are findable
- **Status:** ✅ PASS

### ICT-007 — Appointment → Correct Linkage

- Creates owner + patient + appointment
- Verifies appointment persists correct patient and owner linkage
- Verifies appointment is listable
- **Status:** ✅ PASS

### ICT-008 — Scheduling → Encounter Chain

- Creates appointment, check-in, and encounter
- Verifies queue entry → encounter attachment
- Verifies encounter status is `reception`
- **Status:** ✅ PASS

### ICT-009 — Clinical Action → Auditable Record

- Writes audit event via AuditService
- Verifies event is recorded with correct metadata
- **Status:** ✅ PASS

### ICT-010 — Billable/Consumption → Module Reflex

- **Sub-test 1:** Creates encounter, billing estimate, and billing item; verifies item is listed
- **Sub-test 2:** Creates encounter, consumes inventory item; verifies stock reduced and consumption recorded
- **Status:** ✅ PASS (both sub-tests)

---

## Scenarios Blocked

None — all 11 tests pass.

---

## Integrations Absent (Not Yet Tested)

| Integration                   | Reason                                     | Priority |
| ----------------------------- | ------------------------------------------ | -------- |
| Auth login flow (HMAC tokens) | Requires crypto setup; tested at API level | Medium   |
| Medical records → encounters  | Complex async persistence; needs DB        | High     |
| Inpatient → encounters        | Requires sector/bed setup                  | Medium   |
| Surgery → encounters          | Requires encounter in specific status      | Medium   |
| Diagnostics → encounters      | Requires encounter in specific status      | Medium   |
| Prescription executions       | Requires clinical entry reference          | High     |
| Discharges                    | Requires encounter reference               | Medium   |
| Notifications                 | Optional dependencies                      | Low      |

---

## Corrections Made

### API Signature Alignments (no code changes to production)

The following real API signatures were discovered and tests were aligned to match:

| Module            | Method            | Correction                                                                                   |
| ----------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| OwnersService     | create            | Added `accountId` as first parameter                                                         |
| PatientsService   | create            | Added `accountId` as first parameter                                                         |
| EncountersService | openEncounter     | Added `accountId` and `actorUserId` as first two parameters                                  |
| SchedulingService | createAppointment | Added `accountId` as first parameter                                                         |
| SchedulingService | checkIn           | Added `accountId` as first parameter; added required `patientId`, `ownerId`, `reason` fields |
| BillingService    | addItem           | Added `actorUserId` as first parameter; changed `unitPrice` to `unitPriceAmount`             |
| BillingService    | listItems         | Changed from object param to direct `encounterId` string                                     |
| InventoryService  | consume           | Added `actorUserId` as first parameter; added required `sourceEntityType` field              |
| InventoryService  | listConsumptions  | Changed from object param to optional direct `encounterId` string                            |
| Owner contacts    | create            | Added required `label` field to contact objects                                              |

### No Production Code Changes

All corrections were made to test code only. No production code was modified.

---

## Next Steps

1. **Phase 4:** Implement remaining ICT-011 through ICT-020 from docs/780 (inpatient, surgery, diagnostics, prescription, discharge, notifications, permission change, inactivation, migration integrity, seed consistency)
2. **DB-backed tests:** Migrate in-memory tests to use real DB persistence once BillingService, InventoryService, SchedulingService, and UsersService receive DB repository injection
3. **E2E extension:** Extend Playwright e2e tests to cover billing, surgery, prescription, and notifications flows

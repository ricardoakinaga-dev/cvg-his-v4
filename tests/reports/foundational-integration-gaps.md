# Foundational Integration Gaps Report

**Date:** 2026-03-31
**Phase:** 3 — Foundational Integration Tests
**Status:** 11/11 tests passing after API signature alignment

---

## Tests Implemented

| ID       | Test                                   | Status  | Notes                                         |
| -------- | -------------------------------------- | ------- | --------------------------------------------- |
| ICT-001  | User → Role → Effective Permission     | ✅ PASS | Role codes match AccessControlService catalog |
| ICT-002  | User Without Permission Is Blocked     | ✅ PASS | ForbiddenError thrown correctly               |
| ICT-003  | User With Permission Can Execute       | ✅ PASS | No throw for authorized operations            |
| ICT-004  | Veterinarian → Scheduling Eligibility  | ✅ PASS | StaffService seed data available              |
| ICT-005  | Inactive Professional → Not Eligible   | ✅ PASS | Status check in assertAuthorized works        |
| ICT-006  | Owner + Patient → Scheduling Selection | ✅ PASS | Owner/patient linkage validated               |
| ICT-007  | Appointment → Correct Linkage          | ✅ PASS | Patient/owner linkage persisted               |
| ICT-008  | Scheduling → Encounter Chain           | ✅ PASS | Queue entry → encounter attachment works      |
| ICT-009  | Clinical Action → Auditable Record     | ✅ PASS | Audit events recorded correctly               |
| ICT-010a | Billable → Module Reflex               | ✅ PASS | Billing items created and listed              |
| ICT-010b | Consumption → Module Reflex            | ✅ PASS | Stock reduced, consumption recorded           |

---

## API Signature Corrections Required

The following real API signatures were discovered during test implementation and differ from initial assumptions:

| Module            | Method            | Assumed Signature                   | Real Signature                                                           |
| ----------------- | ----------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| OwnersService     | create            | `create(payload)`                   | `create(accountId, payload)`                                             |
| PatientsService   | create            | `create(payload)`                   | `create(accountId, payload)`                                             |
| EncountersService | openEncounter     | `openEncounter(payload)`            | `openEncounter(accountId, actorUserId, payload)`                         |
| SchedulingService | createAppointment | `createAppointment(payload)`        | `createAppointment(accountId, payload)`                                  |
| SchedulingService | checkIn           | `checkIn(payload)`                  | `checkIn(accountId, payload)` with patientId, ownerId, reason required   |
| BillingService    | addItem           | `addItem(payload)`                  | `addItem(actorUserId, payload)` with `unitPriceAmount` (not `unitPrice`) |
| BillingService    | listItems         | `listItems({ encounterId })`        | `listItems(encounterId)`                                                 |
| InventoryService  | consume           | `consume(payload)`                  | `consume(actorUserId, payload)` with `sourceEntityType` required         |
| InventoryService  | listConsumptions  | `listConsumptions({ encounterId })` | `listConsumptions(encounterId?)`                                         |
| Owner contacts    | create            | `{ type, value }`                   | `{ type, value, label }` — label is required                             |

---

## Integrations Validated

1. **AccessControlService ↔ role catalog** — 7 roles with correct permission codes
2. **OwnersService ↔ PatientsService** — owner-patient linkage validated
3. **PatientsService ↔ SchedulingService** — patient selectable in scheduling
4. **SchedulingService ↔ EncountersService** — queue entry → encounter chain
5. **AuditService** — events recorded with correct metadata
6. **BillingService ↔ EncountersService** — billing items linked to encounters
7. **InventoryService ↔ EncountersService** — consumption linked to encounters

---

## Integrations Not Yet Tested

| Integration                  | Reason                                                             |
| ---------------------------- | ------------------------------------------------------------------ |
| Auth login flow              | Requires HMAC token signing; tested at API level, not module level |
| Medical records → encounters | Complex async persistence; needs DB-backed test                    |
| Inpatient → encounters       | Requires sector/bed setup                                          |
| Surgery → encounters         | Requires encounter in specific status                              |
| Diagnostics → encounters     | Requires encounter in specific status                              |
| Prescription executions      | Requires clinical entry reference                                  |
| Discharges                   | Requires encounter reference                                       |
| Notifications                | Optional dependencies on encounters/patients                       |

---

## Gaps Documented

1. **BillingService uses in-memory Maps** — billing data lost on restart (docs/705)
2. **InventoryService uses in-memory Maps** — stock data lost on restart (docs/705)
3. **SchedulingService uses in-memory Maps** — appointments lost on restart (docs/705)
4. **UsersService uses in-memory Maps** — user data lost on restart (docs/705)
5. **StaffService has no CRUD** — only seed data, no create/update/delete
6. **Dual RBAC** — seed uses `vet/enfermagem/recepcao`, AccessControlService uses `veterinarian/nurse/reception`
7. **No shared EncountersService** — each module that depends on encounters needs the same instance; tests must wire this manually

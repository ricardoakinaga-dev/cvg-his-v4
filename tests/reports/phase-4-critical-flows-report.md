# Phase 4 — Critical Flows E2E Report

**Date:** 2026-03-31
**Status:** IMPLEMENTED — 8 critical flows as E2E API-level tests
**Runner:** Playwright (API context, same pattern as fluxo-principal.spec.ts)
**Target:** Running API at localhost:3000 (Docker container)

---

## Flows Implemented

All 8 mandatory critical flows from docs/720 and docs/780 have been implemented as E2E API-level tests in `e2e/tests/fluxos-criticos.spec.ts`.

### Flow 1: User Operational Registration ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 1: User Operational Registration`

- Creates user with `reception` role via `POST /users`
- Logs in via `POST /auth/login` — receives accessToken + refreshToken
- Validates access to permitted operation (`GET /owners`) — returns 200
- Validates block on forbidden operation (`POST /users`) — returns 403
- **Routes used:** POST /users, POST /auth/login, GET /owners, POST /users

### Flow 2: Veterinarian → Scheduling Eligibility ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 2: Veterinarian → Scheduling Eligibility`

- Creates veterinarian user with `veterinarian` role via `POST /users`
- Validates staff list is accessible via `GET /staff` — returns seed professionals
- Logs in as veterinarian and validates access to `GET /patients`
- **Routes used:** POST /users, GET /staff, POST /auth/login, GET /patients
- **GAP:** Staff is seed-only (no POST /staff). Professional eligibility is validated via staff list presence, not via scheduling professional selection.

### Flow 3: Tutor + Paciente + Agendamento ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 3: Tutor + Paciente + Agendamento`

- Creates owner via `POST /owners`
- Creates patient linked to owner via `POST /patients`
- Gets eligible professional from `GET /staff`
- Creates appointment with professionalUserId via `POST /appointments`
- Verifies appointment is listable via `GET /appointments`
- **Routes used:** POST /owners, POST /patients, GET /staff, POST /appointments, GET /appointments

### Flow 4: Agendamento → Atendimento ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 4: Agendamento → Atendimento`

- Creates owner + patient + appointment
- Check-ins appointment via `POST /queue/check-in` — creates queue entry
- Opens encounter with queueEntryId via `POST /encounters` — links encounter to queue
- Verifies encounter is retrievable via `GET /encounters/:id`
- **Routes used:** POST /owners, POST /patients, POST /appointments, POST /queue/check-in, POST /encounters, GET /encounters/:id
- **Note:** The API does NOT have `POST /appointments/:id/start-encounter`. The flow uses `POST /encounters` with `queueEntryId` to achieve the same result.

### Flow 5: Registro Clínico → Evidência Auditável ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 5: Registro Clínico → Evidência Auditável`

- Creates owner + patient + encounter (beforeAll setup)
- Creates clinical entry (SOAP note) via `POST /medical-records/entries`
- Verifies audit event via `GET /audit/events` — finds event with correct entityId, module, correlationId
- Verifies medical record exists via `GET /medical-records?encounterId=`
- **Routes used:** POST /medical-records/entries, GET /audit/events, GET /medical-records

### Flow 6: Atendimento → Item Faturável ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 6: Atendimento → Item Faturável`

- Creates owner + patient + encounter (beforeAll setup)
- Accesses billing via `GET /billing?encounterId=`
- Creates billing item via `POST /billing/items` — auto-transitions record from draft to open
- Creates second billing item
- Verifies both items via `GET /billing/items?encounterId=`
- **Routes used:** GET /billing, POST /billing/items, GET /billing/items

### Flow 7: Atendimento → Consumo → Estoque ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 7: Atendimento → Consumo → Estoque`

- Creates owner + patient + encounter (beforeAll setup)
- Gets initial inventory via `GET /inventory/items`
- Consumes inventory item via `POST /inventory/consumptions`
- Verifies stock reduction via `GET /inventory/items` (list-based lookup)
- Verifies consumption linked to encounter via `GET /inventory/consumptions?encounterId=`
- **Routes used:** GET /inventory/items, POST /inventory/consumptions, GET /inventory/consumptions
- **GAP:** No `GET /inventory/items/:id` route — uses list-based lookup to find updated item.

### Flow 8: Inativação → Bloqueio Operacional ✅

**File:** `e2e/tests/fluxos-criticos.spec.ts` — `Flow 8: Inativação → Bloqueio Operacional`

- Creates user with `reception` role
- Logs in and verifies access works
- Inactivates user via `PATCH /users/:id` with `{ status: 'inactive' }`
- Verifies blocked access to `GET /owners` — returns 403
- Verifies blocked from `POST /appointments` — returns 403
- **Routes used:** POST /users, POST /auth/login, GET /owners, PATCH /users/:id, POST /appointments

---

## Flows Partially Implemented

None — all 8 flows are fully implemented with pre-conditions, actions, and post-condition validations.

---

## Gaps Impeditivos

| Gap                                         | Impact                                          | Workaround Applied                                          |
| ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| No `POST /appointments/:id/start-encounter` | Flow 4 can't use appointment→encounter shortcut | Use `POST /encounters` with `queueEntryId` instead          |
| No `GET /inventory/items/:id`               | Flow 7 can't fetch single item                  | Use `GET /inventory/items` list and filter                  |
| No `POST /staff`                            | Flow 2 can't create new professional            | Use existing seed staff from `GET /staff`                   |
| No `GET /appointments/:id`                  | Can't verify single appointment                 | Use `GET /appointments` list and filter                     |
| Billing/Inventory in-memory                 | Data lost on API restart                        | Tests run against live API; data persists for test duration |

---

## Módulos Ainda Soltos

| Module                  | Status                               | Reason                                                 |
| ----------------------- | ------------------------------------ | ------------------------------------------------------ |
| Prescription Executions | Not tested in E2E                    | Requires clinical entry reference; complex flow        |
| Surgery                 | Not tested in E2E                    | Requires specific encounter status transitions         |
| Diagnostics             | Existing in fluxo-exames.spec.ts     | Already covered by existing e2e                        |
| Inpatient               | Existing in fluxo-internacao.spec.ts | Already covered by existing e2e                        |
| Discharges              | Not tested in E2E                    | Requires encounter closure flow                        |
| Notifications           | Not directly tested                  | Created as side-effect of billing/inventory operations |

---

## Recomendação para Próxima Fase

1. **Fix dual RBAC gap** — Seed uses `vet/enfermagem/recepcao` while AccessControlService uses `veterinarian/nurse/reception`. This causes authorization mismatches between DB-seeded roles and runtime permission checks.

2. **Inject DB repositories** into BillingService, InventoryService, SchedulingService, and UsersService. Currently these modules use in-memory Maps, meaning all E2E data is lost on API restart.

3. **Add missing API routes:**
   - `GET /inventory/items/:id` — needed for precise stock verification
   - `POST /staff` — needed to create professionals dynamically in tests
   - `GET /appointments/:id` — needed for precise appointment verification

4. **Extend E2E to cover:**
   - Prescription execution flow (clinical entry → execution → administration events)
   - Surgery flow (encounter → surgery request → status transitions)
   - Discharge flow (encounter → discharge creation → encounter closure)

5. **Add CI pipeline** to run these E2E tests automatically against a fresh API + DB instance.
